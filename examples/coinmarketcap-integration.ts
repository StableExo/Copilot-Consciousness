/**
 * CoinMarketCap Integration Examples
 * Demonstrates both CEX and DEX data access with unified API
 */

import {
  CoinMarketCapClient,
  CMCApiTier,
} from '../src/execution/coinmarketcap';

// ============================================================================
// Example 1: CEX Data - Multi-Exchange Price Monitoring
// ============================================================================

async function example1_CEXPriceMonitoring() {
  console.log('\n=== Example 1: CEX Price Monitoring ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  // Get quotes from top 5 centralized exchanges
  const cexQuotes = await client.getCEXExchangeQuotes({
    slug: ['binance', 'coinbase', 'kraken', 'okx', 'bybit'],
    convert: 'USD',
  });

  console.log('Top 5 CEX by 24h Volume:');
  Object.entries(cexQuotes.data).forEach(([slug, exchange]) => {
    const volume24h = exchange.quote.USD.volume_24h;
    const volumeChange = exchange.quote.USD.percent_change_volume_24h;

    console.log(
      `${exchange.name}: $${(volume24h / 1e9).toFixed(2)}B ` +
        `(${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(2)}%)`
    );
  });

  // Check API usage
  const stats = client.getStats();
  console.log(`\nAPI Usage: ${stats.totalCreditsUsed} credits, ${stats.requestsThisMinute} requests/min`);
}

// ============================================================================
// Example 2: DEX Data - Multi-Chain Liquidity Monitoring
// ============================================================================

async function example2_DEXLiquidityMonitoring() {
  console.log('\n=== Example 2: DEX Liquidity Monitoring ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  // Monitor ETH pairs across multiple DEXs
  const dexQuotes = await client.getDEXPairsLatest({
    pairs: [
      'uniswap-v3:eth-usdt',
      'pancakeswap-v3:eth-usdt',
      'sushiswap:eth-usdt',
      'curve:eth-usdt',
    ],
    convert: 'USD',
  });

  console.log('ETH/USDT Prices Across DEXs:');
  Object.entries(dexQuotes.data).forEach(([pairId, pair]) => {
    const price = pair.quote.USD.price;
    const volume = pair.quote.USD.volume_24h;
    const liquidity = pair.quote.USD.liquidity;

    console.log(
      `${pair.dex_name}: $${price.toFixed(2)} ` +
        `| Vol: $${(volume / 1e6).toFixed(2)}M ` +
        `| Liq: $${(liquidity / 1e6).toFixed(2)}M`
    );
  });
}

// ============================================================================
// Example 3: CEX-DEX Arbitrage Detection
// ============================================================================

async function example3_CEXDEXArbitrage() {
  console.log('\n=== Example 3: CEX-DEX Arbitrage Detection ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  // Get Binance ETH/USDT price
  const binanceData = await client.getCEXMarketPairs({
    slug: 'binance',
  });

  const binancePair = binanceData.data.market_pairs.find(
    (pair) => pair.market_pair === 'ETH/USDT'
  );
  const binancePrice = binancePair?.quote.USD.price || 0;

  // Get Uniswap V3 ETH/USDT price
  const uniswapData = await client.getDEXPairsLatest({
    pairs: ['uniswap-v3:eth-usdt'],
  });
  const uniswapPrice = uniswapData.data['uniswap-v3:eth-usdt'].quote.USD.price;

  // Calculate arbitrage opportunity
  const priceDiff = Math.abs(binancePrice - uniswapPrice);
  const percentDiff = (priceDiff / binancePrice) * 100;

  console.log(`Binance Price: $${binancePrice.toFixed(2)}`);
  console.log(`Uniswap Price: $${uniswapPrice.toFixed(2)}`);
  console.log(`Price Difference: ${percentDiff.toFixed(3)}%`);

  if (percentDiff > 0.5) {
    console.log(`\n🎯 ARBITRAGE OPPORTUNITY DETECTED! ${percentDiff.toFixed(2)}% spread`);
    console.log(`Buy on: ${binancePrice < uniswapPrice ? 'Binance (CEX)' : 'Uniswap (DEX)'}`);
    console.log(`Sell on: ${binancePrice > uniswapPrice ? 'Binance (CEX)' : 'Uniswap (DEX)'}`);
  } else {
    console.log('\nNo significant arbitrage opportunity (< 0.5% spread)');
  }
}

// ============================================================================
// Example 4: Global Market Metrics
// ============================================================================

async function example4_GlobalMetrics() {
  console.log('\n=== Example 4: Global Market Metrics ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  const metrics = await client.getGlobalMetrics({ convert: 'USD' });

  const data = metrics.data;
  const quote = data.quote.USD;

  console.log('Global Cryptocurrency Market:');
  console.log(`Total Market Cap: $${(quote.total_market_cap / 1e12).toFixed(2)}T`);
  console.log(`24h Volume: $${(quote.total_volume_24h / 1e9).toFixed(2)}B`);
  console.log(`BTC Dominance: ${data.btc_dominance.toFixed(2)}%`);
  console.log(`ETH Dominance: ${data.eth_dominance.toFixed(2)}%`);
  console.log(`Active Cryptocurrencies: ${data.active_cryptocurrencies.toLocaleString()}`);
  console.log(`Active Exchanges: ${data.active_exchanges.toLocaleString()}`);
  console.log(`Active Trading Pairs: ${data.active_market_pairs.toLocaleString()}`);
}

// ============================================================================
// Example 5: DEX Networks and Listings
// ============================================================================

async function example5_DEXNetworks() {
  console.log('\n=== Example 5: DEX Networks and Listings ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  // Get all supported blockchain networks
  const networks = await client.getDEXNetworksList();

  console.log('Supported Blockchain Networks:');
  networks.data.slice(0, 10).forEach((network) => {
    console.log(`- ${network.name} (${network.slug})`);
  });

  console.log(`\nTotal Networks: ${networks.data.length}`);

  // Get top DEX listings
  const listings = await client.getDEXListingsInfo({
    limit: 10,
    sort: 'volume_24h',
    sort_dir: 'desc',
  });

  console.log('\nTop 10 DEXs by Volume:');
  listings.data.forEach((dex, index) => {
    console.log(`${index + 1}. ${dex.name} (${dex.slug})`);
  });
}

// ============================================================================
// Example 6: Real-Time Trade Monitoring
// ============================================================================

async function example6_TradeMonitoring() {
  console.log('\n=== Example 6: Real-Time Trade Monitoring ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  // Get last 20 trades on Uniswap V3 ETH/USDT
  const trades = await client.getDEXTradesLatest({
    pair: 'uniswap-v3:eth-usdt',
    limit: 20,
  });

  console.log('Recent Trades on Uniswap V3 ETH/USDT:');

  // Analyze large trades (> $50k)
  const largeTrades = trades.data.filter((trade) => trade.quote_amount > 50000);

  if (largeTrades.length > 0) {
    console.log(`\n🐋 ${largeTrades.length} large trades detected (> $50k):`);
    largeTrades.forEach((trade) => {
      const side = trade.is_buy ? '🟢 BUY' : '🔴 SELL';
      console.log(
        `${side} $${trade.quote_amount.toFixed(0)} ` +
          `at $${trade.price.toFixed(2)} ` +
          `(${new Date(trade.trade_timestamp).toLocaleTimeString()})`
      );
    });
  } else {
    console.log('No large trades in last 20 transactions');
  }

  // Calculate average trade size
  const avgTradeSize =
    trades.data.reduce((sum, t) => sum + t.quote_amount, 0) / trades.data.length;
  console.log(`\nAverage trade size: $${avgTradeSize.toFixed(2)}`);
}

// ============================================================================
// Example 7: Rate Limit Monitoring
// ============================================================================

async function example7_RateLimitMonitoring() {
  console.log('\n=== Example 7: Rate Limit Monitoring ===\n');

  const client = new CoinMarketCapClient({
    apiKey: process.env.COINMARKETCAP_API_KEY!,
    tier: CMCApiTier.FREE,
  });

  // Make several requests
  for (let i = 0; i < 5; i++) {
    await client.getDEXPairsLatest({
      pairs: ['uniswap-v3:eth-usdt'],
    });
  }

  // Check rate limit status
  const stats = client.getStats();
  const limits = client.getRateLimits();

  console.log('API Usage Statistics:');
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Credits Used: ${stats.totalCreditsUsed} / ${limits.creditsPerMonth}`);
  console.log(`Requests This Minute: ${stats.requestsThisMinute} / ${limits.requestsPerMinute}`);
  console.log(`Requests Today: ${stats.requestsToday} / ${limits.requestsPerDay}`);

  // Check if approaching limits
  if (client.isApproachingRateLimit()) {
    console.log('\n⚠️  WARNING: Approaching rate limit!');
  } else {
    console.log('\n✅ Rate limits healthy');
  }

  // Display tier info
  console.log(`\nCurrent Tier Limits:`);
  console.log(`- Credits/Month: ${limits.creditsPerMonth.toLocaleString()}`);
  console.log(`- Requests/Minute: ${limits.requestsPerMinute}`);
  console.log(`- Requests/Day: ${limits.requestsPerDay.toLocaleString()}`);
  console.log(`- Historical Data: ${limits.historicalMonths === 'all' ? 'All-time' : `${limits.historicalMonths} months`}`);
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  const example = process.env.EXAMPLE || '1';

  if (!process.env.COINMARKETCAP_API_KEY) {
    console.error('Error: COINMARKETCAP_API_KEY environment variable not set');
    console.error('Get your API key at: https://pro.coinmarketcap.com/account/plan');
    process.exit(1);
  }

  try {
    switch (example) {
      case '1':
        await example1_CEXPriceMonitoring();
        break;
      case '2':
        await example2_DEXLiquidityMonitoring();
        break;
      case '3':
        await example3_CEXDEXArbitrage();
        break;
      case '4':
        await example4_GlobalMetrics();
        break;
      case '5':
        await example5_DEXNetworks();
        break;
      case '6':
        await example6_TradeMonitoring();
        break;
      case '7':
        await example7_RateLimitMonitoring();
        break;
      default:
        console.error(`Unknown example: ${example}`);
        console.log('Available examples: 1-7');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_CEXPriceMonitoring,
  example2_DEXLiquidityMonitoring,
  example3_CEXDEXArbitrage,
  example4_GlobalMetrics,
  example5_DEXNetworks,
  example6_TradeMonitoring,
  example7_RateLimitMonitoring,
};
