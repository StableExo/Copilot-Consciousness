# Machine Learning System Guide

## Overview

The ML-powered prediction system provides predictive intelligence for the arbitrage bot by forecasting price movements, scoring opportunity success probability, predicting volatility, and detecting profitable patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ArbitrageOrchestrator                     │
│                    (Enhanced with ML)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     MLOrchestrator                           │
│              (Central ML Coordinator)                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ DataCollector│FeatureExtract│PatternDetect│InferenceServer │
└──────────────┴──────────────┴──────────────┴────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│   LSTM     │ │  Random    │ │   GARCH    │
│ Predictor  │ │  Forest    │ │Volatility  │
└────────────┘ └────────────┘ └────────────┘
```

## Components

### 1. DataCollector

Collects real-time market data for training and feature extraction.

```typescript
import { DataCollector } from './ml/DataCollector';

const collector = new DataCollector();
collector.start();

// Record price data
collector.recordPrice({
  timestamp: Date.now(),
  chain: 1,
  tokenAddress: '0xToken',
  price: 100,
  volume: 1000,
  liquidity: 50000,
  gasPrice: 50,
});

// Record arbitrage execution
collector.recordArbitrageExecution({
  timestamp: Date.now(),
  path: arbitragePath,
  result: 'success',
  profit: 100n,
  gasUsed: 150000n,
  chainId: 1,
});
```

### 2. FeatureExtractor

Transforms raw market data into ML-ready features.

```typescript
import { FeatureExtractor } from './ml/FeatureExtractor';

const extractor = new FeatureExtractor();

// Extract features from price history
const features = await extractor.extractFeatures(priceHistory, Date.now());

// Features include:
// - Price momentum (5s, 15s, 30s, 1m, 5m)
// - Volume metrics (MA, ratio, VWAP)
// - Liquidity features (depth, ratio, spread)
// - Gas price trends
// - Volatility measures
// - Time-based features
```

### 3. MLOrchestrator

Central coordinator that manages all ML models and predictions.

```typescript
import { MLOrchestrator } from './ml/MLOrchestrator';

const orchestrator = new MLOrchestrator();
await orchestrator.initialize();

// Enhance arbitrage opportunity with ML predictions
const enhanced = await orchestrator.enhanceOpportunity(path);

// Access ML predictions
console.log('Success Probability:', enhanced.mlPredictions?.successProbability);
console.log('Confidence:', enhanced.mlPredictions?.confidence);
console.log('Recommendation:', enhanced.mlPredictions?.recommendation);
console.log('Price Forecasts:', enhanced.mlPredictions?.priceForecasts);
console.log('Volatility:', enhanced.mlPredictions?.volatilityForecast);
```

### 4. Python ML Models

#### LSTM Price Predictor

```python
from src.ml.models.LSTMPredictor import LSTMPredictor

# Initialize predictor
predictor = LSTMPredictor(
    sequence_length=60,
    prediction_horizons=[5, 10, 15, 30],
    feature_dim=10
)

# Build model
predictor.build_model()

# Train model
history = predictor.train(
    X_train, y_train,
    X_val, y_val,
    epochs=100,
    batch_size=32
)

# Save model for TensorFlow.js
predictor.save_model(version='v1')
```

#### Opportunity Scorer

```python
from src.ml.models.OpportunityScorer import OpportunityScorer

# Initialize scorer
scorer = OpportunityScorer()

# Build and train
scorer.build_model()
metrics = scorer.train(X_train, y_train, X_val, y_val)

# Predict success probability
probabilities = scorer.predict_proba(X_test)

# Get feature importance
importance = scorer.get_feature_importance()

# Save model
scorer.save_model(version='v1')
```

#### Volatility Predictor

```python
from src.ml.models.VolatilityPredictor import VolatilityPredictor

# Initialize predictor
predictor = VolatilityPredictor(p=1, q=1)

# Train on price series
predictor.train(prices)

# Forecast volatility
forecast = predictor.forecast(horizon=12)  # 1 minute ahead

# Calculate risk metrics
risk = predictor.calculate_risk_metrics(prices)

# Save model
predictor.save_model(version='v1')
```

### 5. Training Pipeline

Automated model training and management.

```typescript
import { TrainingPipeline } from './ml/training/TrainingPipeline';

const pipeline = new TrainingPipeline();

// Start automated retraining
pipeline.start();

// Add training data
pipeline.addTrainingData(trainingRecords);

// Manually trigger retraining
await pipeline.retrain('lstm');

