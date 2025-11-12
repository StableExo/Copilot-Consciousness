/**
 * Opportunity Scorer & Ranker
 * 
 * Adapted from AxionCitadel ArbitrageOpportunity for generalized opportunity
 * evaluation, scoring, and ranking.
 * 
 * Features:
 * - Multi-criteria evaluation with configurable weights
 * - Value calculation considering costs and risks
 * - Multiple ranking algorithms (score-based, TOPSIS, etc.)
 * - Risk-adjusted scoring integration
 */

import {
  Opportunity,
  OpportunityStatus,
  OpportunityRanking,
  MultiCriteriaEvaluation,
  OpportunityScoringConfig,
  ValueCalculationParams,
  RiskAdjustmentParams,
  OpportunityComparison
} from './types/opportunity';
import {
  scoreOpportunity,
  topsis,
  rankByScore,
  riskAdjustedScore,
  ScoringCriterion,
  ScoringMethod
} from './utils/scorer';

/**
 * Opportunity scorer statistics
 */
export interface OpportunityScorerStats {
  opportunitiesScored: number;
  opportunitiesRanked: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
}

/**
 * Opportunity Scorer & Ranker Engine
 * 
 * Evaluates and ranks opportunities based on multiple criteria.
 */
export class OpportunityScorer {
  private config: Required<OpportunityScoringConfig>;
  private stats: OpportunityScorerStats;

  constructor(config: Partial<OpportunityScoringConfig> = {}) {
    this.config = {
      criteria: config.criteria || {
        value: { weight: 0.3, type: 'maximize' },
        cost: { weight: 0.2, type: 'minimize' },
        risk: { weight: 0.25, type: 'minimize' },
        time: { weight: 0.15, type: 'minimize' },
        complexity: { weight: 0.1, type: 'minimize' }
      },
      scoringMethod: config.scoringMethod || 'weighted-sum',
      normalization: config.normalization !== false,
      riskAdjustment: config.riskAdjustment !== false
    };

    this.stats = {
      opportunitiesScored: 0,
      opportunitiesRanked: 0,
      avgScore: 0,
      highestScore: 0,
      lowestScore: Infinity
    };
  }

  /**
   * Score a single opportunity
   */
  scoreOpportunity(opportunity: Opportunity): Opportunity {
    // Prepare criteria for scoring
    const criteria = this.prepareCriteria();

    // Calculate base score
    const baseScore = scoreOpportunity(opportunity, criteria, this.config.scoringMethod);

    // Apply risk adjustment if enabled
    let finalScore = baseScore;
    if (this.config.riskAdjustment) {
      finalScore = riskAdjustedScore(baseScore, opportunity.risk);
    }

    // Update statistics
    this.stats.opportunitiesScored++;
    this.updateScoreStats(finalScore);

    // Return updated opportunity
    return {
      ...opportunity,
      score: finalScore,
      status: OpportunityStatus.EVALUATED
    };
  }

  /**
   * Score multiple opportunities
   */
  scoreOpportunities(opportunities: Opportunity[]): Opportunity[] {
    return opportunities.map(opp => this.scoreOpportunity(opp));
  }

  /**
   * Rank opportunities
   */
  rankOpportunities(opportunities: Opportunity[]): Opportunity[] {
    // Score all opportunities first
    const scored = this.scoreOpportunities(opportunities);

    // Rank by score
    const ranked = rankByScore(scored, opp => opp.score);

    // Update with rank information
    const result = ranked.map(({ item, rank, score }) => ({
      ...item,
      rank,
      score,
      status: OpportunityStatus.EVALUATED
    }));

    this.stats.opportunitiesRanked += result.length;

    return result;
  }

  /**
   * Perform multi-criteria evaluation
   */
  multiCriteriaEvaluation(opportunity: Opportunity): MultiCriteriaEvaluation {
    const criteria = this.prepareCriteria();
    const criteriaScores: Record<string, number> = {};
    const normalizedScores: Record<string, number> = {};
    const weightedScores: Record<string, number> = {};

    // Calculate scores for each criterion
    for (const criterion of criteria) {
      const value = opportunity.criteria[criterion.name] || 
                    this.getOpportunityValue(opportunity, criterion.name);
      criteriaScores[criterion.name] = value;
    }

    // Normalize scores if enabled
    if (this.config.normalization) {
      for (const criterion of criteria) {
        const value = criteriaScores[criterion.name];
        // Simple normalization: assume values are already in reasonable range
        normalizedScores[criterion.name] = value;
      }
    } else {
      Object.assign(normalizedScores, criteriaScores);
    }

    // Calculate weighted scores
    let totalScore = 0;
    for (const criterion of criteria) {
      const normalized = normalizedScores[criterion.name];
      const weighted = normalized * criterion.weight;
      weightedScores[criterion.name] = weighted;
      
      // Apply type (maximize/minimize)
      if (criterion.type === 'minimize') {
        totalScore -= weighted;
      } else {
        totalScore += weighted;
      }
    }

    return {
      opportunity,
      criteriaScores,
      normalizedScores,
      weightedScores,
      totalScore: Math.max(0, totalScore)
    };
  }

  /**
   * Rank opportunities using TOPSIS method
   */
  rankWithTOPSIS(opportunities: Opportunity[]): OpportunityRanking {
    const criteria = this.prepareCriteria();

    // Prepare alternatives (opportunities as records)
    const alternatives = opportunities.map(opp => {
      const record: Record<string, number> = {};
      for (const criterion of criteria) {
        record[criterion.name] = this.getOpportunityValue(opp, criterion.name);
      }
      return record;
    });

    // Calculate TOPSIS scores
    const scores = topsis(alternatives, criteria);

    // Create ranked list
    const rankedOpps = opportunities.map((opp, index) => ({
      ...opp,
      score: scores[index],
      status: OpportunityStatus.EVALUATED
    }));

    // Sort by score descending
    rankedOpps.sort((a, b) => b.score - a.score);

    // Assign ranks
    rankedOpps.forEach((opp, index) => {
      opp.rank = index + 1;
    });

    this.stats.opportunitiesRanked += rankedOpps.length;

    return {
      opportunities: rankedOpps,
      method: 'topsis',
      criteria: criteria.map(c => c.name),
      scores,
      normalized: true,
      metadata: {
        timestamp: new Date(),
        totalOpportunities: opportunities.length
      }
    };
  }

