/**
 * CEX Liquidity Monitoring - Example Usage
 * 
 * Demonstrates how to monitor real-time liquidity from centralized exchanges
 * and detect CEX-DEX arbitrage opportunities.
 * 
 * Run with: EXAMPLE=1 node --import tsx examples/cex-liquidity-monitoring.ts
 */

import { CEXLiquidityMonitor, CEXExchange } from '../src/execution/cex/index.js';

// Example 1: Basic Binance Monitoring
async function example1_basicMonitoring() {
  console.log('\n========================================');
  console.log('Example 1: Basic Binance Monitoring');
  console.log('========================================\n');

  const monitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDC'],
      },
    ],
    updateInterval: 1000, // 1 second snapshots
    onOrderBook: (orderBook) => {
      console.log(`\n[${orderBook.exchange}] ${orderBook.symbol} Order Book:`);
      console.log(`  Best Bid: $${orderBook.bids[0]?.price} (${orderBook.bids[0]?.quantity})`);
      console.log(`  Best Ask: $${orderBook.asks[0]?.price} (${orderBook.asks[0]?.quantity})`);
      
      if (orderBook.bids[0] && orderBook.asks[0]) {
        const spread = parseFloat(orderBook.asks[0].price) - parseFloat(orderBook.bids[0].price);
        const spreadPercent = (spread / parseFloat(orderBook.bids[0].price)) * 100;
        console.log(`  Spread: $${spread.toFixed(2)} (${spreadPercent.toFixed(3)}%)`);
      }
    },
    onTicker: (ticker) => {
      console.log(`\n[${ticker.exchange}] ${ticker.symbol} Ticker:`);
      console.log(`  Last Price: $${ticker.last}`);
      console.log(`  24h Volume: ${ticker.volume24h}`);
    },
  });

  await monitor.start();
  console.log('\n✅ Monitoring started. Press Ctrl+C to stop.\n');

  // Run for 30 seconds then stop
  setTimeout(() => {
    monitor.stop();
    console.log('\n✅ Monitoring stopped.');
    process.exit(0);
  }, 30000);
}

// Example 2: Liquidity Snapshot Analysis
async function example2_liquiditySnapshots() {
  console.log('\n========================================');
  console.log('Example 2: Liquidity Snapshot Analysis');
  console.log('========================================\n');

  const monitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      },
    ],
    updateInterval: 2000, // 2 second snapshots
    minSpreadBps: 5, // 0.05% minimum spread
  });

  await monitor.start();
  console.log('✅ Monitoring started.\n');

  // Every 5 seconds, get snapshot
  const snapshotInterval = setInterval(() => {
    const snapshot = monitor.getSnapshot('BTC/USDT');
    
    if (snapshot) {
      console.log('\n📊 Liquidity Snapshot:');
      console.log(`  Symbol: ${snapshot.symbol}`);
      console.log(`  Timestamp: ${new Date(snapshot.timestamp).toISOString()}`);
      
      for (const [exchange, data] of Object.entries(snapshot.venues)) {
        console.log(`\n  ${exchange}:`);
        console.log(`    Bid: $${data.bid} (${data.bidVolume})`);
        console.log(`    Ask: $${data.ask} (${data.askVolume})`);
        console.log(`    Spread: ${data.spreadBps.toFixed(2)} bps`);
      }
    }
  }, 5000);

  // Run for 30 seconds
  setTimeout(() => {
    clearInterval(snapshotInterval);
    monitor.stop();
    console.log('\n✅ Example complete.');
    process.exit(0);
  }, 30000);
}

