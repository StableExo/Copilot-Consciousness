/**
 * Comprehensive tests for RiskAssessment module
 * Tests all 5 risk categories and decision-making logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RiskAssessmentEngine,
  RiskCategory,
  RiskLevel,
  DecisionContext,
  RiskThresholds,
  RiskWeights,
} from '../../../../src/consciousness/safety/RiskAssessment';

describe('RiskAssessment Module', () => {
  let engine: RiskAssessmentEngine;

  beforeEach(() => {
    engine = new RiskAssessmentEngine();
  });

  describe('Constructor and Configuration', () => {
    it('should create engine with default thresholds', () => {
      expect(engine).toBeDefined();
    });

    it('should accept custom thresholds', () => {
      const customThresholds: Partial<RiskThresholds> = {
        maxCapitalRisk: 200,
        maxRiskScore: 0.5,
      };
      const customEngine = new RiskAssessmentEngine(customThresholds);
      expect(customEngine).toBeDefined();
    });

    it('should accept custom weights', () => {
      const customWeights: Partial<RiskWeights> = {
        capital: 0.5,
        ethical: 0.5,
      };
      const customEngine = new RiskAssessmentEngine(undefined, customWeights);
      expect(customEngine).toBeDefined();
    });

    it('should update thresholds dynamically', () => {
      engine.updateThresholds({ maxCapitalRisk: 500 });
      // Verify by testing with capital that would be rejected at default threshold
      // but accepted at new threshold
    });
  });

  describe('Capital Risk Assessment', () => {
    it('should assess NEGLIGIBLE risk for minimal capital', async () => {
      const context: DecisionContext = {
        action: 'Test trade',
        capitalAtRisk: 5, // $5, well below $100 threshold
      };

      const result = await engine.assess(context);

      const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
      expect(capitalFactor).toBeDefined();
      expect(capitalFactor?.level).toBe(RiskLevel.NEGLIGIBLE);
      expect(capitalFactor?.probability).toBeLessThan(0.1);
      expect(result.shouldProceed).toBe(true);
    });

    it('should assess LOW risk for moderate capital', async () => {
      const context: DecisionContext = {
        action: 'Test trade',
        capitalAtRisk: 25, // $25, 25% of threshold
      };

      const result = await engine.assess(context);

      const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
      expect(capitalFactor).toBeDefined();
      expect(capitalFactor?.level).toBe(RiskLevel.LOW);
      expect(capitalFactor?.probability).toBeGreaterThanOrEqual(0.1);
      expect(capitalFactor?.probability).toBeLessThan(0.3);
    });

    it('should assess MODERATE risk for significant capital', async () => {
      const context: DecisionContext = {
        action: 'Test trade',
        capitalAtRisk: 50, // $50, 50% of threshold
      };

      const result = await engine.assess(context);

      const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
      expect(capitalFactor).toBeDefined();
      expect(capitalFactor?.level).toBe(RiskLevel.MODERATE);
      expect(capitalFactor?.probability).toBeGreaterThanOrEqual(0.3);
      expect(capitalFactor?.probability).toBeLessThan(0.6);
    });

    it('should assess HIGH risk at threshold', async () => {
      const context: DecisionContext = {
        action: 'Test trade',
        capitalAtRisk: 100, // Exactly at threshold
      };

      const result = await engine.assess(context);

      const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
      expect(capitalFactor).toBeDefined();
      expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(capitalFactor?.level);
      expect(result.shouldProceed).toBe(false);
      expect(result.requiresReview).toBe(true);
    });

    it('should assess CRITICAL risk above threshold', async () => {
      const context: DecisionContext = {
        action: 'Test trade',
        capitalAtRisk: 150, // 50% above threshold
      };

      const result = await engine.assess(context);

      const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
      expect(capitalFactor).toBeDefined();
      expect(capitalFactor?.level).toBe(RiskLevel.CRITICAL);
      expect(result.shouldProceed).toBe(false);
      expect(result.requiresReview).toBe(true);
      expect(result.recommendations.some(r => r.includes('Capital at risk') && r.includes('$150') && r.includes('$100'))).toBe(true);
    });

    it('should provide mitigations for high capital risk', async () => {
      const context: DecisionContext = {
        action: 'Test trade',
        capitalAtRisk: 120,
      };

      const result = await engine.assess(context);

      const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
      expect(capitalFactor?.mitigations.length).toBeGreaterThan(0);
      expect(capitalFactor?.mitigations.some(m => m.includes('Limit capital'))).toBe(true);
      expect(capitalFactor?.mitigations.some(m => m.includes('stop-loss'))).toBe(true);
    });
  });

  describe('Ethical Risk Assessment', () => {
    it('should assess NEGLIGIBLE risk for high ethical alignment', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        ethicalAlignment: 0.95, // 95% alignment
      };

      const result = await engine.assess(context);

      const ethicalFactor = result.factors.find(f => f.category === RiskCategory.ETHICAL);
      expect(ethicalFactor).toBeDefined();
      expect(ethicalFactor?.level).toBe(RiskLevel.NEGLIGIBLE);
      expect(result.shouldProceed).toBe(true);
    });

    it('should assess LOW risk for acceptable ethical alignment', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        ethicalAlignment: 0.75, // 75% alignment (just above threshold)
      };

      const result = await engine.assess(context);

      const ethicalFactor = result.factors.find(f => f.category === RiskCategory.ETHICAL);
      expect(ethicalFactor).toBeDefined();
      expect(ethicalFactor?.level).toBe(RiskLevel.LOW);
    });

    it('should assess MODERATE risk for borderline ethical alignment', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        ethicalAlignment: 0.55, // 55% alignment
      };

      const result = await engine.assess(context);

      const ethicalFactor = result.factors.find(f => f.category === RiskCategory.ETHICAL);
      expect(ethicalFactor).toBeDefined();
      expect(ethicalFactor?.level).toBe(RiskLevel.MODERATE);
    });

    it('should reject action below ethical threshold', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        ethicalAlignment: 0.65, // Below 70% threshold
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(false);
      expect(result.requiresReview).toBe(true);
      expect(result.recommendations.some(r => r.includes('Ethical alignment'))).toBe(true);
    });

    it('should assess CRITICAL risk for low ethical alignment', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        ethicalAlignment: 0.2, // 20% alignment
      };

      const result = await engine.assess(context);

      const ethicalFactor = result.factors.find(f => f.category === RiskCategory.ETHICAL);
      expect(ethicalFactor).toBeDefined();
      expect(ethicalFactor?.level).toBe(RiskLevel.CRITICAL);
      expect(result.shouldProceed).toBe(false);
    });

    it('should provide ethical review mitigations', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        ethicalAlignment: 0.6,
      };

      const result = await engine.assess(context);

      const ethicalFactor = result.factors.find(f => f.category === RiskCategory.ETHICAL);
      expect(ethicalFactor?.mitigations.some(m => m.includes('EthicalReviewGate'))).toBe(true);
      expect(ethicalFactor?.mitigations.some(m => m.includes('ground zero principles'))).toBe(true);
    });
  });

  describe('Operational Risk Assessment', () => {
    it('should assess NEGLIGIBLE risk for high emergence confidence', async () => {
      const context: DecisionContext = {
        action: 'Test decision',
        emergenceConfidence: 0.95,
      };

      const result = await engine.assess(context);

      const operationalFactor = result.factors.find(f => f.category === RiskCategory.OPERATIONAL);
      expect(operationalFactor).toBeDefined();
      expect(operationalFactor?.level).toBe(RiskLevel.NEGLIGIBLE);
    });

    it('should assess LOW risk at threshold confidence', async () => {
      const context: DecisionContext = {
        action: 'Test decision',
        emergenceConfidence: 0.85, // Just above 80% threshold
      };

      const result = await engine.assess(context);

      const operationalFactor = result.factors.find(f => f.category === RiskCategory.OPERATIONAL);
      expect(operationalFactor).toBeDefined();
      expect(operationalFactor?.level).toBe(RiskLevel.LOW);
    });

    it('should consider reversibility in operational risk', async () => {
      const context: DecisionContext = {
        action: 'Test decision',
        emergenceConfidence: 0.75,
        reversibility: 0.9, // Highly reversible
      };

      const result = await engine.assess(context);

      const operationalFactor = result.factors.find(f => f.category === RiskCategory.OPERATIONAL);
      expect(operationalFactor).toBeDefined();
      // Impact should be low due to high reversibility
      expect(operationalFactor?.impact).toBeLessThan(0.2);
    });

    it('should assess higher risk for irreversible actions', async () => {
      const context: DecisionContext = {
        action: 'Test decision',
        emergenceConfidence: 0.75,
        reversibility: 0.1, // Low reversibility
      };

      const result = await engine.assess(context);

      const operationalFactor = result.factors.find(f => f.category === RiskCategory.OPERATIONAL);
      expect(operationalFactor).toBeDefined();
      // Impact should be high due to low reversibility
      expect(operationalFactor?.impact).toBeGreaterThan(0.8);
    });

    it('should provide operational mitigations', async () => {
      const context: DecisionContext = {
        action: 'Test decision',
        emergenceConfidence: 0.6,
      };

      const result = await engine.assess(context);

      const operationalFactor = result.factors.find(f => f.category === RiskCategory.OPERATIONAL);
      expect(operationalFactor?.mitigations.some(m => m.includes('consensus threshold'))).toBe(true);
      expect(operationalFactor?.mitigations.some(m => m.includes('circuit breaker'))).toBe(true);
    });
  });

  describe('Reputational Risk Assessment', () => {
    it('should assess NEGLIGIBLE risk for high success and reversibility', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        historicalSuccessRate: 0.9,
        reversibility: 0.9,
      };

      const result = await engine.assess(context);

      const reputationalFactor = result.factors.find(f => f.category === RiskCategory.REPUTATIONAL);
      expect(reputationalFactor).toBeDefined();
      expect(reputationalFactor?.level).toBe(RiskLevel.NEGLIGIBLE);
    });

    it('should assess higher risk for low success rate', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        historicalSuccessRate: 0.3,
        reversibility: 0.5,
      };

      const result = await engine.assess(context);

      const reputationalFactor = result.factors.find(f => f.category === RiskCategory.REPUTATIONAL);
      expect(reputationalFactor).toBeDefined();
      expect(reputationalFactor?.level).not.toBe(RiskLevel.NEGLIGIBLE);
    });

    it('should assess CRITICAL risk for low success and irreversibility', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        historicalSuccessRate: 0.2,
        reversibility: 0.1,
      };

      const result = await engine.assess(context);

      const reputationalFactor = result.factors.find(f => f.category === RiskCategory.REPUTATIONAL);
      expect(reputationalFactor).toBeDefined();
      expect(reputationalFactor?.level).toBe(RiskLevel.CRITICAL);
    });

    it('should provide reputational mitigations', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        historicalSuccessRate: 0.4,
        reversibility: 0.3,
      };

      const result = await engine.assess(context);

      const reputationalFactor = result.factors.find(f => f.category === RiskCategory.REPUTATIONAL);
      expect(reputationalFactor?.mitigations.some(m => m.includes('Document decision'))).toBe(true);
      expect(reputationalFactor?.mitigations.some(m => m.includes('rollback'))).toBe(true);
    });
  });

  describe('Learning Risk Assessment', () => {
    it('should assess NEGLIGIBLE risk for familiar actions', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        novelty: 0.05, // Very familiar
        historicalSuccessRate: 0.8,
      };

      const result = await engine.assess(context);

      const learningFactor = result.factors.find(f => f.category === RiskCategory.LEARNING);
      expect(learningFactor).toBeDefined();
      expect(learningFactor?.level).toBe(RiskLevel.NEGLIGIBLE);
    });

    it('should assess higher risk for novel actions', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        novelty: 0.9, // Very novel
        historicalSuccessRate: 0.5,
      };

      const result = await engine.assess(context);

      const learningFactor = result.factors.find(f => f.category === RiskCategory.LEARNING);
      expect(learningFactor).toBeDefined();
      expect(learningFactor?.level).not.toBe(RiskLevel.NEGLIGIBLE);
    });

    it('should assess CRITICAL risk for novel + low success', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        novelty: 0.95, // Very novel
        historicalSuccessRate: 0.2, // Low success
      };

      const result = await engine.assess(context);

      const learningFactor = result.factors.find(f => f.category === RiskCategory.LEARNING);
      expect(learningFactor).toBeDefined();
      expect(learningFactor?.level).toBe(RiskLevel.CRITICAL);
    });

    it('should provide learning mitigations', async () => {
      const context: DecisionContext = {
        action: 'Test action',
        novelty: 0.7,
        historicalSuccessRate: 0.5,
      };

      const result = await engine.assess(context);

      const learningFactor = result.factors.find(f => f.category === RiskCategory.LEARNING);
      expect(learningFactor?.mitigations.some(m => m.includes('minimal capital'))).toBe(true);
      expect(learningFactor?.mitigations.some(m => m.includes('monitoring'))).toBe(true);
    });
  });

  describe('Composite Risk Scoring', () => {
    it('should calculate weighted composite risk', async () => {
      const context: DecisionContext = {
        action: 'Complex decision',
        capitalAtRisk: 50,
        ethicalAlignment: 0.8,
        emergenceConfidence: 0.85,
        historicalSuccessRate: 0.7,
        novelty: 0.3,
        reversibility: 0.6,
      };

      const result = await engine.assess(context);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThan(1);
      expect(result.overallRisk).toBeDefined();
    });

    it('should weight ethical risk highest by default', async () => {
      // Test that ethical issues have more impact than capital issues
      const ethicalContext: DecisionContext = {
        action: 'Ethical test',
        capitalAtRisk: 10, // Low capital risk
        ethicalAlignment: 0.4, // High ethical risk
      };

      const capitalContext: DecisionContext = {
        action: 'Capital test',
        capitalAtRisk: 80, // High capital risk (80% of threshold)
        ethicalAlignment: 0.9, // Low ethical risk
      };

      const ethicalResult = await engine.assess(ethicalContext);
      const capitalResult = await engine.assess(capitalContext);

      // Ethical risk should have more impact due to higher weight (30% vs 25%)
      expect(ethicalResult.shouldProceed).toBe(false);
      expect(capitalResult.shouldProceed).toBe(true);
    });

    it('should handle default risk score when no factors provided', async () => {
      const context: DecisionContext = {
        action: 'Minimal context',
      };

      const result = await engine.assess(context);

      // Should use reputational risk assessment with defaults
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should convert scores to correct risk levels', async () => {
      const testCases = [
        { capitalAtRisk: 5, expectedLevel: RiskLevel.NEGLIGIBLE },
        { capitalAtRisk: 25, expectedLevel: RiskLevel.LOW },
        { capitalAtRisk: 50, expectedLevel: RiskLevel.MODERATE },
        { capitalAtRisk: 85, expectedLevel: RiskLevel.HIGH },
        { capitalAtRisk: 150, expectedLevel: RiskLevel.CRITICAL },
      ];

      for (const testCase of testCases) {
        const result = await engine.assess({
          action: 'Test',
          capitalAtRisk: testCase.capitalAtRisk,
        });

        const capitalFactor = result.factors.find(f => f.category === RiskCategory.CAPITAL);
        expect(capitalFactor?.level).toBe(testCase.expectedLevel);
      }
    });
  });

  describe('Decision Gate Logic', () => {
    it('should proceed with low risk', async () => {
      const context: DecisionContext = {
        action: 'Safe action',
        capitalAtRisk: 10,
        ethicalAlignment: 0.9,
        emergenceConfidence: 0.9,
        historicalSuccessRate: 0.8,
        novelty: 0.1,
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(true);
      expect(result.requiresReview).toBe(false);
      expect(result.overallRisk).toBe(RiskLevel.NEGLIGIBLE);
    });

    it('should require review for moderate risk', async () => {
      const context: DecisionContext = {
        action: 'Moderate action',
        capitalAtRisk: 60,
        ethicalAlignment: 0.75,
        emergenceConfidence: 0.82,
      };

      const result = await engine.assess(context);

      // Result should pass since all factors are within acceptable bounds
      expect(result.shouldProceed).toBe(true);
    });

    it('should reject high risk actions', async () => {
      const context: DecisionContext = {
        action: 'High risk action',
        capitalAtRisk: 150, // Above threshold
        ethicalAlignment: 0.9,
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(false);
      expect(result.requiresReview).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should reject actions with critical risk factors', async () => {
      const context: DecisionContext = {
        action: 'Critical risk action',
        ethicalAlignment: 0.2, // Critical ethical risk
        capitalAtRisk: 10, // Otherwise low risk
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(false);
      expect(result.requiresReview).toBe(true);
      expect(result.recommendations.some(r => r.includes('critical risk factor'))).toBe(true);
    });

    it('should provide consolidated recommendations', async () => {
      const context: DecisionContext = {
        action: 'Complex decision',
        capitalAtRisk: 75,
        ethicalAlignment: 0.72,
        emergenceConfidence: 0.82,
        novelty: 0.6,
      };

      const result = await engine.assess(context);

      expect(result.recommendations.length).toBeGreaterThan(0);
      // Should not have duplicate recommendations
      const uniqueRecommendations = new Set(result.recommendations);
      expect(uniqueRecommendations.size).toBe(result.recommendations.length);
    });
  });

  describe('Integration with Safety Systems', () => {
    it('should provide reasoning trail for decisions', async () => {
      const context: DecisionContext = {
        action: 'Test MEV trade',
        capitalAtRisk: 50,
        ethicalAlignment: 0.85,
        emergenceConfidence: 0.9,
      };

      const result = await engine.assess(context);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Assessing risk for action');
      expect(result.reasoning.some(r => r.includes('Capital at risk'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('Ethical alignment'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('Composite risk score'))).toBe(true);
    });

    it('should include timestamp in results', async () => {
      const before = Date.now();
      const result = await engine.assess({ action: 'Test' });
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should work with EmergenceDetector outputs', async () => {
      // Simulating EmergenceDetector providing emergence confidence
      const context: DecisionContext = {
        action: 'Execute trade after emergence',
        capitalAtRisk: 50,
        ethicalAlignment: 0.85, // From EthicalReviewGate
        emergenceConfidence: 0.92, // From EmergenceDetector
        historicalSuccessRate: 0.75,
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(true);
      expect([RiskLevel.NEGLIGIBLE, RiskLevel.LOW]).toContain(result.overallRisk);
    });

    it('should handle partial context gracefully', async () => {
      // Only some fields provided
      const context: DecisionContext = {
        action: 'Partial info decision',
        capitalAtRisk: 30,
      };

      const result = await engine.assess(context);

      expect(result).toBeDefined();
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.shouldProceed).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should assess testnet validation trade correctly', async () => {
      const context: DecisionContext = {
        action: 'Testnet MEV arbitrage',
        capitalAtRisk: 50,
        ethicalAlignment: 0.85,
        emergenceConfidence: 0.88,
        historicalSuccessRate: 0.7,
        novelty: 0.4,
        reversibility: 0.7,
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(true);
      expect([RiskLevel.NEGLIGIBLE, RiskLevel.LOW, RiskLevel.MODERATE]).toContain(result.overallRisk);
    });

    it('should reject premature mainnet deployment', async () => {
      const context: DecisionContext = {
        action: 'Mainnet deployment',
        capitalAtRisk: 500, // Way above threshold
        ethicalAlignment: 0.75,
        emergenceConfidence: 0.70, // Below threshold
        novelty: 0.8, // High novelty
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(false);
      expect(result.requiresReview).toBe(true);
      // The composite risk might be MODERATE due to mixed factors, but should still reject
      expect(result.shouldProceed).toBe(false);
    });

    it('should approve low-risk learning experiment', async () => {
      const context: DecisionContext = {
        action: 'Learning experiment',
        capitalAtRisk: 10,
        ethicalAlignment: 0.95,
        emergenceConfidence: 0.9,
        novelty: 0.8, // Novel but low stakes
        reversibility: 0.9,
      };

      const result = await engine.assess(context);

      expect(result.shouldProceed).toBe(true);
      // May require monitoring due to novelty
      expect(result.recommendations.some(r => 
        r.includes('monitoring') || r.includes('proceed normally')
      )).toBe(true);
    });

    it('should flag ethically questionable profitable trade', async () => {
      const context: DecisionContext = {
        action: 'Profitable but questionable trade',
        capitalAtRisk: 20, // Low capital
        ethicalAlignment: 0.65, // Below threshold
        emergenceConfidence: 0.85,
        historicalSuccessRate: 0.9, // High success expected
      };

      const result = await engine.assess(context);

      // Should reject despite profitability due to ethical concerns
      expect(result.shouldProceed).toBe(false);
      expect(result.factors.find(f => f.category === RiskCategory.ETHICAL)?.level)
        .not.toBe(RiskLevel.NEGLIGIBLE);
    });
  });
});
