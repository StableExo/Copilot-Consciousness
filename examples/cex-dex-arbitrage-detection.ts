/**
 * CEX-DEX Arbitrage Detection Example
 * 
 * Demonstrates real-time arbitrage opportunity detection between
 * centralized exchanges (CEX) and decentralized exchanges (DEX).
 * 
 * This example shows:
 * 1. Setting up CEX monitoring across multiple exchanges
 * 2. Feeding DEX prices from existing pool monitoring
 * 3. Detecting arbitrage opportunities in real-time
 * 4. Calculating profit after fees (CEX + DEX + gas)
 * 5. Filtering by minimum profitability threshold
 * 
 * Run: EXAMPLE=1 node --import tsx examples/cex-dex-arbitrage-detection.ts
 */

import {
  CEXLiquidityMonitor,
  CEXDEXArbitrageDetector,
  CEXExchange,
  CEXDEXArbitrage,
} from '../src/execution/cex/index.js';
import type { DEXPriceData } from '../src/execution/cex/CEXDEXArbitrageDetector.js';
import type { ArbitrageOpportunity } from '../src/arbitrage/models/ArbitrageOpportunity.js';

const EXAMPLE = process.env.EXAMPLE || '1';

/**
 * Example 1: Basic CEX-DEX Arbitrage Detection
 * 
 * Monitors one CEX (Binance) and simulates DEX prices to detect opportunities
 */
async function example1_BasicArbitrageDetection() {
  console.log('\n=== Example 1: Basic CEX-DEX Arbitrage Detection ===\n');
  
  // 1. Create CEX liquidity monitor
  const cexMonitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
        testnet: false, // Use mainnet for real prices
      },
    ],
    updateInterval: 5000, // Update snapshots every 5 seconds
  });
  
  // 2. Create arbitrage detector with custom config
  const detector = new CEXDEXArbitrageDetector({
    minPriceDiffPercent: 0.5, // 0.5% minimum spread
    maxTradeSizeUsd: 10000, // $10k max trade size
    minNetProfitUsd: 10, // $10 minimum profit after fees
    gasEstimateUsd: 15, // ~$15 gas cost
    cexFees: {
      [CEXExchange.BINANCE]: 0.1, // 0.1% Binance fee
    },
    dexSwapFeePercent: 0.3, // 0.3% Uniswap fee
    slippagePercent: 0.5, // 0.5% slippage
  }, {
    // Callback when opportunity found
    onOpportunityFound: (opportunity: ArbitrageOpportunity) => {
      console.log('\n🎯 Arbitrage Opportunity Found!');
      console.log(`  Opportunity ID: ${opportunity.opportunityId}`);
      console.log(`  Type: ${opportunity.arbType}`);
      console.log(`  Protocols: ${opportunity.protocols.join(' → ')}`);
      console.log(`  Input: $${opportunity.inputAmount.toFixed(2)}`);
      console.log(`  Expected Output: $${opportunity.expectedOutput.toFixed(2)}`);
      console.log(`  Gross Profit: $${opportunity.grossProfit.toFixed(2)}`);
      console.log(`  Net Profit: $${opportunity.netProfit?.toFixed(2) || 'N/A'}`);
      console.log(`  Profit Margin: ${opportunity.netProfitMargin ? (opportunity.netProfitMargin * 100).toFixed(2) : 'N/A'}%`);
      console.log(`  Status: ${opportunity.status}`);
      
      // Show metadata
      if (opportunity.metadata) {
        const meta = opportunity.metadata as any;
        console.log(`  Direction: ${meta.direction}`);
        console.log(`  CEX Exchange: ${meta.cexExchange}`);
        console.log(`  DEX Name: ${meta.dexName}`);
        console.log(`  CEX Price: $${meta.cexPrice}`);
        console.log(`  DEX Price: $${meta.dexPrice}`);
        
        if (meta.fees) {
          console.log(`  Fees Breakdown:`);
          console.log(`    CEX Trading Fee: $${meta.fees.cexTradingFee.toFixed(2)}`);
          console.log(`    DEX Swap Fee: $${meta.fees.dexSwapFee.toFixed(2)}`);
          console.log(`    Gas Cost: $${meta.fees.gasCost.toFixed(2)}`);
          console.log(`    Slippage: $${meta.fees.slippage.toFixed(2)}`);
          console.log(`    Total Fees: $${meta.fees.total.toFixed(2)}`);
        }
      }
    },
  });
  
  // 3. Link detector to CEX monitor
  detector.setCEXMonitor(cexMonitor);
  
  // 4. Simulate DEX prices (in production, these would come from pool monitoring)
  const simulatedDEXPrices: DEXPriceData[] = [
    {
      symbol: 'BTC/USDT',
      dex: 'Uniswap V3',
      price: '50000', // Will be compared with CEX prices
      liquidity: '10000000',
      pool: '0x1234567890abcdef',
      timestamp: Date.now(),
    },
    {
      symbol: 'ETH/USDT',
      dex: 'Uniswap V3',
      price: '3000',
      liquidity: '5000000',
      pool: '0xabcdef1234567890',
      timestamp: Date.now(),
    },
  ];
  
  // 5. Start CEX monitoring
  console.log('Starting CEX monitoring...');
  await cexMonitor.start();
  
  // 6. Periodically update DEX prices and detect opportunities
  console.log('Monitoring for arbitrage opportunities (30 seconds)...\n');
  
  const detectionInterval = setInterval(() => {
    // Update DEX prices (simulated - in production these come from pool monitoring)
    detector.updateDEXPrices(simulatedDEXPrices);
    
    // Detect opportunities for each symbol
    for (const priceData of simulatedDEXPrices) {
      const opportunities = detector.detectOpportunities(priceData.symbol);
      
      if (opportunities.length > 0) {
        console.log(`\nFound ${opportunities.length} opportunity(ies) for ${priceData.symbol}`);
        
        for (const opp of opportunities) {
          console.log(`  ${opp.direction}: Net Profit = $${opp.netProfit.toFixed(2)} (${opp.netProfitPercent.toFixed(2)}%)`);
        }
      }
    }
    
    // Show statistics
    const stats = detector.getStats();
    console.log(`\nStatistics:`);
    console.log(`  Total Opportunities: ${stats.totalOpportunities}`);
    console.log(`  Total Potential Profit: $${stats.totalPotentialProfit.toFixed(2)}`);
    console.log(`  Avg Net Profit %: ${stats.avgNetProfitPercent.toFixed(2)}%`);
    console.log(`  Symbols Monitored: ${stats.symbols.join(', ')}`);
    
  }, 10000); // Check every 10 seconds
  
  // 7. Run for 30 seconds then stop
  setTimeout(() => {
    clearInterval(detectionInterval);
    cexMonitor.stop();
    console.log('\nMonitoring stopped.');
    
    // Final statistics
    const finalStats = detector.getStats();
    console.log('\n=== Final Statistics ===');
    console.log(`Total Opportunities Found: ${finalStats.totalOpportunities}`);
    console.log(`Total Potential Profit: $${finalStats.totalPotentialProfit.toFixed(2)}`);
    console.log(`Average Net Profit %: ${finalStats.avgNetProfitPercent.toFixed(2)}%`);
    
    process.exit(0);
  }, 30000);
}

