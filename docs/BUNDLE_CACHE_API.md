# Bundle Cache API Documentation

## Overview

The Flashbots Bundle Cache API allows users to iteratively build transaction bundles for atomic execution. This is particularly useful for:

- **Whitehat recoveries**: Safely recover funds from compromised wallets without exposing private keys
- **Complex DeFi strategies**: Build multi-step operations that must execute atomically
- **MEV protection**: Keep transactions private until ready to submit
- **Iterative bundle building**: Add transactions one by one as conditions are met

## Official Documentation

- [Flashbots Bundle Cache API](https://docs.flashbots.net/flashbots-protect/additional-documentation/bundle-cache)
- [Flashbots Protect Overview](https://docs.flashbots.net/flashbots-protect/overview)

## Key Features

### 1. **Iterative Bundle Building**
- Create a bundle with a unique ID
- Add transactions one at a time
- Transactions are cached until you're ready to submit

### 2. **Privacy & Security**
- Transactions never hit public mempool
- Private keys stay in secure environment (e.g., MetaMask)
- No frontrunning or sandwich attacks
- Atomic execution (all transactions succeed or all fail)

### 3. **Fake Funds Mode**
- Enable fake balance (100 ETH) for transaction creation
- Perfect for testing and preparing transactions
- No need for real funds during bundle assembly

### 4. **Flexible Workflow**
- Build bundles over time
- Retrieve and inspect before submission
- Cancel or modify before execution
- Compatible with any wallet provider

## API Reference

### Types

```typescript
interface BundleCacheOptions {
  /** Custom bundle ID (if not provided, will be generated) */
  bundleId?: string;
  
  /** Enable fake funds mode (returns 100 ETH balance for testing) */
  fakeFunds?: boolean;
  
  /** Chain ID (default: 1 for mainnet) */
  chainId?: number;
}

interface BundleCacheInfo {
  /** Unique bundle ID (UUID v4) */
  bundleId: string;
  
  /** Array of raw signed transactions */
  rawTxs: string[];
  
  /** Timestamp when bundle was created */
  createdAt?: Date;
  
  /** Number of transactions in bundle */
  txCount?: number;
}

interface BundleCacheAddResult {
  /** Bundle ID */
  bundleId: string;
  
  /** Transaction hash */
  txHash: string;
  
  /** Current transaction count in bundle */
  txCount: number;
  
  /** Success flag */
  success: boolean;
}
```

### Methods

#### `createBundleCache(options?: BundleCacheOptions)`

Create a new bundle cache with a unique ID.

**Parameters:**
- `options` (optional): Bundle cache configuration
  - `bundleId`: Custom UUID (generated if not provided)
  - `fakeFunds`: Enable 100 ETH fake balance for testing
  - `chainId`: Ethereum chain ID (default: 1)

**Returns:**
```typescript
{
  bundleId: string;    // UUID v4 identifier
  rpcUrl: string;      // RPC endpoint with bundle parameter
  chainId: number;     // Chain ID
}
```

**Example:**
```typescript
const bundleCache = privateRPC.createBundleCache({
  chainId: 1,
  fakeFunds: false,
});

console.log(`Bundle ID: ${bundleCache.bundleId}`);
console.log(`RPC URL: ${bundleCache.rpcUrl}`);
// RPC URL: https://rpc.flashbots.net?bundle=cbd900bf-44c5-4f6b-bf14-9b8d2ae27510
```

#### `addTransactionToBundleCache(bundleId: string, signedTx: string)`

Add a signed transaction to the bundle cache.

**Parameters:**
- `bundleId`: The bundle ID
- `signedTx`: Signed transaction hex string (with 0x prefix)

**Returns:** `Promise<BundleCacheAddResult>`

**Example:**
```typescript
const tx = await signer.populateTransaction({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  value: ethers.utils.parseEther('0.1'),
  gasLimit: 21000,
});
const signedTx = await signer.signTransaction(tx);

const result = await privateRPC.addTransactionToBundleCache(
  bundleCache.bundleId,
  signedTx
);

console.log(`Transaction added: ${result.txHash}`);
console.log(`Total transactions: ${result.txCount}`);
```

#### `getBundleCacheTransactions(bundleId: string)`

Retrieve all transactions in a bundle cache.

**Parameters:**
- `bundleId`: The bundle ID

**Returns:** `Promise<BundleCacheInfo>`

**Example:**
```typescript
const bundleInfo = await privateRPC.getBundleCacheTransactions(bundleId);

console.log(`Bundle contains ${bundleInfo.txCount} transactions`);
console.log('Raw transactions:', bundleInfo.rawTxs);
```

#### `sendCachedBundle(bundleId: string, targetBlock: number)`

Submit a cached bundle for execution at the specified block.

**Parameters:**
- `bundleId`: The bundle ID
- `targetBlock`: Target block number for inclusion

**Returns:** `Promise<PrivateTransactionResult>`

**Example:**
```typescript
const currentBlock = await provider.getBlockNumber();
const targetBlock = currentBlock + 2;

const result = await privateRPC.sendCachedBundle(
  bundleCache.bundleId,
  targetBlock
);

if (result.success) {
  console.log('Bundle submitted successfully!');
  console.log(`Transaction hash: ${result.txHash}`);
}
```

## Use Cases

### 1. Whitehat Recovery

**Scenario**: Compromised wallet has ERC20 tokens but no ETH for gas.

**Solution**: Build atomic bundle with:
1. Transaction from safe wallet funding compromised wallet with gas
2. Transaction from compromised wallet transferring tokens out
3. Transaction from compromised wallet transferring remaining ETH out

**Benefits**:
- Private keys never exposed
- Atomic execution (all or nothing)
- No mempool exposure
- No frontrunning risk

**Example**:
```typescript
// Step 1: Create bundle with fake funds mode
const bundleCache = privateRPC.createBundleCache({
  fakeFunds: true,  // 100 ETH balance for tx creation
  chainId: 1,
});

// Step 2: Connect MetaMask to bundleCache.rpcUrl
// Step 3: Sign transactions from compromised wallet (has fake balance)
// Step 4: Sign gas funding transaction from safe wallet
// Step 5: Submit bundle atomically

const result = await privateRPC.sendCachedBundle(
  bundleCache.bundleId,
  targetBlock
);
```

### 2. Complex DeFi Strategy

**Scenario**: Multi-step arbitrage requiring flash loan, swaps, and repayment.

**Solution**: Build atomic bundle with:
1. Flash loan borrow
2. Swap on DEX A
3. Swap on DEX B
4. Flash loan repayment
5. Profit extraction

**Benefits**:
- Build strategy incrementally
- Test each transaction
- Atomic execution
- MEV protected

**Example**:
```typescript
const bundleCache = privateRPC.createBundleCache();

// Add transactions one by one
await privateRPC.addTransactionToBundleCache(bundleId, flashLoanTx);
await privateRPC.addTransactionToBundleCache(bundleId, swap1Tx);
await privateRPC.addTransactionToBundleCache(bundleId, swap2Tx);
await privateRPC.addTransactionToBundleCache(bundleId, repayTx);

// Submit when ready
await privateRPC.sendCachedBundle(bundleId, targetBlock);
```

### 3. Time-Sensitive Operations

**Scenario**: Need to prepare transactions in advance for time-critical execution.

**Solution**: Pre-build bundle, submit when conditions are met.

**Example**:
```typescript
// Build bundle in advance
const bundleCache = privateRPC.createBundleCache({
  bundleId: 'strategy-2024-01-15',  // Custom ID
});

// Add transactions
await addAllTransactions(bundleCache.bundleId);

// Wait for optimal conditions
await waitForOptimalPrice();

// Execute immediately when ready
const currentBlock = await provider.getBlockNumber();
await privateRPC.sendCachedBundle(bundleCache.bundleId, currentBlock + 1);
```

## Workflow

### Standard Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Create Bundle Cache                                      │
│    const cache = privateRPC.createBundleCache()             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 2. Sign Transactions                                        │
│    const signed = await signer.signTransaction(tx)          │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 3. Add to Bundle Cache (repeat for each tx)                │
│    await privateRPC.addTransactionToBundleCache(id, signed) │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 4. Retrieve Bundle (optional, for verification)            │
│    const info = await privateRPC.getBundleCacheTransactions()│
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 5. Submit Bundle                                            │
│    await privateRPC.sendCachedBundle(id, targetBlock)       │
└─────────────────────────────────────────────────────────────┘
```

### MetaMask Integration Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Create Bundle Cache                                      │
│    Get bundleCache.rpcUrl                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 2. Add Custom RPC to MetaMask                               │
│    Network Name: Flashbots Bundle Cache                     │
│    RPC URL: https://rpc.flashbots.net?bundle=<ID>           │
│    Chain ID: 1                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 3. Sign Transactions via MetaMask                           │
│    Transactions cached, not broadcast                       │
│    Private keys stay in MetaMask                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 4. Retrieve and Submit Bundle                               │
│    Use getBundleCacheTransactions() and sendCachedBundle()  │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. **Use Custom Bundle IDs for Tracking**
```typescript
const bundleCache = privateRPC.createBundleCache({
  bundleId: `recovery-${Date.now()}`,
  chainId: 1,
});
```

### 2. **Verify Bundle Before Submission**
```typescript
const bundleInfo = await privateRPC.getBundleCacheTransactions(bundleId);
console.log(`Submitting ${bundleInfo.txCount} transactions`);
console.log('Total gas:', calculateTotalGas(bundleInfo.rawTxs));
```

### 3. **Use Fake Funds for Testing**
```typescript
const testBundle = privateRPC.createBundleCache({
  fakeFunds: true,  // 100 ETH fake balance
});
// Now you can create transactions without real funds
```

### 4. **Handle Errors Gracefully**
```typescript
try {
  await privateRPC.addTransactionToBundleCache(bundleId, signedTx);
} catch (error) {
  console.error('Failed to add transaction:', error);
  // Handle error (retry, alert user, etc.)
}
```

### 5. **Target Appropriate Blocks**
```typescript
const currentBlock = await provider.getBlockNumber();
const targetBlock = currentBlock + 2;  // 2 blocks in future
const maxBlock = currentBlock + 5;     // Expiration

// Consider block time and network congestion
```

## Security Considerations

### ✅ Secure Practices

1. **Private Key Safety**
   - Never expose private keys
   - Use hardware wallets when possible
   - Sign transactions in secure environment

2. **Bundle Verification**
   - Always verify bundle contents before submission
   - Check transaction order and dependencies
   - Validate gas limits and values

3. **Network Selection**
   - Use correct chain ID
   - Verify RPC endpoint
   - Test on testnet first

### ⚠️ Risks & Mitigations

1. **Transaction Ordering**
   - **Risk**: Wrong order can cause failures
   - **Mitigation**: Carefully plan transaction sequence

2. **Gas Estimation**
   - **Risk**: Insufficient gas causes revert
   - **Mitigation**: Use generous gas limits

3. **Time Sensitivity**
   - **Risk**: Bundle expires if not included
   - **Mitigation**: Set appropriate target blocks

## Integration Examples

### With Arbitrage Consciousness

```typescript
const consciousness = new ArbitrageConsciousness();
const privateRPC = new PrivateRPCManager(provider, signer);

// Evaluate opportunity
const decision = await consciousness.evaluateOpportunity(opportunity);

if (decision.shouldExecute) {
  // Build bundle for atomic execution
  const bundleCache = privateRPC.createBundleCache();
  
  // Add all required transactions
  for (const tx of opportunity.transactions) {
    const signed = await signer.signTransaction(tx);
    await privateRPC.addTransactionToBundleCache(bundleCache.bundleId, signed);
  }
  
  // Submit bundle
  const targetBlock = decision.optimalBlock;
  await privateRPC.sendCachedBundle(bundleCache.bundleId, targetBlock);
}
```

### With Flash Loan Executor

```typescript
const flashLoan = new FlashLoanExecutor(provider, signer);
const privateRPC = new PrivateRPCManager(provider, signer);

// Create bundle for flash loan arbitrage
const bundleCache = privateRPC.createBundleCache();

// Build flash loan transaction
const flashLoanTx = await flashLoan.buildTransaction({
  amount: ethers.utils.parseUnits('10000', 6), // 10k USDC
  // ... other params
});

// Add to bundle
const signed = await signer.signTransaction(flashLoanTx);
await privateRPC.addTransactionToBundleCache(bundleCache.bundleId, signed);

// Submit
await privateRPC.sendCachedBundle(bundleCache.bundleId, targetBlock);
```

## Troubleshooting

### Issue: "Bundle is empty"
**Solution**: Ensure transactions were added before calling `sendCachedBundle()`

### Issue: "HTTP 404: Not Found"
**Solution**: Check bundle ID is correct and bundle exists

### Issue: "Transaction reverted"
**Solution**: Verify transaction order, gas limits, and account balances

### Issue: "Bundle not included"
**Solution**: Try higher gas price or target later block

## Resources

- [Flashbots Documentation](https://docs.flashbots.net/)
- [Bundle Cache API](https://docs.flashbots.net/flashbots-protect/additional-documentation/bundle-cache)
- [Flashbots Protect](https://docs.flashbots.net/flashbots-protect/overview)
- [Example Code](../examples/bundle-cache-demo.ts)

## Support

For questions and support:
- [Flashbots Discord](https://discord.gg/flashbots)
- [GitHub Issues](https://github.com/flashbots/flashbots-docs/issues)
- [Documentation](https://docs.flashbots.net/)
