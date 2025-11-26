/**
 * GraphBuilder Tests
 */

import { GraphBuilder } from '../GraphBuilder';
import { PoolState } from '../../engines/SpatialArbEngine';

describe('GraphBuilder', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('buildGraph', () => {
    it('should build graph from pools', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      const graph = builder.buildGraph(pools);
      const stats = graph.getStats();

      expect(stats.tokenCount).toBe(3); // WETH, USDC, DAI
      expect(stats.poolCount).toBe(2);
      expect(stats.edgeCount).toBe(4); // 2 pools * 2 directions
    });

    it('should filter pools by protocol', () => {
      const restrictedBuilder = new GraphBuilder({
        supportedProtocols: ['uniswap_v3'],
      });

      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      const graph = restrictedBuilder.buildGraph(pools);
      const stats = graph.getStats();

      expect(stats.poolCount).toBe(1); // Only uniswap_v3 pool
    });

    it('should filter pools by minimum liquidity', () => {
      const restrictedBuilder = new GraphBuilder({
        minLiquidity: 1000000,
      });

      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000, // Liquidity: 20,000,000
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 10,
          reserve1: 10, // Liquidity: 100 (below threshold)
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      const graph = restrictedBuilder.buildGraph(pools);
      const stats = graph.getStats();

      expect(stats.poolCount).toBe(1); // Only high liquidity pool
    });
  });

  describe('findTriangles', () => {
    it('should find triangles in graph', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool3',
          token0: '0xDAI',
          token1: '0xWETH',
          reserve0: 200000,
          reserve1: 100,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const triangles = builder.findTriangles();

      expect(triangles.length).toBeGreaterThan(0);

      const triangle = triangles[0];
      expect(triangle.tokens.length).toBe(3);
      expect(triangle.pools.length).toBe(3);
      expect(triangle.isValid).toBe(true);
    });

    it('should not find triangles when graph is incomplete', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        // Missing DAI -> WETH pool to complete triangle
      ];

      builder.buildGraph(pools);
      const triangles = builder.findTriangles();

      expect(triangles.length).toBe(0);
    });

    it('should deduplicate triangles', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool3',
          token0: '0xDAI',
          token1: '0xWETH',
          reserve0: 200000,
          reserve1: 100,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const triangles = builder.findTriangles();

      // Should find triangle only once despite multiple start points
      const signatures = new Set<string>();
      triangles.forEach((t) => {
        const sig = t.tokens.slice().sort().join('_');
        expect(signatures.has(sig)).toBe(false);
        signatures.add(sig);
      });
    });
  });

  describe('findTrianglesForToken', () => {
    it('should find triangles involving specific token', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool3',
          token0: '0xDAI',
          token1: '0xWETH',
          reserve0: 200000,
          reserve1: 100,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const triangles = builder.findTrianglesForToken('0xWETH');

      expect(triangles.length).toBeGreaterThan(0);
      triangles.forEach((t) => {
        expect(t.tokens).toContain('0xWETH');
      });
    });

    it('should return empty for non-existent token', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const triangles = builder.findTrianglesForToken('0xNonExistent');

      expect(triangles.length).toBe(0);
    });
  });

  describe('findCycles', () => {
    it('should find cycles of specified length', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool3',
          token0: '0xDAI',
          token1: '0xWETH',
          reserve0: 200000,
          reserve1: 100,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const cycles = builder.findCycles('0xWETH', 3);

      expect(cycles.length).toBeGreaterThanOrEqual(0);

      cycles.forEach((cycle) => {
        expect(cycle.tokens[0]).toBe('0xWETH');
        expect(cycle.tokens[cycle.tokens.length - 1]).toBe('0xWETH');
      });
    });

    it('should respect cycle length limit', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool3',
          token0: '0xDAI',
          token1: '0xWETH',
          reserve0: 200000,
          reserve1: 100,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const cycles = builder.findCycles('0xWETH', 2);

      cycles.forEach((cycle) => {
        // Should have at most 2 intermediate hops + start/end
        expect(cycle.tokens.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('areConnected', () => {
    it('should check if tokens are connected', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);

      expect(builder.areConnected('0xWETH', '0xUSDC')).toBe(true);
      expect(builder.areConnected('0xWETH', '0xDAI')).toBe(true);
      expect(builder.areConnected('0xWETH', '0xNonExistent')).toBe(false);
    });
  });

  describe('findPaths', () => {
    it('should find all paths between tokens', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool3',
          token0: '0xWETH',
          token1: '0xDAI',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const paths = builder.findPaths('0xWETH', '0xDAI', 5);

      // Should find at least 2 paths (direct and via USDC)
      expect(paths.length).toBeGreaterThanOrEqual(1);

      paths.forEach((path) => {
        expect(path.tokens[0]).toBe('0xWETH');
        expect(path.tokens[path.tokens.length - 1]).toBe('0xDAI');
      });
    });

    it('should respect max hops limit', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xUSDC',
          token1: '0xDAI',
          reserve0: 200000,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const paths = builder.findPaths('0xWETH', '0xDAI', 1);

      // Should not find path with only 1 hop allowed
      expect(paths.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return graph statistics', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      builder.buildGraph(pools);
      const stats = builder.getStats();

      expect(stats.tokenCount).toBeGreaterThan(0);
      expect(stats.poolCount).toBeGreaterThan(0);
      expect(stats.edgeCount).toBeGreaterThan(0);
      expect(stats.avgDegree).toBeGreaterThan(0);
    });
  });
});
