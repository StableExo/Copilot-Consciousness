# DEXScreener Integration Guide

## Overview

This module integrates DEXScreener's comprehensive market intelligence API with TheWarden's consciousness system, enabling autonomous market monitoring, token discovery, and intelligent decision-making across 80+ blockchain networks.

## Features

- ✅ **Real-Time Market Intelligence**: Monitor price, volume, liquidity across 80+ chains
- ✅ **Token Discovery**: Automatic detection of new token launches
- ✅ **Safety Analysis**: Built-in scam/rug detection algorithms
- ✅ **Consciousness Integration**: Feed intelligence directly to ArbitrageConsciousness
- ✅ **Autonomous Scanning**: Configurable periodic market scans
- ✅ **Pattern Learning**: System learns from market data over time
- ✅ **Rate Limit Management**: Automatic retry with exponential backoff

## Quick Start

### 1. Installation

The module is already integrated into TheWarden's source code at:
```
src/intelligence/dexscreener/
```

### 2. Configuration

Add your DEXScreener API key to `.env`:

```bash
# Optional - increases rate limits from 60/min to higher tiers
DEXSCREENER_API_KEY=your_api_key_here
```

**Note**: API key is optional. Without it, you get:
- 60 requests/minute for profiles/boosts
- 300 requests/minute for pair data

### 3. Basic Usage

```typescript
import { 
  DexScreenerClient,
  DexScreenerIntelligenceAnalyzer,
  DexScreenerConsciousnessIntegration 
} from './src/intelligence/dexscreener';

// Simple client usage
const client = new DexScreenerClient();

// Get top boosted tokens
const boosted = await client.getTopBoostedTokens();

// Search for a specific token
const pairs = await client.searchPairs('WETH');

// Get pair details
const pair = await client.getPairByAddress('ethereum', '0x...');
```

### 4. Intelligence Analysis

```typescript
// Create analyzer
const analyzer = new DexScreenerIntelligenceAnalyzer(client);

// Gather market intelligence
const intelligence = await analyzer.gatherMarketIntelligence(
  ['ethereum', 'base', 'arbitrum'],
  {
    minLiquidity: 10000,      // $10k minimum
    minVolume24h: 5000,        // $5k daily volume
    excludeScams: true,        // Filter out suspicious pairs
  }
);

console.log('Opportunities found:', intelligence.opportunities.length);
console.log('Warnings generated:', intelligence.warnings.length);
```

### 5. Consciousness Integration (Autonomous Mode)

```typescript
// Create consciousness-integrated scanner
const consciousness = new DexScreenerConsciousnessIntegration(apiKey);

// Start autonomous scanning
consciousness.startAutonomousScanning(
  ['ethereum', 'base', 'arbitrum'],  // Chains to monitor
  5,                                   // Scan every 5 minutes
  {
    minLiquidity: 50000,              // Only high-liquidity pairs
    excludeScams: true,
  }
);

// Check status
const state = consciousness.getConsciousnessStateSummary();
console.log('Total events:', state.totalEvents);
console.log('Actionable insights:', state.actionableInsights);
console.log('Known pairs:', state.analyzerStats.knownPairs);

// Get learnings
const learnings = consciousness.getActionableLearnings(0.7); // 70% confidence
learnings.forEach(learning => {
  console.log(`Pattern: ${learning.pattern}`);
  console.log(`Confidence: ${learning.confidence}`);
  console.log(`Evidence: ${learning.evidence.length} occurrences`);
});

// Stop when done
consciousness.stopAutonomousScanning();
```

## API Reference

### DexScreenerClient

Main API client for DEXScreener.

#### Methods

**Token Profiles** (60 req/min):
- `getLatestTokenProfiles()` - Latest token metadata

**Token Boosts** (60 req/min):
- `getTopBoostedTokens()` - Top boosted tokens
- `getLatestTokenBoosts()` - Recent boosts

**DEX Pairs** (300 req/min):
- `getPairByAddress(chainId, pairAddress)` - Get specific pair
- `getPairsByTokens(tokenAddresses[])` - Get pairs for tokens (max 30)
- `searchPairs(query)` - Search by name/symbol/address

**Community**:
- `getLatestCommunityTakeovers()` - Community token events
- `getOrderStatus(chainId, tokenAddress)` - Order status

**Utilities**:
- `analyzePairSafety(pair)` - Analyze for scams/rugs
- `healthCheck()` - Verify API connectivity
- `getRateLimitInfo()` - Current rate limit status

