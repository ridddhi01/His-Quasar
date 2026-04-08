"""
Pattern Analyzer for Revenue Leakage Detection
Implements rule-based pattern detection for common billing issues
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from bson import ObjectId
import pandas as pd

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.db_connector import get_db
from shared.utils import setup_logging, safe_float, safe_int
from config import Config

logger = setup_logging('pattern_analyzer')


class PatternAnalyzer:
    """
    Rule-based pattern analyzer for detecting specific revenue leakage patterns
    Complements the ML-based anomaly detection with explicit business rules
    """
    
    def __init__(self):
        """Initialize pattern analyzer"""
        self.db = get_db()
        self.config = Config
        self.tariffs: Dict[str, float] = {}
        self._load_tariffs()
    
    def _load_tariffs(self):
        """Load tariff data for price comparison"""
        try:
            tariffs = list(self.db.tariffs.find({}))
            for tariff in tariffs:
                code = tariff.get('serviceCode', tariff.get('itemCode', ''))
                price = safe_float(tariff.get('rate', tariff.get('price', 0)))
                if code:
                    self.tariffs[code] = price
            logger.info(f"Loaded {len(self.tariffs)} tariff entries")
        except Exception as e:
            logger.error(f"Error loading tariffs: {e}")
    
    def analyze_all_patterns(self, days: int = 7) -> List[Dict]:
        """
        Run all pattern detection rules
        
        Args:
            days: Number of days to analyze
            
        Returns:
            List of detected issues
        """
        logger.info(f"Running pattern analysis for last {days} days")
        
        all_issues = []
        
        # Run each detector
        all_issues.extend(self.detect_unbilled_services(days))
        all_issues.extend(self.detect_unbilled_medicines(days))
        all_issues.extend(self.detect_unbilled_lab_tests(days))
        all_issues.extend(self.detect_unbilled_radiology(days))
        all_issues.extend(self.detect_price_mismatches(days))
        all_issues.extend(self.detect_duplicate_billings(days))
        all_issues.extend(self.detect_delayed_billing(days))
        
        logger.info(f"Pattern analysis complete. Found {len(all_issues)} issues")
        
        return all_issues
    
    def detect_unbilled_services(self, days: int = 7) -> List[Dict]:
        """
        Detect services that were provided but not billed
        Checks EMR records against billing items
        
        Args:
            days: Number of days to check
            
        Returns:
            List of unbilled service issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Get EMR records with consultations
            emr_records = list(self.db.emr.find({
                'date': {'$gte': start_date, '$lte': end_date}
            }))
            
            for emr in emr_records:
                visit_id = emr.get('visit')
                patient_id = emr.get('patient')
                
                if not visit_id:
                    continue
                
                # Check if there's a billing for this visit
                billing = self.db.billings.find_one({'visit': visit_id})
                
                if not billing:
                    # No billing at all for this visit
                    issues.append({
                        'type': self.config.ANOMALY_TYPES['UNBILLED_SERVICE'],
                        'patient_id': str(patient_id),
                        'visit_id': str(visit_id),
                        'description': 'EMR record exists but no billing found',
                        'service': 'consultation',
                        'expected_revenue': self.tariffs.get('CONSULTATION', 500),
                        'actual_revenue': 0,
                        'leakage_amount': self.tariffs.get('CONSULTATION', 500),
                        'emr_date': emr.get('date'),
                        'severity': 'high'
                    })
                else:
                    # Check if consultation is billed
                    items = billing.get('items', [])
                    has_consultation = any(
                        item.get('itemType') == 'consultation' 
                        for item in items if isinstance(item, dict)
                    )
                    
                    if not has_consultation:
                        issues.append({
                            'type': self.config.ANOMALY_TYPES['UNBILLED_SERVICE'],
                            'patient_id': str(patient_id),
                            'visit_id': str(visit_id),
                            'bill_id': str(billing.get('_id')),
                            'description': 'Consultation not billed despite EMR record',
                            'service': 'consultation',
                            'expected_revenue': self.tariffs.get('CONSULTATION', 500),
                            'actual_revenue': 0,
                            'leakage_amount': self.tariffs.get('CONSULTATION', 500),
                            'severity': 'medium'
                        })
            
            logger.info(f"Found {len(issues)} unbilled service issues")
            
        except Exception as e:
            logger.error(f"Error detecting unbilled services: {e}")
        
        return issues
    
    def detect_unbilled_medicines(self, days: int = 7) -> List[Dict]:
        """
        Detect dispensed medicines that were not billed
        
        Args:
            days: Number of days to check
            
        Returns:
            List of unbilled medicine issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Get dispensed prescriptions
            prescriptions = list(self.db.prescriptions.find({
                'createdAt': {'$gte': start_date, '$lte': end_date},
                'isDispensed': True
            }))
            
            for prescription in prescriptions:
                visit_id = prescription.get('visit')
                patient_id = prescription.get('patient')
                medicines = prescription.get('medicines', [])
                
                if not visit_id or not medicines:
                    continue
                
                # Get billing for this visit
                billing = self.db.billings.find_one({'visit': visit_id})
                
                if not billing:
                    # Calculate total medicine value
                    total_medicine_value = sum(
                        safe_float(med.get('rate', 0)) * safe_int(med.get('quantity', 1))
                        for med in medicines if isinstance(med, dict)
                    )
                    
                    if total_medicine_value > 0:
                        issues.append({
                            'type': self.config.ANOMALY_TYPES['UNBILLED_MEDICINE'],
                            'patient_id': str(patient_id),
                            'visit_id': str(visit_id),
                            'prescription_id': str(prescription.get('_id')),
                            'description': 'Medicines dispensed but visit has no billing',
                            'service': 'medicine',
                            'expected_revenue': total_medicine_value,
                            'actual_revenue': 0,
                            'leakage_amount': total_medicine_value,
                            'medicine_count': len(medicines),
                            'severity': 'high'
                        })
                else:
                    # Check each medicine against billed items
                    billed_items = billing.get('items', [])
                    billed_medicine_refs = set(
                        str(item.get('itemReference'))
                        for item in billed_items
                        if isinstance(item, dict) and item.get('itemType') == 'medicine'
                    )
                    
                    for med in medicines:
                        if not isinstance(med, dict):
                            continue
                        
                        med_id = str(med.get('medicine', ''))
                        quantity = safe_int(med.get('quantity', 1))
                        rate = safe_float(med.get('rate', 0))
                        
                        # Check if this medicine is billed
                        if med_id and med_id not in billed_medicine_refs:
                            medicine_value = rate * quantity
                            if medicine_value > self.config.ALERT_THRESHOLDS['min_leakage_amount']:
                                issues.append({
                                    'type': self.config.ANOMALY_TYPES['UNBILLED_MEDICINE'],
                                    'patient_id': str(patient_id),
                                    'visit_id': str(visit_id),
                                    'bill_id': str(billing.get('_id')),
                                    'prescription_id': str(prescription.get('_id')),
                                    'description': 'Dispensed medicine not found in billing',
                                    'service': 'medicine',
                                    'medicine_id': med_id,
                                    'expected_revenue': medicine_value,
                                    'actual_revenue': 0,
                                    'leakage_amount': medicine_value,
                                    'severity': 'medium'
                                })
            
            logger.info(f"Found {len(issues)} unbilled medicine issues")
            
        except Exception as e:
            logger.error(f"Error detecting unbilled medicines: {e}")
        
        return issues
    
    def detect_unbilled_lab_tests(self, days: int = 7) -> List[Dict]:
        """
        Detect completed lab tests that were not billed
        
        Args:
            days: Number of days to check
            
        Returns:
            List of unbilled lab test issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Get completed lab tests
            lab_tests = list(self.db.lab_tests.find({
                'createdAt': {'$gte': start_date, '$lte': end_date},
                'status': 'completed'
            }))
            
            for test in lab_tests:
                visit_id = test.get('visit')
                patient_id = test.get('patient')
                test_id = test.get('test')
                
                if not visit_id:
                    continue
                
                # Get billing for this visit
                billing = self.db.billings.find_one({'visit': visit_id})
                
                if billing:
                    # Check if this lab test is billed
                    billed_items = billing.get('items', [])
                    test_billed = any(
                        item.get('itemType') == 'lab' and 
                        str(item.get('itemReference')) == str(test.get('_id'))
                        for item in billed_items if isinstance(item, dict)
                    )
                    
                    if not test_billed:
                        # Estimate test cost
                        test_cost = safe_float(self.tariffs.get(str(test_id), 300))
                        
                        issues.append({
                            'type': self.config.ANOMALY_TYPES['UNBILLED_LAB'],
                            'patient_id': str(patient_id),
                            'visit_id': str(visit_id),
                            'bill_id': str(billing.get('_id')),
                            'test_id': str(test.get('_id')),
                            'description': 'Completed lab test not found in billing',
                            'service': 'lab',
                            'expected_revenue': test_cost,
                            'actual_revenue': 0,
                            'leakage_amount': test_cost,
                            'severity': 'medium'
                        })
            
            logger.info(f"Found {len(issues)} unbilled lab test issues")
            
        except Exception as e:
            logger.error(f"Error detecting unbilled lab tests: {e}")
        
        return issues
    
    def detect_unbilled_radiology(self, days: int = 7) -> List[Dict]:
        """
        Detect completed radiology tests that were not billed
        
        Args:
            days: Number of days to check
            
        Returns:
            List of unbilled radiology test issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Get completed radiology tests
            radiology_tests = list(self.db.radiology_tests.find({
                'createdAt': {'$gte': start_date, '$lte': end_date},
                'status': 'completed'
            }))
            
            for test in radiology_tests:
                visit_id = test.get('visit')
                patient_id = test.get('patient')
                
                if not visit_id:
                    continue
                
                # Get billing for this visit
                billing = self.db.billings.find_one({'visit': visit_id})
                
                if billing:
                    # Check if this radiology test is billed
                    billed_items = billing.get('items', [])
                    test_billed = any(
                        item.get('itemType') == 'radiology' and 
                        str(item.get('itemReference')) == str(test.get('_id'))
                        for item in billed_items if isinstance(item, dict)
                    )
                    
                    if not test_billed:
                        # Estimate test cost
                        test_cost = safe_float(self.tariffs.get(str(test.get('test')), 500))
                        
                        issues.append({
                            'type': self.config.ANOMALY_TYPES['UNBILLED_RADIOLOGY'],
                            'patient_id': str(patient_id),
                            'visit_id': str(visit_id),
                            'bill_id': str(billing.get('_id')),
                            'test_id': str(test.get('_id')),
                            'description': 'Completed radiology test not found in billing',
                            'service': 'radiology',
                            'expected_revenue': test_cost,
                            'actual_revenue': 0,
                            'leakage_amount': test_cost,
                            'severity': 'medium'
                        })
            
            logger.info(f"Found {len(issues)} unbilled radiology test issues")
            
        except Exception as e:
            logger.error(f"Error detecting unbilled radiology tests: {e}")
        
        return issues
    
    def detect_price_mismatches(self, days: int = 7) -> List[Dict]:
        """
        Detect billing items where charged price differs significantly from tariff
        
        Args:
            days: Number of days to check
            
        Returns:
            List of price mismatch issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        variance_threshold = self.config.ALERT_THRESHOLDS['price_variance_percent'] / 100
        
        try:
            billings = list(self.db.billings.find({
                'billDate': {'$gte': start_date, '$lte': end_date}
            }))
            
            for billing in billings:
                items = billing.get('items', [])
                
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    
                    item_code = item.get('itemCode', item.get('serviceCode', ''))
                    charged_rate = safe_float(item.get('rate', 0))
                    
                    if item_code and item_code in self.tariffs:
                        tariff_rate = self.tariffs[item_code]
                        
                        if tariff_rate > 0:
                            variance = abs(charged_rate - tariff_rate) / tariff_rate
                            
                            if variance > variance_threshold:
                                # Price is significantly different from tariff
                                leakage = max(0, tariff_rate - charged_rate) * safe_int(item.get('quantity', 1))
                                
                                if leakage > self.config.ALERT_THRESHOLDS['min_leakage_amount']:
                                    issues.append({
                                        'type': self.config.ANOMALY_TYPES['PRICE_MISMATCH'],
                                        'patient_id': str(billing.get('patient')),
                                        'visit_id': str(billing.get('visit')),
                                        'bill_id': str(billing.get('_id')),
                                        'description': f'Charged rate differs from tariff by {variance:.1%}',
                                        'service': item.get('itemType', 'unknown'),
                                        'item_code': item_code,
                                        'charged_rate': charged_rate,
                                        'tariff_rate': tariff_rate,
                                        'variance_percent': variance * 100,
                                        'expected_revenue': tariff_rate * safe_int(item.get('quantity', 1)),
                                        'actual_revenue': charged_rate * safe_int(item.get('quantity', 1)),
                                        'leakage_amount': leakage,
                                        'severity': 'medium' if variance < 0.3 else 'high'
                                    })
            
            logger.info(f"Found {len(issues)} price mismatch issues")
            
        except Exception as e:
            logger.error(f"Error detecting price mismatches: {e}")
        
        return issues
    
    def detect_duplicate_billings(self, days: int = 7) -> List[Dict]:
        """
        Detect potential duplicate billing items
        
        Args:
            days: Number of days to check
            
        Returns:
            List of duplicate billing issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            billings = list(self.db.billings.find({
                'billDate': {'$gte': start_date, '$lte': end_date}
            }))
            
            for billing in billings:
                items = billing.get('items', [])
                
                # Check for duplicate item references
                item_refs = {}
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    
                    ref = str(item.get('itemReference', ''))
                    item_type = item.get('itemType', '')
                    
                    if ref and item_type:
                        key = f"{item_type}:{ref}"
                        if key in item_refs:
                            # Duplicate found
                            issues.append({
                                'type': self.config.ANOMALY_TYPES['DUPLICATE_BILLING'],
                                'patient_id': str(billing.get('patient')),
                                'visit_id': str(billing.get('visit')),
                                'bill_id': str(billing.get('_id')),
                                'description': f'Duplicate {item_type} item in billing',
                                'service': item_type,
                                'item_reference': ref,
                                'duplicate_amount': safe_float(item.get('amount', 0)),
                                'severity': 'high'
                            })
                        else:
                            item_refs[key] = item
            
            logger.info(f"Found {len(issues)} duplicate billing issues")
            
        except Exception as e:
            logger.error(f"Error detecting duplicate billings: {e}")
        
        return issues
    
    def detect_delayed_billing(self, days: int = 7) -> List[Dict]:
        """
        Detect visits where billing was significantly delayed
        May indicate missed charges
        
        Args:
            days: Number of days to check
            
        Returns:
            List of delayed billing issues
        """
        issues = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        delay_threshold = self.config.ALERT_THRESHOLDS['billing_delay_hours']
        
        try:
            # Check EMR records without timely billing
            emr_records = list(self.db.emr.find({
                'date': {'$gte': start_date, '$lte': end_date}
            }))
            
            for emr in emr_records:
                visit_id = emr.get('visit')
                emr_date = emr.get('date')
                
                if not visit_id or not emr_date:
                    continue
                
                # Get billing for this visit
                billing = self.db.billings.find_one({'visit': visit_id})
                
                if billing:
                    bill_date = billing.get('billDate', billing.get('createdAt'))
                    
                    if bill_date and emr_date:
                        try:
                            delay_hours = (bill_date - emr_date).total_seconds() / 3600
                            
                            if delay_hours > delay_threshold:
                                issues.append({
                                    'type': self.config.ANOMALY_TYPES['UNUSUAL_PATTERN'],
                                    'patient_id': str(emr.get('patient')),
                                    'visit_id': str(visit_id),
                                    'bill_id': str(billing.get('_id')),
                                    'description': f'Billing delayed by {delay_hours:.0f} hours',
                                    'service': 'billing',
                                    'delay_hours': delay_hours,
                                    'emr_date': emr_date.isoformat() if hasattr(emr_date, 'isoformat') else str(emr_date),
                                    'bill_date': bill_date.isoformat() if hasattr(bill_date, 'isoformat') else str(bill_date),
                                    'severity': 'low' if delay_hours < 48 else 'medium'
                                })
                        except Exception:
                            pass
            
            logger.info(f"Found {len(issues)} delayed billing issues")
            
        except Exception as e:
            logger.error(f"Error detecting delayed billings: {e}")
        
        return issues


# Singleton instance
_pattern_analyzer = None

def get_pattern_analyzer() -> PatternAnalyzer:
    """Get pattern analyzer singleton instance"""
    global _pattern_analyzer
    if _pattern_analyzer is None:
        _pattern_analyzer = PatternAnalyzer()
    return _pattern_analyzer
