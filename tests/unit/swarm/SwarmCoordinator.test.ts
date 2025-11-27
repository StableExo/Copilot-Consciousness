/**
 * SwarmCoordinator Tests
 */

import {
  SwarmCoordinator,
  SwarmOpportunity,
  WardenVote,
  WardenInstanceConfig,
  createProductionSwarm,
} from '../../../src/swarm';

describe('SwarmCoordinator', () => {
  let swarm: SwarmCoordinator;

  beforeEach(() => {
    swarm = new SwarmCoordinator({
      minInstances: 3,
      maxInstances: 5,
      consensusThreshold: 0.7,
      votingTimeoutMs: 1000,
    });
  });

  describe('instance management', () => {
    it('should register Warden instances', () => {
      const config: WardenInstanceConfig = {
        id: 'test-1',
        weight: 1.0,
        specialization: 'risk',
      };

      swarm.registerInstance(config, async () => ({
        vote: 'approve',
        confidence: 0.9,
        reasoning: 'Test',
        processingTimeMs: 50,
      }));

      expect(swarm.getInstances()).toHaveLength(1);
      expect(swarm.getInstances()[0].id).toBe('test-1');
    });

    it('should unregister instances', () => {
      swarm.registerInstance(
        { id: 'test-1', weight: 1.0 },
        async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Test', processingTimeMs: 50 })
      );

      expect(swarm.unregisterInstance('test-1')).toBe(true);
      expect(swarm.getInstances()).toHaveLength(0);
    });

    it('should enforce max instance limit', () => {
      for (let i = 0; i < 5; i++) {
        swarm.registerInstance(
          { id: `test-${i}`, weight: 1.0 },
          async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Test', processingTimeMs: 50 })
        );
      }

      expect(() => {
        swarm.registerInstance(
          { id: 'test-6', weight: 1.0 },
          async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Test', processingTimeMs: 50 })
        );
      }).toThrow('Maximum 5 instances allowed');
    });
  });

  describe('readiness check', () => {
    it('should not be ready with fewer than minimum instances', () => {
      swarm.registerInstance(
        { id: 'test-1', weight: 1.0 },
        async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Test', processingTimeMs: 50 })
      );

      expect(swarm.isReady()).toBe(false);
    });

    it('should be ready with minimum instances', () => {
      for (let i = 0; i < 3; i++) {
        swarm.registerInstance(
          { id: `test-${i}`, weight: 1.0 },
          async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Test', processingTimeMs: 50 })
        );
      }

      expect(swarm.isReady()).toBe(true);
    });
  });

  describe('opportunity evaluation', () => {
    const opportunity: SwarmOpportunity = {
      id: 'opp-1',
      type: 'arbitrage',
      data: { pair: 'ETH/USDC' },
      expectedValue: 0.05,
      risk: 0.2,
      urgency: 'high',
      deadline: Date.now() + 10000,
    };

    beforeEach(() => {
      // Register 3 instances that all approve
      for (let i = 0; i < 3; i++) {
        swarm.registerInstance(
          { id: `approver-${i}`, weight: 1.0 },
          async () => ({
            vote: 'approve',
            confidence: 0.9,
            reasoning: 'Looks profitable',
            processingTimeMs: 50,
          })
        );
      }
    });

    it('should reach consensus on approval', async () => {
      const result = await swarm.evaluateOpportunity(opportunity);

      expect(result.decision).toBe('execute');
      expect(result.consensusReached).toBe(true);
      expect(result.approvalRate).toBeGreaterThanOrEqual(0.7);
    });

    it('should track processing time', async () => {
      const result = await swarm.evaluateOpportunity(opportunity);

      // Processing time should be non-negative (may be 0 for very fast evaluations)
      expect(result.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should collect votes from all instances', async () => {
      const result = await swarm.evaluateOpportunity(opportunity);

      expect(result.votes.length).toBe(3);
    });
  });

  describe('consensus calculation', () => {
    const opportunity: SwarmOpportunity = {
      id: 'opp-2',
      type: 'liquidation',
      data: {},
      expectedValue: 0.1,
      risk: 0.3,
      urgency: 'medium',
      deadline: Date.now() + 10000,
    };

    it('should reject when majority rejects', async () => {
      // 2 rejectors, 1 approver
      swarm.registerInstance(
        { id: 'approver', weight: 1.0 },
        async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Yes', processingTimeMs: 50 })
      );
      swarm.registerInstance(
        { id: 'rejector-1', weight: 1.0 },
        async () => ({ vote: 'reject', confidence: 0.8, reasoning: 'No', processingTimeMs: 50 })
      );
      swarm.registerInstance(
        { id: 'rejector-2', weight: 1.0 },
        async () => ({ vote: 'reject', confidence: 0.8, reasoning: 'No', processingTimeMs: 50 })
      );

      const result = await swarm.evaluateOpportunity(opportunity);

      expect(result.decision).toBe('reject');
    });

    it('should respect instance weights', async () => {
      // 1 heavy approver, 2 light rejectors
      // heavy-approver: weight=3.0, vote=approve, confidence=1.0 → approvalWeight = 3.0
      // light-rejector-1: weight=0.5, vote=reject → adds 0 to approvalWeight
      // light-rejector-2: weight=0.5, vote=reject → adds 0 to approvalWeight
      // totalWeight = 3.0 + 0.5 + 0.5 = 4.0
      // approvalRate = 3.0 / 4.0 = 0.75 >= 0.7 threshold
      swarm.registerInstance(
        { id: 'heavy-approver', weight: 3.0 },
        async () => ({ vote: 'approve', confidence: 1.0, reasoning: 'Yes', processingTimeMs: 50 })
      );
      swarm.registerInstance(
        { id: 'light-rejector-1', weight: 0.5 },
        async () => ({ vote: 'reject', confidence: 0.5, reasoning: 'No', processingTimeMs: 50 })
      );
      swarm.registerInstance(
        { id: 'light-rejector-2', weight: 0.5 },
        async () => ({ vote: 'reject', confidence: 0.5, reasoning: 'No', processingTimeMs: 50 })
      );

      const result = await swarm.evaluateOpportunity(opportunity);

      expect(result.decision).toBe('execute');
    });
  });

  describe('ethics veto', () => {
    it('should reject when ethics instance vetoes', async () => {
      const swarmWithEthics = new SwarmCoordinator({
        minInstances: 3,
        consensusThreshold: 0.7,
        enableEthicsVeto: true,
      });

      swarmWithEthics.registerInstance(
        { id: 'approver-1', weight: 1.0 },
        async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Yes', processingTimeMs: 50 })
      );
      swarmWithEthics.registerInstance(
        { id: 'approver-2', weight: 1.0 },
        async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Yes', processingTimeMs: 50 })
      );
      swarmWithEthics.registerInstance(
        { id: 'ethics', weight: 1.0, specialization: 'ethics' },
        async () => ({ vote: 'reject', confidence: 0.95, reasoning: 'Unethical', processingTimeMs: 50 })
      );

      const result = await swarmWithEthics.evaluateOpportunity({
        id: 'opp-3',
        type: 'sandwich',
        data: {},
        expectedValue: 1.0,
        risk: 0.1,
        urgency: 'high',
        deadline: Date.now() + 10000,
      });

      expect(result.decision).toBe('reject');
    });
  });

  describe('production swarm creation', () => {
    it('should create a production-ready swarm', () => {
      const prodSwarm = createProductionSwarm();

      expect(prodSwarm.isReady()).toBe(true);
      expect(prodSwarm.getInstances().length).toBe(5);
    });
  });

  describe('statistics', () => {
    it('should track evaluation statistics', async () => {
      for (let i = 0; i < 3; i++) {
        swarm.registerInstance(
          { id: `instance-${i}`, weight: 1.0 },
          async () => ({ vote: 'approve', confidence: 0.9, reasoning: 'Test', processingTimeMs: 50 })
        );
      }

      await swarm.evaluateOpportunity({
        id: 'opp-stats',
        type: 'arbitrage',
        data: {},
        expectedValue: 0.05,
        risk: 0.2,
        urgency: 'high',
        deadline: Date.now() + 10000,
      });

      const stats = swarm.getStats();

      expect(stats.totalEvaluations).toBe(1);
      expect(stats.instanceCount).toBe(3);
    });
  });
});
