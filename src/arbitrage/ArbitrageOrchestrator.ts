/**
 * ArbitrageOrchestrator - Main orchestrator for multi-hop arbitrage
 * 
 * Coordinates pathfinding, data fetching, and profitability calculations
 * Supports both single-chain and cross-chain arbitrage
 */

import { DEXRegistry } from '../dex/core/DEXRegistry';
import { PathFinder } from './PathFinder';
import { ProfitabilityCalculator } from './ProfitabilityCalculator';
import { MultiHopDataFetcher } from './MultiHopDataFetcher';
import { ArbitragePath, PathfindingConfig } from './types';
import { GasFilterService } from '../gas/GasFilterService';
import { CrossChainPathFinder, CrossChainPath } from './CrossChainPathFinder';
import { BridgeManager } from '../chains/BridgeManager';
import { PathfindingConfig as CrossChainPathConfig } from '../config/cross-chain.config';
import { MLOrchestrator } from '../ml/MLOrchestrator';
import { EnhancedArbitragePath } from '../ml/types';

/**
 * Orchestrator mode - polling, event-driven, or cross-chain
 */
export type OrchestratorMode = 'polling' | 'event-driven' | 'hybrid' | 'cross-chain';

export class ArbitrageOrchestrator {
  private registry: DEXRegistry;
  private pathFinder: PathFinder;
  private profitCalculator: ProfitabilityCalculator;
  private dataFetcher: MultiHopDataFetcher;
  private config: PathfindingConfig;
  private mode: OrchestratorMode = 'polling';
  private gasFilter?: GasFilterService;
  private crossChainPathFinder?: CrossChainPathFinder;
  private bridgeManager?: BridgeManager;
  private crossChainConfig?: CrossChainPathConfig;
  private mlOrchestrator?: MLOrchestrator;
  private mlEnabled: boolean = false;

  constructor(
    registry: DEXRegistry,
    config: PathfindingConfig,
    gasPrice: bigint,
    gasFilter?: GasFilterService,
    bridgeManager?: BridgeManager,
    crossChainConfig?: CrossChainPathConfig,
    mlOrchestrator?: MLOrchestrator
  ) {
    this.registry = registry;
    this.config = config;
    this.pathFinder = new PathFinder(config);
    this.profitCalculator = new ProfitabilityCalculator(gasPrice);
    this.dataFetcher = new MultiHopDataFetcher(registry);
    this.gasFilter = gasFilter;
    this.bridgeManager = bridgeManager;
    this.crossChainConfig = crossChainConfig;
    this.mlOrchestrator = mlOrchestrator;
    this.mlEnabled = !!mlOrchestrator;
    
    // Initialize cross-chain pathfinder if bridge manager is provided
    if (bridgeManager && crossChainConfig) {
      this.crossChainPathFinder = new CrossChainPathFinder(
        bridgeManager,
        crossChainConfig,
        config
      );
    }
  }

