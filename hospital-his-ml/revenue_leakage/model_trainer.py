"""
Model Trainer for Revenue Leakage Detection
Handles training pipeline for the Isolation Forest anomaly detection model
"""

import os
import sys
from datetime import datetime
from typing import Dict, Optional, Any
import numpy as np
import joblib

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.utils import setup_logging
from config import Config
from data_processor import get_data_processor
from anomaly_detector import get_anomaly_detector

logger = setup_logging('model_trainer')


class ModelTrainer:
    """
    Model training pipeline for revenue leakage detection
    Handles data preparation, training, validation, and model persistence
    """
    
    def __init__(self):
        """Initialize model trainer"""
        self.config = Config
        self.data_processor = get_data_processor()
        self.anomaly_detector = get_anomaly_detector()
        self.training_history: list = []
    
    def train(self, force_retrain: bool = False) -> Dict:
        """
        Execute full training pipeline
        
        Args:
            force_retrain: If True, retrain even if model exists
            
        Returns:
            Training results dictionary
        """
        logger.info("Starting model training pipeline...")
        start_time = datetime.now()
        
        # Check if model already exists
        if self.anomaly_detector.is_trained and not force_retrain:
            logger.info("Model already trained. Use force_retrain=True to retrain.")
            return {
                'success': True,
                'message': 'Model already trained',
                'model_info': self.anomaly_detector.get_model_info(),
                'retrained': False
            }
        
        try:
            # Step 1: Fetch and prepare data
            logger.info("Step 1: Fetching training data...")
            features, visit_df = self.data_processor.get_training_data()
            
            if features.size == 0:
                logger.warning("No training data available")
                return {
                    'success': False,
                    'error': 'No training data available',
                    'message': 'Please ensure there is billing data in the database'
                }
            
            # Step 2: Validate data quality
            logger.info("Step 2: Validating data quality...")
            validation = self._validate_data(features)
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'data_issues': validation.get('issues', [])
                }
            
            # Step 3: Normalize features
            logger.info("Step 3: Normalizing features...")
            normalized_features, normalization_params = self.data_processor.normalize_features(features)
            
            # Step 4: Train model
            logger.info("Step 4: Training Isolation Forest model...")
            training_metrics = self.anomaly_detector.train(
                normalized_features,
                normalization_params
            )
            
            if not training_metrics.get('success'):
                return {
                    'success': False,
                    'error': training_metrics.get('error', 'Training failed')
                }
            
            # Step 5: Validate model
            logger.info("Step 5: Validating trained model...")
            validation_results = self._validate_model(normalized_features)
            
            # Calculate training duration
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Record training history
            training_record = {
                'timestamp': start_time.isoformat(),
                'duration_seconds': duration,
                'n_samples': features.shape[0],
                'n_features': features.shape[1],
                'metrics': training_metrics,
                'validation': validation_results
            }
            self.training_history.append(training_record)
            
            # Save training history
            self._save_training_history()
            
            logger.info(f"Training complete in {duration:.2f} seconds")
            
            return {
                'success': True,
                'message': 'Model trained successfully',
                'retrained': True,
                'duration_seconds': duration,
                'training_metrics': training_metrics,
                'validation_results': validation_results,
                'model_info': self.anomaly_detector.get_model_info(),
                'data_summary': {
                    'n_samples': int(features.shape[0]),
                    'n_features': int(features.shape[1]),
                    'date_range': {
                        'start': visit_df['bill_date'].min().isoformat() if 'bill_date' in visit_df.columns and len(visit_df) > 0 else None,
                        'end': visit_df['bill_date'].max().isoformat() if 'bill_date' in visit_df.columns and len(visit_df) > 0 else None
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_data(self, features: np.ndarray) -> Dict:
        """
        Validate training data quality
        
        Args:
            features: Feature matrix
            
        Returns:
            Validation results
        """
        issues = []
        
        # Check minimum samples
        min_samples = self.config.DATA_CONFIG['min_samples_for_training']
        if features.shape[0] < min_samples:
            issues.append(f"Only {features.shape[0]} samples, minimum is {min_samples}")
        
        # Check for NaN values
        nan_count = np.isnan(features).sum()
        if nan_count > 0:
            nan_percentage = (nan_count / features.size) * 100
            if nan_percentage > 10:
                issues.append(f"{nan_percentage:.1f}% of values are NaN")
        
        # Check for infinite values
        inf_count = np.isinf(features).sum()
        if inf_count > 0:
            issues.append(f"{inf_count} infinite values found")
        
        # Check feature variance (all zeros = bad)
        zero_variance_features = np.sum(np.std(features, axis=0) == 0)
        if zero_variance_features > 0:
            issues.append(f"{zero_variance_features} features have zero variance")
        
        if issues:
            logger.warning(f"Data validation issues: {issues}")
            # Only fail if critical issues (not enough samples)
            if features.shape[0] < min_samples:
                return {
                    'valid': False,
                    'error': 'Insufficient training data',
                    'issues': issues
                }
        
        return {
            'valid': True,
            'issues': issues,
            'stats': {
                'n_samples': int(features.shape[0]),
                'n_features': int(features.shape[1]),
                'nan_count': int(nan_count),
                'mean': float(np.nanmean(features)),
                'std': float(np.nanstd(features))
            }
        }
    
    def _validate_model(self, features: np.ndarray) -> Dict:
        """
        Validate trained model performance
        
        Args:
            features: Normalized feature matrix
            
        Returns:
            Validation results
        """
        try:
            # Run predictions on training data
            predictions, scores = self.anomaly_detector.detect(features)
            
            if len(predictions) == 0:
                return {'valid': False, 'error': 'Model prediction failed'}
            
            # Calculate metrics
            n_anomalies = np.sum(predictions == -1)
            n_normal = np.sum(predictions == 1)
            anomaly_rate = n_anomalies / len(predictions)
            
            # Check if anomaly rate is within expected range
            expected_contamination = self.config.MODEL_PARAMS['contamination']
            rate_deviation = abs(anomaly_rate - expected_contamination) / expected_contamination
            
            return {
                'valid': True,
                'n_anomalies': int(n_anomalies),
                'n_normal': int(n_normal),
                'anomaly_rate': float(anomaly_rate),
                'expected_rate': float(expected_contamination),
                'rate_deviation': float(rate_deviation),
                'score_distribution': {
                    'min': float(np.min(scores)),
                    'max': float(np.max(scores)),
                    'mean': float(np.mean(scores)),
                    'std': float(np.std(scores)),
                    'median': float(np.median(scores))
                }
            }
            
        except Exception as e:
            logger.error(f"Model validation failed: {e}")
            return {'valid': False, 'error': str(e)}
    
    def _save_training_history(self):
        """Save training history to file"""
        try:
            history_path = os.path.join(
                self.config.MODEL_PATH,
                'training_history.json'
            )
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(history_path), exist_ok=True)
            
            import json
            with open(history_path, 'w') as f:
                json.dump(self.training_history[-10:], f, indent=2, default=str)
            
            logger.info(f"Saved training history to {history_path}")
            
        except Exception as e:
            logger.error(f"Error saving training history: {e}")
    
    def get_training_status(self) -> Dict:
        """
        Get current training status and model info
        
        Returns:
            Status dictionary
        """
        model_info = self.anomaly_detector.get_model_info()
        
        # Check if model file exists
        model_path = self.config.get_model_path()
        model_exists = os.path.exists(model_path)
        
        # Get last training info
        last_training = None
        if self.training_history:
            last_training = self.training_history[-1]
        
        return {
            'model_trained': model_info.get('is_trained', False),
            'model_exists': model_exists,
            'model_path': model_path,
            'model_info': model_info,
            'last_training': last_training,
            'config': {
                'n_estimators': self.config.MODEL_PARAMS['n_estimators'],
                'contamination': self.config.MODEL_PARAMS['contamination'],
                'lookback_days': self.config.DATA_CONFIG['lookback_days']
            }
        }
    
    def incremental_update(self, new_data_days: int = 7) -> Dict:
        """
        Perform incremental model update with recent data
        Note: Isolation Forest doesn't support true incremental learning,
        so this retrains with combined old + new data
        
        Args:
            new_data_days: Days of new data to include
            
        Returns:
            Update results
        """
        logger.info(f"Starting incremental update with {new_data_days} days of new data")
        
        # For Isolation Forest, we retrain with full data
        # A more sophisticated approach would use online learning algorithms
        return self.train(force_retrain=True)


# Singleton instance
_model_trainer = None

def get_model_trainer() -> ModelTrainer:
    """Get model trainer singleton instance"""
    global _model_trainer
    if _model_trainer is None:
        _model_trainer = ModelTrainer()
    return _model_trainer


# CLI interface for running training
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Revenue Leakage Detection Model')
    parser.add_argument('--force', action='store_true', help='Force retrain even if model exists')
    args = parser.parse_args()
    
    trainer = get_model_trainer()
    result = trainer.train(force_retrain=args.force)
    
    print("\n" + "="*50)
    print("Training Results:")
    print("="*50)
    
    import json
    print(json.dumps(result, indent=2, default=str))