/**
 * Example 2: Multi-Exchange Arbitrage Detection
 * 
 * Monitors multiple CEXs (Binance, Coinbase, OKX) simultaneously
 */
async function example2_MultiExchangeArbitrage() {
  console.log('\n=== Example 2: Multi-Exchange Arbitrage Detection ===\n');
  
  // 1. Create CEX monitor with multiple exchanges
  const cexMonitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
      {
        exchange: CEXExchange.COINBASE,
        symbols: ['BTC/USD', 'ETH/USD'],
      },
      {
        exchange: CEXExchange.OKX,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
    ],
    updateInterval: 5000,
  });
  
  // 2. Create detector
  const detector = new CEXDEXArbitrageDetector({
    minPriceDiffPercent: 0.5,
    maxTradeSizeUsd: 10000,
    minNetProfitUsd: 10,
  });
  
  detector.setCEXMonitor(cexMonitor);
  
  // 3. Simulated DEX prices
  const dexPrices: DEXPriceData[] = [
    {
      symbol: 'BTC/USDT',
      dex: 'Uniswap V3',
      price: '50000',
      liquidity: '10000000',
      pool: '0x1234',
      timestamp: Date.now(),
    },
  ];
  
  // 4. Start monitoring
  console.log('Starting multi-exchange monitoring...');
  await cexMonitor.start();
  
  // 5. Check for opportunities across all exchanges
  console.log('Monitoring opportunities across multiple exchanges (20 seconds)...\n');
  
  const checkInterval = setInterval(() => {
    detector.updateDEXPrices(dexPrices);
    
    // Detect opportunities
    const btcOpps = detector.detectOpportunities('BTC/USDT');
    
    if (btcOpps.length > 0) {
      console.log(`\n📊 Found ${btcOpps.length} opportunities for BTC/USDT:`);
      
      // Group by exchange
      const byExchange = new Map<string, CEXDEXArbitrage[]>();
      for (const opp of btcOpps) {
        const exchange = opp.cexExchange;
        if (!byExchange.has(exchange)) {
          byExchange.set(exchange, []);
        }
        byExchange.get(exchange)!.push(opp);
      }
      
      // Display by exchange
      for (const [exchange, opps] of byExchange.entries()) {
        console.log(`\n  ${exchange}:`);
        for (const opp of opps) {
          console.log(`    ${opp.direction}: $${opp.netProfit.toFixed(2)} profit (${opp.netProfitPercent.toFixed(2)}%)`);
          console.log(`      CEX: $${opp.cexPrice} | DEX: $${opp.dexPrice}`);
        }
      }
      
      // Find best opportunity
      const bestOpp = btcOpps.reduce((best, curr) => 
        curr.netProfit > best.netProfit ? curr : best
      );
      
      console.log(`\n  🏆 Best Opportunity: ${bestOpp.cexExchange}`);
      console.log(`     Net Profit: $${bestOpp.netProfit.toFixed(2)}`);
      console.log(`     Direction: ${bestOpp.direction}`);
    }
    
    // Show CEX monitor stats
    const cexStats = cexMonitor.getStats();
    console.log(`\n📡 CEX Monitor Stats:`);
    for (const stat of cexStats) {
      console.log(`  ${stat.exchange}: ${stat.connected ? '✓' : '✗'} | ${stat.updatesPerSecond.toFixed(1)} ups | ${stat.errors} errors`);
    }
    
  }, 10000);
  
  // Stop after 20 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    cexMonitor.stop();
    console.log('\nMonitoring stopped.');
    process.exit(0);
  }, 20000);
}

