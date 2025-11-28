/**
 * PathFinder - Graph-based pathfinding for multi-hop arbitrage
 *
 * Uses a Depth-First Search (DFS) algorithm to find profitable arbitrage paths
 * across multiple DEXs and token pairs
 */

import { PoolEdge, ArbitragePath, ArbitrageHop, PathfindingConfig } from './types';

/**
 * Graph node representing a token
 */
interface _GraphNode {
  token: string;
  distance: bigint;
  predecessor: { edge: PoolEdge; node: string } | null;
  visited: boolean;
}

export class PathFinder {
  private edges: Map<string, PoolEdge[]>; // token address -> outgoing edges
  private tokens: Set<string>;
  private config: PathfindingConfig;

  constructor(config: PathfindingConfig) {
    this.edges = new Map();
    this.tokens = new Set();
    this.config = config;
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
  }

  /**
   * Find profitable arbitrage paths starting from a token
   */
  findArbitragePaths(startToken: string, startAmount: bigint): ArbitragePath[] {
    const paths: ArbitragePath[] = [];

    // Use DFS to explore all possible paths up to maxHops
    const visited = new Set<string>();
    const currentPath: ArbitrageHop[] = [];

    this.explorePaths(startToken, startToken, startAmount, 0, currentPath, visited, paths);

    // Sort by net profit descending
    return paths.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });
  }

  /**
   * Recursively explore paths using DFS
   */
  private explorePaths(
    startToken: string,
    currentToken: string,
    currentAmount: bigint,
    depth: number,
    currentPath: ArbitrageHop[],
    visited: Set<string>,
    results: ArbitragePath[]
  ): void {
    // Check if we've exceeded max hops
    if (depth >= this.config.maxHops) {
      return;
    }

    // Get all edges from current token
    const outgoingEdges = this.edges.get(currentToken) || [];

    for (const edge of outgoingEdges) {
      // Avoid cycles in the path (except return to start)
      const edgeKey = `${edge.poolAddress}-${edge.tokenOut}`;
      if (visited.has(edgeKey)) {
        continue;
      }

      // Calculate output amount considering fees and slippage
      const amountOut = this.calculateSwapOutput(currentAmount, edge);

      if (amountOut <= BigInt(0)) {
        continue;
      }

      // Create hop
      const hop: ArbitrageHop = {
        dexName: edge.dexName,
        poolAddress: edge.poolAddress,
        tokenIn: edge.tokenIn,
        tokenOut: edge.tokenOut,
        amountIn: currentAmount,
        amountOut: amountOut,
        fee: edge.fee,
        gasEstimate: edge.gasEstimate,
        reserve0: edge.reserve0,
        reserve1: edge.reserve1,
      };

      currentPath.push(hop);
      visited.add(edgeKey);

      // Check if we've returned to start token (arbitrage opportunity)
      if (edge.tokenOut === startToken && depth > 0) {
        // Calculate total profit
        const path = this.buildArbitragePath(currentPath, startToken);

        // Only add if profitable
        if (path.netProfit > this.config.minProfitThreshold) {
          results.push(path);
        }
      } else {
        // Continue exploring
        this.explorePaths(
          startToken,
          edge.tokenOut,
          amountOut,
          depth + 1,
          currentPath,
          visited,
          results
        );
      }

      // Backtrack
      currentPath.pop();
      visited.delete(edgeKey);
    }
  }

  /**
   * Calculate swap output using constant product formula with fees
   */
  private calculateSwapOutput(amountIn: bigint, edge: PoolEdge): bigint {
    // Using x * y = k formula
    // amountOut = (amountIn * (1 - fee) * reserve1) / (reserve0 + amountIn * (1 - fee))

    const feeMultiplier = BigInt(Math.floor((1 - edge.fee) * 10000));
    const amountInWithFee = (amountIn * feeMultiplier) / BigInt(10000);

    // Determine which reserve is which based on token addresses
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

    // Calculate slippage impact (simplified)
    const slippageImpact = hops.length * 0.001; // 0.1% per hop as estimate

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
   * Clear all edges and reset the graph
   */
  clear(): void {
    this.edges.clear();
    this.tokens.clear();
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
