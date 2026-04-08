"""
Data Processor for Revenue Leakage Detection
Handles data fetching, preprocessing, and feature engineering for ML model
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from bson import ObjectId
import sys
import os

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.db_connector import get_db
from shared.utils import setup_logging, safe_float, safe_int
from config import Config

logger = setup_logging('data_processor')


class DataProcessor:
    """
    Data preprocessing pipeline for revenue leakage detection
    Fetches data from MongoDB and prepares features for ML model
    """
    
    def __init__(self):
        """Initialize data processor with database connection"""
        self.db = get_db()
        self.config = Config
        
    def fetch_billing_data(self, start_date: datetime = None, end_date: datetime = None) -> pd.DataFrame:
        """
        Fetch billing records from database
        
        Args:
            start_date: Start date for data fetch
            end_date: End date for data fetch
            
        Returns:
            DataFrame with billing records
        """
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=self.config.DATA_CONFIG['lookback_days'])
        
        query = {
            'billDate': {
                '$gte': start_date,
                '$lte': end_date
            }
        }
        
        try:
            billings = list(self.db.billings.find(query))
            logger.info(f"Fetched {len(billings)} billing records")
            
            if not billings:
                return pd.DataFrame()
            
            df = pd.DataFrame(billings)
            df['_id'] = df['_id'].astype(str)
            
            # Convert ObjectId fields
            for col in ['patient', 'visit', 'generatedBy', 'insuranceClaim']:
                if col in df.columns:
                    df[col] = df[col].apply(lambda x: str(x) if x else None)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching billing data: {e}")
            return pd.DataFrame()
    
    def fetch_prescriptions(self, start_date: datetime = None, end_date: datetime = None) -> pd.DataFrame:
        """Fetch prescription records"""
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=self.config.DATA_CONFIG['lookback_days'])
        
        query = {
            'createdAt': {'$gte': start_date, '$lte': end_date},
            'isDispensed': True  # Only dispensed prescriptions
        }
        
        try:
            prescriptions = list(self.db.prescriptions.find(query))
            logger.info(f"Fetched {len(prescriptions)} prescription records")
            
            if not prescriptions:
                return pd.DataFrame()
            
            df = pd.DataFrame(prescriptions)
            df['_id'] = df['_id'].astype(str)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching prescriptions: {e}")
            return pd.DataFrame()
    
    def fetch_lab_tests(self, start_date: datetime = None, end_date: datetime = None) -> pd.DataFrame:
        """Fetch completed lab test records"""
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=self.config.DATA_CONFIG['lookback_days'])
        
        query = {
            'createdAt': {'$gte': start_date, '$lte': end_date},
            'status': 'completed'
        }
        
        try:
            lab_tests = list(self.db.lab_tests.find(query))
            logger.info(f"Fetched {len(lab_tests)} lab test records")
            
            if not lab_tests:
                return pd.DataFrame()
            
            df = pd.DataFrame(lab_tests)
            df['_id'] = df['_id'].astype(str)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching lab tests: {e}")
            return pd.DataFrame()
    
    def fetch_radiology_tests(self, start_date: datetime = None, end_date: datetime = None) -> pd.DataFrame:
        """Fetch completed radiology test records"""
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=self.config.DATA_CONFIG['lookback_days'])
        
        query = {
            'createdAt': {'$gte': start_date, '$lte': end_date},
            'status': 'completed'
        }
        
        try:
            radiology_tests = list(self.db.radiology_tests.find(query))
            logger.info(f"Fetched {len(radiology_tests)} radiology test records")
            
            if not radiology_tests:
                return pd.DataFrame()
            
            df = pd.DataFrame(radiology_tests)
            df['_id'] = df['_id'].astype(str)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching radiology tests: {e}")
            return pd.DataFrame()
    
    def fetch_emr_records(self, start_date: datetime = None, end_date: datetime = None) -> pd.DataFrame:
        """Fetch EMR records"""
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=self.config.DATA_CONFIG['lookback_days'])
        
        query = {
            'date': {'$gte': start_date, '$lte': end_date}
        }
        
        try:
            emr_records = list(self.db.emr.find(query))
            logger.info(f"Fetched {len(emr_records)} EMR records")
            
            if not emr_records:
                return pd.DataFrame()
            
            df = pd.DataFrame(emr_records)
            df['_id'] = df['_id'].astype(str)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching EMR records: {e}")
            return pd.DataFrame()
    
    def fetch_tariffs(self) -> Dict[str, float]:
        """Fetch tariff/pricing data for services"""
        try:
            tariffs = list(self.db.tariffs.find({}))
            tariff_dict = {}
            
            for tariff in tariffs:
                service_code = tariff.get('serviceCode', tariff.get('itemCode', ''))
                price = safe_float(tariff.get('rate', tariff.get('price', 0)))
                if service_code:
                    tariff_dict[service_code] = price
            
            logger.info(f"Loaded {len(tariff_dict)} tariff entries")
            return tariff_dict
            
        except Exception as e:
            logger.error(f"Error fetching tariffs: {e}")
            return {}
    
    def prepare_visit_data(self, billings_df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare visit-level data with aggregated features
        
        Args:
            billings_df: DataFrame with billing records
            
        Returns:
            DataFrame with visit-level features
        """
        if billings_df.empty:
            return pd.DataFrame()
        
        # Group by visit
        visit_data = []
        
        for _, billing in billings_df.iterrows():
            visit_id = billing.get('visit', billing.get('_id'))
            items = billing.get('items', [])
            
            # Calculate metrics
            total_services = len(items)
            total_billed = safe_float(billing.get('grandTotal', 0))
            
            # Calculate expected amount from items
            total_expected = sum(
                safe_float(item.get('rate', 0)) * safe_int(item.get('quantity', 1))
                for item in items if isinstance(item, dict)
            )
            
            # Billing delay (if billDate and visit date available)
            bill_date = billing.get('billDate')
            created_date = billing.get('createdAt', bill_date)
            billing_delay_hours = 0
            if bill_date and created_date:
                try:
                    delay = bill_date - created_date
                    billing_delay_hours = delay.total_seconds() / 3600
                except:
                    pass
            
            # Count unbilled items (items with isBilled = False)
            unbilled_count = sum(
                1 for item in items 
                if isinstance(item, dict) and not item.get('isBilled', True)
            )
            
            # Price variance
            price_variance = 0
            if total_expected > 0:
                price_variance = abs(total_billed - total_expected) / total_expected
            
            # Payment ratio
            paid = safe_float(billing.get('paidAmount', 0))
            payment_ratio = paid / total_billed if total_billed > 0 else 0
            
            # Discount ratio
            discount = safe_float(billing.get('totalDiscount', 0))
            discount_ratio = discount / total_billed if total_billed > 0 else 0
            
            visit_data.append({
                'visit_id': str(visit_id),
                'patient_id': str(billing.get('patient', '')),
                'bill_id': str(billing.get('_id', '')),
                'visit_type': billing.get('visitType', 'unknown'),
                'bill_date': bill_date,
                'total_services': total_services,
                'total_billed_amount': total_billed,
                'total_expected_amount': total_expected,
                'billing_delay_hours': billing_delay_hours,
                'unbilled_items_count': unbilled_count,
                'price_variance_ratio': price_variance,
                'payment_completion_ratio': payment_ratio,
                'discount_ratio': discount_ratio,
                'visit_duration_hours': 0,  # Would need admission/discharge dates
                'items_per_visit': total_services
            })
        
        return pd.DataFrame(visit_data)
    
    def extract_features(self, visit_df: pd.DataFrame) -> np.ndarray:
        """
        Extract feature matrix for ML model
        
        Args:
            visit_df: DataFrame with visit-level data
            
        Returns:
            Numpy array with features
        """
        if visit_df.empty:
            return np.array([])
        
        feature_columns = self.config.FEATURE_COLUMNS
        
        # Ensure all feature columns exist
        for col in feature_columns:
            if col not in visit_df.columns:
                visit_df[col] = 0
        
        # Extract features
        features = visit_df[feature_columns].values
        
        # Handle missing values
        features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        
        return features
    
    def normalize_features(self, features: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """
        Normalize features for ML model
        
        Args:
            features: Raw feature matrix
            
        Returns:
            Tuple of (normalized features, normalization params)
        """
        if features.size == 0:
            return features, {}
        
        # Z-score normalization
        mean = np.mean(features, axis=0)
        std = np.std(features, axis=0)
        std[std == 0] = 1  # Avoid division by zero
        
        normalized = (features - mean) / std
        
        normalization_params = {
            'mean': mean.tolist(),
            'std': std.tolist()
        }
        
        return normalized, normalization_params
    
    def get_training_data(self) -> Tuple[np.ndarray, pd.DataFrame]:
        """
        Get complete training data pipeline
        
        Returns:
            Tuple of (feature matrix, visit DataFrame)
        """
        logger.info("Starting training data preparation...")
        
        # Fetch billing data
        billings_df = self.fetch_billing_data()
        
        if billings_df.empty:
            logger.warning("No billing data found for training")
            return np.array([]), pd.DataFrame()
        
        # Prepare visit-level data
        visit_df = self.prepare_visit_data(billings_df)
        
        if visit_df.empty:
            logger.warning("No visit data prepared")
            return np.array([]), pd.DataFrame()
        
        # Extract features
        features = self.extract_features(visit_df)
        
        logger.info(f"Prepared training data: {features.shape[0]} samples, {features.shape[1]} features")
        
        return features, visit_df
    
    def get_detection_data(self, days: int = 7) -> Tuple[np.ndarray, pd.DataFrame]:
        """
        Get data for anomaly detection (recent data)
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Tuple of (feature matrix, visit DataFrame)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        logger.info(f"Fetching detection data from {start_date} to {end_date}")
        
        billings_df = self.fetch_billing_data(start_date, end_date)
        
        if billings_df.empty:
            logger.warning("No recent billing data found")
            return np.array([]), pd.DataFrame()
        
        visit_df = self.prepare_visit_data(billings_df)
        features = self.extract_features(visit_df)
        
        logger.info(f"Prepared detection data: {features.shape[0]} samples")
        
        return features, visit_df


# Singleton instance
_data_processor = None

def get_data_processor() -> DataProcessor:
    """Get data processor singleton instance"""
    global _data_processor
    if _data_processor is None:
        _data_processor = DataProcessor()
    return _data_processor
