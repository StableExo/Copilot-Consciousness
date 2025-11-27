/**
 * Advanced Arbitrage Configuration
 *
 * Configuration for advanced multi-hop arbitrage system with
 * Bellman-Ford, path pruning, caching, and enhanced slippage calculations
 */

import { AdvancedOrchestratorConfig } from '../arbitrage/AdvancedOrchestrator';

/**
 * Default configuration for advanced arbitrage
 * Optimized for Base L2 with lower liquidity thresholds and reduced memory usage
 */
export const defaultAdvancedArbitrageConfig: AdvancedOrchestratorConfig = {
  pathfinding: {
    strategy: 'auto', // Auto-selects based on graph size
    maxHops: 4, // Reduced from 5 for faster execution
    minProfitThreshold: BigInt(50), // Minimum 50 wei profit
    maxSlippage: 0.05, // 5% max slippage
    gasPrice: BigInt(50000000000), // 50 gwei
  },

  pruning: {
    aggressiveness: 'low', // Changed from 'medium' to discover more pools
    minPoolLiquidity: BigInt(10000), // Reduced from 100000 to 10000 for Base L2
    maxPriceImpactPerHop: 3.0, // Increased from 2% to 3% for more opportunities
    maxCumulativeSlippage: 5.0, // Reduced from 7% to 5% max total for safer profitability
    minPoolQualityScore: 0.2, // Reduced from 0.3 to include more pools
  },

  cache: {
    enabled: true,
    maxEntries: 500, // Reduced from 1000 to save memory
    ttl: 120, // Reduced from 300 to 120 seconds for fresher data
    minProfitabilityScore: 0.2, // Reduced from 0.3
  },

  slippage: {
    defaultCurveType: 'constant-product',
    warningThreshold: 1.5, // Increased from 1% to 1.5%
    maxSafeImpact: 4.0, // Increased from 3% to 4%
  },

  enableAdvancedFeatures: true,
  enablePatternDetection: true,
};

/**
 * High performance configuration - for large graphs
 * Memory-optimized for production use
 */
export const highPerformanceConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'bellman-ford', // Best for large graphs
    maxHops: 3, // Reduced from 4 for faster execution
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'medium', // Changed from 'high' to discover more pools
    minPoolLiquidity: BigInt(50000), // Reduced from 500000 for Base L2
    maxPriceImpactPerHop: 3.0, // More lenient
  },
  cache: {
    ...defaultAdvancedArbitrageConfig.cache,
    maxEntries: 500, // Reduced from 2000 for memory optimization
    ttl: 90, // Reduced to 90 seconds
  },
};

/**
 * Thorough configuration - for maximum opportunity discovery
 */
export const thoroughConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'dfs', // DFS explores all paths
    maxHops: 6, // More hops for complex paths
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'low', // Minimal pruning
    minPoolLiquidity: BigInt(50000), // Lower liquidity threshold
    maxPriceImpactPerHop: 3.0, // More lenient
  },
  cache: {
    ...defaultAdvancedArbitrageConfig.cache,
    enabled: false, // Disable cache for fresh discovery
  },
};

/**
 * Real-time configuration - for event-driven arbitrage
 * Optimized for low memory and fast discovery on L2
 */
export const realtimeConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'bellman-ford', // Fast negative cycle detection
    maxHops: 3, // Quick 3-hop paths
    minProfitThreshold: BigInt(100), // Higher threshold for execution cost
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'low', // Changed from 'high' to discover more pools
    minPoolLiquidity: BigInt(20000), // Reduced from 200000 for Base L2
    maxPriceImpactPerHop: 3.0, // More lenient for real-time
  },
  cache: {
    ...defaultAdvancedArbitrageConfig.cache,
    enabled: true,
    maxEntries: 300, // Reduced from 500 for memory
    ttl: 60, // 1 minute for real-time freshness
  },
};

/**
 * Conservative configuration - for safe, low-risk arbitrage
 */
export const conservativeConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'bfs', // Balanced approach
    maxHops: 3, // Simple paths only
    minProfitThreshold: BigInt(200), // Higher profit requirement
    maxSlippage: 0.02, // 2% max slippage
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'medium',
    minPoolLiquidity: BigInt(1000000), // $1M minimum
    maxPriceImpactPerHop: 0.5, // Very low impact
    maxCumulativeSlippage: 2.0, // 2% max total
    minPoolQualityScore: 0.7, // High quality pools only
  },
  slippage: {
    ...defaultAdvancedArbitrageConfig.slippage,
    warningThreshold: 0.5, // 0.5% warning
    maxSafeImpact: 1.0, // 1% max safe impact
  },
};

/**
 * Flash loan configuration - for high-capital arbitrage
 */
export const flashLoanConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'bellman-ford',
    maxHops: 4,
    minProfitThreshold: BigInt(1000), // Account for flash loan fees
    gasPrice: BigInt(100000000000), // 100 gwei for faster execution
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'medium',
    minPoolLiquidity: BigInt(500000), // Need good liquidity for large trades
    maxPriceImpactPerHop: 2.0,
  },
  enablePatternDetection: true, // Detect flash loan opportunities
};

/**
 * Get configuration by name
 */
export function getConfigByName(name: string): AdvancedOrchestratorConfig {
  const configs: Record<string, AdvancedOrchestratorConfig> = {
    default: defaultAdvancedArbitrageConfig,
    'high-performance': highPerformanceConfig,
    thorough: thoroughConfig,
    realtime: realtimeConfig,
    conservative: conservativeConfig,
    'flash-loan': flashLoanConfig,
  };

  return configs[name] || defaultAdvancedArbitrageConfig;
}

/**
 * Create custom configuration with overrides
 */
export function createCustomConfig(
  base: AdvancedOrchestratorConfig,
  overrides: Partial<AdvancedOrchestratorConfig>
): AdvancedOrchestratorConfig {
  return {
    pathfinding: {
      ...base.pathfinding,
      ...(overrides.pathfinding || {}),
    },
    pruning: {
      ...base.pruning,
      ...(overrides.pruning || {}),
    },
    cache: {
      ...base.cache,
      ...(overrides.cache || {}),
    },
    slippage: {
      ...base.slippage,
      ...(overrides.slippage || {}),
    },
    enableAdvancedFeatures: overrides.enableAdvancedFeatures ?? base.enableAdvancedFeatures,
    enablePatternDetection: overrides.enablePatternDetection ?? base.enablePatternDetection,
  };
}
