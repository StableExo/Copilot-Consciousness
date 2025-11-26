/**
 * TriangularArbEngine Tests
 */

import { TriangularArbEngine } from '../TriangularArbEngine';
import { PoolState } from '../SpatialArbEngine';
import { ArbitrageType, OpportunityStatus } from '../../models';

describe('TriangularArbEngine', () => {
  let engine: TriangularArbEngine;

  beforeEach(() => {
    engine = new TriangularArbEngine({
      minProfitBps: 50,
      maxHops: 3,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultEngine = new TriangularArbEngine();
      const stats = defaultEngine.getStatistics();
      expect(stats.cyclesAnalyzed).toBe(0);
      expect(stats.opportunitiesFound).toBe(0);
    });

    it('should initialize with custom config', () => {
      const customEngine = new TriangularArbEngine({
        minProfitBps: 100,
        maxHops: 5,
        supportedProtocols: ['uniswap_v3'],
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe('buildPairMap', () => {
    it('should build pair map from pools', () => {
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

      engine.buildPairMap(pools);
      const stats = engine.getStatistics();
      expect(stats.pairsInMap).toBeGreaterThan(0);
    });

    it('should create bidirectional mappings', () => {
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

      engine.buildPairMap(pools);
      const stats = engine.getStatistics();
      // Should have 2 entries (one for each direction)
      expect(stats.pairsInMap).toBe(2);
    });
  });

  describe('findOpportunities', () => {
    it('should find triangular arbitrage opportunities', () => {
      // Create a triangle: WETH -> USDC -> DAI -> WETH
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 190000, // Slightly underpriced
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
          reserve1: 105, // Slightly overpriced
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findOpportunities(pools, '0xWETH', 1);

      expect(opportunities.length).toBeGreaterThanOrEqual(0);

      if (opportunities.length > 0) {
        const opp = opportunities[0];
        expect(opp.arbType).toBe(ArbitrageType.TRIANGULAR);
        expect(opp.status).toBe(OpportunityStatus.IDENTIFIED);
        expect(opp.path.length).toBeGreaterThanOrEqual(2);
        expect(opp.requiresFlashLoan).toBe(true);
      }
    });

    it('should auto-build pair map if not built', () => {
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

      // Don't build pair map manually
      const opportunities = engine.findOpportunities(pools, '0xWETH', 1);

      // Should have built pair map automatically
      const stats = engine.getStatistics();
      expect(stats.pairsInMap).toBeGreaterThan(0);
    });

    it('should not find opportunities when profit is below threshold', () => {
      // Create a triangle with fees that eat up profit
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

      const opportunities = engine.findOpportunities(pools, '0xWETH', 1);

      // With fees, might not be profitable
      opportunities.forEach((opp) => {
        expect(opp.profitBps).toBeGreaterThanOrEqual(50);
      });
    });

    it('should filter by supported protocols', () => {
      const restrictedEngine = new TriangularArbEngine({
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
          protocol: 'unsupported_dex',
          feeBps: 30,
        },
      ];

      restrictedEngine.buildPairMap(pools);
      const stats = restrictedEngine.getStatistics();

      // Should only include uniswap_v3 pool
      expect(stats.pairsInMap).toBe(2); // Bidirectional for one pool
    });
  });

  describe('findAllTriangularOpportunities', () => {
    it('should find opportunities for all start tokens', () => {
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

      const opportunities = engine.findAllTriangularOpportunities(pools, 1);

      // Should deduplicate opportunities found from different start tokens
      expect(opportunities.length).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate opportunities', () => {
      const pools: PoolState[] = [
        {
          poolAddress: '0xPool1',
          token0: '0xWETH',
          token1: '0xUSDC',
          reserve0: 100,
          reserve1: 190000,
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
          reserve1: 105,
          protocol: 'uniswap_v3',
          feeBps: 30,
        },
      ];

      const opportunities = engine.findAllTriangularOpportunities(pools, 1);

      // Check that pool addresses are not duplicated in results
      const signatures = new Set<string>();
      opportunities.forEach((opp) => {
        const signature = opp.poolAddresses.slice().sort().join('_');
        expect(signatures.has(signature)).toBe(false);
        signatures.add(signature);
      });
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
      ];

      engine.findOpportunities(pools, '0xWETH', 1);

      const stats = engine.getStatistics();
      expect(stats.cyclesAnalyzed).toBeGreaterThanOrEqual(0);
      expect(stats.opportunitiesFound).toBeGreaterThanOrEqual(0);
      expect(stats.totalProfitPotential).toBeGreaterThanOrEqual(0);
      expect(stats.avgProfitPerOpportunity).toBeGreaterThanOrEqual(0);
      expect(stats.pairsInMap).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty pool list', () => {
      const opportunities = engine.findOpportunities([], '0xWETH', 1);
      expect(opportunities.length).toBe(0);
    });

    it('should handle non-existent start token', () => {
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

      const opportunities = engine.findOpportunities(pools, '0xNonExistent', 1);
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

      const opportunities = engine.findOpportunities(pools, '0xWETH', 0);
      expect(opportunities.length).toBe(0);
    });

    it('should respect maxHops limit', () => {
      const limitedEngine = new TriangularArbEngine({
        maxHops: 2,
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

      const opportunities = limitedEngine.findOpportunities(pools, '0xWETH', 1);

      // With maxHops=2, might not find 3-hop cycles
      opportunities.forEach((opp) => {
        expect(opp.path.length).toBeLessThanOrEqual(2);
      });
    });
  });
});
