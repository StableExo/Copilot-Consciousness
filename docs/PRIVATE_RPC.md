# Private Order-Flow / MEV-Friendly RPCs

## Overview

The Private RPC Manager enables submission of arbitrage transactions through private relays instead of the public mempool, significantly reducing MEV exposure and front-running risk.

## Benefits

- **Privacy**: Transactions stay out of public mempool
- **Reduced Front-Running**: Less visible to other searchers
- **Builder Priority**: Direct routing to block builders
- **Protection**: Defense against copycat bots
- **Revenue Sharing**: Optional MEV revenue sharing with MEV-Share

## Supported Relays

### 1. Flashbots Protect
- **Endpoint**: `https://rpc.flashbots.net`
- **Description**: Basic private transaction submission
- **Privacy Level**: Basic
- **Docs**: https://docs.flashbots.net/flashbots-protect/overview

### 2. MEV-Share
- **Endpoint**: `https://relay.flashbots.net`
- **Description**: Private transactions with MEV revenue sharing
- **Privacy Level**: Enhanced
- **Docs**: https://docs.flashbots.net/flashbots-mev-share/overview

### 3. Builder RPCs
- **Description**: Direct submission to specific block builders
- **Privacy Level**: Maximum
- **Examples**: Titan, Rsync, other builder endpoints

## Privacy Levels

| Level | Description | Relays Used | Visibility |
|-------|-------------|-------------|------------|
| `NONE` | Public mempool | Standard RPC | Fully visible |
| `BASIC` | Flashbots Protect | Flashbots RPC | Hidden from mempool |
| `ENHANCED` | MEV-Share with hints | MEV-Share | Hidden + revenue sharing |
| `MAXIMUM` | Builder direct | Builder RPCs | Maximum privacy |

## Quick Start

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
# Enable private RPC
ENABLE_PRIVATE_RPC=true

# Privacy level: none | basic | enhanced | maximum
PRIVATE_RPC_PRIVACY_LEVEL=basic

# Flashbots Protect
FLASHBOTS_RPC_URL=https://rpc.flashbots.net
FLASHBOTS_AUTH_KEY=optional-auth-key

# MEV-Share
MEV_SHARE_RPC_URL=https://relay.flashbots.net
MEV_SHARE_AUTH_KEY=optional-auth-key

# Optional: Builder RPC
BUILDER_RPC_URL_1=https://builder.example.com
BUILDER_RPC_AUTH_KEY_1=optional-auth-key
```

### 2. Basic Usage

```typescript
import { ethers, Wallet } from 'ethers';
import {
  PrivateRPCManager,
  createFlashbotsProtectConfig,
  PrivacyLevel,
} from './src/execution';

// Create provider and signer
const provider = new ethers.providers.JsonRpcProvider(
  process.env.ETHEREUM_RPC_URL
);
const signer = new Wallet(process.env.WALLET_PRIVATE_KEY, provider);

// Initialize manager with Flashbots Protect
const manager = new PrivateRPCManager(provider, signer, {
  relays: [createFlashbotsProtectConfig(1)], // Mainnet
  defaultPrivacyLevel: PrivacyLevel.BASIC,
  enableFallback: true,
  privateSubmissionTimeout: 30000,
  verboseLogging: false,
});

// Submit transaction privately
const transaction = {
  to: '0x...',
  data: '0x...',
  gasLimit: 500000,
};

const result = await manager.submitPrivateTransaction(transaction, {
  privacyLevel: PrivacyLevel.BASIC,
  allowPublicFallback: false,
});

console.log('Transaction submitted:', result.txHash);
```

## Advanced Usage

### Multi-Relay Setup with Fallback

```typescript
import {
  PrivateRPCManager,
  createFlashbotsProtectConfig,
  createMEVShareConfig,
  PrivateRelayType,
  PrivacyLevel,
} from './src/execution';

// Configure multiple relays
const relays = [
  // Priority 1: MEV-Share
  createMEVShareConfig(process.env.MEV_SHARE_AUTH_KEY),
  
  // Priority 2: Flashbots Protect
  createFlashbotsProtectConfig(1, process.env.FLASHBOTS_AUTH_KEY),
  
  // Priority 3: Custom builder
  {
    type: PrivateRelayType.BUILDER_RPC,
    endpoint: process.env.BUILDER_RPC_URL_1,
    authKey: process.env.BUILDER_RPC_AUTH_KEY_1,
    enabled: true,
    priority: 70,
    name: 'Custom Builder',
  },
];