// Get training job status
const job = pipeline.getJob(jobId);

// Listen for events
pipeline.on('job_completed', (job) => {
  console.log('Training completed:', job.metrics);
});

pipeline.on('alert', (alert) => {
  console.log('Alert:', alert.message);
});
```

### 6. Inference Server

High-performance inference for real-time predictions.

```typescript
import { InferenceServer } from './ml/InferenceServer';

const server = new InferenceServer();
await server.start();

// Make prediction
const response = await server.predict(path, features);

console.log('Predictions:', response.predictions);
console.log('Latency:', response.latencyMs);
console.log('Cached:', response.cached);

// Check health
const health = server.getHealth();
console.log('Status:', health.status);

// Get statistics
const stats = server.getStats();
console.log('Throughput:', stats.throughput, 'req/s');
console.log('Avg Latency:', stats.avgLatencyMs, 'ms');
```

### 7. Backtester

Comprehensive backtesting framework.

```typescript
import { Backtester } from './ml/backtesting/Backtester';

const backtester = new Backtester({
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  endDate: Date.now(),
  initialCapital: 10000n,
  useML: true,
  confidenceThreshold: 0.7,
  slippageModel: 'linear',
  gasModel: 'dynamic',
}, mlOrchestrator);

// Run backtest
const result = await backtester.run(historicalData);

console.log('Total Trades:', result.totalTrades);
console.log('Win Rate:', result.winRate);
console.log('Net Profit:', result.netProfit);
console.log('Sharpe Ratio:', result.sharpeRatio);

// Run comparative backtest (ML vs baseline)
const { mlResult, baselineResult } = await backtester.runComparative(historicalData);

console.log('Improvement:', mlResult.baselineComparison?.improvement, '%');

// Generate report
const report = backtester.generateReport(result);
console.log(report);
```

### 8. Model Monitor

Production monitoring and alerting.

```typescript
import { ModelMonitor } from './ml/monitoring/ModelMonitor';

const monitor = new ModelMonitor({
  accuracyThreshold: 0.7,
  latencyThreshold: 100,
  errorRateThreshold: 0.05,
  driftThreshold: 0.3,
  windowSize: 1000,
});

monitor.start();

// Record predictions and outcomes
monitor.recordPrediction(prediction, path, latencyMs);
monitor.recordOutcome(timestamp, successful, profit);

// Track features for drift detection
monitor.trackFeature('price_momentum', 0.05);
monitor.trackFeature('volatility', 0.02);

// Listen for alerts
monitor.on('alert', (alert) => {
  console.log(`[${alert.severity}] ${alert.message}`);
  
  if (alert.severity === 'error') {
    // Take action
  }
});

// Get health status
const health = monitor.getHealthStatus();
console.log('Healthy:', health.healthy);
console.log('Issues:', health.issues);
```

## Integration with ArbitrageOrchestrator

```typescript
import { ArbitrageOrchestrator } from './arbitrage/ArbitrageOrchestrator';
import { MLOrchestrator } from './ml/MLOrchestrator';

// Initialize ML orchestrator
const mlOrchestrator = new MLOrchestrator();
await mlOrchestrator.initialize();

// Create arbitrage orchestrator with ML
const orchestrator = new ArbitrageOrchestrator(
  registry,
  config,
  gasPrice,
  gasFilter,
  bridgeManager,
  crossChainConfig,
  mlOrchestrator  // Pass ML orchestrator
);

// Find opportunities (automatically enhanced with ML)
const opportunities = await orchestrator.findOpportunities(tokens, startAmount);

// Opportunities are now EnhancedArbitragePath[] with ML predictions
for (const opp of opportunities) {
  if (opp.mlPredictions) {
    console.log('ML Confidence:', opp.mlPredictions.confidence);
    console.log('Recommendation:', opp.mlPredictions.recommendation);
    
    if (opp.mlPredictions.recommendation === 'EXECUTE') {
      // Execute high-confidence opportunity
    }
  }
}

