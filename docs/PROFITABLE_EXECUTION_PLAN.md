# TheWarden: Path to Profitable Execution - Implementation Plan

## Executive Summary

Based on analysis of the current logs showing **0 valid pools with sufficient liquidity** being found despite scanning **504+ potential pools**, this document outlines a comprehensive plan to improve TheWarden's ability to find and execute profitable arbitrage opportunities.

## Current State Analysis

### Observations from Logs
- **Scanning**: 90+ cycles completed, 9 tokens across 7 DEXes on Base
- **Pool Detection**: Checking 84-504 pools per scan cycle
- **Results**: 0 valid pools with sufficient liquidity found
- **DEXes Active**: Uniswap V3, Aerodrome, BaseSwap, PancakeSwap V3, Velodrome, Uniswap V2, SushiSwap

### Root Cause Analysis
1. **Liquidity Thresholds Too High**: Current thresholds (100+ ETH equivalent) may be filtering out profitable smaller pools
2. **Pool Address Calculation**: Some DEXes may use different pool address derivation methods
3. **V3 Liquidity Misinterpretation**: V3 concentrated liquidity values are being scaled but may still be over-filtered
4. **Missing Popular Pools**: Some high-volume pools on Base may not be in the scan scope

---

## Phase 1: Pool Detection Improvements (Immediate Priority)

### 1.1 Lower Liquidity Thresholds
**Problem**: Current thresholds filter out pools that could still be profitable for smaller trades.

**Current Thresholds (Base)**:
- Uniswap V3: 100 ETH
- Aerodrome: 100 ETH
- BaseSwap: 50 ETH

**Proposed Thresholds**:
```typescript
// Tiered thresholds based on expected trade size
const BASE_LIQUIDITY_THRESHOLDS = {
  'uniswapV3': parseEther('10'),      // 10 ETH - smaller but still viable
  'aerodrome': parseEther('5'),       // 5 ETH - Aerodrome has many small pools
  'baseswap': parseEther('1'),        // 1 ETH - V2 style, lower volume
  'pancakeswapV3': parseEther('5'),   // 5 ETH
  'velodrome': parseEther('5'),       // 5 ETH
};
```

**Implementation**:
- Update `src/dex/core/DEXRegistry.ts` with lower thresholds
- Add environment variable overrides: `LIQUIDITY_THRESHOLD_MULTIPLIER`

### 1.2 Fix Pool Discovery for V3 Protocols
**Problem**: V3 pools may not be correctly discovered due to fee tier iteration issues.

**Implementation**:
```typescript
// Enhanced V3 pool discovery with all fee tiers
const FEE_TIERS = [100, 500, 3000, 10000]; // All standard tiers
const PANCAKE_FEE_TIERS = [100, 500, 2500, 10000]; // PancakeSwap specific

// Add retry logic for RPC failures
async function discoverV3Pool(token0, token1, feeTier) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await factory.getPool(token0, token1, feeTier);
    } catch (error) {
      await delay(100 * (attempt + 1));
    }
  }
  return null;
}
```

### 1.3 Add Known Pool Preloading for Base
**Problem**: Discovery is slow and may miss pools.

**Implementation**: Create a curated list of known high-volume Base pools:
```json
{
  "base_known_pools": [
    {"dex": "uniswapV3", "token0": "WETH", "token1": "USDC", "fee": 500, "address": "0x..."},
    {"dex": "uniswapV3", "token0": "WETH", "token1": "USDbC", "fee": 500, "address": "0x..."},
    {"dex": "aerodrome", "token0": "WETH", "token1": "AERO", "address": "0x..."},
    // ... more known pools
  ]
}
```

---

## Phase 2: Profitability Calculation Fixes

### 2.1 Accurate Gas Cost Estimation
**Problem**: Gas costs may be overestimated, filtering out profitable opportunities.

**Implementation**:
```typescript
interface GasEstimates {
  base: {
    simpleSwap: 150000,
    multiHopSwap: 250000,
    flashSwap: 300000,
  },
  ethereum: {
    simpleSwap: 200000,
    multiHopSwap: 400000,
    flashSwap: 500000,
  }
}

// Dynamic gas estimation based on path complexity
function estimateGas(path: ArbitragePath, chainId: number): bigint {
  const baseGas = path.hops.length === 1 ? 150000 : 250000;
  const perHopGas = path.hops.length * 50000;
  return BigInt(baseGas + perHopGas);
}
```

