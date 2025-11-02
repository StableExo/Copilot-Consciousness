# Gas Optimization System - Developer Guide

## Architecture Overview

The Gas Optimization System is organized into several key components:

```
src/gas/
├── GasPriceOracle.ts        # Real-time gas price tracking
├── TransactionBuilder.ts     # Optimized transaction construction
├── Layer2Manager.ts          # Multi-chain execution support
├── GasFilterService.ts       # Profitability filtering
├── GasAnalytics.ts           # Performance tracking
└── index.ts                  # Public API exports

src/arbitrage/
├── ArbitrageExecutorV2.sol   # Gas-optimized smart contract
└── ArbitrageOrchestrator.ts  # Integrated with gas filtering

src/config/
└── gas.config.ts             # System configuration
```

## Component Details

### 1. GasPriceOracle

**Purpose**: Fetches and caches gas prices from multiple sources with EIP-1559 support.

**Key Features**:
- Multi-source fetching (Ethereum node, Etherscan API)
- Automatic fallback on source failure
- Configurable refresh intervals
- Gas price tier selection (instant, fast, normal, slow)
- Historical price caching
- Simple moving average prediction

**Architecture**:
```typescript
class GasPriceOracle {
  private provider: ethers.providers.JsonRpcProvider;
  private cache: GasPriceCache;
  private refreshTimer?: NodeJS.Timeout;
  
  // Fetches from multiple sources in order
  private async fetchAndCacheGasPrice(): Promise<void>
  
  // Tier selection with multipliers
  private selectTierFromCache(tier: GasPriceTier): GasPrice
}
```

**Adding New Gas Price Sources**:

```typescript
// 1. Add fetch method
private async fetchFromNewSource(): Promise<GasPrice | null> {
  try {
    const response = await axios.get('https://new-source.com/api');
    return {
      gasPrice: BigInt(response.data.gasPrice),
      maxFeePerGas: BigInt(response.data.maxFee),
      maxPriorityFeePerGas: BigInt(response.data.priorityFee),
      baseFee: BigInt(response.data.baseFee),
      timestamp: Date.now()
    };
  } catch (error) {
    return null;
  }
}

// 2. Add to sources array in fetchAndCacheGasPrice
const sources = [
  this.fetchFromNode.bind(this),
  this.fetchFromEtherscan.bind(this),
  this.fetchFromNewSource.bind(this) // Add here
];
```

**Gas Price Prediction Algorithm**:

The simple moving average (SMA) prediction uses recent price history:

```typescript
predictGasPrice(blocksAhead: number): bigint {
  // 1. Calculate SMA of recent prices
  const recentPrices = this.cache.prices.slice(-10);
  const avg = sum(recentPrices) / count(recentPrices);
  
  // 2. Detect trend (comparing older vs newer half)
  const olderAvg = avg(olderHalf);
  const newerAvg = avg(newerHalf);
  
  // 3. Extrapolate trend
  if (newerAvg > olderAvg) {
    const trend = newerAvg - olderAvg;
    return avg + (trend * blocksAhead / 5);
  }
  
  return avg;
}
```

### 2. TransactionBuilder

**Purpose**: Constructs optimized transactions with automatic EIP-1559/legacy selection and pre-simulation.

**Key Features**:
- Automatic EIP-1559 vs legacy detection
- Gas limit estimation with configurable buffer
- Transaction pre-simulation via eth_call
- Retry logic with increasing gas prices
- Transaction batching support (multicall pattern)

**Transaction Building Flow**:

```
1. Select gas tier based on strategy
   ├─ aggressive → instant (90th percentile)
   ├─ normal → fast (75th percentile)
   └─ economical → normal (50th percentile)

2. Check EIP-1559 support
   ├─ Supported → Use maxFeePerGas + maxPriorityFeePerGas
   └─ Not supported → Use legacy gasPrice

3. Estimate gas limit
   └─ Base estimate * buffer (default 1.1x)

4. Build transaction object
   └─ Return ready-to-sign transaction
```

**Simulation Implementation**:

```typescript
async simulateExecution(tx: Transaction): Promise<SimulationResult> {
  try {
    // Use eth_call to simulate without sending
    const result = await this.provider.call({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      from: from || ethers.constants.AddressZero,
      gasLimit: tx.gasLimit
    });
    
    return {
      success: true,
      gasUsed: tx.gasLimit,
      returnData: result
    };
  } catch (error) {
    // Parse revert reason
    return {
      success: false,
      gasUsed: BigInt(0),
      error: parseRevertReason(error)
    };
  }
}
```

### 3. Layer2Manager

**Purpose**: Manages multi-chain execution and optimal chain selection.

**Key Features**:
- Support for Arbitrum, Optimism, Base
- DEX availability tracking per chain
- Profitability comparison including bridge costs
- Chain-specific gas estimation
- Provider and oracle management per chain

**Chain Selection Algorithm**:

```typescript
async selectOptimalChain(path: ArbitragePath): Promise<ChainSelection> {
  const selections: ChainSelection[] = [];
  
  for (const chain of chains) {
    // 1. Check DEX availability
    if (!areAllDEXsAvailable(path, chain)) continue;
    
    // 2. Calculate costs
    const gasCost = estimateGasCost(path, chain);
    const bridgeCost = getBridgeCost(chain);
    
    // 3. Calculate net profit
    const netProfit = path.estimatedProfit - gasCost - bridgeCost;
    
    selections.push({ chain, netProfit, gasCost, bridgeCost });
  }
  
  // 4. Return highest net profit
  return selections.sort((a, b) => b.netProfit - a.netProfit)[0];
}
```

**Adding New Layer-2 Chains**:

```typescript
// 1. Add to SupportedChain type
export type SupportedChain = 'mainnet' | 'arbitrum' | 'optimism' | 'base' | 'polygon';

// 2. Register chain configuration
layer2Manager.registerChain({
  name: 'polygon',
  rpcUrl: 'https://polygon-rpc.com',
  chainId: 137,
  gasCostMultiplier: 0.05, // 20x cheaper than mainnet
  bridgeCost: BigInt(30) * BigInt(10 ** 18)
});

// 3. Register DEX availability
layer2Manager.registerDEXOnChain('uniswap', 'polygon');
layer2Manager.registerDEXOnChain('quickswap', 'polygon');
```

### 4. GasFilterService

**Purpose**: Filters arbitrage opportunities based on gas profitability.

**Key Features**:
- Real-time profitability checks
- Opportunity queuing when gas is temporarily high
- Missed opportunity tracking for analytics
- Configurable thresholds

**Filtering Logic**:

```typescript
async isExecutable(path: ArbitragePath): Promise<boolean> {
  // 1. Calculate gas cost
  const gasCost = path.totalGasCost * currentGasPrice;
  const netProfit = path.estimatedProfit - gasCost;
  
  // 2. Check minimum profit
  if (netProfit < minProfitThreshold) {
    recordMissed('Below minimum profit');
    return false;
  }
  
  // 3. Check gas cost percentage
  const gasCostPct = (gasCost / path.estimatedProfit) * 100;
  
  if (gasCostPct > maxGasCostPercentage) {
    recordMissed('Gas cost too high');
    return false;
  }
  
  // 4. Queue if in threshold range
  if (gasCostPct > queueThreshold) {
    queueForLater(path);
    return false;
  }
  
  return true;
}
```

### 5. GasAnalytics

**Purpose**: Tracks gas performance and generates insights.

**Key Features**:
- Execution tracking (success/failure)
- Gas cost metrics by chain, DEX, hop count
- Time-of-day analysis
- Gas savings calculation vs baseline
- Recommendation generation

**Metrics Calculation**:

```typescript
getMetrics(): GasMetrics {
  return {
    totalGasUsed: sum(executions.map(e => e.gasUsed)),
    totalGasCost: sum(executions.map(e => e.gasCost)),
    averageGasPerArbitrage: totalGasUsed / count(executions),
    gasSavingsFromOptimizations: calculateSavings(),
    failedTransactionGasWasted: sum(failedExecutions.map(e => e.gasCost)),
    mostEfficientTimeOfDay: findBestHour(),
    gasCostByChain: groupBy(executions, 'chain'),
    executionSuccessRate: successCount / totalCount * 100
  };
}
```

