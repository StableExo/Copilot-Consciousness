# CoinMarketCap API Integration Guide

## Overview

CoinMarketCap provides a **unified API** for accessing both **Centralized Exchange (CEX)** and **Decentralized Exchange (DEX)** market data with a single API key. This integration enables TheWarden to monitor prices, volumes, and liquidity across 300+ exchanges spanning both centralized and decentralized venues.

## Why CoinMarketCap?

### Single API for CEX + DEX

Unlike separate integrations for each exchange, CoinMarketCap provides:

| Feature | Value |
|---------|-------|
| **Coverage** | 300+ exchanges (CEX + DEX) |
| **Chains** | 30+ blockchain networks |
| **API Key** | ONE key for everything |
| **Format** | Standardized response structure |
| **Cost** | Free tier available (10K credits/month) |

### Comparison with Other Solutions

| Solution | CEX Coverage | DEX Coverage | Cost | Unified API |
|----------|--------------|--------------|------|-------------|
| **CoinMarketCap** | ✅ All major CEXs | ✅ All major DEXs | Free tier | ✅ Yes |
| Binance API | ✅ Binance only | ❌ No | Free | ❌ No |
| bloXroute | ❌ Limited | ✅ DEX focus | $300+/mo | ❌ No |
| Direct CEX APIs | ✅ Individual | ❌ No | Free | ❌ No (many keys) |
| Direct DEX Data | ❌ No | ✅ Individual | Varies | ❌ No (complex) |

## What's Included

### CEX (Centralized Exchange) Endpoints

Access data from Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Gate.io, and 100+ more:

- **Exchange Listings**: `/v1/exchange/map` - All active exchanges
- **Market Pairs**: `/v1/exchange/market-pairs/latest` - Trading pairs for each exchange
- **Exchange Quotes**: `/v1/exchange/quotes/latest` - Real-time volume and metrics
- **Global Metrics**: `/v1/global-metrics/quotes/latest` - Aggregate market statistics

### DEX (Decentralized Exchange) Endpoints

Access data from Uniswap, PancakeSwap, SushiSwap, Raydium, Orca, Curve, and 200+ more:

- **Networks List**: `/v4/dex/networks/list` - Supported blockchain networks
- **Listings Info**: `/v4/dex/listings/info` - DEX metadata (logos, descriptions, tags)
- **Listings Quotes**: `/v4/dex/listings/quotes` - Aggregated quotes from multiple DEXs
- **Pairs Latest**: `/v4/dex/pairs/latest` - Real-time pair quotes
- **Pairs Quotes**: `/v4/dex/pairs/quotes/latest` - Alternative pair quotes endpoint
- **OHLCV Latest**: `/v4/dex/pairs/ohlcv/latest` - Latest OHLCV bars
- **OHLCV Historical**: `/v4/dex/pairs/ohlcv/historical` - Historical candle data
- **Trades Latest**: `/v4/dex/pairs/trade/latest` - Most recent trades

## Pricing Tiers

| Tier | Monthly Cost | Credits/Month | Requests/Minute | Historical Data |
|------|--------------|---------------|-----------------|-----------------|
| **Free** | $0 | 10,000 | 30 | None |
| **Hobbyist** | $29 | 110,000 | 30 | 12 months |
| **Startup** | $79 | 300,000 | 30 | 24 months |
| **Standard** | $299 | 1,200,000 | 60 | 60 months |
| **Professional** | $699 | 3,000,000 | 90 | All-time |
| **Enterprise** | Custom | 30,000,000 | 120+ | All-time |

### What Can You Do With Free Tier?

- **10,000 credits/month** = ~333 requests/day
- **30 requests/minute** rate limit
- **Real-time data** for both CEX and DEX
- **NO historical OHLCV** (requires paid tier)
- **Perfect for**: Testing, POC, low-frequency monitoring

## Quick Start

### 1. Get API Key