### 2.2 Slippage Model Improvements
**Problem**: Slippage calculations may not reflect actual market conditions.

**Implementation**:
```typescript
// Use actual liquidity depth for slippage calculation
function calculateRealisticSlippage(
  amountIn: bigint,
  poolLiquidity: bigint,
  currentPrice: bigint
): number {
  // Price impact = amountIn / poolLiquidity
  const priceImpact = Number(amountIn * 10000n / poolLiquidity) / 10000;
  
  // Add buffer for MEV and timing
  const mevBuffer = 0.003; // 0.3% MEV buffer
  
  return priceImpact + mevBuffer;
}
```

### 2.3 Min Profit Threshold Adjustments
**Current**: 0.5% min profit
**Proposed**: Environment-configurable with sane defaults

```typescript
const MIN_PROFIT_CONFIG = {
  absoluteMin: parseEther('0.001'),  // 0.001 ETH absolute minimum
  percentageMin: 0.1,                 // 0.1% minimum ROI
  gasMultiplier: 1.5,                 // 1.5x gas cost as profit floor
};
```

---

## Phase 3: Execution Path Improvements

### 3.1 Flash Loan Integration (Aave V3 on Base)
**Problem**: Capital constraints limit arbitrage size.

**Implementation**:
- Base Aave V3 Pool: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
- Flash loan fee: 0.09%
- Available assets: WETH, USDC, USDbC

```typescript
interface FlashLoanExecution {
  asset: string;
  amount: bigint;
  path: ArbitragePath;
  minProfit: bigint; // Must cover 0.09% flash loan fee + gas
}
```

### 3.2 Direct Quoter Integration
**Problem**: Reserve-based price calculations may be inaccurate.

**Implementation**:
```typescript
// Use on-chain quoters for accurate pricing
const QUOTERS = {
  '8453': { // Base
    uniswapV3: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  }
};

async function getExactQuote(path: ArbitragePath): Promise<bigint> {
  // Call quoter.quoteExactInput for accurate output
  return await quoter.quoteExactInput(path.encoded, path.amountIn);
}
```

### 3.3 Transaction Simulation Before Execution
**Problem**: Transactions may revert, wasting gas.

**Implementation**:
```typescript
// Simulate transaction before sending
async function simulateArbitrage(path: ArbitragePath): Promise<SimulationResult> {
  const calldata = encodeArbitragePath(path);
  
  try {
    await provider.call({
      to: executorContract,
      data: calldata,
      value: 0n,
    });
    return { success: true };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}
```

---

## Phase 4: MEV Protection & Execution

### 4.1 Flashbots Protect Integration
**Problem**: Public mempool transactions are sandwiched.

**Implementation**:
```typescript
// Already have Flashbots integration - ensure it's enabled
const FLASHBOTS_CONFIG = {
  enabled: true,
  relay: 'https://relay.flashbots.net',
  builderEndpoints: [
    'https://builder0x69.io',
    'https://rsync-builder.xyz',
  ],
};
```

### 4.2 Private Transaction Submission
**Implementation**:
- Use `eth_sendPrivateTransaction` for MEV protection
- Configure refund percentage (90% user / 10% builder)

### 4.3 Bundle Optimization
**Implementation**:
```typescript
// Bundle multiple arbitrage opportunities when possible
async function submitArbitrageBundle(paths: ArbitragePath[]): Promise<BundleReceipt> {
  const bundle = paths.map(p => encodeArbitrage(p));
  return await flashbotsProvider.sendBundle(bundle, targetBlock);
}
```

---

## Phase 5: Enhanced Monitoring & Learning

### 5.1 Opportunity Tracking
**Implementation**:
```typescript
interface OpportunityLog {
  timestamp: number;
  path: string;
  estimatedProfit: bigint;
  actualProfit?: bigint;
  executed: boolean;
  reason?: string; // Why not executed or why failed
}

// Log ALL opportunities, not just profitable ones
function logOpportunity(opp: OpportunityLog) {
  appendToFile('logs/opportunities.jsonl', JSON.stringify(opp));
}
```

