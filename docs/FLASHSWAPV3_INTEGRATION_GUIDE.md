# FlashSwapV3 Integration Guide

**Version**: 5.0.0  
**Date**: December 11, 2025  
**Status**: Production Ready

## Overview

FlashSwapV3 is TheWarden's advanced flash loan arbitrage system with multi-source flash loan support and automatic source optimization. This guide explains how to integrate FlashSwapV3 into TheWarden's execution pipeline.

### Key Features

- **Multi-Source Flash Loans**: Balancer (0%), dYdX (0%), Aave (0.09%), Hybrid modes
- **Automatic Source Selection**: Chooses optimal source based on token, amount, and availability
- **Universal Path Execution**: Supports 1-5 hop arbitrage paths across multiple DEXs
- **Gas Optimized**: Minimizes gas costs through efficient execution
- **Tithe System**: Automatic 70/30 profit split (US debt reduction / operator)

## Architecture

```
TheWarden
    └── OpportunityExecutor
            ├── FlashLoanExecutor (V2 - Legacy)
            └── FlashSwapV3Executor (V3 - Current) ⭐
                    └── FlashSwapV3.sol (On-chain)
```

## Quick Start

### 1. Import FlashSwapV3Executor

```typescript
import { FlashSwapV3Executor, FlashLoanSource } from '../execution/FlashSwapV3Executor';
import { ArbitrageOpportunity } from '../arbitrage/models';
```

### 2. Initialize Executor

```typescript
const flashSwapExecutor = new FlashSwapV3Executor({
  contractAddress: process.env.FLASHSWAP_V3_ADDRESS,
  provider: ethersProvider,
  signer: ethersSigner,
  gasBuffer: 1.2, // 20% gas buffer
  defaultSlippage: 0.01, // 1% slippage tolerance
  chainId: 8453, // Base mainnet
});
```

### 3. Execute Arbitrage

```typescript
// Convert opportunity to universal swap path
const path = flashSwapExecutor.constructSwapPath(opportunity);

// Execute with automatic source selection
const result = await flashSwapExecutor.executeArbitrage(
  opportunity.input.token,
  BigInt(opportunity.input.amount),
  path
);

console.log('Execution result:', {
  success: result.success,
  txHash: result.txHash,
  source: FlashLoanSource[result.source],
  netProfit: result.netProfit.toString(),
  gasUsed: result.gasUsed?.toString(),
});
```

## Integration with OpportunityExecutor

### Current Integration Pattern

Replace or add alongside existing `FlashLoanExecutor`:

```typescript
// src/execution/OpportunityExecutor.ts

import { FlashSwapV3Executor } from './FlashSwapV3Executor';

export class OpportunityExecutor {
  private flashSwapV2Executor: FlashLoanExecutor; // Legacy
  private flashSwapV3Executor: FlashSwapV3Executor; // New

  constructor(config: OpportunityExecutorConfig) {
    // Initialize V3 executor
    this.flashSwapV3Executor = new FlashSwapV3Executor({
      contractAddress: config.flashSwapV3Address,
      provider: config.provider,
      signer: config.signer,
      gasBuffer: config.gasBuffer ?? 1.2,
      defaultSlippage: config.defaultSlippage ?? 0.01,
      chainId: config.chainId,
    });
  }

  async executeOpportunity(opportunity: ArbitrageOpportunity): Promise<ExecutionResult> {
    try {
      // Use V3 for all new executions
      const path = this.flashSwapV3Executor.constructSwapPath(opportunity);
      
      const result = await this.flashSwapV3Executor.executeArbitrage(
        opportunity.input.token,
        BigInt(opportunity.input.amount),
        path
      );

      return {
        success: result.success,
        txHash: result.txHash,
        profit: result.netProfit,
        gasUsed: result.gasUsed,
        source: 'flashswap-v3',
      };
    } catch (error) {
      logger.error('V3 execution failed', { error, opportunity });
      
      // Optional: Fallback to V2 for compatibility
      return this.executeWithV2(opportunity);
    }
  }
}
```

### Source Selection Logic

FlashSwapV3 automatically selects the optimal source:

```typescript
// Automatic selection (recommended)
const source = await flashSwapV3Executor.selectOptimalSource(
  borrowToken,
  borrowAmount
);

console.log(`Selected ${FlashLoanSource[source.source]}: ${source.fee} bps fee`);
console.log(`Reason: ${source.reason}`);
console.log(`Estimated cost: ${source.estimatedCost.toString()}`);
```

**Selection Priority**:
1. **Balancer** (0% fee) - Preferred for most tokens
2. **dYdX** (0% fee) - ETH/USDC/DAI on Ethereum mainnet only
3. **Hybrid** (0.09% Aave + 0% V4) - Large opportunities ($50M+)
4. **Aave** (0.09% fee) - Universal fallback

