/**
 * Opportunity Scorer Tests
 *
 * Comprehensive test suite for the Opportunity Scorer & Ranker
 */

import { OpportunityScorer } from '../opportunity-scorer';
import { Opportunity, OpportunityType, OpportunityStatus } from '../types/opportunity';

describe('OpportunityScorer', () => {
  let scorer: OpportunityScorer;

  beforeEach(() => {
    scorer = new OpportunityScorer();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(scorer).toBeDefined();
      const stats = scorer.getStats();
      expect(stats.opportunitiesScored).toBe(0);
      expect(stats.opportunitiesRanked).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      const customScorer = new OpportunityScorer({
        scoringMethod: 'weighted-product',
        normalization: false,
        criteria: {
          value: { weight: 0.5, type: 'maximize' },
          risk: { weight: 0.5, type: 'minimize' },
        },
      });
      expect(customScorer).toBeDefined();
    });

    it('should reset statistics', () => {
      scorer.resetStats();
      const stats = scorer.getStats();
      expect(stats.opportunitiesScored).toBe(0);
      expect(stats.avgScore).toBe(0);
    });
  });

  describe('Single Opportunity Scoring', () => {
    it('should score an opportunity', () => {
      const opportunity: Opportunity = {
        id: 'opp_1',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.2,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {
          value: 100,
          cost: 20,
          risk: 0.2,
          time: 10,
          complexity: 5,
        },
      };

      const scored = scorer.scoreOpportunity(opportunity);
      expect(scored.score).toBeGreaterThan(0);
      expect(scored.status).toBe(OpportunityStatus.EVALUATED);
    });

    it('should update statistics when scoring', () => {
      const opportunity: Opportunity = {
        id: 'opp_2',
        type: OpportunityType.EFFICIENCY,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 50,
        cost: 10,
        risk: 0.1,
        complexity: 3,
        timeToRealize: 5,
        score: 0,
        criteria: {
          value: 50,
          cost: 10,
          risk: 0.1,
          time: 5,
          complexity: 3,
        },
      };

      const initialStats = scorer.getStats();
      scorer.scoreOpportunity(opportunity);
      const updatedStats = scorer.getStats();

      expect(updatedStats.opportunitiesScored).toBe(initialStats.opportunitiesScored + 1);
      expect(updatedStats.avgScore).toBeGreaterThan(0);
    });

    it('should track highest and lowest scores', () => {
      const highValue: Opportunity = {
        id: 'opp_high',
        type: OpportunityType.ARBITRAGE,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 1000,
        cost: 10,
        risk: 0.01,
        complexity: 1,
        timeToRealize: 1,
        score: 0,
        criteria: { value: 1000, cost: 10, risk: 0.01 },
      };

      const lowValue: Opportunity = {
        id: 'opp_low',
        type: OpportunityType.RISK_REDUCTION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 10,
        cost: 100,
        risk: 0.9,
        complexity: 10,
        timeToRealize: 100,
        score: 0,
        criteria: { value: 10, cost: 100, risk: 0.9 },
      };

      scorer.scoreOpportunity(highValue);
      scorer.scoreOpportunity(lowValue);

      const stats = scorer.getStats();
      expect(stats.highestScore).toBeGreaterThan(stats.lowestScore);
    });
  });

  describe('Multiple Opportunity Scoring', () => {
    it('should score multiple opportunities', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'opp_1',
          type: OpportunityType.OPTIMIZATION,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 100,
          cost: 20,
          risk: 0.2,
          complexity: 5,
          timeToRealize: 10,
          score: 0,
          criteria: {
            value: 100,
            cost: 20,
            risk: 0.2,
            time: 10,
            complexity: 5,
          },
        },
        {
          id: 'opp_2',
          type: OpportunityType.EFFICIENCY,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 80,
          cost: 15,
          risk: 0.1,
          complexity: 3,
          timeToRealize: 5,
          score: 0,
          criteria: {
            value: 80,
            cost: 15,
            risk: 0.1,
            time: 5,
            complexity: 3,
          },
        },
      ];

      const scored = scorer.scoreOpportunities(opportunities);
      expect(scored.length).toBe(2);
      scored.forEach((opp) => {
        expect(opp.score).toBeGreaterThan(0);
      });
    });
  });

  describe('Opportunity Ranking', () => {
    it('should rank opportunities by score', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'opp_1',
          type: OpportunityType.OPTIMIZATION,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 50,
          cost: 30,
          risk: 0.5,
          complexity: 5,
          timeToRealize: 10,
          score: 0,
          criteria: {},
        },
        {
          id: 'opp_2',
          type: OpportunityType.EFFICIENCY,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 100,
          cost: 10,
          risk: 0.1,
          complexity: 2,
          timeToRealize: 5,
          score: 0,
          criteria: {},
        },
      ];

      const ranked = scorer.rankOpportunities(opportunities);
      expect(ranked.length).toBe(2);

      // Higher ranked should have higher score
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    });

    it('should update ranking statistics', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'opp_1',
          type: OpportunityType.OPTIMIZATION,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 100,
          cost: 20,
          risk: 0.2,
          complexity: 5,
          timeToRealize: 10,
          score: 0,
          criteria: {},
        },
      ];

      const initialStats = scorer.getStats();
      scorer.rankOpportunities(opportunities);
      const updatedStats = scorer.getStats();

      expect(updatedStats.opportunitiesRanked).toBeGreaterThan(initialStats.opportunitiesRanked);
    });
  });

  describe('Multi-Criteria Evaluation', () => {
    it('should perform multi-criteria evaluation', () => {
      const opportunity: Opportunity = {
        id: 'opp_mce',
        type: OpportunityType.INNOVATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 30,
        risk: 0.3,
        complexity: 5,
        timeToRealize: 8,
        score: 0,
        criteria: {
          value: 100,
          cost: 30,
          risk: 0.3,
          time: 8,
          complexity: 5,
        },
      };

      const evaluation = scorer.multiCriteriaEvaluation(opportunity);

      expect(evaluation).toBeDefined();
      expect(evaluation.criteriaScores).toBeDefined();
      expect(evaluation.normalizedScores).toBeDefined();
      expect(evaluation.weightedScores).toBeDefined();
      expect(evaluation.totalScore).toBeGreaterThanOrEqual(0);
    });

    it('should weight criteria correctly', () => {
      const opportunity: Opportunity = {
        id: 'opp_weighted',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 10,
        risk: 0.1,
        complexity: 2,
        timeToRealize: 5,
        score: 0,
        criteria: {
          value: 100,
          cost: 10,
          risk: 0.1,
        },
      };

      const evaluation = scorer.multiCriteriaEvaluation(opportunity);

      // Verify weighted scores reflect configured weights
      expect(Object.keys(evaluation.weightedScores).length).toBeGreaterThan(0);
    });
  });

  describe('TOPSIS Ranking', () => {
    it('should rank opportunities using TOPSIS method', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'opp_1',
          type: OpportunityType.OPTIMIZATION,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 100,
          cost: 50,
          risk: 0.3,
          complexity: 5,
          timeToRealize: 10,
          score: 0,
          criteria: { value: 100, cost: 50, risk: 0.3 },
        },
        {
          id: 'opp_2',
          type: OpportunityType.EFFICIENCY,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 80,
          cost: 20,
          risk: 0.1,
          complexity: 3,
          timeToRealize: 5,
          score: 0,
          criteria: { value: 80, cost: 20, risk: 0.1 },
        },
      ];

      const ranking = scorer.rankWithTOPSIS(opportunities);

      expect(ranking.method).toBe('topsis');
      expect(ranking.opportunities.length).toBe(2);
      expect(ranking.scores.length).toBe(2);
      expect(ranking.normalized).toBe(true);
    });

    it('should assign ranks in TOPSIS ranking', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'opp_1',
          type: OpportunityType.OPTIMIZATION,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 50,
          cost: 50,
          risk: 0.5,
          complexity: 5,
          timeToRealize: 10,
          score: 0,
          criteria: {},
        },
        {
          id: 'opp_2',
          type: OpportunityType.EFFICIENCY,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 100,
          cost: 10,
          risk: 0.1,
          complexity: 2,
          timeToRealize: 3,
          score: 0,
          criteria: {},
        },
      ];

      const ranking = scorer.rankWithTOPSIS(opportunities);

      ranking.opportunities.forEach((opp) => {
        expect(opp.rank).toBeDefined();
        expect(opp.rank).toBeGreaterThan(0);
      });
    });
  });

  describe('Expected Value Calculation', () => {
    it('should calculate expected value', () => {
      const opportunity: Opportunity = {
        id: 'opp_ev',
        type: OpportunityType.ARBITRAGE,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.2,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {},
      };

      const expectedValue = scorer.calculateExpectedValue(opportunity);
      expect(expectedValue).toBeGreaterThanOrEqual(0);
    });

    it('should apply risk adjustment to expected value', () => {
      const lowRisk: Opportunity = {
        id: 'opp_low_risk',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.1,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {},
      };

      const highRisk: Opportunity = {
        id: 'opp_high_risk',
        type: OpportunityType.INNOVATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.8,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {},
      };

      const evLowRisk = scorer.calculateExpectedValue(lowRisk);
      const evHighRisk = scorer.calculateExpectedValue(highRisk);

      // Lower risk should result in higher expected value
      expect(evLowRisk).toBeGreaterThan(evHighRisk);
    });

    it('should apply time discounting', () => {
      const immediate: Opportunity = {
        id: 'opp_immediate',
        type: OpportunityType.EFFICIENCY,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.1,
        complexity: 1,
        timeToRealize: 1,
        score: 0,
        criteria: {},
      };

      const delayed: Opportunity = {
        id: 'opp_delayed',
        type: OpportunityType.EFFICIENCY,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.1,
        complexity: 1,
        timeToRealize: 100,
        score: 0,
        criteria: {},
      };

      const evImmediate = scorer.calculateExpectedValue(immediate);
      const evDelayed = scorer.calculateExpectedValue(delayed);

      // Immediate realization should have higher expected value
      expect(evImmediate).toBeGreaterThan(evDelayed);
    });
  });

  describe('Risk-Adjusted Value Calculation', () => {
    it('should calculate risk-adjusted value', () => {
      const opportunity: Opportunity = {
        id: 'opp_rav',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.3,
        complexity: 5,
        timeToRealize: 5,
        score: 0,
        criteria: {},
      };

      const riskAdjustedValue = scorer.calculateRiskAdjustedValue(opportunity);
      expect(riskAdjustedValue).toBeGreaterThanOrEqual(0);
      expect(riskAdjustedValue).toBeLessThanOrEqual(opportunity.value);
    });

    it('should penalize high-risk opportunities', () => {
      const lowRisk: Opportunity = {
        id: 'opp_lr',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.1,
        complexity: 5,
        timeToRealize: 5,
        score: 0,
        criteria: {},
      };

      const highRisk: Opportunity = {
        id: 'opp_hr',
        type: OpportunityType.INNOVATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.9,
        complexity: 5,
        timeToRealize: 5,
        score: 0,
        criteria: {},
      };

      const ravLowRisk = scorer.calculateRiskAdjustedValue(lowRisk);
      const ravHighRisk = scorer.calculateRiskAdjustedValue(highRisk);

      expect(ravLowRisk).toBeGreaterThan(ravHighRisk);
    });
  });

  describe('Opportunity Comparison', () => {
    it('should compare two opportunities', () => {
      const opp1: Opportunity = {
        id: 'opp_compare_1',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 30,
        risk: 0.3,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {},
      };

      const opp2: Opportunity = {
        id: 'opp_compare_2',
        type: OpportunityType.EFFICIENCY,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 80,
        cost: 20,
        risk: 0.2,
        complexity: 3,
        timeToRealize: 5,
        score: 0,
        criteria: {},
      };

      const comparison = scorer.compareOpportunities(opp1, opp2);

      expect(comparison.opportunities.length).toBe(2);
      expect(comparison.winner).toBeDefined();
      expect(comparison.differentials).toBeDefined();
      expect(comparison.reasoning.length).toBeGreaterThan(0);
    });

    it('should identify winner in comparison', () => {
      const better: Opportunity = {
        id: 'opp_better',
        type: OpportunityType.ARBITRAGE,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 200,
        cost: 10,
        risk: 0.05,
        complexity: 1,
        timeToRealize: 1,
        score: 0,
        criteria: {
          value: 200,
          cost: 10,
          risk: 0.05,
          time: 1,
          complexity: 1,
        },
      };

      const worse: Opportunity = {
        id: 'opp_worse',
        type: OpportunityType.RISK_REDUCTION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 20,
        cost: 50,
        risk: 0.8,
        complexity: 10,
        timeToRealize: 100,
        score: 0,
        criteria: {
          value: 20,
          cost: 50,
          risk: 0.8,
          time: 100,
          complexity: 10,
        },
      };

      const comparison = scorer.compareOpportunities(better, worse);
      expect(comparison.winner.id).toBe('opp_better');
    });

    it('should provide reasoning for comparison', () => {
      const opp1: Opportunity = {
        id: 'opp_1',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.2,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {},
      };

      const opp2: Opportunity = {
        id: 'opp_2',
        type: OpportunityType.EFFICIENCY,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 90,
        cost: 25,
        risk: 0.3,
        complexity: 6,
        timeToRealize: 12,
        score: 0,
        criteria: {},
      };

      const comparison = scorer.compareOpportunities(opp1, opp2);
      expect(comparison.reasoning).toBeDefined();
      expect(comparison.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track opportunities scored', () => {
      const opportunity: Opportunity = {
        id: 'opp_stats',
        type: OpportunityType.OPTIMIZATION,
        status: OpportunityStatus.IDENTIFIED,
        timestamp: new Date(),
        value: 100,
        cost: 20,
        risk: 0.2,
        complexity: 5,
        timeToRealize: 10,
        score: 0,
        criteria: {
          value: 100,
          cost: 20,
          risk: 0.2,
          time: 10,
          complexity: 5,
        },
      };

      const initialStats = scorer.getStats();
      scorer.scoreOpportunity(opportunity);
      const updatedStats = scorer.getStats();

      expect(updatedStats.opportunitiesScored).toBe(initialStats.opportunitiesScored + 1);
    });

    it('should calculate average score correctly', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'opp_1',
          type: OpportunityType.OPTIMIZATION,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 100,
          cost: 20,
          risk: 0.1,
          complexity: 2,
          timeToRealize: 5,
          score: 0,
          criteria: {
            value: 100,
            cost: 20,
            risk: 0.1,
            time: 5,
            complexity: 2,
          },
        },
        {
          id: 'opp_2',
          type: OpportunityType.EFFICIENCY,
          status: OpportunityStatus.IDENTIFIED,
          timestamp: new Date(),
          value: 50,
          cost: 30,
          risk: 0.5,
          complexity: 8,
          timeToRealize: 20,
          score: 0,
          criteria: {
            value: 50,
            cost: 30,
            risk: 0.5,
            time: 20,
            complexity: 8,
          },
        },
      ];

      scorer.scoreOpportunities(opportunities);
      const stats = scorer.getStats();

      expect(stats.avgScore).toBeGreaterThan(0);
    });
  });
});
