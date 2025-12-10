/**
 * Integrated CEX-DEX Arbitrage Example
 * 
 * Demonstrates how to integrate CEX-DEX arbitrage detection
 * into the main IntegratedArbitrageOrchestrator for unified
 * opportunity detection and execution.
 * 
 * This example shows:
 * 1. Setting up CEX monitoring (5 exchanges)
 * 2. Configuring CEX-DEX arbitrage detector
 * 3. Integrating with IntegratedArbitrageOrchestrator
 * 4. Feeding DEX prices from pool monitoring
 * 5. Unified opportunity processing pipeline
 * 
 * Run with:
 * EXAMPLE=1 node --import tsx examples/integrated-cex-dex-arbitrage.ts
 * EXAMPLE=2 node --import tsx examples/integrated-cex-dex-arbitrage.ts
 * EXAMPLE=3 node --import tsx examples/integrated-cex-dex-arbitrage.ts
 */

import {
  CEXLiquidityMonitor,
  CEXDEXArbitrageDetector,
  CEXExchange,
} from '../src/execution/cex/index.js';
import type { DEXPriceData } from '../src/execution/cex/CEXDEXArbitrageDetector.js';
// IntegratedArbitrageOrchestrator would be imported here in real usage
// import { IntegratedArbitrageOrchestrator } from '../src/execution/IntegratedArbitrageOrchestrator.js';

/**
 * Example 1: Basic CEX-DEX Integration Setup
 * Shows minimal configuration to enable CEX-DEX arbitrage
 */
async function example1_BasicSetup() {
  console.log('\n=== Example 1: Basic CEX-DEX Integration Setup ===\n');

  // 1. Create CEX monitor for multiple exchanges
  const cexMonitor = new CEXLiquidityMonitor({
    exchanges: [
      {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDT', 'ETH/USDC'],
      },
      {
        exchange: CEXExchange.COINBASE,
        symbols: ['BTC/USDT', 'ETH/USDT', 'ETH/USDC'],
      },
    ],
    updateInterval: 1000, // 1 second updates
  });

  // 2. Create CEX-DEX arbitrage detector
  const cexDexDetector = new CEXDEXArbitrageDetector(
    {
      minPriceDiffPercent: 0.5, // 0.5% minimum spread
      maxTradeSizeUsd: 10000, // $10k max trade
      minNetProfitUsd: 10, // $10 minimum net profit
    },
    {
      onOpportunityFound: (opportunity) => {
        console.log('\n🎯 CEX-DEX Opportunity Found!');
        console.log(`  Path: ${opportunity.path.map((p) => p.tokenSymbol).join(' → ')}`);
        console.log(`  Expected Profit: $${opportunity.expectedProfit}`);
        console.log(`  Type: ${opportunity.type}`);
        console.log(`  Status: ${opportunity.status}`);
      },
    }
  );

  // 3. In real usage, integrate with IntegratedArbitrageOrchestrator:
  // orchestrator.enableCEXDEXArbitrage(cexMonitor, cexDexDetector);
  // await orchestrator.start(signer);

  console.log('✅ CEX-DEX integration setup complete');
  console.log('   - CEX Monitor: 2 exchanges, 3 symbols each');
  console.log('   - Detector: 0.5% min spread, $10k max trade');
  console.log('   - Ready for DEX price feeds');

  // For this example, we'll start the monitor standalone
  await cexMonitor.start();
  cexDexDetector.setCEXMonitor(cexMonitor);

  // Simulate DEX price feed (in real usage, this comes from pool monitoring)
  console.log('\n📊 Simulating DEX price updates...');

  setTimeout(() => {
    const dexPrice: DEXPriceData = {
      symbol: 'BTC/USDT',
      dex: 'Uniswap V3',
      price: '50000', // $50k BTC price on DEX
      liquidity: '10000000', // $10M liquidity
      pool: '0x1234567890abcdef1234567890abcdef12345678',
      timestamp: Date.now(),
    };

    cexDexDetector.updateDEXPrice(dexPrice);
    const opportunities = cexDexDetector.detectOpportunities('BTC/USDT');
    console.log(`   Found ${opportunities.length} opportunities for BTC/USDT`);
  }, 2000);

  setTimeout(() => {
    const dexPrice: DEXPriceData = {
      symbol: 'ETH/USDT',
      dex: 'Uniswap V3',
      price: '3000', // $3k ETH price on DEX
      liquidity: '5000000', // $5M liquidity
      pool: '0xabcdef1234567890abcdef1234567890abcdef12',
      timestamp: Date.now(),
    };

    cexDexDetector.updateDEXPrice(dexPrice);
    const opportunities = cexDexDetector.detectOpportunities('ETH/USDT');
    console.log(`   Found ${opportunities.length} opportunities for ETH/USDT`);
  }, 4000);

  // Run for 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 10000));

  cexMonitor.stop();
  console.log('\n✅ Example 1 complete\n');
}

