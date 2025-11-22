/**
 * AdvancedOrchestrator - Enhanced orchestrator with advanced pathfinding
 * 
 * Extends ArbitrageOrchestrator with support for multiple strategies,
 * path caching, pruning, and enhanced slippage calculations
 */

import { DEXRegistry } from '../dex/core/DEXRegistry';
import { ArbitrageOrchestrator, OrchestratorMode } from './ArbitrageOrchestrator';
import { AdvancedPathFinder, PathfindingStrategy, PathfindingMetrics } from './AdvancedPathFinder';
import { PathPruner, PruningConfig, PruningStats } from './PathPruner';
import { PathCache, CacheConfig, CacheStats } from './PathCache';
import { EnhancedSlippageCalculator, SlippageConfig } from './EnhancedSlippageCalculator';
import { ArbitragePatterns, PatternAnalysis } from './ArbitragePatterns';
import { ProfitabilityCalculator } from './ProfitabilityCalculator';
import { MultiHopDataFetcher } from './MultiHopDataFetcher';
import { ArbitragePath, PathfindingConfig, PoolEdge } from './types';
import { Stats as ArbitrageOrchestratorStats } from './ArbitrageOrchestrator';
import { PatternMetrics } from './ArbitragePatterns';

/**
 * Advanced orchestrator stats
 */
export interface AdvancedOrchestratorStats extends ArbitrageOrchestratorStats {
  advancedFeaturesEnabled: boolean;
  pathfindingMetrics?: PathfindingMetrics;
  pruningStats?: PruningStats;
  cacheStats?: CacheStats;
  patternMetrics?: PatternMetrics[];
}

/**
 * Advanced orchestrator configuration
 */
export interface AdvancedOrchestratorConfig {
  pathfinding: {
    strategy: PathfindingStrategy;
    maxHops: number;
    minProfitThreshold: bigint;
    maxSlippage: number;
    gasPrice: bigint;
  };
  pruning: PruningConfig;
  cache: CacheConfig;
  slippage: SlippageConfig;
  enableAdvancedFeatures: boolean;
  enablePatternDetection: boolean;
}

/**
 * Performance comparison metrics
 */
export interface PerformanceComparison {
  basicPathfinder: {
    pathsFound: number;
    timeMs: number;
  };
  advancedPathfinder: {
    pathsFound: number;
    timeMs: number;
    strategy: PathfindingStrategy;
  };
  improvement: {
    speedup: number; // multiplier (e.g., 10x = 10)
    additionalPaths: number;
  };
}

export class AdvancedOrchestrator {
  private registry: DEXRegistry;
  private config: AdvancedOrchestratorConfig;
  private basicOrchestrator: ArbitrageOrchestrator;
  
  // Advanced components
  private advancedPathFinder: AdvancedPathFinder | null = null;
  private pathPruner: PathPruner | null = null;
  private pathCache: PathCache | null = null;
  private slippageCalculator: EnhancedSlippageCalculator | null = null;
  private patternDetector: ArbitragePatterns | null = null;
  
  private profitCalculator: ProfitabilityCalculator;
  private dataFetcher: MultiHopDataFetcher;
  private mode: OrchestratorMode = 'polling';

  constructor(registry: DEXRegistry, config: AdvancedOrchestratorConfig) {
    this.registry = registry;
    this.config = config;
    
    // Initialize basic orchestrator for fallback
    const basicConfig: PathfindingConfig = {
      maxHops: config.pathfinding.maxHops,
      minProfitThreshold: config.pathfinding.minProfitThreshold,
      maxSlippage: config.pathfinding.maxSlippage,
      gasPrice: config.pathfinding.gasPrice
    };
    
    this.basicOrchestrator = new ArbitrageOrchestrator(
      registry,
      basicConfig,
      config.pathfinding.gasPrice
    );
    
    this.profitCalculator = new ProfitabilityCalculator(config.pathfinding.gasPrice);
    this.dataFetcher = new MultiHopDataFetcher(registry);
    
    // Initialize advanced components if enabled
    if (config.enableAdvancedFeatures) {
      this.initializeAdvancedComponents();
    }
  }
  
  /**
   * Set the chain ID for filtering DEXes
   */
  setChainId(chainId: number): void {
    this.dataFetcher.setChainId(chainId);
  }

