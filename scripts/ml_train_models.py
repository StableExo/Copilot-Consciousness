#!/usr/bin/env python3
"""
ML Model Training Pipeline for Bitcoin Puzzle Position Prediction

This script trains 4 models with cross-validation:
1. Random Forest Regressor
2. Gradient Boosting Regressor  
3. Neural Network (MLPRegressor)
4. Elastic Net Regressor

Each model is evaluated with 5-fold cross-validation and saved for later use.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.linear_model import ElasticNet
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os
import sys
import json


def load_features(features_path):
    """Load extracted features from CSV"""
    print(f"📥 Loading features from {features_path}...")
    
    df = pd.read_csv(features_path)
    
    # Separate features and target
    feature_cols = [col for col in df.columns if col != 'positionInRange']
    X = df[feature_cols]
    y = df['positionInRange']
    
    print(f"   ✅ Loaded {len(X)} samples with {len(feature_cols)} features")
    print(f"   Features: {', '.join(feature_cols)}")
    
    return X, y, feature_cols


def train_random_forest(X_train, y_train, X_test, y_test):
    """Train Random Forest model"""
    print("\n🌲 Training Random Forest...")
    
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42,
        n_jobs=-1
    )
    
    # Train
    model.fit(X_train, y_train)
    
    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, 
                                scoring='neg_mean_absolute_error', n_jobs=-1)
    cv_mae = -cv_scores.mean()
    
    print(f"   Train MAE: {train_mae:.2f}%")
    print(f"   Test MAE: {test_mae:.2f}%")
    print(f"   Train R²: {train_r2:.4f}")
    print(f"   Test R²: {test_r2:.4f}")
    print(f"   CV MAE (5-fold): {cv_mae:.2f}%")
    
    return model, {
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'cv_mae': cv_mae
    }


def train_gradient_boosting(X_train, y_train, X_test, y_test):
    """Train Gradient Boosting model"""
    print("\n📊 Training Gradient Boosting...")
    
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        min_samples_split=10,
        min_samples_leaf=4,
        subsample=0.8,
        random_state=42
    )
    
    # Train
    model.fit(X_train, y_train)
    
    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5,
                                scoring='neg_mean_absolute_error')
    cv_mae = -cv_scores.mean()
    
    print(f"   Train MAE: {train_mae:.2f}%")
    print(f"   Test MAE: {test_mae:.2f}%")
    print(f"   Train R²: {train_r2:.4f}")
    print(f"   Test R²: {test_r2:.4f}")
    print(f"   CV MAE (5-fold): {cv_mae:.2f}%")
    
    return model, {
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'cv_mae': cv_mae
    }


def train_neural_network(X_train, y_train, X_test, y_test):
    """Train Neural Network model"""
    print("\n🧠 Training Neural Network...")
    
    model = MLPRegressor(
        hidden_layer_sizes=(64, 32, 16),
        activation='relu',
        alpha=0.01,  # L2 regularization
        learning_rate_init=0.001,
        max_iter=500,
        early_stopping=True,
        random_state=42
    )
    
    # Train
    model.fit(X_train, y_train)
    
    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5,
                                scoring='neg_mean_absolute_error')
    cv_mae = -cv_scores.mean()
    
    print(f"   Train MAE: {train_mae:.2f}%")
    print(f"   Test MAE: {test_mae:.2f}%")
    print(f"   Train R²: {train_r2:.4f}")
    print(f"   Test R²: {test_r2:.4f}")
    print(f"   CV MAE (5-fold): {cv_mae:.2f}%")
    
    return model, {
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'cv_mae': cv_mae
    }


def train_elastic_net(X_train, y_train, X_test, y_test):
    """Train Elastic Net model"""
    print("\n📐 Training Elastic Net...")
    
    model = ElasticNet(
        alpha=0.1,
        l1_ratio=0.5,
        max_iter=5000,
        random_state=42
    )
    
    # Train
    model.fit(X_train, y_train)
    
    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5,
                                scoring='neg_mean_absolute_error')
    cv_mae = -cv_scores.mean()
    
    print(f"   Train MAE: {train_mae:.2f}%")
    print(f"   Test MAE: {test_mae:.2f}%")
    print(f"   Train R²: {train_r2:.4f}")
    print(f"   Test R²: {test_r2:.4f}")
    print(f"   CV MAE (5-fold): {cv_mae:.2f}%")
    
    return model, {
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'cv_mae': cv_mae
    }


def save_models(models, feature_cols, output_dir):
    """Save trained models and metadata"""
    print(f"\n💾 Saving models to {output_dir}...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    for name, (model, metrics) in models.items():
        # Save model
        model_path = os.path.join(output_dir, f'{name}.joblib')
        joblib.dump(model, model_path)
        print(f"   ✅ {name}: {model_path}")
        
        # Save metrics
        metrics_path = os.path.join(output_dir, f'{name}_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
    
    # Save feature names
    feature_path = os.path.join(output_dir, 'feature_names.json')
    with open(feature_path, 'w') as f:
        json.dump(feature_cols, f, indent=2)
    print(f"   ✅ feature_names.json")


def main():
    """Main training pipeline"""
    print("🤖 ML Model Training Pipeline")
    print("=" * 80)
    print()
    
    # Configuration
    features_path = sys.argv[1] if len(sys.argv) > 1 else 'data/ml-features/features.csv'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'data/ml-models'
    
    # Load features
    X, y, feature_cols = load_features(features_path)
    
    # Train/test split (75/25)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42
    )
    
    print(f"\n📊 Dataset split:")
    print(f"   Training: {len(X_train)} samples")
    print(f"   Testing: {len(X_test)} samples")
    
    # Train all models
    models = {}
    
    models['random_forest'] = train_random_forest(X_train, y_train, X_test, y_test)
    models['gradient_boosting'] = train_gradient_boosting(X_train, y_train, X_test, y_test)
    models['neural_network'] = train_neural_network(X_train, y_train, X_test, y_test)
    models['elastic_net'] = train_elastic_net(X_train, y_train, X_test, y_test)
    
    # Save models
    save_models(models, feature_cols, output_dir)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TRAINING SUMMARY")
    print("-" * 80)
    print()
    print(f"{'Model':<20} {'Train MAE':<12} {'Test MAE':<12} {'CV MAE':<12} {'Test R²':<10}")
    print("-" * 80)
    
    for name, (_, metrics) in models.items():
        print(f"{name:<20} {metrics['train_mae']:>10.2f}% {metrics['test_mae']:>10.2f}% "
              f"{metrics['cv_mae']:>10.2f}% {metrics['test_r2']:>9.4f}")
    
    print()
    print("✨ SUCCESS! All models trained and saved")
    print()
    print("Next steps:")
    print("  1. Create ensemble prediction system")
    print("  2. Generate Puzzle #71 prediction")
    print("  3. Evaluate performance and uncertainty")
    print()


if __name__ == '__main__':
    main()
