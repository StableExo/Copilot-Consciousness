# Live-Fire Arbitrage Execution Guide

## Overview

This guide explains how to use the enhanced arbitrage execution system that supports **Aave V3 flashloans**, **multi-DEX routing**, and **multi-hop arbitrage** on Base network.

## Architecture

The live-fire execution system consists of four main components:

### 1. FlashLoanExecutor
- Handles Aave V3 flashloan execution through FlashSwapV2 contract
- Encodes multi-step swap paths for on-chain execution
- Extracts profit from transaction receipts
- Provides gas estimation

### 2. MultiDexPathBuilder
- Finds arbitrage opportunities using SpatialArbEngine and TriangularArbEngine
- Builds executable swap paths across multiple DEXs
- Converts opportunities into flashloan-ready parameters
- Supports Uniswap V3, Aerodrome, SushiSwap

### 3. PoolDataFetcher
- Fetches real-time on-chain pool data from Uniswap V3 pools
- Implements smart caching (12s = 1 Base block)
- Parallel data fetching for performance
- Calculates reserves from liquidity and sqrt price

### 4. Enhanced BaseArbitrageRunner
- Orchestrates the entire execution flow
- Integrates all safety rails (NonceManager, SimulationService, MEV protection)
- Supports both flashloan and simple execution modes
- Real-time monitoring via ExecutionMetrics

## Configuration

### Enable Live-Fire Mode

Update `configs/strategies/base_weth_usdc.json`:

```json
{
  "execution": {
    "enableFlashLoans": true,      // Enable Aave V3 flashloans
    "enableMultiDex": true,        // Enable multi-DEX routing
    "requireSimulation": true,      // Keep simulation for safety
    "maxGasLimit": 1000000,
    "simulationTimeout": 10000,
    "maxConcurrentTx": 1
  },
  "contracts": {
    "flashSwapV2": "${FLASHSWAP_V2_ADDRESS}",
    "aaveV3Pool": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
  },
  "targetPools": [
    {
      "name": "Uniswap V3 WETH/USDC 0.05%",
      "address": "0xd0b53D9277642d899DF5C87A3966A349A798F224",
      "dex": "uniswap_v3",
      "fee": 500,
      "priority": 1
    },
    {
      "name": "Aerodrome WETH/USDC",
      "address": "0xcDAC0d6c6C59727a65F871236188350531885C43",
      "dex": "aerodrome",
      "fee": 500,
      "priority": 3,
      "enabled": true
    }
  ]
}
```

### Environment Variables

Create or update `.env`:

```bash
# Network
BASE_RPC_URL=https://mainnet.base.org

# Wallet (KEEP SECURE!)
WALLET_PRIVATE_KEY=your_private_key_here

# Contracts
FLASHSWAP_V2_ADDRESS=your_deployed_flashswapv2_address
```

## Execution Flow

### 1. Initialization

```typescript
const runner = new BaseArbitrageRunner(config);
await runner.start();
```

The runner initializes:
- NonceManager (safe transaction submission)
- SimulationService (pre-execution validation)
- FlashLoanExecutor (if enabled)
- MultiDexPathBuilder (if enabled)
- PoolDataFetcher (real on-chain data)
- MEVSensorHub (risk assessment)

### 2. Cycle Execution

Every cycle (default 12s):

1. **Fetch Pool Data**
   - PoolDataFetcher queries on-chain pool states
   - Data is cached for 12 seconds
   - Parallel fetching for performance

2. **Find Opportunities**
   - SpatialArbEngine detects cross-DEX price differences
   - TriangularArbEngine finds multi-hop cycles
   - Opportunities ranked by net profit

3. **Build Execution Path**
   - Best opportunity selected
   - MultiDexPathBuilder creates executable swap path
   - Slippage protection applied

4. **MEV Risk Assessment**
   - MEVSensorHub calculates current network conditions
   - Profit adjusted for MEV risk
   - High-risk opportunities skipped

5. **Execution Decision**
   ```
   IF (netProfit >= minThreshold && mevRisk < maxRisk):
       Execute via FlashLoanExecutor
   ELSE:
       Skip opportunity
   ```

6. **Flashloan Execution** (if approved)
   - Aave V3 flashloan triggered
   - FlashSwapV2 executes multi-step swaps
   - Profit extracted and transferred to owner
   - All events logged

### 3. Safety Rails

Every execution is protected by:

✅ **NonceManager**: Prevents nonce collisions, auto-recovery
✅ **SimulationService**: Pre-validates transactions (optional)
✅ **ExecutionMetrics**: Tracks success/failure rates
✅ **MEV Protection**: Skips high-risk opportunities
✅ **Consciousness**: Learns from execution history

## Running the Bot

### Basic Usage

```bash
npm run build
npx ts-node examples/arbitrage/base_weth_usdc_runner.ts
```

### What to Expect

```
=== Base WETH/USDC Arbitrage Strategy ===

Configuration loaded:
  Network: Base (8453)
  Target pools: 3
  Min profit threshold: 0.001 ETH
  Cycle interval: 12000ms
  MEV protection: Enabled
  Flashloans: Enabled
  Multi-DEX: Enabled

[BaseArbitrageRunner] Initializing advanced components...
[BaseArbitrageRunner] ✓ NonceManager initialized
[BaseArbitrageRunner] ✓ SimulationService initialized
[BaseArbitrageRunner] ✓ FlashLoanExecutor initialized
[BaseArbitrageRunner] ✓ MultiDexPathBuilder initialized
[BaseArbitrageRunner] ✓ PoolDataFetcher initialized

[BaseArbitrageRunner] === Cycle #1 Starting ===
[PoolDataFetcher] Fetching data for 3 pools...
[PoolDataFetcher] Successfully fetched 3/3 pools
[MultiDexPathBuilder] Analyzing 3 pools for opportunities...
[MultiDexPathBuilder] Found 0 spatial opportunities
[MultiDexPathBuilder] Found 0 triangular opportunities
[BaseArbitrageRunner] No multi-DEX opportunities found
[BaseArbitrageRunner] === Cycle #1 Complete (2453ms) ===
```