/**
 * Example 2: Multi-DEX Price Feed Integration
 * Shows how to feed prices from multiple DEX sources
 */
async function example2_MultiDEXPriceFeed() {
  console.log('\n=== Example 2: Multi-DEX Price Feed Integration ===\n');

  const cexMonitor = new CEXLiquidityMonitor({
    exchanges: [
      { exchange: CEXExchange.BINANCE, symbols: ['ETH/USDT', 'ETH/USDC'] },
      { exchange: CEXExchange.OKX, symbols: ['ETH/USDT', 'ETH/USDC'] },
    ],
  });

  const cexDexDetector = new CEXDEXArbitrageDetector(
    { minPriceDiffPercent: 0.3, minNetProfitUsd: 20 },
    {
      onOpportunityFound: (opp) => {
        console.log(`🎯 Opportunity: ${opp.path[0].tokenSymbol} - Profit: $${opp.expectedProfit}`);
      },
    }
  );

  await cexMonitor.start();
  cexDexDetector.setCEXMonitor(cexMonitor);

  // Simulate DEX prices from multiple sources
  const dexPrices: DEXPriceData[] = [
    {
      symbol: 'ETH/USDT',
      dex: 'Uniswap V3',
      price: '3001.50',
      liquidity: '8000000',
      pool: '0x1234567890abcdef1234567890abcdef12345678',
      timestamp: Date.now(),
    },
    {
      symbol: 'ETH/USDT',
      dex: 'Uniswap V2',
      price: '3002.00',
      liquidity: '5000000',
      pool: '0xabcdef1234567890abcdef1234567890abcdef12',
      timestamp: Date.now(),
    },
    {
      symbol: 'ETH/USDC',
      dex: 'SushiSwap',
      price: '3000.75',
      liquidity: '3000000',
      pool: '0x567890abcdef1234567890abcdef1234567890ab',
      timestamp: Date.now(),
    },
  ];

  console.log('📊 Feeding prices from 3 DEX sources...\n');

  setTimeout(() => {
    cexDexDetector.updateDEXPrices(dexPrices);

    // Detect opportunities for each symbol
    console.log('🔍 Detecting opportunities...');
    const ethUsdtOpps = cexDexDetector.detectOpportunities('ETH/USDT');
    const ethUsdcOpps = cexDexDetector.detectOpportunities('ETH/USDC');

    console.log(`   ETH/USDT: ${ethUsdtOpps.length} opportunities`);
    console.log(`   ETH/USDC: ${ethUsdcOpps.length} opportunities`);

    // Display detector stats
    const stats = cexDexDetector.getStats();
    console.log('\n📈 Detector Statistics:');
    console.log(`   Total opportunities: ${stats.totalOpportunities}`);
    console.log(`   Opportunities above threshold: ${stats.profitableOpportunities}`);
    console.log(`   Avg spread: ${stats.averageSpreadPercent.toFixed(3)}%`);
    console.log(`   Total potential profit: $${stats.totalPotentialProfit.toFixed(2)}`);
  }, 2000);

  await new Promise((resolve) => setTimeout(resolve, 5000));
  cexMonitor.stop();
  console.log('\n✅ Example 2 complete\n');
}

/**
 * Example 3: Full Integration with Orchestrator Pattern
 * Shows the complete integration pattern (pseudo-code)
 */
