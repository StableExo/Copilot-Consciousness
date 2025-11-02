# Gas Optimization System - User Guide

## Overview

The Gas Optimization System provides comprehensive tools to reduce gas costs for arbitrage execution by 30-50% on mainnet and up to 90% using Layer-2 solutions. The system includes:

- **Dynamic Gas Price Oracle**: Real-time gas price tracking with EIP-1559 support
- **Intelligent Transaction Builder**: Optimized transaction construction with pre-simulation
- **Layer-2 Integration**: Multi-chain execution on Arbitrum, Optimism, and Base
- **Gas Profitability Filter**: Pre-execution filtering to avoid unprofitable trades
- **Gas Analytics**: Performance tracking and optimization insights
- **Gas-Optimized Smart Contract**: ArbitrageExecutorV2 with assembly-level optimizations

## Quick Start

### 1. Installation

The required dependencies (axios, hardhat-gas-reporter) are already installed. Ensure you have:

```bash
npm install
```

### 2. Basic Configuration

Create a gas configuration in your initialization code:

```typescript
import { gasConfig, createGasConfig } from './src/config/gas.config';
import { GasPriceOracle, GasFilterService, Layer2Manager } from './src/gas';

// Use default configuration
const config = gasConfig;

// Or create custom configuration
const customConfig = createGasConfig({
  oracle: {
    refreshInterval: 15000, // 15 seconds
    fallbackGasPrice: BigInt(60) * BigInt(10 ** 9) // 60 gwei
  },
  filters: {
    maxGasCostPercentage: 40, // Gas can't exceed 40% of profit
    minProfitThreshold: BigInt(200) * BigInt(10 ** 18) // 200 tokens minimum
  }
});
```

### 3. Initialize Components

```typescript
// Initialize gas price oracle
const oracle = new GasPriceOracle(
  process.env.RPC_URL!,
  process.env.ETHERSCAN_API_KEY,
  config.oracle.refreshInterval,
  config.oracle.fallbackGasPrice
);

// Start automatic gas price updates
oracle.startAutoRefresh();

// Initialize gas filter
const gasFilter = new GasFilterService(oracle, config.filters);

// Initialize Layer-2 manager
const layer2Manager = new Layer2Manager();

// Initialize transaction builder
import { ethers } from 'ethers';
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
const txBuilder = new TransactionBuilder(provider, oracle);
```

### 4. Integrate with Arbitrage Orchestrator

```typescript
import { ArbitrageOrchestrator } from './src/arbitrage';

const orchestrator = new ArbitrageOrchestrator(
  registry,
  pathfindingConfig,
  await oracle.getCurrentGasPrice('normal').then(gp => gp.maxFeePerGas),
  gasFilter // Pass gas filter to enable filtering
);
```

## Gas Strategies

The system provides three execution strategies:

### Aggressive Strategy
- **Gas Tier**: Instant (90th percentile)
- **Max Wait**: 1 block
- **Use Case**: Time-sensitive arbitrage opportunities with high profit margins
- **Gas Cost**: Highest, but fastest execution

```typescript
const tx = await txBuilder.buildTransaction(path, 'aggressive');
```

### Normal Strategy (Recommended)
- **Gas Tier**: Fast (75th percentile)
- **Max Wait**: 3 blocks
- **Use Case**: Standard arbitrage opportunities with balanced risk/reward
- **Gas Cost**: Moderate, reliable execution

```typescript
const tx = await txBuilder.buildTransaction(path, 'normal');
```

### Economical Strategy
- **Gas Tier**: Normal (50th percentile)
- **Max Wait**: 10 blocks
- **Use Case**: Lower-margin opportunities when gas costs are a concern
- **Gas Cost**: Lowest, slower execution

```typescript
const tx = await txBuilder.buildTransaction(path, 'economical');
```

## Using Layer-2 Solutions

The Layer-2 Manager automatically selects the optimal chain for execution:

```typescript
// Select optimal chain for arbitrage path
const selection = await layer2Manager.selectOptimalChain(arbitragePath);

console.log(`Best chain: ${selection.chain}`);
console.log(`Estimated profit: ${selection.netProfit}`);
console.log(`Gas cost: ${selection.gasCost}`);
console.log(`Bridge cost: ${selection.bridgeCost}`);

// Execute on selected chain
if (selection.chain !== 'mainnet') {
  const l2Provider = layer2Manager.getProvider(selection.chain);
  // Use l2Provider for transaction execution
}
```