const manager = new PrivateRPCManager(provider, signer, {
  relays,
  defaultPrivacyLevel: PrivacyLevel.ENHANCED,
  enableFallback: true,
  privateSubmissionTimeout: 30000,
  verboseLogging: true,
});

// Submit with fast mode (parallel submission)
const result = await manager.submitPrivateTransaction(transaction, {
  fastMode: true,
  maxBlockWait: 5,
  allowPublicFallback: true,
});
```

### MEV-Share with Hints

```typescript
// Submit with specific MEV-Share hints
const result = await manager.submitPrivateTransaction(transaction, {
  privacyLevel: PrivacyLevel.ENHANCED,
  mevShareOptions: {
    hints: {
      calldata: false,        // Don't share calldata
      contractAddress: false, // Don't share contract address
      functionSelector: true, // Share function selector
      logs: false,           // Don't share logs
    },
    builders: ['builder1', 'builder2'], // Target specific builders
    maxBlockNumber: currentBlock + 5,
  },
  allowPublicFallback: false,
});
```

### Flashbots Bundle (Atomic Execution)

```typescript
// Create multiple transactions for atomic execution
const transactions = [
  { to: '0x...', data: '0x...', gasLimit: 100000 },
  { to: '0x...', data: '0x...', gasLimit: 150000 },
];

const currentBlock = await provider.getBlockNumber();
const bundle = await manager.createFlashbotsBundle(
  transactions,
  currentBlock + 1
);

const result = await manager.submitFlashbotsBundle(bundle);
console.log('Bundle hash:', result.bundleHash);
```

## Monitoring and Statistics

### Get Relay Statistics

```typescript
// Get stats for all relays
const allStats = manager.getStats();
allStats.forEach((stats, relayType) => {
  console.log(`${relayType}:`);
  console.log(`  Total Submissions: ${stats.totalSubmissions}`);
  console.log(`  Successful: ${stats.successfulInclusions}`);
  console.log(`  Failed: ${stats.failedSubmissions}`);
  console.log(`  Success Rate: ${
    (stats.successfulInclusions / stats.totalSubmissions * 100).toFixed(2)
  }%`);
  console.log(`  Avg Inclusion Time: ${stats.avgInclusionTime}ms`);
});

// Get stats for specific relay
const flashbotsStats = manager.getRelayStats(
  PrivateRelayType.FLASHBOTS_PROTECT
);
```

### Health Monitoring

```typescript
// Check health of all relays
const healthStatus = await manager.checkAllRelaysHealth();
healthStatus.forEach((isHealthy, relayType) => {
  console.log(`${relayType}: ${isHealthy ? '✓ Healthy' : '✗ Unhealthy'}`);
});

// Check specific relay
const isHealthy = await manager.checkRelayHealth(
  PrivateRelayType.FLASHBOTS_PROTECT
);
```

## Integration with Existing Code

### Updating TransactionManager

```typescript
import { TransactionManager } from './src/execution/TransactionManager';
import { PrivateRPCManager, PrivacyLevel } from './src/execution';

// Initialize both managers
const txManager = new TransactionManager(provider, nonceManager);
const privateRPCManager = new PrivateRPCManager(provider, signer, {
  relays: [createFlashbotsProtectConfig(1)],
  defaultPrivacyLevel: PrivacyLevel.BASIC,
  enableFallback: true,
});

// Use private RPC for high-value arbitrage
if (expectedProfit > threshold) {
  result = await privateRPCManager.submitPrivateTransaction(tx, {
    privacyLevel: PrivacyLevel.ENHANCED,
    allowPublicFallback: false,
  });
} else {
  result = await txManager.executeTransaction(to, data, options);
}
```

### Conditional Privacy Based on MEV Risk

```typescript
import { MEVSensorHub } from './src/mev';

const mevSensors = new MEVSensorHub(provider);
const mevRisk = await mevSensors.assessMEVRisk(transaction);

