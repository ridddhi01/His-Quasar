"""
Configuration for Predictive Analytics ML Service
Contains all configuration settings including database, model parameters, and thresholds
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Configuration class for Predictive Analytics Service"""
    
    # Flask Configuration
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5002))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # MongoDB Configuration
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/hospital_his')
    DB_NAME = os.getenv('DB_NAME', 'hospital_his')
    
    # Model Paths
    MODEL_PATH = os.getenv('MODEL_PATH', './models')
    OPD_MODEL_FILE = 'opd_prophet.pkl'
    BED_MODEL_FILE = 'bed_arima.pkl'
    LAB_MODEL_FILE = 'lab_prophet.pkl'
    
    # Prediction Configuration
    PREDICTION_CONFIG = {
        'default_forecast_days': int(os.getenv('FORECAST_DAYS', 7)),
        'default_forecast_hours': int(os.getenv('FORECAST_HOURS', 24)),
        'confidence_interval': float(os.getenv('CONFIDENCE_INTERVAL', 0.95)),
        'min_training_samples': int(os.getenv('MIN_TRAINING_SAMPLES', 30)),
    }
    
    # OPD Predictor Configuration
    OPD_CONFIG = {
        'granularity': 'hourly',  # hourly predictions
        'peak_threshold': float(os.getenv('OPD_PEAK_THRESHOLD', 0.8)),  # 80th percentile
        'rush_hour_definition': float(os.getenv('RUSH_HOUR_THRESHOLD', 1.5)),  # 1.5x average
        'training_days': int(os.getenv('OPD_TRAINING_DAYS', 90)),
    }
    
    # Bed Occupancy Predictor Configuration
    BED_CONFIG = {
        'granularity': 'daily',  # daily predictions
        'critical_occupancy': float(os.getenv('CRITICAL_OCCUPANCY', 0.9)),  # 90% = critical
        'warning_occupancy': float(os.getenv('WARNING_OCCUPANCY', 0.8)),  # 80% = warning
        'training_days': int(os.getenv('BED_TRAINING_DAYS', 180)),
        'seasonal_period': int(os.getenv('BED_SEASONAL_PERIOD', 7)),  # weekly
    }
    
    # Lab Workload Predictor Configuration
    LAB_CONFIG = {
        'granularity': 'hourly',  # hourly predictions
        'high_load_threshold': float(os.getenv('LAB_HIGH_LOAD', 0.85)),
        'training_days': int(os.getenv('LAB_TRAINING_DAYS', 90)),
    }
    
    # Prophet Model Parameters
    PROPHET_PARAMS = {
        'yearly_seasonality': True,
        'weekly_seasonality': True,
        'daily_seasonality': True,
        'changepoint_prior_scale': float(os.getenv('PROPHET_CHANGEPOINT_SCALE', 0.05)),
        'seasonality_prior_scale': float(os.getenv('PROPHET_SEASONALITY_SCALE', 10)),
        'interval_width': float(os.getenv('PROPHET_INTERVAL_WIDTH', 0.95)),
    }
    
    # ARIMA Model Parameters
    ARIMA_PARAMS = {
        'order': (1, 1, 1),  # Default ARIMA(1,1,1)
        'seasonal_order': (1, 1, 1, 7),  # Weekly seasonality
        'trend': 'c',  # Constant trend
    }
    
    # Prediction Types
    PREDICTION_TYPES = {
        'OPD_RUSH': 'opd-rush',
        'BED_OCCUPANCY': 'bed-occupancy',
        'LAB_WORKLOAD': 'lab-workload'
    }
    
    # Alert Thresholds
    ALERT_THRESHOLDS = {
        'opd_rush_warning': 1.3,  # 30% above average
        'opd_rush_critical': 1.5,  # 50% above average
        'bed_warning': 0.8,
        'bed_critical': 0.9,
        'lab_warning': 0.75,
        'lab_critical': 0.9,
    }
    
    @classmethod
    def get_model_path(cls, model_type: str) -> str:
        """Get full path to specific model file"""
        model_files = {
            'opd': cls.OPD_MODEL_FILE,
            'bed': cls.BED_MODEL_FILE,
            'lab': cls.LAB_MODEL_FILE
        }
        filename = model_files.get(model_type, f'{model_type}.pkl')
        return os.path.join(cls.MODEL_PATH, filename)
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate configuration settings"""
        required_settings = [
            cls.MONGODB_URI,
            cls.MODEL_PATH
        ]
        return all(setting is not None for setting in required_settings)


# Create default config instance
config = Config()
