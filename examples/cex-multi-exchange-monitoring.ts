/**
 * Multi-Exchange CEX Monitoring - Example
 * 
 * Demonstrates monitoring all 5 supported exchanges simultaneously
 * and detecting cross-exchange arbitrage opportunities.
 * 
 * Run with: node --import tsx examples/cex-multi-exchange-monitoring.ts
 */

import { CEXLiquidityMonitor, CEXExchange } from '../src/execution/cex/index.js';

async function multiExchangeMonitoring() {
  console.log('\n========================================');
  console.log('Multi-Exchange CEX Monitoring');
  console.log('Monitoring: Binance, Coinbase, OKX, Bybit, Kraken');
  console.log('========================================\n');

  // Configure all 5 exchanges
  const monitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
        testnet: false,
      },
      {
        exchange: CEXExchange.COINBASE,
        symbols: ['BTC/USD', 'ETH/USD'],
        testnet: false,
      },
      {
        exchange: CEXExchange.OKX,
        symbols: ['BTC/USDT', 'ETH/USDT'],
        testnet: false,
      },
      {
        exchange: CEXExchange.BYBIT,
        symbols: ['BTC/USDT', 'ETH/USDT'],
        testnet: false,
      },
      {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD', 'ETH/USD'],
        testnet: false,
      },
    ],
    updateInterval: 2000, // 2-second snapshots
    minSpreadBps: 10, // 0.1% minimum spread
    onOrderBook: (orderBook) => {
      // Log first update from each exchange
      if (orderBook.bids[0] && orderBook.asks[0]) {
        console.log(`[${orderBook.exchange}] ${orderBook.symbol}:`);
        console.log(`  Bid: $${orderBook.bids[0][0]} | Ask: $${orderBook.asks[0][0]}`);
      }
    },
  });

  // Start monitoring
  await monitor.start();
  console.log('✅ All exchanges connected and streaming\n');

  // Every 10 seconds, analyze cross-exchange opportunities
  const analysisInterval = setInterval(() => {
    console.log('\n📊 Cross-Exchange Analysis:');
    console.log('─'.repeat(60));

    // Analyze BTC
    const btcSnapshot = monitor.getSnapshot('BTC/USDT') || monitor.getSnapshot('BTC/USD');
    if (btcSnapshot) {
      analyzeArbitrage(btcSnapshot);
    }

    // Analyze ETH
    const ethSnapshot = monitor.getSnapshot('ETH/USDT') || monitor.getSnapshot('ETH/USD');
    if (ethSnapshot) {
      analyzeArbitrage(ethSnapshot);
    }

    // Show stats
    console.log('\n📈 Exchange Statistics:');
    const stats = monitor.getStats();
    stats.forEach(stat => {
      console.log(`  ${stat.exchange}:`);
      console.log(`    Connected: ${stat.connected ? '✅' : '❌'}`);
      console.log(`    Uptime: ${stat.uptime.toFixed(1)}s`);
      console.log(`    Updates: ${stat.totalUpdates} (${stat.updatesPerSecond.toFixed(1)}/s)`);
      console.log(`    Errors: ${stat.errors}`);
    });
  }, 10000);

  // Run for 60 seconds then stop
  setTimeout(() => {
    clearInterval(analysisInterval);
    monitor.stop();
    console.log('\n✅ Multi-exchange monitoring complete.');
    process.exit(0);
  }, 60000);
}

/**
 * Analyze arbitrage opportunities across exchanges
 */
function analyzeArbitrage(snapshot: any) {
  const venues = Object.entries(snapshot.venues);
  if (venues.length < 2) return;

  console.log(`\n${snapshot.symbol}:`);

  // Find best bid (highest price to sell)
  const bestBidVenue = venues.reduce((best: any, [exchange, data]: any) => {
    return parseFloat(data.bid) > parseFloat(best[1].bid) ? [exchange, data] : best;
  }, venues[0]);

  // Find best ask (lowest price to buy)
  const bestAskVenue = venues.reduce((best: any, [exchange, data]: any) => {
    return parseFloat(data.ask) < parseFloat(best[1].ask) ? [exchange, data] : best;
  }, venues[0]);

  const bestBid = parseFloat(bestBidVenue[1].bid);
  const bestAsk = parseFloat(bestAskVenue[1].ask);
  const spread = bestBid - bestAsk;
  const spreadPercent = (spread / bestAsk) * 100;

  console.log(`  Best Bid: ${bestBidVenue[0]} @ $${bestBid.toFixed(2)}`);
  console.log(`  Best Ask: ${bestAskVenue[0]} @ $${bestAsk.toFixed(2)}`);
  console.log(`  Spread: $${spread.toFixed(2)} (${spreadPercent.toFixed(3)}%)`);

  // Detect arbitrage opportunity
  if (spreadPercent > 0.3) {
    console.log(`  🎯 ARBITRAGE OPPORTUNITY!`);
    console.log(`     Strategy: Buy on ${bestAskVenue[0]}, Sell on ${bestBidVenue[0]}`);
    console.log(`     Potential: ${spreadPercent.toFixed(3)}% profit (before fees)`);
  }

  // Show all venues
  console.log(`  All Venues:`);
  venues.forEach(([exchange, data]: any) => {
    const venue: any = data;
    console.log(`    ${exchange}: Bid $${parseFloat(venue.bid).toFixed(2)} | Ask $${parseFloat(venue.ask).toFixed(2)} | Spread ${venue.spreadBps.toFixed(1)} bps`);
  });
}

// Run the example
multiExchangeMonitoring().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
