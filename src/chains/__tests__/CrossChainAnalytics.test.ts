/**
 * Tests for CrossChainAnalytics
 */

import { CrossChainAnalytics } from '../CrossChainAnalytics';
import { CrossChainPath } from '../../arbitrage/CrossChainPathFinder';
import { ExecutionResult } from '../MultiChainExecutor';

describe('CrossChainAnalytics', () => {
  let analytics: CrossChainAnalytics;

  beforeEach(() => {
    analytics = new CrossChainAnalytics(1000);
  });

  const createMockPath = (): CrossChainPath => ({
    hops: [
      {
        dexName: 'Uniswap',
        poolAddress: '0xPool1',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        amountIn: BigInt(10 ** 18),
        amountOut: BigInt(11 * 10 ** 17),
        fee: 0.003,
        gasEstimate: 150000,
        chainId: 1,
        isBridge: false,
      },
      {
        dexName: 'Wormhole',
        poolAddress: 'bridge',
        tokenIn: '0xToken2',
        tokenOut: '0xToken2',
        amountIn: BigInt(11 * 10 ** 17),
        amountOut: BigInt(109 * 10 ** 16),
        fee: 0.01,
        gasEstimate: 0,
        chainId: 1,
        isBridge: true,
        bridgeInfo: {
          bridge: 'Wormhole',
          toChain: 56,
          estimatedTime: 900,
        },
      },
    ],
    startToken: '0xToken1',
    endToken: '0xToken1',
    estimatedProfit: BigInt(5 * 10 ** 16),
    totalGasCost: BigInt(75 * 10 ** 14),
    netProfit: BigInt(425 * 10 ** 15),
    totalFees: 0.013,
    slippageImpact: 1.5,
    bridgeCount: 1,
    totalBridgeFees: BigInt(10 ** 16),
    estimatedTimeSeconds: 920,
    chains: [1, 56, 1],
  });

  const createSuccessResult = (path: CrossChainPath): ExecutionResult => ({
    success: true,
    path,
    actualProfit: BigInt(4 * 10 ** 16),
    gasSpent: BigInt(8 * 10 ** 14),
    executionTime: 950,
    hopsCompleted: 2,
    txHashes: ['0xTx1', '0xTx2'],
  });

  const createFailedResult = (path: CrossChainPath): ExecutionResult => ({
    success: false,
    path,
    executionTime: 100,
    hopsCompleted: 1,
    error: 'Bridge timeout',
    txHashes: ['0xTx1'],
  });

  describe('recordTrade', () => {
    it('should record a successful trade', () => {
      const path = createMockPath();
      const result = createSuccessResult(path);

      analytics.recordTrade(path, result);

      const summary = analytics.getSummary();
      expect(summary.totalTrades).toBe(1);
      expect(summary.successfulTrades).toBe(1);
    });

    it('should record a failed trade', () => {
      const path = createMockPath();
      const result = createFailedResult(path);

      analytics.recordTrade(path, result);

      const summary = analytics.getSummary();
      expect(summary.totalTrades).toBe(1);
      expect(summary.failedTrades).toBe(1);
    });

    it('should maintain max records limit', () => {
      const limitedAnalytics = new CrossChainAnalytics(5);
      const path = createMockPath();

      for (let i = 0; i < 10; i++) {
        limitedAnalytics.recordTrade(path, createSuccessResult(path));
      }

      const summary = limitedAnalytics.getSummary();
      expect(summary.totalTrades).toBe(5);
    });
  });

  describe('getSummary', () => {
    it('should return empty summary initially', () => {
      const summary = analytics.getSummary();

      expect(summary.totalTrades).toBe(0);
      expect(summary.successfulTrades).toBe(0);
      expect(summary.failedTrades).toBe(0);
      expect(summary.totalProfit).toBe(BigInt(0));
      expect(summary.netProfit).toBe(BigInt(0));
    });

    it('should calculate correct statistics', () => {
      const path1 = createMockPath();
      const path2 = createMockPath();

      analytics.recordTrade(path1, createSuccessResult(path1));
      analytics.recordTrade(path2, createFailedResult(path2));

      const summary = analytics.getSummary();

      expect(summary.totalTrades).toBe(2);
      expect(summary.successfulTrades).toBe(1);
      expect(summary.failedTrades).toBe(1);
      expect(summary.successRate).toBe(50);
    });

    it('should identify most profitable chain pair', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));

      const summary = analytics.getSummary();
      expect(summary.mostProfitableChainPair).toBeDefined();
    });
  });

  describe('getChainPairStats', () => {
    it('should return stats for recorded chain pair', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));

      const stats = analytics.getChainPairStats(1, 56);
      expect(stats).toBeDefined();
      expect(stats?.totalTrades).toBeGreaterThan(0);
    });

    it('should return null for unrecorded chain pair', () => {
      const stats = analytics.getChainPairStats(1, 137);
      expect(stats).toBeNull();
    });
  });

  describe('getBridgeStats', () => {
    it('should return stats for used bridge', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));

      const stats = analytics.getBridgeStats('Wormhole');
      expect(stats).toBeDefined();
      expect(stats?.totalUses).toBeGreaterThan(0);
    });

    it('should return null for unused bridge', () => {
      const stats = analytics.getBridgeStats('UnusedBridge');
      expect(stats).toBeNull();
    });

    it('should calculate success rate correctly', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));
      analytics.recordTrade(path, createSuccessResult(path));
      analytics.recordTrade(path, createFailedResult(path));

      const stats = analytics.getBridgeStats('Wormhole');
      expect(stats?.successRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('getRecentTrades', () => {
    it('should return recent trades', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));
      analytics.recordTrade(path, createSuccessResult(path));

      const recent = analytics.getRecentTrades(5);
      expect(recent.length).toBe(2);
    });

    it('should limit number of returned trades', () => {
      const path = createMockPath();
      for (let i = 0; i < 20; i++) {
        analytics.recordTrade(path, createSuccessResult(path));
      }

      const recent = analytics.getRecentTrades(5);
      expect(recent.length).toBe(5);
    });

    it('should return trades in reverse chronological order', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));
      analytics.recordTrade(path, createSuccessResult(path));

      const recent = analytics.getRecentTrades(2);
      expect(recent.length).toBe(2);
      // Most recent should be first
      expect(recent[0].timestamp).toBeGreaterThanOrEqual(recent[1].timestamp);
    });
  });

  describe('getProfitableTrades', () => {
    it('should return only profitable trades', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));
      analytics.recordTrade(path, createFailedResult(path));

      const profitable = analytics.getProfitableTrades();
      expect(profitable.length).toBe(1);
      expect(profitable[0].profit).toBeDefined();
    });
  });

  describe('getFailedTrades', () => {
    it('should return only failed trades', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));
      analytics.recordTrade(path, createFailedResult(path));

      const failed = analytics.getFailedTrades();
      expect(failed.length).toBe(1);
      expect(failed[0].result.success).toBe(false);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI for time period', () => {
      const path = createMockPath();
      const now = Date.now();

      analytics.recordTrade(path, createSuccessResult(path));

      const roi = analytics.calculateROI(now - 1000, now + 1000);
      expect(typeof roi).toBe('number');
    });

    it('should return 0 for period with no trades', () => {
      const now = Date.now();
      const roi = analytics.calculateROI(now - 10000, now - 5000);
      expect(roi).toBe(0);
    });
  });

  describe('exportData', () => {
    it('should export data as JSON string', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));

      const exported = analytics.exportData();
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      const path = createMockPath();
      analytics.recordTrade(path, createSuccessResult(path));

      analytics.clear();

      const summary = analytics.getSummary();
      expect(summary.totalTrades).toBe(0);
    });
  });
});
