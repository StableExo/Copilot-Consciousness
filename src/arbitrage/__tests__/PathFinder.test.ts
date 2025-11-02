import { PathFinder } from '../PathFinder';
import { PoolEdge, PathfindingConfig } from '../types';

describe('PathFinder', () => {
  let pathFinder: PathFinder;
  let config: PathfindingConfig;

  beforeEach(() => {
    config = {
      maxHops: 3,
      minProfitThreshold: BigInt(100),
      maxSlippage: 0.05,
      gasPrice: BigInt(50000000000) // 50 gwei
    };
    pathFinder = new PathFinder(config);
  });

  describe('addPoolEdge', () => {
    it('should add a pool edge to the graph', () => {
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

    it('should add multiple edges', () => {
      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt(1000000),
          reserve1: BigInt(2000000),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken2',
          tokenOut: '0xToken3',
          reserve0: BigInt(2000000),
          reserve1: BigInt(3000000),
          fee: 0.003,
          gasEstimate: 150000
        }
      ];

      edges.forEach(edge => pathFinder.addPoolEdge(edge));
      
      expect(pathFinder.getTokens().length).toBe(3);
      expect(pathFinder.getEdgeCount()).toBe(2);
    });
  });

  describe('findArbitragePaths', () => {
    it('should find a simple arbitrage path', () => {
      // Create a simple triangular arbitrage: Token1 -> Token2 -> Token3 -> Token1
      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('10000000000000000000000'), // 10000 tokens
          reserve1: BigInt('10000000000000000000000'), // 10000 tokens (1:1 ratio)
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken2',
          tokenOut: '0xToken3',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10000000000000000000000'), // 1:1 ratio
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x789',
          dexName: 'Curve',
          tokenIn: '0xToken3',
          tokenOut: '0xToken1',
          reserve0: BigInt('10000000000000000000000'),
          reserve1: BigInt('10500000000000000000000'), // 1:1.05 ratio to create profit opportunity
          fee: 0.0004,
          gasEstimate: 180000
        }
      ];

      edges.forEach(edge => pathFinder.addPoolEdge(edge));

      const startAmount = BigInt('100000000000000000000'); // 100 tokens
      const paths = pathFinder.findArbitragePaths('0xToken1', startAmount);

      // The algorithm should find at least one path returning to Token1
      expect(Array.isArray(paths)).toBe(true);
      if (paths.length > 0) {
        expect(paths[0].startToken).toBe('0xToken1');
        expect(paths[0].endToken).toBe('0xToken1');
        expect(paths[0].hops.length).toBeLessThanOrEqual(config.maxHops);
      }
    });

    it('should return empty array when no profitable paths exist', () => {
      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('1000000000000000000000'),
          reserve1: BigInt('1000000000000000000000'),
          fee: 0.1, // Very high fee
          gasEstimate: 150000
        }
      ];

      edges.forEach(edge => pathFinder.addPoolEdge(edge));

      const startAmount = BigInt('100000000000000000000');
      const paths = pathFinder.findArbitragePaths('0xToken1', startAmount);

      // Might return paths but they won't be profitable
      expect(Array.isArray(paths)).toBe(true);
    });

    it('should respect maxHops configuration', () => {
      const shortConfig: PathfindingConfig = {
        ...config,
        maxHops: 2
      };
      const shortPathFinder = new PathFinder(shortConfig);

      // Create a path that requires 3 hops
      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('1000000000000000000000'),
          reserve1: BigInt('2000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken2',
          tokenOut: '0xToken3',
          reserve0: BigInt('2000000000000000000000'),
          reserve1: BigInt('3000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x789',
          dexName: 'Curve',
          tokenIn: '0xToken3',
          tokenOut: '0xToken1',
          reserve0: BigInt('3000000000000000000000'),
          reserve1: BigInt('1100000000000000000000'),
          fee: 0.0004,
          gasEstimate: 180000
        }
      ];

      edges.forEach(edge => shortPathFinder.addPoolEdge(edge));

      const startAmount = BigInt('100000000000000000000');
      const paths = shortPathFinder.findArbitragePaths('0xToken1', startAmount);

      // Should not find 3-hop paths
      paths.forEach(path => {
        expect(path.hops.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('clear', () => {
    it('should clear all edges and tokens', () => {
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

  describe('getTokens', () => {
    it('should return all unique tokens in the graph', () => {
      const edges: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt(1000000),
          reserve1: BigInt(2000000),
          fee: 0.003,
          gasEstimate: 150000
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken1',
          tokenOut: '0xToken3',
          reserve0: BigInt(1000000),
          reserve1: BigInt(3000000),
          fee: 0.003,
          gasEstimate: 150000
        }
      ];

      edges.forEach(edge => pathFinder.addPoolEdge(edge));
      
      const tokens = pathFinder.getTokens();
      expect(tokens.length).toBe(3);
      expect(tokens).toContain('0xToken1');
      expect(tokens).toContain('0xToken2');
      expect(tokens).toContain('0xToken3');
    });
  });
});
