#!/usr/bin/env python3
"""
ML Ensemble Prediction for Bitcoin Puzzle #71

This script creates an ensemble prediction by combining 4 trained models:
- Random Forest (35% weight)
- Gradient Boosting (30% weight)
- Neural Network (20% weight) 
- Elastic Net (15% weight)

Generates prediction with uncertainty quantification for Puzzle #71.
"""

import pandas as pd
import numpy as np
import joblib
import json
import sys
import os


def load_models(models_dir):
    """Load all trained models"""
    print(f"📥 Loading models from {models_dir}...")
    
    models = {}
    models['random_forest'] = joblib.load(os.path.join(models_dir, 'random_forest.joblib'))
    models['gradient_boosting'] = joblib.load(os.path.join(models_dir, 'gradient_boosting.joblib'))
    models['neural_network'] = joblib.load(os.path.join(models_dir, 'neural_network.joblib'))
    models['elastic_net'] = joblib.load(os.path.join(models_dir, 'elastic_net.joblib'))
    
    # Load feature names
    with open(os.path.join(models_dir, 'feature_names.json'), 'r') as f:
        feature_names = json.load(f)
    
    print(f"   ✅ Loaded {len(models)} models")
    return models, feature_names


def extract_features_for_puzzle71():
    """Extract features for Puzzle #71"""
    print("\n🔧 Extracting features for Puzzle #71...")
    
    # Puzzle #71 specifications
    puzzle_num = 71
    
    # Basic features
    features = {
        'puzzleNum': puzzle_num,
        'puzzleMod10': puzzle_num % 10,
        'puzzleMod5': puzzle_num % 5,
        'logPuzzle': np.log(puzzle_num + 1),
        'sqrtPuzzle': np.sqrt(puzzle_num),
        'puzzleSquared': puzzle_num ** 2,
    }
    
    # Range-based features
    range_min = 2 ** 70
    range_max = 2 ** 71 - 1
    range_size = range_max - range_min + 1
    features['logRangeSize'] = np.log(float(range_size))
    
    # Temporal features (unknown, use current date)
    features['yearSolved'] = 2025  # Current year
    features['monthSolved'] = 12   # Current month
    
    # Historical context features
    # Based on 82 previously solved puzzles
    features['prevSolvedCount'] = 82
    features['avgPositionPrev'] = 50.15  # From extracted features
    
    print(f"   ✅ Features extracted:")
    for k, v in features.items():
        print(f"      {k}: {v}")
    
    return features


def make_ensemble_prediction(models, features, weights=None):
    """Make ensemble prediction with uncertainty quantification"""
    print("\n🎯 Making ensemble prediction...")
    
    # Default weights from architecture
    if weights is None:
        weights = {
            'random_forest': 0.35,
            'gradient_boosting': 0.30,
            'neural_network': 0.20,
            'elastic_net': 0.15
        }
    
    # Convert features to DataFrame
    features_df = pd.DataFrame([features])
    
    # Get individual predictions
    predictions = {}
    for name, model in models.items():
        pred = model.predict(features_df)[0]
        predictions[name] = pred
        print(f"   {name}: {pred:.2f}%")
    
    # Weighted ensemble
    ensemble_pred = sum(predictions[name] * weights[name] for name in models.keys())
    
    print(f"\n   📊 Weighted Ensemble: {ensemble_pred:.2f}%")
    
    # Uncertainty quantification
    pred_values = list(predictions.values())
    std_dev = np.std(pred_values)
    
    # 95% confidence interval (±2 standard deviations)
    ci_lower = max(0, ensemble_pred - 2 * std_dev)
    ci_upper = min(100, ensemble_pred + 2 * std_dev)
    
    print(f"   📊 Standard Deviation: ±{std_dev:.2f}%")
    print(f"   📊 95% Confidence Interval: [{ci_lower:.2f}%, {ci_upper:.2f}%]")
    
    return {
        'ensemble_prediction': ensemble_pred,
        'individual_predictions': predictions,
        'weights': weights,
        'std_dev': std_dev,
        'confidence_interval': {
            'lower': ci_lower,
            'upper': ci_upper
        }
    }


