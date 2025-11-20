# Advanced Flashbots Features Guide

This guide covers the advanced Flashbots features implemented from the official documentation at https://docs.flashbots.net/.

## Overview

The following features have been added to enhance the Flashbots integration:

1. **eth_sendPrivateTransaction** - Simple single transaction privacy
2. **eth_cancelPrivateTransaction** - Cancel pending private transactions
3. **Transaction Status API** - Check transaction status
4. **replacementUuid** - Bundle replacement and cancellation
5. **Privacy Hint Recommendations** - Optimize privacy vs refund tradeoff

## Feature Details

### 1. eth_sendPrivateTransaction

A simpler alternative to bundles for protecting single transactions.

#### When to Use

- You have a single transaction to protect
- You don't need atomic execution with other transactions
- You want simpler API than bundles

#### Key Benefits

- **Simpler than bundles** - No need to construct multi-transaction bundles
- **Faster inclusion** - Single transactions are easier to include
- **Cancellable** - Can be cancelled before inclusion
- **Fast mode support** - Multiplex to all builders for speed

#### Usage

```typescript
import { PrivateRPCManager, createFlashbotsProtectConfig } from 'aev-thewarden';

const manager = new PrivateRPCManager(provider, signer, {
  relays: [createFlashbotsProtectConfig(1)], // Mainnet
});

// Submit a private transaction
const result = await manager.sendPrivateTransaction(
  {
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    value: ethers.utils.parseEther('1.0'),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
  },
  {
    maxBlockNumber: currentBlock + 5, // Max 5 blocks to include
    fast: true, // Enable fast mode
    preferences: {
      privacy: {
        hints: ['hash'], // Share only tx hash
        builders: ['flashbots'], // Target specific builders
      },
    },
  }
);

if (result.success) {
  console.log('Transaction submitted:', result.txHash);
}
```

#### Parameters

- **tx** (required): Signed transaction hex
- **maxBlockNumber** (optional): Maximum block number for inclusion
- **preferences.fast** (optional): Enable fast mode for faster inclusion
- **preferences.privacy** (optional): Privacy configuration
  - **hints**: Array of data to share with searchers
  - **builders**: Array of builder names to target

#### Response

```typescript
{
  success: boolean;
  txHash?: string;
  relayUsed?: string;
  metadata?: {
    publicMempoolVisible: boolean;
  };
}
```

### 2. eth_cancelPrivateTransaction

Cancel a pending private transaction before it's included.

#### When to Use

- Market conditions changed
- Found a better opportunity
- Transaction no longer needed
- Want to avoid gas costs

#### Important Notes

- ⚠️ Only works for transactions submitted via `eth_sendPrivateTransaction`
- ⚠️ Cannot cancel if already included in a block
- ⚠️ No guarantee of cancellation (race condition with inclusion)

#### Usage

```typescript
const txHash = '0x123...'; // From sendPrivateTransaction

const cancelled = await manager.cancelPrivateTransaction(txHash);

if (cancelled) {
  console.log('Transaction cancelled successfully');
} else {
  console.log('Cancellation failed - may already be included');
}
```

### 3. Transaction Status API

Check the status of transactions submitted through Flashbots Protect.

#### When to Use

- Monitor transaction inclusion
- Debug failed transactions
- Track pending transactions
- Get inclusion confirmation

#### Status Values

- **PENDING** - Transaction waiting for inclusion
- **INCLUDED** - Transaction successfully included
- **FAILED** - Transaction failed execution
- **CANCELLED** - Transaction was cancelled
- **UNKNOWN** - Status cannot be determined

#### Usage

```typescript
const status = await manager.getTransactionStatus(txHash);

console.log('Status URL:', status.statusUrl);
// Visit: https://protect.flashbots.net/tx/0x123...
```

#### Status Response (when INCLUDED)

```json
{
  "status": "INCLUDED",
  "hash": "0x123...",
  "maxBlockNumber": 12345678,
  "transaction": {
    "from": "0x...",
    "to": "0x...",
    "gasLimit": "21000",
    "maxFeePerGas": "50000000000",
    "maxPriorityFeePerGas": "2000000000",
    "nonce": "123",
    "value": "1000000000000000000"
  },
  "blockNumber": 12345670,
  "timestamp": 1234567890
}
```

#### Privacy Note

Transaction details are only visible when status is **INCLUDED**. For PENDING, FAILED, or CANCELLED, only the status and hash are shown to maintain privacy.

### 4. Bundle Replacement with replacementUuid

Submit bundles with a UUID that enables replacement or cancellation.

#### When to Use

- Need ability to update bundle
- Want to cancel bundle if conditions change
- Implementing multi-block strategies
- Managing complex bundle workflows

#### Key Benefits

- **Flexible** - Replace bundle with updated version
- **Cancellable** - Cancel before inclusion
- **Multi-block** - Submit same UUID for multiple blocks
- **Safety** - Prevent duplicate submissions

#### Usage

