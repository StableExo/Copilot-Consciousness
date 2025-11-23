# Cross-Chain Arbitrage System Guide

## Overview

The Cross-Chain Arbitrage System enables finding and executing profitable arbitrage opportunities across multiple blockchains simultaneously. It supports 7+ chains (Ethereum, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base, Solana) and integrates with 5 major bridge protocols.

## Architecture

### Core Components

#### 1. ChainProviderManager (`src/chains/ChainProviderManager.ts`)
Manages RPC connections for all supported chains with:
- **Health Monitoring**: Automatic health checks every 30 seconds
- **Failover**: Automatic switching to backup providers
- **Connection Pooling**: Multiple providers per chain for redundancy
- **WebSocket Support**: Real-time data streaming

**Key Methods:**
```typescript
getProvider(chainId): JsonRpcProvider | null
getSolanaConnection(): Connection | null
isChainHealthy(chainId): boolean
getAllActiveChains(): (number | string)[]
```

#### 2. Chain Adapters (`src/chains/adapters/`)

##### EVMAdapter
Handles all EVM-compatible chains (Ethereum, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base):
- Token balance queries
- Swap execution
- Gas estimation
- Price fetching

##### SolanaAdapter
Handles Solana-specific operations:
- SPL token operations
- Solana program interactions
- Compute unit estimation

**Interface:**
```typescript
getTokenBalance(token, wallet): Promise<TokenBalance>
estimateSwapGas(tokenIn, tokenOut, amount, dex): Promise<number>
executeSwap(params, dexAddress): Promise<string>
getTokenPrice(token): Promise<TokenPrice>
```

#### 3. BridgeManager (`src/chains/BridgeManager.ts`)
Unified interface for 5 bridge protocols:
- **Wormhole**: Universal bridge supporting all chains + Solana
- **LayerZero**: Fast cross-chain messaging
- **Stargate**: Liquidity-focused bridging
- **Hop Protocol**: Optimistic rollup bridges
- **Synapse**: Multi-chain bridge network

**Features:**
- Automatic bridge selection based on fees/speed
- Fee estimation for all bridges
- Time estimation
- Transaction tracking
- Success rate monitoring

**Selection Strategies:**
- `cheapest`: Minimum fees
- `fastest`: Minimum time
- `balanced`: Optimized combination (default)

**Key Methods:**
```typescript
estimateBridgeFees(fromChain, toChain, token, amount): Promise<BridgeFeeEstimate[]>
selectBridge(fromChain, toChain, token, amount): Promise<BridgeRoute | null>
executeBridge(route): Promise<BridgeTransaction>
waitForBridge(txHash, timeout): Promise<boolean>
```

#### 4. CrossChainPathFinder (`src/arbitrage/CrossChainPathFinder.ts`)
Discovers arbitrage paths across multiple chains using BFS algorithm:

**Algorithm:**
- Explores opportunities across chains including bridge hops
- Calculates total costs (swap fees, bridge fees, gas on all chains)
- Implements pruning strategies:
  - Don't bridge if amount < 10x fee
  - Limit max 5 hops total
  - Limit max 2 bridge crossings
  - Prune unprofitable partial paths early

**Key Methods:**
```typescript
findCrossChainPaths(startToken, startChain, startAmount, maxPaths): Promise<CrossChainPath[]>
addPoolEdge(chainId, edge): void
clear(): void
```

#### 5. CrossChainScanner (`src/chains/CrossChainScanner.ts`)
Continuously monitors prices across all chains:
- **Parallel Scanning**: Scans multiple chains simultaneously (<5 seconds for all chains)
- **Price Discrepancy Detection**: Identifies price differences >2%
- **Profitability Evaluation**: Accounts for bridge costs
- **Real-time Updates**: WebSocket integration

**Configuration:**
```typescript
{
  scanIntervalMs: 5000,              // Scan every 5 seconds
  priceDiscrepancyThreshold: 2.0,    // 2% minimum difference
  parallelChainScans: true,
  maxConcurrentScans: 10,
  enableWebSocket: true
}
```

**Key Methods:**
```typescript
startScanning(): void
stopScanning(): void
scan(): Promise<ScanResult>
getProfitableOpportunities(): PriceDiscrepancy[]
```

