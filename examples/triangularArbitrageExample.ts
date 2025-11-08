/**
 * Triangular Arbitrage Engine Example
 * 
 * Demonstrates usage of TriangularArbEngine for 3-token cycle arbitrage detection.
 * This example shows how to find profitable cycles like WETH -> USDC -> DAI -> WETH.
 */

import { TriangularArbEngine } from '../src/arbitrage/engines/TriangularArbEngine';
import { PoolState } from '../src/arbitrage/engines/SpatialArbEngine';
import { GraphBuilder } from '../src/arbitrage/graph/GraphBuilder';

/**
 * Example: Find triangular arbitrage opportunities
 */
async function triangularArbitrageExample() {
  console.log('=== Triangular Arbitrage Engine Example ===\n');

  // Initialize the engine
  const engine = new TriangularArbEngine({
    minProfitBps: 50,   // Minimum 0.5% profit
    maxHops: 3,         // Maximum 3 hops (standard triangle)
    supportedProtocols: ['uniswap_v3', 'sushiswap'],
  });

  // Create mock pool data forming a triangle: WETH -> USDC -> DAI -> WETH
  const pools: PoolState[] = [
    // WETH/USDC pool
    {
      poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      token1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      reserve0: 1000,
      reserve1: 1950000, // Slightly underpriced: 1950 USDC per WETH
      protocol: 'uniswap_v3',
      feeBps: 30,
    },
    // USDC/DAI pool
    {
      poolAddress: '0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168',
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      token1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
      reserve0: 2000000,
      reserve1: 2000000, // 1:1 ratio
      protocol: 'uniswap_v3',
      feeBps: 30,
    },
    // DAI/WETH pool
    {
      poolAddress: '0x60594a405d53811d3BC4766596EFD80fd545A270',
      token0: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      reserve0: 2000000,
      reserve1: 1025, // Slightly overpriced: 1950 DAI per WETH
      protocol: 'uniswap_v3',
      feeBps: 30,
    },
  ];

  console.log('Loaded Triangle Pools:');
  console.log(`  1. WETH/USDC: ${pools[0].reserve1 / pools[0].reserve0} USDC per WETH`);
  console.log(`  2. USDC/DAI: ${pools[1].reserve1 / pools[1].reserve0} DAI per USDC`);
  console.log(`  3. DAI/WETH: ${pools[2].reserve0 / pools[2].reserve1} DAI per WETH`);
  console.log();

  // Build pair map for efficient lookups
  console.log('Building pair map...');
  engine.buildPairMap(pools);
  console.log();

  // Find opportunities starting from WETH
  const startToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
  const inputAmount = 1; // 1 WETH

  console.log(`Finding triangular arbitrage opportunities starting from WETH with ${inputAmount} input...\n`);
  const opportunities = engine.findOpportunities(pools, startToken, inputAmount);

  // Display results
  console.log(`Found ${opportunities.length} triangular opportunities:\n`);

  opportunities.forEach((opp, idx) => {
    console.log(`Opportunity ${idx + 1}:`);
    console.log(`  ID: ${opp.opportunityId}`);
    console.log(`  Status: ${opp.status}`);
    console.log(`  Type: ${opp.arbType}`);
    console.log(`  Cycle Path:`);
    
    opp.path.forEach((step, stepIdx) => {
      const tokenInSymbol = step.tokenIn.slice(0, 6) + '...';
      const tokenOutSymbol = step.tokenOut.slice(0, 6) + '...';
      console.log(
        `    ${stepIdx + 1}. ${step.protocol}: ${tokenInSymbol} → ${tokenOutSymbol} ` +
        `(${step.amountIn.toFixed(4)} → ${step.expectedOutput.toFixed(4)})`
      );
    });

    console.log(`  Input: ${opp.inputAmount} WETH`);
    console.log(`  Output: ${opp.expectedOutput.toFixed(6)} WETH`);
    console.log(`  Gross Profit: ${opp.grossProfit.toFixed(6)} WETH`);
    console.log(`  Profit (BIPS): ${opp.profitBps} (${(opp.profitBps / 100).toFixed(2)}%)`);
    console.log(`  Risk Score: ${opp.riskScore?.toFixed(3)}`);
    console.log(`  Requires Flash Loan: ${opp.requiresFlashLoan}`);
    console.log(`  Flash Loan Amount: ${opp.flashLoanAmount} WETH`);
    console.log(`  Estimated Gas: ${opp.estimatedGas}`);
    console.log(`  Tokens in Cycle: ${opp.tokenAddresses.length}`);
    console.log();
  });

  // Find all triangular opportunities (from all start tokens)
  console.log('Finding opportunities from ALL start tokens...\n');
  const allOpportunities = engine.findAllTriangularOpportunities(pools, inputAmount);
  console.log(`Found ${allOpportunities.length} unique triangular opportunities (deduplicated)\n`);

  // Display engine statistics
  const stats = engine.getStatistics();
  console.log('Engine Statistics:');
  console.log(`  Cycles Analyzed: ${stats.cyclesAnalyzed}`);
  console.log(`  Opportunities Found: ${stats.opportunitiesFound}`);
  console.log(`  Total Profit Potential: ${stats.totalProfitPotential.toFixed(6)} WETH`);
  console.log(`  Avg Cycle Length: ${stats.avgCycleLength.toFixed(2)} hops`);
  console.log(`  Avg Profit per Opportunity: ${stats.avgProfitPerOpportunity.toFixed(6)} WETH`);
  console.log(`  Pairs in Map: ${stats.pairsInMap}`);
  console.log();

  // Demonstrate graph builder for triangle detection
  console.log('=== Graph Builder Triangle Detection ===\n');
  
  const graphBuilder = new GraphBuilder({
    supportedProtocols: ['uniswap_v3', 'sushiswap'],
  });

  graphBuilder.buildGraph(pools);
  const triangles = graphBuilder.findTriangles();

  console.log(`Found ${triangles.length} triangles in graph:\n`);

  triangles.forEach((triangle, idx) => {
    console.log(`Triangle ${idx + 1}:`);
    console.log(`  Tokens: ${triangle.tokens.map(t => t.slice(0, 8) + '...').join(' → ')}`);
    console.log(`  Pools: ${triangle.pools.map(p => p.protocol).join(', ')}`);
    console.log(`  Valid: ${triangle.isValid}`);
    console.log();
  });

  // Find triangles specifically involving WETH
  const wethTriangles = graphBuilder.findTrianglesForToken(startToken);
  console.log(`Triangles involving WETH: ${wethTriangles.length}\n`);

  // Display graph statistics
  const graphStats = graphBuilder.getStats();
  console.log('Graph Statistics:');
  console.log(`  Tokens: ${graphStats.tokenCount}`);
  console.log(`  Pools: ${graphStats.poolCount}`);
  console.log(`  Edges: ${graphStats.edgeCount}`);
  console.log(`  Avg Degree: ${graphStats.avgDegree.toFixed(2)}`);
  console.log();

  console.log('=== Example Complete ===');
}

// Run the example
if (require.main === module) {
  triangularArbitrageExample().catch(console.error);
}

export { triangularArbitrageExample };