/**
 * Example 3: High-Frequency Opportunity Scanning
 * 
 * Rapid scanning with lower latency for high-frequency strategies
 */
async function example3_HighFrequencyScanning() {
  console.log('\n=== Example 3: High-Frequency Opportunity Scanning ===\n');
  
  // Create monitor with shorter update interval
  const cexMonitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT'],
      },
    ],
    updateInterval: 1000, // 1 second updates
  });
  
  // Create detector with lower thresholds for more opportunities
  const detector = new CEXDEXArbitrageDetector({
    minPriceDiffPercent: 0.3, // Lower threshold (0.3%)
    maxTradeSizeUsd: 5000, // Smaller trades
    minNetProfitUsd: 5, // Lower profit threshold
    gasEstimateUsd: 10, // Lower gas estimate
  });
  
  detector.setCEXMonitor(cexMonitor);
  
  // Simulated DEX prices
  const dexPrices: DEXPriceData[] = [
    {
      symbol: 'BTC/USDT',
      dex: 'Uniswap V3',
      price: '50000',
      liquidity: '10000000',
      pool: '0x1234',
      timestamp: Date.now(),
    },
  ];
  
  console.log('Starting high-frequency scanning (fast updates)...');
  await cexMonitor.start();
  
  let opportunityCount = 0;
  let totalProfit = 0;
  
  // Scan every 2 seconds
  const scanInterval = setInterval(() => {
    detector.updateDEXPrices(dexPrices);
    
    const opportunities = detector.detectOpportunities('BTC/USDT');
    
    if (opportunities.length > 0) {
      opportunityCount += opportunities.length;
      for (const opp of opportunities) {
        totalProfit += opp.netProfit;
        console.log(`⚡ Quick Opportunity: $${opp.netProfit.toFixed(2)} (${opp.netProfitPercent.toFixed(3)}%)`);
      }
    }
    
    console.log(`  Scanned: ${opportunityCount} opportunities, $${totalProfit.toFixed(2)} total profit potential`);
    
  }, 2000); // Scan every 2 seconds
  
  // Stop after 15 seconds
  setTimeout(() => {
    clearInterval(scanInterval);
    cexMonitor.stop();
    
    console.log('\n=== High-Frequency Scan Results ===');
    console.log(`Total Opportunities: ${opportunityCount}`);
    console.log(`Total Profit Potential: $${totalProfit.toFixed(2)}`);
    console.log(`Avg Profit per Opportunity: $${(totalProfit / Math.max(opportunityCount, 1)).toFixed(2)}`);
    
    process.exit(0);
  }, 15000);
}

/**
 * Example 4: Production-Ready Configuration
 * 
 * Shows recommended configuration for production deployment
 */
