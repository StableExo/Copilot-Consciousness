#!/usr/bin/env python3
"""
ML Performance Evaluation

This script evaluates the performance of trained models and ensemble:
- Feature importance analysis
- Prediction vs actual visualization
- Model comparison metrics
- Error analysis
"""

import pandas as pd
import numpy as np
import joblib
import json
import sys
import os


def load_data_and_models(features_path, models_dir):
    """Load features and trained models"""
    print("📥 Loading data and models...")
    
    # Load features
    df = pd.read_csv(features_path)
    feature_cols = [col for col in df.columns if col != 'positionInRange']
    X = df[feature_cols]
    y = df['positionInRange']
    
    # Load models
    models = {}
    models['random_forest'] = joblib.load(os.path.join(models_dir, 'random_forest.joblib'))
    models['gradient_boosting'] = joblib.load(os.path.join(models_dir, 'gradient_boosting.joblib'))
    models['neural_network'] = joblib.load(os.path.join(models_dir, 'neural_network.joblib'))
    models['elastic_net'] = joblib.load(os.path.join(models_dir, 'elastic_net.joblib'))
    
    print(f"   ✅ Loaded {len(X)} samples and {len(models)} models")
    return X, y, models, feature_cols


def analyze_feature_importance(models, feature_cols):
    """Analyze feature importance from tree-based models"""
    print("\n🔍 Analyzing feature importance...")
    
    # Random Forest importance
    rf_importance = models['random_forest'].feature_importances_
    
    # Gradient Boosting importance
    gb_importance = models['gradient_boosting'].feature_importances_
    
    # Average importance
    avg_importance = (rf_importance + gb_importance) / 2
    
    # Sort by importance
    importance_df = pd.DataFrame({
        'feature': feature_cols,
        'random_forest': rf_importance,
        'gradient_boosting': gb_importance,
        'average': avg_importance
    }).sort_values('average', ascending=False)
    
    print("\n   Top 5 Most Important Features:")
    print("   " + "-" * 70)
    for _, row in importance_df.head(5).iterrows():
        print(f"   {row['feature']:<20} RF: {row['random_forest']:.4f}  "
              f"GB: {row['gradient_boosting']:.4f}  Avg: {row['average']:.4f}")
    
    return importance_df


def evaluate_ensemble_performance(models, X, y):
    """Evaluate ensemble prediction performance"""
    print("\n📊 Evaluating ensemble performance...")
    
    # Ensemble weights
    weights = {
        'random_forest': 0.35,
        'gradient_boosting': 0.30,
        'neural_network': 0.20,
        'elastic_net': 0.15
    }
    
    # Individual predictions
    predictions = {}
    for name, model in models.items():
        predictions[name] = model.predict(X)
    
    # Ensemble prediction
    ensemble_pred = np.zeros(len(X))
    for name, weight in weights.items():
        ensemble_pred += predictions[name] * weight
    
    # Calculate metrics
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    
    ensemble_mae = mean_absolute_error(y, ensemble_pred)
    ensemble_rmse = np.sqrt(mean_squared_error(y, ensemble_pred))
    ensemble_r2 = r2_score(y, ensemble_pred)
    
    print(f"\n   Ensemble Performance:")
    print(f"      MAE: {ensemble_mae:.2f}%")
    print(f"      RMSE: {ensemble_rmse:.2f}%")
    print(f"      R²: {ensemble_r2:.4f}")
    
    # Calculate per-model metrics for comparison
    print(f"\n   Individual Model Performance:")
    print(f"   {'Model':<20} {'MAE':<10} {'RMSE':<10} {'R²':<10}")
    print("   " + "-" * 50)
    
    for name in models.keys():
        mae = mean_absolute_error(y, predictions[name])
        rmse = np.sqrt(mean_squared_error(y, predictions[name]))
        r2 = r2_score(y, predictions[name])
        print(f"   {name:<20} {mae:>8.2f}% {rmse:>8.2f}% {r2:>9.4f}")
    
    print(f"   {'ensemble':<20} {ensemble_mae:>8.2f}% {ensemble_rmse:>8.2f}% {ensemble_r2:>9.4f}")
    
    return {
        'ensemble': {
            'mae': ensemble_mae,
            'rmse': ensemble_rmse,
            'r2': ensemble_r2,
            'predictions': ensemble_pred.tolist()
        },
        'individual': {
            name: {
                'mae': mean_absolute_error(y, pred),
                'rmse': np.sqrt(mean_squared_error(y, pred)),
                'r2': r2_score(y, pred)
            }
            for name, pred in predictions.items()
        }
    }


