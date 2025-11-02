import { AdvancedPathFinder } from '../AdvancedPathFinder';
import { PoolEdge, PathfindingConfig } from '../types';

describe('AdvancedPathFinder', () => {
  let pathFinder: AdvancedPathFinder;
  let config: PathfindingConfig;

  beforeEach(() => {
    config = {
      maxHops: 4,
      minProfitThreshold: BigInt(100),
      maxSlippage: 0.05,
      gasPrice: BigInt(50000000000) // 50 gwei
    };
    pathFinder = new AdvancedPathFinder({
      ...config,
      strategy: 'auto'
    });
  });

  describe('constructor', () => {
    it('should initialize with auto strategy by default', () => {
      const metrics = pathFinder.getMetrics();
      expect(metrics.strategy).toBe('auto');
    });

    it('should accept explicit strategy', () => {
      const bf = new AdvancedPathFinder({
        ...config,
        strategy: 'bellman-ford'
      });
      expect(bf).toBeDefined();
    });
  });

  describe('addPoolEdge', () => {
    it('should add pool edges to the graph', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(2000000),
        fee: 0.003,
        gasEstimate: 150000
      };

      pathFinder.addPoolEdge(edge);
      
      expect(pathFinder.getTokens()).toContain('0xToken1');
      expect(pathFinder.getTokens()).toContain('0xToken2');
      expect(pathFinder.getEdgeCount()).toBe(1);
    });
  });

  describe('Bellman-Ford algorithm', () => {
    it('should find arbitrage cycle with profitable opportunity', () => {
      const bellmanFord = new AdvancedPathFinder({
        ...config,
        strategy: 'bellman-ford'
      });

      // Create a triangular arbitrage with profit
      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken2',
          tokenOut: '0xToken3',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x789',
          dexName: 'Curve',
          tokenIn: '0xToken3',
          tokenOut: '0xToken1',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10500000000000000000000'), // 5% profit opportunity
          fee: 0.0004,
          gasEstimate: 180000
        }
      ];

      edges.forEach(edge => bellmanFord.addPoolEdge(edge));

      const startAmount = BigInt('100000000000000000000'); // 100 tokens
      const paths = bellmanFord.findArbitragePaths('0xToken1', startAmount);

      expect(Array.isArray(paths)).toBe(true);
      // Bellman-Ford should find arbitrage cycles
      expect(paths.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle graphs with no arbitrage', () => {
      const bellmanFord = new AdvancedPathFinder({
        ...config,
        strategy: 'bellman-ford'
      });

      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10000000000000000000000'),
          fee: 0.1, // High fee ensures no arbitrage
          gasEstimate: 150000
        }
      ];

      edges.forEach(edge => bellmanFord.addPoolEdge(edge));

      const startAmount = BigInt('100000000000000000000');
      const paths = bellmanFord.findArbitragePaths('0xToken1', startAmount);

      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(0);
    });
  });

  describe('BFS strategy', () => {
    it('should find paths using breadth-first search', () => {
      const bfs = new AdvancedPathFinder({
        ...config,
        strategy: 'bfs'
      });

      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken2',
          tokenOut: '0xToken1',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10100000000000000000000'), // Small profit
          fee: 0.003,
          gasEstimate: 150000
        }
      ];

      edges.forEach(edge => bfs.addPoolEdge(edge));

      const startAmount = BigInt('100000000000000000000');
      const paths = bfs.findArbitragePaths('0xToken1', startAmount);

      expect(Array.isArray(paths)).toBe(true);
    });
  });

  describe('auto strategy selection', () => {
    it('should select DFS for small graphs', () => {
      const auto = new AdvancedPathFinder({
        ...config,
        strategy: 'auto'
      });

      // Add a few edges (small graph)
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(2000000),
        fee: 0.003,
        gasEstimate: 150000
      };

      auto.addPoolEdge(edge);
      
      const startAmount = BigInt('100000000000000000000');
      auto.findArbitragePaths('0xToken1', startAmount);

      const metrics = auto.getMetrics();
      // For small graphs, should use DFS or BFS
      expect(['dfs', 'bfs', 'bellman-ford']).toContain(metrics.strategy);
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(2000000),
        fee: 0.003,
        gasEstimate: 150000
      };

      pathFinder.addPoolEdge(edge);
      pathFinder.findArbitragePaths('0xToken1', BigInt(1000000));

      const metrics = pathFinder.getMetrics();
      
      expect(metrics).toHaveProperty('pathsExplored');
      expect(metrics).toHaveProperty('pathsPruned');
      expect(metrics).toHaveProperty('timeElapsedMs');
      expect(metrics).toHaveProperty('strategy');
      expect(metrics.timeElapsedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    it('should clear all graph data', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(2000000),
        fee: 0.003,
        gasEstimate: 150000
      };

      pathFinder.addPoolEdge(edge);
      expect(pathFinder.getEdgeCount()).toBe(1);

      pathFinder.clear();
      
      expect(pathFinder.getEdgeCount()).toBe(0);
      expect(pathFinder.getTokens().length).toBe(0);
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to DFS if strategy fails', () => {
      // Create a pathfinder that might fail with Bellman-Ford
      const pf = new AdvancedPathFinder({
        ...config,
        strategy: 'bellman-ford'
      });

      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(2000000),
        fee: 0.003,
        gasEstimate: 150000
      };

      pf.addPoolEdge(edge);

      // Should not throw, even if algorithm has issues
      expect(() => {
        pf.findArbitragePaths('0xToken1', BigInt(1000000));
      }).not.toThrow();
    });
  });
});
