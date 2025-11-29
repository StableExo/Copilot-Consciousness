/**
 * Tests for ConsciousnessArbitrageLoop
 *
 * Tests the unified consciousness loop that connects trading and security
 */

import { ConsciousnessArbitrageLoop, createConsciousnessLoop } from '../ConsciousnessArbitrageLoop';
import { ArbitrageExecution } from '../ArbitrageConsciousness';

describe('ConsciousnessArbitrageLoop', () => {
  let loop: ConsciousnessArbitrageLoop;

  beforeEach(() => {
    loop = new ConsciousnessArbitrageLoop({
      heartbeatInterval: 100000, // Long interval to avoid automatic heartbeats in tests
      autoRestore: false,
      autoSaveInterval: 0,
      threatFeedEnabled: false, // Disable for unit tests
      logLevel: 'error',
      basePath: '/tmp/test-consciousness',
    });
  });

  afterEach(async () => {
    await loop.stop();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultLoop = createConsciousnessLoop();
      expect(defaultLoop).toBeDefined();
      expect(defaultLoop.getState()).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customLoop = new ConsciousnessArbitrageLoop({
        heartbeatInterval: 60000,
        logLevel: 'debug',
      });
      expect(customLoop).toBeDefined();
    });

    it('should have initial state', () => {
      const state = loop.getState();
      expect(state.sessionId).toContain('session_');
      expect(state.tradingStats.totalExecutions).toBe(0);
      expect(state.threatPatterns).toBe(0);
    });
  });

  describe('start and stop', () => {
    it('should start the consciousness loop', async () => {
      const startedHandler = jest.fn();
      loop.on('started', startedHandler);

      await loop.start();

      expect(startedHandler).toHaveBeenCalled();
    });

    it('should stop the consciousness loop', async () => {
      const stoppedHandler = jest.fn();
      loop.on('stopped', stoppedHandler);

      await loop.start();
      await loop.stop();

      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should not start twice', async () => {
      await loop.start();
      await loop.start(); // Should not throw

      // Should still be running normally
      expect(loop.getState().sessionId).toBeDefined();
    });
  });

  describe('execution processing', () => {
    it('should process arbitrage execution', async () => {
      const executionHandler = jest.fn();
      loop.on('executionProcessed', executionHandler);

      await loop.start();

      const execution: ArbitrageExecution = {
        timestamp: Date.now(),
        cycleNumber: 1,
        opportunity: {
          profit: 0.1,
          pools: ['0xpool1', '0xpool2'],
          txType: 'arbitrage',
        },
        execution: {
          success: true,
          txHash: '0x123',
          actualProfit: 0.08,
          mevRisk: 0.2,
        },
        market: {
          congestion: 0.3,
          searcherDensity: 0.4,
        },
      };

      await loop.processExecution(execution);

      expect(executionHandler).toHaveBeenCalledWith(execution);
      expect(loop.getMetrics().tradesProcessed).toBe(1);
    });

    it('should update trading stats after execution', async () => {
      await loop.start();

      const execution: ArbitrageExecution = {
        timestamp: Date.now(),
        cycleNumber: 1,
        opportunity: {
          profit: 0.1,
          pools: ['0xpool1'],
          txType: 'arbitrage',
        },
        execution: {
          success: true,
          actualProfit: 0.08,
          mevRisk: 0.2,
        },
        market: {
          congestion: 0.3,
          searcherDensity: 0.4,
        },
      };

      await loop.processExecution(execution);

      const state = loop.getState();
      expect(state.tradingStats.totalExecutions).toBe(1);
    });
  });

  describe('threat processing', () => {
    it('should process threat intelligence', async () => {
      await loop.start();

      const intel = {
        entryId: 'threat-1',
        timestamp: Date.now(),
        threatType: 'flash_loan_attack' as const,
        severity: 'critical' as const,
        iocs: {
          addresses: ['0xattacker'],
        },
        suggestedMitigations: ['Add reentrancy guards'],
        source: 'test',
        confidence: 0.9,
      };

      await loop.processThreatIntelligence(intel);

      expect(loop.getMetrics().threatsProcessed).toBe(1);
    });

    it('should emit threat impact for trading-related threats', async () => {
      const impactHandler = jest.fn();
      loop.on('threatImpact', impactHandler);

      await loop.start();

      const intel = {
        entryId: 'threat-2',
        timestamp: Date.now(),
        threatType: 'sandwich_attack' as const,
        severity: 'high' as const,
        iocs: {},
        suggestedMitigations: [],
        source: 'test',
        confidence: 0.85,
      };

      await loop.processThreatIntelligence(intel);

      expect(impactHandler).toHaveBeenCalled();
    });
  });

  describe('strategy adaptation', () => {
    it('should adapt strategy based on threat type', async () => {
      const adaptedHandler = jest.fn();
      loop.on('strategyAdapted', adaptedHandler);

      await loop.start();

      loop.adaptStrategy('frontrun_attempt', 'high');

      expect(adaptedHandler).toHaveBeenCalled();
      expect(loop.getMetrics().adaptations).toBe(1);
    });
  });

  describe('insights', () => {
    it('should provide comprehensive insights', async () => {
      await loop.start();

      const insights = loop.getInsights();

      expect(insights.trading).toBeDefined();
      expect(insights.trading.patterns).toBeDefined();
      expect(insights.trading.statistics).toBeDefined();

      expect(insights.security).toBeDefined();
      expect(insights.security.threatLandscape).toBeDefined();
      expect(insights.security.highPriorityThreats).toBeDefined();

      expect(insights.consciousness).toBeDefined();
      expect(insights.consciousness.thoughts).toBeDefined();

      expect(insights.metrics).toBeDefined();
    });
  });

  describe('component accessors', () => {
    it('should provide access to ArbitrageConsciousness', () => {
      expect(loop.getArbitrageConsciousness()).toBeDefined();
    });

    it('should provide access to AdversarialFeed', () => {
      expect(loop.getAdversarialFeed()).toBeDefined();
    });

    it('should provide access to ThreatTrainer', () => {
      expect(loop.getThreatTrainer()).toBeDefined();
    });

    it('should provide access to ThoughtStream', () => {
      expect(loop.getThoughtStream()).toBeDefined();
    });
  });

  describe('metrics tracking', () => {
    it('should track all metrics', async () => {
      await loop.start();

      const metrics = loop.getMetrics();

      expect(metrics.heartbeats).toBeDefined();
      expect(metrics.threatsProcessed).toBeDefined();
      expect(metrics.tradesProcessed).toBeDefined();
      expect(metrics.adaptations).toBeDefined();
      expect(metrics.lastSaveTime).toBeDefined();
    });
  });
});