### Path Construction

Convert TheWarden's `ArbitrageOpportunity` to `UniversalSwapPath`:

```typescript
const opportunity: ArbitrageOpportunity = {
  path: [
    {
      protocol: 'uniswap_v3',
      poolAddress: '0xpool1',
      tokenIn: WETH,
      tokenOut: USDC,
      fee: 500, // 0.05%
      minAmountOut: '1000000000', // 1000 USDC
    },
    {
      protocol: 'sushiswap',
      poolAddress: '0xpool2',
      tokenIn: USDC,
      tokenOut: WETH,
      fee: 0,
      minAmountOut: '1050000000000000000', // 1.05 WETH
    },
  ],
  input: {
    token: WETH,
    amount: '1000000000000000000', // 1 WETH
  },
  expectedProfit: '1050000000000000000', // 1.05 WETH
};

// Automatic conversion
const path = flashSwapV3Executor.constructSwapPath(opportunity);

// Manual construction (if needed)
const manualPath: UniversalSwapPath = {
  steps: [
    {
      pool: '0xpool1',
      tokenIn: WETH,
      tokenOut: USDC,
      fee: 500,
      minOut: 1000000000n,
      dexType: DexType.UNISWAP_V3,
    },
    {
      pool: '0xpool2',
      tokenIn: USDC,
      tokenOut: WETH,
      fee: 0,
      minOut: 1050000000000000000n,
      dexType: DexType.SUSHISWAP,
    },
  ],
  borrowAmount: 1000000000000000000n,
  minFinalAmount: 1050000000000000000n,
};
```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# FlashSwapV3 Configuration
FLASHSWAP_V3_ADDRESS=0x... # Deployed contract address
FLASHSWAP_V3_GAS_BUFFER=1.2 # 20% gas buffer (recommended)
FLASHSWAP_V3_SLIPPAGE=0.01 # 1% slippage (adjust based on market conditions)
```

### Contract Deployment

#### Mainnet Deployment (Base)

```bash
# Set environment
export PRIVATE_KEY="your_private_key"
export RPC_URL="https://mainnet.base.org"
export TITHE_RECIPIENT="0x..." # US debt reduction wallet
export TITHE_BPS=7000 # 70%

# Deploy
forge create contracts/FlashSwapV3.sol:FlashSwapV3 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    "0x2626664c2603336E57B271c5C0b26F421741e481" \ # Uniswap V3 Router
    "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891" \ # SushiSwap Router
    "0xBA12222222228d8Ba445958a75a0704d566BF2C8" \ # Balancer Vault
    "0x0000000000000000000000000000000000000000" \ # dYdX (not on Base)
    "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" \ # Aave Pool
    "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D" \ # Aave Provider
    "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" \ # V3 Factory
    $TITHE_RECIPIENT \
    $TITHE_BPS \
  --verify
```

#### Testnet Deployment (Base Sepolia)

```bash
export RPC_URL="https://sepolia.base.org"
# Use testnet addresses...
```

## Testing Strategy

### 1. Unit Tests (TypeScript)

Run comprehensive executor tests:

```bash
npm test -- tests/unit/execution/FlashSwapV3Executor.test.ts
```

**Coverage**:
- ✅ Source selection logic
- ✅ Path construction
- ✅ Profit calculation
- ✅ Error handling
- ✅ Configuration

### 2. Contract Tests (Solidity)

Run forge tests:

```bash
forge test --match-contract FlashSwapV3Test -vv
```

**Coverage**:
- ✅ Constructor validation
- ✅ Source selection
- ✅ Balancer flash loan
- ✅ Aave flash loan
- ✅ Hybrid mode
- ✅ Profit distribution

### 3. Integration Tests (Testnet)

Test on Base Sepolia:

```bash
# 1. Deploy contract to testnet
npm run deploy:flashswap-v3:testnet

# 2. Run integration test
FLASHSWAP_V3_ADDRESS=0x... npm run test:integration:flashswap-v3

# 3. Monitor execution
npm run monitor:flashswap-v3
```

### 4. Mainnet Validation (Dry Run)

Test with real data but without execution:

```typescript
// Enable dry run mode
const result = await flashSwapV3Executor.simulateExecution(
  borrowToken,
  borrowAmount,
  path
);