  /**
   * Calculate expected value of an opportunity
   */
  calculateExpectedValue(
    opportunity: Opportunity,
    params: Partial<ValueCalculationParams> = {}
  ): number {
    const baseValue = params.baseValue || opportunity.value;
    const costs = params.costs || { base: opportunity.cost };
    const risks = params.risks || { base: opportunity.risk };
    const timeFactors = params.timeFactors || { realizationTime: opportunity.timeToRealize };

    // Calculate total costs
    const totalCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

    // Calculate risk-adjusted value
    const avgRisk = Object.values(risks).reduce((sum, risk) => sum + risk, 0) / Object.values(risks).length;
    const riskAdjustment = 1 - avgRisk;

    // Calculate time value adjustment (discount future value)
    const avgTime = Object.values(timeFactors).reduce((sum, time) => sum + time, 0) / Object.values(timeFactors).length;
    const discountRate = params.discountRate || 0.1;
    const timeAdjustment = 1 / (1 + discountRate * avgTime);

    // Expected value = (base value - costs) * risk adjustment * time adjustment
    const expectedValue = (baseValue - totalCosts) * riskAdjustment * timeAdjustment;

    return Math.max(0, expectedValue);
  }

  /**
   * Calculate risk-adjusted value
   */
  calculateRiskAdjustedValue(
    opportunity: Opportunity,
    params: Partial<RiskAdjustmentParams> = {}
  ): number {
    const riskFreeRate = params.riskFreeRate || 0.02;
    const riskPremium = params.riskPremium || 0.05;
    const volatility = params.volatility || opportunity.risk;
    const timeHorizon = params.timeHorizon || opportunity.timeToRealize;
    const confidenceLevel = params.confidenceLevel || 0.95;

    // Calculate required return based on risk
    const requiredReturn = riskFreeRate + riskPremium * volatility;

    // Discount value based on required return and time
    const discountFactor = 1 / Math.pow(1 + requiredReturn, timeHorizon);

    // Adjust for confidence level (higher confidence = less adjustment)
    const confidenceAdjustment = confidenceLevel;

    const riskAdjustedValue = opportunity.value * discountFactor * confidenceAdjustment;

    return Math.max(0, riskAdjustedValue);
  }

  /**
   * Compare two opportunities
   */
  compareOpportunities(opp1: Opportunity, opp2: Opportunity): OpportunityComparison {
    const scored1 = this.scoreOpportunity(opp1);
    const scored2 = this.scoreOpportunity(opp2);

    const winner = scored1.score > scored2.score ? scored1 : scored2;

    const differentials: Record<string, number> = {
      score: scored1.score - scored2.score,
      value: opp1.value - opp2.value,
      cost: opp1.cost - opp2.cost,
      risk: opp1.risk - opp2.risk,
      complexity: opp1.complexity - opp2.complexity
    };

    const reasoning: string[] = [];
    if (Math.abs(differentials.score) < 0.1) {
      reasoning.push('Opportunities are very similar in overall score');
    } else {
      reasoning.push(`${winner === scored1 ? 'First' : 'Second'} opportunity scores higher`);
    }

    if (differentials.value > 0) {
      reasoning.push('First opportunity has higher value');
    } else if (differentials.value < 0) {
      reasoning.push('Second opportunity has higher value');
    }

    if (differentials.risk < 0) {
      reasoning.push('First opportunity has lower risk');
    } else if (differentials.risk > 0) {
      reasoning.push('Second opportunity has lower risk');
    }

    return {
      opportunities: [scored1, scored2],
      winner,
      differentials,
      reasoning
    };
  }

  /**
   * Prepare scoring criteria from config
   */
  private prepareCriteria(): ScoringCriterion[] {
    return Object.entries(this.config.criteria).map(([name, config]) => ({
      name,
      weight: config.weight,
      type: config.type
    }));
  }

  /**
   * Get value from opportunity for a specific criterion
   */
  private getOpportunityValue(opportunity: Opportunity, criterion: string): number {
    // Check if value exists in criteria
    if (opportunity.criteria[criterion] !== undefined) {
      return opportunity.criteria[criterion];
    }

    // Map criterion to opportunity properties
    const mapping: Record<string, keyof Opportunity> = {
      value: 'value',
      cost: 'cost',
      risk: 'risk',
      time: 'timeToRealize',
      complexity: 'complexity'
    };

    const property = mapping[criterion];
    if (property && opportunity[property] !== undefined) {
      return opportunity[property] as number;
    }

    return 0;
  }

  /**
   * Update score statistics
   */
  private updateScoreStats(score: number): void {
    this.stats.highestScore = Math.max(this.stats.highestScore, score);
    this.stats.lowestScore = Math.min(this.stats.lowestScore, score);
    
    // Update average
    const total = this.stats.avgScore * (this.stats.opportunitiesScored - 1) + score;
    this.stats.avgScore = total / this.stats.opportunitiesScored;
  }

  /**
   * Get statistics
   */
  getStats(): OpportunityScorerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      opportunitiesScored: 0,
      opportunitiesRanked: 0,
      avgScore: 0,
      highestScore: 0,
      lowestScore: Infinity
    };
  }
}
