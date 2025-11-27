# AxionCitadel TypeScript Integration Guide

## Overview

This document provides a comprehensive guide for the TypeScript components migrated from AxionCitadel, focusing on transaction management and flash swap arbitrage execution.

**Integration Date**: 2025-11-08  
**Source**: https://github.com/metalxalloy/AxionCitadel  
**Status**: Phase 1 Complete (TransactionManager + FlashSwapExecutor)

---

## Components

### 1. TransactionManager

**Location**: `src/execution/TransactionManager.ts`

Production-tested transaction management with comprehensive error handling and retry logic.

#### Features

- **Automatic Nonce Tracking**: Integrates with `NonceManager` for synchronized nonce management
- **Retry Logic**: Exponential backoff with configurable retry attempts
- **Gas Spike Protection**: Detects and rejects transactions during gas price spikes
- **Transaction Replacement**: Replace stuck transactions with higher gas prices
- **Reorg Detection**: Monitors for chain reorganizations
- **Error Recovery**: Handles nonce errors, network failures, and reverted transactions

#### Usage

```typescript
import { TransactionManager } from './execution/TransactionManager';
import { NonceManager } from './execution/NonceManager';
import { ethers } from 'ethers';

// Setup
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const nonceManager = await NonceManager.create(wallet);

// Initialize TransactionManager
const txManager = new TransactionManager(
  provider,
  nonceManager,
  {
    maxRetries: 3,
    initialDelay: 2000,  // 2 seconds
    maxDelay: 30000,     // 30 seconds
    backoffMultiplier: 2,
    gasPriceIncrement: 1.1,  // 10% increase per retry
  },
  {
    maxGasPrice: 500,  // 500 Gwei maximum
    spikeThreshold: 50,  // 50% increase threshold
    checkWindow: 60000,  // 1 minute window
  }
);

// Execute transaction
const result = await txManager.executeTransaction(
  '0xTargetContract',
  '0x1234...', // calldata
  {
    gasLimit: ethers.BigNumber.from('150000'),
    gasPrice: ethers.utils.parseUnits('50', 'gwei'),
  }
);

if (result.success) {
  console.log('Transaction confirmed:', result.txHash);
  console.log('Gas used:', result.receipt?.gasUsed.toString());
} else {
  console.error('Transaction failed:', result.error);
}

// Get statistics
const stats = txManager.getStatistics();
console.log('Success rate:', stats.successRate, '%');
```

#### Configuration Options

**RetryConfig**:
```typescript
{
  maxRetries: number;          // Maximum retry attempts (default: 3)
  initialDelay: number;        // Initial delay in ms (default: 2000)
  maxDelay: number;            // Maximum delay in ms (default: 30000)
  backoffMultiplier: number;   // Backoff multiplier (default: 2)
  gasPriceIncrement: number;   // Gas price increase factor (default: 1.1)
}
```

**GasSpikeConfig**:
```typescript
{
  maxGasPrice: number;         // Maximum gas price in Gwei (default: 500)
  spikeThreshold: number;      // Spike detection threshold % (default: 50)
  checkWindow: number;         // Check window in ms (default: 60000)
}
```

#### Advanced Features

**Replace Stuck Transaction**:
```typescript
// If a transaction is stuck
const txId = result.metadata.id;

// Replace with higher gas price
const replaceResult = await txManager.replaceTransaction(
  txId,
  ethers.utils.parseUnits('100', 'gwei')  // New gas price
);
```

**Track Transaction Status**:
```typescript
const status = txManager.getTransactionStatus(txId);
console.log('State:', status?.state);
console.log('Attempts:', status?.attempts);
console.log('Gas price:', status?.gasPrice);
```

---

### 2. FlashSwapExecutor

**Location**: `src/execution/FlashSwapExecutor.ts`

Executes arbitrage opportunities using flash swaps and flash loans.

#### Features

- **Multi-Protocol Support**: Uniswap V2/V3, SushiSwap, Camelot
- **Parameter Validation**: Comprehensive checks before execution
- **Gas Estimation**: Automatic gas estimation with configurable buffer
- **Slippage Protection**: Minimum output amounts with slippage tolerance
- **Flash Loan Integration**: Aave V3 and Uniswap V3 flash loans
- **Dry Run Mode**: Test execution without sending transactions

#### Usage