def calculate_search_strategy(prediction_result):
    """Calculate search strategy based on prediction"""
    print("\n🔍 Calculating search strategy...")
    
    pred = prediction_result['ensemble_prediction']
    ci_lower = prediction_result['confidence_interval']['lower']
    ci_upper = prediction_result['confidence_interval']['upper']
    
    # Search range (use confidence interval)
    search_width = ci_upper - ci_lower
    search_center = pred
    
    # Calculate keyspace size
    total_range = 2 ** 71 - 2 ** 70
    search_range = total_range * (search_width / 100)
    
    # Calculate speedup
    speedup = 100 / search_width
    
    print(f"   🎯 Predicted Position: {pred:.2f}%")
    print(f"   📍 Search Range: {ci_lower:.2f}% to {ci_upper:.2f}%")
    print(f"   📏 Search Width: {search_width:.2f}% of keyspace")
    print(f"   ⚡ Speedup: {speedup:.2f}x over brute force")
    print(f"   🔢 Keys to Search: ~{search_range:.2e}")
    
    # Time estimate at 1B keys/sec
    seconds = search_range / 1e9
    days = seconds / 86400
    years = days / 365.25
    
    print(f"\n   ⏱️  Time Estimate @ 1B keys/sec:")
    print(f"      Seconds: {seconds:.2e}")
    print(f"      Days: {days:.2e}")
    print(f"      Years: {years:.2e}")
    
    # Feasibility assessment
    if days < 1:
        feasibility = "HIGHLY FEASIBLE"
    elif days < 30:
        feasibility = "FEASIBLE"
    elif days < 365:
        feasibility = "CHALLENGING"
    elif days < 3650:
        feasibility = "VERY DIFFICULT"
    else:
        feasibility = "COMPUTATIONALLY INFEASIBLE"
    
    print(f"\n   ✅ Feasibility: {feasibility}")
    
    return {
        'search_center': search_center,
        'search_range': {
            'lower': ci_lower,
            'upper': ci_upper,
            'width': search_width
        },
        'keyspace': {
            'total': float(total_range),
            'to_search': float(search_range)
        },
        'speedup': speedup,
        'time_estimate': {
            'seconds': seconds,
            'days': days,
            'years': years
        },
        'feasibility': feasibility
    }


def save_results(prediction_result, search_strategy, output_path):
    """Save prediction results to JSON"""
    print(f"\n💾 Saving results to {output_path}...")
    
    results = {
        'puzzle_number': 71,
        'prediction': prediction_result,
        'search_strategy': search_strategy,
        'model_info': {
            'models_used': list(prediction_result['weights'].keys()),
            'ensemble_method': 'weighted_average',
            'training_samples': 82
        }
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"   ✅ Results saved")


def main():
    """Main prediction pipeline"""
    print("🤖 ML Ensemble Prediction for Puzzle #71")
    print("=" * 80)
    print()
    
    # Configuration
    models_dir = sys.argv[1] if len(sys.argv) > 1 else 'data/ml-models'
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'data/ml-predictions/puzzle71_prediction.json'
    
    # Load models
    models, feature_names = load_models(models_dir)
    
    # Extract features for Puzzle #71
    features = extract_features_for_puzzle71()
    
    # Make ensemble prediction
    prediction_result = make_ensemble_prediction(models, features)
    
    # Calculate search strategy
    search_strategy = calculate_search_strategy(prediction_result)
    
    # Save results
    save_results(prediction_result, search_strategy, output_path)
    
    # Final summary
    print("\n" + "=" * 80)
    print("🎯 PREDICTION SUMMARY FOR PUZZLE #71")
    print("-" * 80)
    print()
    print(f"   Ensemble Prediction: {prediction_result['ensemble_prediction']:.2f}%")
    print(f"   95% CI: [{prediction_result['confidence_interval']['lower']:.2f}%, "
          f"{prediction_result['confidence_interval']['upper']:.2f}%]")
    print(f"   Search Range: {search_strategy['search_range']['width']:.2f}% of keyspace")
    print(f"   Speedup: {search_strategy['speedup']:.2f}x")
    print(f"   Feasibility: {search_strategy['feasibility']}")
    print()
    print("✨ SUCCESS! Ensemble prediction complete")
    print()
    print("Next steps:")
    print("  1. Review prediction uncertainty")
    print("  2. Decide if search is worthwhile")
    print("  3. Update ML_MODEL_RESULTS.md with findings")
    print()


if __name__ == '__main__':
    main()
