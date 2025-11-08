# Arbitrage Engines Documentation

## Overview

This document describes the arbitrage detection systems integrated from AxionCitadel into Copilot-Consciousness. These engines provide production-grade arbitrage opportunity detection with MEV awareness, available in both Python and TypeScript implementations.

## Architecture

The arbitrage engine system consists of multiple layers:

### Core Models (TypeScript)

**Location:** `src/arbitrage/models/`

- **ArbitrageOpportunity**: Complete opportunity data structure with lifecycle management and risk scoring
- **PathStep**: Individual swap step in an arbitrage path
- **TradeRoute**: Aggregated route model for multi-hop paths

### Core Engines (TypeScript)

**Location:** `src/arbitrage/engines/`

- **SpatialArbEngine**: Cross-DEX price differential detection
- **TriangularArbEngine**: 3-token cycle detection and analysis

### Graph Infrastructure (TypeScript)

**Location:** `src/arbitrage/graph/`

- **Graph**: Pool connectivity graph data structure
- **GraphBuilder**: Graph construction and triangle/cycle detection

---

## TypeScript Implementation

### 1. Spatial Arbitrage Engine

**File:** `src/arbitrage/engines/SpatialArbEngine.ts`

Detects price differences for the same asset across multiple DEXs.

**Key Features:**
- Cross-DEX price comparison
- 2-step path construction (buy low, sell high)
- Constant product AMM formula (x * y = k)
- Minimum profit filtering (BIPS)
- Price impact calculation
- Liquidity filtering

**Usage Example:**
```typescript
import { SpatialArbEngine, PoolState } from './src/arbitrage/engines/SpatialArbEngine';

// Initialize engine
const engine = new SpatialArbEngine({
  minProfitBps: 50,        // Minimum 0.5% profit
  minLiquidityUsd: 10000,  // Minimum $10k liquidity
  supportedProtocols: ['uniswap_v3', 'sushiswap', 'camelot'],
});

// Define pools
const pools: PoolState[] = [
  {
    poolAddress: '0x...',
    token0: '0xWETH',
    token1: '0xUSDC',
    reserve0: 1000,
    reserve1: 2000000,
    protocol: 'uniswap_v3',
    feeBps: 30,
  },
  // ... more pools
];

// Find opportunities
const opportunities = engine.findOpportunities(pools, 1.0);

// Get statistics
const stats = engine.getStatistics();
console.log(`Found ${stats.opportunitiesFound} opportunities`);
```

**API Reference:**

```typescript
class SpatialArbEngine {
  constructor(config?: SpatialArbEngineConfig)
  
  // Find arbitrage opportunities across pools
  findOpportunities(pools: PoolState[], inputAmount?: number): ArbitrageOpportunity[]
  
  // Calculate price impact of a trade
  calculatePriceImpact(pool: PoolState, amountIn: number, direction: number): number
  
  // Filter opportunities by minimum liquidity
  filterByLiquidity(
    opportunities: ArbitrageOpportunity[], 
    tokenPrices: Record<string, number>
  ): ArbitrageOpportunity[]
  
  // Get engine statistics
  getStatistics(): SpatialArbStats
}

interface PoolState {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: number;
  reserve1: number;
  protocol: string;
  feeBps?: number;
}
```

### 2. Triangular Arbitrage Engine

**File:** `src/arbitrage/engines/TriangularArbEngine.ts`

Detects circular trading paths that exploit price inefficiencies across multiple token pairs.

**Key Features:**
- Multi-hop path construction with amount propagation
- DFS-based cycle detection
- Pair map optimization for O(1) lookups
- Automatic flash loan detection
- Opportunity deduplication

**Usage Example:**
```typescript
import { TriangularArbEngine } from './src/arbitrage/engines/TriangularArbEngine';

// Initialize engine
const engine = new TriangularArbEngine({
  minProfitBps: 50,   // Minimum 0.5% profit
  maxHops: 3,         // Maximum 3 hops
  supportedProtocols: ['uniswap_v3', 'sushiswap'],
});

// Build pair map
engine.buildPairMap(pools);

// Find opportunities starting from WETH
const opportunities = engine.findOpportunities(
  pools,
  '0xWETH',  // start token
  1.0        // input amount
);

// Find all opportunities from all start tokens
const allOpportunities = engine.findAllTriangularOpportunities(pools, 1.0);
```

**API Reference:**

```typescript
class TriangularArbEngine {
  constructor(config?: TriangularArbEngineConfig)
  
  // Build pair map for efficient lookups
  buildPairMap(pools: PoolState[]): void
  
  // Find opportunities starting from a specific token
  findOpportunities(
    pools: PoolState[], 
    startToken: string, 
    inputAmount?: number
  ): ArbitrageOpportunity[]
  
  // Find opportunities for all possible start tokens
  findAllTriangularOpportunities(
    pools: PoolState[], 
    inputAmount?: number
  ): ArbitrageOpportunity[]
  
  // Get engine statistics
  getStatistics(): TriangularArbStats
}
```