  /**
   * Find profitable arbitrage opportunities for given tokens
   */
  async findOpportunities(tokens: string[], startAmount: bigint): Promise<ArbitragePath[] | EnhancedArbitragePath[]> {
    // 1. Fetch pool data and build graph
    const edges = await this.dataFetcher.buildGraphEdges(tokens);
    
    // 2. Clear previous graph and add new edges
    this.pathFinder.clear();
    for (const edge of edges) {
      this.pathFinder.addPoolEdge(edge);
    }

    // 3. Find arbitrage paths for each token
    const allPaths: ArbitragePath[] = [];
    
    for (const token of tokens) {
      const paths = this.pathFinder.findArbitragePaths(token, startAmount);
      allPaths.push(...paths);
    }

    // 4. Filter paths by profitability
    let profitablePaths = allPaths.filter(path => 
      this.profitCalculator.isProfitable(path, this.config.minProfitThreshold)
    );

    // 5. Apply gas filter if available
    if (this.gasFilter) {
      const gasFilteredPaths: ArbitragePath[] = [];
      for (const path of profitablePaths) {
        if (await this.gasFilter.isExecutable(path)) {
          gasFilteredPaths.push(path);
        }
      }
      profitablePaths = gasFilteredPaths;
    }

    // 6. Enhance with ML predictions if enabled
    if (this.mlEnabled && this.mlOrchestrator) {
      const enhancedPaths = await Promise.all(
        profitablePaths.map(path => this.mlOrchestrator!.enhanceOpportunity(path))
      );

      // Filter by ML confidence
      const mlFilteredPaths = enhancedPaths.filter(path => {
        if (!path.mlPredictions) return true;
        return path.mlPredictions.recommendation !== 'SKIP';
      });

      // Sort by ML confidence and net profit
      return mlFilteredPaths.sort((a, b) => {
        const aConfidence = a.mlPredictions?.confidence || 0;
        const bConfidence = b.mlPredictions?.confidence || 0;
        
        // Prioritize by confidence, then by profit
        if (Math.abs(aConfidence - bConfidence) > 0.1) {
          return bConfidence - aConfidence;
        }
        
        if (a.netProfit > b.netProfit) return -1;
        if (a.netProfit < b.netProfit) return 1;
        return 0;
      });
    }

    // 7. Sort by net profit (no ML)
    return profitablePaths.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });
  }

  /**
   * Evaluate a specific arbitrage path
   */
  evaluatePath(path: ArbitragePath) {
    return this.profitCalculator.calculateProfitability(path);
  }

  /**
   * Get current configuration
   */
  getConfig(): PathfindingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PathfindingConfig>): void {
    this.config = { ...this.config, ...config };
    this.pathFinder = new PathFinder(this.config);
  }

  /**
   * Update gas price
   */
  updateGasPrice(gasPrice: bigint): void {
    this.profitCalculator.updateGasPrice(gasPrice);
    this.config.gasPrice = gasPrice;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.dataFetcher.clearCache();
    this.pathFinder.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      tokenCount: this.pathFinder.getTokens().length,
      edgeCount: this.pathFinder.getEdgeCount(),
      cachedPools: this.dataFetcher.getCachedPoolCount(),
      mode: this.mode,
      gasFilterEnabled: !!this.gasFilter,
      queuedOpportunities: this.gasFilter?.getQueuedCount() || 0,
      missedOpportunities: this.gasFilter?.getMissedCount() || 0,
      mlEnabled: this.mlEnabled,
      mlStats: this.mlOrchestrator?.getStats()
    };
  }

  /**
   * Set gas filter
   */
  setGasFilter(filter: GasFilterService): void {
    this.gasFilter = filter;
  }

  /**
   * Get queued opportunities that are now executable
   */
  async getExecutableQueuedOpportunities(): Promise<ArbitragePath[]> {
    if (!this.gasFilter) {
      return [];
    }
    return this.gasFilter.getExecutableQueuedOpportunities();
  }

  /**
   * Set orchestrator mode
   */
  setMode(mode: OrchestratorMode): void {
    this.mode = mode;
  }

  /**
   * Get current mode
   */
  getMode(): OrchestratorMode {
    return this.mode;
  }

  /**
   * Handle real-time event trigger
   * 
   * Process arbitrage opportunity from real-time event.
   * This method is called by EventDrivenTrigger when a profitable opportunity is detected.
   */
  async handleRealtimeEvent(
    tokens: string[],
    startAmount: bigint,
    poolAddress?: string
  ): Promise<ArbitragePath[]> {
    // In event-driven mode, we can skip full graph rebuild if we have specific pool
    if (this.mode === 'event-driven' && poolAddress) {
      // Quick path evaluation for specific pool
      return this.evaluateQuickPath(tokens, startAmount, poolAddress);
    }

    // Otherwise, use standard opportunity finding
    return this.findOpportunities(tokens, startAmount);
  }

  /**
   * Quick path evaluation for event-driven mode
   * 
   * Evaluates paths involving a specific pool without full graph rebuild
   */
  private async evaluateQuickPath(
    tokens: string[],
    startAmount: bigint,
    poolAddress: string
  ): Promise<ArbitragePath[]> {
    // For now, delegate to standard findOpportunities
    // In a production system, this could be optimized to only evaluate
    // paths that include the specific pool that triggered the event
    return this.findOpportunities(tokens, startAmount);
  }

  /**
   * Find cross-chain arbitrage opportunities
   * 
   * Discovers profitable arbitrage paths across multiple blockchains
   */
  async findCrossChainOpportunities(
    startToken: string,
    startChain: number | string,
    startAmount: bigint,
    maxPaths: number = 10
  ): Promise<CrossChainPath[]> {
    if (!this.crossChainPathFinder) {
      throw new Error('Cross-chain pathfinding not enabled. Provide bridgeManager and crossChainConfig in constructor.');
    }

    // Find cross-chain paths
    const paths = await this.crossChainPathFinder.findCrossChainPaths(
      startToken,
      startChain,
      startAmount,
      maxPaths
    );

    // Filter by profitability threshold
    return paths.filter(path => 
      path.netProfit > this.config.minProfitThreshold
    );
  }

  /**
   * Add pool edge for cross-chain pathfinding
   */
  addCrossChainPoolEdge(chainId: number | string, edge: import('./types').PoolEdge): void {
    if (!this.crossChainPathFinder) {
      throw new Error('Cross-chain pathfinding not enabled');
    }
    this.crossChainPathFinder.addPoolEdge(chainId, edge);
  }

  /**
   * Enable cross-chain mode
   */
  enableCrossChainMode(bridgeManager: BridgeManager, crossChainConfig: CrossChainPathConfig): void {
    this.bridgeManager = bridgeManager;
    this.crossChainConfig = crossChainConfig;
    this.crossChainPathFinder = new CrossChainPathFinder(
      bridgeManager,
      crossChainConfig,
      this.config
    );
    this.mode = 'cross-chain';
  }

  /**
   * Check if cross-chain mode is enabled
   */
  isCrossChainEnabled(): boolean {
    return !!this.crossChainPathFinder;
  }

  /**
   * Get cross-chain statistics
   */
  getCrossChainStats(): { enabled: boolean; chains?: number } {
    if (!this.crossChainPathFinder) {
      return { enabled: false };
    }

    return {
      enabled: true,
      chains: 0 // Placeholder - would calculate from edges
    };
  }

  /**
   * Enable ML enhancement
   */
  enableML(mlOrchestrator: MLOrchestrator): void {
    this.mlOrchestrator = mlOrchestrator;
    this.mlEnabled = true;
  }

  /**
   * Disable ML enhancement
   */
  disableML(): void {
    this.mlEnabled = false;
  }

  /**
   * Check if ML is enabled
   */
  isMLEnabled(): boolean {
    return this.mlEnabled;
  }
}
