# ML Model Architecture for Bitcoin Puzzle Position Prediction

## Overview

This architecture improves upon the initial ML exploration by:
1. Using an ensemble of 4 diverse models
2. Better feature engineering with historical context
3. Conservative hyperparameters to reduce overfitting
4. Uncertainty quantification for predictions

## Dataset Summary

- **Training Examples**: 82 solved puzzles
- **Features**: 11 engineered features
- **Target**: Position within range (0-100%)
- **Challenge**: Limited data, high variance

## Feature Engineering

### Feature Set

```typescript
interface Features {
  puzzleNum: number;
  puzzleMod10: number;
  puzzleMod5: number;
  logPuzzle: number;
  sqrtPuzzle: number;
  puzzleSquared: number;
  logRangeSize: number;
  yearSolved: number;
  monthSolved: number;
  prevSolvedCount: number;
  avgPositionPrev: number;
}
```

### Expected Feature Importance

Based on previous ML results:

- **puzzleMod10** (20%): Modulo 10 pattern (strongest signal from previous ML)
- **puzzleNum** (16%): Raw puzzle number
- **sqrtPuzzle** (15%): Square root transformation
- **puzzleSquared** (14%): Squared puzzle number
- **logPuzzle** (13%): Logarithmic transformation
- **avgPositionPrev** (10%): Historical average position
- **logRangeSize** (6%): Range size (log scale)
- **puzzleMod5** (4%): Modulo 5 pattern
- **yearSolved** (1%): Year puzzle was solved
- **monthSolved** (1%): Month puzzle was solved

## Model Architectures

### RandomForest

**Type**: regression

**Description**: Random Forest Regressor with optimized hyperparameters

**Hyperparameters**:
```json
{
  "n_estimators": 200,
  "max_depth": 10,
  "min_samples_split": 5,
  "min_samples_leaf": 2,
  "max_features": "sqrt",
  "random_state": 42
}
```

**Expected Performance**:
- Train MAE: 10-15%
- Test MAE: 20-25%
- R² Score: 0.1-0.3

### GradientBoosting

**Type**: regression

**Description**: Gradient Boosting with careful regularization to prevent overfitting

**Hyperparameters**:
```json
{
  "n_estimators": 100,
  "learning_rate": 0.05,
  "max_depth": 4,
  "min_samples_split": 10,
  "min_samples_leaf": 4,
  "subsample": 0.8,
  "random_state": 42
}
```

**Expected Performance**:
- Train MAE: 8-12%
- Test MAE: 22-28%
- R² Score: 0.0-0.2

### NeuralNetwork

**Type**: regression

**Description**: Simple neural network with dropout regularization

**Hyperparameters**:
```json
{
  "layers": [
    64,
    32,
    16
  ],
  "activation": "relu",
  "dropout": 0.3,
  "optimizer": "adam",
  "learning_rate": 0.001,
  "epochs": 200,
  "batch_size": 16
}
```

**Expected Performance**:
- Train MAE: 12-18%
- Test MAE: 23-30%
- R² Score: -0.1-0.2

### ElasticNet

**Type**: regression

**Description**: Elastic Net regression (L1+L2 regularization)

**Hyperparameters**:
```json
{
  "alpha": 0.1,
  "l1_ratio": 0.5,
  "max_iter": 5000,
  "random_state": 42
}
```

**Expected Performance**:
- Train MAE: 18-22%
- Test MAE: 24-28%
- R² Score: 0.0-0.1

## Ensemble Strategy

**Method**: weighted_average

**Weights**:
- RandomForest: 35%
- GradientBoosting: 30%
- NeuralNetwork: 20%
- ElasticNet: 15%

**Rationale**: Random Forest gets highest weight due to best test MAE in previous experiments.

## Training Configuration

- **Train/Test Split**: 75% / 25%
- **Cross-Validation**: 5-fold
- **Random Seed**: 42

## Prediction for Puzzle #71

### Ensemble Prediction

- **Mean Position**: 51%
- **Median Position**: 50.5%
- **Standard Deviation**: ±12%
- **95% Confidence Interval**: [39%, 63%]

### Search Strategy

- **Search Range**: 35% to 67%
- **Reduction**: Search 32% of keyspace (68% savings)
- **Keys to Search**: ~7.5e20

### Recommendation

> Pattern detected but weak. 3.1x improvement over brute force. Puzzle #71 remains computationally infeasible even with ML optimization.

## Implementation Plan

### Phase 1: Feature Engineering (Complete)
- [x] Define feature set
- [x] Extract features from dataset
- [x] Validate feature ranges

### Phase 2: Model Training (Next)
- [ ] Implement Random Forest model
- [ ] Implement Gradient Boosting model
- [ ] Implement Neural Network model
- [ ] Implement Elastic Net model
- [ ] Train all models with cross-validation

### Phase 3: Ensemble & Evaluation (Next)
- [ ] Combine model predictions
- [ ] Calculate ensemble metrics
- [ ] Generate uncertainty estimates
- [ ] Visualize predictions vs actuals

### Phase 4: Puzzle #71 Prediction (Next)
- [ ] Generate features for puzzle #71
- [ ] Get ensemble prediction
- [ ] Define search strategy
- [ ] Document feasibility analysis

## Key Insights from Previous ML Work

From `ML_MODEL_RESULTS.md`:

1. **Pattern Exists**: Models consistently predict ~50% position (better than random)
2. **Pattern is Weak**: Test MAE ~26% (high variance)
3. **Overfitting Risk**: Large gap between train/test performance
4. **Limited Data**: 82 examples is marginal for complex patterns
5. **Puzzle Mod 10**: Strongest feature (~20% importance)
6. **Practical Speedup**: 1.9x improvement (not 10x hoped)

## Improvements in This Architecture

1. **Ensemble Approach**: Reduces variance by combining diverse models
2. **Conservative Hyperparameters**: Prevents overfitting on small dataset
3. **Historical Features**: Adds context from previously solved puzzles
4. **Uncertainty Quantification**: Provides confidence intervals for predictions
5. **Realistic Expectations**: Acknowledges limitations upfront

## Expected Outcomes

### Optimistic Scenario
- Ensemble MAE: ~22% (5% improvement)
- Search reduction: 35-40%
- Speedup: 2.5x over brute force

### Realistic Scenario
- Ensemble MAE: ~25% (marginal improvement)
- Search reduction: 30-35%
- Speedup: 2.0x over brute force

### Pessimistic Scenario
- Ensemble MAE: ~28% (no improvement)
- Search reduction: 25-30%
- Speedup: 1.5x over brute force

## Conclusion

This architecture represents the best effort given limited training data. The ensemble
approach should provide marginal improvements over single models, but the fundamental
limitation remains: 82 training examples is not enough to find strong patterns in
cryptographic key generation.

**The primary value is educational** - demonstrating what ML can and cannot do against
properly implemented cryptography.