async function example4_ProductionConfiguration() {
  console.log('\n=== Example 4: Production-Ready Configuration ===\n');
  
  // Production-grade configuration
  const cexMonitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT', 'ETH/USDC'],
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectDelay: 5000,
      },
      {
        exchange: CEXExchange.COINBASE,
        symbols: ['BTC/USD', 'ETH/USD'],
        reconnect: true,
        maxReconnectAttempts: 10,
      },
      {
        exchange: CEXExchange.OKX,
        symbols: ['BTC/USDT', 'ETH/USDT'],
        reconnect: true,
        maxReconnectAttempts: 10,
      },
    ],
    updateInterval: 3000, // 3 second snapshots
    minSpreadBps: 5, // 0.05% minimum spread
  });
  
  // Production detector with conservative settings
  const detector = new CEXDEXArbitrageDetector({
    minPriceDiffPercent: 0.6, // 0.6% minimum for safety margin
    maxTradeSizeUsd: 25000, // $25k max (can adjust based on capital)
    minNetProfitUsd: 25, // $25 minimum profit
    gasEstimateUsd: 20, // Higher gas estimate for safety
    cexFees: {
      [CEXExchange.BINANCE]: 0.1,
      [CEXExchange.COINBASE]: 0.6,
      [CEXExchange.OKX]: 0.1,
    },
    dexSwapFeePercent: 0.3,
    slippagePercent: 1.0, // Higher slippage tolerance (1%)
  }, {
    onOpportunityFound: (opportunity: ArbitrageOpportunity) => {
      // In production, this would:
      // 1. Validate opportunity (double-check prices)
      // 2. Check wallet balances
      // 3. Queue for execution if profitable
      // 4. Log to database
      console.log(`✅ Production Opportunity: ${opportunity.opportunityId}`);
      console.log(`   Net Profit: $${opportunity.netProfit?.toFixed(2)}`);
      console.log(`   Ready for execution pipeline`);
    },
  });
  
  detector.setCEXMonitor(cexMonitor);
  
  // In production, DEX prices would come from TheWarden's pool monitoring
  const dexPrices: DEXPriceData[] = [
    {
      symbol: 'BTC/USDT',
      dex: 'Uniswap V3',
      price: '50000',
      liquidity: '10000000',
      pool: '0x1234',
      timestamp: Date.now(),
    },
  ];
  
  console.log('Starting production-ready monitoring...');
  console.log('Configuration:');
  console.log('  Min Price Diff: 0.6%');
  console.log('  Max Trade Size: $25,000');
  console.log('  Min Net Profit: $25');
  console.log('  Slippage Tolerance: 1.0%');
  console.log('  Exchanges: Binance, Coinbase, OKX');
  console.log('\n');
  
  await cexMonitor.start();
  
  // Production monitoring loop
  const monitorInterval = setInterval(() => {
    detector.updateDEXPrices(dexPrices);
    
    // Scan all symbols
    for (const priceData of dexPrices) {
      const opportunities = detector.detectOpportunities(priceData.symbol);
      
      if (opportunities.length > 0) {
        console.log(`\n🎯 ${opportunities.length} opportunities for ${priceData.symbol}`);
        
        // Filter for best opportunities
        const highValueOpps = opportunities.filter(opp => opp.netProfit >= 50);
        
        if (highValueOpps.length > 0) {
          console.log(`   ${highValueOpps.length} high-value opportunities (>$50 profit)`);
          
          const best = highValueOpps.reduce((a, b) => a.netProfit > b.netProfit ? a : b);
          console.log(`   Best: ${best.cexExchange} - $${best.netProfit.toFixed(2)} profit`);
        }
      }
    }
    
    // Health monitoring
    const stats = cexMonitor.getStats();
    const healthyConnections = stats.filter(s => s.connected).length;
    const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);
    
    console.log(`\n📊 System Health:`);
    console.log(`   Connected Exchanges: ${healthyConnections}/${stats.length}`);
    console.log(`   Total Errors: ${totalErrors}`);
    console.log(`   Detector Opportunities: ${detector.getStats().totalOpportunities}`);
    
  }, 5000); // Monitor every 5 seconds
  
  // Run for 20 seconds
  setTimeout(() => {
    clearInterval(monitorInterval);
    cexMonitor.stop();
    
    const finalStats = detector.getStats();
    console.log('\n=== Production Run Summary ===');
    console.log(`Total Opportunities: ${finalStats.totalOpportunities}`);
    console.log(`Total Potential Profit: $${finalStats.totalPotentialProfit.toFixed(2)}`);
    console.log(`Average Profit %: ${finalStats.avgNetProfitPercent.toFixed(2)}%`);
    console.log('\nProduction monitoring complete.');
    
    process.exit(0);
  }, 20000);
}

// Run selected example
async function main() {
  console.log('CEX-DEX Arbitrage Detection Examples');
  console.log('=====================================\n');
  
  switch (EXAMPLE) {
    case '1':
      await example1_BasicArbitrageDetection();
      break;
    case '2':
      await example2_MultiExchangeArbitrage();
      break;
    case '3':
      await example3_HighFrequencyScanning();
      break;
    case '4':
      await example4_ProductionConfiguration();
      break;
    default:
      console.log('Invalid example number. Use EXAMPLE=1,2,3, or 4');
      process.exit(1);
  }
}

main().catch(console.error);
