# Multi-Hop Arbitrage Module

This module implements sophisticated multi-hop arbitrage functionality for detecting and executing profitable trading opportunities across multiple DEXs and token pairs.

## Features

### 1. Graph-Based Pathfinding
- **PathFinder**: Implements a DFS-based algorithm to discover profitable arbitrage routes
- Supports up to configurable max hops (e.g., 3-4 hops)
- Detects cycles and prevents infinite loops
- Calculates swap outputs using constant product formula (x * y = k)
- Accounts for trading fees at each hop

### 2. Multi-Token Data Fetching
- **MultiHopDataFetcher**: Fetches real-time pool data from multiple DEXs
- Supports both EVM and Solana networks
- Caches pool data for improved performance
- Validates liquidity thresholds before adding edges to graph
- Calculates pool addresses using CREATE2 for Uniswap V2 style DEXs

### 3. Enhanced Profitability Calculations
- **ProfitabilityCalculator**: Comprehensive profit analysis
- Cumulative fee calculations across all hops
- Slippage impact estimation (compounds across hops)
- Gas cost integration (per-hop gas estimates * gas price)
- ROI percentage calculations
- Price impact analysis based on trade size vs. liquidity

### 4. Smart Contract Integration
- **ArbitrageExecutor.sol**: Solidity contract for on-chain execution
- Flash loan integration with Aave V3
- Multi-hop swap execution in a single transaction
- Route validation and profit verification
- Backward compatible with 2-hop arbitrage

### 5. Visualization & Monitoring
- **ArbitrageVisualizer**: Text-based dashboard for opportunities
- Path formatting with route details
- Opportunity tables sorted by profitability
- Summary statistics and metrics
- Route map visualization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ArbitrageOrchestrator                      │
│  (Main coordinator for multi-hop arbitrage operations)      │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PathFinder  │  │DataFetcher   │  │ Profit Calc  │
│              │  │              │  │              │
│ - DFS Search │  │ - Pool Data  │  │ - Fee Calc   │
│ - Cycle Det. │  │ - Liquidity  │  │ - Slippage   │
│ - Path Build │  │ - Caching    │  │ - Gas Cost   │
└──────────────┘  └──────────────┘  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ DEX Registry │
                  │              │
                  │ - 9 DEXs     │
                  │ - EVM + Sol  │
                  └──────────────┘
```

## Usage

### Basic Example

```typescript
import { DEXRegistry } from '../dex/core/DEXRegistry';
import { ArbitrageOrchestrator, PathfindingConfig } from './arbitrage';

// Initialize
const registry = new DEXRegistry();
const config: PathfindingConfig = {
  maxHops: 4,
  minProfitThreshold: BigInt('1000000000000000000'), // 1 token
  maxSlippage: 0.05,
  gasPrice: BigInt(50000000000) // 50 gwei
};

const orchestrator = new ArbitrageOrchestrator(registry, config, config.gasPrice);

// Find opportunities
const tokens = ['0xDAI...', '0xWETH...', '0xUSDC...'];
const startAmount = BigInt('1000000000000000000000'); // 1000 tokens
const paths = await orchestrator.findOpportunities(tokens, startAmount);

// Visualize results
const visualizer = new ArbitrageVisualizer();
console.log(visualizer.formatPathTable(paths));
console.log(visualizer.formatPath(paths[0]));
```

### Smart Contract Execution

```typescript
// Deploy contract
const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
const executor = await ArbitrageExecutor.deploy(aavePoolProvider);

// Prepare multi-hop parameters
const multiHopParams = {
  routers: path.hops.map(h => getDEXRouter(h.dexName)),
  paths: path.hops.map(h => [h.tokenIn, h.tokenOut]),
  minAmounts: path.hops.map(h => calculateMinAmount(h.amountOut))
};

// Execute flash loan
await executor.requestMultiHopFlashLoan(
  startToken,
  amount,
  multiHopParams
);
```

## Configuration

### PathfindingConfig

```typescript
interface PathfindingConfig {
  maxHops: number;              // Maximum number of swaps (e.g., 3-4)
  minProfitThreshold: bigint;   // Minimum profit to consider opportunity
  maxSlippage: number;          // Maximum acceptable slippage (e.g., 0.05 = 5%)
  gasPrice: bigint;             // Current gas price for cost calculations
}
```

### Recommended Settings

- **Conservative**: maxHops: 3, minProfit: 10 tokens, maxSlippage: 0.03
- **Moderate**: maxHops: 4, minProfit: 5 tokens, maxSlippage: 0.05
- **Aggressive**: maxHops: 5, minProfit: 1 token, maxSlippage: 0.10

## Testing

The module includes comprehensive unit tests:

```bash
npm test -- src/arbitrage/__tests__/
```

Test coverage includes:
- PathFinder algorithm correctness
- Profitability calculations
- Edge cases (zero liquidity, high fees, etc.)
- Orchestrator integration
- Configuration updates

## Performance Considerations

1. **Graph Size**: Number of edges grows as O(n²) with token count
2. **Path Search**: DFS explores exponentially with depth; limit maxHops
3. **Caching**: Pool data is cached to reduce RPC calls
4. **Gas Costs**: Always factor in execution costs; higher gas = higher profit threshold

## Supported DEXs

Currently integrated:
- Uniswap V2 & V3 (Ethereum mainnet)
- SushiSwap (Ethereum + Base)
- Curve
- Balancer
- 1inch
- PancakeSwap V3
- Raydium (Solana)

## Security Considerations

1. **Flash Loan Repayment**: Always verify profit before execution
2. **Slippage Protection**: Set appropriate minAmounts for each hop
3. **Front-Running**: Consider MEV protection strategies
4. **Oracle Manipulation**: Validate prices across multiple sources
5. **Contract Security**: ArbitrageExecutor uses checks-effects-interactions pattern

## Future Enhancements

- [ ] MEV protection via Flashbots integration
- [ ] Machine learning for optimal path selection
- [ ] Real-time price feed integration
- [ ] Automated execution based on profitability thresholds
- [ ] Multi-chain arbitrage support
- [ ] Gas optimization strategies
- [ ] Historical performance tracking

## License

MIT License - see LICENSE file for details
