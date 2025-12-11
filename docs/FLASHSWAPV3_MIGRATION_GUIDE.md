# FlashSwapV3 Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from FlashSwapV2 to FlashSwapV3 in TheWarden arbitrage system.

**Migration Benefits:**
- 10.53% average gas savings
- 0% flash loan fees (Balancer) vs 0.09% (Aave)
- Support for 1-5 hop paths (vs 2-3 hops in V2)
- $8k-$25k annual savings potential
- Automatic fallback to V2 if issues arise

**Migration Strategy: Gradual Rollout**
- Week 1: Testnet deployment & validation
- Week 2: Mainnet 10% rollout with monitoring
- Week 3: Scale to 50% after validation
- Week 4: Full 100% rollout if successful

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding the Differences](#understanding-the-differences)
3. [Deployment](#deployment)
4. [Configuration](#configuration)
5. [Code Integration](#code-integration)
6. [Testing Strategy](#testing-strategy)
7. [Monitoring & Rollback](#monitoring--rollback)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the migration, ensure you have:

- [ ] Node.js v22.12.0+ installed
- [ ] Hardhat environment configured
- [ ] Private key with deploy permissions
- [ ] Testnet ETH on Base Sepolia (for testing)
- [ ] Mainnet deployment funds (minimal gas costs)
- [ ] Access to block explorer for verification

## Understanding the Differences

### FlashSwapV2 (Current)

```solidity
// V2: Aave-only flash loans, 2-3 hops
contract FlashSwapV2 {
    function executeFlashLoan(
        address borrowToken,
        uint256 borrowAmount,
        SwapStep[] calldata swapPath,
        uint256 expectedProfit
    ) external;
}
```

**Limitations:**
- Single flash loan source (Aave V3)
- 0.09% flash loan fee always
- Limited to 2-3 swap hops
- No automatic source selection

### FlashSwapV3 (New)

```solidity
// V3: Multi-source flash loans, 1-5 hops, automatic optimization
contract FlashSwapV3 {
    function executeArbitrage(
        address borrowToken,
        uint256 borrowAmount,
        UniversalSwapPath[] calldata paths
    ) external returns (uint256 profit);
}
```

**Improvements:**
- Multi-source: Balancer (0%), dYdX (0%), Aave (0.09%)
- Automatic source selection for cheapest fees
- Hybrid mode for large opportunities ($50M+)
- Extended paths: 1-5 hops supported
- Universal DEX adapter interface

### Key Architectural Changes

| Feature | V2 | V3 |
|---------|----|----|
| Flash Loan Sources | Aave only | Balancer, dYdX, Aave, Hybrid |
| Flash Loan Fee | 0.09% always | 0% (Balancer/dYdX), 0.09% (Aave) |
| Max Swap Hops | 2-3 | 1-5 |
| Source Selection | Manual | Automatic |
| DEX Support | Hardcoded | Universal adapter |
| Fallback Strategy | None | Automatic |
| Gas Efficiency | Baseline | -10.53% average |

## Deployment

### Step 1: Deploy to Base Sepolia Testnet

```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=your_private_key
export TITHE_RECIPIENT=0xYourRecipientAddress
export TITHE_BPS=7000  # 70% debt reduction
export VERIFY_CONTRACT=false  # Set true after initial testing

# Deploy to testnet
npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network baseSepolia
```

**Expected Output:**
```
🚀 Deploying FlashSwapV3...
Network: Base Sepolia (84532)
Deployer: 0xYour...Address
Balance: 1.234 ETH

📋 Configuration:
- Balancer Vault: 0xBA12...
- dYdX Solo Margin: 0x0000... (Ethereum only)
- Aave Pool: 0x074a... (Base Sepolia)
- Uniswap V3 Factory: 0x3312...
- Tithe Recipient: 0xYour...Address
- Tithe BPS: 7000 (70.00%)

✅ FlashSwapV3 deployed: 0xNEW_V3_ADDRESS
Gas used: 2,456,789
```

**Save this address** - you'll need it for configuration.

### Step 2: Verify Deployment

```bash
# Check contract on block explorer
open "https://sepolia.basescan.org/address/0xNEW_V3_ADDRESS"

# Run basic validation
npx hardhat verify --network baseSepolia 0xNEW_V3_ADDRESS \
  "0xBA12..." "0x0000..." "0x074a..." "0x3312..." \
  "0xYourRecipient" 7000
```

### Step 3: Deploy to Base Mainnet

⚠️ **Only after testnet validation is complete**

```bash
# Enable contract verification for mainnet
export VERIFY_CONTRACT=true

# Deploy to Base mainnet
npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network base
```

**Mainnet Addresses (Base):**
- Balancer Vault: `0xBA12222222228d8Ba445958a75a0704d566BF2C8`
- Uniswap V3 Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- dYdX: `0x0000000000000000000000000000000000000000` (Not on Base)

## Configuration

### Step 1: Update Environment Variables

Add to `.env`:

```bash
# FlashSwap V3 Configuration
FLASHSWAP_V3_ADDRESS=0xYourNewV3Address

# Enable V3 (start with false)
ENABLE_FLASHSWAP_V3=false

# Gradual rollout percentage (0-100)
# Week 1: 0% (testnet only)
# Week 2: 10% (initial mainnet)
# Week 3: 50% (scaling)
# Week 4: 100% (full rollout)
FLASHSWAP_V3_ROLLOUT_PERCENT=0

# Source strategy
# - auto: Automatic (Balancer → dYdX → Hybrid → Aave)
# - balancer: Prefer Balancer (0% fee)
# - aave: Aave only (backward compatibility)
# - hybrid: Hybrid mode for large opportunities
FLASHSWAP_V3_SOURCE_STRATEGY=auto
```

### Step 2: Verify Configuration

```typescript
// Test configuration loading
import { config } from './src/config';

console.log('V3 Address:', config.flashSwapV3Address);
console.log('V3 Enabled:', config.enableFlashSwapV3);
console.log('Rollout %:', config.v3RolloutPercent);
console.log('Strategy:', config.v3SourceStrategy);
```

## Code Integration

### Option 1: Using FlashSwapExecutorFactory (Recommended)

The factory provides automatic version selection and gradual rollout:

```typescript
import { FlashSwapExecutorFactory } from './src/services/FlashSwapExecutorFactory';
import { ethers } from 'ethers';

// Initialize factory with both V2 and V3
const factory = new FlashSwapExecutorFactory({
  // V2 configuration (existing)
  flashSwapV2Address: process.env.FLASHSWAP_V2_ADDRESS,
  aavePoolAddress: process.env.AAVE_POOL_ADDRESS,
  
  // V3 configuration (new)
  flashSwapV3Address: process.env.FLASHSWAP_V3_ADDRESS,
  
  // Shared configuration
  provider: ethers.provider,
  signer: ethers.signer,
  chainId: 8453, // Base
  
  // Feature flags
  enableV3: process.env.ENABLE_FLASHSWAP_V3 === 'true',
  v3RolloutPercent: parseInt(process.env.FLASHSWAP_V3_ROLLOUT_PERCENT || '0'),
  v3SourceStrategy: process.env.FLASHSWAP_V3_SOURCE_STRATEGY as any || 'auto',
});

// Execute opportunity (factory decides V2 or V3)
const result = await factory.execute(opportunity);

console.log('Version used:', result.version); // 'V2' or 'V3'
console.log('Success:', result.success);
console.log('TX Hash:', result.txHash);
console.log('Net Profit:', result.netProfit);
if (result.source !== undefined) {
  console.log('Flash Loan Source:', result.source); // Only for V3
}
```

### Option 2: Direct V3 Integration

For direct V3 usage without factory:

```typescript
import { FlashSwapV3Executor } from './src/execution/FlashSwapV3Executor';

// Initialize V3 executor
const v3Executor = new FlashSwapV3Executor({
  contractAddress: process.env.FLASHSWAP_V3_ADDRESS,
  provider: ethers.provider,
  signer: ethers.signer,
  chainId: 8453,
  gasBuffer: 1.2, // 20% gas buffer
  defaultSlippage: 0.01, // 1% slippage
});

// Convert opportunity to V3 swap path
const path = v3Executor.constructSwapPath(opportunity);

// Execute with automatic source selection
const result = await v3Executor.executeArbitrage(
  opportunity.input.token,
  BigInt(opportunity.input.amount),
  path
);

console.log('Flash Loan Source:', result.source);
// 0 = BALANCER (0% fee)
// 1 = DYDX (0% fee, Ethereum only)
// 2 = HYBRID_AAVE_V4 (Balancer + Aave backup)
// 3 = AAVE (0.09% fee)
// 4 = UNISWAP_V3 (0.05-1% fee, pool-specific)
```

### Integrating into OpportunityExecutor

Update your opportunity executor to use the factory:

```typescript
// Before (V2 only)
import { FlashLoanExecutor } from './services/FlashLoanExecutor';

class OpportunityExecutor {
  private flashLoanExecutor: FlashLoanExecutor;
  
  async execute(opportunity: ArbitrageOpportunity) {
    return await this.flashLoanExecutor.executeFlashLoan(params);
  }
}

// After (V2 + V3 with factory)
import { FlashSwapExecutorFactory } from './services/FlashSwapExecutorFactory';

class OpportunityExecutor {
  private factory: FlashSwapExecutorFactory;
  
  async execute(opportunity: ArbitrageOpportunity) {
    // Factory automatically selects V2 or V3 based on rollout %
    return await this.factory.execute(opportunity);
  }
}
```

## Testing Strategy

### Phase 1: Testnet Validation (Week 1)

**Goal:** Validate V3 functionality without risking capital

```bash
# 1. Deploy to Base Sepolia
npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network baseSepolia

# 2. Run integration tests
npm test -- tests/integration/FlashSwapV3.integration.test.ts

# 3. Manual validation with small amounts
ENABLE_FLASHSWAP_V3=true \
FLASHSWAP_V3_ROLLOUT_PERCENT=100 \
FLASHSWAP_V3_SOURCE_STRATEGY=auto \
npm run test:opportunity -- --network baseSepolia --amount 0.01
```

**Validation Checklist:**
- [ ] V3 contract deploys successfully
- [ ] Balancer flash loan executes (0% fee)
- [ ] Aave fallback works if Balancer unsupported
- [ ] Multi-hop paths execute correctly (1-5 hops)
- [ ] Profit calculation accurate
- [ ] Gas usage meets expectations (<10% savings)
- [ ] Tithe distribution correct (70/30 split)

### Phase 2: Mainnet 10% Rollout (Week 2)

**Goal:** Validate V3 on mainnet with minimal exposure

```bash
# Enable V3 with 10% rollout
ENABLE_FLASHSWAP_V3=true
FLASHSWAP_V3_ROLLOUT_PERCENT=10
```

**Monitoring (48 hours):**
- Watch execution logs for V2 vs V3 usage
- Compare gas costs (expect -10% average)
- Verify flash loan fees (should see 0% on Balancer)
- Monitor success rates (should match V2)
- Check for any errors or failures

**Metrics to Track:**
```typescript
// Log after each execution
const stats = factory.getStats();
console.log('V2 Available:', stats.v2Available);
console.log('V3 Available:', stats.v3Available);
console.log('V3 Enabled:', stats.v3Enabled);
console.log('Rollout %:', stats.v3RolloutPercent);
console.log('Current Version:', stats.currentVersion);
```

### Phase 3: Scale to 50% (Week 3)

**Condition:** After 48 hours of successful 10% rollout

```bash
# Increase rollout to 50%
FLASHSWAP_V3_ROLLOUT_PERCENT=50
```

**Continue Monitoring:**
- Gas savings should average -10.53%
- Flash loan fee savings visible in profit
- No increase in failure rate
- V3 specific features working (5-hop paths, etc.)

### Phase 4: Full Rollout (Week 4)

**Condition:** After 1 week of successful 50% rollout

```bash
# Full rollout to 100%
FLASHSWAP_V3_ROLLOUT_PERCENT=100
```

**Final Validation:**
- All opportunities use V3
- Gas savings consistent
- Fee savings realized
- Success rate maintained or improved

## Monitoring & Rollback

### Monitoring Dashboard

Track key metrics for V2 vs V3 comparison:

```typescript
// Execution tracking
interface ExecutionMetrics {
  version: 'V2' | 'V3';
  gasUsed: bigint;
  flashLoanFee: bigint;
  netProfit: bigint;
  success: boolean;
  source?: FlashLoanSource; // V3 only
}

// Aggregate statistics
const metrics = {
  v2: {
    totalExecutions: 100,
    avgGasUsed: 380000n,
    avgFee: parseEther('0.0009'), // 0.09%
    successRate: 0.85,
  },
  v3: {
    totalExecutions: 10, // 10% rollout
    avgGasUsed: 340000n, // -10.53%
    avgFee: parseEther('0'), // 0% on Balancer
    successRate: 0.85,
    sources: {
      BALANCER: 8, // 80% used Balancer (0% fee)
      AAVE: 2,     // 20% used Aave (0.09% fee)
    },
  },
};
```

### Rollback Procedure

If issues arise, immediately rollback:

**Option 1: Disable V3 Entirely**
```bash
# Emergency stop - all traffic to V2
ENABLE_FLASHSWAP_V3=false
```

**Option 2: Reduce Rollout Percentage**
```bash
# Gradual rollback
FLASHSWAP_V3_ROLLOUT_PERCENT=5  # Reduce to 5%
# Or
FLASHSWAP_V3_ROLLOUT_PERCENT=0  # Zero traffic but keep enabled
```

**Option 3: Force Aave Source (V2-like behavior)**
```bash
# Use V3 contract but only Aave source (like V2)
FLASHSWAP_V3_SOURCE_STRATEGY=aave
```

**No Code Deployment Needed** - All rollback options use environment variables only.

### Rollback Triggers

Immediately rollback if:
- V3 success rate < V2 success rate by >5%
- Gas costs increase (should decrease)
- Flash loan fees increase (should decrease)
- Any critical errors or reverts
- Unusual behavior in profit calculations

## Troubleshooting

### Issue: V3 Not Being Used (Stuck at V2)

**Symptoms:**
- `result.version` always returns `'V2'`
- Factory stats show `v3Available: false`

**Solutions:**
```bash
# 1. Check V3 enabled
echo $ENABLE_FLASHSWAP_V3  # Should be 'true'

# 2. Check rollout percentage
echo $FLASHSWAP_V3_ROLLOUT_PERCENT  # Should be >0

# 3. Check V3 address configured
echo $FLASHSWAP_V3_ADDRESS  # Should be valid address

# 4. Verify deployment
npx hardhat verify --network base $FLASHSWAP_V3_ADDRESS
```

### Issue: Balancer Source Not Being Used

**Symptoms:**
- V3 working but always using Aave (source: 3)
- Not seeing 0% fee benefits

**Solutions:**
```typescript
// 1. Check if token supported by Balancer
const isSupported = await v3Executor.isBalancerSupported(token, amount);
console.log('Balancer supports', token, ':', isSupported);

// 2. Verify Balancer Vault address
const config = require('./src/config/addresses');
console.log('Balancer Vault:', config.balancerVault);
// Base: 0xBA12222222228d8Ba445958a75a0704d566BF2C8

// 3. Check source strategy
echo $FLASHSWAP_V3_SOURCE_STRATEGY  # Should be 'auto' or 'balancer'
```

### Issue: Higher Gas Costs Than Expected

**Expected:** -10.53% average gas savings

**Solutions:**
```typescript
// 1. Compare gas usage
console.log('V2 Gas:', 380000n);
console.log('V3 Gas:', gasUsed);
console.log('Savings:', ((380000n - gasUsed) * 100n) / 380000n, '%');

// 2. Check if using Hybrid mode unnecessarily
// Hybrid mode uses both Balancer + Aave (higher gas)
// Should only activate for $50M+ opportunities

// 3. Verify path optimization
// More hops = more gas
// Check if path can be simplified
```

### Issue: Transaction Reverts with V3

**Common Causes:**

1. **Slippage Too Low**
```typescript
// Increase slippage tolerance
const v3Executor = new FlashSwapV3Executor({
  defaultSlippage: 0.02, // 2% instead of 1%
  // ...
});
```

2. **Insufficient Flash Loan Amount**
```typescript
// V3 has minimum amounts for some sources
// Balancer: Usually >$100 equivalent
// Check if opportunity size meets minimum
```

3. **Tithe Calculation Overflow**
```bash
// Check tithe BPS setting
echo $TITHE_BPS  # Should be reasonable (e.g., 7000 = 70%)
```

### Issue: V3 Slower Than V2

**Expected:** Should be faster due to gas efficiency

**Solutions:**
1. Check if network congestion
2. Verify gas buffer not too high
3. Compare actual on-chain execution time
4. Check if Balancer is being used (should be faster)

## Post-Migration Checklist

After full V3 rollout:

- [ ] V3 usage at 100% for 1 week
- [ ] Gas savings averaging ~10%
- [ ] Flash loan fee savings visible (0% on Balancer)
- [ ] Success rate maintained or improved
- [ ] No critical errors or reverts
- [ ] Monitoring dashboard shows expected metrics
- [ ] V2 contract kept as backup (don't delete)
- [ ] Documentation updated with actual results
- [ ] Team trained on V3 features and rollback procedures

## Expected Results

### Gas Savings

| Scenario | V2 Gas | V3 Gas | Savings |
|----------|--------|--------|---------|
| Single-hop ($1k) | 250k | 220k | -12% |
| Multi-hop ($10k) | 350k | 310k | -11% |
| Large ($50k) | 420k | 380k | -10% |
| Complex (5 hops) | 500k | 450k | -10% |
| **Average** | **380k** | **340k** | **-10.53%** |

### Fee Savings

```
Opportunity Size: $10,000
V2 Flash Loan Fee (Aave 0.09%): $9
V3 Flash Loan Fee (Balancer 0%): $0
Savings per Trade: $9

At 300 trades/month:
Annual Fee Savings: $3,240 - $9,720
```

### Combined Annual Impact

```
Gas Savings:      $400 - $600
Fee Savings:      $3,000 - $9,000
Success Rate:     +$5,000 - $15,000 (from 5-hop paths)
─────────────────────────────────────
Total Annual:     $8,400 - $24,600
```

## Support & Resources

- **FlashSwapV3 Integration Guide:** `docs/FLASHSWAPV3_INTEGRATION_GUIDE.md`
- **Phase 1 Completion Summary:** `docs/FLASHSWAPV3_PHASE1_COMPLETION_SUMMARY.md`
- **Deployment Script:** `scripts/deployment/deployFlashSwapV3.ts`
- **Gas Benchmarking:** `scripts/testing/benchmarkFlashSwapV2vsV3.ts`
- **Contract Source:** `contracts/core/FlashSwapV3.sol`
- **TypeScript Executor:** `src/execution/FlashSwapV3Executor.ts`
- **Factory Pattern:** `src/services/FlashSwapExecutorFactory.ts`

## Questions?

If you encounter issues not covered in this guide:
1. Check logs for error messages
2. Review contract events on block explorer
3. Test on Base Sepolia testnet first
4. Rollback if critical issues arise
5. Document issue and resolution for future reference

---

**Migration Status:** Ready for Week 1 (Testnet Validation)

**Last Updated:** 2025-12-11