// Use private RPC if MEV risk is high
const privacyLevel = 
  mevRisk.totalRisk > 0.05 ? PrivacyLevel.ENHANCED :
  mevRisk.totalRisk > 0.02 ? PrivacyLevel.BASIC :
  PrivacyLevel.NONE;

const result = await privateRPCManager.submitPrivateTransaction(tx, {
  privacyLevel,
  allowPublicFallback: privacyLevel === PrivacyLevel.NONE,
});
```

## Best Practices

### 1. Choose Appropriate Privacy Level

- **High-value arbitrage (>1 ETH)**: Use `ENHANCED` or `MAXIMUM`
- **Medium-value (0.1-1 ETH)**: Use `BASIC`
- **Low-value (<0.1 ETH)**: Consider `NONE` (public mempool)

### 2. Configure Fallback

Always enable fallback for non-critical transactions:

```typescript
allowPublicFallback: expectedProfit < criticalThreshold
```

### 3. Monitor Success Rates

Regularly check relay statistics and switch to better-performing relays:

```typescript
const stats = manager.getRelayStats(PrivateRelayType.FLASHBOTS_PROTECT);
if (stats && stats.successfulInclusions / stats.totalSubmissions < 0.8) {
  // Consider using different relay or adjusting configuration
}
```

### 4. Use Fast Mode for Time-Sensitive Transactions

```typescript
const result = await manager.submitPrivateTransaction(tx, {
  fastMode: true, // Submit to multiple relays in parallel
  maxBlockWait: 3,
});
```

### 5. Bundle Related Transactions

For multi-step arbitrage, use bundles to ensure atomic execution:

```typescript
const bundle = await manager.createFlashbotsBundle([tx1, tx2, tx3], targetBlock);
await manager.submitFlashbotsBundle(bundle);
```

## Troubleshooting

### Transaction Not Included

1. **Check relay health**: `await manager.checkRelayHealth(relayType)`
2. **Increase max block wait**: `maxBlockWait: 10`
3. **Try different relay**: `preferredRelay: PrivateRelayType.MEV_SHARE`
4. **Enable fallback**: `allowPublicFallback: true`

### High Failure Rate

1. **Check gas price**: Ensure competitive gas pricing
2. **Verify auth keys**: Confirm Flashbots/MEV-Share credentials
3. **Monitor network**: High congestion may affect private relays
4. **Review relay stats**: `manager.getStats()`

### Bundle Rejected

1. **Verify bundle profit**: Must be profitable for builders
2. **Check target block**: Use current + 1 or current + 2
3. **Review transaction order**: Ensure correct dependency order
4. **Validate gas limits**: Each transaction must have sufficient gas

## API Reference

### PrivateRPCManager

#### Constructor
```typescript
new PrivateRPCManager(
  provider: JsonRpcProvider,
  signer: Wallet,
  config: Partial<PrivateRPCManagerConfig>
)
```

#### Methods

- `submitPrivateTransaction(tx, options)`: Submit a private transaction
- `createFlashbotsBundle(txs, targetBlock)`: Create a Flashbots bundle
- `submitFlashbotsBundle(bundle)`: Submit a Flashbots bundle
- `addRelay(relay)`: Add a relay configuration
- `removeRelay(type)`: Remove a relay
- `getStats()`: Get statistics for all relays
- `getRelayStats(type)`: Get statistics for specific relay
- `checkRelayHealth(type)`: Check if relay is available
- `checkAllRelaysHealth()`: Check health of all relays

### Helper Functions

- `createFlashbotsProtectConfig(chainId, authKey?)`: Create Flashbots config
- `createMEVShareConfig(authKey?)`: Create MEV-Share config

## Examples

See `examples/private-rpc-usage.ts` for complete working examples:

1. Basic Flashbots Protect
2. MEV-Share with hints
3. Multi-relay with fallback
4. Flashbots bundles
5. Statistics monitoring
6. Privacy level comparison

## Learn More

- [Flashbots Protect Documentation](https://docs.flashbots.net/flashbots-protect/overview)
- [MEV-Share Documentation](https://docs.flashbots.net/flashbots-mev-share/overview)
- [Flashbots Research](https://docs.flashbots.net/)
- [MEV Wiki](https://github.com/flashbots/mev-research)
