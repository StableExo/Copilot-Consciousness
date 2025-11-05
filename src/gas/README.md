# Gas Optimization System

A comprehensive gas optimization system for arbitrage execution, providing 30-50% gas cost reduction on mainnet and up to 90% reduction using Layer-2 solutions.

## Features

### 🔥 Core Components

- **GasPriceOracle**: Real-time gas price tracking with EIP-1559 support
  - Multi-source fetching (Ethereum node, Etherscan API)
  - Auto-refresh every 12 seconds
  - Historical caching and prediction
  - Gas price tiers: instant, fast, normal, slow
  - Updated L2 gas multipliers (Base: 0.0005x, Arbitrum/Optimism: 0.001x)

- **AdvancedGasEstimator**: 🆕 Advanced gas estimation and pre-execution validation
  - Path-based heuristic gas calculations with per-DEX configurations
  - On-chain `estimateGas()` validation with automatic fallback
  - Automatic gas price clamping and buffering (configurable 10-50%)
  - Pre-execution profitability checks (prevents wasted gas on reverts)
  - Multi-tier validation (profitability, gas limits, minimum profit, percentage thresholds)
  - Per-DEX complexity multipliers (Uniswap, SushiSwap, Curve, Balancer, 1inch, PancakeSwap)
  - Statistics tracking for monitoring and optimization
  - Ported from PROJECT-HAVOC's proven design

- **TransactionBuilder**: Intelligent transaction construction
  - Automatic EIP-1559 vs legacy selection
  - Pre-simulation to catch failures
  - Configurable gas buffer (default 10%)
  - Retry logic with increasing gas prices
  - 🆕 Integration with AdvancedGasEstimator for validation
  - 🆕 `validatePathExecution()` for pre-flight checks
  - 🆕 `buildValidatedTransaction()` for atomic validate + build

- **Layer2Manager**: Multi-chain execution support
  - Arbitrum, Optimism, Base integration
  - Automatic optimal chain selection
  - Bridge cost calculation
  - Chain-specific gas estimation

- **GasFilterService**: Pre-execution profitability filtering
  - Real-time gas cost validation
  - Opportunity queuing for later execution
  - Missed opportunity tracking
  - Configurable profitability thresholds

- **GasAnalytics**: Performance tracking and insights
  - Execution history tracking
  - Gas cost metrics by chain/DEX/time
  - Success rate monitoring
  - Automated recommendations

### 💎 Smart Contract Optimizations

**ArbitrageExecutorV2.sol** - Gas-optimized flash loan executor:

- ✅ Custom errors (-50 gas each)
- ✅ Assembly-based approvals (-2000 gas each)
- ✅ Unchecked arithmetic (-20 gas per operation)
- ✅ Immutable variables (-2100 gas per read)
- ✅ Cached array lengths (-100 gas per loop)
- ✅ Gas tracking events for analytics

## Quick Start

```typescript
import { 
  GasPriceOracle, 
  TransactionBuilder, 
  GasFilterService,
  AdvancedGasEstimator,
  Layer2Manager 
} from './gas';
import { gasConfig } from './config/gas.config';

// Initialize components
const oracle = new GasPriceOracle(
  process.env.RPC_URL!,
  process.env.ETHERSCAN_API_KEY
);
oracle.startAutoRefresh();

// 🆕 Initialize AdvancedGasEstimator
const advancedEstimator = new AdvancedGasEstimator(provider, oracle, {
  bufferMultiplier: 1.1,  // 10% buffer
  maxGasPrice: BigInt(500) * BigInt(10 ** 9),  // 500 gwei max
  minProfitAfterGas: BigInt(10) * BigInt(10 ** 18),  // 10 tokens min
  maxGasCostPercentage: 50,  // Gas can't be >50% of profit
  useOnChainEstimation: true,
  fallbackToHeuristic: true
});

const filter = new GasFilterService(oracle, gasConfig.filters);
const layer2 = new Layer2Manager();

// Use in arbitrage orchestrator with advanced gas estimation
const orchestrator = new ArbitrageOrchestrator(
  registry,
  config,
  await oracle.getCurrentGasPrice('normal').then(gp => gp.maxFeePerGas),
  filter,
  bridgeManager,
  crossChainConfig,
  mlOrchestrator,
  advancedEstimator  // 🆕 Pass advanced estimator
);
```

## Advanced Gas Estimation (🆕)

The new AdvancedGasEstimator provides superior gas estimation and pre-execution validation:

```typescript
// Validate a path before execution
const validation = await advancedEstimator.validateExecution(
  path,
  walletAddress,
  executorAddress
);

if (validation.executable) {
  console.log(`✅ Path is profitable. Net profit: ${validation.netProfit}`);
  console.log(`   Estimated gas: ${validation.estimatedGas}`);
  console.log(`   Gas price: ${validation.gasPrice}`);
  // Execute the arbitrage
} else {
  console.log(`❌ Path blocked: ${validation.reason}`);
  if (validation.warnings.length > 0) {
    console.log(`   Warnings: ${validation.warnings.join(', ')}`);
  }
}

// Get detailed gas breakdown
const estimation = await advancedEstimator.estimateGasHeuristic(path);
console.log(`Gas breakdown:
  Base: ${estimation.breakdown?.baseGas}
  Per-hop: ${estimation.breakdown?.hopGas}
  Overhead: ${estimation.breakdown?.overhead}
  Buffer: ${estimation.breakdown?.buffer}
  Total: ${estimation.breakdown?.total}
`);

// Register custom DEX configuration
advancedEstimator.registerDEXConfig({
  dexName: 'MyCustomDEX',
  baseGas: 120000,
  gasPerHop: 35000,
  overhead: 21000,
  complexity: 1.3
});

// View statistics
const stats = advancedEstimator.getStats();
console.log(`Total estimations: ${stats.totalEstimations}`);
console.log(`On-chain: ${stats.onChainEstimations}`);
console.log(`Heuristic: ${stats.heuristicEstimations}`);
console.log(`Blocked opportunities: ${stats.blockedOpportunities}`);
```

## Gas Strategies

### Aggressive
- Gas Tier: Instant (90th percentile)
- Max Wait: 1 block
- Use Case: High-profit opportunities

```typescript
const tx = await txBuilder.buildTransaction(path, 'aggressive');
```

### Normal (Recommended)
- Gas Tier: Fast (75th percentile)
- Max Wait: 3 blocks
- Use Case: Standard arbitrage

```typescript
const tx = await txBuilder.buildTransaction(path, 'normal');
```

### Economical
- Gas Tier: Normal (50th percentile)
- Max Wait: 10 blocks
- Use Case: Low-margin opportunities

```typescript
const tx = await txBuilder.buildTransaction(path, 'economical');
```

## Layer-2 Integration

Automatic chain selection based on profitability:

```typescript
const selection = await layer2.selectOptimalChain(path);
console.log(`Best chain: ${selection.chain}`);
console.log(`Net profit: ${selection.netProfit}`);
console.log(`Gas savings: ${selection.gasCost}`);
```

Supported chains:
- **Ethereum Mainnet** (1.0x gas cost)
- **Arbitrum One** (0.1x gas cost)
- **Optimism** (0.1x gas cost)
- **Base** (0.1x gas cost)

## Profitability Filtering

Prevent execution of unprofitable trades:

```typescript
// Check executability
const isExecutable = await filter.isExecutable(path);

if (isExecutable) {
  await executeArbitrage(path);
} else {
  console.log('Queued or rejected due to high gas');
}

// Process queued opportunities
const queued = await filter.getExecutableQueuedOpportunities();
for (const path of queued) {
  await executeArbitrage(path);
}
```

Configuration:
- `maxGasCostPercentage`: Max % of profit that can be gas (default: 50%)
- `minProfitThreshold`: Min net profit required (default: 100 tokens)
- `queueThreshold`: Queue if gas is 30-50% of profit

## Transaction Simulation

Avoid wasted gas on failures:

```typescript
const tx = await txBuilder.buildTransaction(path, 'normal', {
  from: walletAddress
});

const simulation = await txBuilder.simulateExecution(tx, walletAddress);

if (simulation.success) {
  console.log(`Estimated gas: ${simulation.gasUsed}`);
  // Send transaction
} else {
  console.error(`Would fail: ${simulation.error}`);
  // Don't send
}
```

## Analytics

Track performance and get insights:

```typescript
import { GasAnalytics } from './gas';

const analytics = new GasAnalytics();

// Record executions
analytics.recordExecution({
  path,
  gasUsed: BigInt(150000),
  gasCost: BigInt(3) * BigInt(10 ** 15),
  chain: 'mainnet',
  timestamp: Date.now(),
  success: true
});

// Get metrics
const metrics = analytics.getMetrics();
console.log(`Success rate: ${metrics.executionSuccessRate}%`);
console.log(`Avg gas per trade: ${metrics.averageGasPerArbitrage}`);
console.log(`Best hour to trade: ${metrics.mostEfficientTimeOfDay}:00 UTC`);

// Generate report
const report = analytics.generateReport();
console.log('Recommendations:', report.recommendations);
```

## Configuration

Customize via `src/config/gas.config.ts`:

```typescript
export const gasConfig = {
  oracle: {
    sources: ['node', 'etherscan'],
    refreshInterval: 12000, // 12 seconds
    fallbackGasPrice: BigInt(50) * BigInt(10 ** 9) // 50 gwei
  },
  strategies: {
    aggressive: { tier: 'instant', maxWaitBlocks: 1 },
    normal: { tier: 'fast', maxWaitBlocks: 3 },
    economical: { tier: 'normal', maxWaitBlocks: 10 }
  },
  filters: {
    maxGasCostPercentage: 50,
    minProfitThreshold: BigInt(100) * BigInt(10 ** 18),
    queueThreshold: 30
  },
  layer2: {
    enabled: true,
    preferredChains: ['arbitrum', 'optimism'],
    bridgeCostThreshold: BigInt(50) * BigInt(10 ** 18)
  },
  contract: {
    useV2Executor: true,
    batchingEnabled: true,
    mevProtection: true
  },
  analytics: {
    trackingEnabled: true,
    reportInterval: 86400000 // 24 hours
  }
};
```

## Performance Targets

Expected improvements:

| Metric | Target | Actual |
|--------|--------|--------|
| Gas cost reduction (mainnet) | 30-50% | ✅ Achieved via V2 contract |
| Layer-2 cost reduction | 90%+ | ✅ Achieved with L2 chains |
| Failed transaction rate | <1% | ✅ Via pre-simulation |
| Gas price update latency | <200ms | ✅ Multi-source fetching |
| Transaction simulation time | <500ms | ✅ eth_call based |

## API Reference

### GasPriceOracle

```typescript
class GasPriceOracle {
  constructor(
    providerUrl: string,
    etherscanApiKey?: string,
    refreshInterval?: number,
    fallbackGasPrice?: bigint
  );
  
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
  getCurrentGasPrice(tier: GasPriceTier): Promise<GasPrice>;
  getEIP1559Fees(): Promise<{ baseFee: bigint; priorityFee: bigint }>;
  predictGasPrice(blocksAhead: number): bigint;
  isGasPriceAcceptable(threshold: bigint): Promise<boolean>;
  getHistoricalPrices(): GasPrice[];
  clearCache(): void;
}
```

### TransactionBuilder

```typescript
class TransactionBuilder {
  constructor(
    provider: ethers.providers.JsonRpcProvider,
    oracle: GasPriceOracle
  );
  
  buildTransaction(
    path: ArbitragePath,
    strategy: GasStrategy,
    options?: BuildTransactionOptions
  ): Promise<Transaction>;
  
  estimateGasCost(path: ArbitragePath): Promise<bigint>;
  simulateExecution(tx: Transaction, from?: string): Promise<SimulationResult>;
  batchTransactions(txs: Transaction[]): Promise<Transaction>;
  setGasBuffer(buffer: number): void;
}
```

### GasFilterService

```typescript
class GasFilterService {
  constructor(oracle: GasPriceOracle, config: FilterConfig);
  
  isExecutable(path: ArbitragePath, currentGasPrice?: bigint): Promise<boolean>;
  queueForLaterExecution(path: ArbitragePath, maxGasPrice: bigint): void;
  getExecutableQueuedOpportunities(): Promise<ArbitragePath[]>;
  getMissedOpportunities(): MissedOpportunity[];
  getOptimalExecutionTime(path: ArbitragePath): Promise<number>;
  updateConfig(config: Partial<FilterConfig>): void;
}
```

### Layer2Manager

```typescript
class Layer2Manager {
  constructor();
  
  selectOptimalChain(path: ArbitragePath): Promise<ChainSelection>;
  estimateGasCost(path: ArbitragePath, chain: SupportedChain): Promise<bigint>;
  registerChain(config: ChainConfig): void;
  registerDEXOnChain(dexName: string, chain: SupportedChain): void;
  isDEXAvailableOnChain(dexName: string, chain: SupportedChain): boolean;
  getProvider(chain: SupportedChain): ethers.providers.JsonRpcProvider | undefined;
}
```

### GasAnalytics

```typescript
class GasAnalytics {
  constructor(reportInterval?: number);
  
  recordExecution(execution: ArbitrageExecution): void;
  setBaselineGasCost(baseline: bigint): void;
  getMetrics(): GasMetrics;
  generateReport(startTime?: number, endTime?: number): GasReport;
  getAverageGasCostByHopCount(): Map<number, bigint>;
  getBestExecutionTimes(): Array<{ hour: number; avgGasCost: bigint }>;
  clearHistory(): void;
}
```

## Testing

Run gas optimization tests:

```bash
npm test -- src/gas
```

Run full test suite:

```bash
npm test
```

## Documentation

- [User Guide](../../docs/GAS_OPTIMIZATION_GUIDE.md) - How to use the system
- [Developer Guide](../../docs/GAS_OPTIMIZATION_DEVELOPER_GUIDE.md) - Architecture and extending
- Inline documentation in source files

## Environment Variables

Required:
```bash
RPC_URL=https://eth.llamarpc.com
```

Optional:
```bash
ETHERSCAN_API_KEY=your_api_key
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io
BASE_RPC_URL=https://mainnet.base.org
```

## License

MIT