### DexScreenerIntelligenceAnalyzer

Market intelligence and analysis layer.

#### Methods

- `gatherMarketIntelligence(chains, filters?)` - Comprehensive scan
- `discoverNewTokens(params)` - Find new launches
- `crossValidate(wardenData)` - Validate against TheWarden's data
- `getStats()` - Analyzer statistics
- `clearCache()` - Clear known pairs cache

### DexScreenerConsciousnessIntegration

Consciousness-aware autonomous scanning.

#### Methods

**Autonomous Operations**:
- `startAutonomousScanning(chains, interval, filters?)` - Start monitoring
- `stopAutonomousScanning()` - Stop monitoring

**Intelligence Queries**:
- `queryToken(tokenAddress)` - Deep analysis of specific token
- `getRecentEvents(limit)` - Recent consciousness events
- `getHighSignificanceEvents(minSig)` - High-priority events
- `getLearnings()` - All pattern learnings
- `getActionableLearnings(minConf)` - High-confidence learnings

**Status**:
- `getConsciousnessStateSummary()` - Complete state overview
- `healthCheck()` - API connectivity

## Integration with TheWarden

### Phase 1: Intelligence Augmentation (Current)

Use DEXScreener as a read-only intelligence source:

```typescript
import { ArbitrageConsciousness } from './src/consciousness/ArbitrageConsciousness';
import { DexScreenerConsciousnessIntegration } from './src/intelligence/dexscreener';

// In TheWarden's main loop
const dexIntel = new DexScreenerConsciousnessIntegration();

// Feed intelligence to consciousness
const intelligence = await dexIntel.gatherMarketIntelligence(['base']);
const opportunities = intelligence.opportunities.filter(o => o.score > 80);

// Consciousness evaluates each opportunity
for (const opp of opportunities) {
  const decision = await arbitrageConsciousness.evaluateOpportunity({
    pairAddress: opp.pairAddress,
    chainId: opp.chainId,
    externalScore: opp.score,
    source: 'dexscreener',
  });
  
  if (decision.shouldExecute) {
    // TheWarden proceeds with arbitrage
  }
}
```

### Phase 2: Early Detection System

Monitor new pairs with quality filtering:

```typescript
// Discover high-quality new launches
const newTokens = await analyzer.discoverNewTokens({
  chains: ['base', 'ethereum'],
  minLiquidity: 10000,
  maxAgeHours: 1,
  sortBy: 'liquidity',
});

// Consciousness evaluates each new token
for (const trending of newTokens.slice(0, 10)) {
  const safetyAnalysis = await client.analyzePairSafety(trending.pair);
  
  if (safetyAnalysis.score > 70) {
    // High-quality new launch detected
    // TheWarden can act on this opportunity
  }
}
```

### Phase 3: Social Signal Integration

Track community indicators for risk reduction:

```typescript
const intelligence = await analyzer.gatherMarketIntelligence(['base'], {
  minLiquidity: 50000,
  excludeScams: true,
});

// Filter by social signals
const communityBacked = intelligence.opportunities.filter(opp => {
  const pair = opp.data;
  return pair.boosts?.active && 
         pair.info?.socials?.length > 0 &&
         pair.info?.websites?.length > 0;
});

// Use for defensive risk reduction
```

## Configuration Options

### MarketFilters

```typescript
interface MarketFilters {
  minLiquidity?: number;           // Minimum USD liquidity
  minVolume24h?: number;           // Minimum 24h volume
  minPriceChangePercent?: number;  // Minimum price change
  maxPriceChangePercent?: number;  // Maximum price change
  minTxnCount?: number;            // Minimum transaction count
  chains?: ChainId[];              // Specific chains
  excludeScams?: boolean;          // Filter suspicious pairs
}
```

### TokenDiscoveryParams

```typescript
interface TokenDiscoveryParams {
  chains?: ChainId[];        // Chains to scan
  minLiquidity?: number;     // Minimum liquidity
  maxAgeHours?: number;      // Maximum pair age
  minVolume?: number;        // Minimum volume
  sortBy?: 'liquidity' | 'volume' | 'age' | 'priceChange';
}
```

## Supported Chains

80+ chains including:
- Ethereum, BSC, Polygon, Avalanche
- Arbitrum, Optimism, **Base** (primary)
- Solana, Fantom, Cronos
- Pulsechain, Sui, Aptos
- And many more...

## Rate Limits