### 6. ArbitrageExecutorV2 Smart Contract

**Purpose**: Gas-optimized version of flash loan arbitrage executor.

**Gas Optimization Techniques Used**:

#### 1. Custom Errors (Save ~50 gas each)

```solidity
// ❌ Before (V1)
require(msg.sender == owner, "Not owner");

// ✅ After (V2)
error NotOwner(address caller);
if (msg.sender != owner) {
    revert NotOwner(msg.sender);
}
```

**Savings**: ~50 gas per error

#### 2. Assembly-Based Approvals (Save ~2000 gas each)

```solidity
// ❌ Before (V1)
IERC20(token).approve(spender, amount);

// ✅ After (V2)
function _approveAssembly(address token, address spender, uint256 amount) private {
    assembly {
        let ptr := mload(0x40)
        // Store function selector for approve(address,uint256)
        mstore(ptr, 0x095ea7b300000000000000000000000000000000000000000000000000000000)
        mstore(add(ptr, 4), spender)
        mstore(add(ptr, 36), amount)
        
        let success := call(gas(), token, 0, ptr, 68, 0, 0)
        if iszero(success) { revert(0, 0) }
    }
}
```

**Savings**: ~2000 gas per approval

#### 3. Unchecked Arithmetic (Save ~20 gas per operation)

```solidity
// ❌ Before (V1)
for (uint i = 0; i < length; i++) {
    // Loop body
}

// ✅ After (V2)
unchecked {
    for (uint256 i = 0; i < length; ++i) {
        // Loop body
    }
}
```

**Savings**: ~20 gas per operation

#### 4. Immutable Variables (Save ~2100 gas per read)

```solidity
// ❌ Before (V1)
IPool public POOL;

// ✅ After (V2)
IPool public immutable POOL;
```

**Savings**: ~2100 gas per SLOAD avoided

#### 5. Cached Array Lengths

```solidity
// ❌ Before (V1)
for (uint i = 0; i < array.length; i++) {
    // Loop body
}

// ✅ After (V2)
uint256 length = array.length;
for (uint256 i = 0; i < length; i++) {
    // Loop body
}
```

**Savings**: ~100 gas per loop iteration

#### 6. Gas Tracking Events

```solidity
event GasUsed(uint256 gasStart, uint256 gasEnd, uint256 totalUsed);

uint256 gasStart = gasleft();
// ... operations ...
emit GasUsed(gasStart, gasleft(), gasStart - gasleft());
```

## Testing Strategy

### Unit Tests

Test individual components in isolation:

```typescript
describe('GasPriceOracle', () => {
  it('should fetch gas prices from node', async () => {
    const oracle = new GasPriceOracle(rpcUrl);
    const price = await oracle.getCurrentGasPrice('normal');
    expect(price.gasPrice).toBeGreaterThan(BigInt(0));
  });
});
```

### Integration Tests

Test component interactions:

```typescript
describe('Gas System Integration', () => {
  it('should filter unprofitable paths', async () => {
    const oracle = new GasPriceOracle(rpcUrl);
    const filter = new GasFilterService(oracle, config);
    const orchestrator = new ArbitrageOrchestrator(registry, config, gasPrice, filter);
    
    const opportunities = await orchestrator.findOpportunities(tokens, amount);
    // All returned opportunities should be profitable
    expect(opportunities.every(o => o.netProfit > minProfit)).toBe(true);
  });
});
```

### Gas Benchmarks

Compare gas usage between V1 and V2:

```typescript
describe('Gas Benchmarks', () => {
  it('V2 should use 30% less gas than V1', async () => {
    const v1Gas = await executeV1Arbitrage(path);
    const v2Gas = await executeV2Arbitrage(path);
    
    const savings = ((v1Gas - v2Gas) / v1Gas) * 100;
    expect(savings).toBeGreaterThanOrEqual(30);
  });
});
```

