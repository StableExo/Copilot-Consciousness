/**
 * CEX Multi-Exchange Monitoring Example - Extended Edition
 * 
 * Demonstrates how to use all 9 supported centralized exchange connectors:
 * - Binance (original 5)
 * - Coinbase
 * - OKX
 * - Bybit
 * - Kraken
 * - Bitfinex (NEW - array-based data structures)
 * - KuCoin (NEW - requires token handshake)
 * - Gate.io (NEW - spot trading)
 * - MEXC (NEW - high volume Asian exchange)
 * 
 * This example shows how to monitor prices across all exchanges
 * for arbitrage opportunities.
 */

import {
  CEXLiquidityMonitor,
  CEXExchange,
  CEXMonitorConfig,
  OrderBook,
  PriceTicker,
} from '../src/execution/cex/index.js';

/**
 * Example 1: Monitor all 9 exchanges for BTC/USDT
 */
async function monitorAllExchanges() {
  console.log('=== Example 1: Monitor All 9 Exchanges ===\n');

  const config: CEXMonitorConfig = {
    exchanges: [
      // Original 5 exchanges
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.COINBASE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.OKX,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.BYBIT,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD', 'ETH/USD'],
      },
      // NEW: 4 additional exchanges
      {
        exchange: CEXExchange.BITFINEX,
        symbols: ['BTC/USD', 'ETH/USD'],
      },
      {
        exchange: CEXExchange.KUCOIN,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.GATE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.MEXC,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
    ],
    updateInterval: 1000, // 1 second snapshot updates
    minSpreadBps: 10, // 0.1% minimum spread
    onTicker: (ticker: PriceTicker) => {
      console.log(
        `[${ticker.exchange}] ${ticker.symbol}: ` +
        `Bid: $${parseFloat(ticker.bid).toFixed(2)} | ` +
        `Ask: $${parseFloat(ticker.ask).toFixed(2)} | ` +
        `Last: $${parseFloat(ticker.last).toFixed(2)}`
      );
    },
    onOrderBook: (orderBook: OrderBook) => {
      const bestBid = orderBook.bids[0];
      const bestAsk = orderBook.asks[0];
      
      if (bestBid && bestAsk) {
        const spread = parseFloat(bestAsk.price) - parseFloat(bestBid.price);
        const spreadBps = (spread / parseFloat(bestBid.price)) * 10000;
        
        console.log(
          `[${orderBook.exchange}] ${orderBook.symbol} Order Book: ` +
          `Best Bid: $${parseFloat(bestBid.price).toFixed(2)} (${bestBid.quantity}) | ` +
          `Best Ask: $${parseFloat(bestAsk.price).toFixed(2)} (${bestAsk.quantity}) | ` +
          `Spread: ${spreadBps.toFixed(2)} bps`
        );
      }
    },
    onError: (exchange: CEXExchange, error: Error) => {
      console.error(`[${exchange}] Error:`, error.message);
    },
  };

  const monitor = new CEXLiquidityMonitor(config);
  await monitor.start();

  // Run for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Get statistics
  const stats = monitor.getStats();
  console.log('\n=== Exchange Statistics ===');
  stats.forEach(stat => {
    console.log(
      `${stat.exchange}: ` +
      `Connected: ${stat.connected} | ` +
      `Uptime: ${stat.uptime.toFixed(0)}s | ` +
      `Updates: ${stat.totalUpdates} | ` +
      `Updates/s: ${stat.updatesPerSecond.toFixed(2)}`
    );
  });

  await monitor.stop();
}

/**
 * Example 2: Focus on new exchanges with detailed features
 */
