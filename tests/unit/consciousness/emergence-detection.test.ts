/**
 * Tests for Emergence Detection System
 */

import {
  EmergenceDetector,
  DecisionContext,
  EmergenceResult,
} from '../../../src/consciousness/coordination/EmergenceDetector';
import { ModuleInsight } from '../../../src/consciousness/coordination/CognitiveCoordinator';

describe('Emergence Detection System', () => {
  let detector: EmergenceDetector;

  beforeEach(() => {
    detector = new EmergenceDetector();
  });

  describe('EmergenceDetector', () => {
    it('should create detector', () => {
      expect(detector).toBeDefined();
    });

    it('should detect emergence when all criteria pass', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2, // Below threshold (0.3)
        ethicalScore: 0.9, // Above threshold (0.7)
        goalAlignment: 0.85, // Above threshold (0.75)
        patternConfidence: 0.8, // Above threshold (0.7)
        historicalSuccess: 0.7, // Above threshold (0.6)
        timestamp: Date.now(),
      };

      const result = detector.detectEmergence(context);

      expect(result.isEmergent).toBe(true);
      expect(result.shouldExecute).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.reasoning).toContain('EMERGENCE DETECTED');
      expect(result.reasoning).toContain('BOOM');
      expect(result.criteriaResults.allModulesAnalyzed).toBe(true);
      expect(result.criteriaResults.riskAcceptable).toBe(true);
      expect(result.criteriaResults.ethicallySound).toBe(true);
      expect(result.criteriaResults.goalsAligned).toBe(true);
      expect(result.criteriaResults.patternConfident).toBe(true);
      expect(result.criteriaResults.historicallyFavorable).toBe(true);
      expect(result.criteriaResults.minimalDissent).toBe(true);
    });

    it('should not detect emergence when risk is too high', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.5, // Above threshold (0.3)
        ethicalScore: 0.9,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const result = detector.detectEmergence(context);

      expect(result.isEmergent).toBe(false);
      expect(result.shouldExecute).toBe(false);
      expect(result.criteriaResults.riskAcceptable).toBe(false);
      expect(result.reasoning).toContain('risk too high');
    });

    it('should not detect emergence when ethical score is low', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.5, // Below threshold (0.7)
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const result = detector.detectEmergence(context);

      expect(result.isEmergent).toBe(false);
      expect(result.criteriaResults.ethicallySound).toBe(false);
      expect(result.reasoning).toContain('ethical concerns');
    });

    it('should not detect emergence with significant dissent', () => {
      const moduleInsights: ModuleInsight[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          moduleName: `support${i}`,
          recommendation: 'EXECUTE' as const,
          confidence: 0.85,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          moduleName: `oppose${i}`,
          recommendation: 'REJECT' as const,
          confidence: 0.8,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        })),
      ];

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: false,
          consensusType: 'UNCERTAIN',
          confidence: 0.7,
          agreementLevel: 0.71, // Just above 70%
          supportingModules: Array.from({ length: 10 }, (_, i) => `support${i}`),
          opposingModules: Array.from({ length: 4 }, (_, i) => `oppose${i}`),
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.9,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const result = detector.detectEmergence(context);

      // With 4/14 = 28.6% dissent (above 15% threshold), should fail
      expect(result.isEmergent).toBe(false);
      expect(result.criteriaResults.minimalDissent).toBe(false);
      expect(result.reasoning).toContain('significant dissent');
    });

    it('should identify contributing factors', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.9,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const result = detector.detectEmergence(context);

      expect(result.contributingFactors.length).toBeGreaterThan(0);
      expect(result.contributingFactors.some(f => f.includes('modules analyzed'))).toBe(true);
      expect(result.contributingFactors.some(f => f.includes('Risk score'))).toBe(true);
      expect(result.contributingFactors.some(f => f.includes('Ethical score'))).toBe(true);
    });

    it('should record emergence in history', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.9,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      detector.detectEmergence(context);
      detector.detectEmergence(context);

      const history = detector.getEmergenceHistory();
      expect(history.length).toBe(2);
    });

    it('should calculate emergence statistics', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      // Detect multiple times
      for (let i = 0; i < 5; i++) {
        const context: DecisionContext = {
          moduleInsights,
          consensus: {
            hasConsensus: true,
            consensusType: 'EXECUTE',
            confidence: 0.85,
            agreementLevel: 0.95,
            supportingModules: moduleInsights.map(m => m.moduleName),
            opposingModules: [],
            uncertainModules: [],
          },
          riskScore: i < 3 ? 0.2 : 0.5, // 3 pass, 2 fail
          ethicalScore: 0.9,
          goalAlignment: 0.85,
          patternConfidence: 0.8,
          historicalSuccess: 0.7,
          timestamp: Date.now(),
        };

        detector.detectEmergence(context);
      }

      const stats = detector.getEmergenceStats();

      expect(stats.totalDetections).toBe(5);
      expect(stats.emergentDetections).toBe(3);
      expect(stats.emergenceRate).toBeCloseTo(0.6);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.criteriaBreakdown).toBeDefined();
    });

    it('should get recent emergence results', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      for (let i = 0; i < 20; i++) {
        const context: DecisionContext = {
          moduleInsights,
          consensus: {
            hasConsensus: true,
            consensusType: 'EXECUTE',
            confidence: 0.85,
            agreementLevel: 0.95,
            supportingModules: moduleInsights.map(m => m.moduleName),
            opposingModules: [],
            uncertainModules: [],
          },
          riskScore: 0.2,
          ethicalScore: 0.9,
          goalAlignment: 0.85,
          patternConfidence: 0.8,
          historicalSuccess: 0.7,
          timestamp: Date.now(),
        };

        detector.detectEmergence(context);
      }

      const recent = detector.getRecentEmergence(10);
      expect(recent.length).toBe(10);
    });

    it('should update thresholds dynamically', () => {
      const oldThresholds = detector.getThresholds();
      
      detector.updateThresholds({
        maxRiskScore: 0.5,
        minEthicalScore: 0.8,
      });

      const newThresholds = detector.getThresholds();
      
      expect(newThresholds.maxRiskScore).toBe(0.5);
      expect(newThresholds.minEthicalScore).toBe(0.8);
      expect(newThresholds.minGoalAlignment).toBe(oldThresholds.minGoalAlignment);
    });

    it('should clear history', () => {
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const context: DecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.9,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      detector.detectEmergence(context);
      detector.clearHistory();

      const history = detector.getEmergenceHistory();
      expect(history.length).toBe(0);
    });
  });
});
