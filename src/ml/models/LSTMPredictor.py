"""
LSTM Price Prediction Model

Neural network for short-term price forecasting using LSTM architecture.
Predicts price movements for multiple time horizons (5s, 10s, 15s, 30s).
"""

import os
import json
import numpy as np
from typing import List, Tuple, Dict, Optional
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import tensorflowjs as tfjs


class LSTMPredictor:
    """
    LSTM-based price predictor for short-term forecasting
    """
    
    def __init__(
        self,
        sequence_length: int = 60,
        prediction_horizons: List[int] = [5, 10, 15, 30],
        feature_dim: int = 10,
        model_path: str = './models/lstm'
    ):
        """
        Initialize LSTM predictor
        
        Args:
            sequence_length: Number of time steps in input sequence
            prediction_horizons: Time horizons to predict (in seconds)
            feature_dim: Number of input features
            model_path: Path to save/load models
        """
        self.sequence_length = sequence_length
        self.prediction_horizons = prediction_horizons
        self.feature_dim = feature_dim
        self.model_path = model_path
        self.model = None
        self.history = None
        self.scaler_params = None
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
    
    def build_model(self) -> keras.Model:
        """
        Build LSTM model architecture
        
        Returns:
            Compiled Keras model
        """
        # Input layer
        inputs = keras.Input(shape=(self.sequence_length, self.feature_dim))
        
        # LSTM layers with dropout for regularization
        x = layers.LSTM(128, return_sequences=True)(inputs)
        x = layers.Dropout(0.2)(x)
        
        x = layers.LSTM(64, return_sequences=True)(x)
        x = layers.Dropout(0.2)(x)
        
        x = layers.LSTM(32, return_sequences=False)(x)
        x = layers.Dropout(0.2)(x)
        
        # Dense layers for each prediction horizon
        outputs = []
        for horizon in self.prediction_horizons:
            output = layers.Dense(32, activation='relu', name=f'dense_{horizon}s')(x)
            output = layers.Dropout(0.1)(output)
            # Output: [predicted_price, confidence_lower, confidence_upper]
            output = layers.Dense(3, activation='linear', name=f'pred_{horizon}s')(output)
            outputs.append(output)
        
        # Build model
        model = keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile with Adam optimizer
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        self.model = model
        return model
    
    def prepare_sequences(
        self,
        data: np.ndarray,
        targets: np.ndarray
    ) -> Tuple[np.ndarray, List[np.ndarray]]:
        """
        Prepare time-series sequences for training
        
        Args:
            data: Input features [n_samples, n_features]
            targets: Target prices for each horizon [n_samples, n_horizons]
        
        Returns:
            X: Input sequences [n_sequences, sequence_length, n_features]
            y: Target sequences [n_horizons x [n_sequences, 3]]
        """
        X = []
        y_list = [[] for _ in self.prediction_horizons]
        
        # Create sequences
        for i in range(len(data) - self.sequence_length - max(self.prediction_horizons)):
            # Input sequence
            X.append(data[i:i + self.sequence_length])
            
            # Targets for each horizon
            for j, horizon in enumerate(self.prediction_horizons):
                target_idx = i + self.sequence_length + horizon
                if target_idx < len(targets):
                    # Target: [price, lower_bound, upper_bound]
                    target_price = targets[target_idx, j]
                    # Estimate confidence intervals (±2%)
                    lower = target_price * 0.98
                    upper = target_price * 1.02
                    y_list[j].append([target_price, lower, upper])
        
        X = np.array(X)
        y = [np.array(y_h) for y_h in y_list]
        
        return X, y
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: List[np.ndarray],
        X_val: np.ndarray,
        y_val: List[np.ndarray],
        epochs: int = 100,
        batch_size: int = 32,
        patience: int = 10
    ) -> keras.callbacks.History:
        """
        Train the LSTM model
        
        Args:
            X_train: Training sequences
            y_train: Training targets (list for each horizon)
            X_val: Validation sequences
            y_val: Validation targets
            epochs: Maximum training epochs
            batch_size: Training batch size
            patience: Early stopping patience
        
        Returns:
            Training history
        """
        if self.model is None:
            self.build_model()
        
        # Callbacks
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=patience,
                restore_best_weights=True,
                verbose=1
            ),
            ModelCheckpoint(
                os.path.join(self.model_path, 'best_model.h5'),
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=0.00001,
                verbose=1
            )
        ]
        
        # Train model
        self.history = self.model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        return self.history
    
    def predict(self, X: np.ndarray) -> List[Dict[str, np.ndarray]]:
        """
        Make predictions for input sequences
        
        Args:
            X: Input sequences [n_sequences, sequence_length, n_features]
        
        Returns:
            List of predictions for each horizon
        """
        if self.model is None:
            raise ValueError("Model not built or loaded")
        
        predictions = self.model.predict(X)
        
        # Format predictions
        results = []
        for i, horizon in enumerate(self.prediction_horizons):
            pred = predictions[i] if len(self.prediction_horizons) > 1 else predictions
            results.append({
                'horizon': horizon,
                'predicted_price': pred[:, 0],
                'confidence_lower': pred[:, 1],
                'confidence_upper': pred[:, 2]
            })
        
        return results
    
    def save_model(self, version: str = 'v1'):
        """
        Save model to disk in multiple formats
        
        Args:
            version: Model version string
        """
        if self.model is None:
            raise ValueError("No model to save")
        
        # Save Keras model
        keras_path = os.path.join(self.model_path, f'lstm_model_{version}.h5')
        self.model.save(keras_path)
        print(f"Saved Keras model to {keras_path}")
        
        # Save as TensorFlow.js format for Node.js inference
        tfjs_path = os.path.join(self.model_path, f'tfjs_{version}')
        tfjs.converters.save_keras_model(self.model, tfjs_path)
        print(f"Saved TensorFlow.js model to {tfjs_path}")
        
        # Save metadata
        metadata = {
            'version': version,
            'sequence_length': self.sequence_length,
            'prediction_horizons': self.prediction_horizons,
            'feature_dim': self.feature_dim,
            'scaler_params': self.scaler_params
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
        keras_path = os.path.join(self.model_path, f'lstm_model_{version}.h5')
        
        if not os.path.exists(keras_path):
            raise FileNotFoundError(f"Model not found at {keras_path}")
        
        self.model = keras.models.load_model(keras_path)
        print(f"Loaded model from {keras_path}")
        
        # Load metadata
        metadata_path = os.path.join(self.model_path, f'metadata_{version}.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                self.sequence_length = metadata['sequence_length']
                self.prediction_horizons = metadata['prediction_horizons']
                self.feature_dim = metadata['feature_dim']
                self.scaler_params = metadata.get('scaler_params')
    
    def evaluate(self, X_test: np.ndarray, y_test: List[np.ndarray]) -> Dict[str, float]:
        """
        Evaluate model on test data
        
        Args:
            X_test: Test sequences
            y_test: Test targets
        
        Returns:
            Dictionary of evaluation metrics
        """
        if self.model is None:
            raise ValueError("Model not built or loaded")
        
        results = self.model.evaluate(X_test, y_test, verbose=0)
        
        # Parse results
        metrics = {}
        loss_values = results[:len(self.prediction_horizons) + 1]
        metrics['total_loss'] = loss_values[0]
        
        for i, horizon in enumerate(self.prediction_horizons):
            metrics[f'loss_{horizon}s'] = loss_values[i + 1] if i + 1 < len(loss_values) else 0
        
        return metrics
    
    def calculate_accuracy(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        tolerance: float = 0.02
    ) -> float:
        """
        Calculate prediction accuracy (within tolerance)
        
        Args:
            y_true: True values
            y_pred: Predicted values
            tolerance: Acceptable error tolerance (2% default)
        
        Returns:
            Accuracy percentage
        """
        errors = np.abs(y_true - y_pred) / (y_true + 1e-8)
        accurate = errors < tolerance
        return np.mean(accurate) * 100


def main():
    """
    Example training script
    """
    # Initialize predictor
    predictor = LSTMPredictor(
        sequence_length=60,
        prediction_horizons=[5, 10, 15, 30],
        feature_dim=10
    )
    
    # Build model
    model = predictor.build_model()
    print(model.summary())
    
    # Generate sample data for demonstration
    n_samples = 10000
    X_train = np.random.randn(n_samples, 60, 10)
    y_train = [np.random.randn(n_samples, 3) for _ in range(4)]
    
    X_val = np.random.randn(1000, 60, 10)
    y_val = [np.random.randn(1000, 3) for _ in range(4)]
    
    # Train model
    print("\nTraining model...")
    history = predictor.train(
        X_train, y_train,
        X_val, y_val,
        epochs=10,  # Reduced for demo
        batch_size=32
    )
    
    # Save model
    predictor.save_model(version='demo_v1')
    print("\nModel saved successfully!")


if __name__ == '__main__':
    main()
