/**
 * AdvancedPathFinder - Enhanced pathfinding with multiple algorithms
 *
 * Implements Bellman-Ford for negative cycle detection (arbitrage opportunities)
 * along with DFS and BFS strategies for different scenarios
 */

import { PoolEdge, ArbitragePath, ArbitrageHop, PathfindingConfig } from './types';
import { PathFinder } from './PathFinder';

/**
 * Pathfinding strategy types
 */
export type PathfindingStrategy = 'dfs' | 'bfs' | 'bellman-ford' | 'auto';

/**
 * Performance metrics for pathfinding
 */
export interface PathfindingMetrics {
  pathsExplored: number;
  pathsPruned: number;
  timeElapsedMs: number;
  strategy: PathfindingStrategy;
}

/**
 * Graph edge in logarithmic space for Bellman-Ford
 */
interface LogEdge {
  from: string;
  to: string;
  weight: number; // -log(rate * (1 - fee))
  poolEdge: PoolEdge;
}

/**
 * Extended configuration for advanced pathfinding
 */
export interface AdvancedPathfindingConfig extends PathfindingConfig {
  strategy?: PathfindingStrategy;
  pruningEnabled?: boolean;
  cacheEnabled?: boolean;
  strategySelectionThresholds?: {
    largeGraphEdges?: number;
    largeGraphTokens?: number;
    mediumGraphEdges?: number;
    mediumGraphTokens?: number;
  };
}

export class AdvancedPathFinder {
  private edges: Map<string, PoolEdge[]>;
  private tokens: Set<string>;
  private config: AdvancedPathfindingConfig;
  private fallbackPathFinder: PathFinder;
  private metrics: PathfindingMetrics;

  constructor(config: AdvancedPathfindingConfig) {
    this.edges = new Map();
    this.tokens = new Set();
    this.config = {
      ...config,
      strategy: config.strategy || 'auto',
      pruningEnabled: config.pruningEnabled !== false,
      cacheEnabled: config.cacheEnabled !== false,
    };
    this.fallbackPathFinder = new PathFinder(config);
    this.metrics = {
      pathsExplored: 0,
      pathsPruned: 0,
      timeElapsedMs: 0,
      strategy: this.config.strategy || 'auto',
    };
  }

  /**
   * Add a pool edge to the graph
   */
  addPoolEdge(edge: PoolEdge): void {
    this.tokens.add(edge.tokenIn);
    this.tokens.add(edge.tokenOut);

    if (!this.edges.has(edge.tokenIn)) {
      this.edges.set(edge.tokenIn, []);
    }
    this.edges.get(edge.tokenIn)!.push(edge);

    // Also add to fallback pathfinder
    this.fallbackPathFinder.addPoolEdge(edge);
  }

  /**
   * Find profitable arbitrage paths using selected strategy
   */
  findArbitragePaths(startToken: string, startAmount: bigint): ArbitragePath[] {
    const startTime = Date.now();
    this.metrics = {
      pathsExplored: 0,
      pathsPruned: 0,
      timeElapsedMs: 0,
      strategy: this.config.strategy || 'auto',
    };

    let paths: ArbitragePath[] = [];
    const strategy = this.selectStrategy();

    try {
      switch (strategy) {
        case 'bellman-ford':
          paths = this.findPathsBellmanFord(startToken, startAmount);
          break;
        case 'bfs':
          paths = this.findPathsBFS(startToken, startAmount);
          break;
        case 'dfs':
        default:
          // Use fallback DFS implementation
          paths = this.fallbackPathFinder.findArbitragePaths(startToken, startAmount);
          break;
      }
    } catch (error) {
      console.warn(`Strategy ${strategy} failed, falling back to DFS:`, error);
      paths = this.fallbackPathFinder.findArbitragePaths(startToken, startAmount);
    }

    this.metrics.timeElapsedMs = Date.now() - startTime;
    this.metrics.strategy = strategy;

    return paths;
  }

