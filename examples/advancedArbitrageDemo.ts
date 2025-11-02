/**
 * Advanced Multi-Hop Arbitrage Demo
 * 
 * Demonstrates the usage of advanced pathfinding features including:
 * - Bellman-Ford algorithm for negative cycle detection
 * - Intelligent path pruning
 * - Enhanced slippage calculations
 * - Path caching with LRU eviction
 * - Pattern detection and analysis
 */

import { ethers } from 'ethers';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { 
  AdvancedOrchestrator,
  AdvancedPathFinder,
  PathPruner,
  EnhancedSlippageCalculator,
  PathCache,
  ArbitragePatterns
} from '../src/arbitrage';
import { 
  defaultAdvancedArbitrageConfig,
  highPerformanceConfig,
  realtimeConfig,
  conservativeConfig,
  getConfigByName
} from '../src/config/advanced-arbitrage.config';

/**
 * Example 1: Basic usage with AdvancedOrchestrator
 */
async function example1_BasicUsage() {
  console.log('\n=== Example 1: Basic Advanced Orchestrator Usage ===\n');

  // Initialize DEX registry
  const registry = new DEXRegistry();

  // Create advanced orchestrator with default config
  const orchestrator = new AdvancedOrchestrator(
    registry,
    defaultAdvancedArbitrageConfig
  );

  // Tokens to search for arbitrage (example addresses)
  const tokens = [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xdAC17F958D2ee523a2206206994597C13D831ec7'  // USDT
  ];

  const startAmount = ethers.utils.parseEther('1.0'); // 1 ETH

  try {
    // Find arbitrage opportunities
    console.log('Searching for arbitrage opportunities...');
    const paths = await orchestrator.findOpportunities(tokens, startAmount.toBigInt());

    console.log(`Found ${paths.length} profitable paths`);

    // Display top paths
    paths.slice(0, 3).forEach((path, idx) => {
      console.log(`\nPath ${idx + 1}:`);
      console.log(`  Hops: ${path.hops.length}`);
      console.log(`  Net Profit: ${ethers.utils.formatEther(path.netProfit.toString())} ETH`);
      console.log(`  Slippage: ${(path.slippageImpact * 100).toFixed(2)}%`);
      console.log(`  Gas Cost: ${ethers.utils.formatEther(path.totalGasCost.toString())} ETH`);
    });

    // Get statistics
    const stats = orchestrator.getStats();
    console.log('\nOrchestrator Statistics:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('Error finding opportunities:', error);
  }
}

/**
 * Example 2: Using different configurations
 */
async function example2_DifferentConfigs() {
  console.log('\n=== Example 2: Different Configuration Profiles ===\n');

  const registry = new DEXRegistry();
  const tokens = [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7'
  ];
  const startAmount = ethers.utils.parseEther('1.0').toBigInt();

  // Test different configurations
  const configs = [
    { name: 'High Performance', config: highPerformanceConfig },
    { name: 'Real-time', config: realtimeConfig },
    { name: 'Conservative', config: conservativeConfig }
  ];

  for (const { name, config } of configs) {
    console.log(`\n--- ${name} Configuration ---`);
    
    const orchestrator = new AdvancedOrchestrator(registry, config);
    
    try {
      const startTime = Date.now();
      const paths = await orchestrator.findOpportunities(tokens, startAmount);
      const elapsed = Date.now() - startTime;

      console.log(`Paths found: ${paths.length}`);
      console.log(`Time elapsed: ${elapsed}ms`);
      console.log(`Strategy: ${config.pathfinding.strategy}`);
      
      if (paths.length > 0) {
        const topPath = paths[0];
        console.log(`Best profit: ${ethers.utils.formatEther(topPath.netProfit.toString())} ETH`);
      }
    } catch (error) {
      console.error(`Error with ${name} config:`, error);
    }
  }
}

/**
 * Example 3: Direct usage of AdvancedPathFinder with different strategies
 */
function example3_PathfindingStrategies() {
  console.log('\n=== Example 3: Pathfinding Strategies Comparison ===\n');

  const strategies = ['dfs', 'bfs', 'bellman-ford', 'auto'] as const;

  for (const strategy of strategies) {
    console.log(`\n--- Strategy: ${strategy} ---`);

    const pathFinder = new AdvancedPathFinder({
      strategy,
      maxHops: 4,
      minProfitThreshold: BigInt(100),
      maxSlippage: 0.05,
      gasPrice: BigInt(50000000000)
    });

    // Add some mock pool edges
    pathFinder.addPoolEdge({
      poolAddress: '0x123',
      dexName: 'Uniswap V3',
      tokenIn: '0xToken1',
      tokenOut: '0xToken2',
      reserve0: BigInt('10000000000000000000000'),
      reserve1: BigInt('10000000000000000000000'),
      fee: 0.003,
      gasEstimate: 150000
    });

    pathFinder.addPoolEdge({
      poolAddress: '0x456',
      dexName: 'SushiSwap',
      tokenIn: '0xToken2',
      tokenOut: '0xToken1',
      reserve0: BigInt('10000000000000000000000'),
      reserve1: BigInt('10100000000000000000000'),
      fee: 0.003,
      gasEstimate: 150000
    });

    const startAmount = ethers.utils.parseEther('100').toBigInt();
    const paths = pathFinder.findArbitragePaths('0xToken1', startAmount);

    const metrics = pathFinder.getMetrics();
    console.log(`Paths found: ${paths.length}`);
    console.log(`Time: ${metrics.timeElapsedMs}ms`);
    console.log(`Paths explored: ${metrics.pathsExplored}`);
  }
}

/**
 * Example 4: Path pruning demonstration
 */
function example4_PathPruning() {
  console.log('\n=== Example 4: Path Pruning ===\n');

  const aggressiveness = ['low', 'medium', 'high'] as const;

  for (const level of aggressiveness) {
    console.log(`\n--- Aggressiveness: ${level} ---`);

    const pruner = new PathPruner({
      aggressiveness: level,
      minPoolLiquidity: BigInt(100000),
      maxPriceImpactPerHop: 2.0,
      maxCumulativeSlippage: 5.0,
      minPoolQualityScore: 0.3
    });

    // Test edge pruning
    const goodEdge = {
      poolAddress: '0x123',
      dexName: 'Uniswap V3',
      tokenIn: '0xToken1',
      tokenOut: '0xToken2',
      reserve0: BigInt(10000000),
      reserve1: BigInt(10000000),
      fee: 0.003,
      gasEstimate: 150000
    };

    const badEdge = {
      poolAddress: '0x456',
      dexName: 'Low Liquidity',
      tokenIn: '0xToken2',
      tokenOut: '0xToken3',
      reserve0: BigInt(1000),
      reserve1: BigInt(1000),
      fee: 0.1,
      gasEstimate: 150000
    };

    const goodPruned = pruner.shouldPruneEdge(goodEdge, BigInt(100000));
    const badPruned = pruner.shouldPruneEdge(badEdge, BigInt(100000));

    console.log(`Good edge pruned: ${goodPruned}`);
    console.log(`Bad edge pruned: ${badPruned}`);

    const stats = pruner.getStats();
    console.log(`Total evaluated: ${stats.totalEvaluated}`);
    console.log(`Total pruned: ${stats.totalPruned}`);
  }
}

/**
 * Example 5: Enhanced slippage calculations
 */
function example5_SlippageCalculation() {
  console.log('\n=== Example 5: Enhanced Slippage Calculation ===\n');

  const calculator = new EnhancedSlippageCalculator({
    defaultCurveType: 'constant-product',
    warningThreshold: 1.0,
    maxSafeImpact: 3.0
  });

  // Register different AMM types
  calculator.registerPoolCurveType('0xUniswap', 'constant-product');
  calculator.registerPoolCurveType('0xCurve', 'stable-swap');
  calculator.registerPoolCurveType('0xUniV3', 'concentrated-liquidity');

  const amountIn = ethers.utils.parseEther('10').toBigInt();
  const reserveIn = ethers.utils.parseEther('1000').toBigInt();
  const reserveOut = ethers.utils.parseEther('1000').toBigInt();
  const fee = 0.003;

  console.log('\n--- Constant Product (Uniswap V2) ---');
  const cpImpact = calculator.calculatePriceImpact(
    amountIn, reserveIn, reserveOut, fee, '0xUniswap'
  );
  console.log(`Price Impact: ${cpImpact.percentage.toFixed(4)}%`);
  console.log(`Amount Out: ${ethers.utils.formatEther(cpImpact.amountOut.toString())}`);

  console.log('\n--- Stable Swap (Curve) ---');
  const ssImpact = calculator.calculatePriceImpact(
    amountIn, reserveIn, reserveOut, 0.0004, '0xCurve'
  );
  console.log(`Price Impact: ${ssImpact.percentage.toFixed(4)}%`);
  console.log(`Amount Out: ${ethers.utils.formatEther(ssImpact.amountOut.toString())}`);

  console.log('\n--- Trade Size Safety Check ---');
  const isSafe = calculator.isTradeSizeSafe(amountIn, reserveIn);
  console.log(`Is trade size safe: ${isSafe}`);
}

/**
 * Example 6: Path caching
 */
function example6_PathCaching() {
  console.log('\n=== Example 6: Path Caching ===\n');

  const cache = new PathCache({
    enabled: true,
    maxEntries: 100,
    ttl: 300,
    minProfitabilityScore: 0.3
  });

  // Create a mock profitable path
  const profitablePath = {
    hops: [
      {
        dexName: 'Uniswap V3',
        poolAddress: '0x123',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        amountIn: ethers.utils.parseEther('1').toBigInt(),
        amountOut: ethers.utils.parseEther('1.01').toBigInt(),
        fee: 0.003,
        gasEstimate: 150000
      }
    ],
    startToken: '0xToken1',
    endToken: '0xToken1',
    estimatedProfit: ethers.utils.parseEther('0.01').toBigInt(),
    totalGasCost: ethers.utils.parseEther('0.001').toBigInt(),
    netProfit: ethers.utils.parseEther('0.009').toBigInt(),
    totalFees: 0.003,
    slippageImpact: 0.001
  };

  // Set path as profitable
  console.log('Adding profitable path to cache...');
  cache.set(profitablePath, true);

  // Get statistics
  const stats1 = cache.getStats();
  console.log(`Cache size: ${stats1.size}`);
  console.log(`Hit rate: ${stats1.hitRate.toFixed(2)}%`);

  // Retrieve paths by pool
  const poolPaths = cache.getPathsByPool('0x123');
  console.log(`Paths involving pool 0x123: ${poolPaths.length}`);

  // Get top paths
  const topPaths = cache.getTopPaths(5);
  console.log(`Top profitable paths: ${topPaths.length}`);
}

/**
 * Example 7: Pattern detection
 */
function example7_PatternDetection() {
  console.log('\n=== Example 7: Arbitrage Pattern Detection ===\n');

  const detector = new ArbitragePatterns();

  // Triangular arbitrage pattern
  const triangularPath = {
    hops: [
      {
        dexName: 'Uniswap V3',
        poolAddress: '0x123',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        amountIn: ethers.utils.parseEther('1').toBigInt(),
        amountOut: ethers.utils.parseEther('1.01').toBigInt(),
        fee: 0.003,
        gasEstimate: 150000
      },
      {
        dexName: 'SushiSwap',
        poolAddress: '0x456',
        tokenIn: '0xToken2',
        tokenOut: '0xToken3',
        amountIn: ethers.utils.parseEther('1.01').toBigInt(),
        amountOut: ethers.utils.parseEther('1.02').toBigInt(),
        fee: 0.003,
        gasEstimate: 150000
      },
      {
        dexName: 'Curve',
        poolAddress: '0x789',
        tokenIn: '0xToken3',
        tokenOut: '0xToken1',
        amountIn: ethers.utils.parseEther('1.02').toBigInt(),
        amountOut: ethers.utils.parseEther('1.03').toBigInt(),
        fee: 0.0004,
        gasEstimate: 180000
      }
    ],
    startToken: '0xToken1',
    endToken: '0xToken1',
    estimatedProfit: ethers.utils.parseEther('0.03').toBigInt(),
    totalGasCost: ethers.utils.parseEther('0.01').toBigInt(),
    netProfit: ethers.utils.parseEther('0.02').toBigInt(),
    totalFees: 0.0064,
    slippageImpact: 0.003
  };

  console.log('Analyzing triangular arbitrage path...');
  const analysis = detector.detectPattern(triangularPath);
  
  console.log(`Pattern Type: ${analysis.type}`);
  console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
  console.log(`Risk Level: ${analysis.riskLevel}`);
  console.log('\nCharacteristics:');
  analysis.characteristics.forEach(char => console.log(`  - ${char}`));
  console.log('\nOptimization Hints:');
  analysis.optimizationHints.forEach(hint => console.log(`  - ${hint}`));

  // Get optimization strategy
  const strategy = detector.getOptimizationStrategy(analysis.type);
  console.log('\nRecommended Strategy:');
  strategy.forEach(step => console.log(`  - ${step}`));
}

/**
 * Example 8: Performance comparison
 */
async function example8_PerformanceComparison() {
  console.log('\n=== Example 8: Performance Comparison ===\n');

  const registry = new DEXRegistry();
  const orchestrator = new AdvancedOrchestrator(
    registry,
    defaultAdvancedArbitrageConfig
  );

  const tokens = [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7'
  ];

  const startAmount = ethers.utils.parseEther('1.0').toBigInt();

  try {
    console.log('Running performance comparison...');
    const comparison = await orchestrator.comparePerformance(tokens, startAmount);

    console.log('\nBasic Pathfinder:');
    console.log(`  Paths found: ${comparison.basicPathfinder.pathsFound}`);
    console.log(`  Time: ${comparison.basicPathfinder.timeMs}ms`);

    console.log('\nAdvanced Pathfinder:');
    console.log(`  Paths found: ${comparison.advancedPathfinder.pathsFound}`);
    console.log(`  Time: ${comparison.advancedPathfinder.timeMs}ms`);
    console.log(`  Strategy: ${comparison.advancedPathfinder.strategy}`);

    console.log('\nImprovement:');
    console.log(`  Speedup: ${comparison.improvement.speedup.toFixed(2)}x`);
    console.log(`  Additional paths: ${comparison.improvement.additionalPaths}`);
  } catch (error) {
    console.error('Error in performance comparison:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Advanced Multi-Hop Arbitrage Demo                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Run examples (comment out those you don't want to run)
  
  // await example1_BasicUsage();
  // await example2_DifferentConfigs();
  example3_PathfindingStrategies();
  example4_PathPruning();
  example5_SlippageCalculation();
  example6_PathCaching();
  example7_PatternDetection();
  // await example8_PerformanceComparison();

  console.log('\n✅ Demo completed!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_BasicUsage,
  example2_DifferentConfigs,
  example3_PathfindingStrategies,
  example4_PathPruning,
  example5_SlippageCalculation,
  example6_PathCaching,
  example7_PatternDetection,
  example8_PerformanceComparison
};
