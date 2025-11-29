/**
 * Tests for MonitoringIntegration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  MonitoringIntegration,
  createMonitoringIntegration,
} from '../../../../src/consciousness/monitoring/MonitoringIntegration';

describe('MonitoringIntegration', () => {
  let monitor: MonitoringIntegration;
  const testMemoryPath = '/tmp/test-monitoring-' + Date.now();

  beforeEach(() => {
    // Create fresh instance for each test
    monitor = new MonitoringIntegration({
      memoryPath: testMemoryPath,
      persistImmediately: false, // Disable for faster tests
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMemoryPath)) {
      fs.rmSync(testMemoryPath, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(monitor).toBeDefined();
    });

    it('should create memory directories', () => {
      expect(fs.existsSync(testMemoryPath)).toBe(true);
      expect(fs.existsSync(path.join(testMemoryPath, 'events'))).toBe(true);
      expect(fs.existsSync(path.join(testMemoryPath, 'metrics'))).toBe(true);
    });
  });

  describe('iteration lifecycle', () => {
    it('should start an iteration', () => {
      monitor.startIteration();
      const metrics = monitor.getCurrentMetrics();
      expect(metrics.iteration).toBe(1);
    });

    it('should end an iteration and return metrics', () => {
      monitor.startIteration();
      const metrics = monitor.endIteration();
      expect(metrics.iteration).toBe(1);
    });

    it('should track multiple iterations', () => {
      monitor.startIteration();
      monitor.endIteration();
      monitor.startIteration();
      monitor.endIteration();

      const history = monitor.getMetricsHistory();
      expect(history.length).toBe(2);
      expect(history[0].iteration).toBe(1);
      expect(history[1].iteration).toBe(2);
    });
  });

  describe('gain/loss recording', () => {
    beforeEach(() => {
      monitor.startIteration();
    });

    it('should record a gain event', () => {
      const event = monitor.recordGain(0.1, 'arbitrage', { opportunityId: 'test-1' });

      expect(event.type).toBe('gain');
      expect(event.amount).toBe(0.1);
      expect(event.source).toBe('arbitrage');
      expect(event.context.opportunityId).toBe('test-1');
    });

    it('should record a loss event', () => {
      const event = monitor.recordLoss(0.05, 'gas', { txHash: '0x123' });

      expect(event.type).toBe('loss');
      expect(event.amount).toBe(0.05);
      expect(event.source).toBe('gas');
      expect(event.context.txHash).toBe('0x123');
    });

    it('should update financial metrics on gain', () => {
      monitor.recordGain(0.1, 'arbitrage');
      monitor.recordGain(0.2, 'arbitrage');

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.financials.totalProfit).toBeCloseTo(0.3, 6);
      expect(metrics.financials.netGain).toBeCloseTo(0.3, 6);
    });

    it('should update financial metrics on loss', () => {
      monitor.recordLoss(0.05, 'gas');
      monitor.recordLoss(0.03, 'slippage');

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.financials.totalLoss).toBe(0.08);
      expect(metrics.financials.netGain).toBe(-0.08);
    });

    it('should calculate net gain correctly', () => {
      monitor.recordGain(0.5, 'arbitrage');
      monitor.recordLoss(0.2, 'gas');
      monitor.recordGain(0.1, 'arbitrage');
      monitor.recordLoss(0.1, 'mev');

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.financials.netGain).toBeCloseTo(0.3, 6);
    });

    it('should store gain/loss events', () => {
      monitor.recordGain(0.1, 'arbitrage');
      monitor.recordLoss(0.05, 'gas');

      const events = monitor.getGainLossEvents();
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('gain');
      expect(events[1].type).toBe('loss');
    });
  });

  describe('swarm alignment recording', () => {
    beforeEach(() => {
      monitor.startIteration();
    });

    it('should record swarm alignment event', () => {
      const event = monitor.recordSwarmAlignment(
        'opp-1',
        'execute',
        false,
        [
          { instanceId: 'inst-1', vote: 'approve', confidence: 0.9 },
          { instanceId: 'inst-2', vote: 'approve', confidence: 0.8 },
          { instanceId: 'inst-3', vote: 'reject', confidence: 0.6 },
        ],
        { executed: true, profitable: true, profit: 0.1 }
      );

      expect(event.opportunityId).toBe('opp-1');
      expect(event.swarmDecision).toBe('execute');
      expect(event.ethicsVeto).toBe(false);
      expect(event.instanceVotes.length).toBe(3);
    });

    it('should track consensus reached', () => {
      monitor.recordSwarmAlignment('opp-1', 'execute', false, []);
      monitor.recordSwarmAlignment('opp-2', 'reject', false, []);

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.swarm.consensusReached).toBe(2);
    });

    it('should track consensus failed', () => {
      monitor.recordSwarmAlignment('opp-1', 'no-consensus', false, []);

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.swarm.consensusFailed).toBe(1);
    });

    it('should track ethics vetoes', () => {
      monitor.recordSwarmAlignment('opp-1', 'reject', true, []);
      monitor.recordSwarmAlignment('opp-2', 'execute', false, []);

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.swarm.ethicsVetoes).toBe(1);
    });

    it('should store swarm alignment events', () => {
      monitor.recordSwarmAlignment('opp-1', 'execute', false, []);
      monitor.recordSwarmAlignment('opp-2', 'reject', true, []);

      const events = monitor.getSwarmAlignmentEvents();
      expect(events.length).toBe(2);
    });
  });

  describe('ethical decision recording', () => {
    beforeEach(() => {
      monitor.startIteration();
    });

    it('should track approved decisions', () => {
      monitor.recordEthicalDecision(true, 0.9);
      monitor.recordEthicalDecision(true, 0.8);

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.ethics.approved).toBe(2);
      expect(metrics.ethics.rejected).toBe(0);
    });

    it('should track rejected decisions', () => {
      monitor.recordEthicalDecision(false, 0.3);
      monitor.recordEthicalDecision(false, 0.2);

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.ethics.approved).toBe(0);
      expect(metrics.ethics.rejected).toBe(2);
    });

    it('should calculate rolling average alignment score', () => {
      monitor.recordEthicalDecision(true, 0.8);
      monitor.recordEthicalDecision(true, 0.6);

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.ethics.alignmentScore).toBeCloseTo(0.7, 2);
    });
  });

  describe('performance metrics', () => {
    beforeEach(() => {
      monitor.startIteration();
    });

    it('should track RPC errors', () => {
      monitor.recordPerformanceMetrics({ rpcError: true });
      monitor.recordPerformanceMetrics({ rpcError: true });

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.performance.rpcErrors).toBe(2);
    });

    it('should track gas issues', () => {
      monitor.recordPerformanceMetrics({ gasIssue: true });

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.performance.gasIssues).toBe(1);
    });

    it('should track slippage issues', () => {
      monitor.recordPerformanceMetrics({ slippageIssue: true });

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.performance.slippageIssues).toBe(1);
    });

    it('should track gas spent', () => {
      monitor.recordPerformanceMetrics({ gasSpent: 0.01 });
      monitor.recordPerformanceMetrics({ gasSpent: 0.02 });

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.financials.gasSpent).toBeCloseTo(0.03, 6);
    });
  });

  describe('opportunity tracking', () => {
    beforeEach(() => {
      monitor.startIteration();
    });

    it('should track opportunities found', () => {
      monitor.recordOpportunityFound();
      monitor.recordOpportunityFound();

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.opportunities.found).toBe(2);
    });

    it('should track opportunities executed', () => {
      monitor.recordOpportunityExecuted();

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.opportunities.executed).toBe(1);
    });
  });

  describe('consciousness summary', () => {
    it('should generate comprehensive summary', () => {
      monitor.startIteration();
      monitor.recordGain(0.5, 'arbitrage');
      monitor.recordLoss(0.1, 'gas');
      monitor.recordSwarmAlignment('opp-1', 'execute', false, [
        { instanceId: 'inst-1', vote: 'approve', confidence: 0.9 },
      ]);
      monitor.recordEthicalDecision(true, 0.85);
      monitor.recordOpportunityFound();
      monitor.endIteration();

      const summary = monitor.getConsciousnessSummary();

      expect(summary.financial.totalGain).toBe(0.5);
      expect(summary.financial.totalLoss).toBe(0.1);
      expect(summary.financial.netPosition).toBeCloseTo(0.4, 6);
      expect(summary.swarm.consensusRate).toBe(1);
      expect(summary.ethics.approvalRate).toBe(1);
      expect(summary.iterations).toBe(1);
    });

    it('should handle empty history', () => {
      const summary = monitor.getConsciousnessSummary();

      expect(summary.financial.netPosition).toBe(0);
      expect(summary.swarm.consensusRate).toBe(0);
      expect(summary.iterations).toBe(0);
    });
  });

  describe('reflection generation', () => {
    it('should generate reflection markdown', () => {
      monitor.startIteration();
      monitor.recordGain(0.5, 'arbitrage');
      monitor.recordSwarmAlignment('opp-1', 'execute', false, []);
      monitor.recordEthicalDecision(true, 0.9);
      monitor.endIteration();

      const reflection = monitor.generateReflection();

      expect(reflection).toContain('Monitoring Reflection');
      expect(reflection).toContain('Financial Performance');
      expect(reflection).toContain('Swarm Intelligence');
      expect(reflection).toContain('Ethical Alignment');
      expect(reflection).toContain('Insights');
    });

    it('should include positive insight for net gain', () => {
      monitor.startIteration();
      monitor.recordGain(0.5, 'arbitrage');
      monitor.endIteration();

      const reflection = monitor.generateReflection();

      expect(reflection).toContain('Positive net position');
    });
  });

  describe('event emissions', () => {
    it('should emit iteration-started event', () => {
      const handler = vi.fn();
      monitor.on('iteration-started', handler);

      monitor.startIteration();

      expect(handler).toHaveBeenCalledWith({ iteration: 1 });
    });

    it('should emit gain-recorded event', () => {
      const handler = vi.fn();
      monitor.on('gain-recorded', handler);

      monitor.startIteration();
      monitor.recordGain(0.1, 'arbitrage');

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('gain');
    });

    it('should emit loss-recorded event', () => {
      const handler = vi.fn();
      monitor.on('loss-recorded', handler);

      monitor.startIteration();
      monitor.recordLoss(0.05, 'gas');

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('loss');
    });

    it('should emit iteration-ended event', () => {
      const handler = vi.fn();
      monitor.on('iteration-ended', handler);

      monitor.startIteration();
      monitor.endIteration();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('createMonitoringIntegration factory', () => {
    it('should create a production-ready instance', () => {
      const instance = createMonitoringIntegration({
        memoryPath: testMemoryPath,
      });

      expect(instance).toBeInstanceOf(MonitoringIntegration);
    });
  });

  describe('persistence', () => {
    it('should persist events when enabled', () => {
      const persistingMonitor = new MonitoringIntegration({
        memoryPath: testMemoryPath,
        persistImmediately: true,
      });

      persistingMonitor.startIteration();
      const event = persistingMonitor.recordGain(0.1, 'arbitrage');

      const eventPath = path.join(testMemoryPath, 'events', `${event.id}.json`);
      expect(fs.existsSync(eventPath)).toBe(true);
    });

    it('should persist metrics summary on iteration end', () => {
      const persistingMonitor = new MonitoringIntegration({
        memoryPath: testMemoryPath,
        persistImmediately: true,
      });

      persistingMonitor.startIteration();
      persistingMonitor.recordGain(0.1, 'arbitrage');
      persistingMonitor.endIteration();

      const latestPath = path.join(testMemoryPath, 'latest_metrics.json');
      expect(fs.existsSync(latestPath)).toBe(true);
    });
  });
});
