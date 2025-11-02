/**
 * ArbitrageOrchestrator - Main orchestrator for multi-hop arbitrage
 * 
 * Coordinates pathfinding, data fetching, and profitability calculations
 */

import { DEXRegistry } from '../dex/core/DEXRegistry';
import { PathFinder } from './PathFinder';
import { ProfitabilityCalculator } from './ProfitabilityCalculator';
import { MultiHopDataFetcher } from './MultiHopDataFetcher';
import { ArbitragePath, PathfindingConfig } from './types';

/**
 * Orchestrator mode - polling or event-driven
 */
export type OrchestratorMode = 'polling' | 'event-driven' | 'hybrid';

export class ArbitrageOrchestrator {
  private registry: DEXRegistry;
  private pathFinder: PathFinder;
  private profitCalculator: ProfitabilityCalculator;
  private dataFetcher: MultiHopDataFetcher;
  private config: PathfindingConfig;
  private mode: OrchestratorMode = 'polling';

  constructor(
    registry: DEXRegistry,
    config: PathfindingConfig,
    gasPrice: bigint
  ) {
    this.registry = registry;
    this.config = config;
    this.pathFinder = new PathFinder(config);
    this.profitCalculator = new ProfitabilityCalculator(gasPrice);
    this.dataFetcher = new MultiHopDataFetcher(registry);
  }

  /**
   * Find profitable arbitrage opportunities for given tokens
   */
  async findOpportunities(tokens: string[], startAmount: bigint): Promise<ArbitragePath[]> {
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
    const profitablePaths = allPaths.filter(path => 
      this.profitCalculator.isProfitable(path, this.config.minProfitThreshold)
    );

    // 5. Sort by net profit
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
      mode: this.mode
    };
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
}
