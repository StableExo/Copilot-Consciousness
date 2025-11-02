/**
 * Advanced Arbitrage Configuration
 * 
 * Configuration for advanced multi-hop arbitrage system with
 * Bellman-Ford, path pruning, caching, and enhanced slippage calculations
 */

import { AdvancedOrchestratorConfig } from '../arbitrage/AdvancedOrchestrator';

/**
 * Default configuration for advanced arbitrage
 */
export const defaultAdvancedArbitrageConfig: AdvancedOrchestratorConfig = {
  pathfinding: {
    strategy: 'auto', // Auto-selects based on graph size
    maxHops: 5,
    minProfitThreshold: BigInt(50), // Minimum 50 wei profit
    maxSlippage: 0.05, // 5% max slippage
    gasPrice: BigInt(50000000000) // 50 gwei
  },
  
  pruning: {
    aggressiveness: 'medium',
    minPoolLiquidity: BigInt(100000), // Minimum $100k liquidity (in wei)
    maxPriceImpactPerHop: 2.0, // 2% max per hop
    maxCumulativeSlippage: 5.0, // 5% max total
    minPoolQualityScore: 0.3 // 0-1 scale
  },
  
  cache: {
    enabled: true,
    maxEntries: 1000,
    ttl: 300, // 5 minutes
    minProfitabilityScore: 0.3
  },
  
  slippage: {
    defaultCurveType: 'constant-product',
    warningThreshold: 1.0, // 1% price impact warning
    maxSafeImpact: 3.0 // 3% max safe impact
  },
  
  enableAdvancedFeatures: true,
  enablePatternDetection: true
};

/**
 * High performance configuration - for large graphs
 */
export const highPerformanceConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'bellman-ford', // Best for large graphs
    maxHops: 4 // Reduce hops for faster execution
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'high', // Aggressive pruning for speed
    minPoolLiquidity: BigInt(500000), // Higher liquidity requirement
    maxPriceImpactPerHop: 1.5 // Stricter price impact
  },
  cache: {
    ...defaultAdvancedArbitrageConfig.cache,
    maxEntries: 2000, // Larger cache for better hit rate
    ttl: 180 // 3 minutes for more frequent updates
  }
};

/**
 * Thorough configuration - for maximum opportunity discovery
 */
export const thoroughConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'dfs', // DFS explores all paths
    maxHops: 6 // More hops for complex paths
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'low', // Minimal pruning
    minPoolLiquidity: BigInt(50000), // Lower liquidity threshold
    maxPriceImpactPerHop: 3.0 // More lenient
  },
  cache: {
    ...defaultAdvancedArbitrageConfig.cache,
    enabled: false // Disable cache for fresh discovery
  }
};

/**
 * Real-time configuration - for event-driven arbitrage
 */
export const realtimeConfig: AdvancedOrchestratorConfig = {
  ...defaultAdvancedArbitrageConfig,
  pathfinding: {
    ...defaultAdvancedArbitrageConfig.pathfinding,
    strategy: 'bellman-ford', // Fast negative cycle detection
    maxHops: 3, // Quick 3-hop paths
    minProfitThreshold: BigInt(100) // Higher threshold for execution cost
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'high',
    minPoolLiquidity: BigInt(200000),
    maxPriceImpactPerHop: 1.0 // Very strict for real-time
  },
  cache: {
    ...defaultAdvancedArbitrageConfig.cache,
    enabled: true,
    maxEntries: 500,
    ttl: 60 // 1 minute for real-time freshness
  }
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
    maxSlippage: 0.02 // 2% max slippage
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'medium',
    minPoolLiquidity: BigInt(1000000), // $1M minimum
    maxPriceImpactPerHop: 0.5, // Very low impact
    maxCumulativeSlippage: 2.0, // 2% max total
    minPoolQualityScore: 0.7 // High quality pools only
  },
  slippage: {
    ...defaultAdvancedArbitrageConfig.slippage,
    warningThreshold: 0.5, // 0.5% warning
    maxSafeImpact: 1.0 // 1% max safe impact
  }
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
    gasPrice: BigInt(100000000000) // 100 gwei for faster execution
  },
  pruning: {
    ...defaultAdvancedArbitrageConfig.pruning,
    aggressiveness: 'medium',
    minPoolLiquidity: BigInt(500000), // Need good liquidity for large trades
    maxPriceImpactPerHop: 2.0
  },
  enablePatternDetection: true // Detect flash loan opportunities
};

/**
 * Get configuration by name
 */
export function getConfigByName(name: string): AdvancedOrchestratorConfig {
  const configs: Record<string, AdvancedOrchestratorConfig> = {
    'default': defaultAdvancedArbitrageConfig,
    'high-performance': highPerformanceConfig,
    'thorough': thoroughConfig,
    'realtime': realtimeConfig,
    'conservative': conservativeConfig,
    'flash-loan': flashLoanConfig
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
      ...(overrides.pathfinding || {})
    },
    pruning: {
      ...base.pruning,
      ...(overrides.pruning || {})
    },
    cache: {
      ...base.cache,
      ...(overrides.cache || {})
    },
    slippage: {
      ...base.slippage,
      ...(overrides.slippage || {})
    },
    enableAdvancedFeatures: overrides.enableAdvancedFeatures ?? base.enableAdvancedFeatures,
    enablePatternDetection: overrides.enablePatternDetection ?? base.enablePatternDetection
  };
}
