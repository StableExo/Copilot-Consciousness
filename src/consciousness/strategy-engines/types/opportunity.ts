/**
 * Opportunity Type Definitions
 *
 * Types for opportunity detection, evaluation, scoring, and ranking
 * in multi-dimensional problem spaces.
 */

import { Path } from './path';
import { Node } from './problem-space';

/**
 * Opportunity type classification
 */
export enum OpportunityType {
  OPTIMIZATION = 'optimization',
  ARBITRAGE = 'arbitrage',
  INNOVATION = 'innovation',
  EFFICIENCY = 'efficiency',
  RISK_REDUCTION = 'risk_reduction',
}

/**
 * Opportunity status
 */
export enum OpportunityStatus {
  IDENTIFIED = 'identified',
  EVALUATED = 'evaluated',
  VALIDATED = 'validated',
  EXECUTING = 'executing',
  REALIZED = 'realized',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
}

/**
 * Evaluation criterion
 */
export interface EvaluationCriterion {
  name: string;
  weight: number;
  type: 'maximize' | 'minimize';
  scorer: (opportunity: Opportunity) => number;
}

/**
 * Opportunity in problem space
 */
export interface Opportunity {
  id: string;
  type: OpportunityType;
  status: OpportunityStatus;
  timestamp: Date;

  // Context
  nodes?: Node[];
  path?: Path;

  // Metrics
  value: number;
  cost: number;
  risk: number;
  complexity: number;
  timeToRealize: number;

  // Scoring
  score: number;
  rank?: number;
  criteria: Record<string, number>;

  // Risk-adjusted metrics
  riskAdjustedValue?: number;
  expectedValue?: number;
  confidenceLevel?: number;

  // Metadata
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Opportunity scoring configuration
 */
export interface OpportunityScoringConfig {
  criteria: Record<
    string,
    {
      weight: number;
      type: 'maximize' | 'minimize';
    }
  >;
  scoringMethod: 'weighted-sum' | 'weighted-product' | 'topsis' | 'promethee';
  normalization: boolean;
  riskAdjustment: boolean;
}

/**
 * Opportunity ranking result
 */
export interface OpportunityRanking {
  opportunities: Opportunity[];
  method: string;
  criteria: string[];
  scores: number[];
  normalized: boolean;
  metadata?: Record<string, any>;
}

/**
 * Multi-criteria evaluation result
 */
export interface MultiCriteriaEvaluation {
  opportunity: Opportunity;
  criteriaScores: Record<string, number>;
  normalizedScores: Record<string, number>;
  weightedScores: Record<string, number>;
  totalScore: number;
  rank?: number;
}

/**
 * Value calculation parameters
 */
export interface ValueCalculationParams {
  baseValue: number;
  costs: Record<string, number>;
  risks: Record<string, number>;
  timeFactors: Record<string, number>;
  discountRate?: number;
}

/**
 * Risk-adjusted scoring parameters
 */
export interface RiskAdjustmentParams {
  riskFreeRate: number;
  riskPremium: number;
  volatility: number;
  timeHorizon: number;
  confidenceLevel: number;
}

/**
 * Opportunity comparison result
 */
export interface OpportunityComparison {
  opportunities: Opportunity[];
  winner: Opportunity;
  differentials: Record<string, number>;
  reasoning: string[];
}