// Example 3: CEX-DEX Arbitrage Detection (Simulated)
async function example3_arbitrageDetection() {
  console.log('\n========================================');
  console.log('Example 3: CEX-DEX Arbitrage Detection');
  console.log('========================================\n');

  // Simulated DEX price (in production, fetch from OpportunityDetector)
  const simulatedDEXPrice = {
    'ETH/USDC': 3450.0, // Slightly different from CEX
  };

  let opportunityCount = 0;

  const monitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['ETH/USDC'],
      },
    ],
    onTicker: (ticker) => {
      const cexPrice = parseFloat(ticker.last);
      const dexPrice = simulatedDEXPrice[ticker.symbol as keyof typeof simulatedDEXPrice];
      
      if (dexPrice) {
        const priceDiff = Math.abs(cexPrice - dexPrice);
        const priceDiffPercent = (priceDiff / cexPrice) * 100;
        
        // Check if arbitrage opportunity exists (>0.5% spread)
        if (priceDiffPercent > 0.5) {
          opportunityCount++;
          
          const direction = cexPrice < dexPrice 
            ? 'Buy CEX → Sell DEX'
            : 'Buy DEX → Sell CEX';
          
          console.log('\n🚨 Arbitrage Opportunity Detected!');
          console.log(`  Symbol: ${ticker.symbol}`);
          console.log(`  CEX Price: $${cexPrice.toFixed(2)}`);
          console.log(`  DEX Price: $${dexPrice.toFixed(2)}`);
          console.log(`  Price Diff: ${priceDiffPercent.toFixed(3)}%`);
          console.log(`  Direction: ${direction}`);
          
          // Calculate estimated profit (simplified)
          const tradeSize = 1.0; // 1 ETH
          const grossProfit = priceDiff * tradeSize;
          const cexFee = (cexPrice * tradeSize) * 0.001; // 0.1% Binance fee
          const dexFee = (dexPrice * tradeSize) * 0.003; // 0.3% DEX fee
          const estimatedGas = 10; // $10 gas estimate
          const netProfit = grossProfit - cexFee - dexFee - estimatedGas;
          
          console.log(`  Estimated Net Profit: $${netProfit.toFixed(2)}`);
          console.log(`  (For ${tradeSize} ETH trade)`);
        }
      }
    },
  });

  await monitor.start();
  console.log('✅ Arbitrage detection started.\n');

  setTimeout(() => {
    monitor.stop();
    console.log(`\n✅ Detection stopped. Found ${opportunityCount} opportunities.`);
    process.exit(0);
  }, 60000); // Run for 1 minute
}

// Example 4: Statistics Monitoring
async function example4_statistics() {
  console.log('\n========================================');
  console.log('Example 4: Statistics Monitoring');
  console.log('========================================\n');

  const monitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDC'],
      },
    ],
  });

  await monitor.start();
  console.log('✅ Monitoring started.\n');

  // Print stats every 10 seconds
  const statsInterval = setInterval(() => {
    const stats = monitor.getStats();
    
    console.log('\n📈 Exchange Statistics:');
    for (const stat of stats) {
      console.log(`\n  ${stat.exchange}:`);
      console.log(`    Connected: ${stat.connected ? '✅' : '❌'}`);
      console.log(`    Uptime: ${stat.uptime.toFixed(1)}s`);
      console.log(`    Total Updates: ${stat.totalUpdates}`);
      console.log(`    Updates/sec: ${stat.updatesPerSecond.toFixed(2)}`);
      console.log(`    Errors: ${stat.errors}`);
      console.log(`    Reconnections: ${stat.reconnections}`);
      console.log(`    Subscribed Symbols: ${stat.subscribedSymbols.join(', ')}`);
    }
  }, 10000);

  setTimeout(() => {
    clearInterval(statsInterval);
    monitor.stop();
    console.log('\n✅ Example complete.');
    process.exit(0);
  }, 40000); // Run for 40 seconds
}

// Main entry point
async function main() {
  const exampleNum = process.env.EXAMPLE || '1';

  switch (exampleNum) {
    case '1':
      await example1_basicMonitoring();
      break;
    case '2':
      await example2_liquiditySnapshots();
      break;
    case '3':
      await example3_arbitrageDetection();
      break;
    case '4':
      await example4_statistics();
      break;
    default:
      console.log('Available examples:');
      console.log('  EXAMPLE=1 - Basic Binance Monitoring');
      console.log('  EXAMPLE=2 - Liquidity Snapshot Analysis');
      console.log('  EXAMPLE=3 - CEX-DEX Arbitrage Detection');
      console.log('  EXAMPLE=4 - Statistics Monitoring');
      process.exit(0);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
