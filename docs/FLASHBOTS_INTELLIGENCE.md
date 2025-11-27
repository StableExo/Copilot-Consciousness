# Flashbots Intelligence Integration

Advanced intelligence layer for Flashbots integration based on [Flashbots Documentation](https://docs.flashbots.net/).

> **📖 Understanding MEV Refunds:** For a detailed explanation of how MEV refunds work, see [MEV Refund Explained](./MEV_REFUND_EXPLAINED.md).

## Overview

The Flashbots Intelligence system provides advanced capabilities for MEV extraction and bundle management:

1. **Bundle Simulation** - Validate bundles before submission
2. **Builder Reputation** - Track and optimize builder selection
3. **MEV Refund Monitoring** - Track MEV extraction and refunds (see [detailed guide](./MEV_REFUND_EXPLAINED.md))
4. **Bundle Optimization** - Analyze and improve bundle profitability
5. **Inclusion Probability** - Estimate likelihood of bundle inclusion

## Components

### PrivateRPCManager Enhancements

The `PrivateRPCManager` has been enhanced with bundle intelligence capabilities:

#### Bundle Simulation (`eth_callBundle`)

Simulate a bundle before submission to validate it will execute successfully:

```typescript
import { PrivateRPCManager, createFlashbotsProtectConfig } from './execution';

const manager = new PrivateRPCManager(provider, signer, {
  relays: [createFlashbotsProtectConfig(1)], // Mainnet
});

// Create bundle
const bundle = await manager.createFlashbotsBundle([tx1, tx2], targetBlock);

// Simulate bundle
const simulation = await manager.simulateBundle(bundle);

if (simulation.success) {
  console.log('Simulation successful!');
  console.log('Total gas:', simulation.totalGasUsed);
  console.log('Coinbase profit:', simulation.coinbaseDiff);
  console.log('Gas fees:', simulation.gasFees);
  
  // Check for reverting transactions
  const hasRevert = simulation.results?.some(tx => tx.revert);
  if (!hasRevert) {
    console.log('All transactions will succeed');
  }
}
```

**Simulation Result Fields:**
- `success` - Whether simulation succeeded
- `totalGasUsed` - Total gas consumed
- `coinbaseDiff` - Profit to block builder (in wei)
- `gasFees` - Total gas fees paid
- `ethSentToCoinbase` - ETH sent directly to coinbase
- `results` - Per-transaction results including revert status

#### Bundle Cancellation (`eth_cancelBundle`)

Cancel a submitted bundle before it's included:

```typescript
const bundleHash = '0x...';
const cancelled = await manager.cancelBundle(bundleHash);
if (cancelled) {
  console.log('Bundle cancelled successfully');
}
```

**Note:** Bundles can only be cancelled if they haven't been included yet.

#### Bundle Status Tracking

Check if a bundle was included and in which block:

```typescript
const status = await manager.getBundleStatus(bundleHash);

if (status?.isIncluded) {
  console.log(`Bundle included in block ${status.blockNumber}`);
  console.log('Transaction hashes:', status.txHashes);
}
```

#### Submit with Validation

Simulate and submit only if profitable:

```typescript
const minProfitWei = BigInt(0.01e18); // 0.01 ETH minimum

const result = await manager.submitBundleWithValidation(bundle, minProfitWei);

if (result.success) {
  console.log('Bundle submitted:', result.bundleHash);
} else {
  console.log('Validation failed:', result.error);
}
```

**Validation checks:**
1. Simulates the bundle
2. Checks for reverting transactions
3. Verifies profit meets minimum threshold
4. Only submits if all checks pass

#### Wait for Inclusion

Poll for bundle inclusion with timeout:

```typescript
const maxBlocks = 25; // Wait up to 25 blocks
const pollInterval = 3000; // Poll every 3 seconds

const status = await manager.waitForBundleInclusion(
  bundleHash,
  maxBlocks,
  pollInterval
);

if (status?.isIncluded) {
  console.log('Bundle included!');
} else {
  console.log('Bundle not included within timeout');
}
```

### FlashbotsIntelligence Module

Advanced analytics and optimization for Flashbots integration.

#### Initialization

```typescript
import { FlashbotsIntelligence } from './intelligence/flashbots';

const intelligence = new FlashbotsIntelligence(provider, {
  minBuilderSuccessRate: 0.75,      // Minimum 75% success rate
  reputationWindowBlocks: 7200,      // Track ~24 hours of history
  enableRefundTracking: true,        // Track MEV refunds
  minTrackableMEV: BigInt(0.01e18), // Track refunds > 0.01 ETH
});
```

#### Builder Reputation Tracking

Track builder performance over time:

```typescript
// Record bundle result
intelligence.recordBundleResult(
  'builder-name',
  true,           // success
  2               // included in 2 blocks
);

// Get recommended builders
const topBuilders = intelligence.getRecommendedBuilders(3);
console.log('Top 3 builders:', topBuilders);

// Get specific builder reputation
const reputation = intelligence.getBuilderReputation('builder-name');
console.log('Success rate:', reputation.successRate);
console.log('Avg inclusion time:', reputation.avgInclusionBlocks, 'blocks');
console.log('Active:', reputation.isActive);
```

**Reputation Metrics:**
- `successCount` - Number of successful inclusions
- `failureCount` - Number of failed attempts
- `successRate` - Success percentage (0-1)
- `avgInclusionBlocks` - Average blocks until inclusion
- `isActive` - Whether builder meets minimum success threshold

**Automatic Deactivation:**
- Builders with <70% success rate (configurable) after 10+ attempts are marked inactive
- Inactive builders are excluded from recommendations

#### MEV Refund Tracking

Monitor MEV extraction and refunds:

```typescript
// Record MEV refund
intelligence.recordMEVRefund({
  txHash: '0x...',
  bundleHash: '0x...',
  mevExtracted: (0.1e18).toString(),  // 0.1 ETH extracted
  refundAmount: (0.09e18).toString(), // 0.09 ETH refunded (90%)
  blockNumber: 12345678,
  timestamp: Date.now(),
});

// Get refund statistics
const refundStats = intelligence.getTotalMEVRefunds();
console.log('Total extracted:', ethers.utils.formatEther(refundStats.totalExtracted), 'ETH');
console.log('Total refunded:', ethers.utils.formatEther(refundStats.totalRefunded), 'ETH');
console.log('Refund rate:', (refundStats.refundRate * 100).toFixed(1), '%');

// Get recent refunds
const recentRefunds = intelligence.getRecentRefunds(10);
recentRefunds.forEach(refund => {
  console.log(`Block ${refund.blockNumber}:`, 
    ethers.utils.formatEther(refund.refundAmount), 'ETH');
});
```

#### Bundle Optimization Analysis

Analyze simulation results and get recommendations:

```typescript
const simulation = await manager.simulateBundle(bundle);
const optimization = intelligence.analyzeBundleSimulation(simulation);

if (optimization.shouldOptimize) {
  console.log('Optimization recommended:');
  optimization.recommendations.forEach(rec => console.log('-', rec));
  
  if (optimization.recommendedBuilders) {
    console.log('Target builders:', optimization.recommendedBuilders);
  }
}
```

**Optimization Checks:**
- Detects reverting transactions
- Identifies low profit margins
- Checks if gas fees are too high
- Recommends high-reputation builders

#### Inclusion Probability Estimation

Estimate likelihood of bundle inclusion:

```typescript
const probability = intelligence.estimateBundleInclusionProbability(
  bundle,
  simulation
);

console.log(`Estimated inclusion chance: ${(probability * 100).toFixed(1)}%`);

if (probability < 0.5) {
  console.log('Warning: Low inclusion probability');
}
```

**Factors considered:**
- Simulation success
- Reverting transactions
- Bundle profitability
- Historical builder success rates

#### Optimal Gas Price Calculation

Calculate optimal gas price for target inclusion time:

```typescript
// For immediate inclusion (next block)
const gasPrice1 = await intelligence.calculateOptimalGasPrice(1);
console.log('1-block inclusion:', ethers.utils.formatUnits(gasPrice1, 'gwei'), 'gwei');

// For 5-block inclusion
const gasPrice5 = await intelligence.calculateOptimalGasPrice(5);
console.log('5-block inclusion:', ethers.utils.formatUnits(gasPrice5, 'gwei'), 'gwei');
```

#### Statistics and Reporting

Get comprehensive statistics:

```typescript
const stats = intelligence.getStatistics();

console.log('Builder Stats:');
console.log('- Total builders:', stats.builders.total);
console.log('- Active builders:', stats.builders.active);
console.log('- Avg success rate:', (stats.builders.avgSuccessRate * 100).toFixed(1), '%');

console.log('\nRefund Stats:');
console.log('- Total refunds:', stats.refunds.total);
console.log('- Total extracted:', stats.refunds.totalExtracted, 'ETH');
console.log('- Total refunded:', stats.refunds.totalRefunded, 'ETH');
console.log('- Refund rate:', (stats.refunds.refundRate * 100).toFixed(1), '%');
```

## Enhanced Types

### BundleSimulationResult

```typescript
interface BundleSimulationResult {
  success: boolean;
  error?: string;
  bundleHash?: string;
  bundleGasPrice?: string;
  coinbaseDiff?: string;      // Profit to miner
  ethSentToCoinbase?: string;
  gasFees?: string;
  stateBlockNumber?: number;
  totalGasUsed?: number;
  results?: Array<{
    txHash?: string;
    gasUsed?: number;
    gasPrice?: string;
    revert?: boolean;
    revertReason?: string;
    value?: string;
  }>;
}
```

### BundleStatus

```typescript
interface BundleStatus {
  isIncluded: boolean;
  blockNumber?: number;
  timestamp?: number;
  txHashes?: string[];
}
```

### BuilderReputation

```typescript
interface BuilderReputation {
  builder: string;
  successCount: number;
  failureCount: number;
  avgInclusionBlocks: number;
  successRate: number;
  lastUsed: Date;
  isActive: boolean;
}
```

### MEVRefund

```typescript
interface MEVRefund {
  txHash: string;
  bundleHash?: string;
  mevExtracted: string;    // in wei
  refundAmount: string;    // in wei
  blockNumber: number;
  timestamp: number;
}
```

### Enhanced MEVShareOptions

```typescript
interface MEVShareOptions {
  hints?: {
    calldata?: boolean;
    contractAddress?: boolean;
    functionSelector?: boolean;
    logs?: boolean;
    hash?: boolean;
    default_logs?: boolean;  // NEW: Share transfer/swap events
  };
  builders?: string[];
  maxBlockNumber?: number;
  refundConfig?: {          // NEW: Refund configuration
    percent?: number;       // 0-100
  };
}
```

## Complete Workflow Example

```typescript
import { ethers } from 'ethers';
import { 
  PrivateRPCManager, 
  createFlashbotsProtectConfig 
} from './execution';
import { FlashbotsIntelligence } from './intelligence/flashbots';

// Setup
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const manager = new PrivateRPCManager(provider, wallet, {
  relays: [createFlashbotsProtectConfig(1)],
  defaultPrivacyLevel: PrivacyLevel.BASIC,
});

const intelligence = new FlashbotsIntelligence(provider);

// 1. Create bundle
const currentBlock = await provider.getBlockNumber();
const targetBlock = currentBlock + 1;

const bundle = await manager.createFlashbotsBundle(
  [tx1, tx2, tx3],
  targetBlock
);

// 2. Simulate bundle
const simulation = await manager.simulateBundle(bundle);

if (!simulation.success) {
  console.error('Simulation failed:', simulation.error);
  return;
}

// 3. Analyze optimization opportunities
const optimization = intelligence.analyzeBundleSimulation(simulation);

if (optimization.shouldOptimize) {
  console.log('Recommendations:', optimization.recommendations);
}

// 4. Estimate inclusion probability
const probability = intelligence.estimateBundleInclusionProbability(
  bundle,
  simulation
);

console.log(`Inclusion probability: ${(probability * 100).toFixed(1)}%`);

// 5. Submit with validation
const minProfit = BigInt(0.01e18); // 0.01 ETH
const result = await manager.submitBundleWithValidation(bundle, minProfit);

if (!result.success) {
  console.error('Submission failed:', result.error);
  return;
}

console.log('Bundle submitted:', result.bundleHash);

// 6. Wait for inclusion
const status = await manager.waitForBundleInclusion(result.bundleHash!, 25);

// 7. Record result for builder reputation
if (status?.isIncluded) {
  console.log('Bundle included in block', status.blockNumber);
  
  intelligence.recordBundleResult(
    'flashbots',
    true,
    (status.blockNumber || 0) - currentBlock
  );
  
  // Track MEV refund if applicable
  if (simulation.coinbaseDiff) {
    const extracted = BigInt(simulation.coinbaseDiff);
    const refund = extracted * 90n / 100n; // Assume 90% refund
    
    intelligence.recordMEVRefund({
      txHash: status.txHashes![0],
      bundleHash: result.bundleHash!,
      mevExtracted: extracted.toString(),
      refundAmount: refund.toString(),
      blockNumber: status.blockNumber!,
      timestamp: Date.now(),
    });
  }
} else {
  console.log('Bundle not included');
  intelligence.recordBundleResult('flashbots', false, 0);
}
```

## Best Practices

### 1. Always Simulate Before Submitting

```typescript
// ❌ Bad: Submit without validation
await manager.submitFlashbotsBundle(bundle);

// ✅ Good: Simulate and validate
const result = await manager.submitBundleWithValidation(bundle, minProfit);
```

### 2. Track Builder Performance

```typescript
// Record all bundle results
const status = await manager.waitForBundleInclusion(bundleHash);
intelligence.recordBundleResult(
  builderName,
  status?.isIncluded || false,
  inclusionBlocks
);

// Use reputation to select builders
const recommendedBuilders = intelligence.getRecommendedBuilders();
```

### 3. Monitor MEV Refunds

```typescript
// Track refunds to optimize strategy
intelligence.recordMEVRefund(refundData);

// Analyze refund rates
const stats = intelligence.getTotalMEVRefunds();
if (stats.refundRate < 0.8) {
  console.log('Low refund rate - consider different MEV-Share hints');
}
```

### 4. Use Optimization Recommendations

```typescript
const optimization = intelligence.analyzeBundleSimulation(simulation);

if (optimization.shouldOptimize) {
  // Act on recommendations
  for (const rec of optimization.recommendations) {
    if (rec.includes('reverting')) {
      // Remove reverting transactions
    } else if (rec.includes('gas')) {
      // Optimize gas usage
    }
  }
}
```

### 5. Set Appropriate Profit Thresholds

```typescript
// Calculate minimum profit based on gas costs and risk
const gasCost = simulation.gasFees ? BigInt(simulation.gasFees) : 0n;
const minProfit = gasCost * 3n; // 3x gas cost minimum

await manager.submitBundleWithValidation(bundle, minProfit);
```

## Integration with Existing Systems

### With ArbitrageConsciousness

```typescript
import { ArbitrageConsciousness } from './consciousness/arbitrage';
import { FlashbotsIntelligence } from './intelligence/flashbots';

const consciousness = new ArbitrageConsciousness();
const flashbots = new FlashbotsIntelligence(provider);

// Use Flashbots intelligence in decision making
const decision = await consciousness.evaluateOpportunity(opportunity);

if (decision.shouldExecute) {
  // Create bundle
  const bundle = await createArbitrageBundle(opportunity);
  
  // Simulate with Flashbots
  const simulation = await manager.simulateBundle(bundle);
  const optimization = flashbots.analyzeBundleSimulation(simulation);
  
  // Only execute if optimization analysis is positive
  if (!optimization.shouldOptimize || optimization.recommendations.length === 0) {
    await executeArbitrage(bundle);
  }
}
```

### With MEVSensorHub

```typescript
import { MEVSensorHub } from './intelligence/mev-awareness';
import { FlashbotsIntelligence } from './intelligence/flashbots';

const mevSensors = new MEVSensorHub(provider);
const flashbots = new FlashbotsIntelligence(provider);

// Combine MEV risk with Flashbots intelligence
const riskParams = mevSensors.getRiskParams();

if (riskParams.mempoolCongestion > 0.7) {
  // High congestion - use optimal gas price
  const optimalGas = await flashbots.calculateOptimalGasPrice(1);
  // Update transaction gas prices
}
```

## Error Handling

```typescript
try {
  const simulation = await manager.simulateBundle(bundle);
  
  if (!simulation.success) {
    console.error('Simulation failed:', simulation.error);
    return;
  }
  
  const result = await manager.submitBundleWithValidation(bundle, minProfit);
  
  if (!result.success) {
    console.error('Submission failed:', result.error);
    return;
  }
  
} catch (error) {
  console.error('Flashbots error:', error);
  
  // Fallback to public mempool if needed
  if (allowPublicFallback) {
    await submitToPublicMempool(tx);
  }
}
```

## Performance Considerations

1. **Simulation Costs** - Each simulation is an RPC call; cache results when possible
2. **Polling Frequency** - Balance between responsiveness and RPC load
3. **Data Retention** - Intelligence module stores last 1000 refunds automatically
4. **Builder Reputation** - Automatically prunes inactive builders

## Security Notes

1. **Bundle Privacy** - Bundles are only visible to selected builders
2. **Frontrunning Protection** - Transactions not exposed to public mempool
3. **MEV-Share Hints** - Configure hints carefully to balance privacy vs. profit
4. **Builder Trust** - Use reputation system to avoid unreliable builders

## Advanced Features (New)

### Fast Mode Support

Fast mode multiplexes bundles to all registered builders, increasing the likelihood of next-block inclusion:

```typescript
import { createFlashbotsProtectConfig } from './execution';

// Create fast mode configuration
const fastConfig = createFlashbotsProtectConfig(1, undefined, true);
// Uses endpoint: https://rpc.flashbots.net/fast

// Or configure in MEV-Share options
const mevShareOptions: MEVShareOptions = {
  fastMode: true,
  hints: {
    logs: true,
    default_logs: true,
  },
};
```

**Fast Mode Benefits:**
- Transactions shared with all registered builders immediately
- Higher validator incentives for faster inclusion
- Full transaction info shared with TEE (Trusted Execution Environment) searchers
- Ideal for time-sensitive arbitrage opportunities

**When to Use Fast Mode:**

```typescript
// Get fast mode recommendation based on urgency and network conditions
const recommendation = await intelligence.recommendFastMode(0.8); // High urgency

if (recommendation.useFastMode) {
  console.log(recommendation.reasoning);
  console.log(`Expected inclusion: ${recommendation.estimatedInclusionBlocks} blocks`);
  
  // Use fast mode configuration
  const config = createFlashbotsProtectConfig(1, authKey, true);
}
```

### Optimal Hints Configuration

The intelligence module can recommend optimal hint configurations based on your privacy requirements:

```typescript
// Maximum refunds (low privacy)
const maxRefundHints = intelligence.recommendOptimalHints(0.2);
// Returns: { calldata, contractAddress, functionSelector, logs, hash, default_logs }

// Balanced approach (medium privacy)
const balancedHints = intelligence.recommendOptimalHints(0.5);
// Returns: { contractAddress, functionSelector, logs, hash, default_logs }

// Maximum privacy (low refunds)
const maxPrivacyHints = intelligence.recommendOptimalHints(0.9);
// Returns: { hash }

// Use in MEV-Share options
const options: MEVShareOptions = {
  hints: balancedHints,
  fastMode: false,
};
```

**Privacy vs. Refund Trade-offs:**

| Privacy Priority | Hints Shared | MEV Refund Potential | Use Case |
|-----------------|--------------|---------------------|----------|
| 0.0 - 0.3 | All (calldata, logs, etc.) | Maximum | Maximize profit, minimal privacy concerns |
| 0.3 - 0.7 | Selective (logs, selectors) | High | Balanced approach for most use cases |
| 0.7 - 1.0 | Hash only | Minimal | Maximum privacy, competitive advantage |

### MEV-Share Configuration Analysis

Analyze your current MEV-Share configuration and get optimization recommendations:

```typescript
const currentHints = {
  hash: true,
  logs: true,
};

const analysis = intelligence.analyzeMEVShareConfig(currentHints);

if (analysis.shouldOptimize) {
  console.log('Optimization recommended:');
  analysis.recommendations.forEach(rec => console.log('-', rec));
  
  if (analysis.suggestedHints) {
    console.log('Suggested hints:', analysis.suggestedHints);
  }
}
```

**Example Output:**

```
Optimization recommended:
- Low MEV refund rate (25.3%) - consider sharing more hints for better refunds
- Add default_logs hint to share swap/transfer events
- Add logs hint for better searcher visibility
Suggested hints: { hash: true, logs: true, default_logs: true }
```

### MEV-Boost Relay Configuration

Support for MEV-Boost relay configurations with multiple relay support:

```typescript
import { createMEVBoostRelayConfig } from './execution';

// Configure multiple MEV-Boost relays for redundancy
const flashbotsRelay = createMEVBoostRelayConfig(
  'https://boost-relay.flashbots.net',
  ['http://localhost:5052'], // Beacon node URLs
  ['flashbots-builder']      // Connected builders
);

const ultrasoundRelay = createMEVBoostRelayConfig(
  'https://relay.ultrasound.money',
  ['http://localhost:5052'],
  ['ultrasound-builder']
);

const manager = new PrivateRPCManager(provider, signer, {
  relays: [flashbotsRelay, ultrasoundRelay],
  enableFallback: true,
});
```

**Benefits of Multiple Relays:**
- Increased redundancy and uptime
- Protection against single-relay downtime
- Access to different builder networks
- Enhanced censorship resistance

### TEE Searcher Support

Trusted Execution Environment (TEE) searchers receive full transaction information with time delays for privacy:

```typescript
const mevShareOptions: MEVShareOptions = {
  shareTEE: true,  // Enable TEE searcher sharing
  hints: {
    hash: true,
    logs: true,
  },
  fastMode: true,
};
```

**TEE Searcher Features:**
- Access to full transaction data (except signatures)
- Runs in secure enclaves for guaranteed privacy
- Time delay before data is revealed
- Useful for debugging and advanced MEV strategies

## Complete Advanced Workflow Example

```typescript
import { ethers } from 'ethers';
import { 
  PrivateRPCManager, 
  createFlashbotsProtectConfig,
  createMEVBoostRelayConfig,
} from './execution';
import { FlashbotsIntelligence } from './intelligence/flashbots';

// Setup with multiple relays
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const manager = new PrivateRPCManager(provider, wallet, {
  relays: [
    createFlashbotsProtectConfig(1, authKey, false), // Normal mode
    createMEVBoostRelayConfig('https://boost-relay.flashbots.net'),
  ],
  defaultPrivacyLevel: PrivacyLevel.ENHANCED,
});

const intelligence = new FlashbotsIntelligence(provider);

// Get fast mode recommendation
const fastModeRec = await intelligence.recommendFastMode(0.8); // High urgency

// Get optimal hints
const privacyPriority = 0.5; // Balanced
const hints = intelligence.recommendOptimalHints(privacyPriority);

// Analyze current MEV-Share config
const analysis = intelligence.analyzeMEVShareConfig(hints);
console.log('Config analysis:', analysis.recommendations);

// Create transaction with recommendations
const tx = await wallet.populateTransaction({
  to: targetAddress,
  data: calldata,
  value: 0,
});

// Submit with optimized configuration
const result = await manager.submitPrivateTransaction(tx, {
  privacyLevel: PrivacyLevel.ENHANCED,
  fastMode: fastModeRec.useFastMode,
  mevShareOptions: {
    hints,
    shareTEE: true,
    fastMode: fastModeRec.useFastMode,
  },
});

if (result.success) {
  console.log('Transaction submitted successfully');
  console.log('Relay used:', result.relayUsed);
  console.log('Expected inclusion:', fastModeRec.estimatedInclusionBlocks, 'blocks');
}
```

## See Also

- [Flashbots Documentation](https://docs.flashbots.net/)
- [MEV-Share Documentation](https://docs.flashbots.net/flashbots-mev-share/)
- [Flashbots Protect Settings Guide](https://docs.flashbots.net/flashbots-protect/settings-guide)
- [Private RPC Guide](./PRIVATE_RPC.md)
- [MEV Intelligence Suite](./MEV_INTELLIGENCE_SUITE.md)