  /**
   * Find arbitrage opportunities using advanced features
   */
  async findOpportunities(tokens: string[], startAmount: bigint): Promise<ArbitragePath[]> {
    // Check cache first if enabled
    if (this.pathCache && this.config.cache.enabled) {
      const cachedPaths = this.getCachedPathsForTokens(tokens);
      if (cachedPaths.length > 0) {
        // Re-evaluate cached paths with current prices
        const validPaths = await this.reEvaluateCachedPaths(cachedPaths, startAmount);
        if (validPaths.length > 0) {
          return validPaths;
        }
      }
    }

    // Fetch pool data and build graph
    const edges = await this.dataFetcher.buildGraphEdges(tokens);
    
    // Apply pruning if enabled
    const filteredEdges = this.pathPruner && this.config.pruning.aggressiveness !== 'low'
      ? this.pruneEdges(edges, startAmount)
      : edges;

    // Use advanced pathfinder if available
    let paths: ArbitragePath[] = [];
    
    if (this.advancedPathFinder && this.config.enableAdvancedFeatures) {
      // Clear and rebuild graph
      this.advancedPathFinder.clear();
      for (const edge of filteredEdges) {
        this.advancedPathFinder.addPoolEdge(edge);
      }

      // Find paths using advanced algorithms
      for (const token of tokens) {
        const tokenPaths = this.advancedPathFinder.findArbitragePaths(token, startAmount);
        paths.push(...tokenPaths);
      }
    } else {
      // Fallback to basic orchestrator
      paths = await this.basicOrchestrator.findOpportunities(tokens, startAmount);
    }

    // Calculate accurate slippage if enabled
    if (this.slippageCalculator) {
      paths = this.enhancePathsWithSlippage(paths);
    }

    // Detect patterns if enabled
    if (this.patternDetector && this.config.enablePatternDetection) {
      paths = this.enhancePathsWithPatterns(paths);
    }

    // Filter by profitability with enhanced calculations
    const profitablePaths = paths.filter(path => 
      this.profitCalculator.isProfitable(path, this.config.pathfinding.minProfitThreshold)
    );

    // Update cache with profitable paths
    if (this.pathCache && this.config.cache.enabled) {
      for (const path of profitablePaths) {
        this.pathCache.set(path, true);
      }
    }

    return profitablePaths.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });
  }

  /**
   * Handle real-time event with advanced features
   */
  async handleRealtimeEvent(
    tokens: string[],
    startAmount: bigint,
    poolAddress?: string
  ): Promise<ArbitragePath[]> {
    // If specific pool is provided, invalidate cache for that pool
    if (poolAddress && this.pathCache) {
      this.pathCache.invalidatePool(poolAddress);
    }

    // Use fast strategy for real-time events
    if (this.advancedPathFinder) {
      const originalStrategy = this.config.pathfinding.strategy;
      this.config.pathfinding.strategy = 'bellman-ford'; // Fast for real-time
      
      const paths = await this.findOpportunities(tokens, startAmount);
      
      this.config.pathfinding.strategy = originalStrategy;
      return paths;
    }

    return this.findOpportunities(tokens, startAmount);
  }

  /**
   * Compare performance between basic and advanced pathfinding
   */
  async comparePerformance(
    tokens: string[],
    startAmount: bigint
  ): Promise<PerformanceComparison> {
    // Test basic pathfinder
    const basicStart = Date.now();
    const basicPaths = await this.basicOrchestrator.findOpportunities(tokens, startAmount);
    const basicTime = Date.now() - basicStart;

    // Test advanced pathfinder
    const advancedStart = Date.now();
    const advancedPaths = await this.findOpportunities(tokens, startAmount);
    const advancedTime = Date.now() - advancedStart;

    const speedup = advancedTime > 0 ? basicTime / advancedTime : 1;
    const additionalPaths = advancedPaths.length - basicPaths.length;

    return {
      basicPathfinder: {
        pathsFound: basicPaths.length,
        timeMs: basicTime
      },
      advancedPathfinder: {
        pathsFound: advancedPaths.length,
        timeMs: advancedTime,
        strategy: this.config.pathfinding.strategy
      },
      improvement: {
        speedup,
        additionalPaths
      }
    };
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): AdvancedOrchestratorStats {
    const baseStats = this.basicOrchestrator.getStats();
    
    const advancedStats: AdvancedOrchestratorStats = {
      ...baseStats,
      advancedFeaturesEnabled: this.config.enableAdvancedFeatures,
      pathfindingMetrics: this.advancedPathFinder?.getMetrics(),
      pruningStats: this.pathPruner?.getStats(),
      cacheStats: this.pathCache?.getStats(),
      patternMetrics: this.patternDetector?.getAllMetrics(),
    };

    return advancedStats;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AdvancedOrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reinitialize advanced components if feature flag changed
    if (config.enableAdvancedFeatures !== undefined) {
      if (config.enableAdvancedFeatures) {
        this.initializeAdvancedComponents();
      } else {
        this.disableAdvancedComponents();
      }
    }

    // Update component configs
    if (this.pathPruner && config.pruning) {
      this.pathPruner.updateConfig(config.pruning);
    }

    if (this.pathCache && config.cache) {
      this.pathCache.updateConfig(config.cache);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.basicOrchestrator.clearCache();
    if (this.pathCache) {
      this.pathCache.clear();
    }
    if (this.pathPruner) {
      this.pathPruner.clearCaches();
    }
  }

  /**
   * Set orchestrator mode
   */
  setMode(mode: OrchestratorMode): void {
    this.mode = mode;
    this.basicOrchestrator.setMode(mode);
  }

  /**
   * Get current mode
   */
  getMode(): OrchestratorMode {
    return this.mode;
  }

  // Private helper methods

  private initializeAdvancedComponents(): void {
    this.advancedPathFinder = new AdvancedPathFinder({
      ...this.config.pathfinding,
      strategy: this.config.pathfinding.strategy,
      pruningEnabled: true,
      cacheEnabled: this.config.cache.enabled
    });

    this.pathPruner = new PathPruner(this.config.pruning);
    this.pathCache = new PathCache(this.config.cache);
    this.slippageCalculator = new EnhancedSlippageCalculator(this.config.slippage);
    this.patternDetector = new ArbitragePatterns();
  }

  private disableAdvancedComponents(): void {
    this.advancedPathFinder = null;
    this.pathPruner = null;
    this.pathCache = null;
    this.slippageCalculator = null;
    this.patternDetector = null;
  }

  private pruneEdges(edges: PoolEdge[], startAmount: bigint): PoolEdge[] {
    if (!this.pathPruner) {
      return edges;
    }

    return edges.filter(edge => !this.pathPruner!.shouldPruneEdge(edge, startAmount));
  }

  private getCachedPathsForTokens(tokens: string[]): ArbitragePath[] {
    if (!this.pathCache) {
      return [];
    }

    const paths: ArbitragePath[] = [];
    
    // Look for paths with these token sequences
    for (const token of tokens) {
      const tokenPaths = this.pathCache.findByTemplate([token]);
      paths.push(...tokenPaths);
    }

    return paths;
  }

  private async reEvaluateCachedPaths(
    cachedPaths: ArbitragePath[],
    startAmount: bigint
  ): Promise<ArbitragePath[]> {
    // Would need to re-fetch current prices and recalculate
    // For now, return cached paths that still meet threshold
    return cachedPaths.filter(path => 
      path.netProfit >= this.config.pathfinding.minProfitThreshold
    );
  }

  private enhancePathsWithSlippage(paths: ArbitragePath[]): ArbitragePath[] {
    if (!this.slippageCalculator) {
      return paths;
    }

    return paths.map(path => {
      const slippageResult = this.slippageCalculator!.calculatePathSlippage(path.hops);
      
      // Update path with accurate slippage
      return {
        ...path,
        slippageImpact: slippageResult.cumulativeSlippage / 100,
        estimatedProfit: slippageResult.finalAmount > path.hops[0].amountIn
          ? slippageResult.finalAmount - path.hops[0].amountIn
          : BigInt(0)
      };
    });
  }

  private enhancePathsWithPatterns(paths: ArbitragePath[]): ArbitragePath[] {
    if (!this.patternDetector) {
      return paths;
    }

    // Detect patterns and add metadata (would extend path type in production)
    paths.forEach(path => {
      const analysis = this.patternDetector!.detectPattern(path);
      // Store pattern analysis in path metadata (would need type extension)
      path.patternAnalysis = analysis;
    });

    return paths;
  }
}
