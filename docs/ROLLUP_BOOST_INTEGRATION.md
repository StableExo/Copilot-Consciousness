# Rollup-Boost Integration

Integration with Flashbots Rollup-Boost for enhanced Layer 2 performance and decentralization.

## Overview

Rollup-Boost is a block builder sidecar for OP Stack chains that enables:
- **Flashblocks**: Sub-second block confirmations (200-250ms)
- **Modular Extensions**: Upgradeable performance, programmability, and decentralization
- **OP Stack Integration**: Works with Optimism, Base, and other OP Stack rollups

**Key Documentation:** https://rollup-boost.flashbots.net/

## Why Rollup-Boost?

Traditional L2 blocks take 1-2 seconds to confirm. Rollup-Boost's **Flashblocks** provide:
- **200-250ms confirmations** for time-sensitive applications
- **Improved UX** for DeFi trading and gaming
- **Verifiable priority ordering** for MEV fairness
- **L1 compatibility** through buffered finalization

## Architecture

### Components

```
┌─────────────────┐
│   op-node       │  ← Proposer node
│   (Sequencer)   │
└────────┬────────┘
         │
    ┌────▼────────────┐
    │ Rollup-Boost    │  ← Builder sidecar
    │   (Sidecar)     │
    └────┬────────────┘
         │
    ┌────▼────────────┐
    │   op-geth       │  ← Execution engine
    │   (L2 EVM)      │
    └─────────────────┘
```

### Flashblocks Process

1. **Transaction Arrival**: Transactions arrive at op-node
2. **Builder Processing**: Rollup-Boost receives and orders transactions
3. **Flashblock Creation**: Sub-second ephemeral block created
4. **User Confirmation**: DApp sees confirmed state
5. **L1 Finalization**: Buffered blocks finalized to L1

## Features

### 1. Flashblock Configuration

```typescript
import { RollupBoostIntelligence, L2Network } from 'aev-thewarden';

const rollupBoost = new RollupBoostIntelligence(
  provider,
  L2Network.OP_STACK,
  {
    enabled: true,
    targetConfirmationMs: 250, // 250ms target
    maxBufferBlocks: 10,
    enablePriorityOrdering: true,
  }
);
```

### 2. Performance Monitoring

```typescript
const metrics = rollupBoost.getPerformanceMetrics();

console.log('Average Confirmation:', metrics.avgConfirmationTimeMs, 'ms');
console.log('Total Blocks:', metrics.totalBlocks);
console.log('L1 Finalization Rate:', metrics.l1FinalizationRate);
```

### 3. Dynamic Configuration

```typescript
const recommendation = rollupBoost.recommendFlashblockConfig();

console.log('Recommended Target:', recommendation.targetConfirmationMs, 'ms');
console.log('Reasoning:', recommendation.reasoning);

// Apply recommendation
rollupBoost.updateTargetConfirmation(recommendation.targetConfirmationMs);
```

### 4. Transaction Inclusion Estimation

```typescript
const gasPrice = BigInt(0.01e9); // 0.01 gwei
const priorityFee = BigInt(0.005e9); // 0.005 gwei

const estimate = rollupBoost.estimateInclusionTime(gasPrice, priorityFee);

console.log('Expected inclusion:', estimate.estimatedMs, 'ms');
console.log('Confidence:', estimate.confidence * 100, '%');
```

### 5. Optimal Gas Pricing

```typescript
// Calculate gas price for specific target time
const targetMs = 200; // Want 200ms confirmation
const optimalGas = rollupBoost.calculateOptimalGasPrice(targetMs);

console.log('Optimal gas price:', Number(optimalGas) / 1e9, 'gwei');
```

### 6. Rollup Extensions

Enable modular upgrades:

```typescript
import { RollupExtension } from 'aev-thewarden';

// Enable extensions
rollupBoost.enableExtension(RollupExtension.PERFORMANCE);
rollupBoost.enableExtension(RollupExtension.DECENTRALIZATION);
rollupBoost.enableExtension(RollupExtension.PROGRAMMABILITY);
```

## OP-rbuilder Integration

### Configuration Generation