def analyze_error_distribution(y_true, y_pred):
    """Analyze error distribution"""
    print("\n📈 Analyzing error distribution...")
    
    errors = y_pred - y_true
    abs_errors = np.abs(errors)
    
    print(f"\n   Error Statistics:")
    print(f"      Mean Error: {np.mean(errors):.2f}%")
    print(f"      Std Error: {np.std(errors):.2f}%")
    print(f"      Min Error: {np.min(errors):.2f}%")
    print(f"      Max Error: {np.max(errors):.2f}%")
    print(f"\n   Absolute Error Statistics:")
    print(f"      Mean: {np.mean(abs_errors):.2f}%")
    print(f"      Median: {np.median(abs_errors):.2f}%")
    print(f"      25th percentile: {np.percentile(abs_errors, 25):.2f}%")
    print(f"      75th percentile: {np.percentile(abs_errors, 75):.2f}%")
    print(f"      95th percentile: {np.percentile(abs_errors, 95):.2f}%")
    
    # Classify predictions
    excellent = np.sum(abs_errors < 10)
    good = np.sum((abs_errors >= 10) & (abs_errors < 20))
    acceptable = np.sum((abs_errors >= 20) & (abs_errors < 30))
    poor = np.sum(abs_errors >= 30)
    
    total = len(abs_errors)
    print(f"\n   Prediction Quality:")
    print(f"      Excellent (<10% error): {excellent}/{total} ({excellent/total*100:.1f}%)")
    print(f"      Good (10-20% error): {good}/{total} ({good/total*100:.1f}%)")
    print(f"      Acceptable (20-30% error): {acceptable}/{total} ({acceptable/total*100:.1f}%)")
    print(f"      Poor (>30% error): {poor}/{total} ({poor/total*100:.1f}%)")


def save_evaluation_results(feature_importance, performance_metrics, output_path):
    """Save evaluation results to JSON"""
    print(f"\n💾 Saving evaluation results to {output_path}...")
    
    results = {
        'feature_importance': feature_importance.to_dict('records'),
        'performance_metrics': performance_metrics
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"   ✅ Results saved")


def main():
    """Main evaluation pipeline"""
    print("🤖 ML Performance Evaluation")
    print("=" * 80)
    print()
    
    # Configuration
    features_path = sys.argv[1] if len(sys.argv) > 1 else 'data/ml-features/features.csv'
    models_dir = sys.argv[2] if len(sys.argv) > 2 else 'data/ml-models'
    output_path = sys.argv[3] if len(sys.argv) > 3 else 'data/ml-evaluation/evaluation_results.json'
    
    # Load data and models
    X, y, models, feature_cols = load_data_and_models(features_path, models_dir)
    
    # Feature importance analysis
    feature_importance = analyze_feature_importance(models, feature_cols)
    
    # Ensemble performance evaluation
    performance_metrics = evaluate_ensemble_performance(models, X, y)
    
    # Error distribution analysis
    ensemble_pred = np.array(performance_metrics['ensemble']['predictions'])
    analyze_error_distribution(y.values, ensemble_pred)
    
    # Save results
    save_evaluation_results(feature_importance, performance_metrics, output_path)
    
    # Summary
    print("\n" + "=" * 80)
    print("✨ EVALUATION COMPLETE")
    print("-" * 80)
    print()
    print(f"   Ensemble MAE: {performance_metrics['ensemble']['mae']:.2f}%")
    print(f"   Ensemble RMSE: {performance_metrics['ensemble']['rmse']:.2f}%")
    print(f"   Ensemble R²: {performance_metrics['ensemble']['r2']:.4f}")
    print()
    print(f"   Top Feature: {feature_importance.iloc[0]['feature']}")
    print(f"   Feature Importance: {feature_importance.iloc[0]['average']:.4f}")
    print()
    print("Next steps:")
    print("  1. Review feature importance for insights")
    print("  2. Analyze error patterns")
    print("  3. Update documentation with findings")
    print()


if __name__ == '__main__':
    main()
