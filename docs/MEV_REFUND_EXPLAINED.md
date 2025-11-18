# How MEV Refunds Work

## Overview

MEV (Maximal Extractable Value) refunds are a mechanism where users receive back a portion of the MEV their transactions generate, rather than having all profits captured by searchers or validators. This is primarily enabled through **MEV-Share**, Flashbots' orderflow auction protocol.

## The Problem

Traditionally, when you submit a transaction to the public mempool:
1. MEV searchers see your transaction
2. They extract value from it (e.g., through sandwich attacks, frontrunning)
3. All profits go to searchers and validators
4. You pay gas fees and potentially suffer from worse execution prices

**Example:** You swap 10 ETH for USDC on Uniswap. A searcher sees your transaction, frontruns it to buy USDC (raising the price), your swap executes at the worse price, then the searcher backruns to sell USDC back for profit. The searcher keeps all the MEV.

## The Solution: MEV-Share

MEV-Share flips this model by creating an **orderflow auction** where:
1. Your transaction stays private
2. Searchers compete to pay YOU for the right to extract MEV from your transaction
3. You receive 90%+ of the MEV value back as a refund
4. Searchers and validators split the remaining portion

## How It Works: Step-by-Step

### 1. Transaction Submission with Privacy Hints

When you submit a transaction through MEV-Share (e.g., via Flashbots Protect RPC):

```typescript
// Configure what information to share with searchers
const mevShareOptions: MEVShareOptions = {
  hints: {
    calldata: false,        // Don't share full calldata
    contractAddress: true,  // Share target contract
    functionSelector: true, // Share function being called
    logs: true,            // Share event logs after execution
    hash: true,            // Share transaction hash
    default_logs: true,    // Share standard events (transfers, swaps)
  },
  refundConfig: {
    percent: 90,           // Request 90% refund of MEV
  },
};
```

**Privacy-Profit Tradeoff:**
- **More hints** → Searchers can extract more MEV → Higher refunds for you
- **Fewer hints** → More privacy → Lower (but safer) refunds

### 2. Orderflow Auction

Once your transaction is submitted:

```
[User Transaction] → [MEV-Share Node] → [Searchers Compete]
                                            ↓
                                    [Highest Bidder Wins]
```

**Searchers compete by:**
- Analyzing the hints you provided
- Identifying MEV opportunities (arbitrage, backruns, etc.)
- Bidding on how much they'll pay YOU for the right to bundle with your tx
- The searcher offering the highest refund percentage wins

**Key Point:** Searchers can ONLY backrun (execute after) your transaction, NOT frontrun it. This protects you from sandwich attacks.

### 3. Bundle Execution

The winning searcher creates a bundle:

```typescript
Bundle = [
  Your Transaction,      // Executes first
  Searcher Transaction,  // Executes second (backrun only)
]
```

This bundle is sent to block builders who:
1. Validate the bundle
2. Include it in a block
3. Execute both transactions atomically

### 4. MEV Extraction and Refund

After execution:

```
Total MEV Extracted: 0.1 ETH

Distribution:
├─ User Refund (90%):     0.09 ETH → Your wallet
├─ Searcher Profit (8%):  0.008 ETH → Searcher
└─ Validator Tip (2%):    0.002 ETH → Block validator
```

**The refund is sent directly to your wallet** in the same block, either as:
- Direct ETH transfer to `refundRecipient` address
- Added to your transaction's coinbase payment
- Included as part of the bundle's value distribution

## Refund Mechanisms in Detail

### Method 1: Direct Transfer (Most Common)

```solidity
// Pseudo-code of what happens in the bundle
function executeBundle() {
  // 1. Execute user transaction
  userTx.execute();
  
  // 2. Execute searcher MEV extraction
  uint256 mevProfit = searcherTx.execute();
  
  // 3. Calculate and send refund
  uint256 refundAmount = (mevProfit * refundPercent) / 100;
  payable(refundRecipient).transfer(refundAmount);
}
```