### 3. Graph Infrastructure

**File:** `src/arbitrage/graph/`

Provides graph data structures and builders for arbitrage path finding.

**Usage Example:**
```typescript
import { GraphBuilder } from './src/arbitrage/graph/GraphBuilder';

// Initialize builder
const builder = new GraphBuilder({
  supportedProtocols: ['uniswap_v3'],
  minLiquidity: 1000000,
});

// Build graph from pools
const graph = builder.buildGraph(pools);

// Find all triangles (3-token cycles)
const triangles = builder.findTriangles();

// Find triangles involving a specific token
const wethTriangles = builder.findTrianglesForToken('0xWETH');

// Find cycles of specific length
const cycles = builder.findCycles('0xWETH', 3);

// Check connectivity
const isConnected = builder.areConnected('0xWETH', '0xDAI');

// Get statistics
const stats = builder.getStats();
```

**API Reference:**

```typescript
class GraphBuilder {
  constructor(config?: GraphBuilderConfig)
  
  buildGraph(pools: PoolState[]): Graph
  findTriangles(): Triangle[]
  findTrianglesForToken(token: string): Triangle[]
  findCycles(startToken: string, cycleLength?: number): Cycle[]
  areConnected(token1: string, token2: string, maxHops?: number): boolean
  findPaths(from: string, to: string, maxHops?: number): Path[]
  getStats(): GraphStats
}

interface Triangle {
  tokens: [string, string, string];
  pools: [PoolState, PoolState, PoolState];
  isValid: boolean;
}
```

### 4. Opportunity Models

**File:** `src/arbitrage/models/ArbitrageOpportunity.ts`

Complete opportunity data structure with lifecycle management.

**Key Features:**
- Status lifecycle management (IDENTIFIED → SIMULATED → EXECUTED)
- Risk scoring algorithm
- Status transition validation
- Simulation and execution result tracking

**Usage Example:**
```typescript
import {
  createArbitrageOpportunity,
  ArbitrageType,
  calculateRiskScore,
  updateOpportunityStatus,
  OpportunityStatus,
} from './src/arbitrage/models';

// Create opportunity
const opportunity = createArbitrageOpportunity({
  opportunityId: 'arb_001',
  arbType: ArbitrageType.SPATIAL,
  path: pathSteps,
  inputAmount: 1.0,
  requiresFlashLoan: false,
});

// Calculate risk
const riskScore = calculateRiskScore(opportunity);

// Update status
updateOpportunityStatus(opportunity, OpportunityStatus.SIMULATED);

// Update with simulation results
updateSimulationResults(opportunity, { netProfit: 0.05, gasUsed: 250000 });
```

---

## Python Implementation (Reference)

### 1. Spatial Arbitrage Engine (`spatial_arb_engine.py`)

Detects price differences for the same asset across multiple DEXs (Decentralized Exchanges).

**Key Features:**
- Cross-DEX price comparison
- Real-time opportunity detection
- MEV-aware profit calculation
- Multi-chain support (Arbitrum, Ethereum, Polygon, Base)

**Usage Example:**
```python
from src.arbitrage.spatial_arb_engine import SpatialArbEngine

engine = SpatialArbEngine(
    token_pair=("WETH", "USDC"),
    dexes=["uniswapV3", "sushiswap"],
    chain="arbitrum"
)

opportunities = engine.find_opportunities()
```

### 2. Triangular Arbitrage Engine (`triangular_arb_engine.py`)

Detects circular trading paths that exploit price inefficiencies across multiple token pairs.

**Key Features:**
- Multi-hop path discovery
- Cycle detection algorithms
- Profitability calculation with gas costs
- Path optimization

**Usage Example:**
```python
from src.arbitrage.triangular_arb_engine import TriangularArbEngine

engine = TriangularArbEngine(
    tokens=["WETH", "USDC", "DAI"],
    dex="uniswapV3",
    chain="arbitrum"
)

cycles = engine.find_cycles()
profitable = engine.filter_profitable(cycles)
```

### 3. Opportunity Validator (`opportunity.py`)

Validates and scores arbitrage opportunities before execution.

**Key Features:**
- Slippage calculation
- Gas cost estimation
- MEV risk assessment
- Liquidity validation
- Opportunity scoring

**Usage Example:**
```python
from src.arbitrage.opportunity import OpportunityValidator

validator = OpportunityValidator()
is_valid = validator.validate(opportunity)
score = validator.score(opportunity)
```

---

## Integration with MEV Protection

All arbitrage engines integrate with the MEV Risk Intelligence Suite:

1. **Profit Adjustment**: Profits are automatically adjusted for MEV leakage risk
2. **Real-time Monitoring**: Mempool congestion and searcher density are monitored
3. **Risk-based Filtering**: High-risk opportunities are filtered out
4. **Adaptive Execution**: Strategy adapts to network conditions

## TypeScript Orchestrators

The engines are complemented by TypeScript orchestrators in `src/arbitrage/`:

- **ArbitrageOrchestrator.ts**: Coordinates opportunity detection and execution
- **AdvancedPathFinder.ts**: Advanced path finding with graph algorithms
- **AdvancedOrchestrator.ts**: High-level orchestration with ML integration
- **ProfitabilityCalculator.ts**: MEV-aware profit calculations

## Configuration

Arbitrage engines are configured through:

1. **configs/chains/**: Network configurations
2. **configs/pools/**: DEX pool configurations
3. **configs/protocols/**: Protocol adapter settings
4. **.env**: Runtime configuration variables

## Supported DEXs

- **Uniswap V3**: Concentrated liquidity pools
- **SushiSwap**: Constant product AMM
- **Aave V3**: Flash loans for capital-free arbitrage

## Supported Chains

- **Arbitrum One**: Low gas, fast finality
- **Ethereum Mainnet**: Highest liquidity
- **Polygon**: Low cost, high throughput
- **Base**: Emerging L2 with growing liquidity

## Performance Optimization

### Gas Optimization
- Flash loans for zero-capital arbitrage
- Batch transactions where possible
- Optimized contract calls

### MEV Protection
- Private transaction pools (Flashbots)
- MEV-aware profit thresholds
- Adaptive gas pricing

### Path Optimization
- Graph algorithms for efficient path finding
- Liquidity-weighted routing
- Multi-hop optimization

## Risk Management

### Pre-execution Checks
- Minimum profit thresholds
- Maximum slippage limits
- Liquidity validation
- MEV risk assessment

### Execution Safeguards
- Deadline parameters on swaps
- Slippage protection
- Failed transaction handling
- Emergency stop mechanisms

## Examples

See the following examples for practical usage:

### TypeScript Examples
- `examples/spatialArbitrageExample.ts`: Spatial arbitrage engine usage
- `examples/triangularArbitrageExample.ts`: Triangular arbitrage engine usage  
- `examples/advancedArbitrageDemo.ts`: Advanced arbitrage detection
- `examples/multiHopArbitrage.ts`: Multi-hop path execution
- `examples/mev-aware-arbitrage.ts`: MEV-aware strategy

### Python Examples
- `examples/mev/arbitrage_detection_example.py`: Python engine usage

Run examples:
```bash
# TypeScript examples
npx ts-node examples/spatialArbitrageExample.ts
npx ts-node examples/triangularArbitrageExample.ts

# Python examples
python examples/mev/arbitrage_detection_example.py
```

## Testing

Comprehensive tests are available in:

### TypeScript Tests
- `src/arbitrage/models/__tests__/`: Model tests (13 tests)
- `src/arbitrage/engines/__tests__/`: Engine tests (31 tests)
- `src/arbitrage/graph/__tests__/`: Graph infrastructure tests (12 tests)
- `src/arbitrage/__tests__/`: Legacy arbitrage tests (124 tests)

### Python Tests
- `tests/mev/`: Python MEV integration tests

Run tests with:
```bash
# All TypeScript tests
npm test

# Specific test suites
npm test -- src/arbitrage/models
npm test -- src/arbitrage/engines
npm test -- src/arbitrage/graph

# Python tests
python -m unittest discover tests/mev
```

## Future Enhancements

- [ ] Cross-chain arbitrage (via bridges)
- [ ] MEV bundle submission
- [ ] Advanced ML-based opportunity prediction
- [ ] Real-time dashboard integration
- [ ] Multi-DEX aggregator routing

## References

- Uniswap V3 Documentation: https://docs.uniswap.org/
- Aave V3 Documentation: https://docs.aave.com/
- MEV Research: https://ethereum.org/en/developers/docs/mev/
- AxionCitadel: Original implementation source

## Credits

**TypeScript Implementation:**
- Arbitrage engines and models: AxionCitadel by metalxalloy
- TypeScript port and integration: StableExo
- Date: 2025-11-08

**Python Implementation:**
- Original engines: AxionCitadel by metalxalloy  
- Integration: StableExo
- Date: 2025-11-07

## Version History

- **v2.0** (2025-11-08): TypeScript implementation of arbitrage engines
  - SpatialArbEngine (TypeScript)
  - TriangularArbEngine (TypeScript)
  - Graph infrastructure (TypeScript)
  - Complete model system (TypeScript)
  - Comprehensive tests (56 new tests)
  - Example scripts
  
- **v1.0** (2025-11-07): Initial Python integration
  - Python arbitrage engines
  - MEV profit calculator module
  - Configuration system
  - Examples and tests