```typescript
const opConfig = rollupBoost.generateOPRBuilderConfig(
  8453, // Base chain ID
  'http://localhost:5052', // L1 consensus client
  'http://localhost:9545', // Sequencer (op-node)
  'your-jwt-secret-32-chars-minimum'
);

console.log('OP-rbuilder config:', opConfig);
```

### Builder Sidecar Setup

```typescript
const sidecarConfig = {
  executionEngineUrl: 'http://localhost:8551', // op-geth
  proposerNodeUrl: 'http://localhost:9545',    // op-node
  jwtSecret: 'your-jwt-secret-here',
  builderRpcUrl: 'http://localhost:8545',
  enableTracing: true,
  enableMetrics: true,
};

// Validate configuration
const validation = rollupBoost.validateSidecarConfig();

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Supported Networks

### Current Support

| Network | Support Level | Flashblocks | Notes |
|---------|---------------|-------------|-------|
| OP Stack | Full ✅ | Yes | Optimism, Base, etc. |
| Arbitrum | Planned 🔄 | No | Future support |
| Polygon zkEVM | Research 🔬 | No | Under evaluation |

### Check Support

```typescript
import { L2Network } from 'aev-thewarden';

const isSupported = RollupBoostIntelligence.isSupported(L2Network.OP_STACK);
console.log('OP Stack supported:', isSupported); // true
```

## Practical Examples

### Time-Sensitive DeFi Arbitrage

```typescript
// Setup for competitive arbitrage
const targetTime = 200; // Need sub-200ms for edge

// Calculate optimal parameters
const optimalGas = rollupBoost.calculateOptimalGasPrice(targetTime);
const estimate = rollupBoost.estimateInclusionTime(optimalGas);

console.log('Setup for arbitrage:');
console.log('- Target:', targetTime, 'ms');
console.log('- Gas price:', Number(optimalGas) / 1e9, 'gwei');
console.log('- Expected:', estimate.estimatedMs, 'ms');

if (estimate.estimatedMs <= targetTime) {
  console.log('✅ Expected to meet timing requirements');
  // Execute arbitrage
} else {
  console.log('⚠️  May miss window, consider higher gas');
}
```

### Gaming Application

```typescript
// Enable extensions for gaming performance
rollupBoost.enableExtension(RollupExtension.PERFORMANCE);

// Monitor real-time performance
const metrics = rollupBoost.getPerformanceMetrics();

if (metrics.avgConfirmationTimeMs < 250) {
  console.log('✅ Performance suitable for gaming');
} else {
  console.log('⚠️  Consider optimization');
  const rec = rollupBoost.recommendFlashblockConfig();
  console.log('Recommendation:', rec.reasoning);
}
```

### Production Deployment

```typescript
// Production-ready configuration
const production = new RollupBoostIntelligence(
  provider,
  L2Network.OP_STACK,
  {
    enabled: true,
    targetConfirmationMs: 250,
    maxBufferBlocks: 10,
    enablePriorityOrdering: true,
  },
  {
    executionEngineUrl: process.env.OP_GETH_URL!,
    proposerNodeUrl: process.env.OP_NODE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    builderRpcUrl: process.env.BUILDER_RPC_URL,
    enableTracing: true,
    enableMetrics: true,
  }
);

// Validate before running
const validation = production.validateSidecarConfig();
if (!validation.valid) {
  throw new Error(`Config invalid: ${validation.errors.join(', ')}`);
}