### Method 2: Coinbase Diff

Some implementations use the "coinbase diff" mechanism:

```typescript
// Before bundle execution
const coinbaseBalanceBefore = await provider.getBalance(block.coinbase);

// Execute bundle
await executeBundle();

// After bundle execution
const coinbaseBalanceAfter = await provider.getBalance(block.coinbase);

// MEV extracted
const mevExtracted = coinbaseBalanceAfter - coinbaseBalanceBefore;

// Refund calculation
const refundAmount = (mevExtracted * refundPercent) / 100;
```

## Configurable Refund Percentages

### Standard Configurations

| Service | User Refund | Searcher/Builder | Validator |
|---------|-------------|------------------|-----------|
| MEV-Share (Default) | 90% | 8% | 2% |
| CoW MEV Blocker | 90% | 8% | 2% |
| Flashbots Protect | Variable (optimized) | Variable | Variable |
| Custom Configuration | 0-99% (configurable) | Remainder | Remainder |

### Setting Custom Refund Percentage

```typescript
import { PrivateRPCManager } from './execution';

// When submitting through MEV-Share
const result = await manager.submitPrivateTransaction(transaction, {
  privacyLevel: PrivacyLevel.ENHANCED,
  mevShareOptions: {
    hints: {
      contractAddress: true,
      functionSelector: true,
      logs: true,
    },
    refundConfig: {
      percent: 95, // Request 95% refund
    },
  },
});
```

**Important:** The actual refund percentage depends on:
- Your requested percentage
- Searcher competition (more competition = better refunds)
- Amount of MEV available
- Hints you provide (more hints = more MEV opportunities)

## Real-World Example

Let's walk through a complete MEV refund scenario:

### Scenario: Large Token Swap

You want to swap 100 ETH for USDC on Uniswap.

**Without MEV-Share (Traditional):**
```
1. You submit tx to public mempool
2. Searcher sees it and creates sandwich attack:
   - Frontrun: Buy USDC (price goes up)
   - Your swap executes at worse price
   - Backrun: Sell USDC back (profit)
3. Searcher extracts 2 ETH MEV
4. You lose ~2 ETH in slippage
5. Searcher keeps all 2 ETH profit
```

**With MEV-Share:**
```
1. You submit tx through Flashbots Protect with MEV-Share
2. Transaction stays private
3. Searchers see hints and compete in auction
4. Winning searcher offers 90% refund
5. Bundle executes:
   - Your swap (at market price, no sandwich)
   - Searcher's backrun arbitrage extracts 0.5 ETH
6. Refund distribution:
   - You receive: 0.45 ETH (90% of 0.5 ETH)
   - Searcher keeps: 0.04 ETH (8%)
   - Validator gets: 0.01 ETH (2%)
```

**Net Result:** Instead of losing 2 ETH to a sandwich attack, you gain 0.45 ETH in refunds!

## Tracking MEV Refunds in Code

### Recording Refunds

```typescript
import { FlashbotsIntelligence } from './intelligence/flashbots';

const intelligence = new FlashbotsIntelligence(provider);

// After bundle execution, record the refund
intelligence.recordMEVRefund({
  txHash: '0xabc...',
  bundleHash: '0xdef...',
  mevExtracted: ethers.utils.parseEther('0.5').toString(),  // 0.5 ETH extracted
  refundAmount: ethers.utils.parseEther('0.45').toString(), // 0.45 ETH refunded (90%)
  blockNumber: 18123456,
  timestamp: Date.now(),
});
```

### Analyzing Refund Performance

