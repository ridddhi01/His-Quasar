"""
Anomaly Detector for Revenue Leakage Detection
Implements Isolation Forest model for detecting billing anomalies
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Optional, Tuple, Any
import joblib
import sys

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.utils import setup_logging
from config import Config

logger = setup_logging('anomaly_detector')


class AnomalyDetector:
    """
    Isolation Forest-based anomaly detector for billing data
    Detects unusual patterns that may indicate revenue leakage
    """
    
    def __init__(self):
        """Initialize anomaly detector"""
        self.model: Optional[IsolationForest] = None
        self.config = Config
        self.is_trained = False
        self.normalization_params: Dict = {}
        
        # Load model if exists
        self._load_model()
    
    def _load_model(self) -> bool:
        """
        Load trained model from disk
        
        Returns:
            True if model loaded successfully
        """
        model_path = self.config.get_model_path()
        
        if os.path.exists(model_path):
            try:
                saved_data = joblib.load(model_path)
                self.model = saved_data.get('model')
                self.normalization_params = saved_data.get('normalization_params', {})
                self.is_trained = True
                logger.info(f"Loaded trained model from {model_path}")
                return True
            except Exception as e:
                logger.error(f"Error loading model: {e}")
                return False
        else:
            logger.info("No pre-trained model found")
            return False
    
    def save_model(self) -> bool:
        """
        Save trained model to disk
        
        Returns:
            True if saved successfully
        """
        if self.model is None:
            logger.warning("No model to save")
            return False
        
        model_path = self.config.get_model_path()
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        try:
            save_data = {
                'model': self.model,
                'normalization_params': self.normalization_params
            }
            joblib.dump(save_data, model_path)
            logger.info(f"Saved model to {model_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return False
    
    def train(self, features: np.ndarray, normalization_params: Dict = None) -> Dict:
        """
        Train the Isolation Forest model
        
        Args:
            features: Training feature matrix (normalized)
            normalization_params: Parameters used for normalization
            
        Returns:
            Training metrics dictionary
        """
        if features.size == 0:
            logger.error("Cannot train on empty data")
            return {'success': False, 'error': 'Empty training data'}
        
        min_samples = self.config.DATA_CONFIG['min_samples_for_training']
        if features.shape[0] < min_samples:
            logger.warning(f"Training data has only {features.shape[0]} samples, minimum is {min_samples}")
        
        logger.info(f"Training Isolation Forest on {features.shape[0]} samples with {features.shape[1]} features")
        
        try:
            # Create model with config parameters
            self.model = IsolationForest(
                n_estimators=self.config.MODEL_PARAMS['n_estimators'],
                contamination=self.config.MODEL_PARAMS['contamination'],
                max_samples=self.config.MODEL_PARAMS['max_samples'],
                max_features=self.config.MODEL_PARAMS['max_features'],
                bootstrap=self.config.MODEL_PARAMS['bootstrap'],
                n_jobs=self.config.MODEL_PARAMS['n_jobs'],
                random_state=self.config.MODEL_PARAMS['random_state']
            )
            
            # Train model
            self.model.fit(features)
            
            # Store normalization params
            if normalization_params:
                self.normalization_params = normalization_params
            
            self.is_trained = True
            
            # Calculate training metrics
            scores = self.model.score_samples(features)
            predictions = self.model.predict(features)
            
            n_anomalies = np.sum(predictions == -1)
            anomaly_rate = n_anomalies / len(predictions)
            
            metrics = {
                'success': True,
                'n_samples': features.shape[0],
                'n_features': features.shape[1],
                'n_anomalies_detected': int(n_anomalies),
                'anomaly_rate': float(anomaly_rate),
                'score_mean': float(np.mean(scores)),
                'score_std': float(np.std(scores)),
                'score_min': float(np.min(scores)),
                'score_max': float(np.max(scores))
            }
            
            logger.info(f"Training complete. Anomaly rate: {anomaly_rate:.2%}")
            
            # Save model
            self.save_model()
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error during training: {e}")
            return {'success': False, 'error': str(e)}
    
    def detect(self, features: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detect anomalies in feature matrix
        
        Args:
            features: Feature matrix to analyze
            
        Returns:
            Tuple of (predictions, anomaly_scores)
            predictions: -1 for anomaly, 1 for normal
            anomaly_scores: Lower scores indicate more anomalous
        """
        if not self.is_trained or self.model is None:
            logger.error("Model not trained. Please train the model first.")
            return np.array([]), np.array([])
        
        if features.size == 0:
            logger.warning("Empty feature array provided")
            return np.array([]), np.array([])
        
        try:
            # Get predictions and scores
            predictions = self.model.predict(features)
            scores = self.model.score_samples(features)
            
            n_anomalies = np.sum(predictions == -1)
            logger.info(f"Detected {n_anomalies} anomalies in {len(predictions)} samples")
            
            return predictions, scores
            
        except Exception as e:
            logger.error(f"Error during detection: {e}")
            return np.array([]), np.array([])
    
    def predict_single(self, features: np.ndarray) -> Dict:
        """
        Predict anomaly for a single sample
        
        Args:
            features: Single sample feature vector
            
        Returns:
            Dictionary with prediction results
        """
        if not self.is_trained or self.model is None:
            return {'is_anomaly': False, 'error': 'Model not trained'}
        
        try:
            # Reshape if needed
            if features.ndim == 1:
                features = features.reshape(1, -1)
            
            prediction = self.model.predict(features)[0]
            score = self.model.score_samples(features)[0]
            
            threshold = self.config.ALERT_THRESHOLDS['anomaly_score_threshold']
            
            return {
                'is_anomaly': prediction == -1,
                'anomaly_score': float(score),
                'threshold': threshold,
                'confidence': self._calculate_confidence(score)
            }
            
        except Exception as e:
            logger.error(f"Error in single prediction: {e}")
            return {'is_anomaly': False, 'error': str(e)}
    
    def _calculate_confidence(self, score: float) -> float:
        """
        Calculate confidence level for anomaly detection
        Based on how far the score is from the threshold
        
        Args:
            score: Anomaly score
            
        Returns:
            Confidence level (0-1)
        """
        threshold = self.config.ALERT_THRESHOLDS['anomaly_score_threshold']
        
        # For Isolation Forest, lower scores = more anomalous
        if score >= 0:
            # Normal sample
            return min(1.0, score / 0.5)
        else:
            # Anomalous sample - confidence increases as score gets more negative
            return min(1.0, abs(score) / abs(threshold))
    
    def get_anomaly_details(self, features: np.ndarray, visit_df: pd.DataFrame) -> List[Dict]:
        """
        Get detailed anomaly information with original data
        
        Args:
            features: Feature matrix
            visit_df: Original visit DataFrame
            
        Returns:
            List of anomaly details
        """
        if features.size == 0 or visit_df.empty:
            return []
        
        predictions, scores = self.detect(features)
        
        if len(predictions) == 0:
            return []
        
        anomalies = []
        threshold = self.config.ALERT_THRESHOLDS['anomaly_score_threshold']
        
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:  # Anomaly detected
                row = visit_df.iloc[i]
                
                anomaly = {
                    'index': i,
                    'visit_id': row.get('visit_id', ''),
                    'patient_id': row.get('patient_id', ''),
                    'bill_id': row.get('bill_id', ''),
                    'visit_type': row.get('visit_type', ''),
                    'anomaly_score': float(score),
                    'confidence': self._calculate_confidence(score),
                    'features': {
                        'total_services': row.get('total_services', 0),
                        'total_billed_amount': row.get('total_billed_amount', 0),
                        'total_expected_amount': row.get('total_expected_amount', 0),
                        'price_variance_ratio': row.get('price_variance_ratio', 0),
                        'unbilled_items_count': row.get('unbilled_items_count', 0),
                        'payment_completion_ratio': row.get('payment_completion_ratio', 0)
                    }
                }
                anomalies.append(anomaly)
        
        # Sort by anomaly score (most anomalous first)
        anomalies.sort(key=lambda x: x['anomaly_score'])
        
        return anomalies
    
    def get_model_info(self) -> Dict:
        """Get information about the current model"""
        if not self.is_trained or self.model is None:
            return {
                'is_trained': False,
                'message': 'No model trained'
            }
        
        return {
            'is_trained': True,
            'model_type': 'IsolationForest',
            'n_estimators': self.model.n_estimators,
            'contamination': self.model.contamination,
            'has_normalization_params': bool(self.normalization_params),
            'model_path': self.config.get_model_path()
        }


# Singleton instance
_anomaly_detector = None

def get_anomaly_detector() -> AnomalyDetector:
    """Get anomaly detector singleton instance"""
    global _anomaly_detector
    if _anomaly_detector is None:
        _anomaly_detector = AnomalyDetector()
    return _anomaly_detector