### Supported Chains

1. **Ethereum Mainnet**
   - Chain ID: 1
   - Gas Cost Multiplier: 1.0x
   - Bridge Cost: None

2. **Arbitrum One**
   - Chain ID: 42161
   - Gas Cost Multiplier: 0.1x (10x cheaper)
   - Bridge Cost: ~50 tokens

3. **Optimism**
   - Chain ID: 10
   - Gas Cost Multiplier: 0.1x (10x cheaper)
   - Bridge Cost: ~50 tokens

4. **Base**
   - Chain ID: 8453
   - Gas Cost Multiplier: 0.1x (10x cheaper)
   - Bridge Cost: ~50 tokens

## Gas Profitability Filtering

The Gas Filter Service prevents execution of unprofitable trades:

```typescript
// Check if path is executable at current gas prices
const isExecutable = await gasFilter.isExecutable(arbitragePath);

if (isExecutable) {
  // Execute arbitrage
  await executeArbitrage(arbitragePath);
} else {
  console.log('Path queued or rejected due to high gas costs');
}

// Check queued opportunities that are now executable
const executableQueued = await gasFilter.getExecutableQueuedOpportunities();
for (const path of executableQueued) {
  await executeArbitrage(path);
}
```

### Configuration Parameters

- **maxGasCostPercentage**: Maximum percentage of profit that can be gas costs (default: 50%)
- **minProfitThreshold**: Minimum net profit required after gas costs (default: 100 tokens)
- **queueThreshold**: Queue opportunities when gas is above this percentage but below max (default: 30%)

## Transaction Pre-Simulation

Avoid wasted gas on failed transactions:

```typescript
// Build transaction
const tx = await txBuilder.buildTransaction(path, 'normal', {
  from: walletAddress
});

// Simulate execution before sending
const simulation = await txBuilder.simulateExecution(tx, walletAddress);

if (simulation.success) {
  console.log(`Simulation successful, gas used: ${simulation.gasUsed}`);
  // Send transaction
} else {
  console.error(`Simulation failed: ${simulation.error}`);
  // Don't send transaction
}
```

## Gas Analytics

Track and analyze gas performance:

```typescript
import { GasAnalytics } from './src/gas';

const analytics = new GasAnalytics(86400000); // 24 hour report interval

// Record arbitrage execution
analytics.recordExecution({
  path: arbitragePath,
  gasUsed: BigInt(150000),
  gasCost: BigInt(3) * BigInt(10 ** 15), // 0.003 ETH
  chain: 'mainnet',
  timestamp: Date.now(),
  success: true,
  blockNumber: 12345678
});

// Get current metrics
const metrics = analytics.getMetrics();
console.log(`Total gas used: ${metrics.totalGasUsed}`);
console.log(`Average gas per arbitrage: ${metrics.averageGasPerArbitrage}`);
console.log(`Execution success rate: ${metrics.executionSuccessRate}%`);
console.log(`Most efficient hour: ${metrics.mostEfficientTimeOfDay}:00 UTC`);

// Generate comprehensive report
const report = analytics.generateReport();
console.log('Top execution windows:', report.topExecutionWindows);
console.log('Cost by DEX:', report.costByDEX);
console.log('Recommendations:', report.recommendations);
```

## Best Practices

### 1. Monitor Gas Prices
```typescript
// Set up gas price monitoring
oracle.startAutoRefresh();

// Check if gas is acceptable before executing
const threshold = BigInt(100) * BigInt(10 ** 9); // 100 gwei
if (await oracle.isGasPriceAcceptable(threshold)) {
  // Execute arbitrage
}
```

### 2. Use Optimal Execution Times

Based on analytics, gas is typically cheapest during certain hours:

```typescript
const bestTimes = analytics.getBestExecutionTimes();
console.log('Execute arbitrages during these hours for lowest gas costs:');
bestTimes.forEach(window => {
  console.log(`Hour ${window.hour}: Average gas cost ${window.avgGasCost}`);
});
```