### 5.2 Post-Execution Analysis
**Implementation**:
```typescript
// Track what happened after we saw an opportunity
async function analyzeOpportunity(opp: Opportunity) {
  // Check if someone else took it
  const blockAfter = await getBlock(opp.blockNumber + 1);
  const wasExecuted = checkForArbitrageInBlock(blockAfter, opp.pools);
  
  if (wasExecuted) {
    log.info(`Opportunity was taken by: ${executor}`);
    // Learn from their approach
  }
}
```

### 5.3 Profitability Dashboard
**Implementation**:
- Real-time display of opportunities found
- Historical success rate
- Gas cost vs profit analysis
- Pool liquidity trends

---

## Phase 6: Token & DEX Expansion

### 6.1 Expand Token Coverage on Base
**Current Tokens**: WETH, USDC, USDbC, DAI, cbETH, AERO, cbBTC, USDT, WSTETH

**Add High-Volume Tokens**:
```typescript
const ADDITIONAL_BASE_TOKENS = {
  BRETT: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
  DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
  TOSHI: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
  HIGHER: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe',
};
```

### 6.2 Add Additional DEX Protocols
**Implementation**:
```typescript
// Add Maverick Protocol (concentrated liquidity, unique mechanics)
this.addDEX({
  name: 'Maverick',
  protocol: 'Maverick',
  network: '8453',
  router: '0x...',
  factory: '0x...',
  liquidityThreshold: parseEther('5'),
});

// Add Curve on Base
this.addDEX({
  name: 'Curve Base',
  protocol: 'Curve',
  network: '8453',
  router: '0x...',
  factory: '0x...',
});
```

---

## Implementation Priority Matrix

| Phase | Priority | Estimated Impact | Effort |
|-------|----------|------------------|--------|
| 1.1 Lower Thresholds | 🔴 Critical | High | Low |
| 1.2 Fix V3 Discovery | 🔴 Critical | High | Medium |
| 1.3 Known Pool Preload | 🟡 High | Medium | Low |
| 2.1 Gas Estimation | 🟡 High | Medium | Medium |
| 2.2 Slippage Model | 🟡 High | Medium | Medium |
| 3.1 Flash Loans | 🟢 Medium | High | High |
| 3.2 Quoter Integration | 🔴 Critical | High | Medium |
| 4.1 Flashbots | 🟢 Medium | Medium | Low |
| 5.1 Opportunity Tracking | 🟡 High | Medium | Low |
| 6.1 Token Expansion | 🟢 Medium | Medium | Low |

---

## Immediate Action Items (Next 24-48 Hours)

1. **Lower liquidity thresholds** in DEXRegistry to 10 ETH for V3, 1 ETH for V2
2. **Add known Base pools** as preloaded configuration
3. **Enable debug logging** for pool discovery to understand filtering
4. **Integrate quoter contracts** for accurate price discovery
5. **Track all opportunities** (profitable or not) for analysis

---

## Success Metrics

| Metric | Current | Target (30 days) |
|--------|---------|------------------|
| Pools Found per Scan | 0 | 50+ |
| Opportunities Found per Hour | 0 | 10+ |
| Profitable Opportunities | 0 | 5+ per hour |
| Successful Executions | 0 | 1+ per day |
| Profit per Week | $0 | $100+ |

---

## Risk Considerations

1. **Gas Costs**: Base has low gas, but failed transactions still cost
2. **MEV Competition**: Other bots may be faster
3. **Liquidity Risk**: Small pools can have high slippage
4. **Smart Contract Risk**: Flash loan integrations add complexity

---

## Conclusion

The primary blocker is **pool detection** - we're scanning but finding nothing. The immediate fix is to:

1. Lower liquidity thresholds significantly
2. Add direct pool address configurations for known high-volume pools
3. Integrate on-chain quoters for accurate pricing

Once pools are being found, we can iterate on profitability calculations, execution timing, and MEV protection.

---

*Document Version: 1.0*
*Last Updated: 2025-11-25*
*Author: TheWarden Development Team*
