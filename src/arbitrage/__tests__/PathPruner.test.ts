import { PathPruner } from '../PathPruner';
import { PoolEdge, ArbitragePath } from '../types';

describe('PathPruner', () => {
  let pruner: PathPruner;

  beforeEach(() => {
    pruner = new PathPruner({
      aggressiveness: 'medium',
      minPoolLiquidity: BigInt(100000),
      maxPriceImpactPerHop: 2.0,
      maxCumulativeSlippage: 5.0,
      minPoolQualityScore: 0.3,
    });
  });

  describe('shouldPruneEdge', () => {
    it('should prune edge with insufficient liquidity', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(10000), // Very low liquidity
        reserve1: BigInt(10000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      const shouldPrune = pruner.shouldPruneEdge(edge, BigInt(1000));
      expect(shouldPrune).toBe(true);
    });

    it('should not prune edge with sufficient liquidity', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000), // Good liquidity
        reserve1: BigInt(1000000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      const shouldPrune = pruner.shouldPruneEdge(edge, BigInt(1000));
      expect(shouldPrune).toBe(false);
    });

    it('should prune edge with excessive price impact', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(100000),
        reserve1: BigInt(100000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      // Large trade relative to pool size (will cause high price impact)
      const shouldPrune = pruner.shouldPruneEdge(edge, BigInt(10000)); // 10% of pool
      expect(shouldPrune).toBe(true);
    });

    it('should track pruning statistics', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(10000),
        reserve1: BigInt(10000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      pruner.resetStats();
      pruner.shouldPruneEdge(edge, BigInt(1000));

      const stats = pruner.getStats();
      expect(stats.totalEvaluated).toBe(1);
      expect(stats.totalPruned).toBeGreaterThan(0);
    });
  });

  describe('shouldPrunePath', () => {
    it('should prune path with excessive accumulated fees', () => {
      const hops: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt(1000000),
          reserve1: BigInt(1000000),
          fee: 0.1, // Very high fee
          gasEstimate: 150000,
        },
        {
          poolAddress: '0x456',
          dexName: 'SushiSwap',
          tokenIn: '0xToken2',
          tokenOut: '0xToken3',
          reserve0: BigInt(1000000),
          reserve1: BigInt(1000000),
          fee: 0.1, // Very high fee
          gasEstimate: 150000,
        },
      ];

      const startAmount = BigInt(1000000);
      const currentAmount = BigInt(800000); // 20% loss

      const shouldPrune = pruner.shouldPrunePath(hops, currentAmount, startAmount);
      expect(shouldPrune).toBe(true);
    });

    it('should not prune profitable partial path', () => {
      const hops: PoolEdge[] = [
        {
          poolAddress: '0x123',
          dexName: 'Uniswap V3',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          reserve0: BigInt('100000000000000'), // Very large reserves
          reserve1: BigInt('100000000000000'),
          fee: 0.003, // Low fee
          gasEstimate: 150000,
        },
      ];

      const startAmount = BigInt(1000000);
      const currentAmount = BigInt(997000); // Very small loss (0.3%)

      const shouldPrune = pruner.shouldPrunePath(hops, currentAmount, startAmount);
      expect(shouldPrune).toBe(false);
    });
  });

  describe('scorePoolQuality', () => {
    it('should score high liquidity pools highly', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(5000000),
        reserve1: BigInt(5000000), // High liquidity
        fee: 0.003,
        gasEstimate: 150000,
      };

      const quality = pruner.scorePoolQuality(edge);
      expect(quality.overallScore).toBeGreaterThan(0.5);
      expect(quality.liquidityScore).toBeGreaterThan(0);
    });

    it('should score low fee pools highly', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Curve',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(1000000),
        fee: 0.0004, // Very low fee (Curve)
        gasEstimate: 180000,
      };

      const quality = pruner.scorePoolQuality(edge);
      expect(quality.volumeScore).toBeGreaterThan(0.9);
    });

    it('should cache pool quality scores', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(1000000),
        reserve1: BigInt(1000000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      const quality1 = pruner.scorePoolQuality(edge);
      const quality2 = pruner.scorePoolQuality(edge);

      expect(quality1).toEqual(quality2);
    });
  });

  describe('historical tracking', () => {
    it('should record path failures', () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x123',
            tokenIn: '0xToken1',
            tokenOut: '0xToken2',
            amountIn: BigInt(1000000),
            amountOut: BigInt(990000),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt(1000),
        totalGasCost: BigInt(500),
        netProfit: BigInt(500),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      pruner.recordPathFailure(path);
      pruner.recordPathFailure(path);
      pruner.recordPathFailure(path);

      const shouldFilter = pruner.shouldFilterPath(path);
      expect(shouldFilter).toBe(true);
    });

    it('should record path success', () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x123',
            tokenIn: '0xToken1',
            tokenOut: '0xToken2',
            amountIn: BigInt(1000000),
            amountOut: BigInt(990000),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt(1000),
        totalGasCost: BigInt(500),
        netProfit: BigInt(500),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      pruner.recordPathFailure(path);
      pruner.recordPathSuccess(path);

      const shouldFilter = pruner.shouldFilterPath(path);
      expect(shouldFilter).toBe(false);
    });
  });

  describe('aggressiveness levels', () => {
    it('should apply stricter rules with high aggressiveness', () => {
      const aggressive = new PathPruner({
        aggressiveness: 'high',
        minPoolLiquidity: BigInt(100000),
        maxPriceImpactPerHop: 1.0, // Stricter
        maxCumulativeSlippage: 2.0,
        minPoolQualityScore: 0.5,
      });

      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(100000),
        reserve1: BigInt(100000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      // Edge that passes medium but fails high aggressiveness
      const shouldPruneHigh = aggressive.shouldPruneEdge(edge, BigInt(2000));

      const medium = new PathPruner({
        aggressiveness: 'medium',
        minPoolLiquidity: BigInt(100000),
        maxPriceImpactPerHop: 2.0,
        maxCumulativeSlippage: 5.0,
        minPoolQualityScore: 0.3,
      });

      const shouldPruneMedium = medium.shouldPruneEdge(edge, BigInt(2000));

      // High aggressiveness should be more likely to prune
      expect(shouldPruneHigh || !shouldPruneMedium).toBeTruthy();
    });
  });

  describe('getStats and resetStats', () => {
    it('should provide pruning statistics', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(10000),
        reserve1: BigInt(10000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      pruner.resetStats();
      pruner.shouldPruneEdge(edge, BigInt(1000));

      const stats = pruner.getStats();
      expect(stats).toHaveProperty('totalEvaluated');
      expect(stats).toHaveProperty('totalPruned');
      expect(stats).toHaveProperty('prunedByLiquidity');
      expect(stats).toHaveProperty('prunedByPriceImpact');
      expect(stats).toHaveProperty('prunedByFees');
    });

    it('should reset statistics', () => {
      const edge: PoolEdge = {
        poolAddress: '0x123',
        dexName: 'Uniswap V3',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        reserve0: BigInt(10000),
        reserve1: BigInt(10000),
        fee: 0.003,
        gasEstimate: 150000,
      };

      pruner.shouldPruneEdge(edge, BigInt(1000));
      pruner.resetStats();

      const stats = pruner.getStats();
      expect(stats.totalEvaluated).toBe(0);
      expect(stats.totalPruned).toBe(0);
    });
  });
});