```typescript
import { v4 as uuidv4 } from 'uuid';

const replacementUuid = uuidv4(); // Or use ethers.utils.id()

// Submit bundle with UUID
const result = await manager.submitFlashbotsBundleWithReplacement(
  bundle,
  replacementUuid
);

if (result.success) {
  console.log('Bundle submitted with UUID:', replacementUuid);
  
  // Later: Replace with updated bundle
  const updatedBundle = await manager.createFlashbotsBundle([...], targetBlock + 1);
  await manager.submitFlashbotsBundleWithReplacement(
    updatedBundle,
    replacementUuid // Same UUID = replacement
  );
  
  // Or cancel the bundle
  await manager.cancelBundle(result.bundleHash);
}
```

#### Best Practices

1. **Use meaningful UUIDs** - Include strategy or trade info
2. **Track UUIDs** - Store UUID to bundle mapping
3. **Set proper timeouts** - Don't let bundles linger
4. **Handle failures gracefully** - UUID doesn't guarantee inclusion

### 5. Privacy Hint Recommendations

Get intelligent recommendations for privacy hint configuration.

#### When to Use

- Optimizing privacy vs refund tradeoff
- Different transaction types require different strategies
- Want data-driven hint selection
- Need to balance MEV capture with privacy

#### Usage

```typescript
const recommendation = manager.getPrivacyHintRecommendations(
  'swap',      // Transaction type: swap, arbitrage, liquidation, general
  'medium'     // Privacy priority: high, medium, low
);

console.log('Hints:', recommendation.hints);
console.log('Expected Refund:', recommendation.expectedRefundPercent + '%');
console.log('Privacy Score:', recommendation.privacyScore + '/100');
console.log('Reasoning:', recommendation.reasoning);
```

#### Recommendations by Transaction Type

##### Swap Transaction

| Priority | Hints | Refund % | Privacy | Reasoning |
|----------|-------|----------|---------|-----------|
| High | `hash` | 50% | 90/100 | Maximum privacy - only share hash |
| Medium | `hash, contract_address, default_logs` | 75% | 60/100 | Balanced - share swap events |
| Low | `hash, contract_address, function_selector, default_logs, calldata` | 90% | 30/100 | Maximum refunds |

##### Arbitrage Transaction

| Priority | Hints | Refund % | Privacy | Reasoning |
|----------|-------|----------|---------|-----------|
| High | `hash` | 40% | 95/100 | Protect strategy - essential for competitive arbitrage |
| Medium | `hash, contract_address` | 60% | 70/100 | Moderate privacy - balanced |
| Low | `hash, contract_address, logs` | 80% | 40/100 | Higher refunds - share logs |

##### Liquidation Transaction

| Priority | Hints | Refund % | Privacy | Reasoning |
|----------|-------|----------|---------|-----------|
| High | `hash` | 45% | 90/100 | Maximum privacy - protect liquidation target |
| Medium | `hash, contract_address` | 70% | 65/100 | Standard liquidation privacy |
| Low | `hash, contract_address, function_selector, logs` | 85% | 35/100 | High refunds - share liquidation details |

##### General Transaction

| Priority | Hints | Refund % | Privacy | Reasoning |
|----------|-------|----------|---------|-----------|
| High | `hash` | 50% | 85/100 | Maximum privacy |
| Medium | `hash, contract_address` | 70% | 60/100 | Balanced privacy and refunds |
| Low | `hash, contract_address, logs, default_logs` | 85% | 35/100 | Maximum refunds |

#### Privacy Hints Explained

- **hash** - Share transaction hash (always safe, minimal info)
- **contract_address** - Share contract being interacted with
- **function_selector** - Share which function is being called
- **logs** - Share all event logs emitted
- **default_logs** - Share standard DEX swap logs (Uniswap, Balancer, Curve)
- **calldata** - Share full transaction calldata (highest risk)

#### Choosing the Right Strategy

**High Privacy (90+ score):**
- Use for: Competitive arbitrage, sensitive liquidations, novel strategies
- Trade-off: Lower MEV refunds (40-50%)
- Benefit: Protect your edge, avoid copycats

**Medium Privacy (60-70 score):**
- Use for: Normal swaps, standard arbitrage, general DeFi
- Trade-off: Moderate MEV refunds (70-75%)
- Benefit: Good balance of privacy and returns

**Low Privacy (30-40 score):**
- Use for: Routine transactions, when refund is priority
- Trade-off: Higher MEV refunds (80-90%)
- Benefit: Maximize MEV capture and refunds

## Complete Integration Example

