# AI/RL Integration - Usage Guide

## Overview

The BaseArbitrageRunner now supports AI/ML-powered strategy optimization through three integrated components:

1. **StrategyRLAgent** - Reinforcement Learning agent for strategy parameter optimization
2. **OpportunityNNScorer** - Neural Network-based opportunity scoring
3. **StrategyEvolutionEngine** - Genetic algorithm-based strategy evolution

## Configuration

To enable AI/ML features, update your BaseArbitrageRunner configuration:

```typescript
const config: BaseArbitrageConfig = {
  // ... existing config ...
  
  // Enable ML features
  enableML: true,
  enableStrategyEvolution: true,
  
  // ML configuration
  mlConfig: {
    // RL Agent configuration
    rlAgent: {
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.3,
    },
    
    // Neural Network Scorer configuration
    nnScorer: {
      hiddenLayerSize: 16,
      minConfidenceScore: 0.6,
      executionThreshold: 0.7,
    },
    
    // Evolution Engine configuration
    evolution: {
      populationSize: 20,
      mutationRate: 0.3,
    },
  },
};
```

## Features

### 1. ML-Enhanced Opportunity Scoring

When `enableML: true`, the runner automatically:
- Scores opportunities using the neural network
- Filters opportunities based on ML confidence
- Logs ML reasoning for each decision

```typescript
// Automatically applied during scanForOpportunities()
// No additional code needed - handled internally
```

### 2. Reinforcement Learning

The RL agent learns from execution outcomes:
- Records each execution as an episode
- Updates strategy parameters based on success/failure
- Provides parameter suggestions

```typescript
// Get strategy suggestions
const suggestions = await runner.getStrategySuggestions();
console.log(suggestions.rationale);
console.log(suggestions.confidence);
```

### 3. Strategy Evolution

The evolution engine generates and tests variants:
- Creates strategy variants through mutation
- Evaluates performance across generations
- Selects best performers

```typescript
// Get evolved strategy variants
const variants = await runner.getStrategyVariants();
console.log(`Testing ${variants.length} variants`);
```

### 4. ML Status & Statistics

Monitor ML component performance:

```typescript
const status = runner.getStatus();

if (status.ml) {
  console.log('RL Agent Stats:', status.ml.rlAgentStats);
  console.log('NN Scorer Stats:', status.ml.nnScorerStats);
  console.log('Evolution Stats:', status.ml.evolutionStats);
}
```

## Integration Points

### Opportunity Scanning
The OpportunityNNScorer is integrated into `scanWithMultiDex()`:
- Extracts features from opportunities
- Scores using neural network
- Combines ML score with traditional criteria

### Execution Recording
After each execution, the system:
- Trains NN scorer on outcome
- Records RL episode for learning
- Updates evolution engine metrics

### Parameter Optimization
Periodically call `getStrategySuggestions()` to:
- Get optimized parameters from RL agent
- Apply parameter updates
- Track improvement over time

## Example Usage

```typescript
import { BaseArbitrageRunner } from './services/BaseArbitrageRunner';

const runner = new BaseArbitrageRunner({
  // Network config
  rpcUrl: process.env.RPC_URL,
  chainId: 8453,
  privateKey: process.env.PRIVATE_KEY,
  
  // ML enabled
  enableML: true,
  enableStrategyEvolution: true,
  
  mlConfig: {
    rlAgent: {
      learningRate: 0.1,
      explorationRate: 0.3,
    },
    nnScorer: {
      executionThreshold: 0.7,
    },
  },
  
  // Other config...
});

// Start runner
await runner.start();

// Check ML stats periodically
setInterval(() => {
  const status = runner.getStatus();
  if (status.ml) {
    console.log('Episodes learned:', status.ml.rlAgentStats?.episodeCount);
    console.log('Avg score:', status.ml.nnScorerStats?.avgScore);
    console.log('Generation:', status.ml.evolutionStats?.generation);
  }
}, 60000); // Every minute

// Get strategy suggestions every 10 cycles
let cycleCount = 0;
runner.on('cycleComplete', async () => {
  cycleCount++;
  if (cycleCount % 10 === 0) {
    const suggestions = await runner.getStrategySuggestions();
    console.log('Strategy suggestion:', suggestions?.rationale);
  }
});
```

## Testing

Run AI integration tests:

```bash
npm test -- src/ai/__tests__/integration.test.ts
```

All 14 tests should pass, covering:
- RL agent learning
- NN scorer predictions
- Evolution engine optimization

## Performance Considerations

- ML scoring adds ~5-10ms latency per opportunity
- RL updates are async and non-blocking
- Evolution happens in background

## Disabling ML Features

To disable ML features:

```typescript
const config: BaseArbitrageConfig = {
  // ... other config ...
  enableML: false, // Disables all ML features
};
```

When disabled:
- No ML scoring overhead
- Traditional opportunity filtering only
- No RL learning or evolution
