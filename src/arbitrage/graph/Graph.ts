/**
 * Graph Data Structure
 * 
 * Represents pool connectivity for arbitrage path finding.
 * Used by GraphBuilder for triangle and cycle detection.
 */

import { PoolState } from '../engines/SpatialArbEngine';

/**
 * Graph edge representing a pool
 */
export interface GraphEdge {
  /** Pool that enables this connection */
  pool: PoolState;
  
  /** Destination token */
  to: string;
  
  /** Weight (can be used for optimization) */
  weight?: number;
}

/**
 * Graph for pool connectivity
 */
export class Graph {
  // Adjacency list: token -> edges
  private adjacencyList: Map<string, GraphEdge[]>;
  
  // All unique tokens in graph
  private tokens: Set<string>;
  
  // All pools in graph
  private pools: Map<string, PoolState>;

  constructor() {
    this.adjacencyList = new Map();
    this.tokens = new Set();
    this.pools = new Map();
  }

  /**
   * Add a pool to the graph, creating bidirectional edges
   */
  addPool(pool: PoolState): void {
    // Add tokens
    this.tokens.add(pool.token0);
    this.tokens.add(pool.token1);

    // Store pool
    this.pools.set(pool.poolAddress, pool);

    // Create bidirectional edges
    this.addEdge(pool.token0, pool.token1, pool);
    this.addEdge(pool.token1, pool.token0, pool);
  }

  /**
   * Add a directed edge from one token to another via a pool
   */
  private addEdge(from: string, to: string, pool: PoolState): void {
    if (!this.adjacencyList.has(from)) {
      this.adjacencyList.set(from, []);
    }

    this.adjacencyList.get(from)!.push({
      pool,
      to,
      weight: 1,  // Can be customized for optimization
    });
  }

  /**
   * Get all edges from a token
   */
  getEdges(token: string): GraphEdge[] {
    return this.adjacencyList.get(token) ?? [];
  }

  /**
   * Get all tokens directly connected to a token
   */
  getNeighbors(token: string): string[] {
    const edges = this.getEdges(token);
    return edges.map(edge => edge.to);
  }

  /**
   * Get all unique tokens in the graph
   */
  getAllTokens(): string[] {
    return Array.from(this.tokens);
  }

  /**
   * Get all pools in the graph
   */
  getAllPools(): PoolState[] {
    return Array.from(this.pools.values());
  }

  /**
   * Get pool by address
   */
  getPool(poolAddress: string): PoolState | undefined {
    return this.pools.get(poolAddress);
  }

  /**
   * Get number of tokens in graph
   */
  getTokenCount(): number {
    return this.tokens.size;
  }

  /**
   * Get number of pools in graph
   */
  getPoolCount(): number {
    return this.pools.size;
  }

  /**
   * Get number of edges in graph
   */
  getEdgeCount(): number {
    let count = 0;
    for (const edges of this.adjacencyList.values()) {
      count += edges.length;
    }
    return count;
  }

  /**
   * Check if a path exists between two tokens (BFS)
   */
  hasPath(from: string, to: string, maxHops: number = 5): boolean {
    if (from === to) {
      return true;
    }

    const visited = new Set<string>();
    const queue: Array<{ token: string; hops: number }> = [{ token: from, hops: 0 }];

    while (queue.length > 0) {
      const { token, hops } = queue.shift()!;

      if (hops >= maxHops) {
        continue;
      }

      if (visited.has(token)) {
        continue;
      }

      visited.add(token);

      const neighbors = this.getNeighbors(token);
      for (const neighbor of neighbors) {
        if (neighbor === to) {
          return true;
        }

        if (!visited.has(neighbor)) {
          queue.push({ token: neighbor, hops: hops + 1 });
        }
      }
    }

    return false;
  }

  /**
   * Find all simple paths between two tokens (DFS)
   */
  findPaths(
    from: string,
    to: string,
    maxHops: number = 5
  ): Array<{ tokens: string[]; pools: PoolState[] }> {
    const paths: Array<{ tokens: string[]; pools: PoolState[] }> = [];

    const dfs = (
      current: string,
      target: string,
      path: string[],
      pools: PoolState[],
      visited: Set<string>
    ): void => {
      if (path.length > maxHops) {
        return;
      }

      if (current === target && path.length > 1) {
        paths.push({
          tokens: [...path],
          pools: [...pools],
        });
        return;
      }

      if (visited.has(current) && current !== target) {
        return;
      }

      const newVisited = new Set(visited);
      newVisited.add(current);

      const edges = this.getEdges(current);
      for (const edge of edges) {
        dfs(
          edge.to,
          target,
          [...path, edge.to],
          [...pools, edge.pool],
          newVisited
        );
      }
    };

    dfs(from, to, [from], [], new Set());
    return paths;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.adjacencyList.clear();
    this.tokens.clear();
    this.pools.clear();
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    tokenCount: number;
    poolCount: number;
    edgeCount: number;
    avgDegree: number;
  } {
    const tokenCount = this.getTokenCount();
    const poolCount = this.getPoolCount();
    const edgeCount = this.getEdgeCount();
    const avgDegree = tokenCount > 0 ? edgeCount / tokenCount : 0;

    return {
      tokenCount,
      poolCount,
      edgeCount,
      avgDegree,
    };
  }
}
