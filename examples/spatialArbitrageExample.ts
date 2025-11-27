/**
 * Spatial Arbitrage Engine Example
 * 
 * Demonstrates usage of SpatialArbEngine for cross-DEX arbitrage detection.
 * This example shows how to find price differences for the same token pair
 * across different DEXs (e.g., Uniswap vs SushiSwap).
 */

import { SpatialArbEngine, PoolState } from '../src/arbitrage/engines/SpatialArbEngine';
import { OpportunityStatus } from '../src/arbitrage/models';

/**
 * Example: Find spatial arbitrage opportunities
 */
async function spatialArbitrageExample() {
  console.log('=== Spatial Arbitrage Engine Example ===\n');

  // Initialize the engine
  const engine = new SpatialArbEngine({
    minProfitBps: 50,        // Minimum 0.5% profit
    minLiquidityUsd: 10000,  // Minimum $10k liquidity
    supportedProtocols: ['uniswap_v3', 'sushiswap', 'camelot'],
  });

  // Create mock pool data (in production, this comes from blockchain data)
  const pools: PoolState[] = [
    // WETH/USDC on Uniswap V3 (lower price)
    {
      poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      token1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      reserve0: 1000,    // 1000 WETH
      reserve1: 2000000, // 2M USDC (price: 2000 USDC per WETH)
      protocol: 'uniswap_v3',
      feeBps: 30, // 0.3%
    },
    // WETH/USDC on SushiSwap (higher price)
    {
      poolAddress: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      token1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      reserve0: 800,     // 800 WETH
      reserve1: 1680000, // 1.68M USDC (price: 2100 USDC per WETH)
      protocol: 'sushiswap',
      feeBps: 30, // 0.3%
    },
    // WETH/USDC on Camelot (medium price)
    {
      poolAddress: '0x84652bb2539513BAf36e225c930Fdd8eaa63CE27',
      token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH (Arbitrum)
      token1: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC (Arbitrum)
      reserve0: 900,     // 900 WETH
      reserve1: 1890000, // 1.89M USDC (price: 2100 USDC per WETH)
      protocol: 'camelot',
      feeBps: 30, // 0.3%
    },
  ];

  console.log('Pools loaded:');
  pools.forEach((pool, idx) => {
    const price = pool.reserve1 / pool.reserve0;
    console.log(`  ${idx + 1}. ${pool.protocol}: ${price.toFixed(2)} USDC per WETH`);
  });
  console.log();

  // Find arbitrage opportunities with 1 WETH input
  console.log('Finding spatial arbitrage opportunities with 1 WETH input...\n');
  const opportunities = engine.findOpportunities(pools, 1);

  // Display results
  console.log(`Found ${opportunities.length} opportunities:\n`);

  opportunities.forEach((opp, idx) => {
    console.log(`Opportunity ${idx + 1}:`);
    console.log(`  ID: ${opp.opportunityId}`);
    console.log(`  Status: ${opp.status}`);
    console.log(`  Type: ${opp.arbType}`);
    console.log(`  Path:`);
    
    opp.path.forEach((step, stepIdx) => {
      console.log(`    ${stepIdx + 1}. ${step.protocol}: ${step.amountIn.toFixed(4)} → ${step.expectedOutput.toFixed(4)}`);
    });

    console.log(`  Input: ${opp.inputAmount} WETH`);
    console.log(`  Output: ${opp.expectedOutput.toFixed(6)} WETH`);
    console.log(`  Gross Profit: ${opp.grossProfit.toFixed(6)} WETH`);
    console.log(`  Profit (BIPS): ${opp.profitBps} (${(opp.profitBps / 100).toFixed(2)}%)`);
    console.log(`  Risk Score: ${opp.riskScore?.toFixed(3)}`);
    console.log(`  Requires Flash Loan: ${opp.requiresFlashLoan}`);
    console.log(`  Estimated Gas: ${opp.estimatedGas}`);
    console.log();
  });

  // Calculate price impact for large trade
  console.log('Price Impact Analysis:');
  const largeTradeAmount = 50; // 50 WETH
  pools.forEach(pool => {
    const impact = engine.calculatePriceImpact(pool, largeTradeAmount, 0);
    console.log(`  ${pool.protocol}: ${impact.toFixed(2)}% impact for ${largeTradeAmount} WETH`);
  });
  console.log();

  // Display engine statistics
  const stats = engine.getStatistics();
  console.log('Engine Statistics:');
  console.log(`  Pools Analyzed: ${stats.poolsAnalyzed}`);
  console.log(`  Opportunities Found: ${stats.opportunitiesFound}`);
  console.log(`  Total Profit Potential: ${stats.totalProfitPotential.toFixed(6)} WETH`);
  console.log(`  Avg Profit per Opportunity: ${stats.avgProfitPerOpportunity.toFixed(6)} WETH`);
  console.log();

  // Filter by liquidity (example)
  console.log('Filtering by liquidity ($2000 WETH price):');
  const tokenPrices = {
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 2000,
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 2000,
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1,
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': 1,
  };
  const filtered = engine.filterByLiquidity(opportunities, tokenPrices);
  console.log(`  Opportunities after liquidity filter: ${filtered.length}`);
  console.log();

  console.log('=== Example Complete ===');
}

// Run the example
if (require.main === module) {
  spatialArbitrageExample().catch(console.error);
}

export { spatialArbitrageExample };