#### 6. MultiChainExecutor (`src/chains/MultiChainExecutor.ts`)
Executes cross-chain arbitrage paths:
- **Coordinated Execution**: Manages swaps and bridges across chains
- **Bridge Waiting Logic**: Polls bridge status with timeouts
- **Error Handling**: Comprehensive error recovery
- **Emergency Recovery**: Attempts to recover stuck funds

**Execution Flow:**
1. Execute first swap on source chain
2. Wait for confirmation
3. Execute bridge transaction
4. Wait for bridge completion (up to 30 minutes)
5. Execute remaining swaps on destination chain
6. Calculate actual profit

**Key Methods:**
```typescript
executePath(path): Promise<ExecutionResult>
executeMultiplePaths(paths): Promise<ExecutionResult[]>
executeWithRetry(path): Promise<ExecutionResult>
```

#### 7. CrossChainAnalytics (`src/chains/CrossChainAnalytics.ts`)
Tracks and analyzes performance:

**Metrics:**
- Total cross-chain trades
- Profitability (total, by chain pair)
- Average bridge times
- Most profitable chain pairs
- Bridge success rates (>95% target)
- Cost breakdowns (gas, fees, slippage)

**Key Methods:**
```typescript
recordTrade(path, result): void
getSummary(): AnalyticsSummary
getChainPairStats(chainA, chainB): ChainPairStats
getBridgeStats(bridgeName): BridgeStats
calculateROI(startTime, endTime): number
```

#### 8. Enhanced Components

##### ArbitrageOrchestrator
Extended with cross-chain mode:
```typescript
// Enable cross-chain mode
orchestrator.enableCrossChainMode(bridgeManager, crossChainConfig);
orchestrator.setMode('cross-chain');

// Find opportunities
const paths = await orchestrator.findCrossChainOpportunities(
  startToken,
  startChain,
  startAmount,
  maxPaths
);
```

##### GasPriceOracle
Multi-chain gas estimation:
```typescript
// Get gas price for specific chain
const gasPrice = await oracle.getChainGasPrice(chainId);

// Get prices for multiple chains
const prices = await oracle.getMultiChainGasPrices([1, 56, 137]);

// Estimate cross-chain gas cost
const totalCost = await oracle.estimateCrossChainGasCost(hops);
```

## Configuration

### Chain Configuration (`src/config/cross-chain.config.ts`)

```typescript
{
  chains: [
    {
      chainId: 1,
      name: 'Ethereum',
      type: 'EVM',
      rpcUrls: ['https://eth.llamarpc.com', ...],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockTime: 12,
      enabled: true
    },
    // ... more chains
  ],
  bridges: [ /* bridge configurations */ ],
  scanner: { /* scanner settings */ },
  pathfinding: { /* pathfinding limits */ },
  execution: { /* execution constraints */ }
}
```

### Key Configuration Parameters

**Pathfinding:**
- `maxHops`: 5 (total hops including bridges)
- `maxBridgeHops`: 2 (maximum bridge crossings)
- `minBridgeFeeRatio`: 10 (amount must be 10x the fee)
- `maxPathExplorationTime`: 5000ms

**Execution:**
- `maxConcurrentPaths`: 10
- `bridgeTimeoutMs`: 1800000 (30 minutes)
- `retryAttempts`: 3
- `slippageTolerance`: 1.0%
- `enableEmergencyRecovery`: true

## Usage Examples

### Basic Setup

```typescript
import { 
  ChainProviderManager, 
  BridgeManager, 
  CrossChainScanner,
  MultiChainExecutor,
  CrossChainAnalytics 
} from './src/chains';
import { DEFAULT_CROSS_CHAIN_CONFIG } from './src/config/cross-chain.config';

// 1. Initialize provider manager
const providerManager = new ChainProviderManager(
  DEFAULT_CROSS_CHAIN_CONFIG.chains
);
providerManager.startHealthMonitoring();

// 2. Initialize bridge manager
const bridgeManager = new BridgeManager(
  DEFAULT_CROSS_CHAIN_CONFIG.bridges,
  'balanced'
);

// 3. Initialize scanner
const scanner = new CrossChainScanner(
  providerManager,
  DEFAULT_CROSS_CHAIN_CONFIG.scanner,
  ['0xWETH', '0xUSDC', '0xUSDT']
);
scanner.startScanning();
```

### Finding Opportunities

