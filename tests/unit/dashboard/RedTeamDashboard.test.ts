/**
 * RedTeamDashboard Tests
 */

import { RedTeamDashboard, DecisionRecord } from '../../../src/dashboard/RedTeamDashboard';

describe('RedTeamDashboard', () => {
  let dashboard: RedTeamDashboard;

  beforeEach(() => {
    dashboard = new RedTeamDashboard({
      port: 0, // Random port for testing
      maxHistorySize: 100,
      enableAuth: false,
    });
  });

  afterEach(async () => {
    await dashboard.stop();
  });

  describe('initialization', () => {
    it('should create dashboard with default config', () => {
      expect(dashboard).toBeTruthy();
      expect(dashboard.isStarted()).toBe(false);
    });

    it('should start and stop the server', async () => {
      await dashboard.start();
      expect(dashboard.isStarted()).toBe(true);

      await dashboard.stop();
      expect(dashboard.isStarted()).toBe(false);
    });
  });

  describe('decision recording', () => {
    const sampleDecision: DecisionRecord = {
      id: 'decision-1',
      timestamp: Date.now(),
      type: 'mev',
      action: 'execute_arbitrage',
      outcome: 'executed',
      confidence: 0.9,
      reasoning: {
        steps: [
          {
            order: 1,
            module: 'RiskAssessor',
            input: 'Market conditions',
            output: 'Low risk',
            confidence: 0.85,
            durationMs: 50,
          },
        ],
        finalConclusion: 'Proceed with execution',
        totalDurationMs: 100,
      },
      ethicsEvaluation: {
        coherent: true,
        confidence: 0.95,
        categories: [9, 192],
        principles: ['Do no harm', 'Protect users'],
        reasoning: ['Action aligns with principles'],
      },
      metadata: { pair: 'ETH/USDC' },
    };

    it('should record decisions', () => {
      dashboard.recordDecision(sampleDecision);

      expect(dashboard.getDecisionCount()).toBe(1);
    });

    it('should update metrics on decision', () => {
      dashboard.recordDecision(sampleDecision);

      const metrics = dashboard.getMetrics();
      expect(metrics.totalDecisions).toBe(1);
      expect(metrics.approvedDecisions).toBe(1);
    });

    it('should track ethics coherence', () => {
      dashboard.recordDecision(sampleDecision);

      const metrics = dashboard.getMetrics();
      expect(metrics.ethicsCoherence).toBe(1.0);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 150; i++) {
        dashboard.recordDecision({
          ...sampleDecision,
          id: `decision-${i}`,
        });
      }

      expect(dashboard.getDecisionCount()).toBeLessThanOrEqual(100);
    });
  });

  describe('metrics calculation', () => {
    it('should calculate average confidence', () => {
      dashboard.recordDecision({
        id: 'd1',
        timestamp: Date.now(),
        type: 'mev',
        action: 'action1',
        outcome: 'executed',
        confidence: 0.8,
        reasoning: { steps: [], finalConclusion: '', totalDurationMs: 0 },
        metadata: {},
      });

      dashboard.recordDecision({
        id: 'd2',
        timestamp: Date.now(),
        type: 'mev',
        action: 'action2',
        outcome: 'executed',
        confidence: 1.0,
        reasoning: { steps: [], finalConclusion: '', totalDurationMs: 0 },
        metadata: {},
      });

      const metrics = dashboard.getMetrics();
      expect(metrics.averageConfidence).toBe(0.9);
    });

    it('should track rejected decisions', () => {
      dashboard.recordDecision({
        id: 'd1',
        timestamp: Date.now(),
        type: 'ethics',
        action: 'sandwich_attack',
        outcome: 'rejected',
        confidence: 0.95,
        reasoning: { steps: [], finalConclusion: 'Rejected', totalDurationMs: 0 },
        ethicsEvaluation: {
          coherent: false,
          confidence: 0.95,
          categories: [9],
          principles: ['Do no harm'],
          reasoning: ['Violates principles'],
          violation: {
            principle: 'Do no harm',
            category: 9,
            description: 'Would harm retail users',
          },
        },
        metadata: {},
      });

      const metrics = dashboard.getMetrics();
      expect(metrics.rejectedDecisions).toBe(1);
      expect(metrics.ethicsCoherence).toBe(0);
    });
  });

  describe('swarm voting tracking', () => {
    it('should calculate swarm consensus rate', () => {
      dashboard.recordDecision({
        id: 'd1',
        timestamp: Date.now(),
        type: 'swarm',
        action: 'evaluate_opportunity',
        outcome: 'approved',
        confidence: 0.9,
        reasoning: { steps: [], finalConclusion: '', totalDurationMs: 0 },
        swarmVotes: [
          { instanceId: 'i1', vote: 'approve', confidence: 0.9, reasoning: 'Yes', timestamp: Date.now() },
          { instanceId: 'i2', vote: 'approve', confidence: 0.85, reasoning: 'Yes', timestamp: Date.now() },
          { instanceId: 'i3', vote: 'approve', confidence: 0.8, reasoning: 'Yes', timestamp: Date.now() },
        ],
        metadata: {},
      });

      const metrics = dashboard.getMetrics();
      expect(metrics.swarmConsensusRate).toBe(1);
    });
  });

  describe('Express app', () => {
    it('should expose Express app for testing', () => {
      const app = dashboard.getApp();
      expect(app).toBeTruthy();
    });
  });
});