```typescript
// Get refund statistics
const stats = intelligence.getTotalMEVRefunds();

console.log('Total MEV Extracted:', ethers.utils.formatEther(stats.totalExtracted), 'ETH');
console.log('Total Refunded:', ethers.utils.formatEther(stats.totalRefunded), 'ETH');
console.log('Average Refund Rate:', (stats.refundRate * 100).toFixed(1), '%');

// Get recent refunds
const recentRefunds = intelligence.getRecentRefunds(10);
recentRefunds.forEach(refund => {
  const extracted = ethers.utils.formatEther(refund.mevExtracted);
  const refunded = ethers.utils.formatEther(refund.refundAmount);
  const rate = (BigInt(refund.refundAmount) * 100n / BigInt(refund.mevExtracted));
  
  console.log(`Block ${refund.blockNumber}:`);
  console.log(`  Extracted: ${extracted} ETH`);
  console.log(`  Refunded: ${refunded} ETH (${rate}%)`);
});
```

## Optimizing Your Refunds

### 1. Choose the Right Hint Configuration

```typescript
// High Privacy (Lower Refunds)
const privateHints = {
  contractAddress: true,
  functionSelector: true,
  // No calldata, logs, or other details
};

// Balanced (Good Refunds, Some Privacy)
const balancedHints = {
  contractAddress: true,
  functionSelector: true,
  logs: true,
  default_logs: true,
};

// Maximum Refunds (Less Privacy)
const maxRefundHints = {
  calldata: true,
  contractAddress: true,
  functionSelector: true,
  logs: true,
  hash: true,
  default_logs: true,
};
```

### 2. Monitor Refund Rates

```typescript
// Track your refund performance over time
const refundStats = intelligence.getTotalMEVRefunds();

if (refundStats.refundRate < 0.85) {
  console.log('Warning: Refund rate below 85%');
  console.log('Consider:');
  console.log('- Sharing more hints');
  console.log('- Using different submission time');
  console.log('- Checking searcher competition');
}
```

### 3. Understand Transaction Types

Different transaction types generate different amounts of MEV:

| Transaction Type | MEV Potential | Typical Refund |
|-----------------|---------------|----------------|
| Large DEX Swaps | High (0.1-1% of swap) | 0.05-0.5 ETH |
| NFT Mints | Medium (gas savings) | 0.01-0.1 ETH |
| Token Transfers | Low | <0.01 ETH |
| DeFi Interactions | Variable | 0.01-0.2 ETH |
| Arbitrage | High (self-MEV) | N/A (you keep it) |

## MEV Refund Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Submits Transaction                    │
│                    (with privacy hints & refund %)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MEV-Share Node                             │
│  • Receives transaction                                         │
│  • Shares configured hints with searchers                       │
│  • Manages orderflow auction                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Searchers Compete                            │
│  Searcher A bids: 88% refund                                   │
│  Searcher B bids: 90% refund ← WINNER                          │
│  Searcher C bids: 85% refund                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Bundle Creation                             │
│  [User Tx] → [Searcher Backrun Tx]                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Block Builder Inclusion                       │
│  • Validates bundle                                            │
│  • Includes in block                                           │
│  • Executes atomically                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MEV Extraction                              │
│  Total MEV: 0.1 ETH                                            │
│  ├─ User Refund (90%):    0.09 ETH → User Wallet              │
│  ├─ Searcher (8%):        0.008 ETH → Searcher                │
│  └─ Validator (2%):       0.002 ETH → Block Proposer           │
└─────────────────────────────────────────────────────────────────┘
```

## Advanced: Simulating Expected Refunds

```typescript
import { FlashbotsIntelligence } from './intelligence/flashbots';
import { PrivateRPCManager } from './execution';

// 1. Simulate the bundle to estimate MEV
const bundle = await manager.createFlashbotsBundle([userTx], targetBlock);
const simulation = await manager.simulateBundle(bundle);