async function demonstrateNewExchanges() {
  console.log('\n=== Example 2: New Exchange Features ===\n');

  const config: CEXMonitorConfig = {
    exchanges: [
      // Bitfinex - Known for raw array-based data structures
      {
        exchange: CEXExchange.BITFINEX,
        symbols: ['BTC/USD', 'ETH/USD'],
      },
      // KuCoin - Requires REST API token handshake before WebSocket
      {
        exchange: CEXExchange.KUCOIN,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      // Gate.io - Clean WebSocket v4 API
      {
        exchange: CEXExchange.GATE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      // MEXC - High volume Asian exchange
      {
        exchange: CEXExchange.MEXC,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
    ],
    updateInterval: 2000,
    onTicker: (ticker: PriceTicker) => {
      // Highlight specific features of each exchange
      let note = '';
      switch (ticker.exchange) {
        case CEXExchange.BITFINEX:
          note = '(Array-based data)';
          break;
        case CEXExchange.KUCOIN:
          note = '(Token handshake)';
          break;
        case CEXExchange.GATE:
          note = '(WebSocket v4)';
          break;
        case CEXExchange.MEXC:
          note = '(Asian volume)';
          break;
      }
      
      console.log(
        `[${ticker.exchange}] ${note} ${ticker.symbol}: $${parseFloat(ticker.last).toFixed(2)}`
      );
    },
    onError: (exchange: CEXExchange, error: Error) => {
      console.error(`[${exchange}] Error:`, error.message);
    },
  };

  const monitor = new CEXLiquidityMonitor(config);
  await monitor.start();

  console.log('Monitoring new exchanges for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await monitor.stop();
}

/**
 * Example 3: Cross-exchange arbitrage detection
 */
async function detectCrossExchangeArbitrage() {
  console.log('\n=== Example 3: Cross-Exchange Arbitrage ===\n');

  const priceMap = new Map<string, Map<CEXExchange, number>>();

  const config: CEXMonitorConfig = {
    exchanges: [
      { exchange: CEXExchange.BINANCE, symbols: ['BTC/USDT'] },
      { exchange: CEXExchange.BITFINEX, symbols: ['BTC/USD'] },
      { exchange: CEXExchange.KUCOIN, symbols: ['BTC/USDT'] },
      { exchange: CEXExchange.GATE, symbols: ['BTC/USDT'] },
      { exchange: CEXExchange.MEXC, symbols: ['BTC/USDT'] },
    ],
    onTicker: (ticker: PriceTicker) => {
      // Normalize symbol (BTC/USDT and BTC/USD are similar)
      const normalizedSymbol = ticker.symbol.replace('/USD', '/USDT');
      
      if (!priceMap.has(normalizedSymbol)) {
        priceMap.set(normalizedSymbol, new Map());
      }
      
      const price = parseFloat(ticker.last);
      priceMap.get(normalizedSymbol)!.set(ticker.exchange, price);
      
      // Check for arbitrage opportunities
      const prices = priceMap.get(normalizedSymbol)!;
      if (prices.size >= 2) {
        const priceArray = Array.from(prices.entries());
        const minEntry = priceArray.reduce((min, curr) => 
          curr[1] < min[1] ? curr : min
        );
        const maxEntry = priceArray.reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        
        const [minExchange, minPrice] = minEntry;
        const [maxExchange, maxPrice] = maxEntry;
        const spread = ((maxPrice - minPrice) / minPrice) * 100;
        
        if (spread > 0.1) { // More than 0.1% spread
          console.log(
            `🚨 ARBITRAGE OPPORTUNITY: ${normalizedSymbol}\n` +
            `   Buy on ${minExchange}: $${minPrice.toFixed(2)}\n` +
            `   Sell on ${maxExchange}: $${maxPrice.toFixed(2)}\n` +
            `   Potential Profit: ${spread.toFixed(3)}%\n`
          );
        }
      }
    },
    onError: (exchange: CEXExchange, error: Error) => {
      console.error(`[${exchange}] Error:`, error.message);
    },
  };

  const monitor = new CEXLiquidityMonitor(config);
  await monitor.start();

  console.log('Scanning for arbitrage opportunities for 60 seconds...');
  await new Promise(resolve => setTimeout(resolve, 60000));

  await monitor.stop();
}

/**
 * Example 4: Performance comparison across exchanges
 */
async function compareExchangePerformance() {
  console.log('\n=== Example 4: Exchange Performance Comparison ===\n');

  const config: CEXMonitorConfig = {
    exchanges: [
      { exchange: CEXExchange.BINANCE, symbols: ['BTC/USDT'] },
      { exchange: CEXExchange.BITFINEX, symbols: ['BTC/USD'] },
      { exchange: CEXExchange.KUCOIN, symbols: ['BTC/USDT'] },
      { exchange: CEXExchange.GATE, symbols: ['BTC/USDT'] },
      { exchange: CEXExchange.MEXC, symbols: ['BTC/USDT'] },
    ],
    onError: (exchange: CEXExchange, error: Error) => {
      console.error(`[${exchange}] Error:`, error.message);
    },
  };

  const monitor = new CEXLiquidityMonitor(config);
  await monitor.start();

  console.log('Collecting performance data for 30 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 30000));

  const stats = monitor.getStats();
  console.log('=== Performance Results ===\n');
  
  // Sort by updates per second
  const sortedStats = Array.from(stats).sort(
    (a, b) => b.updatesPerSecond - a.updatesPerSecond
  );
  
  sortedStats.forEach((stat, index) => {
    console.log(
      `${index + 1}. ${stat.exchange.toUpperCase()}\n` +
      `   Updates/sec: ${stat.updatesPerSecond.toFixed(2)}\n` +
      `   Total Updates: ${stat.totalUpdates}\n` +
      `   Errors: ${stat.errors}\n` +
      `   Reconnections: ${stat.reconnections}\n`
    );
  });

  await monitor.stop();
}

// Main execution
async function main() {
  try {
    // Uncomment the example you want to run:
    
    await monitorAllExchanges();
    // await demonstrateNewExchanges();
    // await detectCrossExchangeArbitrage();
    // await compareExchangePerformance();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