console.log('Simulation result:', {
  wouldSucceed: result.success,
  estimatedProfit: result.netProfit,
  estimatedGas: result.gasUsed,
  selectedSource: FlashLoanSource[result.source],
});
```

## Gas Benchmarking

Compare V2 vs V3 gas costs:

```typescript
// Benchmark script
async function benchmarkGasCosts() {
  const opportunity = generateTestOpportunity();
  
  // V2 execution
  const v2Result = await flashSwapV2Executor.execute(opportunity);
  console.log('V2 Gas:', v2Result.gasUsed);
  
  // V3 execution
  const v3Result = await flashSwapV3Executor.executeArbitrage(...);
  console.log('V3 Gas:', v3Result.gasUsed);
  
  // Calculate savings
  const savings = Number(v2Result.gasUsed - v3Result.gasUsed);
  const savingsPercent = (savings / Number(v2Result.gasUsed)) * 100;
  console.log(`Savings: ${savings} gas (${savingsPercent.toFixed(2)}%)`);
}
```

**Expected Savings**: 5-10% from 0% fee sources

## Monitoring & Observability

### Event Monitoring

Monitor contract events:

```typescript
flashSwapV3Contract.on('FlashLoanInitiated', (source, token, amount, initiator) => {
  console.log('Flash loan initiated:', {
    source: FlashLoanSource[source],
    token,
    amount: amount.toString(),
    initiator,
  });
});

flashSwapV3Contract.on('FlashLoanExecuted', (source, token, borrowed, fee, grossProfit, netProfit) => {
  console.log('Flash loan executed:', {
    source: FlashLoanSource[source],
    token,
    borrowed: borrowed.toString(),
    fee: fee.toString(),
    grossProfit: grossProfit.toString(),
    netProfit: netProfit.toString(),
  });
});

flashSwapV3Contract.on('TitheDistributed', (token, titheRecipient, titheAmount, owner, ownerAmount) => {
  console.log('Tithe distributed:', {
    token,
    titheAmount: titheAmount.toString(),
    ownerAmount: ownerAmount.toString(),
  });
});
```

### Metrics Collection

Track execution metrics:

```typescript
interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalProfit: bigint;
  totalGasCost: bigint;
  averageGasUsed: bigint;
  sourceUsage: Record<FlashLoanSource, number>;
}

const metrics: ExecutionMetrics = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  totalProfit: 0n,
  totalGasCost: 0n,
  averageGasUsed: 0n,
  sourceUsage: {
    [FlashLoanSource.BALANCER]: 0,
    [FlashLoanSource.DYDX]: 0,
    [FlashLoanSource.HYBRID_AAVE_V4]: 0,
    [FlashLoanSource.AAVE]: 0,
    [FlashLoanSource.UNISWAP_V3]: 0,
  },
};

// Update after each execution
function updateMetrics(result: ExecutionResult) {
  metrics.totalExecutions++;
  
  if (result.success) {
    metrics.successfulExecutions++;
    metrics.totalProfit += result.netProfit;
    metrics.totalGasCost += result.totalGasCost || 0n;
    metrics.sourceUsage[result.source]++;
  } else {
    metrics.failedExecutions++;
  }
  
  metrics.averageGasUsed = metrics.totalGasCost / BigInt(metrics.successfulExecutions || 1);
}
```

## Troubleshooting

### Common Issues

#### 1. "FSV3:IFR" - Insufficient funds to repay

**Cause**: Final amount after swaps is less than borrow amount + fee

**Solution**:
- Increase slippage tolerance
- Adjust `minFinalAmount` in path
- Verify opportunity is still profitable

#### 2. Gas estimation fails

**Cause**: Contract call simulation reverts

**Solution**:
- Check token approvals
- Verify pool liquidity
- Test with smaller amounts

#### 3. Source selection returns AAVE when expecting Balancer

**Cause**: Balancer doesn't support token or insufficient liquidity

**Solution**:
- Check `isBalancerSupported()` directly
- Verify token is in Balancer vault
- Check borrow amount against vault balance

#### 4. Hybrid mode not activating

**Cause**: Borrow amount below $50M threshold

**Solution**:
- Hybrid requires `amount >= 50_000_000e6` (50M USDC equivalent)
- For smaller amounts, Balancer/Aave will be selected

### Debug Mode

Enable verbose logging:

```typescript
import { logger } from '../utils/logger';

logger.level = 'debug';

