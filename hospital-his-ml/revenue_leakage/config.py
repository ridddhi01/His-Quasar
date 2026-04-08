"""
Configuration for Revenue Leakage Detection ML Service
Contains all configuration settings including database, model parameters, and thresholds
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Configuration class for Revenue Leakage Service"""
    
    # Flask Configuration
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5001))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # MongoDB Configuration
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/hospital_his')
    DB_NAME = os.getenv('DB_NAME', 'hospital_his')
    
    # Model Configuration
    MODEL_PATH = os.getenv('MODEL_PATH', './models')
    ISOLATION_FOREST_MODEL_FILE = 'isolation_forest.pkl'
    
    # Isolation Forest Hyperparameters
    MODEL_PARAMS = {
        'n_estimators': int(os.getenv('IF_N_ESTIMATORS', 100)),
        'contamination': float(os.getenv('IF_CONTAMINATION', 0.1)),  # Expected proportion of anomalies
        'max_samples': os.getenv('IF_MAX_SAMPLES', 'auto'),
        'max_features': float(os.getenv('IF_MAX_FEATURES', 1.0)),
        'bootstrap': os.getenv('IF_BOOTSTRAP', 'False').lower() == 'true',
        'n_jobs': int(os.getenv('IF_N_JOBS', -1)),  # Use all CPU cores
        'random_state': int(os.getenv('IF_RANDOM_STATE', 42))
    }
    
    # Data Processing Configuration
    DATA_CONFIG = {
        'lookback_days': int(os.getenv('LOOKBACK_DAYS', 90)),  # Days of data to analyze
        'min_samples_for_training': int(os.getenv('MIN_TRAINING_SAMPLES', 100)),
        'batch_size': int(os.getenv('BATCH_SIZE', 1000))
    }
    
    # Alert Thresholds
    ALERT_THRESHOLDS = {
        # Anomaly score threshold (lower = more anomalous for Isolation Forest)
        'anomaly_score_threshold': float(os.getenv('ANOMALY_THRESHOLD', -0.5)),
        
        # Revenue leakage thresholds
        'min_leakage_amount': float(os.getenv('MIN_LEAKAGE_AMOUNT', 100)),  # Minimum amount to flag
        'high_priority_amount': float(os.getenv('HIGH_PRIORITY_AMOUNT', 5000)),  # High priority threshold
        'critical_priority_amount': float(os.getenv('CRITICAL_PRIORITY_AMOUNT', 10000)),  # Critical threshold
        
        # Pattern detection thresholds
        'billing_delay_hours': int(os.getenv('BILLING_DELAY_HOURS', 24)),  # Max acceptable billing delay
        'price_variance_percent': float(os.getenv('PRICE_VARIANCE_PERCENT', 10)),  # Max price variance from tariff
    }
    
    # Anomaly Types
    ANOMALY_TYPES = {
        'UNBILLED_SERVICE': 'unbilled-service',
        'UNBILLED_MEDICINE': 'unbilled-medicine',
        'UNBILLED_LAB': 'unbilled-lab-test',
        'UNBILLED_RADIOLOGY': 'unbilled-radiology-test',
        'PRICE_MISMATCH': 'price-mismatch',
        'UNUSUAL_PATTERN': 'unusual-pattern',
        'DUPLICATE_BILLING': 'duplicate-billing',
        'MISSING_CHARGES': 'missing-charges'
    }
    
    # Alert Status Options
    ALERT_STATUS = {
        'DETECTED': 'detected',
        'UNDER_REVIEW': 'under-review',
        'RESOLVED': 'resolved',
        'FALSE_POSITIVE': 'false-positive'
    }
    
    # Alert Priority Levels
    PRIORITY_LEVELS = {
        'LOW': 1,
        'MEDIUM': 2,
        'HIGH': 3,
        'CRITICAL': 4
    }
    
    # Feature columns for ML model
    FEATURE_COLUMNS = [
        'total_services',
        'total_billed_amount',
        'total_expected_amount',
        'billing_delay_hours',
        'unbilled_items_count',
        'price_variance_ratio',
        'payment_completion_ratio',
        'discount_ratio',
        'visit_duration_hours',
        'items_per_visit'
    ]
    
    # Service types for billing analysis
    SERVICE_TYPES = [
        'consultation',
        'procedure',
        'lab',
        'radiology',
        'medicine',
        'bed',
        'surgery',
        'nursing',
        'consumables',
        'other'
    ]
    
    @classmethod
    def get_model_path(cls) -> str:
        """Get full path to trained model file"""
        return os.path.join(cls.MODEL_PATH, cls.ISOLATION_FOREST_MODEL_FILE)
    
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