```typescript
import { ethers } from 'ethers';
import { PrivateRPCManager, createFlashbotsProtectConfig } from 'aev-thewarden';

async function executeProtectedArbitrage() {
  // 1. Setup
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const manager = new PrivateRPCManager(provider, wallet, {
    relays: [createFlashbotsProtectConfig(1, undefined, true)], // Fast mode
  });

  // 2. Get privacy recommendations
  const privacyRec = manager.getPrivacyHintRecommendations('arbitrage', 'high');
  console.log('Privacy strategy:', privacyRec.reasoning);

  // 3. Prepare transaction
  const arbTx = {
    to: arbitrageContract,
    data: calldata,
    gasLimit: 300000,
    maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('5', 'gwei'),
  };

  // 4. Submit privately
  const result = await manager.sendPrivateTransaction(arbTx, {
    maxBlockNumber: (await provider.getBlockNumber()) + 3,
    fast: true,
    preferences: {
      privacy: {
        hints: privacyRec.hints,
      },
    },
  });

  if (!result.success) {
    console.error('Submission failed:', result.error);
    return;
  }

  console.log('Transaction submitted:', result.txHash);

  // 5. Monitor status
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s polling
    
    const status = await manager.getTransactionStatus(result.txHash!);
    console.log('Checking status...');
    
    // In real implementation, parse status from API
    // if (status.status === 'INCLUDED') { ... }
    
    attempts++;
  }

  // 6. Cancel if not included
  if (attempts >= maxAttempts) {
    console.log('Transaction not included, attempting cancellation...');
    const cancelled = await manager.cancelPrivateTransaction(result.txHash!);
    
    if (cancelled) {
      console.log('Transaction cancelled successfully');
    }
  }
}

executeProtectedArbitrage().catch(console.error);
```

## Best Practices

### 1. Always Use Fast Mode for Time-Sensitive Transactions

```typescript
const result = await manager.sendPrivateTransaction(tx, {
  fast: true, // Multiplexes to all builders
});
```

### 2. Set Appropriate maxBlockNumber

```typescript
const currentBlock = await provider.getBlockNumber();
const result = await manager.sendPrivateTransaction(tx, {
  maxBlockNumber: currentBlock + 3, // 3 blocks max
});
```

### 3. Monitor Transaction Status

```typescript
// Poll for status
const checkStatus = async (txHash: string) => {
  const status = await manager.getTransactionStatus(txHash);
  // Parse status and act accordingly
};
```

### 4. Use Privacy Recommendations

```typescript
// Don't hardcode hints, use recommendations
const rec = manager.getPrivacyHintRecommendations(txType, priority);
const result = await manager.sendPrivateTransaction(tx, {
  preferences: {
    privacy: {
      hints: rec.hints,
    },
  },
});
```

### 5. Handle Failures Gracefully

```typescript
const result = await manager.sendPrivateTransaction(tx, options);

if (!result.success) {
  // Log error
  console.error('Submission failed:', result.error);
  
  // Consider fallback
  if (allowPublicFallback) {
    return await manager.submitPrivateTransaction(tx, {
      allowPublicFallback: true,
    });
  }
}
```

## Troubleshooting

### Transaction Not Included

**Possible reasons:**
- Gas price too low
- MaxBlockNumber reached
- Transaction reverted in simulation
- Network congestion

**Solutions:**
- Increase gas price
- Extend maxBlockNumber
- Check transaction validity
- Use fast mode

### Cancellation Failed

**Possible reasons:**
- Transaction already included
- Transaction already failed
- UUID not found

**Solutions:**
- Check transaction status first
- Accept that cancellation is best-effort
- Don't rely on cancellation for critical logic

### Low MEV Refunds

**Possible reasons:**
- Too much privacy (few hints shared)
- Low MEV in transaction
- Competitive searcher landscape

**Solutions:**
- Lower privacy priority
- Share more hints (contract_address, logs)
- Use default_logs for swaps
- Consider if privacy is worth the tradeoff

## API Reference

### sendPrivateTransaction

```typescript
async sendPrivateTransaction(
  transaction: TransactionRequest,
  options?: {
    maxBlockNumber?: number;
    fast?: boolean;
    preferences?: {
      privacy?: {
        hints?: string[];
        builders?: string[];
      };
    };
  }
): Promise<PrivateTransactionResult>
```

### cancelPrivateTransaction

```typescript
async cancelPrivateTransaction(
  txHash: string
): Promise<boolean>
```

### getTransactionStatus

```typescript
async getTransactionStatus(
  txHash: string
): Promise<FlashbotsTransactionStatus>
```

### submitFlashbotsBundleWithReplacement

```typescript
async submitFlashbotsBundleWithReplacement(
  bundle: FlashbotsBundle,
  replacementUuid: string
): Promise<PrivateTransactionResult>
```

### getPrivacyHintRecommendations

```typescript
getPrivacyHintRecommendations(
  transactionType: 'swap' | 'arbitrage' | 'liquidation' | 'general',
  privacyPriority: 'high' | 'medium' | 'low'
): PrivacyHintRecommendation
```

## Resources

- [Flashbots Protect Documentation](https://docs.flashbots.net/flashbots-protect/quick-start)
- [Private Transactions API](https://docs.flashbots.net/flashbots-protect/additional-documentation/eth-sendPrivateTransaction)
- [Transaction Status API](https://docs.flashbots.net/flashbots-protect/additional-documentation/status-api)
- [Bundle Management](https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint)
- [Privacy Hints Guide](https://docs.flashbots.net/flashbots-mev-share/searchers/understanding-bundles)

## Conclusion

These advanced features provide fine-grained control over MEV protection, privacy, and transaction submission. By combining single transaction privacy, bundle management, and intelligent privacy hint selection, you can optimize for your specific use case while maintaining security and maximizing MEV refunds.