if (simulation.success && simulation.coinbaseDiff) {
  const mevExtracted = BigInt(simulation.coinbaseDiff);
  const refundPercent = 90; // 90% refund
  const estimatedRefund = mevExtracted * BigInt(refundPercent) / 100n;
  
  console.log('Estimated MEV:', ethers.utils.formatEther(mevExtracted), 'ETH');
  console.log('Estimated Refund:', ethers.utils.formatEther(estimatedRefund), 'ETH');
  
  // Only submit if refund is worthwhile
  if (estimatedRefund > ethers.utils.parseEther('0.01')) {
    await manager.submitBundleWithValidation(bundle, estimatedRefund);
  }
}
```

## Common Questions

### Q: Is the refund guaranteed?

**A:** No. The refund depends on:
- Actual MEV extracted (which may be less than estimated)
- Searcher competition at submission time
- Bundle inclusion (bundle must be included in a block)
- Correct refund configuration

### Q: When do I receive the refund?

**A:** In the same block where your transaction is executed. The refund is part of the atomic bundle execution.

### Q: Can I set refund percentage to 100%?

**A:** No, maximum is 99%. Searchers and validators need some incentive to include your bundle. Setting it too high may result in no searchers bidding.

### Q: What if no searchers bid?

**A:** Your transaction will still execute normally, but without MEV refunds. This is common for transactions with minimal MEV potential.

### Q: How do I know my refund percentage was honored?

**A:** Check the actual refund received vs MEV extracted:

```typescript
const actualRefundRate = 
  BigInt(refund.refundAmount) * 100n / BigInt(refund.mevExtracted);
console.log('Actual refund rate:', actualRefundRate.toString(), '%');
```

## Best Practices

1. **Start with 90% refund** - Industry standard, good balance
2. **Share balanced hints** - Contract address + function selector + logs
3. **Monitor your refund rates** - Track and optimize over time
4. **Simulate first** - Estimate MEV before submission
5. **Use for high-value txs** - Most beneficial for large swaps/interactions
6. **Track historical performance** - Use FlashbotsIntelligence module

## Integration Example

Complete example showing refund tracking:

```typescript
import { ethers } from 'ethers';
import { PrivateRPCManager, PrivacyLevel } from './execution';
import { FlashbotsIntelligence } from './intelligence/flashbots';

async function executeWithRefundTracking() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const manager = new PrivateRPCManager(provider, wallet, {
    relays: [createFlashbotsProtectConfig(1)],
  });
  
  const intelligence = new FlashbotsIntelligence(provider);
  
  // Submit with MEV-Share
  const result = await manager.submitPrivateTransaction(transaction, {
    privacyLevel: PrivacyLevel.ENHANCED,
    mevShareOptions: {
      hints: {
        contractAddress: true,
        functionSelector: true,
        logs: true,
        default_logs: true,
      },
      refundConfig: {
        percent: 90,
      },
    },
  });
  
  if (result.success && result.txHash) {
    // Wait for confirmation
    const receipt = await provider.waitForTransaction(result.txHash);
    
    // Parse logs to find refund transfer
    const refundTransfer = receipt.logs.find(log => 
      log.topics[0] === ethers.utils.id('Transfer(address,address,uint256)') &&
      log.topics[2] === ethers.utils.hexZeroPad(wallet.address, 32)
    );
    
    if (refundTransfer) {
      const refundAmount = ethers.BigNumber.from(refundTransfer.data);
      
      // Record the refund
      intelligence.recordMEVRefund({
        txHash: result.txHash,
        bundleHash: result.bundleHash || '',
        mevExtracted: refundAmount.mul(100).div(90).toString(), // Estimate total MEV
        refundAmount: refundAmount.toString(),
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
      });
      
      console.log('Refund received:', ethers.utils.formatEther(refundAmount), 'ETH');
    }
  }
}
```

## See Also

- [Flashbots MEV Refunds Documentation](https://docs.flashbots.net/flashbots-protect/mev-refunds)
- [MEV-Share Protocol](https://github.com/flashbots/mev-share)
- [Flashbots Intelligence Guide](./FLASHBOTS_INTELLIGENCE.md)
- [Private RPC Documentation](./PRIVATE_RPC.md)