// Enable/disable ML dynamically
orchestrator.disableML();
orchestrator.enableML(mlOrchestrator);
```

## Configuration

### ML Config

```typescript
// src/config/ml.config.ts
export const mlConfig: MLConfig = {
  dataCollection: {
    enabled: true,
    interval: 5000, // 5 seconds
    historicalDays: 30,
    features: ['price', 'volume', 'liquidity', 'gas', 'volatility', 'spread'],
    batchSize: 100,
    retentionDays: 90,
  },
  models: {
    lstm: {
      enabled: true,
      sequenceLength: 60,
      predictionHorizons: [5, 10, 15, 30],
      retrainInterval: 86400000, // 24 hours
      modelPath: './models/lstm',
      minTrainingSamples: 1000,
    },
    opportunityScorer: {
      enabled: true,
      confidenceThreshold: 0.7,
      retrainInterval: 604800000, // 7 days
      modelPath: './models/opportunity_scorer',
      minTrainingSamples: 500,
    },
    volatility: {
      enabled: true,
      windowMinutes: 5,
      modelPath: './models/volatility',
    },
  },
  inference: {
    maxLatencyMs: 100,
    batchSize: 10,
    useGPU: false,
    cacheTTL: 1000,
    fallbackMode: 'baseline',
  },
  training: {
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    learningRate: 0.001,
    batchSize: 32,
    maxEpochs: 100,
    testSplit: 0.1,
  },
};
```

### Environment Variables

```bash
# ML Configuration
ML_DATA_COLLECTION_ENABLED=true
ML_DATA_INTERVAL=5000
ML_LSTM_ENABLED=true
ML_SCORER_ENABLED=true
ML_VOLATILITY_ENABLED=true
ML_CONFIDENCE_THRESHOLD=0.7
ML_USE_GPU=false

# Storage
REDIS_HOST=localhost
REDIS_PORT=6379
TIMESERIES_CONNECTION_STRING=postgresql://user:pass@localhost:5432/ml_db
ML_MODELS_PATH=./models
```

## Database Setup

```bash
# Install TimescaleDB
sudo apt install postgresql-14 postgresql-14-timescaledb

# Create database
createdb ml_arbitrage

# Enable TimescaleDB extension
psql ml_arbitrage -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Run schema
psql ml_arbitrage < src/ml/database/schema.sql
```

## Performance Optimization

### 1. Caching

- Predictions are cached for 1 second by default
- Feature cache reduces computation
- Model results cache improves throughput

### 2. Batching

- Inference server batches up to 10 predictions
- Reduces model loading overhead
- Improves GPU utilization

### 3. Parallel Processing

- Multiple predictions processed concurrently
- Feature extraction parallelized
- Non-blocking async operations

## Monitoring Metrics

### Key Metrics

- **Prediction Accuracy**: % of correct direction predictions
- **Win Rate**: % of successful arbitrages
- **Latency**: Time from request to prediction
- **Throughput**: Predictions per second
- **Cache Hit Rate**: % of cached responses
- **Error Rate**: % of failed predictions
- **Model Drift**: Feature distribution changes

### Alerts

- Accuracy drops below threshold
- Latency exceeds target
- Error rate too high
- Model drift detected
- Training failures

## Best Practices

### 1. Data Quality

- Validate data before training
- Handle missing values properly
- Remove outliers carefully
- Ensure sufficient history

### 2. Model Updates

- Retrain regularly (daily for LSTM, weekly for scorer)
- Validate new models before deployment
- Use A/B testing for comparison
- Keep model versioning history

### 3. Production Monitoring

- Track prediction accuracy continuously
- Monitor latency and throughput
- Set up alerting for critical issues
- Review model performance weekly

### 4. Risk Management

- Use confidence thresholds
- Implement fallback strategies
- Monitor volatility forecasts
- Validate predictions before execution

## Troubleshooting

### Model Not Loading

```typescript
// Check if models are loaded
const stats = mlOrchestrator.getStats();
console.log('Models loaded:', stats.modelsLoaded);

// Reinitialize if needed
await mlOrchestrator.initialize();
```

### High Latency

```typescript
// Check inference server health
const health = inferenceServer.getHealth();
console.log('Status:', health.status);
console.log('Queue size:', health.details.queueSize);

// Clear cache if stale
inferenceServer.clearCache();
```

### Low Accuracy

```typescript
// Check monitoring alerts
const alerts = modelMonitor.getActiveAlerts();
for (const alert of alerts) {
  console.log(alert.message);
}

// Trigger retraining
await trainingPipeline.retrain('lstm');
```

## Future Enhancements

- [ ] Reinforcement learning for dynamic strategy optimization
- [ ] Multi-asset correlation models
- [ ] Advanced ensemble methods (stacking, boosting)
- [ ] Real-time model updates
- [ ] Automated hyperparameter optimization
- [ ] Deep learning for pattern recognition
- [ ] Natural language processing for news/social sentiment

## Support

For questions or issues, please refer to:
- System logs for error details
- Model monitor for performance metrics
- Backtest results for validation
