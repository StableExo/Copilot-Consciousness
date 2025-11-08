/**
 * GraphBuilder
 * 
 * Builds pool connectivity graphs and finds triangular cycles.
 * Used by arbitrage engines for opportunity detection.
 */

import { Graph } from './Graph';
import { PoolState } from '../engines/SpatialArbEngine';

/**
 * Triangle (3-token cycle) result
 */
export interface Triangle {
  /** Three tokens forming the triangle */
  tokens: [string, string, string];
  
  /** Three pools connecting the tokens */
  pools: [PoolState, PoolState, PoolState];
  
  /** Whether this is a valid arbitrage triangle */
  isValid: boolean;
}

/**
 * GraphBuilder configuration
 */
export interface GraphBuilderConfig {
  /** Supported protocols for filtering */
  supportedProtocols?: string[];
  
  /** Minimum liquidity for pools (optional) */
  minLiquidity?: number;
}

/**
 * GraphBuilder for creating and analyzing pool connectivity graphs
 */
export class GraphBuilder {
  private config: GraphBuilderConfig;
  private graph: Graph;

  constructor(config: GraphBuilderConfig = {}) {
    this.config = {
      supportedProtocols: config.supportedProtocols ?? [
        'uniswap_v2',
        'uniswap_v3',
        'sushiswap',
        'camelot',
      ],
      minLiquidity: config.minLiquidity,
    };

    this.graph = new Graph();
  }

  /**
   * Build graph from pool states
   */
  buildGraph(pools: PoolState[]): Graph {
    this.graph.clear();

    for (const pool of pools) {
      // Filter by protocol
      if (
        this.config.supportedProtocols &&
        !this.config.supportedProtocols.includes(pool.protocol)
      ) {
        continue;
      }

      // Filter by liquidity if configured
      if (this.config.minLiquidity !== undefined) {
        const liquidity = pool.reserve0 * pool.reserve1;
        if (liquidity < this.config.minLiquidity) {
          continue;
        }
      }

      this.graph.addPool(pool);
    }

    const stats = this.graph.getStats();
    console.log(
      `Built graph: ${stats.tokenCount} tokens, ${stats.poolCount} pools, ` +
      `${stats.edgeCount} edges, avg degree ${stats.avgDegree.toFixed(2)}`
    );

    return this.graph;
  }

  /**
   * Get the built graph
   */
  getGraph(): Graph {
    return this.graph;
  }

  /**
   * Find all triangles (3-token cycles) in the graph
   */
  findTriangles(): Triangle[] {
    const triangles: Triangle[] = [];
    const tokens = this.graph.getAllTokens();
    const seen = new Set<string>();

    // For each token, find triangles starting from it
    for (const token0 of tokens) {
      const neighbors1 = this.graph.getNeighbors(token0);

      for (const token1 of neighbors1) {
        if (token1 === token0) continue;

        const neighbors2 = this.graph.getNeighbors(token1);

        for (const token2 of neighbors2) {
          if (token2 === token0 || token2 === token1) continue;

          // Check if there's an edge back to token0
          const neighbors3 = this.graph.getNeighbors(token2);
          if (neighbors3.includes(token0)) {
            // Found a triangle: token0 -> token1 -> token2 -> token0
            
            // Create signature to avoid duplicates
            const tokensSorted = [token0, token1, token2].sort();
            const signature = tokensSorted.join('_');

            if (!seen.has(signature)) {
              seen.add(signature);

              // Find the pools for this triangle
              const pool01 = this.findPool(token0, token1);
              const pool12 = this.findPool(token1, token2);
              const pool20 = this.findPool(token2, token0);

              if (pool01 && pool12 && pool20) {
                triangles.push({
                  tokens: [token0, token1, token2],
                  pools: [pool01, pool12, pool20],
                  isValid: true,
                });
              }
            }
          }
        }
      }
    }

    console.log(`Found ${triangles.length} triangles in graph`);
    return triangles;
  }

  /**
   * Find triangles involving a specific token
   */
  findTrianglesForToken(token: string): Triangle[] {
    const triangles: Triangle[] = [];
    const seen = new Set<string>();

    const neighbors1 = this.graph.getNeighbors(token);

    for (const token1 of neighbors1) {
      if (token1 === token) continue;

      const neighbors2 = this.graph.getNeighbors(token1);

      for (const token2 of neighbors2) {
        if (token2 === token || token2 === token1) continue;

        // Check if there's an edge back to token
        const neighbors3 = this.graph.getNeighbors(token2);
        if (neighbors3.includes(token)) {
          // Found a triangle: token -> token1 -> token2 -> token
          
          const tokensSorted = [token, token1, token2].sort();
          const signature = tokensSorted.join('_');

          if (!seen.has(signature)) {
            seen.add(signature);

            const pool01 = this.findPool(token, token1);
            const pool12 = this.findPool(token1, token2);
            const pool20 = this.findPool(token2, token);

            if (pool01 && pool12 && pool20) {
              triangles.push({
                tokens: [token, token1, token2],
                pools: [pool01, pool12, pool20],
                isValid: true,
              });
            }
          }
        }
      }
    }

    return triangles;
  }

  /**
   * Find a pool connecting two tokens
   */
  private findPool(from: string, to: string): PoolState | undefined {
    const edges = this.graph.getEdges(from);
    
    for (const edge of edges) {
      if (edge.to === to) {
        return edge.pool;
      }
    }

    return undefined;
  }

  /**
   * Find all cycles of a given length starting from a token
   */
  findCycles(
    startToken: string,
    cycleLength: number = 3
  ): Array<{ tokens: string[]; pools: PoolState[] }> {
    const cycles: Array<{ tokens: string[]; pools: PoolState[] }> = [];

    const dfs = (
      current: string,
      path: string[],
      pools: PoolState[],
      visited: Set<string>
    ): void => {
      // If we've reached the desired length
      if (path.length === cycleLength) {
        // Check if we can return to start
        const neighbors = this.graph.getNeighbors(current);
        if (neighbors.includes(startToken)) {
          const finalPool = this.findPool(current, startToken);
          if (finalPool) {
            cycles.push({
              tokens: [...path, startToken],
              pools: [...pools, finalPool],
            });
          }
        }
        return;
      }

      // Don't revisit tokens (except start at the end)
      if (visited.has(current)) {
        return;
      }

      const newVisited = new Set(visited);
      newVisited.add(current);

      const edges = this.graph.getEdges(current);
      for (const edge of edges) {
        // Don't go back to start until we have enough hops
        if (edge.to === startToken && path.length < cycleLength) {
          continue;
        }

        dfs(
          edge.to,
          [...path, edge.to],
          [...pools, edge.pool],
          newVisited
        );
      }
    };

    dfs(startToken, [startToken], [], new Set());

    return cycles;
  }

  /**
   * Get graph statistics
   */
  getStats() {
    return this.graph.getStats();
  }

  /**
   * Check if two tokens are connected
   */
  areConnected(token1: string, token2: string, maxHops: number = 5): boolean {
    return this.graph.hasPath(token1, token2, maxHops);
  }

  /**
   * Find all paths between two tokens
   */
  findPaths(
    from: string,
    to: string,
    maxHops: number = 5
  ): Array<{ tokens: string[]; pools: PoolState[] }> {
    return this.graph.findPaths(from, to, maxHops);
  }
}