// Start monitoring
setInterval(() => {
  const stats = production.getStatistics();
  console.log('Performance:', stats.performanceMetrics);
}, 10000);
```

## Configuration Reference

### Flashblock Config

```typescript
interface FlashblockConfig {
  enabled: boolean;                    // Enable flashblocks
  targetConfirmationMs: number;        // Target time (200-500ms)
  maxBufferBlocks: number;             // Max blocks to buffer
  enablePriorityOrdering: boolean;     // Enable MEV-aware ordering
}
```

### Builder Sidecar Config

```typescript
interface BuilderSidecarConfig {
  executionEngineUrl: string;   // op-geth endpoint
  proposerNodeUrl: string;      // op-node endpoint
  jwtSecret: string;            // JWT for authentication
  builderRpcUrl?: string;       // Optional builder RPC
  enableTracing: boolean;       // Enable debug traces
  enableMetrics: boolean;       // Enable metrics export
}
```

### OP-rbuilder Config

```typescript
interface OPRBuilderConfig {
  chainId: number;                        // L2 chain ID
  l1ConsensusUrl: string;                 // L1 consensus client
  sequencerUrl: string;                   // op-node URL
  jwtSecret: string;                      // JWT secret
  enableFlashblocks: boolean;             // Enable flashblocks
  flashblockContractAddress?: string;     // Optional contract
  enableFlashtestations: boolean;         // Enable attestations
}
```

## Performance Tuning

### Target Confirmation Time

```typescript
// Conservative (higher reliability)
targetConfirmationMs: 400

// Balanced (recommended)
targetConfirmationMs: 250

// Aggressive (competitive edge)
targetConfirmationMs: 200
```

### Buffer Size

```typescript
// Small (faster L1 finalization)
maxBufferBlocks: 5

// Medium (balanced)
maxBufferBlocks: 10

// Large (more confirmation confidence)
maxBufferBlocks: 20
```

## Monitoring and Observability

### Health Checks

```typescript
const metrics = rollupBoost.getPerformanceMetrics();

// Check if healthy
const isHealthy = 
  metrics.avgConfirmationTimeMs < 500 &&
  metrics.l1FinalizationRate > 0.95 &&
  metrics.uptimePercentage > 0.99;

if (!isHealthy) {
  console.error('Rollup-Boost health degraded');
  // Trigger alerts
}
```

### Performance Alerts

```typescript
// Alert on slow confirmations
if (metrics.maxConfirmationTimeMs > 1000) {
  console.warn('Confirmation spike detected:', metrics.maxConfirmationTimeMs, 'ms');
}

// Alert on low L1 finalization
if (metrics.l1FinalizationRate < 0.9) {
  console.warn('Low L1 finalization:', metrics.l1FinalizationRate);
}
```

## Best Practices

### 1. Always Validate Configuration

```typescript
const validation = rollupBoost.validateSidecarConfig();
if (!validation.valid) {
  throw new Error('Invalid config');
}
```

### 2. Monitor Performance Continuously

```typescript
setInterval(() => {
  const rec = rollupBoost.recommendFlashblockConfig();
  if (rec.targetConfirmationMs !== currentTarget) {
    console.log('Configuration update recommended:', rec.reasoning);
  }
}, 60000); // Every minute
```

### 3. Use Priority Ordering

```typescript
// Always enable for fairness
enablePriorityOrdering: true
```

### 4. Set Realistic Targets

```typescript
// Don't set target below network capabilities
const metrics = rollupBoost.getPerformanceMetrics();
const minSafe = metrics.minConfirmationTimeMs * 1.2; // 20% buffer

targetConfirmationMs: Math.max(minSafe, 200)
```

## Troubleshooting

### Slow Confirmations

1. Check network congestion
2. Review `maxBufferBlocks` setting
3. Verify op-geth/op-node performance
4. Consider increasing gas prices

### Configuration Errors

```typescript
const validation = rollupBoost.validateSidecarConfig();
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
```

### Low L1 Finalization

1. Check L1 network status
2. Verify sequencer connectivity
3. Review buffer configuration
4. Monitor L1 gas prices

## Resources

- [Rollup-Boost Documentation](https://rollup-boost.flashbots.net/)
- [OP-rbuilder Repository](https://github.com/flashbots/op-rbuilder)
- [Rollup-Boost Repository](https://github.com/flashbots/rollup-boost)
- [OP Stack Flashblocks Guide](https://gelato.cloud/blog/op-stack-flashblocks-and-the-evolution-of-l2-architecture)

## See Also

- [Flashbots Intelligence](./FLASHBOTS_INTELLIGENCE.md)
- [BuilderNet Integration](./BUILDERNET_INTEGRATION.md)
- [MEV Intelligence Suite](./MEV_INTELLIGENCE_SUITE.md)
