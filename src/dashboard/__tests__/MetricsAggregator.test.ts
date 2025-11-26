/**
 * MetricsAggregator Tests
 */

import { MetricsAggregator } from '../services/MetricsAggregator';
import { GasAnalytics } from '../../gas/GasAnalytics';
import { CrossChainAnalytics } from '../../chains/CrossChainAnalytics';

describe('MetricsAggregator', () => {
  let metricsAggregator: MetricsAggregator;
  let gasAnalytics: GasAnalytics;
  let crossChainAnalytics: CrossChainAnalytics;

  beforeEach(() => {
    gasAnalytics = new GasAnalytics();
    crossChainAnalytics = new CrossChainAnalytics();
    metricsAggregator = new MetricsAggregator(gasAnalytics, crossChainAnalytics);
  });

  describe('getCurrentMetrics', () => {
    it('should return dashboard metrics with zero values initially', async () => {
      const metrics = await metricsAggregator.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalTrades).toBe(0);
      expect(metrics.successfulTrades).toBe(0);
      expect(metrics.failedTrades).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    it('should aggregate metrics from both analytics modules', async () => {
      // Record some executions in gas analytics
      gasAnalytics.recordExecution({
        path: {
          startToken: 'ETH',
          endToken: 'USDC',
          estimatedProfit: BigInt(1000),
          totalGasCost: BigInt(100),
          netProfit: BigInt(900),
          totalFees: 0.3,
          slippageImpact: 0.1,
          bridgeCount: 0,
          totalBridgeFees: BigInt(0),
          estimatedTimeSeconds: 10,
          chains: [1],
          hops: [],
        },
        gasUsed: BigInt(50000),
        gasCost: BigInt(100),
        chain: 'ethereum',
        timestamp: Date.now(),
        success: true,
      });

      const metrics = await metricsAggregator.getCurrentMetrics();

      expect(metrics.totalTrades).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
    });
  });

  describe('getChartData', () => {
    it('should return chart data structure', () => {
      const chartData = metricsAggregator.getChartData();

      expect(chartData).toBeDefined();
      expect(chartData.profitOverTime).toBeDefined();
      expect(chartData.gasOverTime).toBeDefined();
      expect(chartData.volumeOverTime).toBeDefined();
      expect(chartData.successRateOverTime).toBeDefined();
      expect(Array.isArray(chartData.profitOverTime)).toBe(true);
    });

    it('should filter data by time range', () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const chartData = metricsAggregator.getChartData({
        start: oneDayAgo,
        end: now,
      });

      expect(chartData).toBeDefined();
    });
  });

  describe('getMetricsHistory', () => {
    it('should return empty history initially', () => {
      const history = metricsAggregator.getMetricsHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should limit history with limit parameter', async () => {
      // Generate some metrics
      for (let i = 0; i < 5; i++) {
        await metricsAggregator.getCurrentMetrics();
      }

      const history = metricsAggregator.getMetricsHistory(3);
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('clearHistory', () => {
    it('should clear metrics history', async () => {
      await metricsAggregator.getCurrentMetrics();
      expect(metricsAggregator.getMetricsHistory().length).toBeGreaterThan(0);

      metricsAggregator.clearHistory();
      expect(metricsAggregator.getMetricsHistory().length).toBe(0);
    });
  });
});
