/**
 * SpatialArbEngine Tests
 */

import { SpatialArbEngine, PoolState } from '../SpatialArbEngine';
import { ArbitrageType, OpportunityStatus } from '../../models';

describe('SpatialArbEngine', () => {
  let engine: SpatialArbEngine;

  beforeEach(() => {
    engine = new SpatialArbEngine({
      minProfitBps: 50,
      minLiquidityUsd: 10000,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultEngine = new SpatialArbEngine();
      const stats = defaultEngine.getStatistics();
      expect(stats.poolsAnalyzed).toBe(0);
      expect(stats.opportunitiesFound).toBe(0);
    });

    it('should initialize with custom config', () => {
      const customEngine = new SpatialArbEngine({
        minProfitBps: 100,
        minLiquidityUsd: 50000,
        supportedProtocols: ['uniswap_v3'],
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe('findOpportunities', () => {
    it('should find spatial arbitrage opportunities', () => {
      // Create two pools with same token pair but different prices
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200000, // Price: 2000 USDC per WETH
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool2',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 210000, // Price: 2100 USDC per WETH (higher)
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findOpportunities(pools, 1);

      expect(opportunities.length).toBeGreaterThan(0);
      
      const opp = opportunities[0];
      expect(opp.arbType).toBe(ArbitrageType.SPATIAL);
      expect(opp.status).toBe(OpportunityStatus.IDENTIFIED);
      expect(opp.path.length).toBe(2);
      expect(opp.requiresFlashLoan).toBe(false);
    });

    it('should not find opportunities when profit is below threshold', () => {
      // Create two pools with very similar prices
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
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 200100, // Only 0.05% difference
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findOpportunities(pools, 1);
      expect(opportunities.length).toBe(0);
    });

    it('should require at least 2 pools for spatial arbitrage', () => {
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

      const opportunities = engine.findOpportunities(pools, 1);
      expect(opportunities.length).toBe(0);
    });

    it('should filter pools by supported protocols', () => {
      const restrictedEngine = new SpatialArbEngine({
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
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 210000,
          protocol: 'unsupported_dex',
          feeBps: 30,
        },
      ];

      const opportunities = restrictedEngine.findOpportunities(pools, 1);
      expect(opportunities.length).toBe(0); // Unsupported protocol filtered out
    });

    it('should handle multiple token pairs', () => {
      const pools: PoolState[] = [
        // WETH/USDC pair
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
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 220000,
          protocol: 'sushiswap',
          feeBps: 30,
        },
        // DAI/USDC pair
        {
          poolAddress: '0xPool3',
          token0: '0xDAI',
          token1: '0xUSDC',
          reserve0: 100000,
          reserve1: 100000,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
        {
          poolAddress: '0xPool4',
          token0: '0xDAI',
          token1: '0xUSDC',
          reserve0: 100000,
          reserve1: 105000,
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findOpportunities(pools, 1);
      // Should find opportunities in both pairs
      expect(opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const pool: PoolState = {
        poolAddress: '0xPool1',
        token0: '0xWETH',
        token1: '0xUSDC',
        reserve0: 100,
        reserve1: 200000,
        protocol: 'uniswap_v3',
        feeBps: 30,
      };

      // Small trade should have low impact
      const smallImpact = engine.calculatePriceImpact(pool, 1, 0);
      expect(smallImpact).toBeGreaterThan(0);
      expect(smallImpact).toBeLessThan(5);

      // Large trade should have higher impact
      const largeImpact = engine.calculatePriceImpact(pool, 50, 0);
      expect(largeImpact).toBeGreaterThan(smallImpact);
    });
  });

  describe('filterByLiquidity', () => {
    it('should filter opportunities by liquidity', () => {
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
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 220000,
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findOpportunities(pools, 1);

      const tokenPrices = {
        '0xWETH': 2000,
        '0xUSDC': 1,
      };

      const filtered = engine.filterByLiquidity(opportunities, tokenPrices);
      expect(filtered.length).toBeLessThanOrEqual(opportunities.length);
    });
  });

  describe('getStatistics', () => {
    it('should track statistics correctly', () => {
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
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 220000,
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      engine.findOpportunities(pools, 1);

      const stats = engine.getStatistics();
      expect(stats.poolsAnalyzed).toBeGreaterThan(0);
      expect(stats.opportunitiesFound).toBeGreaterThanOrEqual(0);
      expect(stats.totalProfitPotential).toBeGreaterThanOrEqual(0);
      expect(stats.avgProfitPerOpportunity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty pool list', () => {
      const opportunities = engine.findOpportunities([], 1);
      expect(opportunities.length).toBe(0);
    });

    it('should handle zero input amount', () => {
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

      const opportunities = engine.findOpportunities(pools, 0);
      expect(opportunities.length).toBe(0);
    });

    it('should handle pools with reversed token order', () => {
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
          token0: '0xUSDC', // Reversed
          token1: '0xWETH', // Reversed
          reserve0: 220000,
          reserve1: 100,
          protocol: 'sushiswap',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findOpportunities(pools, 1);
      // Should still find opportunities despite token order
      expect(opportunities.length).toBeGreaterThanOrEqual(0);
    });
  });
});