  /**
   * Bellman-Ford algorithm for negative cycle detection
   * Converts exchange rates to logarithmic space where arbitrage = negative cycles
   */
  private findPathsBellmanFord(startToken: string, startAmount: bigint): ArbitragePath[] {
    const paths: ArbitragePath[] = [];

    // Build logarithmic edges
    const logEdges = this.buildLogEdges();

    if (logEdges.length === 0) {
      return paths;
    }

    // Initialize distances
    const distances = new Map<string, number>();
    const predecessors = new Map<string, LogEdge | null>();

    for (const token of this.tokens) {
      distances.set(token, Infinity);
      predecessors.set(token, null);
    }
    distances.set(startToken, 0);

    const tokenCount = this.tokens.size;

    // Relax edges V-1 times
    for (let i = 0; i < tokenCount - 1; i++) {
      for (const edge of logEdges) {
        const distFrom = distances.get(edge.from) || Infinity;
        const distTo = distances.get(edge.to) || Infinity;

        if (distFrom + edge.weight < distTo) {
          distances.set(edge.to, distFrom + edge.weight);
          predecessors.set(edge.to, edge);
        }
      }
    }

    // Check for negative cycles (arbitrage opportunities)
    for (const edge of logEdges) {
      const distFrom = distances.get(edge.from) || Infinity;
      const distTo = distances.get(edge.to) || Infinity;

      if (distFrom + edge.weight < distTo) {
        // Negative cycle found
        const path = this.extractArbitragePath(edge, predecessors, startToken, startAmount);
        if (path && path.netProfit > this.config.minProfitThreshold) {
          paths.push(path);
          this.metrics.pathsExplored++;
        }
      }
    }

    return paths.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });
  }

  /**
   * Breadth-First Search for finding shortest arbitrage paths
   */
  private findPathsBFS(startToken: string, startAmount: bigint): ArbitragePath[] {
    const paths: ArbitragePath[] = [];
    const queue: Array<{
      token: string;
      amount: bigint;
      depth: number;
      path: ArbitrageHop[];
      visited: Set<string>;
      visitedPools: Set<string>; // Track unique pools to prevent same-pool round trips
    }> = [];

    queue.push({
      token: startToken,
      amount: startAmount,
      depth: 0,
      path: [],
      visited: new Set(),
      visitedPools: new Set(),
    });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= this.config.maxHops) {
        continue;
      }

      const outgoingEdges = this.edges.get(current.token) || [];

      for (const edge of outgoingEdges) {
        const edgeKey = `${edge.poolAddress}-${edge.tokenOut}`;
        if (current.visited.has(edgeKey)) {
          continue;
        }

        // CRITICAL: Skip if we've already used this pool in this path
        // Using the same pool twice (even in opposite directions) is NOT a valid arb
        // It just means paying fees twice to go nowhere
        if (current.visitedPools.has(edge.poolAddress)) {
          continue;
        }

        const amountOut = this.calculateSwapOutput(current.amount, edge);
        if (amountOut <= BigInt(0)) {
          continue;
        }

        const hop: ArbitrageHop = {
          dexName: edge.dexName,
          poolAddress: edge.poolAddress,
          tokenIn: edge.tokenIn,
          tokenOut: edge.tokenOut,
          amountIn: current.amount,
          amountOut: amountOut,
          fee: edge.fee,
          gasEstimate: edge.gasEstimate,
          reserve0: edge.reserve0,
          reserve1: edge.reserve1,
        };

        const newPath = [...current.path, hop];
        const newVisited = new Set(current.visited);
        newVisited.add(edgeKey);
        const newVisitedPools = new Set(current.visitedPools);
        newVisitedPools.add(edge.poolAddress);

        // Check if we've returned to start
        if (edge.tokenOut === startToken && current.depth > 0) {
          const arbitragePath = this.buildArbitragePath(newPath, startToken);
          if (arbitragePath.netProfit > this.config.minProfitThreshold) {
            paths.push(arbitragePath);
            this.metrics.pathsExplored++;
          }
        } else {
          queue.push({
            token: edge.tokenOut,
            amount: amountOut,
            depth: current.depth + 1,
            path: newPath,
            visited: newVisited,
            visitedPools: newVisitedPools,
          });
        }
      }
    }

    return paths.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });
  }

  /**
   * Build logarithmic edges for Bellman-Ford
   */
  private buildLogEdges(): LogEdge[] {
    const logEdges: LogEdge[] = [];

    for (const [tokenIn, edges] of this.edges.entries()) {
      for (const edge of edges) {
        // Calculate exchange rate considering reserves
        const rate = this.calculateExchangeRate(edge);

        if (rate <= 0) {
          continue;
        }

        // Convert to logarithmic space: weight = -log(rate * (1 - fee))
        const effectiveRate = rate * (1 - edge.fee);
        const weight = effectiveRate > 0 ? -Math.log(effectiveRate) : Infinity;

        logEdges.push({
          from: tokenIn,
          to: edge.tokenOut,
          weight,
          poolEdge: edge,
        });
      }
    }

    return logEdges;
  }

  /**
   * Calculate exchange rate from reserves
   */
  private calculateExchangeRate(edge: PoolEdge): number {
    if (edge.reserve0 === BigInt(0)) {
      return 0;
    }

    // rate = reserve1 / reserve0
    return Number(edge.reserve1) / Number(edge.reserve0);
  }

  /**
   * Extract arbitrage path from Bellman-Ford predecessors
   */
  private extractArbitragePath(
    cycleEdge: LogEdge,
    predecessors: Map<string, LogEdge | null>,
    startToken: string,
    startAmount: bigint
  ): ArbitragePath | null {
    const hops: ArbitrageHop[] = [];
    const visited = new Set<string>();
    const visitedPools = new Set<string>(); // Track unique pools

    let currentEdge: LogEdge | null = cycleEdge;
    let currentAmount = startAmount;

    // Trace back through predecessors to find the cycle
    while (currentEdge && !visited.has(currentEdge.from)) {
      // CRITICAL: Skip paths that reuse the same pool
      // Using the same pool twice is not a valid arbitrage
      if (visitedPools.has(currentEdge.poolEdge.poolAddress)) {
        return null; // Invalid path - same pool used twice
      }

      visited.add(currentEdge.from);
      visitedPools.add(currentEdge.poolEdge.poolAddress);

      const amountOut = this.calculateSwapOutput(currentAmount, currentEdge.poolEdge);

      hops.unshift({
        dexName: currentEdge.poolEdge.dexName,
        poolAddress: currentEdge.poolEdge.poolAddress,
        tokenIn: currentEdge.from,
        tokenOut: currentEdge.to,
        amountIn: currentAmount,
        amountOut: amountOut,
        fee: currentEdge.poolEdge.fee,
        gasEstimate: currentEdge.poolEdge.gasEstimate,
        reserve0: currentEdge.poolEdge.reserve0,
        reserve1: currentEdge.poolEdge.reserve1,
      });

      currentAmount = amountOut;
      currentEdge = predecessors.get(currentEdge.from) || null;

      // Prevent infinite loops
      if (hops.length > this.config.maxHops) {
        break;
      }
    }

    // Validate that we have a cycle back to start token
    if (hops.length > 0 && hops[hops.length - 1].tokenOut === startToken) {
      return this.buildArbitragePath(hops, startToken);
    }

    return null;
  }

  /**
   * Calculate swap output using constant product formula
   */
  private calculateSwapOutput(amountIn: bigint, edge: PoolEdge): bigint {
    const feeMultiplier = BigInt(Math.floor((1 - edge.fee) * 10000));
    const amountInWithFee = (amountIn * feeMultiplier) / BigInt(10000);

    const reserve0 = edge.reserve0;
    const reserve1 = edge.reserve1;

    const numerator = amountInWithFee * reserve1;
    const denominator = reserve0 + amountInWithFee;

    if (denominator === BigInt(0)) {
      return BigInt(0);
    }

    return numerator / denominator;
  }

  /**
   * Build complete arbitrage path with profit calculations
   */
  private buildArbitragePath(hops: ArbitrageHop[], startToken: string): ArbitragePath {
    const totalFees = hops.reduce((sum, hop) => sum + hop.fee, 0);
    const totalGas = hops.reduce((sum, hop) => BigInt(hop.gasEstimate), BigInt(0));
    const totalGasCost = totalGas * this.config.gasPrice;

    const startAmount = hops[0].amountIn;
    const endAmount = hops[hops.length - 1].amountOut;

    const estimatedProfit = endAmount > startAmount ? endAmount - startAmount : BigInt(0);
    const netProfit = estimatedProfit > totalGasCost ? estimatedProfit - totalGasCost : BigInt(0);

    const slippageImpact = hops.length * 0.001;

    return {
      hops: [...hops],
      startToken,
      endToken: startToken,
      estimatedProfit,
      totalGasCost,
      netProfit,
      totalFees,
      slippageImpact,
    };
  }

  /**
   * Select appropriate strategy based on graph size and configuration
   */
  private selectStrategy(): PathfindingStrategy {
    if (this.config.strategy && this.config.strategy !== 'auto') {
      return this.config.strategy;
    }

    const edgeCount = this.getEdgeCount();
    const tokenCount = this.tokens.size;

    // Get thresholds from config or use defaults
    const thresholds = this.config.strategySelectionThresholds || {};
    const largeEdges = thresholds.largeGraphEdges || 100;
    const largeTokens = thresholds.largeGraphTokens || 20;
    const mediumEdges = thresholds.mediumGraphEdges || 50;
    const mediumTokens = thresholds.mediumGraphTokens || 10;

    // For large graphs, use Bellman-Ford (better for detecting all cycles)
    if (edgeCount > largeEdges || tokenCount > largeTokens) {
      return 'bellman-ford';
    }

    // For medium graphs, use BFS (balanced)
    if (edgeCount > mediumEdges || tokenCount > mediumTokens) {
      return 'bfs';
    }

    // For small graphs, DFS is fine
    return 'dfs';
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PathfindingMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all edges and reset the graph
   */
  clear(): void {
    this.edges.clear();
    this.tokens.clear();
    this.fallbackPathFinder.clear();
    this.metrics = {
      pathsExplored: 0,
      pathsPruned: 0,
      timeElapsedMs: 0,
      strategy: this.config.strategy || 'auto',
    };
  }

  /**
   * Get all tokens in the graph
   */
  getTokens(): string[] {
    return Array.from(this.tokens);
  }

  /**
   * Get number of edges in the graph
   */
  getEdgeCount(): number {
    let count = 0;
    for (const edges of this.edges.values()) {
      count += edges.length;
    }
    return count;
  }
}