```typescript
import { FlashSwapExecutor } from './execution/FlashSwapExecutor';
import { ArbitrageOpportunity } from './arbitrage/models';
import { ethers } from 'ethers';

// Setup
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize executor
const executor = new FlashSwapExecutor({
  contractAddress: '0xFlashSwapContract',
  provider,
  signer: wallet,
  gasBuffer: 1.2,           // 20% gas buffer
  defaultSlippage: 0.01,    // 1% slippage
});

// Build arbitrage parameters from opportunity
const arbParams = executor.buildArbParams(opportunity, 0.02);  // 2% slippage

// Validate parameters
const validation = executor.validateArbParams(arbParams);
if (!validation.isValid) {
  console.error('Validation failed:', validation.errorMessage);
  return;
}

// Dry run (test without execution)
const dryRunResult = await executor.executeArbitrage(
  arbParams,
  undefined,
  true  // dry run
);

console.log('Dry run result:', dryRunResult);
console.log('Expected profit:', ethers.utils.formatEther(dryRunResult.expectedProfit!));

// Execute actual arbitrage
const result = await executor.executeArbitrage(
  arbParams,
  ethers.utils.parseUnits('50', 'gwei')  // gas price
);

if (result.success) {
  console.log('Arbitrage executed:', result.txHash);
  console.log('Gas used:', result.gasLimit);
} else {
  console.error('Execution failed:', result.error);
}

// Get statistics
const stats = executor.getExecutionStats();
console.log('Success rate:', stats.successRate, '%');
console.log('Total profit:', stats.totalProfit, 'ETH');
```

#### Parameter Building

**From ArbitrageOpportunity**:
```typescript
const opportunity: ArbitrageOpportunity = {
  opportunityId: 'opp-123',
  arbType: ArbitrageType.TRIANGULAR,
  path: [
    {
      step: 0,
      poolAddress: '0xPool1',
      protocol: 'uniswap_v3',
      tokenIn: '0xWETH',
      tokenOut: '0xUSDC',
      amountIn: 1,
      expectedOutput: 2000,
      feeBps: 30,
    },
    // ... more steps
  ],
  inputAmount: 1,
  requiresFlashLoan: true,
  flashLoanAmount: 1,
  flashLoanToken: '0xWETH',
  flashLoanPool: '0xAavePool',
};

const arbParams = executor.buildArbParams(opportunity);
```

**Manual Construction**:
```typescript
import { ArbParams, SwapProtocol } from './execution/FlashSwapExecutor';

const arbParams: ArbParams = {
  flashLoanAmount: ethers.utils.parseEther('1'),
  flashLoanToken: '0xWETH',
  flashLoanPool: '0xAavePool',
  swapSteps: [
    {
      poolAddress: '0xPool1',
      tokenIn: '0xWETH',
      tokenOut: '0xUSDC',
      amountIn: ethers.utils.parseEther('1'),
      minAmountOut: ethers.utils.parseEther('1980'),  // 1% slippage
      protocol: SwapProtocol.UNISWAP_V3,
    },
  ],
  expectedProfit: ethers.utils.parseEther('0.01'),
  deadline: Math.floor(Date.now() / 1000) + 300,  // 5 minutes
};
```

#### Validation

The executor performs comprehensive validation:

1. **Flash Loan Checks**:
   - Positive loan amount
   - Valid token address
   - Valid pool address

2. **Swap Step Checks**:
   - At least one swap step
   - Valid pool addresses
   - Positive amounts
   - Token continuity (output of step N matches input of step N+1)

3. **Profit and Deadline**:
   - Positive expected profit
   - Future deadline

#### Gas Estimation

```typescript
const gasEstimate = executor.estimateGas(arbParams);
console.log('Estimated gas:', gasEstimate);

// Gas is calculated as:
// base (100k) + flash loan (150k) + swaps (120k each) × buffer (1.2x)
```

#### Flash Loan Fees

```typescript
import { FlashSwapExecutor } from './execution/FlashSwapExecutor';

// Calculate Aave fee (0.09%)
const aaveFee = FlashSwapExecutor.calculateFlashLoanFee(
  ethers.utils.parseEther('100'),
  'aave'
);

// Calculate Uniswap V3 fee (0.05%)
const uniswapFee = FlashSwapExecutor.calculateFlashLoanFee(
  ethers.utils.parseEther('100'),
  'uniswap_v3'
);
```

---

## Integration with Existing Components

### With AdvancedOrchestrator

```typescript
import { AdvancedOrchestrator } from './arbitrage/AdvancedOrchestrator';
import { TransactionManager } from './execution/TransactionManager';
import { FlashSwapExecutor } from './execution/FlashSwapExecutor';

class IntegratedArbitrageSystem {
  constructor(
    private orchestrator: AdvancedOrchestrator,
    private txManager: TransactionManager,
    private flashExecutor: FlashSwapExecutor
  ) {}

  async executeOpportunity(opportunity: ArbitrageOpportunity) {
    // Build parameters
    const arbParams = this.flashExecutor.buildArbParams(opportunity);

    // Validate
    const validation = this.flashExecutor.validateArbParams(arbParams);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage);
    }

    // Estimate gas
    const gasLimit = this.flashExecutor.estimateGas(arbParams);

    // Execute with transaction manager
    const result = await this.txManager.executeTransaction(
      this.flashExecutor['contractAddress'],
      '0x...', // encoded call data
      { gasLimit: ethers.BigNumber.from(gasLimit) }
    );

    return result;
  }
}
```

### With MEV Protection