### When an Opportunity is Found

```
[BaseArbitrageRunner] === Cycle #42 Starting ===
[MultiDexPathBuilder] Found 2 spatial opportunities
[MultiDexPathBuilder] Building path for spatial opportunity...
[BaseArbitrageRunner] Opportunity found!
  Profit: 0.00234 ETH
  MEV Risk: 0.08
  Execution recommended: true

[BaseArbitrageRunner] [exec_1234567890_42] Starting execution pipeline...
[BaseArbitrageRunner] [exec_1234567890_42] Using Aave flashloan execution
  Type: spatial
  Borrow: 1.5 WETH
  Steps: 2
  Expected profit: 0.00234 ETH

[FlashLoanExecutor] Preparing flashloan execution...
[FlashLoanExecutor] Building flashloan transaction...
[FlashLoanExecutor] Submitting flashloan transaction...
[FlashLoanExecutor] Transaction submitted: 0xabcdef...
[FlashLoanExecutor] ✓ Flashloan execution successful!
  TX Hash: 0xabcdef...
  Profit: 0.00234 ETH
  Gas Used: 347892

[Event] Execution completed successfully!
```

## Monitoring

### Execution Metrics

The bot tracks detailed metrics:

```
[BaseArbitrageRunner] Final Execution Metrics:

╔══════════════════════════════════════════════════════╗
║        Execution Metrics Summary Report            ║
╠══════════════════════════════════════════════════════╣
║ Opportunities Found:                            142 ║
║ Simulations Attempted:                           89 ║
║ Simulation Success Rate:                     84.27% ║
╟──────────────────────────────────────────────────────╢
║ Transactions Submitted:                          75 ║
║ Transactions Confirmed:                          72 ║
║ Transaction Success Rate:                    96.00% ║
╟──────────────────────────────────────────────────────╢
║ Total Gas Used:                           21847293 ║
║ Total Profit (ETH):                          2.4589 ║
║ Nonce Resyncs:                                    2 ║
╚══════════════════════════════════════════════════════╝
```

### Event Listeners

Monitor specific events:

```typescript
runner.on('opportunityFound', (data) => {
  console.log('Opportunity:', data);
});

runner.on('executionComplete', (result) => {
  console.log('Success!', result.txHash);
});

runner.on('executionFailed', (error) => {
  console.error('Failed:', error.message);
});
```

## Troubleshooting

### No Opportunities Found

This is normal! Arbitrage opportunities are rare, especially with:
- High competition from other bots
- Efficient DEX markets
- Conservative profit thresholds

**Solutions**:
- Lower `minProfitThresholdEth` (but increase risk)
- Add more pools to scan
- Wait for market volatility

### RPC Rate Limits

If you see "rate limit exceeded":

**Solutions**:
- Use a paid RPC provider (Alchemy, Infura, QuickNode)
- Increase `cycleIntervalMs` to reduce request frequency
- Enable PoolDataFetcher caching (already enabled by default)

### High Gas Costs

Flashloan execution is gas-intensive:

**Solutions**:
- Increase `minProfitThresholdEth` to ensure profit > gas cost
- Monitor `maxGasPriceGwei` setting
- Execute only during low gas periods

### Transaction Reverts

If transactions revert on-chain:

**Solutions**:
- Enable `requireSimulation` (already enabled)
- Increase `maxSlippageBps` for more tolerance
- Check FlashSwapV2 contract has proper DEX approvals

## Advanced Configuration

### Custom Profit Threshold

Different thresholds per token pair:

```typescript
// In your runner configuration
const customThresholds = {
  'WETH/USDC': 0.001,  // 0.1% minimum
  'WETH/USDT': 0.002,  // 0.2% minimum
};
```

### Priority Pools

Order pools by priority:

```json
{
  "targetPools": [
    {
      "address": "...",
      "priority": 1,  // Checked first
      "enabled": true
    }
  ]
}
```

### MEV Protection Tuning

Adjust risk tolerance:

```json
{
  "mevProtection": {
    "enabled": true,
    "riskThreshold": 0.15,  // 15% max risk
    "adaptiveThreshold": true,  // Adjust based on conditions
    "riskParams": {
      "baseRisk": 0.001,
      "valueSensitivity": 0.12,
      "congestionFactor": 0.25,
      "searcherDensityFactor": 0.20
    }
  }
}
```

## Security Best Practices

1. **Private Keys**: Never commit `.env` to version control
2. **Start Small**: Test with small amounts first
3. **Monitor Closely**: Watch execution metrics
4. **Set Limits**: Use `maxGasLimit` and `minProfitThreshold`
5. **Emergency Stop**: Use Ctrl+C for graceful shutdown

## Next Steps

1. Deploy FlashSwapV2 contract to Base mainnet
2. Fund wallet with ETH for gas
3. Configure `.env` with credentials
4. Start with conservative thresholds
5. Monitor first 24h closely
6. Gradually optimize parameters

## Support

For issues or questions:
- Check logs in console output
- Review ExecutionMetrics summary
- Examine failed transaction hashes on BaseScan
- Open GitHub issue with relevant logs
