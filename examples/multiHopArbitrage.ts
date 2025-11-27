/**
 * Multi-Hop Arbitrage Example
 * 
 * Demonstrates how to use the multi-hop arbitrage system to find
 * and visualize profitable arbitrage opportunities
 */

import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { 
  ArbitrageOrchestrator, 
  ArbitrageVisualizer,
  PathfindingConfig 
} from '../src/arbitrage';

async function main() {
  console.log('=== Multi-Hop Arbitrage Example ===\n');

  // 1. Initialize DEX Registry
  console.log('Initializing DEX Registry...');
  const registry = new DEXRegistry();
  console.log(`Loaded ${registry.getAllDEXes().length} DEXes\n`);

  // 2. Configure pathfinding parameters
  const config: PathfindingConfig = {
    maxHops: 4,                                      // Allow up to 4 hops
    minProfitThreshold: BigInt('1000000000000000000'), // 1 token minimum profit
    maxSlippage: 0.05,                               // 5% max slippage
    gasPrice: BigInt(50000000000)                    // 50 gwei
  };

  console.log('Configuration:');
  console.log(`  Max Hops: ${config.maxHops}`);
  console.log(`  Min Profit Threshold: ${config.minProfitThreshold} wei`);
  console.log(`  Max Slippage: ${config.maxSlippage * 100}%`);
  console.log(`  Gas Price: ${config.gasPrice} wei\n`);

  // 3. Create orchestrator
  const orchestrator = new ArbitrageOrchestrator(registry, config, config.gasPrice);
  console.log('Arbitrage Orchestrator initialized\n');

  // 4. Define tokens to analyze
  // These are example addresses - in production, use real token addresses
  const tokens = [
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  ];

  console.log('Tokens to analyze:');
  tokens.forEach((token, i) => {
    console.log(`  ${i + 1}. ${token}`);
  });
  console.log();

  // 5. Find arbitrage opportunities
  console.log('Searching for arbitrage opportunities...');
  console.log('(Note: This example uses mock data. In production, real pool data would be fetched)\n');

  const startAmount = BigInt('1000000000000000000000'); // 1000 tokens

  try {
    // In a real scenario, this would fetch actual pool data
    // For this example, we'll demonstrate the workflow
    const paths = await orchestrator.findOpportunities(tokens, startAmount);

    console.log(`Found ${paths.length} potential arbitrage paths\n`);

    // 6. Visualize results
    const visualizer = new ArbitrageVisualizer();

    if (paths.length > 0) {
      // Display summary statistics
      console.log(visualizer.formatSummaryStats(paths));

      // Display opportunities table
      console.log(visualizer.formatPathTable(paths));

      // Display detailed view of the most profitable path
      console.log('\n=== Most Profitable Path Details ===');
      console.log(visualizer.formatPath(paths[0]));
      console.log(visualizer.formatRouteMap(paths[0]));

      // Evaluate profitability
      const profitability = orchestrator.evaluatePath(paths[0]);
      console.log(visualizer.formatProfitability(profitability));
    } else {
      console.log('No profitable arbitrage opportunities found.');
      console.log('This could be due to:');
      console.log('  - Insufficient liquidity in pools');
      console.log('  - High gas costs relative to potential profit');
      console.log('  - No price inefficiencies between DEXs\n');
    }

    // 7. Display orchestrator statistics
    const stats = orchestrator.getStats();
    console.log('=== Orchestrator Statistics ===');
    console.log(`Token Count: ${stats.tokenCount}`);
    console.log(`Edge Count: ${stats.edgeCount}`);
    console.log(`Cached Pools: ${stats.cachedPools}\n`);

  } catch (error) {
    console.error('Error during arbitrage search:', error);
  }

  console.log('=== Example Complete ===\n');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
