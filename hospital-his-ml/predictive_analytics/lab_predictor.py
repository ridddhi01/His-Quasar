"""
Lab Workload Predictor
Forecasts laboratory test volumes for resource planning
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.db_connector import get_db
from shared.utils import setup_logging
from config import Config
from time_series import ProphetPredictor

logger = setup_logging('lab_predictor')


class LabWorkloadPredictor:
    """
    Lab Workload Forecaster
    Uses Prophet to predict hourly lab test volumes
    """
    
    def __init__(self):
        """Initialize lab workload predictor"""
        self.db = get_db()
        self.config = Config
        self.model = ProphetPredictor(
            model_path=Config.get_model_path('lab'),
            config=Config.PROPHET_PARAMS
        )
        self.daily_capacity: int = 0
        self._estimate_capacity()
    
    def _estimate_capacity(self):
        """Estimate lab daily capacity based on historical data"""
        try:
            # Get average tests per day over last 30 days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            pipeline = [
                {
                    '$match': {
                        'createdAt': {'$gte': start_date, '$lte': end_date}
                    }
                },
                {
                    '$group': {
                        '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$createdAt'}},
                        'count': {'$sum': 1}
                    }
                },
                {
                    '$group': {
                        '_id': None,
                        'avg': {'$avg': '$count'},
                        'max': {'$max': '$count'}
                    }
                }
            ]
            
            result = list(self.db.lab_tests.aggregate(pipeline))
            
            if result:
                # Capacity is estimated as 1.2x maximum observed
                self.daily_capacity = int(result[0].get('max', 100) * 1.2)
            else:
                self.daily_capacity = 100
            
            logger.info(f"Estimated lab daily capacity: {self.daily_capacity}")
            
        except Exception as e:
            logger.error(f"Error estimating capacity: {e}")
            self.daily_capacity = 100
    
    def fetch_historical_data(self, days: int = None) -> pd.DataFrame:
        """
        Fetch historical lab test data
        
        Args:
            days: Number of days of history
            
        Returns:
            DataFrame with hourly test counts
        """
        if days is None:
            days = self.config.LAB_CONFIG['training_days']
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Get lab tests
            lab_tests = list(self.db.lab_tests.find({
                'createdAt': {'$gte': start_date, '$lte': end_date}
            }, {'createdAt': 1}))
            
            logger.info(f"Fetched {len(lab_tests)} lab test records")
            
            if not lab_tests:
                return pd.DataFrame()
            
            # Create hourly aggregation
            df = pd.DataFrame(lab_tests)
            df['createdAt'] = pd.to_datetime(df['createdAt'])
            df = df.set_index('createdAt')
            
            # Count tests per hour
            hourly = df.resample('H').size()
            hourly = hourly.fillna(0)
            
            result = pd.DataFrame({
                'ds': hourly.index,
                'y': hourly.values
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching lab data: {e}")
            return pd.DataFrame()
    
    def train(self, force: bool = False) -> Dict:
        """
        Train the lab workload model
        
        Args:
            force: Force retrain
            
        Returns:
            Training results
        """
        if self.model.is_trained and not force:
            return {
                'success': True,
                'message': 'Model already trained',
                'retrained': False,
                'model_info': self.model.get_model_info()
            }
        
        logger.info("Starting lab workload model training...")
        
        # Fetch and prepare data
        training_data = self.fetch_historical_data()
        
        if training_data.empty or len(training_data) < self.config.PREDICTION_CONFIG['min_training_samples']:
            return {
                'success': False,
                'error': 'Insufficient training data',
                'samples': len(training_data)
            }
        
        # Train model
        result = self.model.train(training_data)
        result['retrained'] = True
        result['daily_capacity'] = self.daily_capacity
        
        return result
    
    def predict(self, hours: int = 24) -> Dict:
        """
        Predict lab workload for next N hours
        
        Args:
            hours: Number of hours to predict
            
        Returns:
            Prediction results
        """
        if not self.model.is_trained:
            return {'success': False, 'error': 'Model not trained'}
        
        try:
            # Get predictions
            forecast = self.model.predict(periods=hours, freq='H')
            
            if forecast.empty:
                return {'success': False, 'error': 'Prediction failed'}
            
            # Process predictions
            predictions = []
            alerts = []
            hourly_capacity = self.daily_capacity / 10  # Assuming 10 working hours
            
            high_load_threshold = self.config.LAB_CONFIG['high_load_threshold']
            
            for _, row in forecast.iterrows():
                predicted_tests = max(0, round(row['yhat']))
                load_ratio = predicted_tests / hourly_capacity if hourly_capacity > 0 else 0
                
                # Determine status
                if load_ratio >= self.config.ALERT_THRESHOLDS['lab_critical']:
                    status = 'critical'
                    alerts.append({
                        'datetime': row['ds'].isoformat(),
                        'level': 'critical',
                        'load_ratio': round(load_ratio, 2),
                        'message': f"Critical lab workload: {load_ratio:.0%} capacity"
                    })
                elif load_ratio >= self.config.ALERT_THRESHOLDS['lab_warning']:
                    status = 'high'
                    alerts.append({
                        'datetime': row['ds'].isoformat(),
                        'level': 'warning',
                        'load_ratio': round(load_ratio, 2),
                        'message': f"High lab workload: {load_ratio:.0%} capacity"
                    })
                else:
                    status = 'normal'
                
                pred = {
                    'datetime': row['ds'].isoformat(),
                    'hour': row['ds'].hour,
                    'predicted_tests': predicted_tests,
                    'lower_bound': max(0, round(row['yhat_lower'])),
                    'upper_bound': round(row['yhat_upper']),
                    'load_ratio': round(min(1.5, load_ratio), 2),
                    'status': status
                }
                predictions.append(pred)
            
            # Summary
            total_predicted = sum(p['predicted_tests'] for p in predictions)
            avg_hourly = total_predicted / hours if hours > 0 else 0
            peak_hours = sorted(predictions, key=lambda x: x['predicted_tests'], reverse=True)[:5]
            
            return {
                'success': True,
                'prediction_hours': hours,
                'daily_capacity': self.daily_capacity,
                'hourly_capacity': round(hourly_capacity, 1),
                'total_predicted': total_predicted,
                'average_hourly': round(avg_hourly, 1),
                'peak_hours': peak_hours,
                'alerts_count': len(alerts),
                'alerts': alerts,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"Lab prediction error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_workload_by_test_type(self, days: int = 7) -> Dict:
        """
        Get workload breakdown by test type
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Workload by test type
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            pipeline = [
                {
                    '$match': {
                        'createdAt': {'$gte': start_date, '$lte': end_date}
                    }
                },
                {
                    '$lookup': {
                        'from': 'lab_test_masters',
                        'localField': 'test',
                        'foreignField': '_id',
                        'as': 'testInfo'
                    }
                },
                {
                    '$unwind': {'path': '$testInfo', 'preserveNullAndEmptyArrays': True}
                },
                {
                    '$group': {
                        '_id': '$testInfo.category',
                        'count': {'$sum': 1},
                        'avgTurnaround': {'$avg': {'$subtract': ['$completedAt', '$createdAt']}}
                    }
                },
                {
                    '$sort': {'count': -1}
                }
            ]
            
            results = list(self.db.lab_tests.aggregate(pipeline))
            
            total = sum(r['count'] for r in results)
            
            breakdown = []
            for r in results:
                category = r['_id'] or 'Unknown'
                count = r['count']
                breakdown.append({
                    'category': category,
                    'count': count,
                    'percentage': round(count / total * 100, 1) if total > 0 else 0
                })
            
            return {
                'success': True,
                'period_days': days,
                'total_tests': total,
                'breakdown': breakdown
            }
            
        except Exception as e:
            logger.error(f"Error getting test breakdown: {e}")
            return {'error': str(e)}
    
    def get_model_info(self) -> Dict:
        """Get model information and status"""
        return {
            'predictor': 'Lab Workload',
            'model_type': 'Prophet',
            'daily_capacity': self.daily_capacity,
            **self.model.get_model_info()
        }


# Singleton instance
_lab_predictor = None

def get_lab_predictor() -> LabWorkloadPredictor:
    """Get lab predictor singleton instance"""
    global _lab_predictor
    if _lab_predictor is None:
        _lab_predictor = LabWorkloadPredictor()
    return _lab_predictor