Sign up at [https://pro.coinmarketcap.com/account/plan](https://pro.coinmarketcap.com/account/plan)

### 2. Configure Environment

Add to `.env`:

```bash
COINMARKETCAP_API_KEY=your_api_key_here
COINMARKETCAP_API_TIER=free
ENABLE_COINMARKETCAP=true
```

### 3. Basic Usage

```typescript
import { CoinMarketCapClient, CMCApiTier } from './execution/coinmarketcap';

const client = new CoinMarketCapClient({
  apiKey: process.env.COINMARKETCAP_API_KEY!,
  tier: CMCApiTier.FREE,
});

// Get CEX data (Binance, Coinbase, Kraken)
const cexQuotes = await client.getCEXExchangeQuotes({
  slug: ['binance', 'coinbase', 'kraken'],
  convert: 'USD',
});

console.log('Binance 24h volume:', cexQuotes.data.binance.quote.USD.volume_24h);

// Get DEX data (Uniswap V3, PancakeSwap V3)
const dexQuotes = await client.getDEXPairsLatest({
  pairs: ['uniswap-v3:eth-usdt', 'pancakeswap-v3:bnb-usdt'],
  convert: 'USD',
});

console.log('Uniswap ETH/USDT price:', dexQuotes.data['uniswap-v3:eth-usdt'].quote.USD.price);

// Monitor API usage
const stats = client.getStats();
console.log('Credits used:', stats.totalCreditsUsed);
console.log('Credits remaining:', stats.creditsRemaining);
console.log('Requests today:', stats.requestsToday);
```

## Use Cases

### 1. CEX-DEX Arbitrage Detection

Compare prices between centralized and decentralized exchanges:

```typescript
async function detectCEXDEXArbitrage() {
  const client = new CoinMarketCapClient({ apiKey: API_KEY });

  // Get Binance price for ETH/USDT
  const binanceData = await client.getCEXMarketPairs({
    slug: 'binance',
  });
  const binancePrice = binanceData.data.market_pairs.find(
    (pair) => pair.market_pair === 'ETH/USDT'
  )?.quote.USD.price;

  // Get Uniswap V3 price for ETH/USDT
  const uniswapData = await client.getDEXPairsLatest({
    pairs: ['uniswap-v3:eth-usdt'],
  });
  const uniswapPrice = uniswapData.data['uniswap-v3:eth-usdt'].quote.USD.price;

  // Calculate arbitrage opportunity
  const priceDiff = Math.abs(binancePrice - uniswapPrice);
  const percentDiff = (priceDiff / binancePrice) * 100;

  if (percentDiff > 0.5) {
    console.log(`Arbitrage opportunity: ${percentDiff.toFixed(2)}% difference`);
    console.log(`Buy on: ${binancePrice < uniswapPrice ? 'Binance' : 'Uniswap'}`);
    console.log(`Sell on: ${binancePrice > uniswapPrice ? 'Binance' : 'Uniswap'}`);
  }
}
```

### 2. Multi-Exchange Liquidity Monitoring

Track liquidity across all exchanges:

```typescript
async function monitorGlobalLiquidity() {
  const client = new CoinMarketCapClient({ apiKey: API_KEY });

  // Get all CEX volumes
  const cexQuotes = await client.getCEXExchangeQuotes({
    slug: ['binance', 'coinbase', 'kraken', 'okx', 'bybit'],
    convert: 'USD',
  });

  // Get all DEX liquidity
  const dexQuotes = await client.getDEXListingsQuotes({
    limit: 100,
    convert: 'USD',
  });

  // Calculate total liquidity
  let totalCEXVolume = 0;
  Object.values(cexQuotes.data).forEach((exchange) => {
    totalCEXVolume += exchange.quote.USD.volume_24h;
  });

  let totalDEXLiquidity = 0;
  dexQuotes.data.forEach((pair) => {
    totalDEXLiquidity += pair.quote.USD.liquidity;
  });

  console.log(`Total CEX 24h volume: $${(totalCEXVolume / 1e9).toFixed(2)}B`);
  console.log(`Total DEX liquidity: $${(totalDEXLiquidity / 1e9).toFixed(2)}B`);
}
```

### 3. Historical Pattern Analysis

Analyze historical OHLCV data for backtesting (requires paid tier):

```typescript
async function analyzeHistoricalPatterns() {
  const client = new CoinMarketCapClient({
    apiKey: API_KEY,
    tier: CMCApiTier.PROFESSIONAL, // Requires paid tier for historical
  });

  // Get 30 days of hourly OHLCV data
  const ohlcvData = await client.getDEXPairsOhlcvHistorical({
    pair: 'uniswap-v3:eth-usdt',
    time_start: Date.now() - 30 * 24 * 3600 * 1000,
    interval: '1h',
    convert: 'USD',
  });

  // Calculate average volatility
  const volatility = ohlcvData.data.quotes.map((bar) => {
    return ((bar.high - bar.low) / bar.open) * 100;
  });

  const avgVolatility = volatility.reduce((a, b) => a + b) / volatility.length;
  console.log(`Average hourly volatility: ${avgVolatility.toFixed(2)}%`);
}
```

### 4. Real-Time Trade Monitoring

Monitor recent trades for opportunity detection:

```typescript
async function monitorRecentTrades() {
  const client = new CoinMarketCapClient({ apiKey: API_KEY });

  // Get last 100 trades on Uniswap V3 ETH/USDT
  const trades = await client.getDEXTradesLatest({
    pair: 'uniswap-v3:eth-usdt',
    limit: 100,
  });

  // Analyze large trades (> $100k)
  const largeTrades = trades.data.filter(
    (trade) => trade.quote_amount > 100000
  );

  console.log(`Large trades detected: ${largeTrades.length}`);
  largeTrades.forEach((trade) => {
    console.log(`${trade.is_buy ? 'BUY' : 'SELL'} $${trade.quote_amount.toFixed(0)} at $${trade.price.toFixed(2)}`);
  });
}
```

## Integration with TheWarden

### Complementary Systems

CoinMarketCap works alongside existing integrations:

| System | Purpose | Synergy with CMC |
|--------|---------|------------------|
| **bloXroute** | Mempool streaming (100-800ms advantage) | CMC provides price context for mempool transactions |
| **Binance WebSocket** | Real-time Binance orderbook | CMC adds 100+ other CEX prices for comparison |
| **CEX Liquidity Monitor** | Direct CEX WebSocket connections | CMC aggregates data across all exchanges |
| **OpportunityDetector** | Arbitrage detection | CMC feeds multi-exchange price data |

### Integration Pattern

```typescript
class EnhancedOpportunityDetector {
  private cmcClient: CoinMarketCapClient;
  private bloXrouteClient: BloXrouteClient;
  private cexMonitor: CEXLiquidityMonitor;

  async detectOpportunities() {
    // 1. Get aggregated prices from CMC (CEX + DEX)
    const cexPrices = await this.cmcClient.getCEXExchangeQuotes({
      slug: ['binance', 'coinbase', 'kraken'],
    });
    const dexPrices = await this.cmcClient.getDEXPairsLatest({
      pairs: ['uniswap-v3:eth-usdt', 'pancakeswap-v3:bnb-usdt'],
    });

    // 2. Get real-time data from bloXroute mempool
    const pendingTxs = await this.bloXrouteClient.getPendingTransactions();

    // 3. Cross-reference with direct Binance data
    const binanceBook = this.cexMonitor.getOrderBook('BTC/USDT');

    // 4. Detect arbitrage across all data sources
    return this.findArbitrageOpportunities(cexPrices, dexPrices, pendingTxs, binanceBook);
  }
}
```

## Rate Limiting

The client automatically enforces rate limits based on your tier:

```typescript
const client = new CoinMarketCapClient({
  apiKey: API_KEY,
  tier: CMCApiTier.FREE, // 30 req/min
});

// Client will automatically wait if approaching rate limit
for (let i = 0; i < 100; i++) {
  await client.getDEXPairsLatest({ pairs: ['uniswap-v3:eth-usdt'] });
  // Automatically throttled to 30 req/min
}

// Check if approaching limits
if (client.isApproachingRateLimit()) {
  console.warn('Approaching rate limit!');
}

// View current usage
const stats = client.getStats();
console.log(`Used ${stats.requestsThisMinute}/30 requests this minute`);
console.log(`Used ${stats.requestsToday}/333 requests today`);
console.log(`Used ${stats.totalCreditsUsed}/10000 credits this month`);
```

## Error Handling

The client includes automatic retry logic:

```typescript
const client = new CoinMarketCapClient({
  apiKey: API_KEY,
  retryAttempts: 3, // Retry failed requests up to 3 times
  retryDelay: 1000, // Wait 1s between retries (exponential backoff)
});

try {
  const data = await client.getDEXPairsLatest({
    pairs: ['uniswap-v3:eth-usdt'],
  });
} catch (error) {
  console.error('Failed after 3 retries:', error.message);

  // Check error statistics
  const stats = client.getStats();
  console.log(`Total errors: ${stats.errors}`);
  console.log(`Last error: ${stats.lastError}`);
}
```

## Best Practices

### 1. Use Free Tier for Development

Start with free tier for testing:

```typescript
const client = new CoinMarketCapClient({
  apiKey: process.env.COINMARKETCAP_API_KEY,
  tier: CMCApiTier.FREE, // 10K credits/month
});
```

Upgrade when needed:
- **333 requests/day** too limiting → **Hobbyist** ($29/mo)
- Need historical data → **Standard+** ($299/mo+)

### 2. Cache Responses

Don't fetch same data repeatedly:

```typescript
class CachedCMCClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 60000; // 1 minute

  async getCachedDEXPairs(pairs: string[]) {
    const cacheKey = pairs.join(',');
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data; // Return cached data
    }

    const data = await this.client.getDEXPairsLatest({ pairs });
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 3. Monitor Credit Usage

Track consumption to avoid overages:

```typescript
setInterval(() => {
  const stats = client.getStats();
  const percentUsed = (stats.totalCreditsUsed / 10000) * 100;

  console.log(`Credit usage: ${percentUsed.toFixed(1)}%`);

  if (percentUsed > 80) {
    console.warn('⚠️  Approaching monthly credit limit!');
  }
}, 3600000); // Check hourly
```

### 4. Combine with Direct APIs

Use CMC for aggregation, direct APIs for real-time:

```typescript
// CMC: Multi-exchange price comparison (every 5 minutes)
const cexComparison = await cmcClient.getCEXExchangeQuotes({
  slug: ['binance', 'coinbase', 'kraken'],
});

// Direct API: Real-time Binance orderbook (every 100ms)
const binanceBook = binanceConnector.getOrderBook('BTC/USDT');

// Best of both worlds!
```

## Troubleshooting

### Rate Limit Errors

```typescript
// Error: Rate limit exceeded
// Solution: Reduce request frequency or upgrade tier

const client = new CoinMarketCapClient({
  apiKey: API_KEY,
  tier: CMCApiTier.HOBBYIST, // Upgrade tier
});
```

### Credit Depletion

```typescript
// Error: Monthly credit limit reached
// Solution: Monitor usage and optimize requests

if (client.isApproachingRateLimit()) {
  // Use cached data instead of new request
  return getCachedData();
}
```

### Invalid Pair Format

```typescript
// ❌ Wrong: 'eth-usdt'
// ✅ Correct: 'uniswap-v3:eth-usdt'

const data = await client.getDEXPairsLatest({
  pairs: ['uniswap-v3:eth-usdt'], // Include DEX slug
});
```

## References

- **Official Docs**: [https://coinmarketcap.com/api/documentation/v1/](https://coinmarketcap.com/api/documentation/v1/)
- **Pricing**: [https://pro.coinmarketcap.com/api/pricing](https://pro.coinmarketcap.com/api/pricing)
- **DEX APIs Announcement**: [https://coinmarketcap.com/academy/article/the-wait-is-over-cmc-releases-5-new-apis-to-complete-dex-suite](https://coinmarketcap.com/academy/article/the-wait-is-over-cmc-releases-5-new-apis-to-complete-dex-suite)
- **Developer Portal**: [https://pro.coinmarketcap.com/account/plan](https://pro.coinmarketcap.com/account/plan)

## Next Steps

1. **Sign up** for CoinMarketCap API key (free tier)
2. **Configure** `.env` with API key
3. **Test** basic endpoints with example code
4. **Integrate** with OpportunityDetector
5. **Monitor** credit usage and optimize
6. **Upgrade** tier when needed (based on usage)

---

**Strategic Value Summary**:

- ✅ **One API key** for both CEX and DEX (vs managing 10+ separate APIs)
- ✅ **300+ exchanges** covered (comprehensive market visibility)
- ✅ **Free tier** available (10K credits/month = ~333 req/day)
- ✅ **Standardized format** (consistent data structure)
- ✅ **Historical data** available (paid tiers)
- ✅ **Complements existing systems** (bloXroute, CEX monitoring)

CoinMarketCap integration provides **complete market visibility** across both centralized and decentralized venues, enabling sophisticated arbitrage detection and opportunity analysis.
