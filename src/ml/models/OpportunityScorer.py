"""
Opportunity Scorer Model

Random Forest classifier to predict arbitrage success probability.
Analyzes path characteristics, market conditions, and historical patterns.
"""

import os
import json
import numpy as np
from typing import List, Dict, Tuple, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
from sklearn.preprocessing import StandardScaler
import joblib


class OpportunityScorer:
    """
    Random Forest model for predicting arbitrage opportunity success
    """
    
    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: Optional[int] = 20,
        min_samples_split: int = 10,
        class_weight: str = 'balanced',
        model_path: str = './models/opportunity_scorer'
    ):
        """
        Initialize opportunity scorer
        
        Args:
            n_estimators: Number of trees in forest
            max_depth: Maximum tree depth
            min_samples_split: Minimum samples to split node
            class_weight: How to handle class imbalance
            model_path: Path to save/load models
        """
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.class_weight = class_weight
        self.model_path = model_path
        
        self.model: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names: List[str] = []
        self.feature_importance: Optional[np.ndarray] = None
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
    
    def build_model(self) -> RandomForestClassifier:
        """
        Build Random Forest classifier
        
        Returns:
            Sklearn RandomForestClassifier
        """
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            class_weight=self.class_weight,
            random_state=42,
            n_jobs=-1,
            verbose=1
        )
        
        self.scaler = StandardScaler()
        
        return self.model
    
    def prepare_features(
        self,
        paths_data: List[Dict]
    ) -> Tuple[np.ndarray, List[str]]:
        """
        Extract and prepare features from path data
        
        Args:
            paths_data: List of arbitrage path dictionaries
        
        Returns:
            Feature matrix and feature names
        """
        features = []
        
        for path in paths_data:
            feature_vec = [
                path.get('num_hops', 0),
                path.get('total_fees', 0),
                path.get('liquidity_depth_avg', 0),
                path.get('liquidity_depth_min', 0),
                path.get('gas_price_percentile', 0.5),
                path.get('historical_success_rate', 0.5),
                path.get('volatility', 0),
                path.get('hour_of_day', 12),
                path.get('day_of_week', 3),
                path.get('chain_congestion', 0),
                path.get('slippage_impact', 0),
                path.get('estimated_profit', 0),
                path.get('path_complexity', 0),
                path.get('volume_ratio', 1.0),
                path.get('spread_metric', 0),
            ]
            features.append(feature_vec)
        
        self.feature_names = [
            'num_hops',
            'total_fees',
            'liquidity_depth_avg',
            'liquidity_depth_min',
            'gas_price_percentile',
            'historical_success_rate',
            'volatility',
            'hour_of_day',
            'day_of_week',
            'chain_congestion',
            'slippage_impact',
            'estimated_profit',
            'path_complexity',
            'volume_ratio',
            'spread_metric',
        ]
        
        return np.array(features), self.feature_names
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Train the Random Forest model
        
        Args:
            X_train: Training features
            y_train: Training labels (0=failure, 1=success)
            X_val: Validation features (optional)
            y_val: Validation labels (optional)
        
        Returns:
            Training metrics
        """
        if self.model is None:
            self.build_model()
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        print("Training Random Forest...")
        self.model.fit(X_train_scaled, y_train)
        
        # Extract feature importance
        self.feature_importance = self.model.feature_importances_
        
        # Evaluate on training data
        y_train_pred = self.model.predict(X_train_scaled)
        y_train_proba = self.model.predict_proba(X_train_scaled)[:, 1]
        
        metrics = {
            'train_accuracy': accuracy_score(y_train, y_train_pred),
            'train_precision': precision_score(y_train, y_train_pred, zero_division=0),
            'train_recall': recall_score(y_train, y_train_pred, zero_division=0),
            'train_f1': f1_score(y_train, y_train_pred, zero_division=0),
            'train_auc': roc_auc_score(y_train, y_train_proba),
        }
        
        # Evaluate on validation data if provided
        if X_val is not None and y_val is not None:
            X_val_scaled = self.scaler.transform(X_val)
            y_val_pred = self.model.predict(X_val_scaled)
            y_val_proba = self.model.predict_proba(X_val_scaled)[:, 1]
            
            metrics.update({
                'val_accuracy': accuracy_score(y_val, y_val_pred),
                'val_precision': precision_score(y_val, y_val_pred, zero_division=0),
                'val_recall': recall_score(y_val, y_val_pred, zero_division=0),
                'val_f1': f1_score(y_val, y_val_pred, zero_division=0),
                'val_auc': roc_auc_score(y_val, y_val_proba),
            })
            
            print("\nValidation Metrics:")
            print(f"  Accuracy: {metrics['val_accuracy']:.4f}")
            print(f"  Precision: {metrics['val_precision']:.4f}")
            print(f"  Recall: {metrics['val_recall']:.4f}")
            print(f"  F1 Score: {metrics['val_f1']:.4f}")
            print(f"  AUC-ROC: {metrics['val_auc']:.4f}")
        
        return metrics
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict success probability
        
        Args:
            X: Input features
        
        Returns:
            Array of success probabilities
        """
        if self.model is None or self.scaler is None:
            raise ValueError("Model not trained or loaded")
        
        X_scaled = self.scaler.transform(X)
        probabilities = self.model.predict_proba(X_scaled)[:, 1]
        
        return probabilities
    
    def predict(self, X: np.ndarray, threshold: float = 0.7) -> np.ndarray:
        """
        Predict success/failure
        
        Args:
            X: Input features
            threshold: Classification threshold
        
        Returns:
            Binary predictions
        """
        probabilities = self.predict_proba(X)
        return (probabilities >= threshold).astype(int)
    
    def cross_validate(
        self,
        X: np.ndarray,
        y: np.ndarray,
        cv: int = 5
    ) -> Dict[str, float]:
        """
        Perform cross-validation
        
        Args:
            X: Features
            y: Labels
            cv: Number of folds
        
        Returns:
            Cross-validation scores
        """
        if self.model is None:
            self.build_model()
        
        X_scaled = self.scaler.fit_transform(X)
        
        scores = cross_val_score(
            self.model, X_scaled, y,
            cv=cv, scoring='accuracy', n_jobs=-1
        )
        
        return {
            'cv_mean_accuracy': scores.mean(),
            'cv_std_accuracy': scores.std(),
            'cv_scores': scores.tolist()
        }
    
    def hyperparameter_tuning(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        param_grid: Optional[Dict] = None
    ) -> Dict:
        """
        Perform hyperparameter tuning with GridSearchCV
        
        Args:
            X_train: Training features
            y_train: Training labels
            param_grid: Parameter grid for search
        
        Returns:
            Best parameters and scores
        """
        if param_grid is None:
            param_grid = {
                'n_estimators': [50, 100, 200],
                'max_depth': [10, 20, 30, None],
                'min_samples_split': [5, 10, 20],
                'min_samples_leaf': [1, 2, 4],
            }
        
        base_model = RandomForestClassifier(
            random_state=42,
            n_jobs=-1,
            class_weight=self.class_weight
        )
        
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            cv=5,
            scoring='f1',
            n_jobs=-1,
            verbose=2
        )
        
        X_scaled = self.scaler.fit_transform(X_train)
        grid_search.fit(X_scaled, y_train)
        
        # Update model with best parameters
        self.model = grid_search.best_estimator_
        self.feature_importance = self.model.feature_importances_
        
        return {
            'best_params': grid_search.best_params_,
            'best_score': grid_search.best_score_,
            'cv_results': grid_search.cv_results_
        }
    
    def get_feature_importance(self) -> List[Tuple[str, float]]:
        """
        Get feature importance rankings
        
        Returns:
            List of (feature_name, importance) tuples, sorted by importance
        """
        if self.feature_importance is None:
            raise ValueError("Model not trained yet")
        
        importance_pairs = list(zip(self.feature_names, self.feature_importance))
        importance_pairs.sort(key=lambda x: x[1], reverse=True)
        
        return importance_pairs
    
    def save_model(self, version: str = 'v1'):
        """
        Save model to disk
        
        Args:
            version: Model version string
        """
        if self.model is None or self.scaler is None:
            raise ValueError("No model to save")
        
        # Save model
        model_path = os.path.join(self.model_path, f'rf_model_{version}.joblib')
        joblib.dump(self.model, model_path)
        print(f"Saved model to {model_path}")
        
        # Save scaler
        scaler_path = os.path.join(self.model_path, f'scaler_{version}.joblib')
        joblib.dump(self.scaler, scaler_path)
        print(f"Saved scaler to {scaler_path}")
        
        # Save metadata
        metadata = {
            'version': version,
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance.tolist() if self.feature_importance is not None else None,
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
        model_path = os.path.join(self.model_path, f'rf_model_{version}.joblib')
        scaler_path = os.path.join(self.model_path, f'scaler_{version}.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        print(f"Loaded model from {model_path}")
        
        # Load metadata
        metadata_path = os.path.join(self.model_path, f'metadata_{version}.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                self.feature_names = metadata.get('feature_names', [])
                self.feature_importance = np.array(metadata.get('feature_importance', []))


def main():
    """
    Example training script
    """
    # Initialize scorer
    scorer = OpportunityScorer()
    
    # Generate sample data
    n_samples = 1000
    n_features = 15
    
    # Simulate features
    X = np.random.randn(n_samples, n_features)
    # Simulate labels (success/failure)
    y = (np.random.rand(n_samples) > 0.3).astype(int)  # 70% success rate
    
    # Split data
    split_idx = int(0.8 * n_samples)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    # Build and train
    scorer.build_model()
    metrics = scorer.train(X_train, y_train, X_val, y_val)
    
    print("\nTraining completed!")
    print("Metrics:", json.dumps(metrics, indent=2))
    
    # Feature importance
    print("\nFeature Importance:")
    for feat, imp in scorer.get_feature_importance()[:5]:
        print(f"  {feat}: {imp:.4f}")
    
    # Save model
    scorer.save_model(version='demo_v1')
    print("\nModel saved successfully!")


if __name__ == '__main__':
    main()
