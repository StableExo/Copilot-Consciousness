# AxionCitadel Integration: Base WETH/USDC Arbitrage Strategy

## Overview

This document describes the integration of AxionCitadel's best practices into Copilot-Consciousness for running an intelligent, MEV-aware arbitrage strategy on Base network targeting WETH/USDC pairs.

## What Was Integrated

### 1. **Bot Runner Architecture** (from AxionCitadel)

**Source**: `AxionCitadel/src/services/jobs/BotCycleService.js`

**Adapted To**: `src/services/BaseArbitrageRunner.ts`

**Key Improvements**:
- ✅ Configurable cycle intervals optimized for Base L2 (12s block time)
- ✅ MEV-aware execution timing
- ✅ Graceful shutdown and error handling
- ✅ Cycle timeout protection to prevent hanging
- ✅ Event-driven architecture for monitoring
- ✅ Integration with consciousness memory system

### 2. **MEV Risk Intelligence** (from AxionCitadel)

**Source**: `AxionCitadel/src/services/intelligence/MEVSensorHub.ts`

**Adapted To**: Enhanced existing `src/mev/sensors/MEVSensorHub.ts`

**Key Features**:
- ✅ Real-time mempool congestion tracking
- ✅ Searcher density monitoring
- ✅ Game-theoretic MEV risk calculation
- ✅ Base L2-specific optimizations
- ✅ Composite risk scoring

### 3. **Profit Calculation** (from AxionCitadel)

**Source**: `AxionCitadel/mev_profit_calculator/`

**Created**: `src/mev/profit_calculator/ProfitCalculator.ts`

**Key Features**:
- ✅ MEV-adjusted profit calculations
- ✅ Transaction type-specific risk multipliers
- ✅ Breakeven gas price calculations
- ✅ Congestion scenario simulation
- ✅ Calibratable risk parameters

### 4. **Flash Loan Execution** (from AxionCitadel)

**Source**: `AxionCitadel/src/core/execution/FlashSwapExecutor.js`

**Enhanced**: Existing `src/execution/FlashSwapExecutor.ts`

**Best Practices Adopted**:
- ✅ Nonce management for reliability
- ✅ Transaction timeout handling
- ✅ Dynamic gas estimation
- ✅ Graceful error recovery

## New Intelligence Features

### 1. **Consciousness Integration**

**File**: `src/consciousness/ArbitrageConsciousness.ts`

**Capabilities**:
- 🧠 **Pattern Detection**: Identifies temporal, congestion-based, and profitability patterns
- 🧠 **Learning System**: Adjusts strategy parameters based on historical performance
- 🧠 **Memory Integration**: Records all executions in consciousness memory for long-term learning
- 🧠 **Ethical Review**: Applies ethical reasoning to execution decisions

**Pattern Types Detected**:
1. **Temporal Patterns**: Identifies most profitable hours of the day
2. **Congestion Patterns**: Correlates success rate with network congestion
3. **Profitability Trends**: Detects improving/declining profitability over time

**Learning Capabilities**:
1. **MEV Risk Calibration**: Adjusts risk parameters based on actual vs. expected outcomes
2. **Profit Threshold Optimization**: Learns optimal minimum profit thresholds
3. **Strategy Parameter Tuning**: Suggests improvements based on historical data

### 2. **Adaptive MEV Protection**

**Features**:
- Dynamic risk threshold adjustment based on market conditions
- Transaction type-specific frontrun probabilities
- Congestion-aware execution timing
- Composite risk scoring for better decision making

### 3. **Base L2 Optimizations**

**Optimizations**:
- 12-second cycle intervals aligned with Base block time
- Lower MEV risk parameters (Base has less MEV than Ethereum mainnet)
- Gas optimization for L2 economics
- Focus on Uniswap V3 pools with high liquidity

## Configuration

### Strategy Configuration

Location: `configs/strategies/base_weth_usdc.json`

Key parameters:
```json
{
  "strategy": {
    "minProfitThresholdEth": 0.001,      // Minimum profit to execute
    "cycleIntervalMs": 12000,             // Aligned with Base block time
    "stopOnFirstExecution": false,        // Keep running after first trade
    "maxConcurrentCycles": 1,             // Prevent cycle overlap
    "cycleTimeoutMs": 60000               // Timeout protection
  },
  "mevProtection": {
    "enabled": true,
    "riskThreshold": 0.15,                // Max acceptable MEV risk (15%)
    "adaptiveThreshold": true              // Adjust based on conditions
  }
}
```

### Target Pools

Currently configured pools:
1. **Uniswap V3 WETH/USDC 0.05%** - Primary target (highest volume)
2. **Uniswap V3 WETH/USDC 0.3%** - Secondary target
3. **Aerodrome WETH/USDC** - Future expansion (disabled)

## Usage

### Prerequisites

1. Deploy FlashSwapV2 contract on Base:
   ```bash
   npm run deploy:flashswapv2
   ```

2. Set environment variables in `.env`:
   ```bash
   BASE_RPC_URL=https://mainnet.base.org
   WALLET_PRIVATE_KEY=0x...
   FLASHSWAP_V2_ADDRESS=0x...  # From deployment
   ```

3. Fund wallet with:
   - ETH for gas (~0.01 ETH)
   - Optional: WETH for testing (~0.003 ETH)

### Running the Bot

```bash
# Compile TypeScript
npm run build

# Run the Base WETH/USDC strategy
npx ts-node examples/arbitrage/base_weth_usdc_runner.ts
```

### Monitoring

The bot emits events you can listen to:

```typescript
runner.on('cycleComplete', (data) => {
  console.log(`Cycle #${data.cycleNumber} done in ${data.duration}ms`);
});

runner.on('executionComplete', (result) => {
  console.log(`Profit: ${result.profit} ETH`);
});

consciousness.on('patternDetected', (pattern) => {
  console.log(`Pattern: ${pattern.description}`);
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  BaseArbitrageRunner                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Cycle Loop (12s intervals)                       │  │
│  │  1. Check MEV conditions                          │  │
│  │  2. Scan for opportunities                        │  │
│  │  3. Calculate MEV-adjusted profit                 │  │
│  │  4. Execute if profitable & safe                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ├───► MEVSensorHub
                          │     ├─ Mempool Congestion
                          │     └─ Searcher Density
                          │
                          ├───► ProfitCalculator
                          │     ├─ MEV Risk Model
                          │     └─ Adjusted Profit
                          │
                          ├───► FlashSwapExecutor
                          │     ├─ Nonce Manager
                          │     └─ Gas Optimizer
                          │
                          └───► ArbitrageConsciousness
                                ├─ Pattern Detection
                                ├─ Learning System
                                └─ Ethical Review
```

## Performance Metrics

Expected performance on Base:
- **Cycle Time**: ~1-3 seconds per scan cycle
- **MEV Risk**: 5-15% (lower than Ethereum due to less competition)
- **Min Profitable Opportunity**: 0.001 ETH ($2-3 USD)
- **Gas Cost**: ~$0.01-0.05 per transaction (Base L2 fees)

## Safety Features

1. **MEV Protection**:
   - Risk-adjusted profit calculations
   - Congestion-aware execution timing
   - Frontrun probability estimation

2. **Execution Safety**:
   - Cycle timeout protection (60s max)
   - Graceful shutdown on errors
   - Transaction simulation before submission
   - Nonce conflict prevention

3. **Ethical Review**:
   - Profit sustainability check
   - Network resource consumption validation
   - Risk threshold enforcement

## Learning & Adaptation

The system learns from every execution:

1. **Short-term Learning** (per session):
   - MEV risk calibration
   - Profit threshold optimization
   - Gas price adjustment

2. **Long-term Learning** (across sessions):
   - Temporal pattern detection
   - Market regime identification
   - Strategy parameter evolution

3. **Pattern Detection**:
   - Identifies best trading hours
   - Detects congestion-success correlations
   - Tracks profitability trends

## Comparison: AxionCitadel vs. Enhanced Copilot-Consciousness

| Feature | AxionCitadel | Copilot-Consciousness |
|---------|--------------|----------------------|
| Bot Runner | ✅ BotCycleService | ✅ BaseArbitrageRunner (enhanced) |
| MEV Protection | ✅ Basic | ✅ Advanced + Adaptive |
| Flash Loans | ✅ Aave V3 | ✅ Aave V3 (same) |
| Target Network | Arbitrum | Base |
| Pattern Detection | ❌ None | ✅ Consciousness-powered |
| Learning System | ❌ Static | ✅ Dynamic learning |
| Ethical Review | ❌ None | ✅ Ethics engine |
| Memory Integration | ❌ None | ✅ Full consciousness |

## Future Enhancements

1. **Cross-DEX Expansion**:
   - Add Aerodrome pools
   - Add Velodrome pools
   - Add Balancer V2 pools

2. **ML Integration**:
   - LSTM-based profit prediction
   - Opportunity scoring models
   - Gas price forecasting

3. **Bundle Submission**:
   - Direct builder submission (if Base supports)
   - Priority fee optimization

4. **Multi-Strategy**:
   - Triangular arbitrage
   - Cross-chain arbitrage via bridges
   - Liquidity provision strategies

## Troubleshooting

### No Opportunities Found

**Possible causes**:
1. Pool prices are efficient (no arbitrage exists)
2. Profit threshold too high
3. MEV risk threshold too conservative

**Solutions**:
- Lower `minProfitThresholdEth` in config
- Increase `mevRiskThreshold` (carefully)
- Add more target pools

### High MEV Risk

**Possible causes**:
1. Network congestion is high
2. Many searchers competing
3. Large opportunity size

**Solutions**:
- Wait for lower congestion
- Reduce opportunity size
- Adjust MEV risk parameters

### Execution Failures

**Possible causes**:
1. Insufficient gas price
2. Slippage too high
3. Pool state changed

**Solutions**:
- Increase `maxGasPriceGwei`
- Increase `maxSlippageBps`
- Reduce `cycleIntervalMs` for faster execution

## Security Considerations

⚠️ **WARNING**: This is experimental software. Use at your own risk.

1. **Private Key Security**:
   - Never commit private keys to git
   - Use hardware wallet for mainnet
   - Limit funds in hot wallet

2. **Contract Security**:
   - FlashSwapV2 is audited but verify yourself
   - Test on testnet first
   - Use minimal funds initially

3. **MEV Exposure**:
   - MEV protection reduces but doesn't eliminate risk
   - Large opportunities attract more competition
   - Consider private transaction submission

## Credits

**AxionCitadel Components Adapted**:
- BotCycleService architecture
- MEV sensor hub design
- Flash loan execution patterns
- Profit calculation models

**Original Author**: metalxalloy  
**Repository**: https://github.com/metalxalloy/AxionCitadel

**Enhanced Integration**:
- Consciousness integration
- Learning system
- Pattern detection
- Ethical review

**Repository**: https://github.com/StableExo/Copilot-Consciousness

## License

MIT License (same as AxionCitadel)