async function example3_OrchestratorIntegration() {
  console.log('\n=== Example 3: Orchestrator Integration Pattern ===\n');

  console.log('This example shows the integration pattern used in production:');
  console.log('');
  console.log('```typescript');
  console.log('// 1. Create base components');
  console.log('const baseOrchestrator = new ArbitrageOrchestrator(/*...*/);');
  console.log('const orchestrator = new IntegratedArbitrageOrchestrator(');
  console.log('  baseOrchestrator,');
  console.log('  provider,');
  console.log('  gasOracle,');
  console.log('  gasEstimator,');
  console.log('  executorAddress,');
  console.log('  titheRecipient,');
  console.log('  arbitrageConfig,');
  console.log('  orchestratorConfig');
  console.log(');');
  console.log('');
  console.log('// 2. Create CEX-DEX components');
  console.log('const cexMonitor = new CEXLiquidityMonitor({');
  console.log('  exchanges: [');
  console.log('    { exchange: CEXExchange.BINANCE, symbols: ["BTC/USDT", "ETH/USDT"] },');
  console.log('    { exchange: CEXExchange.COINBASE, symbols: ["BTC/USDT", "ETH/USDT"] },');
  console.log('    { exchange: CEXExchange.OKX, symbols: ["BTC/USDT", "ETH/USDT"] },');
  console.log('  ],');
  console.log('});');
  console.log('');
  console.log('const cexDexDetector = new CEXDEXArbitrageDetector(');
  console.log('  { minPriceDiffPercent: 0.5, maxTradeSizeUsd: 10000 },');
  console.log('  {');
  console.log('    onOpportunityFound: async (opportunity) => {');
  console.log('      // Opportunity automatically flows into execution pipeline');
  console.log('      await orchestrator.processOpportunity(opportunity, path);');
  console.log('    },');
  console.log('  }');
  console.log(');');
  console.log('');
  console.log('// 3. Enable CEX-DEX arbitrage in orchestrator');
  console.log('orchestrator.enableCEXDEXArbitrage(cexMonitor, cexDexDetector);');
  console.log('');
  console.log('// 4. Start orchestrator (automatically starts CEX monitoring)');
  console.log('await orchestrator.start(signer);');
  console.log('');
  console.log('// 5. Feed DEX prices from pool monitoring');
  console.log('poolMonitor.on("priceUpdate", (poolData) => {');
  console.log('  const dexPrice: DEXPriceData = {');
  console.log('    symbol: poolData.symbol,');
  console.log('    dex: poolData.dexName,');
  console.log('    price: poolData.price,');
  console.log('    liquidity: poolData.liquidity,');
  console.log('    pool: poolData.address,');
  console.log('    timestamp: Date.now(),');
  console.log('  };');
  console.log('  orchestrator.updateDEXPrice(dexPrice);');
  console.log('});');
  console.log('');
  console.log('// 6. Manually trigger detection (optional)');
  console.log('setInterval(() => {');
  console.log('  orchestrator.detectCEXDEXOpportunities("BTC/USDT");');
  console.log('  orchestrator.detectCEXDEXOpportunities("ETH/USDT");');
  console.log('}, 5000);');
  console.log('');
  console.log('// 7. Monitor statistics');
  console.log('setInterval(() => {');
  console.log('  const stats = orchestrator.getStats();');
  console.log('  console.log("CEX-DEX Opportunities:", stats.cexDexOpportunities);');
  console.log('  console.log("CEX-DEX Accepted:", stats.cexDexAccepted);');
  console.log('  console.log("CEX Monitor Status:", stats.cexMonitorStats);');
  console.log('}, 60000);');
  console.log('```');
  console.log('');
  console.log('✅ Integration pattern documented\n');
}

/**
 * Main execution
 */
async function main() {
  const example = process.env.EXAMPLE || '1';

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Integrated CEX-DEX Arbitrage Example                   ║');
  console.log('║  TheWarden - Autonomous DeFi Arbitrage System           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    switch (example) {
      case '1':
        await example1_BasicSetup();
        break;
      case '2':
        await example2_MultiDEXPriceFeed();
        break;
      case '3':
        await example3_OrchestratorIntegration();
        break;
      default:
        console.log('\n❌ Invalid example number. Use EXAMPLE=1, 2, or 3\n');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error running example:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { example1_BasicSetup, example2_MultiDEXPriceFeed, example3_OrchestratorIntegration };
