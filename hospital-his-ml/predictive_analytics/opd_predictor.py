"""
OPD Rush Hour Predictor
Predicts OPD patient volumes to identify rush hours
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
from shared.utils import setup_logging, serialize_document
from config import Config
from time_series import ProphetPredictor, prepare_time_series_data

logger = setup_logging('opd_predictor')


class OPDPredictor:
    """
    OPD Rush Hour Predictor
    Uses Prophet to forecast hourly patient volumes
    """
    
    def __init__(self):
        """Initialize OPD predictor"""
        self.db = get_db()
        self.config = Config
        self.model = ProphetPredictor(
            model_path=Config.get_model_path('opd'),
            config=Config.PROPHET_PARAMS
        )
    
    def fetch_historical_data(self, days: int = None) -> List[Dict]:
        """
        Fetch historical OPD appointment data
        
        Args:
            days: Number of days of history to fetch
            
        Returns:
            List of appointment records
        """
        if days is None:
            days = self.config.OPD_CONFIG['training_days']
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            appointments = list(self.db.appointments.find({
                'scheduledDate': {'$gte': start_date, '$lte': end_date},
                'type': 'opd',
                'status': {'$in': ['completed', 'checked-in', 'in-consultation']}
            }))
            
            logger.info(f"Fetched {len(appointments)} OPD appointments for training")
            return appointments
            
        except Exception as e:
            logger.error(f"Error fetching OPD data: {e}")
            return []
    
    def prepare_training_data(self, appointments: List[Dict]) -> pd.DataFrame:
        """
        Prepare appointment data for Prophet training
        
        Args:
            appointments: List of appointment records
            
        Returns:
            DataFrame with 'ds' and 'y' columns
        """
        if not appointments:
            return pd.DataFrame(columns=['ds', 'y'])
        
        # Extract datetime from each appointment
        records = []
        for apt in appointments:
            scheduled_date = apt.get('scheduledDate')
            scheduled_time = apt.get('scheduledTime', '10:00')
            
            if scheduled_date:
                if isinstance(scheduled_date, datetime):
                    dt = scheduled_date
                else:
                    try:
                        dt = pd.to_datetime(scheduled_date)
                    except:
                        continue
                
                # Combine date and time
                try:
                    if isinstance(scheduled_time, str) and ':' in scheduled_time:
                        hour = int(scheduled_time.split(':')[0])
                        dt = dt.replace(hour=hour)
                except:
                    pass
                
                records.append({'datetime': dt})
        
        if not records:
            return pd.DataFrame(columns=['ds', 'y'])
        
        # Create hourly aggregation
        df = pd.DataFrame(records)
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.set_index('datetime')
        
        # Count appointments per hour
        hourly = df.resample('H').size()
        hourly = hourly.fillna(0)
        
        result = pd.DataFrame({
            'ds': hourly.index,
            'y': hourly.values
        })
        
        logger.info(f"Prepared {len(result)} hourly data points for training")
        
        return result
    
    def train(self, force: bool = False) -> Dict:
        """
        Train the OPD prediction model
        
        Args:
            force: Force retrain even if model exists
            
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
        
        logger.info("Starting OPD model training...")
        
        # Fetch and prepare data
        appointments = self.fetch_historical_data()
        training_data = self.prepare_training_data(appointments)
        
        if training_data.empty or len(training_data) < self.config.PREDICTION_CONFIG['min_training_samples']:
            return {
                'success': False,
                'error': 'Insufficient training data',
                'samples': len(training_data)
            }
        
        # Train model
        result = self.model.train(training_data)
        result['retrained'] = True
        
        return result
    
    def predict(self, hours: int = 24) -> Dict:
        """
        Predict OPD volumes for next N hours
        
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
            
            # Calculate statistics
            mean_volume = forecast['yhat'].mean()
            rush_threshold = mean_volume * self.config.OPD_CONFIG['rush_hour_definition']
            
            # Identify rush hours
            rush_hours = []
            predictions = []
            
            for _, row in forecast.iterrows():
                pred = {
                    'datetime': row['ds'].isoformat(),
                    'predicted_volume': max(0, round(row['yhat'])),
                    'lower_bound': max(0, round(row['yhat_lower'])),
                    'upper_bound': max(0, round(row['yhat_upper'])),
                    'is_rush_hour': row['yhat'] > rush_threshold
                }
                predictions.append(pred)
                
                if pred['is_rush_hour']:
                    rush_hours.append({
                        'datetime': row['ds'].isoformat(),
                        'hour': row['ds'].hour,
                        'day': row['ds'].strftime('%A'),
                        'predicted_volume': pred['predicted_volume']
                    })
            
            # Get peak hours
            peak_hours = sorted(
                predictions,
                key=lambda x: x['predicted_volume'],
                reverse=True
            )[:5]
            
            return {
                'success': True,
                'prediction_hours': hours,
                'average_volume': round(mean_volume, 1),
                'rush_threshold': round(rush_threshold, 1),
                'rush_hours_count': len(rush_hours),
                'rush_hours': rush_hours,
                'peak_hours': peak_hours,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"OPD prediction error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_rush_hour_summary(self) -> Dict:
        """
        Get summary of typical rush hours based on historical patterns
        
        Returns:
            Rush hour summary by day and hour
        """
        if not self.model.is_trained:
            return {'error': 'Model not trained'}
        
        try:
            # Predict for next 7 days
            forecast = self.model.predict(periods=168, freq='H')  # 7 days * 24 hours
            
            if forecast.empty:
                return {'error': 'Prediction failed'}
            
            # Group by day of week and hour
            forecast['day'] = forecast['ds'].dt.day_name()
            forecast['hour'] = forecast['ds'].dt.hour
            
            # Calculate average by day and hour
            summary = forecast.groupby(['day', 'hour'])['yhat'].mean().reset_index()
            
            # Find rush hours for each day
            days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            rush_by_day = {}
            
            for day in days_order:
                day_data = summary[summary['day'] == day].sort_values('yhat', ascending=False)
                if not day_data.empty:
                    top_hours = day_data.head(3)['hour'].tolist()
                    rush_by_day[day] = {
                        'rush_hours': top_hours,
                        'peak_hour': int(top_hours[0]) if top_hours else 10,
                        'average_volume': round(day_data['yhat'].mean(), 1)
                    }
            
            return {
                'success': True,
                'rush_by_day': rush_by_day
            }
            
        except Exception as e:
            logger.error(f"Error getting rush hour summary: {e}")
            return {'error': str(e)}
    
    def get_model_info(self) -> Dict:
        """Get model information and status"""
        return {
            'predictor': 'OPD Rush Hour',
            'model_type': 'Prophet',
            **self.model.get_model_info()
        }


# Singleton instance
_opd_predictor = None

def get_opd_predictor() -> OPDPredictor:
    """Get OPD predictor singleton instance"""
    global _opd_predictor
    if _opd_predictor is None:
        _opd_predictor = OPDPredictor()
    return _opd_predictor