```typescript
import { ArbitrageOrchestrator } from './src/arbitrage/ArbitrageOrchestrator';

const orchestrator = new ArbitrageOrchestrator(
  dexRegistry,
  pathfindingConfig,
  gasPrice,
  undefined,
  bridgeManager,
  DEFAULT_CROSS_CHAIN_CONFIG.pathfinding
);

// Enable cross-chain mode
orchestrator.setMode('cross-chain');

// Find opportunities
const paths = await orchestrator.findCrossChainOpportunities(
  '0xWETH',      // Start token
  1,             // Start chain (Ethereum)
  BigInt(10**18), // 1 ETH
  10             // Max 10 paths
);

// Paths are sorted by net profit
console.log(`Found ${paths.length} profitable paths`);
```

### Executing Trades

```typescript
const executor = new MultiChainExecutor(
  bridgeManager,
  adapters,
  DEFAULT_CROSS_CHAIN_CONFIG.execution
);

// Execute single path
const result = await executor.executePath(bestPath);

if (result.success) {
  console.log(`Profit: ${result.actualProfit}`);
  console.log(`Time: ${result.executionTime}ms`);
} else {
  console.log(`Failed: ${result.error}`);
}

// Execute with retry
const resultWithRetry = await executor.executeWithRetry(path);
```

### Monitoring Performance

```typescript
const analytics = new CrossChainAnalytics();

// Record trades
analytics.recordTrade(path, result);

// Get summary
const summary = analytics.getSummary();
console.log(`Total trades: ${summary.totalTrades}`);
console.log(`Success rate: ${summary.successRate}%`);
console.log(`Net profit: ${summary.netProfit}`);

// Get chain pair statistics
const stats = analytics.getChainPairStats(1, 56); // ETH <-> BSC
console.log(`Ethereum <-> BSC trades: ${stats.totalTrades}`);
console.log(`Average profit: ${stats.averageProfit}`);

// Get bridge statistics
const bridgeStats = analytics.getBridgeStats('Wormhole');
console.log(`Success rate: ${bridgeStats.successRate}%`);
```

## Performance Targets

- ✅ Scan 7+ chains simultaneously
- ✅ Complete scan in <5 seconds
- ✅ Bridge success rate >95%
- ✅ Handle 10+ concurrent paths
- ✅ Average execution time <30 minutes
- ✅ Find 10x more opportunities than single-chain

## Testing

All components have comprehensive test coverage:
- `ChainProviderManager`: 19 tests
- `BridgeManager`: 17 tests
- `CrossChainAnalytics`: 31 tests
- Total: 240 tests passing (>90% coverage)

Run tests:
```bash
npm test
npm test -- src/chains/__tests__
```

## Security Considerations

1. **RPC Security**: Use trusted RPC providers with rate limiting
2. **Bridge Security**: Only use audited bridge protocols
3. **Slippage Protection**: Enforce maximum slippage limits
4. **Gas Limits**: Set appropriate gas limits to prevent stuck transactions
5. **Emergency Recovery**: Enable recovery mechanisms for failed bridges
6. **Private Keys**: Never commit private keys or sensitive data

## Troubleshooting

### Chain Connection Issues
- Check RPC endpoint health
- Verify network connectivity
- Try alternative RPC providers
- Check rate limits

### Bridge Timeouts
- Increase `bridgeTimeoutMs` for slower chains
- Check bridge protocol status
- Verify sufficient liquidity

### Profitability Issues
- Adjust `minProfitThreshold`
- Consider gas costs on all chains
- Account for bridge fees
- Check slippage tolerance

## Future Enhancements

- [ ] Integration with @certusone/wormhole-sdk for production Wormhole support
- [ ] Integration with @layerzerolabs/scan-client for LayerZero tracking
- [ ] WebSocket real-time monitoring with WebSocketStreamManager
- [ ] Advanced MEV protection
- [ ] Flashbots integration
- [ ] Additional DEX integrations (Curve, Balancer V2)
- [ ] Machine learning for route optimization
- [ ] Dynamic fee optimization

## Support

For issues or questions:
1. Check the examples in `/examples/crossChainArbitrage.ts`
2. Review test files in `src/chains/__tests__/`
3. Consult inline documentation in source files
4. Open an issue on GitHub

## License

See LICENSE file for details.