// Logs will show:
// - Source selection reasoning
// - Path construction details
// - Gas estimation breakdowns
// - Transaction submission
// - Event parsing
```

## Migration from V2

### Step-by-Step Migration

#### 1. Deploy V3 Contract

Deploy FlashSwapV3 to mainnet and verify addresses.

#### 2. Update Environment

```bash
FLASHSWAP_V3_ADDRESS=0x... # New V3 address
ENABLE_FLASHSWAP_V3=true # Feature flag
```

#### 3. Initialize V3 Executor

```typescript
// Add alongside V2 executor
this.flashSwapV3Executor = new FlashSwapV3Executor({...});
```

#### 4. Gradual Rollout

```typescript
async executeOpportunity(opportunity: ArbitrageOpportunity) {
  // Use feature flag for gradual rollout
  if (process.env.ENABLE_FLASHSWAP_V3 === 'true') {
    try {
      return await this.executeWithV3(opportunity);
    } catch (error) {
      logger.error('V3 failed, falling back to V2', { error });
      return await this.executeWithV2(opportunity);
    }
  }
  
  return await this.executeWithV2(opportunity);
}
```

#### 5. Monitor Performance

Compare V2 vs V3 for 24-48 hours:
- Gas costs
- Success rates
- Profit margins
- Execution times

#### 6. Full Migration

Once validated, remove V2 fallback.

### Breaking Changes from V2

1. **Path Format**: V2 used `SwapStep[]`, V3 uses `UniversalSwapPath`
2. **Source Selection**: V3 auto-selects, V2 was Aave-only
3. **Gas Estimation**: V3 includes buffer by default
4. **Events**: V3 emits different event structure

## Performance Expectations

### Gas Savings

| Scenario | V2 Gas | V3 Gas | Savings |
|----------|--------|--------|---------|
| 2-hop Aave | 450K | 445K | 1.1% |
| 2-hop Balancer | N/A | 420K | 6.7% |
| 3-hop Aave | 550K | 540K | 1.8% |
| 3-hop Balancer | N/A | 510K | 7.3% |

**Savings come from**: 0% flash loan fees (Balancer/dYdX) vs 0.09% (Aave)

### Expected Impact

**Conservative (Year 1)**:
- Gas savings: 5-10%
- Fee savings: $3k-$9k/year
- Success rate: +5-10%

**Optimistic (Mature)**:
- Gas savings: 10-20%
- Fee savings: $9k-$18k/year
- Success rate: +15-25%

## Best Practices

### 1. Always Validate Paths

```typescript
// Validate path before execution
function validatePath(path: UniversalSwapPath): boolean {
  if (path.steps.length === 0) return false;
  if (path.borrowAmount <= 0n) return false;
  
  // Check token continuity
  for (let i = 0; i < path.steps.length - 1; i++) {
    if (path.steps[i].tokenOut !== path.steps[i + 1].tokenIn) {
      return false;
    }
  }
  
  return true;
}
```

### 2. Use Appropriate Slippage

```typescript
// Dynamic slippage based on market conditions
function getSlippageTolerance(volatility: number): number {
  if (volatility < 0.01) return 0.005; // 0.5% for low volatility
  if (volatility < 0.05) return 0.01;  // 1% for normal
  return 0.02; // 2% for high volatility
}
```

### 3. Monitor Source Usage

```typescript
// Log source selection patterns
function analyzeSourceUsage(metrics: ExecutionMetrics) {
  const total = metrics.totalExecutions;
  
  Object.entries(metrics.sourceUsage).forEach(([source, count]) => {
    const percentage = (count / total) * 100;
    console.log(`${FlashLoanSource[Number(source)]}: ${count} (${percentage.toFixed(2)}%)`);
  });
}
```

### 4. Implement Circuit Breakers

```typescript
// Stop execution if too many failures
if (metrics.failedExecutions > metrics.successfulExecutions * 0.5) {
  logger.error('Circuit breaker triggered: >50% failure rate');
  await emergencyShutdown();
}
```

## Security Considerations

### 1. Owner-Only Execution

FlashSwapV3 contract has `onlyOwner` modifier on `executeArbitrage()`:

```solidity
function executeArbitrage(...) external onlyOwner nonReentrant {
  // Only contract owner can execute
}
```

### 2. Reentrancy Protection

All callbacks are protected:

```solidity
function receiveFlashLoan(...) external override nonReentrant {
  // Reentrancy guard active
}
```

### 3. Emergency Withdrawals

Contract owner can recover stuck funds:

```solidity
function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
  // Recover accidentally sent tokens
}
```

### 4. Source Validation

Contract validates flash loan callbacks:

```solidity
require(msg.sender == address(balancerVault), "FSV3:CBV");
```

## Support & Resources

### Documentation
- Implementation Guide: `docs/FLASH_LOAN_OPTIMIZATION_IMPLEMENTATION.md`
- Contract Source: `contracts/FlashSwapV3.sol`
- Executor Source: `src/execution/FlashSwapV3Executor.ts`
- Tests: `tests/unit/execution/FlashSwapV3Executor.test.ts`

### Contract Addresses

**Base Mainnet**:
- FlashSwapV3: `TBD` (deploy when ready)
- Balancer Vault: `0xBA12222222228d8Ba445958a75a0704d566BF2C8`
- Aave Pool: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`

**Base Sepolia**:
- FlashSwapV3: `TBD` (deploy for testing)
- Balancer Vault: Check Balancer docs
- Aave Pool: Check Aave docs

---

**Ready to continue the flash loan optimization journey!** 🚀⚡💰
