/**
 * Tests for Cognitive Coordination System
 */

import {
  CognitiveCoordinator,
  ConsciousnessModules,
  OpportunityContext,
  ModuleInsight,
} from '../../../src/consciousness/coordination/CognitiveCoordinator';

describe('Cognitive Coordination System', () => {
  let coordinator: CognitiveCoordinator;
  let mockModules: ConsciousnessModules;

  beforeEach(() => {
    // Create mock consciousness modules
    mockModules = {
      learningEngine: {},
      patternTracker: {},
      historicalAnalyzer: {},
      spatialReasoning: {},
      multiPathExplorer: {},
      opportunityScorer: {},
      patternRecognition: {},
      riskAssessor: {},
      riskCalibrator: {},
      thresholdManager: {},
      autonomousGoals: {},
      operationalPlaybook: {},
      architecturalPrinciples: {},
      evolutionTracker: {},
    };

    coordinator = new CognitiveCoordinator(mockModules);
  });

  describe('CognitiveCoordinator', () => {
    it('should create coordinator with modules', () => {
      expect(coordinator).toBeDefined();
    });

    it('should gather insights from all 14 modules', async () => {
      const context: OpportunityContext = {
        opportunity: { profit: 0.01, pools: ['pool1', 'pool2'] },
        market: { congestion: 0.3 },
        historical: {},
        timestamp: Date.now(),
      };

      const insights = await coordinator.gatherInsights(context);

      expect(insights).toBeDefined();
      expect(insights.length).toBe(14);
      
      // Verify all module names are present
      const moduleNames = insights.map(i => i.moduleName);
      expect(moduleNames).toContain('learningEngine');
      expect(moduleNames).toContain('riskAssessor');
      expect(moduleNames).toContain('autonomousGoals');
    });

    it('should detect consensus when modules agree', async () => {
      const insights: ModuleInsight[] = [
        {
          moduleName: 'module1',
          recommendation: 'EXECUTE',
          confidence: 0.8,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'module2',
          recommendation: 'EXECUTE',
          confidence: 0.85,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'module3',
          recommendation: 'EXECUTE',
          confidence: 0.9,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        },
      ];

      const consensus = coordinator.detectConsensus(insights);

      expect(consensus.hasConsensus).toBe(true);
      expect(consensus.consensusType).toBe('EXECUTE');
      expect(consensus.agreementLevel).toBeGreaterThan(0.7);
      expect(consensus.supportingModules.length).toBe(3);
    });

    it('should detect no consensus when modules disagree', async () => {
      const insights: ModuleInsight[] = [
        {
          moduleName: 'module1',
          recommendation: 'EXECUTE',
          confidence: 0.7,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'module2',
          recommendation: 'REJECT',
          confidence: 0.8,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'module3',
          recommendation: 'UNCERTAIN',
          confidence: 0.6,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        },
      ];

      const consensus = coordinator.detectConsensus(insights);

      expect(consensus.hasConsensus).toBe(false);
      expect(consensus.agreementLevel).toBeLessThan(0.7);
    });

    it('should resolve conflicts with strong consensus', async () => {
      const insights: ModuleInsight[] = Array.from({ length: 10 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const resolution = coordinator.resolveConflicts(insights);

      expect(resolution.decision).toBe('EXECUTE');
      expect(resolution.confidence).toBeGreaterThan(0.7);
      expect(resolution.resolvedConflicts.length).toBe(0);
    });

    it('should defer when critical modules disagree', async () => {
      const insights: ModuleInsight[] = [
        {
          moduleName: 'riskAssessor',
          recommendation: 'REJECT',
          confidence: 0.9,
          reasoning: 'High risk',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'opportunityScorer',
          recommendation: 'EXECUTE',
          confidence: 0.85,
          reasoning: 'High profit',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'autonomousGoals',
          recommendation: 'REJECT',
          confidence: 0.8,
          reasoning: 'Goal misalignment',
          data: {},
          weight: 1.0,
        },
      ];

      const resolution = coordinator.resolveConflicts(insights);

      expect(resolution.decision).toBe('DEFER');
      expect(resolution.reasoning).toContain('disagree');
    });

    it('should make weighted decision', async () => {
      const insights: ModuleInsight[] = [
        {
          moduleName: 'riskAssessor',
          recommendation: 'EXECUTE',
          confidence: 0.9,
          reasoning: 'Low risk',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'opportunityScorer',
          recommendation: 'EXECUTE',
          confidence: 0.95,
          reasoning: 'High profit',
          data: {},
          weight: 1.0,
        },
        {
          moduleName: 'learningEngine',
          recommendation: 'UNCERTAIN',
          confidence: 0.5,
          reasoning: 'Insufficient data',
          data: {},
          weight: 0.8,
        },
      ];

      const decision = coordinator.makeWeightedDecision(insights);

      expect(decision.action).toBe('EXECUTE');
      expect(decision.confidence).toBeGreaterThan(0.5);
      expect(decision.contributingFactors.length).toBe(3);
    });

    it('should calculate confidence from consensus', async () => {
      const consensus = {
        hasConsensus: true,
        consensusType: 'EXECUTE' as const,
        confidence: 0.85,
        agreementLevel: 0.9,
        supportingModules: ['m1', 'm2', 'm3'],
        opposingModules: [],
        uncertainModules: ['m4'],
      };

      const confidence = coordinator.calculateConfidence(consensus);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should penalize confidence for uncertainty', async () => {
      const consensus = {
        hasConsensus: false,
        consensusType: 'UNCERTAIN' as const,
        confidence: 0.5,
        agreementLevel: 0.4,
        supportingModules: [],
        opposingModules: [],
        uncertainModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
      };

      const confidence = coordinator.calculateConfidence(consensus);

      expect(confidence).toBeLessThan(0.5);
    });
  });
});
