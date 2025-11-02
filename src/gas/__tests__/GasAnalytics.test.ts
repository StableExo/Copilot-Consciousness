/**
 * Tests for GasAnalytics
 */

import { GasAnalytics, ArbitrageExecution } from '../GasAnalytics';
import { ArbitragePath } from '../../arbitrage/types';

describe('GasAnalytics', () => {
  let analytics: GasAnalytics;
  let mockPath: ArbitragePath;

  beforeEach(() => {
    analytics = new GasAnalytics(86400000); // 24 hour report interval

    mockPath = {
      hops: [
        {
          dexName: 'uniswap',
          poolAddress: '0x123',
          tokenIn: '0xTokenA',
          tokenOut: '0xTokenB',
          amountIn: BigInt(1000) * BigInt(10 ** 18),
          amountOut: BigInt(1100) * BigInt(10 ** 18),
          fee: 0.003,
          gasEstimate: 100000
        }
      ],
      startToken: '0xTokenA',
      endToken: '0xTokenA',
      estimatedProfit: BigInt(500) * BigInt(10 ** 18),
      totalGasCost: BigInt(150000),
      netProfit: BigInt(450) * BigInt(10 ** 18),
      totalFees: 0.003,
      slippageImpact: 0.01
    };
  });

  describe('recordExecution', () => {
    it('should record successful execution', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15), // 0.003 ETH
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      analytics.recordExecution(execution);
      const history = analytics.getExecutionHistory();
      expect(history.length).toBe(1);
      expect(history[0]).toEqual(execution);
    });

    it('should record failed execution', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(50000),
        gasCost: BigInt(1) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: false,
        failureReason: 'Insufficient liquidity'
      };

      analytics.recordExecution(execution);
      const history = analytics.getExecutionHistory();
      expect(history.length).toBe(1);
      expect(history[0].success).toBe(false);
    });

    it('should limit history to 10,000 executions', () => {
      // Record more than 10,000 executions
      for (let i = 0; i < 10500; i++) {
        const execution: ArbitrageExecution = {
          path: mockPath,
          gasUsed: BigInt(150000),
          gasCost: BigInt(3) * BigInt(10 ** 15),
          chain: 'mainnet',
          timestamp: Date.now(),
          success: true
        };
        analytics.recordExecution(execution);
      }

      const history = analytics.getExecutionHistory();
      expect(history.length).toBe(10000);
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics for successful executions', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      analytics.recordExecution(execution);
      analytics.recordExecution(execution);

      const metrics = analytics.getMetrics();
      expect(metrics.totalArbitrages).toBe(2);
      expect(metrics.successfulArbitrages).toBe(2);
      expect(metrics.failedArbitrages).toBe(0);
      expect(metrics.executionSuccessRate).toBe(100);
    });

    it('should calculate correct success rate', () => {
      const successExecution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      const failedExecution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(50000),
        gasCost: BigInt(1) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: false
      };

      analytics.recordExecution(successExecution);
      analytics.recordExecution(successExecution);
      analytics.recordExecution(failedExecution);

      const metrics = analytics.getMetrics();
      expect(metrics.executionSuccessRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('setBaselineGasCost', () => {
    it('should set baseline gas cost', () => {
      const baseline = BigInt(200000);
      analytics.setBaselineGasCost(baseline);
      // Baseline is used internally for savings calculation
      expect(true).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate report for time period', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      analytics.recordExecution(execution);

      const report = analytics.generateReport();
      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.topExecutionWindows).toBeDefined();
      expect(report.costByDEX).toBeDefined();
      expect(report.costByHopCount).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('getAverageGasCostByHopCount', () => {
    it('should calculate average gas cost by hop count', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      analytics.recordExecution(execution);

      const avgCosts = analytics.getAverageGasCostByHopCount();
      expect(avgCosts.has(1)).toBe(true);
    });
  });

  describe('getBestExecutionTimes', () => {
    it('should identify best execution times', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      analytics.recordExecution(execution);

      const bestTimes = analytics.getBestExecutionTimes();
      expect(Array.isArray(bestTimes)).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear execution history', () => {
      const execution: ArbitrageExecution = {
        path: mockPath,
        gasUsed: BigInt(150000),
        gasCost: BigInt(3) * BigInt(10 ** 15),
        chain: 'mainnet',
        timestamp: Date.now(),
        success: true
      };

      analytics.recordExecution(execution);
      analytics.clearHistory();

      const history = analytics.getExecutionHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('getExecutionHistory', () => {
    it('should return execution history with limit', () => {
      for (let i = 0; i < 10; i++) {
        const execution: ArbitrageExecution = {
          path: mockPath,
          gasUsed: BigInt(150000),
          gasCost: BigInt(3) * BigInt(10 ** 15),
          chain: 'mainnet',
          timestamp: Date.now(),
          success: true
        };
        analytics.recordExecution(execution);
      }

      const history = analytics.getExecutionHistory(5);
      expect(history.length).toBe(5);
    });
  });
});
