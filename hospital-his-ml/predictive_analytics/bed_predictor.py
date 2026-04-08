"""
Bed Occupancy Predictor
Forecasts bed occupancy rates for capacity planning
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
from time_series import ARIMAPredictor

logger = setup_logging('bed_predictor')


class BedOccupancyPredictor:
    """
    Bed Occupancy Forecaster
    Uses ARIMA/SARIMA to predict daily bed occupancy
    """
    
    def __init__(self):
        """Initialize bed occupancy predictor"""
        self.db = get_db()
        self.config = Config
        self.model = ARIMAPredictor(
            model_path=Config.get_model_path('bed'),
            config=Config.ARIMA_PARAMS
        )
        self.total_beds: int = 0
        self._load_bed_capacity()
    
    def _load_bed_capacity(self):
        """Load total bed capacity from database"""
        try:
            self.total_beds = self.db.db['beds'].count_documents({})
            if self.total_beds == 0:
                self.total_beds = 100  # Default capacity
            logger.info(f"Total bed capacity: {self.total_beds}")
        except Exception as e:
            logger.error(f"Error loading bed capacity: {e}")
            self.total_beds = 100
    
    def fetch_historical_data(self, days: int = None) -> pd.DataFrame:
        """
        Fetch historical bed occupancy data
        
        Args:
            days: Number of days of history
            
        Returns:
            DataFrame with daily occupancy rates
        """
        if days is None:
            days = self.config.BED_CONFIG['training_days']
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Get admissions for the period
            admissions = list(self.db.admissions.find({
                '$or': [
                    {'admissionDate': {'$gte': start_date, '$lte': end_date}},
                    {'dischargeDate': {'$gte': start_date, '$lte': end_date}},
                    {
                        'admissionDate': {'$lte': start_date},
                        '$or': [
                            {'dischargeDate': {'$gte': start_date}},
                            {'dischargeDate': None},
                            {'status': 'admitted'}
                        ]
                    }
                ]
            }))
            
            logger.info(f"Fetched {len(admissions)} admission records")
            
            # Calculate daily occupancy
            daily_occupancy = self._calculate_daily_occupancy(admissions, start_date, end_date)
            
            return daily_occupancy
            
        except Exception as e:
            logger.error(f"Error fetching bed data: {e}")
            return pd.DataFrame()
    
    def _calculate_daily_occupancy(
        self, 
        admissions: List[Dict], 
        start_date: datetime, 
        end_date: datetime
    ) -> pd.DataFrame:
        """
        Calculate daily bed occupancy from admission records
        
        Args:
            admissions: List of admission records
            start_date: Start date
            end_date: End date
            
        Returns:
            DataFrame with daily occupancy
        """
        # Create date range
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        occupancy_data = []
        
        for day in date_range:
            day_start = day.replace(hour=0, minute=0, second=0)
            day_end = day.replace(hour=23, minute=59, second=59)
            
            # Count beds occupied on this day
            occupied = 0
            for admission in admissions:
                admit_date = admission.get('admissionDate')
                discharge_date = admission.get('dischargeDate')
                
                if admit_date is None:
                    continue
                
                # Check if admission overlaps with this day
                if admit_date <= day_end:
                    if discharge_date is None or discharge_date >= day_start:
                        occupied += 1
            
            occupancy_rate = occupied / self.total_beds if self.total_beds > 0 else 0
            
            occupancy_data.append({
                'ds': day,
                'y': occupied,
                'occupancy_rate': min(1.0, occupancy_rate)
            })
        
        return pd.DataFrame(occupancy_data)
    
    def train(self, force: bool = False) -> Dict:
        """
        Train the bed occupancy model
        
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
        
        logger.info("Starting bed occupancy model training...")
        
        # Fetch and prepare data
        training_data = self.fetch_historical_data()
        
        if training_data.empty or len(training_data) < self.config.PREDICTION_CONFIG['min_training_samples']:
            return {
                'success': False,
                'error': 'Insufficient training data',
                'samples': len(training_data)
            }
        
        # Train model with occupancy values
        train_df = training_data[['ds', 'y']].copy()
        result = self.model.train(train_df)
        result['retrained'] = True
        result['total_beds'] = self.total_beds
        
        return result
    
    def predict(self, days: int = 7) -> Dict:
        """
        Predict bed occupancy for next N days
        
        Args:
            days: Number of days to predict
            
        Returns:
            Prediction results
        """
        if not self.model.is_trained:
            return {'success': False, 'error': 'Model not trained'}
        
        try:
            # Get predictions
            forecast = self.model.predict(periods=days, start_date=datetime.now())
            
            if forecast.empty:
                return {'success': False, 'error': 'Prediction failed'}
            
            # Process predictions
            predictions = []
            alerts = []
            
            warning_threshold = self.config.BED_CONFIG['warning_occupancy']
            critical_threshold = self.config.BED_CONFIG['critical_occupancy']
            
            for _, row in forecast.iterrows():
                predicted_occupied = max(0, round(row['yhat']))
                occupancy_rate = min(1.0, predicted_occupied / self.total_beds)
                
                # Determine status
                if occupancy_rate >= critical_threshold:
                    status = 'critical'
                    alerts.append({
                        'date': row['ds'].isoformat(),
                        'level': 'critical',
                        'message': f"Critical occupancy expected: {occupancy_rate:.0%}"
                    })
                elif occupancy_rate >= warning_threshold:
                    status = 'warning'
                    alerts.append({
                        'date': row['ds'].isoformat(),
                        'level': 'warning',
                        'message': f"High occupancy expected: {occupancy_rate:.0%}"
                    })
                else:
                    status = 'normal'
                
                pred = {
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'day': row['ds'].strftime('%A'),
                    'predicted_occupied': predicted_occupied,
                    'lower_bound': max(0, round(row['yhat_lower'])),
                    'upper_bound': min(self.total_beds, round(row['yhat_upper'])),
                    'occupancy_rate': round(occupancy_rate, 2),
                    'available_beds': max(0, self.total_beds - predicted_occupied),
                    'status': status
                }
                predictions.append(pred)
            
            # Summary statistics
            avg_occupancy = np.mean([p['occupancy_rate'] for p in predictions])
            min_available = min(p['available_beds'] for p in predictions)
            
            return {
                'success': True,
                'prediction_days': days,
                'total_beds': self.total_beds,
                'average_occupancy': round(avg_occupancy, 2),
                'minimum_available': min_available,
                'alerts_count': len(alerts),
                'alerts': alerts,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"Bed prediction error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_current_status(self) -> Dict:
        """Get current bed occupancy status"""
        try:
            # Count currently occupied beds
            occupied = self.db.db['beds'].count_documents({
                'status': 'occupied'
            })
            
            available = self.total_beds - occupied
            rate = occupied / self.total_beds if self.total_beds > 0 else 0
            
            # Determine status
            if rate >= self.config.BED_CONFIG['critical_occupancy']:
                status = 'critical'
            elif rate >= self.config.BED_CONFIG['warning_occupancy']:
                status = 'warning'
            else:
                status = 'normal'
            
            return {
                'total_beds': self.total_beds,
                'occupied': occupied,
                'available': available,
                'occupancy_rate': round(rate, 2),
                'status': status,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting current status: {e}")
            return {'error': str(e)}
    
    def get_model_info(self) -> Dict:
        """Get model information and status"""
        return {
            'predictor': 'Bed Occupancy',
            'model_type': 'SARIMA',
            'total_beds': self.total_beds,
            **self.model.get_model_info()
        }


# Singleton instance
_bed_predictor = None

def get_bed_predictor() -> BedOccupancyPredictor:
    """Get bed predictor singleton instance"""
    global _bed_predictor
    if _bed_predictor is None:
        _bed_predictor = BedOccupancyPredictor()
    return _bed_predictor
