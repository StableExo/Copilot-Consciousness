/**
 * Scorer Utility
 * 
 * Provides scoring and ranking functions for multi-criteria decision making.
 */

import { Opportunity } from '../types/opportunity';
import { Path } from '../types/path';

/**
 * Scoring method type
 */
export type ScoringMethod = 
  | 'weighted-sum'
  | 'weighted-product'
  | 'topsis'
  | 'promethee';

/**
 * Criterion for scoring
 */
export interface ScoringCriterion {
  name: string;
  weight: number;
  type: 'maximize' | 'minimize';
}

/**
 * Calculate weighted sum score
 */
export function weightedSum(
  values: Record<string, number>,
  criteria: ScoringCriterion[]
): number {
  let score = 0;
  
  for (const criterion of criteria) {
    const value = values[criterion.name] || 0;
    const normalizedValue = criterion.type === 'minimize' ? -value : value;
    score += normalizedValue * criterion.weight;
  }
  
  return score;
}

/**
 * Calculate weighted product score
 */
export function weightedProduct(
  values: Record<string, number>,
  criteria: ScoringCriterion[]
): number {
  let score = 1;
  
  for (const criterion of criteria) {
    const value = values[criterion.name] || 1;
    const normalizedValue = criterion.type === 'minimize' ? 1 / value : value;
    score *= Math.pow(normalizedValue, criterion.weight);
  }
  
  return score;
}

/**
 * Normalize values using min-max normalization
 */
export function normalizeValues(
  allValues: Record<string, number>[],
  criterion: string
): number[] {
  const values = allValues.map(v => v[criterion] || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (min === max) return values.map(() => 0.5);
  
  return values.map(v => (v - min) / (max - min));
}

/**
 * TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)
 */
export function topsis(
  alternatives: Record<string, number>[],
  criteria: ScoringCriterion[]
): number[] {
  // Normalize decision matrix
  const normalized: number[][] = [];
  for (const criterion of criteria) {
    const values = alternatives.map(alt => alt[criterion.name] || 0);
    const sumSquares = values.reduce((sum, v) => sum + v * v, 0);
    const norm = Math.sqrt(sumSquares);
    
    normalized.push(norm === 0 ? values : values.map(v => v / norm));
  }
  
  // Calculate weighted normalized matrix
  const weighted: number[][] = normalized.map((col, i) => 
    col.map(v => v * criteria[i].weight)
  );
  
  // Determine ideal and negative-ideal solutions
  const ideal: number[] = [];
  const negativeIdeal: number[] = [];
  
  for (let i = 0; i < criteria.length; i++) {
    const values = weighted[i];
    if (criteria[i].type === 'maximize') {
      ideal.push(Math.max(...values));
      negativeIdeal.push(Math.min(...values));
    } else {
      ideal.push(Math.min(...values));
      negativeIdeal.push(Math.max(...values));
    }
  }
  
  // Calculate separation measures
  const scores: number[] = [];
  for (let alt = 0; alt < alternatives.length; alt++) {
    let distIdeal = 0;
    let distNegIdeal = 0;
    
    for (let crit = 0; crit < criteria.length; crit++) {
      const value = weighted[crit][alt];
      distIdeal += Math.pow(value - ideal[crit], 2);
      distNegIdeal += Math.pow(value - negativeIdeal[crit], 2);
    }
    
    distIdeal = Math.sqrt(distIdeal);
    distNegIdeal = Math.sqrt(distNegIdeal);
    
    // Calculate relative closeness to ideal solution
    const score = distNegIdeal / (distIdeal + distNegIdeal);
    scores.push(isNaN(score) ? 0 : score);
  }
  
  return scores;
}

/**
 * Rank items by their scores (descending)
 */
export function rankByScore<T>(
  items: T[],
  getScore: (item: T) => number
): Array<{ item: T; rank: number; score: number }> {
  const itemsWithScores = items.map(item => ({
    item,
    score: getScore(item)
  }));
  
  // Sort by score descending
  itemsWithScores.sort((a, b) => b.score - a.score);
  
  // Assign ranks (handle ties)
  const ranked = itemsWithScores.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
  
  return ranked;
}

/**
 * Calculate percentile rank for a value
 */
export function percentileRank(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  
  if (index === -1) return 100;
  if (index === 0) return 0;
  
  return (index / sorted.length) * 100;
}

/**
 * Calculate risk-adjusted score
 */
export function riskAdjustedScore(
  baseScore: number,
  risk: number,
  riskTolerance: number = 1.0
): number {
  // Higher risk reduces the score more for risk-averse agents
  const riskPenalty = risk * (1 / riskTolerance);
  return baseScore * (1 - riskPenalty);
}

/**
 * Score opportunity using configured method
 */
export function scoreOpportunity(
  opportunity: Opportunity,
  criteria: ScoringCriterion[],
  method: ScoringMethod = 'weighted-sum'
): number {
  const values = opportunity.criteria;
  
  switch (method) {
    case 'weighted-sum':
      return weightedSum(values, criteria);
    case 'weighted-product':
      return weightedProduct(values, criteria);
    default:
      return weightedSum(values, criteria);
  }
}

/**
 * Score path using configured method
 */
export function scorePath(
  path: Path,
  criteria: ScoringCriterion[],
  method: ScoringMethod = 'weighted-sum'
): number {
  const values: Record<string, number> = {
    cost: path.totalCost,
    time: path.totalTime,
    risk: path.totalRisk
  };
  
  switch (method) {
    case 'weighted-sum':
      return weightedSum(values, criteria);
    case 'weighted-product':
      return weightedProduct(values, criteria);
    default:
      return weightedSum(values, criteria);
  }
}
