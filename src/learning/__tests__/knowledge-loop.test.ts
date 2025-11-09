/**
 * Tests for Strategic Knowledge Loop
 * Validates the complete learning system integration
 */

import { KnowledgeLoop } from '../index';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DIR = '/tmp/knowledge-loop-test';

describe('Strategic Knowledge Loop', () => {
  let knowledgeLoop: KnowledgeLoop;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }

    await fs.mkdir(TEST_DIR, { recursive: true });
    knowledgeLoop = new KnowledgeLoop(TEST_DIR, false);
  });

  afterEach(async () => {
    await knowledgeLoop.stop();

    // Clean up
    try {
      await fs.rm(TEST_DIR, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create knowledge loop instance', () => {
      expect(knowledgeLoop).toBeDefined();
      expect(knowledgeLoop.isActive()).toBe(false);
    });

    it('should have all components initialized', () => {
      const components = knowledgeLoop.getComponents();
      expect(components.logger).toBeDefined();
      expect(components.calibrationEngine).toBeDefined();
      expect(components.memoryFormation).toBeDefined();
      expect(components.adaptiveStrategies).toBeDefined();
    });
  });

  describe('Operational Logging', () => {
    it('should log an operation', async () => {
      await knowledgeLoop.logOperation(
        'arbitrage_execution',
        { protocol: 'uniswap', amount: '1.0' },
        'Execute arbitrage opportunity',
        'success',
        { profit: 0.05, gasCost: 0.01 }
      );

      const stats = await knowledgeLoop.getStatistics();
      expect(stats.totalOperations).toBe(1);
    });

    it('should track success rate', async () => {
      await knowledgeLoop.logOperation(
        'test_op',
        {},
        'Test 1',
        'success'
      );
      await knowledgeLoop.logOperation(
        'test_op',
        {},
        'Test 2',
        'success'
      );
      await knowledgeLoop.logOperation(
        'test_op',
        {},
        'Test 3',
        'failure'
      );

      const stats = await knowledgeLoop.getStatistics();
      expect(stats.totalOperations).toBe(3);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });
  });

  describe('Calibration Parameters', () => {
    it('should register calibration parameter', () => {
      knowledgeLoop.registerCalibrationParam(
        'slippage_tolerance',
        0.005,
        0.001,
        0.05,
        0.001
      );

      const components = knowledgeLoop.getComponents();
      const value = components.calibrationEngine.getParam('slippage_tolerance');
      expect(value).toBe(0.005);
    });

    it('should get all calibration parameters', () => {
      knowledgeLoop.registerCalibrationParam('param1', 1.0, 0.5, 2.0, 0.1);
      knowledgeLoop.registerCalibrationParam('param2', 2.0, 1.0, 3.0, 0.2);

      const components = knowledgeLoop.getComponents();
      const params = components.calibrationEngine.getAllParams();
      expect(params.length).toBe(2);
    });
  });

  describe('Strategy Management', () => {
    it('should register a strategy', () => {
      knowledgeLoop.registerStrategy(
        'conservative',
        'Conservative Strategy',
        'Low-risk arbitrage strategy',
        { minProfit: 0.01, maxGas: 0.005 },
        { marketVolatility: 'low' }
      );

      const components = knowledgeLoop.getComponents();
      const strategies = components.adaptiveStrategies.getAllStrategies();
      expect(strategies.length).toBe(1);
      expect(strategies[0].id).toBe('conservative');
    });

    it('should select strategy based on conditions', async () => {
      knowledgeLoop.registerStrategy(
        'conservative',
        'Conservative Strategy',
        'Low-risk strategy',
        { minProfit: 0.01 },
        { marketVolatility: 'low' }
      );

      knowledgeLoop.registerStrategy(
        'aggressive',
        'Aggressive Strategy',
        'High-risk strategy',
        { minProfit: 0.05 },
        { marketVolatility: 'high' }
      );

      const selection = await knowledgeLoop.selectStrategy({
        marketVolatility: 'low',
      });

      expect(selection).toBeDefined();
      expect(selection?.strategy.id).toBe('conservative');
    });

    it('should update strategy performance', () => {
      knowledgeLoop.registerStrategy(
        'test_strategy',
        'Test Strategy',
        'Test',
        {},
        {}
      );

      const components = knowledgeLoop.getComponents();
      let strategy = components.adaptiveStrategies.getStrategy('test_strategy');
      const initialSuccessRate = strategy?.successRate || 0;

      knowledgeLoop.updateStrategyPerformance('test_strategy', true);

      strategy = components.adaptiveStrategies.getStrategy('test_strategy');
      expect(strategy?.successRate).toBeGreaterThan(initialSuccessRate);
      expect(strategy?.timesUsed).toBe(1);
    });
  });

  describe('Learning Cycle', () => {
    it('should run a learning cycle', async () => {
      // Add some operational logs first
      for (let i = 0; i < 6; i++) {
        await knowledgeLoop.logOperation(
          'test_op',
          { iteration: i },
          `Operation ${i}`,
          i < 4 ? 'success' : 'failure'
        );
      }

      const result = await knowledgeLoop.runLearningCycle();

      expect(result).toBeDefined();
      expect(result.memoriesFormed).toBeGreaterThanOrEqual(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should start and stop knowledge loop', (done) => {
      expect(knowledgeLoop.isActive()).toBe(false);

      knowledgeLoop.start(100); // 100ms interval for testing
      expect(knowledgeLoop.isActive()).toBe(true);

      setTimeout(async () => {
        await knowledgeLoop.stop();
        expect(knowledgeLoop.isActive()).toBe(false);
        done();
      }, 250);
    }, 10000);
  });

  describe('Statistics and Insights', () => {
    it('should get statistics', async () => {
      await knowledgeLoop.logOperation('op1', {}, 'Op 1', 'success');
      await knowledgeLoop.logOperation('op2', {}, 'Op 2', 'failure');

      const stats = await knowledgeLoop.getStatistics();

      expect(stats.totalOperations).toBe(2);
      expect(stats.successRate).toBe(0.5);
      expect(stats.totalMemories).toBeGreaterThanOrEqual(0);
      expect(stats.totalStrategies).toBe(0);
      expect(Array.isArray(stats.topStrategies)).toBe(true);
    });

    it('should get recent insights', async () => {
      const insights = await knowledgeLoop.getRecentInsights(5);
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should get calibration history', () => {
      const history = knowledgeLoop.getCalibrationHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Integration - Complete Workflow', () => {
    it('should execute complete learning workflow', async () => {
      // 1. Register calibration parameters
      knowledgeLoop.registerCalibrationParam(
        'gas_price_multiplier',
        1.2,
        1.0,
        2.0,
        0.1
      );

      // 2. Register strategies
      knowledgeLoop.registerStrategy(
        'flash_arb',
        'Flash Arbitrage',
        'Quick arbitrage with flash loans',
        { minProfit: 0.01, maxGas: 0.01 },
        { dexLiquidity: 'high' }
      );

      // 3. Log several operations
      for (let i = 0; i < 10; i++) {
        await knowledgeLoop.logOperation(
          'arbitrage',
          { dexLiquidity: 'high', iteration: i },
          `Arbitrage ${i}`,
          i < 7 ? 'success' : 'failure',
          {
            profit: 0.01 + Math.random() * 0.05,
            gasCost: 0.005 + Math.random() * 0.005,
          }
        );
      }

      // 4. Run learning cycle
      const cycleResult = await knowledgeLoop.runLearningCycle();
      expect(cycleResult.insights.length).toBeGreaterThan(0);

      // 5. Select strategy
      const selection = await knowledgeLoop.selectStrategy({
        dexLiquidity: 'high',
      });
      expect(selection).toBeDefined();

      // 6. Update strategy performance
      knowledgeLoop.updateStrategyPerformance('flash_arb', true);

      // 7. Get statistics
      const stats = await knowledgeLoop.getStatistics();
      expect(stats.totalOperations).toBe(10);
      expect(stats.topStrategies.length).toBeGreaterThan(0);
    }, 15000);
  });
});
