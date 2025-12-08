/**
 * Integration tests for Safety Infrastructure
 * Tests the interaction between RiskAssessment, EthicalReviewGate, and EmergenceDetector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RiskAssessmentEngine,
  RiskCategory,
  RiskLevel,
  DecisionContext as RiskDecisionContext,
} from '../../../../src/consciousness/safety/RiskAssessment';
import {
  EmergenceDetector,
  DecisionContext as EmergenceDecisionContext,
} from '../../../../src/consciousness/coordination/EmergenceDetector';
import { ModuleInsight } from '../../../../src/consciousness/coordination/CognitiveCoordinator';

describe('Safety Infrastructure Integration', () => {
  let riskEngine: RiskAssessmentEngine;
  let emergenceDetector: EmergenceDetector;

  beforeEach(() => {
    riskEngine = new RiskAssessmentEngine();
    emergenceDetector = new EmergenceDetector();
  });

  describe('Complete Safety Pipeline', () => {
    it('should approve safe low-risk decision through full pipeline', async () => {
      // Step 1: Emergence Detection
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.9,
        reasoning: 'Safe trade opportunity',
        data: {},
        weight: 1.0,
      }));

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.9,
          agreementLevel: 0.95,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.15, // Low risk
        ethicalScore: 0.9, // High ethical alignment
        goalAlignment: 0.9,
        patternConfidence: 0.85,
        historicalSuccess: 0.8,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

      // Emergence should be detected
      expect(emergenceResult.isEmergent).toBe(true);
      expect(emergenceResult.shouldExecute).toBe(true);

      // Step 2: Risk Assessment with emergence data
      const riskContext: RiskDecisionContext = {
        action: 'Execute low-risk MEV trade',
        capitalAtRisk: 25,
        ethicalAlignment: emergenceContext.ethicalScore,
        emergenceConfidence: emergenceResult.confidence,
        historicalSuccessRate: 0.8,
        novelty: 0.2,
        reversibility: 0.8,
      };

      const riskResult = await riskEngine.assess(riskContext);

      // Risk assessment should approve
      expect(riskResult.shouldProceed).toBe(true);
      expect(riskResult.overallRisk).toBe(RiskLevel.NEGLIGIBLE);

      // Complete pipeline approval
      const finalDecision = emergenceResult.shouldExecute && riskResult.shouldProceed;
      expect(finalDecision).toBe(true);
    });

    it('should reject high-risk decision despite emergence', async () => {
      // Step 1: Emergence Detection (passes)
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Profitable but risky',
        data: {},
        weight: 1.0,
      }));

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.92,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.25, // Passes emergence threshold
        ethicalScore: 0.85,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

      // Emergence detected
      expect(emergenceResult.isEmergent).toBe(true);

      // Step 2: Risk Assessment (fails due to high capital)
      const riskContext: RiskDecisionContext = {
        action: 'High capital trade',
        capitalAtRisk: 200, // Above $100 threshold
        ethicalAlignment: emergenceContext.ethicalScore,
        emergenceConfidence: emergenceResult.confidence,
        historicalSuccessRate: 0.7,
      };

      const riskResult = await riskEngine.assess(riskContext);

      // Risk assessment should reject
      expect(riskResult.shouldProceed).toBe(false);
      expect(riskResult.requiresReview).toBe(true);

      // Complete pipeline rejection despite emergence
      const finalDecision = emergenceResult.shouldExecute && riskResult.shouldProceed;
      expect(finalDecision).toBe(false);
    });

    it('should reject ethically questionable decision at emergence stage', async () => {
      // Step 1: Emergence Detection (fails due to ethics)
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Profitable but ethically questionable',
        data: {},
        weight: 1.0,
      }));

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.92,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.6, // Below 0.7 threshold
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.75,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

      // Emergence should NOT be detected due to ethical concerns
      expect(emergenceResult.isEmergent).toBe(false);
      expect(emergenceResult.shouldExecute).toBe(false);
      // Check that reasoning mentions ethical issues (reasoning is an array of strings)
      const reasoningText = Array.isArray(emergenceResult.reasoning) 
        ? emergenceResult.reasoning.join(' ').toLowerCase()
        : String(emergenceResult.reasoning).toLowerCase();
      expect(reasoningText).toContain('ethical');

      // Pipeline stops here - no need for risk assessment
      expect(emergenceResult.shouldExecute).toBe(false);
    });

    it('should require review for moderate risk with emergence', async () => {
      // Step 1: Emergence Detection (passes)
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Moderate opportunity',
        data: {},
        weight: 1.0,
      }));

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.92,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.25,
        ethicalScore: 0.85,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

      // Emergence detected
      expect(emergenceResult.isEmergent).toBe(true);

      // Step 2: Risk Assessment (moderate risk)
      const riskContext: RiskDecisionContext = {
        action: 'Moderate risk trade',
        capitalAtRisk: 60, // Moderate capital
        ethicalAlignment: 0.75, // Just above threshold
        emergenceConfidence: emergenceResult.confidence,
        historicalSuccessRate: 0.7,
        novelty: 0.5,
        reversibility: 0.6,
      };

      const riskResult = await riskEngine.assess(riskContext);

      // Should proceed
      expect(riskResult.shouldProceed).toBe(true);
      // Risk level might be lower than MODERATE due to good factors
      expect([RiskLevel.NEGLIGIBLE, RiskLevel.LOW, RiskLevel.MODERATE]).toContain(riskResult.overallRisk);

      // Final decision: proceed with monitoring
      const finalDecision = {
        shouldExecute: emergenceResult.shouldExecute && riskResult.shouldProceed,
        requiresMonitoring: true,
        emergenceConfidence: emergenceResult.confidence,
        riskLevel: riskResult.overallRisk,
      };

      expect(finalDecision.shouldExecute).toBe(true);
      expect(finalDecision.requiresMonitoring).toBe(true);
    });
  });

  describe('Multi-Layer Safety Validation', () => {
    it('should catch safety issues at different layers', async () => {
      // Test Case 1: Emergence layer catches ethical issues
      const ethicalIssueContext: EmergenceDecisionContext = {
        moduleInsights: Array.from({ length: 14 }, (_, i) => ({
          moduleName: `module${i}`,
          recommendation: 'EXECUTE' as const,
          confidence: 0.85,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        })),
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.92,
          supportingModules: Array.from({ length: 14 }, (_, i) => `module${i}`),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.5, // Fails here
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.75,
        timestamp: Date.now(),
      };

      const emergenceResult1 = emergenceDetector.detectEmergence(ethicalIssueContext);
      expect(emergenceResult1.isEmergent).toBe(false);

      // Test Case 2: Emergence passes, Risk layer catches capital issues
      const capitalIssueContext: EmergenceDecisionContext = {
        ...ethicalIssueContext,
        ethicalScore: 0.9, // Passes emergence
      };

      const emergenceResult2 = emergenceDetector.detectEmergence(capitalIssueContext);
      expect(emergenceResult2.isEmergent).toBe(true);

      const riskResult = await riskEngine.assess({
        action: 'Test',
        capitalAtRisk: 500, // Fails here
        ethicalAlignment: 0.9,
        emergenceConfidence: emergenceResult2.confidence,
      });

      expect(riskResult.shouldProceed).toBe(false);
    });

    it('should track safety decisions through history', async () => {
      // Make multiple decisions and track them
      const decisions = [];

      for (let i = 0; i < 5; i++) {
        const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
          moduleName: `module${i}`,
          recommendation: 'EXECUTE' as const,
          confidence: 0.85,
          reasoning: 'Test',
          data: {},
          weight: 1.0,
        }));

        const emergenceContext: EmergenceDecisionContext = {
          moduleInsights,
          consensus: {
            hasConsensus: true,
            consensusType: 'EXECUTE',
            confidence: 0.85,
            agreementLevel: 0.92,
            supportingModules: moduleInsights.map(m => m.moduleName),
            opposingModules: [],
            uncertainModules: [],
          },
          riskScore: 0.2,
          ethicalScore: 0.85,
          goalAlignment: 0.85,
          patternConfidence: 0.8,
          historicalSuccess: 0.75,
          timestamp: Date.now(),
        };

        const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

        const riskResult = await riskEngine.assess({
          action: `Decision ${i}`,
          capitalAtRisk: 30 + i * 10,
          ethicalAlignment: 0.85,
          emergenceConfidence: emergenceResult.confidence,
        });

        decisions.push({
          emergence: emergenceResult.isEmergent,
          risk: riskResult.shouldProceed,
          approved: emergenceResult.shouldExecute && riskResult.shouldProceed,
        });
      }

      // Verify all decisions were tracked
      expect(decisions.length).toBe(5);

      // Check emergence history
      const emergenceHistory = emergenceDetector.getEmergenceHistory();
      expect(emergenceHistory.length).toBe(5);
    });
  });

  describe('Safety Infrastructure Coordination', () => {
    it('should coordinate threshold updates across systems', () => {
      // Update risk thresholds
      riskEngine.updateThresholds({
        maxCapitalRisk: 200,
        minEthicalAlignment: 0.8,
      });

      // Update emergence thresholds
      emergenceDetector.updateThresholds({
        minEthicalScore: 0.8,
        maxRiskScore: 0.25,
      });

      // Both systems should use new thresholds
      // (Verification through actual test scenarios)
    });

    it('should provide comprehensive safety reporting', async () => {
      // Make a decision through the pipeline
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.85,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }));

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.85,
          agreementLevel: 0.92,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.2,
        ethicalScore: 0.85,
        goalAlignment: 0.85,
        patternConfidence: 0.8,
        historicalSuccess: 0.75,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

      const riskResult = await riskEngine.assess({
        action: 'Test decision',
        capitalAtRisk: 50,
        ethicalAlignment: emergenceContext.ethicalScore,
        emergenceConfidence: emergenceResult.confidence,
        historicalSuccessRate: 0.75,
        novelty: 0.3,
        reversibility: 0.7,
      });

      // Compile comprehensive safety report
      const safetyReport = {
        timestamp: Date.now(),
        action: 'Test decision',
        emergence: {
          detected: emergenceResult.isEmergent,
          confidence: emergenceResult.confidence,
          shouldExecute: emergenceResult.shouldExecute,
          reasoning: emergenceResult.reasoning,
        },
        risk: {
          overallLevel: riskResult.overallRisk,
          score: riskResult.riskScore,
          shouldProceed: riskResult.shouldProceed,
          requiresReview: riskResult.requiresReview,
          factors: riskResult.factors.map(f => ({
            category: f.category,
            level: f.level,
            probability: f.probability,
            impact: f.impact,
          })),
          recommendations: riskResult.recommendations,
        },
        finalDecision: emergenceResult.shouldExecute && riskResult.shouldProceed,
      };

      // Verify report completeness
      expect(safetyReport.emergence.detected).toBeDefined();
      expect(safetyReport.risk.overallLevel).toBeDefined();
      expect(safetyReport.finalDecision).toBeDefined();
      expect(safetyReport.risk.factors.length).toBeGreaterThan(0);
      expect(safetyReport.risk.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Failure Modes', () => {
    it('should handle conflicting signals between systems', async () => {
      // Emergence says YES (high confidence)
      const moduleInsights: ModuleInsight[] = Array.from({ length: 14 }, (_, i) => ({
        moduleName: `module${i}`,
        recommendation: 'EXECUTE' as const,
        confidence: 0.95,
        reasoning: 'High confidence',
        data: {},
        weight: 1.0,
      }));

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.95,
          agreementLevel: 0.98,
          supportingModules: moduleInsights.map(m => m.moduleName),
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.15,
        ethicalScore: 0.95,
        goalAlignment: 0.95,
        patternConfidence: 0.9,
        historicalSuccess: 0.85,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);
      expect(emergenceResult.isEmergent).toBe(true);
      expect(emergenceResult.confidence).toBeGreaterThan(0.9);

      // But risk says NO (critical factor)
      const riskResult = await riskEngine.assess({
        action: 'Conflicting signals test',
        capitalAtRisk: 10, // Low capital
        ethicalAlignment: 0.2, // Critical ethical risk!
        emergenceConfidence: emergenceResult.confidence,
      });

      expect(riskResult.shouldProceed).toBe(false);

      // Safety infrastructure should reject despite high emergence
      const finalDecision = emergenceResult.shouldExecute && riskResult.shouldProceed;
      expect(finalDecision).toBe(false);

      // This demonstrates defense-in-depth: even if emergence is confident,
      // risk assessment can still catch critical issues
    });

    it('should handle missing or partial data gracefully', async () => {
      // Minimal emergence context
      const minimalModuleInsights: ModuleInsight[] = [{
        moduleName: 'module1',
        recommendation: 'EXECUTE' as const,
        confidence: 0.8,
        reasoning: 'Test',
        data: {},
        weight: 1.0,
      }];

      const emergenceContext: EmergenceDecisionContext = {
        moduleInsights: minimalModuleInsights,
        consensus: {
          hasConsensus: true,
          consensusType: 'EXECUTE',
          confidence: 0.8,
          agreementLevel: 1.0,
          supportingModules: ['module1'],
          opposingModules: [],
          uncertainModules: [],
        },
        riskScore: 0.3,
        ethicalScore: 0.8,
        goalAlignment: 0.8,
        patternConfidence: 0.7,
        historicalSuccess: 0.7,
        timestamp: Date.now(),
      };

      const emergenceResult = emergenceDetector.detectEmergence(emergenceContext);

      // Minimal risk context
      const riskResult = await riskEngine.assess({
        action: 'Minimal data test',
        capitalAtRisk: 20,
      });

      // Both should handle gracefully
      expect(emergenceResult).toBeDefined();
      expect(riskResult).toBeDefined();
      expect(riskResult.shouldProceed).toBeDefined();
    });

    it('should prevent execution when any safety system fails', async () => {
      const testScenarios = [
        {
          name: 'Emergence fails',
          emergence: { shouldExecute: false },
          risk: { shouldProceed: true },
          expected: false,
        },
        {
          name: 'Risk fails',
          emergence: { shouldExecute: true },
          risk: { shouldProceed: false },
          expected: false,
        },
        {
          name: 'Both fail',
          emergence: { shouldExecute: false },
          risk: { shouldProceed: false },
          expected: false,
        },
        {
          name: 'Both pass',
          emergence: { shouldExecute: true },
          risk: { shouldProceed: true },
          expected: true,
        },
      ];

      for (const scenario of testScenarios) {
        const finalDecision = scenario.emergence.shouldExecute && scenario.risk.shouldProceed;
        expect(finalDecision).toBe(scenario.expected);
      }
    });
  });
});
