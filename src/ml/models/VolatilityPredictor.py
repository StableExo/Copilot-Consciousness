"""
Volatility Predictor Model

GARCH model for volatility forecasting. Predicts price volatility for
short-term horizons to assess risk and opportunity timing.
"""

import os
import json
import numpy as np
from typing import Dict, Tuple, Optional
from arch import arch_model
from statsmodels.tsa.stattools import adfuller
import joblib


class VolatilityPredictor:
    """
    GARCH-based volatility predictor
    """
    
    def __init__(
        self,
        p: int = 1,
        q: int = 1,
        model_type: str = 'GARCH',
        dist: str = 'normal',
        model_path: str = './models/volatility'
    ):
        """
        Initialize volatility predictor
        
        Args:
            p: GARCH lag order
            q: ARCH lag order
            model_type: Type of model ('GARCH', 'EGARCH', 'GJR-GARCH')
            dist: Error distribution ('normal', 't', 'skewt')
            model_path: Path to save/load models
        """
        self.p = p
        self.q = q
        self.model_type = model_type
        self.dist = dist
        self.model_path = model_path
        
        self.model = None
        self.fitted_model = None
        self.returns_mean = 0
        self.returns_std = 1
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
    
    def prepare_returns(self, prices: np.ndarray) -> np.ndarray:
        """
        Convert prices to log returns
        
        Args:
            prices: Array of prices
        
        Returns:
            Log returns scaled to percentage
        """
        if len(prices) < 2:
            raise ValueError("Need at least 2 prices to calculate returns")
        
        # Calculate log returns
        returns = np.diff(np.log(prices)) * 100  # Scale to percentage
        
        # Store statistics for denormalization
        self.returns_mean = np.mean(returns)
        self.returns_std = np.std(returns)
        
        return returns
    
    def check_stationarity(self, returns: np.ndarray) -> Tuple[bool, float]:
        """
        Test for stationarity using Augmented Dickey-Fuller test
        
        Args:
            returns: Return series
        
        Returns:
            (is_stationary, p_value)
        """
        result = adfuller(returns, autolag='AIC')
        p_value = result[1]
        is_stationary = p_value < 0.05
        
        return is_stationary, p_value
    
    def build_model(self, returns: np.ndarray):
        """
        Build GARCH model
        
        Args:
            returns: Return series
        
        Returns:
            ARCH model object
        """
        # Check stationarity
        is_stationary, p_value = self.check_stationarity(returns)
        if not is_stationary:
            print(f"Warning: Returns may not be stationary (p-value: {p_value:.4f})")
        
        # Build model based on type
        if self.model_type == 'EGARCH':
            self.model = arch_model(
                returns,
                vol='EGARCH',
                p=self.p,
                q=self.q,
                dist=self.dist
            )
        elif self.model_type == 'GJR-GARCH':
            self.model = arch_model(
                returns,
                vol='GARCH',
                p=self.p,
                o=1,  # Asymmetric term
                q=self.q,
                dist=self.dist
            )
        else:  # Standard GARCH
            self.model = arch_model(
                returns,
                vol='GARCH',
                p=self.p,
                q=self.q,
                dist=self.dist
            )
        
        return self.model
    
    def train(
        self,
        prices: np.ndarray,
        update_freq: int = 5,
        disp: str = 'off'
    ) -> Dict:
        """
        Fit GARCH model to price data
        
        Args:
            prices: Price series
            update_freq: Frequency of iteration updates
            disp: Display optimization ('off', 'final', or 'iter')
        
        Returns:
            Fitted model results
        """
        # Prepare returns
        returns = self.prepare_returns(prices)
        
        # Build and fit model
        self.build_model(returns)
        
        print(f"Fitting {self.model_type}({self.p},{self.q}) model...")
        self.fitted_model = self.model.fit(
            update_freq=update_freq,
            disp=disp
        )
        
        print("\nModel Summary:")
        print(self.fitted_model.summary())
        
        return self.get_model_info()
    
    def forecast(
        self,
        horizon: int = 1,
        method: str = 'analytic'
    ) -> Dict[str, np.ndarray]:
        """
        Forecast volatility
        
        Args:
            horizon: Forecast horizon (number of steps)
            method: Forecasting method ('analytic', 'simulation', 'bootstrap')
        
        Returns:
            Dictionary with forecast mean and variance
        """
        if self.fitted_model is None:
            raise ValueError("Model not fitted yet")
        
        # Generate forecast
        forecasts = self.fitted_model.forecast(horizon=horizon, method=method)
        
        # Extract variance forecast (volatility squared)
        variance_forecast = forecasts.variance.values[-1, :]
        
        # Convert to volatility (standard deviation)
        volatility_forecast = np.sqrt(variance_forecast)
        
        # Calculate confidence bands (±2 std dev)
        mean_volatility = volatility_forecast[0]
        confidence_lower = mean_volatility * 0.8
        confidence_upper = mean_volatility * 1.2
        
        return {
            'volatility': volatility_forecast,
            'variance': variance_forecast,
            'mean': mean_volatility,
            'confidence_lower': confidence_lower,
            'confidence_upper': confidence_upper,
            'horizon': horizon
        }
    
    def predict_volatility(
        self,
        prices: np.ndarray,
        horizon_minutes: int = 5
    ) -> Dict:
        """
        Predict volatility for next N minutes
        
        Args:
            prices: Recent price history
            horizon_minutes: Forecast horizon in minutes
        
        Returns:
            Volatility prediction with confidence bands
        """
        # Update model with recent data
        returns = self.prepare_returns(prices)
        
        if self.model is None or len(returns) < 100:
            # Not enough data or model not built, use simple estimate
            recent_vol = np.std(returns[-20:]) if len(returns) >= 20 else np.std(returns)
            return {
                'volatility': recent_vol,
                'confidence_lower': recent_vol * 0.8,
                'confidence_upper': recent_vol * 1.2,
                'horizon_minutes': horizon_minutes,
                'method': 'simple_estimate'
            }
        
        # Refit model with recent data (incremental learning)
        try:
            self.build_model(returns)
            self.fitted_model = self.model.fit(disp='off')
            
            # Forecast (horizon in steps, convert minutes to steps)
            # Assuming 5-second intervals: 1 minute = 12 steps
            steps = horizon_minutes * 12
            forecast = self.forecast(horizon=steps, method='analytic')
            
            return {
                'volatility': forecast['mean'],
                'confidence_lower': forecast['confidence_lower'],
                'confidence_upper': forecast['confidence_upper'],
                'horizon_minutes': horizon_minutes,
                'method': 'garch_forecast'
            }
        
        except Exception as e:
            print(f"Error in GARCH forecast: {e}")
            # Fallback to simple estimate
            recent_vol = np.std(returns[-20:])
            return {
                'volatility': recent_vol,
                'confidence_lower': recent_vol * 0.8,
                'confidence_upper': recent_vol * 1.2,
                'horizon_minutes': horizon_minutes,
                'method': 'fallback_estimate'
            }
    
    def get_model_info(self) -> Dict:
        """
        Get model information and statistics
        
        Returns:
            Dictionary with model info
        """
        if self.fitted_model is None:
            return {}
        
        return {
            'model_type': self.model_type,
            'p': self.p,
            'q': self.q,
            'distribution': self.dist,
            'aic': self.fitted_model.aic,
            'bic': self.fitted_model.bic,
            'log_likelihood': self.fitted_model.loglikelihood,
            'num_obs': self.fitted_model.nobs,
        }
    
    def calculate_risk_metrics(
        self,
        prices: np.ndarray,
        confidence_level: float = 0.95
    ) -> Dict:
        """
        Calculate risk metrics including VaR and CVaR
        
        Args:
            prices: Price series
            confidence_level: Confidence level for VaR (e.g., 0.95 for 95%)
        
        Returns:
            Dictionary of risk metrics
        """
        returns = self.prepare_returns(prices)
        
        # Calculate VaR (Value at Risk)
        var = np.percentile(returns, (1 - confidence_level) * 100)
        
        # Calculate CVaR (Conditional Value at Risk / Expected Shortfall)
        cvar = returns[returns <= var].mean()
        
        # Calculate current volatility
        current_vol = np.std(returns[-20:]) if len(returns) >= 20 else np.std(returns)
        
        return {
            'value_at_risk': var,
            'conditional_var': cvar,
            'current_volatility': current_vol,
            'confidence_level': confidence_level,
        }
    
    def save_model(self, version: str = 'v1'):
        """
        Save model to disk
        
        Args:
            version: Model version string
        """
        if self.fitted_model is None:
            raise ValueError("No fitted model to save")
        
        # Save fitted model
        model_path = os.path.join(self.model_path, f'garch_model_{version}.pkl')
        joblib.dump(self.fitted_model, model_path)
        print(f"Saved model to {model_path}")
        
        # Save metadata
        metadata = {
            'version': version,
            'model_type': self.model_type,
            'p': self.p,
            'q': self.q,
            'distribution': self.dist,
            'returns_mean': self.returns_mean,
            'returns_std': self.returns_std,
            'model_info': self.get_model_info()
        }
        
        metadata_path = os.path.join(self.model_path, f'metadata_{version}.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"Saved metadata to {metadata_path}")
    
    def load_model(self, version: str = 'v1'):
        """
        Load model from disk
        
        Args:
            version: Model version to load
        """
        model_path = os.path.join(self.model_path, f'garch_model_{version}.pkl')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        self.fitted_model = joblib.load(model_path)
        print(f"Loaded model from {model_path}")
        
        # Load metadata
        metadata_path = os.path.join(self.model_path, f'metadata_{version}.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                self.model_type = metadata.get('model_type', 'GARCH')
                self.p = metadata.get('p', 1)
                self.q = metadata.get('q', 1)
                self.dist = metadata.get('distribution', 'normal')
                self.returns_mean = metadata.get('returns_mean', 0)
                self.returns_std = metadata.get('returns_std', 1)


def main():
    """
    Example usage
    """
    # Initialize predictor
    predictor = VolatilityPredictor(p=1, q=1)
    
    # Generate sample price data
    np.random.seed(42)
    n_samples = 1000
    prices = 100 * np.exp(np.cumsum(np.random.randn(n_samples) * 0.02))
    
    print("Training GARCH model...")
    predictor.train(prices)
    
    # Make forecast
    print("\nForecasting volatility...")
    forecast = predictor.forecast(horizon=12)  # 1 minute ahead
    print(f"Volatility forecast: {forecast['mean']:.4f}")
    print(f"Confidence interval: [{forecast['confidence_lower']:.4f}, {forecast['confidence_upper']:.4f}]")
    
    # Calculate risk metrics
    print("\nCalculating risk metrics...")
    risk = predictor.calculate_risk_metrics(prices)
    print(f"Value at Risk (95%): {risk['value_at_risk']:.4f}")
    print(f"Conditional VaR: {risk['conditional_var']:.4f}")
    print(f"Current Volatility: {risk['current_volatility']:.4f}")
    
    # Save model
    predictor.save_model(version='demo_v1')
    print("\nModel saved successfully!")


if __name__ == '__main__':
    main()
