"""
Time Series Base Module for Predictive Analytics
Provides Prophet and ARIMA implementations for forecasting
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
import joblib
from abc import ABC, abstractmethod

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.utils import setup_logging

logger = setup_logging('time_series')


class BasePredictor(ABC):
    """Abstract base class for time series predictors"""
    
    def __init__(self, model_path: str):
        """
        Initialize predictor
        
        Args:
            model_path: Path to save/load model
        """
        self.model = None
        self.model_path = model_path
        self.is_trained = False
        self.training_metadata: Dict = {}
        
        # Try to load existing model
        self._load_model()
    
    def _load_model(self) -> bool:
        """Load model from disk"""
        if os.path.exists(self.model_path):
            try:
                saved_data = joblib.load(self.model_path)
                self.model = saved_data.get('model')
                self.training_metadata = saved_data.get('metadata', {})
                self.is_trained = True
                logger.info(f"Loaded model from {self.model_path}")
                return True
            except Exception as e:
                logger.error(f"Error loading model: {e}")
                return False
        return False
    
    def _save_model(self) -> bool:
        """Save model to disk"""
        if self.model is None:
            return False
        
        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            save_data = {
                'model': self.model,
                'metadata': self.training_metadata
            }
            joblib.dump(save_data, self.model_path)
            logger.info(f"Saved model to {self.model_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return False
    
    @abstractmethod
    def train(self, data: pd.DataFrame) -> Dict:
        """Train the model with historical data"""
        pass
    
    @abstractmethod
    def predict(self, periods: int) -> pd.DataFrame:
        """Generate predictions for future periods"""
        pass
    
    def get_model_info(self) -> Dict:
        """Get model information"""
        return {
            'is_trained': self.is_trained,
            'model_path': self.model_path,
            'training_metadata': self.training_metadata
        }


class ProphetPredictor(BasePredictor):
    """Prophet-based time series predictor"""
    
    def __init__(self, model_path: str, config: Dict = None):
        """
        Initialize Prophet predictor
        
        Args:
            model_path: Path to save/load model
            config: Prophet configuration parameters
        """
        self.config = config or {}
        super().__init__(model_path)
    
    def train(self, data: pd.DataFrame) -> Dict:
        """
        Train Prophet model
        
        Args:
            data: DataFrame with 'ds' (datetime) and 'y' (value) columns
            
        Returns:
            Training metrics
        """
        try:
            from prophet import Prophet
        except ImportError:
            logger.error("Prophet not installed. Install with: pip install prophet")
            return {'success': False, 'error': 'Prophet not installed'}
        
        if data.empty or len(data) < 2:
            return {'success': False, 'error': 'Insufficient training data'}
        
        # Ensure correct column names
        if 'ds' not in data.columns or 'y' not in data.columns:
            logger.error("Data must have 'ds' and 'y' columns")
            return {'success': False, 'error': "Data must have 'ds' and 'y' columns"}
        
        try:
            logger.info(f"Training Prophet model with {len(data)} samples")
            
            # Create and configure Prophet model
            self.model = Prophet(
                yearly_seasonality=self.config.get('yearly_seasonality', True),
                weekly_seasonality=self.config.get('weekly_seasonality', True),
                daily_seasonality=self.config.get('daily_seasonality', True),
                changepoint_prior_scale=self.config.get('changepoint_prior_scale', 0.05),
                seasonality_prior_scale=self.config.get('seasonality_prior_scale', 10),
                interval_width=self.config.get('interval_width', 0.95)
            )
            
            # Fit model
            self.model.fit(data)
            
            self.is_trained = True
            self.training_metadata = {
                'trained_at': datetime.now().isoformat(),
                'n_samples': len(data),
                'date_range': {
                    'start': data['ds'].min().isoformat(),
                    'end': data['ds'].max().isoformat()
                },
                'model_type': 'Prophet'
            }
            
            # Save model
            self._save_model()
            
            return {
                'success': True,
                'n_samples': len(data),
                'metadata': self.training_metadata
            }
            
        except Exception as e:
            logger.error(f"Prophet training error: {e}")
            return {'success': False, 'error': str(e)}
    
    def predict(self, periods: int, freq: str = 'H') -> pd.DataFrame:
        """
        Generate predictions
        
        Args:
            periods: Number of periods to predict
            freq: Frequency ('H' for hourly, 'D' for daily)
            
        Returns:
            DataFrame with predictions
        """
        if not self.is_trained or self.model is None:
            logger.error("Model not trained")
            return pd.DataFrame()
        
        try:
            # Create future dataframe
            future = self.model.make_future_dataframe(periods=periods, freq=freq)
            
            # Generate predictions
            forecast = self.model.predict(future)
            
            # Get only future predictions
            forecast = forecast.tail(periods)
            
            return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
            
        except Exception as e:
            logger.error(f"Prophet prediction error: {e}")
            return pd.DataFrame()
    
    def predict_at_datetime(self, target_datetime: datetime) -> Dict:
        """
        Get prediction for specific datetime
        
        Args:
            target_datetime: Target datetime
            
        Returns:
            Prediction dictionary
        """
        if not self.is_trained:
            return {'error': 'Model not trained'}
        
        try:
            future = pd.DataFrame({'ds': [target_datetime]})
            forecast = self.model.predict(future)
            
            return {
                'datetime': target_datetime.isoformat(),
                'predicted_value': float(forecast['yhat'].iloc[0]),
                'lower_bound': float(forecast['yhat_lower'].iloc[0]),
                'upper_bound': float(forecast['yhat_upper'].iloc[0])
            }
        except Exception as e:
            return {'error': str(e)}


class ARIMAPredictor(BasePredictor):
    """ARIMA/SARIMA-based time series predictor"""
    
    def __init__(self, model_path: str, config: Dict = None):
        """
        Initialize ARIMA predictor
        
        Args:
            model_path: Path to save/load model
            config: ARIMA configuration parameters
        """
        self.config = config or {}
        self.last_values: Optional[pd.Series] = None
        super().__init__(model_path)
    
    def train(self, data: pd.DataFrame) -> Dict:
        """
        Train ARIMA/SARIMA model
        
        Args:
            data: DataFrame with datetime index and 'value' column
            
        Returns:
            Training metrics
        """
        try:
            from statsmodels.tsa.statespace.sarimax import SARIMAX
        except ImportError:
            logger.error("statsmodels not installed")
            return {'success': False, 'error': 'statsmodels not installed'}
        
        if data.empty or len(data) < 10:
            return {'success': False, 'error': 'Insufficient training data'}
        
        try:
            logger.info(f"Training ARIMA model with {len(data)} samples")
            
            # Prepare data
            if 'value' in data.columns:
                series = data['value']
            elif 'y' in data.columns:
                series = data['y']
            else:
                series = data.iloc[:, 0]
            
            # Store last values for prediction reference
            self.last_values = series.tail(10)
            
            # Get ARIMA parameters
            order = self.config.get('order', (1, 1, 1))
            seasonal_order = self.config.get('seasonal_order', (1, 1, 1, 7))
            
            # Fit SARIMAX model
            self.model = SARIMAX(
                series,
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            
            self.model = self.model.fit(disp=False)
            
            self.is_trained = True
            self.training_metadata = {
                'trained_at': datetime.now().isoformat(),
                'n_samples': len(data),
                'order': order,
                'seasonal_order': seasonal_order,
                'model_type': 'SARIMA',
                'aic': float(self.model.aic),
                'bic': float(self.model.bic)
            }
            
            # Save model
            self._save_model()
            
            return {
                'success': True,
                'n_samples': len(data),
                'aic': float(self.model.aic),
                'metadata': self.training_metadata
            }
            
        except Exception as e:
            logger.error(f"ARIMA training error: {e}")
            return {'success': False, 'error': str(e)}
    
    def predict(self, periods: int, start_date: datetime = None) -> pd.DataFrame:
        """
        Generate predictions
        
        Args:
            periods: Number of periods to predict
            start_date: Start date for predictions
            
        Returns:
            DataFrame with predictions
        """
        if not self.is_trained or self.model is None:
            logger.error("Model not trained")
            return pd.DataFrame()
        
        try:
            # Get forecast
            forecast = self.model.get_forecast(steps=periods)
            predictions = forecast.predicted_mean
            conf_int = forecast.conf_int()
            
            # Create result dataframe
            if start_date is None:
                start_date = datetime.now()
            
            dates = pd.date_range(start=start_date, periods=periods, freq='D')
            
            result = pd.DataFrame({
                'ds': dates,
                'yhat': predictions.values,
                'yhat_lower': conf_int.iloc[:, 0].values,
                'yhat_upper': conf_int.iloc[:, 1].values
            })
            
            return result
            
        except Exception as e:
            logger.error(f"ARIMA prediction error: {e}")
            return pd.DataFrame()


def prepare_time_series_data(
    data: List[Dict],
    date_field: str,
    value_field: str = None,
    aggregation: str = 'count',
    freq: str = 'H'
) -> pd.DataFrame:
    """
    Prepare time series data for Prophet/ARIMA
    
    Args:
        data: List of records
        date_field: Field containing datetime
        value_field: Field containing value (for sum/mean aggregation)
        aggregation: 'count', 'sum', or 'mean'
        freq: Resampling frequency ('H' for hourly, 'D' for daily)
        
    Returns:
        DataFrame with 'ds' and 'y' columns
    """
    if not data:
        return pd.DataFrame(columns=['ds', 'y'])
    
    df = pd.DataFrame(data)
    
    if date_field not in df.columns:
        logger.error(f"Date field '{date_field}' not found")
        return pd.DataFrame(columns=['ds', 'y'])
    
    # Convert to datetime
    df[date_field] = pd.to_datetime(df[date_field])
    df = df.set_index(date_field)
    
    # Aggregate based on type
    if aggregation == 'count':
        series = df.resample(freq).size()
    elif aggregation == 'sum' and value_field:
        series = df[value_field].resample(freq).sum()
    elif aggregation == 'mean' and value_field:
        series = df[value_field].resample(freq).mean()
    else:
        series = df.resample(freq).size()
    
    # Fill missing values
    series = series.fillna(0)
    
    # Create result dataframe
    result = pd.DataFrame({
        'ds': series.index,
        'y': series.values
    })
    
    return result
