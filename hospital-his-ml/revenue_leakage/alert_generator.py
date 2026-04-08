"""
Alert Generator for Revenue Leakage Detection
Combines ML anomalies with rule-based patterns and creates alerts for MongoDB
"""

import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from bson import ObjectId

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.db_connector import get_db
from shared.utils import setup_logging, serialize_document
from config import Config

logger = setup_logging('alert_generator')


class AlertGenerator:
    """
    Alert Generator for combining and storing revenue leakage alerts
    Creates alerts in the ai_anomalies MongoDB collection
    """
    
    def __init__(self):
        """Initialize alert generator"""
        self.db = get_db()
        self.config = Config
    
    def create_alert(self, anomaly_data: Dict) -> Optional[str]:
        """
        Create a single alert in the database
        
        Args:
            anomaly_data: Dictionary with anomaly details
            
        Returns:
            Alert ID if created successfully, None otherwise
        """
        try:
            # Prepare alert document matching AIAnomaly schema
            alert = {
                'anomalyType': anomaly_data.get('type', 'unusual-pattern'),
                'detectionDate': datetime.now(),
                'patient': self._to_object_id(anomaly_data.get('patient_id')),
                'visit': self._to_object_id(anomaly_data.get('visit_id')),
                'description': anomaly_data.get('description', ''),
                'details': {
                    'service': anomaly_data.get('service', ''),
                    'expectedRevenue': anomaly_data.get('expected_revenue', 0),
                    'actualRevenue': anomaly_data.get('actual_revenue', 0),
                    'leakageAmount': anomaly_data.get('leakage_amount', 0)
                },
                'status': self.config.ALERT_STATUS['DETECTED'],
                'reviewedBy': None,
                'reviewedAt': None,
                'resolutionNotes': None,
                'anomalyScore': anomaly_data.get('anomaly_score', 0),
                'priority': self._calculate_priority(anomaly_data),
                'source': anomaly_data.get('source', 'ml'),  # 'ml' or 'rules'
                'metadata': {
                    'bill_id': anomaly_data.get('bill_id'),
                    'test_id': anomaly_data.get('test_id'),
                    'prescription_id': anomaly_data.get('prescription_id'),
                    'severity': anomaly_data.get('severity', 'medium')
                },
                'createdAt': datetime.now()
            }
            
            # Insert into database
            result = self.db.ai_anomalies.insert_one(alert)
            alert_id = str(result.inserted_id)
            
            logger.info(f"Created alert: {alert_id} - {anomaly_data.get('type')}")
            return alert_id
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
            return None
    
    def create_alerts_batch(self, anomalies: List[Dict]) -> Dict:
        """
        Create multiple alerts in batch
        
        Args:
            anomalies: List of anomaly dictionaries
            
        Returns:
            Summary of created alerts
        """
        if not anomalies:
            return {
                'success': True,
                'total': 0,
                'created': 0,
                'failed': 0,
                'alerts': []
            }
        
        created_ids = []
        failed_count = 0
        
        for anomaly in anomalies:
            alert_id = self.create_alert(anomaly)
            if alert_id:
                created_ids.append(alert_id)
            else:
                failed_count += 1
        
        logger.info(f"Batch alert creation: {len(created_ids)} created, {failed_count} failed")
        
        return {
            'success': True,
            'total': len(anomalies),
            'created': len(created_ids),
            'failed': failed_count,
            'alerts': created_ids
        }
    
    def combine_anomalies(self, ml_anomalies: List[Dict], rule_anomalies: List[Dict]) -> List[Dict]:
        """
        Combine ML-detected anomalies with rule-based patterns
        Deduplicates based on visit_id and type
        
        Args:
            ml_anomalies: Anomalies from ML model
            rule_anomalies: Anomalies from pattern analyzer
            
        Returns:
            Combined and deduplicated list
        """
        combined = []
        seen = set()
        
        # Process ML anomalies first (higher priority)
        for anomaly in ml_anomalies:
            key = f"{anomaly.get('visit_id')}:{anomaly.get('type', 'ml')}"
            if key not in seen:
                anomaly['source'] = 'ml'
                combined.append(anomaly)
                seen.add(key)
        
        # Add rule-based anomalies (avoid duplicates)
        for anomaly in rule_anomalies:
            key = f"{anomaly.get('visit_id')}:{anomaly.get('type')}"
            if key not in seen:
                anomaly['source'] = 'rules'
                combined.append(anomaly)
                seen.add(key)
        
        # Sort by priority/severity and leakage amount
        combined.sort(
            key=lambda x: (
                -self._calculate_priority(x),
                -x.get('leakage_amount', 0)
            )
        )
        
        logger.info(f"Combined {len(ml_anomalies)} ML + {len(rule_anomalies)} rule anomalies = {len(combined)} unique")
        
        return combined
    
    def _calculate_priority(self, anomaly: Dict) -> int:
        """
        Calculate priority level for an anomaly
        
        Args:
            anomaly: Anomaly dictionary
            
        Returns:
            Priority level (1-4)
        """
        leakage = anomaly.get('leakage_amount', 0)
        severity = anomaly.get('severity', 'medium')
        
        # Check thresholds
        if leakage >= self.config.ALERT_THRESHOLDS['critical_priority_amount']:
            return self.config.PRIORITY_LEVELS['CRITICAL']
        elif leakage >= self.config.ALERT_THRESHOLDS['high_priority_amount']:
            return self.config.PRIORITY_LEVELS['HIGH']
        elif severity == 'high':
            return self.config.PRIORITY_LEVELS['HIGH']
        elif severity == 'medium':
            return self.config.PRIORITY_LEVELS['MEDIUM']
        else:
            return self.config.PRIORITY_LEVELS['LOW']
    
    def _to_object_id(self, id_str: Optional[str]) -> Optional[ObjectId]:
        """Convert string to ObjectId safely"""
        if not id_str:
            return None
        try:
            return ObjectId(id_str)
        except:
            return None
    
    def get_alerts(self, 
                   status: Optional[str] = None,
                   anomaly_type: Optional[str] = None,
                   limit: int = 100) -> List[Dict]:
        """
        Retrieve alerts from database
        
        Args:
            status: Filter by status
            anomaly_type: Filter by type
            limit: Maximum number of alerts
            
        Returns:
            List of alert documents
        """
        try:
            query = {}
            
            if status:
                query['status'] = status
            if anomaly_type:
                query['anomalyType'] = anomaly_type
            
            alerts = list(
                self.db.ai_anomalies.find(query)
                .sort('detectionDate', -1)
                .limit(limit)
            )
            
            return [serialize_document(alert) for alert in alerts]
            
        except Exception as e:
            logger.error(f"Error retrieving alerts: {e}")
            return []
    
    def get_alert_by_id(self, alert_id: str) -> Optional[Dict]:
        """Get a specific alert by ID"""
        try:
            alert = self.db.ai_anomalies.find_one({'_id': ObjectId(alert_id)})
            return serialize_document(alert) if alert else None
        except Exception as e:
            logger.error(f"Error retrieving alert {alert_id}: {e}")
            return None
    
    def update_alert_status(self, 
                           alert_id: str, 
                           status: str,
                           reviewed_by: Optional[str] = None,
                           resolution_notes: Optional[str] = None) -> bool:
        """
        Update alert status
        
        Args:
            alert_id: Alert ID
            status: New status
            reviewed_by: User ID who reviewed
            resolution_notes: Notes about resolution
            
        Returns:
            True if updated successfully
        """
        try:
            update = {
                '$set': {
                    'status': status,
                    'reviewedAt': datetime.now()
                }
            }
            
            if reviewed_by:
                update['$set']['reviewedBy'] = self._to_object_id(reviewed_by)
            if resolution_notes:
                update['$set']['resolutionNotes'] = resolution_notes
            
            result = self.db.ai_anomalies.update_one(
                {'_id': ObjectId(alert_id)},
                update
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating alert {alert_id}: {e}")
            return False
    
    def get_dashboard_stats(self) -> Dict:
        """
        Get statistics for revenue leakage dashboard
        
        Returns:
            Dashboard statistics
        """
        try:
            # Count by status
            pipeline = [
                {
                    '$group': {
                        '_id': '$status',
                        'count': {'$sum': 1},
                        'totalLeakage': {'$sum': '$details.leakageAmount'}
                    }
                }
            ]
            status_stats = list(self.db.ai_anomalies.aggregate(pipeline))
            
            # Count by type
            type_pipeline = [
                {
                    '$group': {
                        '_id': '$anomalyType',
                        'count': {'$sum': 1},
                        'totalLeakage': {'$sum': '$details.leakageAmount'}
                    }
                }
            ]
            type_stats = list(self.db.ai_anomalies.aggregate(type_pipeline))
            
            # Recent alerts (last 7 days)
            from datetime import timedelta
            week_ago = datetime.now() - timedelta(days=7)
            recent_count = self.db.ai_anomalies.count_documents({
                'detectionDate': {'$gte': week_ago}
            })
            
            # Calculate totals
            total_detected = sum(s.get('count', 0) for s in status_stats)
            total_leakage = sum(s.get('totalLeakage', 0) for s in status_stats)
            
            pending_count = next(
                (s.get('count', 0) for s in status_stats if s.get('_id') == 'detected'),
                0
            )
            
            resolved_count = next(
                (s.get('count', 0) for s in status_stats if s.get('_id') == 'resolved'),
                0
            )
            
            return {
                'totalDetected': total_detected,
                'totalLeakageAmount': total_leakage,
                'pendingReview': pending_count,
                'resolved': resolved_count,
                'recentAlerts': recent_count,
                'byStatus': {s['_id']: s for s in status_stats},
                'byType': {s['_id']: s for s in type_stats}
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            return {
                'totalDetected': 0,
                'totalLeakageAmount': 0,
                'pendingReview': 0,
                'resolved': 0,
                'error': str(e)
            }


# Singleton instance
_alert_generator = None

def get_alert_generator() -> AlertGenerator:
    """Get alert generator singleton instance"""
    global _alert_generator
    if _alert_generator is None:
        _alert_generator = AlertGenerator()
    return _alert_generator