## Performance Optimization Tips

### 1. Minimize RPC Calls

Cache data when possible:

```typescript
// ❌ Bad - Multiple RPC calls
for (const path of paths) {
  const gasPrice = await oracle.getCurrentGasPrice('normal');
  // Use gasPrice
}

// ✅ Good - Single RPC call
const gasPrice = await oracle.getCurrentGasPrice('normal');
for (const path of paths) {
  // Use cached gasPrice
}
```

### 2. Batch Operations

Use multicall for multiple operations:

```typescript
// ❌ Bad - Sequential approvals
await token1.approve(router, amount1);
await token2.approve(router, amount2);
await token3.approve(router, amount3);

// ✅ Good - Batch approvals
await executorV2.batchApprove(
  [token1, token2, token3],
  [router, router, router],
  [amount1, amount2, amount3]
);
```

### 3. Use Appropriate Gas Strategies

Match strategy to opportunity characteristics:

```typescript
function selectStrategy(path: ArbitragePath): GasStrategy {
  const profitMargin = path.netProfit / path.estimatedProfit;
  
  if (profitMargin > 0.5) {
    return 'aggressive'; // High margin, speed matters
  } else if (profitMargin > 0.2) {
    return 'normal'; // Moderate margin
  } else {
    return 'economical'; // Low margin, save gas
  }
}
```

### 4. Optimize Smart Contract Storage

Pack variables efficiently:

```solidity
// ❌ Bad - Uses 3 storage slots
uint256 value1;  // Slot 0
uint128 value2;  // Slot 1
uint128 value3;  // Slot 2

// ✅ Good - Uses 2 storage slots
uint256 value1;  // Slot 0
uint128 value2;  // Slot 1 (first 128 bits)
uint128 value3;  // Slot 1 (last 128 bits)
```

## Debugging

### Enable Gas Tracking

```typescript
// Log gas usage in transactions
const tx = await txBuilder.buildTransaction(path, 'normal');
const receipt = await provider.sendTransaction(tx);
console.log(`Gas used: ${receipt.gasUsed}`);
```

### Monitor Failed Transactions

```typescript
analytics.getExecutionHistory().filter(e => !e.success).forEach(exec => {
  console.log(`Failed at ${new Date(exec.timestamp)}: ${exec.failureReason}`);
});
```

### Analyze Gas Costs

```typescript
const report = analytics.generateReport();
console.log('Recommendations:', report.recommendations);

// Identify expensive operations
const costByDEX = report.costByDEX;
const mostExpensive = Array.from(costByDEX.entries())
  .sort((a, b) => Number(b[1] - a[1]))[0];
console.log(`Most expensive DEX: ${mostExpensive[0]}`);
```

## Contributing

When adding new features:

1. **Follow existing patterns**: Use similar structure to existing components
2. **Add tests**: Maintain >90% coverage
3. **Document**: Add JSDoc comments and update guides
4. **Optimize**: Profile gas usage and optimize where possible
5. **Validate**: Ensure build passes and tests succeed

## Future Enhancements

Potential improvements for the gas optimization system:

1. **Machine Learning Gas Prediction**: Use historical data to train prediction models
2. **MEV Protection**: Integrate with Flashbots or Eden Network
3. **Dynamic Strategy Selection**: Auto-select strategy based on network conditions
4. **Cross-Chain Arbitrage**: Support for arbitrage across multiple chains
5. **Gas Token Integration**: Use GST2 or CHI tokens for gas savings
6. **Advanced Batching**: Implement more sophisticated multicall patterns
7. **Gas Auctions**: Bid for inclusion in blocks with optimal gas prices

## References

- [EIP-1559 Specification](https://eips.ethereum.org/EIPS/eip-1559)
- [Ethers.js Documentation](https://docs.ethers.io/)
- [Solidity Gas Optimization Tips](https://github.com/devanshbatham/Solidity-Gas-Optimization-Tips)
- [Layer-2 Solutions Comparison](https://l2beat.com/)