### 3. Predict Future Gas Prices

```typescript
// Predict gas price 5 blocks ahead
const predictedGas = oracle.predictGasPrice(5);
console.log(`Predicted gas price: ${predictedGas}`);

// Use prediction to decide when to execute
if (predictedGas < currentGasPrice) {
  console.log('Gas expected to decrease, consider waiting');
} else {
  console.log('Gas expected to increase, execute now');
}
```

### 4. Leverage Layer-2

For smaller arbitrages where gas costs are significant:

```typescript
if (selection.chain !== 'mainnet' && selection.netProfit > mainnetNetProfit) {
  console.log(`Layer-2 execution is ${((mainnetNetProfit - selection.netProfit) / mainnetNetProfit * 100)}% more profitable`);
}
```

### 5. Set Baseline for Comparison

```typescript
// Set baseline gas cost from V1 contract
const v1AverageGas = BigInt(250000);
analytics.setBaselineGasCost(v1AverageGas);

// View savings
const metrics = analytics.getMetrics();
console.log(`Gas savings from optimizations: ${metrics.gasSavingsFromOptimizations}`);
```

## Using ArbitrageExecutorV2

The gas-optimized smart contract provides significant gas savings:

### Deployment

```solidity
// Deploy V2 contract
ArbitrageExecutorV2 executor = new ArbitrageExecutorV2(aavePoolAddressesProvider);
```

### Key Improvements

1. **Custom Errors**: Save ~50 gas per error vs string-based require
2. **Assembly Optimizations**: Save ~2000 gas per approval
3. **Unchecked Arithmetic**: Save ~20 gas per operation
4. **Batch Approvals**: Save ~5000 gas per batch operation
5. **Gas Tracking**: Events for analytics

### Usage

```typescript
// Request flash loan with multi-hop arbitrage
const params = {
  version: 1,
  routers: [router1Address, router2Address],
  paths: [[tokenA, tokenB], [tokenB, tokenA]],
  minAmounts: [minAmount1, minAmount2]
};

await executorV2.requestMultiHopFlashLoan(
  borrowAsset,
  borrowAmount,
  params
);
```

## Troubleshooting

### Issue: High Gas Costs Despite Optimization

**Solution**: 
1. Check if using V2 contract: `config.contract.useV2Executor === true`
2. Verify Layer-2 is enabled: `config.layer2.enabled === true`
3. Review gas strategy: Consider using 'economical' instead of 'aggressive'

### Issue: Transactions Failing

**Solution**:
1. Enable pre-simulation to catch failures before sending
2. Increase gas buffer: `txBuilder.setGasBuffer(1.2)` for 20% buffer
3. Check slippage tolerance in path calculations

### Issue: Opportunities Being Queued

**Solution**:
1. Adjust queue threshold: Lower `config.filters.queueThreshold` to 20%
2. Check queued opportunities regularly: `gasFilter.getExecutableQueuedOpportunities()`
3. Execute during optimal gas windows identified by analytics

### Issue: Layer-2 Not Being Selected

**Solution**:
1. Verify DEX availability on L2: `layer2Manager.isDEXAvailableOnChain(dexName, chain)`
2. Check if bridge costs are too high relative to profit
3. Ensure L2 chains are properly configured with RPC URLs

## Environment Variables

Required environment variables:

```bash
# Ethereum RPC endpoint
RPC_URL=https://eth.llamarpc.com

# Etherscan API key for gas price data
ETHERSCAN_API_KEY=your_api_key_here

# Layer-2 RPC endpoints (optional)
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io
BASE_RPC_URL=https://mainnet.base.org
```

## Performance Targets

Expected performance improvements:

- ✅ **Gas Cost Reduction**: 30-50% on mainnet (V1 vs V2 contract)
- ✅ **Layer-2 Cost Reduction**: 90%+ compared to mainnet
- ✅ **Failed Transaction Rate**: <1% (via pre-simulation)
- ✅ **Gas Price Update Latency**: <200ms
- ✅ **Transaction Simulation**: <500ms

## Support

For issues, questions, or contributions:
- Review code in `src/gas/` directory
- Check existing tests in `src/gas/__tests__/`
- Refer to inline documentation in source files