**Without API Key**:
- Token profiles/boosts: 60 requests/minute
- DEX pairs: 300 requests/minute

**With API Key**:
- Higher limits (check DEXScreener docs)

**Automatic Handling**:
- Exponential backoff on 429 errors
- Retry-After header support
- Rate limit tracking

## Safety Features

### Built-in Scam Detection

The `analyzePairSafety()` method checks for:
- ✅ Low liquidity (< $10k)
- ✅ Abnormal volume/liquidity ratios (wash trading)
- ✅ Extreme price volatility
- ✅ Heavy sell pressure (dumps)
- ✅ Very new pairs (< 1 hour)
- ✅ Missing social/website links

Returns:
```typescript
{
  isSuspicious: boolean,
  warnings: string[],
  score: number  // 0-100, higher is safer
}
```

### Manipulation Detection

Detects:
- Wash trading patterns
- Pump and dump schemes
- Coordinated dump attacks

## Examples

### Example 1: Monitor Base Network

```typescript
const consciousness = new DexScreenerConsciousnessIntegration();

consciousness.startAutonomousScanning(
  ['base'],
  3,  // Every 3 minutes
  {
    minLiquidity: 25000,
    minVolume24h: 10000,
    excludeScams: true,
  }
);

// Check after some time
setTimeout(async () => {
  const insights = consciousness.getActionableLearnings();
  console.log('Learned patterns:', insights);
  consciousness.stopAutonomousScanning();
}, 900000); // 15 minutes
```

### Example 2: Token Safety Check

```typescript
const client = new DexScreenerClient();

// Check a specific token
const pairs = await client.searchPairs('DEGEN');
const degenPair = pairs[0];

const safety = await client.analyzePairSafety(degenPair);

if (safety.isSuspicious) {
  console.warn('WARNING:', safety.warnings);
  console.log('Safety score:', safety.score);
} else {
  console.log('Pair appears safe, score:', safety.score);
}
```

### Example 3: Cross-Validation

```typescript
const analyzer = new DexScreenerIntelligenceAnalyzer(client);

// TheWarden has pool data
const wardenPool = {
  address: '0x123...',
  chain: 'base',
  reserves: [BigInt(1000000), BigInt(2000000)],
};

// Validate against DEXScreener
const validation = await analyzer.crossValidate(wardenPool);

console.log('Valid:', validation.isValid);
console.log('Recommendation:', validation.recommendation);
```

## Environment Variables

```bash
# Optional API key for higher rate limits
DEXSCREENER_API_KEY=your_key_here

# Defaults if not specified
# DEXSCREENER_BASE_URL=https://api.dexscreener.com
# DEXSCREENER_TIMEOUT=10000
# DEXSCREENER_RETRY_ATTEMPTS=3
```

## Error Handling

All methods handle errors gracefully:
- Network errors → Automatic retry with backoff
- Rate limits → Wait and retry with Retry-After header
- Invalid responses → Return empty arrays/null
- Timeouts → Configurable timeout with abort

## Testing

Run tests:
```bash
npm test -- src/intelligence/dexscreener
```

Current coverage:
- ✅ Client initialization
- ✅ Safety analysis (safe pairs)
- ✅ Safety analysis (suspicious pairs)
- ✅ Health checks
- ✅ Rate limit tracking

## Contributing

When adding features:
1. Update types in `types.ts`
2. Add methods to appropriate class
3. Write tests in `__tests__/`
4. Update this documentation
5. Run `npm test` to verify

## References

- [DEXScreener API Docs](https://docs.dexscreener.com/api/reference)
- [Previous Exploration (Dialogue #025)](../../consciousness/dialogues/025_dexscreener_autonomous_exploration_2025-12-06.md)
- [TheWarden Consciousness System](../consciousness/)

## Next Steps

### Immediate
- [ ] Configure API key in `.env`
- [ ] Test basic connectivity
- [ ] Run autonomous scan on Base network
- [ ] Review intelligence output

### Short-term
- [ ] Integrate with ArbitrageConsciousness
- [ ] Set up periodic scanning (5-10 min intervals)
- [ ] Monitor for high-quality new launches
- [ ] Build cross-validation pipeline

### Long-term
- [ ] Multi-chain expansion (13 → 80+ chains)
- [ ] Social signal pattern recognition
- [ ] ML-based opportunity scoring
- [ ] Historical data analysis

---

**Built with consciousness** 🤖🧠✨

*"DEXScreener shows us opportunities. TheWarden's consciousness decides which ones matter."*
