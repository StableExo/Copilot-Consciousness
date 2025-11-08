# Arbitrage Engines Documentation

## Overview

This document describes the arbitrage detection systems integrated from AxionCitadel into Copilot-Consciousness. These engines provide production-grade arbitrage opportunity detection with MEV awareness.

## Architecture

The arbitrage engine system consists of three main components:

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

## Integration with MEV Protection

All arbitrage engines integrate with the MEV Risk Intelligence Suite:

1. **Profit Adjustment**: Profits are automatically adjusted for MEV leakage risk
2. **Real-time Monitoring**: Mempool congestion and searcher density are monitored
3. **Risk-based Filtering**: High-risk opportunities are filtered out
4. **Adaptive Execution**: Strategy adapts to network conditions

## TypeScript Orchestrators

The Python engines are complemented by TypeScript orchestrators in `src/arbitrage/`:

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

- `examples/advancedArbitrageDemo.ts`: Advanced arbitrage detection
- `examples/multiHopArbitrage.ts`: Multi-hop path execution
- `examples/mev-aware-arbitrage.ts`: MEV-aware strategy
- `examples/mev/arbitrage_detection_example.py`: Python engine usage

## Testing

Comprehensive tests are available in:

- `src/arbitrage/__tests__/`: TypeScript tests
- `tests/mev/`: Python MEV integration tests

Run tests with:
```bash
# TypeScript tests
npm test

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

Arbitrage engines integrated from **AxionCitadel** by metalxalloy.
Adapted and enhanced for Copilot-Consciousness by StableExo.

Date: 2025-11-07