```typescript
import { MEVRiskModel } from './mev/MEVRiskModel';

// Calculate MEV risk before execution
const mevRisk = mevRiskModel.calculateRisk(
  opportunity.inputAmount,
  'arbitrage',
  0.5  // mempool congestion
);

if (mevRisk > 0.05) {  // 5% threshold
  console.warn('High MEV risk detected:', mevRisk);
  // Consider using Flashbots or other private relay
}
```

---

## Testing

### Unit Tests

**TransactionManager** (18 tests):
```bash
npm test -- src/execution/__tests__/TransactionManager.test.ts
```

**FlashSwapExecutor** (25 tests):
```bash
npm test -- src/execution/__tests__/FlashSwapExecutor.test.ts
```

### Test Coverage

- Parameter validation
- Gas estimation
- Retry logic
- Error handling
- Statistics tracking
- EIP-1559 support

---

## Error Handling

### TransactionManager Errors

```typescript
try {
  const result = await txManager.executeTransaction(to, data, options);
  if (!result.success) {
    if (result.error?.includes('Gas spike')) {
      // Wait for gas to normalize
    } else if (result.error?.includes('insufficient funds')) {
      // Fatal error - cannot retry
    } else {
      // Other error - already retried
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### FlashSwapExecutor Errors

```typescript
const validation = executor.validateArbParams(arbParams);
if (!validation.isValid) {
  switch (validation.errorMessage) {
    case 'Invalid flash loan amount':
      // Fix loan amount
      break;
    case 'Token mismatch between steps':
      // Fix swap path
      break;
    default:
      console.error('Validation error:', validation.errorMessage);
  }
}
```

---

## Performance Considerations

### Gas Optimization

1. **Use appropriate gas buffer**: Default 20% may be too high for simple swaps
2. **Batch operations**: Combine multiple swaps when possible
3. **Monitor gas prices**: Use TransactionManager's gas spike protection

### Transaction Timing

1. **Deadline management**: Set realistic deadlines (5-10 minutes)
2. **Retry delays**: Balance between speed and network stability
3. **Nonce synchronization**: NonceManager prevents nonce conflicts

---

## Security Considerations

### Critical Checks

1. **Always validate parameters** before execution
2. **Set slippage protection** to prevent sandwich attacks
3. **Monitor gas prices** to avoid overpaying
4. **Use deadline** to prevent stale transactions
5. **Test with dry runs** before mainnet execution

### Best Practices

```typescript
// ✅ GOOD: Validate before execution
const validation = executor.validateArbParams(arbParams);
if (!validation.isValid) {
  throw new Error(validation.errorMessage);
}

// ✅ GOOD: Use dry run first
const dryRun = await executor.executeArbitrage(arbParams, undefined, true);
if (!dryRun.success) return;

// ✅ GOOD: Set reasonable slippage
const arbParams = executor.buildArbParams(opportunity, 0.01);  // 1%

// ❌ BAD: No validation
await executor.executeArbitrage(arbParams);  // May fail

// ❌ BAD: Excessive slippage
const arbParams = executor.buildArbParams(opportunity, 0.10);  // 10% - too high
```

---

## Troubleshooting

### Common Issues

**Issue**: "Transaction failed: nonce too low"
- **Solution**: NonceManager automatically resyncs; retry will succeed

**Issue**: "Gas spike detected"
- **Solution**: Wait for gas prices to normalize or increase maxGasPrice

**Issue**: "Token mismatch between steps"
- **Solution**: Verify swap path continuity (output → input)

**Issue**: "insufficient funds for gas"
- **Solution**: Fund wallet; this is a fatal error (won't retry)

### Debug Mode

```typescript
// Enable verbose logging
import { logger } from './utils/logger';
logger.setLevel('debug');

// Check transaction status
const status = txManager.getTransactionStatus(txId);
console.log('Transaction status:', status);

// Review statistics
const stats = executor.getExecutionStats();
console.log('Execution stats:', stats);
```

---

## Changelog

### Version 3.2.0 (2025-11-08)

**Added**:
- TransactionManager.ts with production-tested features
- FlashSwapExecutor.ts for flash swap arbitrage
- Comprehensive test suites (43 tests total)
- Integration with existing NonceManager
- Multi-protocol support (Uniswap V2/V3, SushiSwap, Camelot)

**Features**:
- Automatic retry with exponential backoff
- Gas spike protection
- Transaction replacement
- Parameter validation
- Slippage protection
- Flash loan fee calculation

---

## Credits

**Original Implementation**: AxionCitadel by metalxalloy  
**TypeScript Port**: StableExo  
**Integration Date**: 2025-11-08  

---

## References

- [AxionCitadel Repository](https://github.com/metalxalloy/AxionCitadel)
- [Arbitrage Engines Documentation](./ARBITRAGE_ENGINES.md)
- [MEV Intelligence Suite](./MEV_INTELLIGENCE_SUITE.md)
- [Integration Guide](./INTEGRATION_FROM_AXIONCITADEL.md)
