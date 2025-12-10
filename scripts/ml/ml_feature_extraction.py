#!/usr/bin/env python3
"""
ML Feature Extraction Pipeline for Bitcoin Puzzle Position Prediction

This script extracts 11 engineered features from solved puzzle data:
- puzzleNum, puzzleMod10, puzzleMod5
- logPuzzle, sqrtPuzzle, puzzleSquared
- logRangeSize
- yearSolved, monthSolved
- prevSolvedCount, avgPositionPrev

Output: features.csv with all extracted features ready for model training
"""

import pandas as pd
import numpy as np
from datetime import datetime
import sys
import os


def load_puzzle_data(csv_path):
    """Load puzzle data from CSV file"""
    print(f"📥 Loading puzzle data from {csv_path}...")
    
    df = pd.read_csv(csv_path)
    
    # Filter only solved puzzles (those with private keys)
    solved_df = df[df['private_key'].notna() & (df['private_key'] != '')]
    solved_df = solved_df[~solved_df['private_key'].str.contains(r'\?', na=False, regex=True)]
    
    print(f"   ✅ Loaded {len(solved_df)} solved puzzles")
    return solved_df


def calculate_position_in_range(row):
    """Calculate position of key within range as percentage (0-100)"""
    try:
        range_min = int(row['range_min'], 16)
        range_max = int(row['range_max'], 16)
        private_key = int(row['private_key'], 16)
        
        range_size = range_max - range_min + 1
        position = private_key - range_min
        position_percent = (position / range_size) * 100
        
        return position_percent
    except Exception as e:
        print(f"   ⚠️  Error calculating position for puzzle {row['bits']}: {e}")
        return None


def extract_features(df):
    """Extract all 11 features from puzzle data"""
    print("\n🔧 Extracting features...")
    
    features = pd.DataFrame()
    
    # Basic features
    features['puzzleNum'] = df['bits'].astype(int)
    features['puzzleMod10'] = features['puzzleNum'] % 10
    features['puzzleMod5'] = features['puzzleNum'] % 5
    features['logPuzzle'] = np.log(features['puzzleNum'] + 1)  # +1 to avoid log(0)
    features['sqrtPuzzle'] = np.sqrt(features['puzzleNum'])
    features['puzzleSquared'] = features['puzzleNum'] ** 2
    
    # Range-based features
    range_sizes = []
    for _, row in df.iterrows():
        try:
            range_min = int(row['range_min'], 16)
            range_max = int(row['range_max'], 16)
            range_size = range_max - range_min + 1
            range_sizes.append(float(range_size))
        except:
            range_sizes.append(1.0)
    
    features['logRangeSize'] = np.log(range_sizes)
    
    # Temporal features
    solve_years = []
    solve_months = []
    for date_str in df['solve_date']:
        try:
            if pd.isna(date_str) or date_str == '':
                solve_years.append(2015)  # Default year
                solve_months.append(1)
            else:
                date = datetime.strptime(date_str, '%Y-%m-%d')
                solve_years.append(date.year)
                solve_months.append(date.month)
        except:
            solve_years.append(2015)
            solve_months.append(1)
    
    features['yearSolved'] = solve_years
    features['monthSolved'] = solve_months
    
    # Historical context features
    features['prevSolvedCount'] = range(len(features))
    
    # Calculate avgPositionPrev (average position of all previously solved puzzles)
    positions = [calculate_position_in_range(row) for _, row in df.iterrows()]
    avg_positions_prev = []
    for i in range(len(positions)):
        if i == 0:
            avg_positions_prev.append(50.0)  # Default for first puzzle
        else:
            prev_positions = [p for p in positions[:i] if p is not None]
            if prev_positions:
                avg_positions_prev.append(np.mean(prev_positions))
            else:
                avg_positions_prev.append(50.0)
    
    features['avgPositionPrev'] = avg_positions_prev
    
    # Target variable
    features['positionInRange'] = positions
    
    # Remove rows with None position (errors)
    features = features[features['positionInRange'].notna()]
    
    print(f"   ✅ Extracted {len(features.columns)} features for {len(features)} puzzles")
    print(f"\n   Feature list:")
    for col in features.columns:
        print(f"      - {col}")
    
    return features


def validate_features(features):
    """Validate extracted features"""
    print("\n🔍 Validating features...")
    
    # Check for missing values
    missing = features.isnull().sum()
    if missing.any():
        print(f"   ⚠️  Missing values detected:")
        print(missing[missing > 0])
        return False
    
    # Check position range
    positions = features['positionInRange']
    if not ((positions >= 0) & (positions <= 100)).all():
        print(f"   ❌ Position values out of range [0, 100]")
        print(f"      Min: {positions.min()}, Max: {positions.max()}")
        return False
    
    # Check feature ranges
    if (features['puzzleNum'] < 1).any():
        print(f"   ❌ Invalid puzzleNum values")
        return False
    
    print(f"   ✅ All features valid!")
    print(f"\n   Feature statistics:")
    print(features.describe())
    
    return True


def save_features(features, output_path):
    """Save extracted features to CSV"""
    print(f"\n💾 Saving features to {output_path}...")
    
    features.to_csv(output_path, index=False)
    
    print(f"   ✅ Features saved successfully")
    print(f"   File size: {os.path.getsize(output_path) / 1024:.2f} KB")


def main():
    """Main feature extraction pipeline"""
    print("🤖 ML Feature Extraction Pipeline")
    print("=" * 80)
    print()
    
    # Configuration
    csv_path = sys.argv[1] if len(sys.argv) > 1 else 'bitcoin-puzzle-all-20251203.csv'
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'data/ml-features/features.csv'
    
    # Create output directory
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Load data
    df = load_puzzle_data(csv_path)
    
    # Extract features
    features = extract_features(df)
    
    # Validate features
    if not validate_features(features):
        print("\n❌ Feature validation failed!")
        sys.exit(1)
    
    # Save features
    save_features(features, output_path)
    
    print("\n" + "=" * 80)
    print("✨ SUCCESS! Features extracted and ready for model training")
    print()
    print("Next steps:")
    print("  1. Train Random Forest model")
    print("  2. Train Gradient Boosting model")
    print("  3. Train Neural Network model")
    print("  4. Train Elastic Net model")
    print("  5. Create ensemble prediction")
    print()


if __name__ == '__main__':
    main()
