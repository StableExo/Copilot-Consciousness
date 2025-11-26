/**
 * Pattern Type Definitions
 *
 * Types for pattern recognition, learning, evolution, and composition
 * in decision-making systems.
 */

import { Node } from './problem-space';
import { Opportunity } from './opportunity';
import { Path } from './path';

/**
 * Pattern category
 */
export enum PatternCategory {
  STRUCTURAL = 'structural',
  BEHAVIORAL = 'behavioral',
  TEMPORAL = 'temporal',
  SPATIAL = 'spatial',
  HYBRID = 'hybrid',
}

/**
 * Pattern match confidence level
 */
export enum MatchConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Condition for pattern matching
 */
export interface Condition {
  id: string;
  description: string;
  evaluate: (context: any) => boolean;
  weight: number;
}

/**
 * Action to take when pattern matches
 */
export interface Action {
  id: string;
  type: string;
  description: string;
  execute: (context: any) => Promise<any>;
  parameters?: Record<string, any>;
}

/**
 * Pattern definition
 */
export interface Pattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;

  // Pattern matching
  conditions: Condition[];
  requiredConfidence: MatchConfidence;

  // Pattern actions
  actions: Action[];

  // Learning metrics
  successRate: number;
  timesMatched: number;
  timesSucceeded: number;
  timesFailed: number;

  // Evolution tracking
  generation: number;
  parent?: string; // Parent pattern ID
  children?: string[]; // Child pattern IDs

  // Metadata
  createdAt: Date;
  lastUpdated: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  pattern: Pattern;
  confidence: MatchConfidence;
  matchScore: number;
  matchedConditions: string[];
  failedConditions: string[];
  context: any;
  timestamp: Date;
}

/**
 * Pattern library
 */
export interface PatternLibrary {
  patterns: Map<string, Pattern>;
  categories: Map<PatternCategory, string[]>;
  successRates: Map<string, number>;
  metadata?: Record<string, any>;
}

/**
 * Pattern learning result
 */
export interface PatternLearningResult {
  pattern: Pattern;
  improved: boolean;
  oldSuccessRate: number;
  newSuccessRate: number;
  adjustments: string[];
  generation: number;
}

/**
 * Pattern evolution configuration
 */
export interface PatternEvolutionConfig {
  mutationRate: number;
  crossoverRate: number;
  selectionPressure: number;
  elitismCount: number;
  populationSize: number;
  generations: number;
}

/**
 * Pattern composition result
 */
export interface CompositePattern {
  id: string;
  name: string;
  basePatterns: Pattern[];
  compositionStrategy: 'sequential' | 'parallel' | 'conditional' | 'hierarchical';
  conditions: Condition[];
  actions: Action[];
  metadata?: Record<string, any>;
}

/**
 * Pattern recommendation
 */
export interface PatternRecommendation {
  pattern: Pattern;
  confidence: MatchConfidence;
  reasoning: string[];
  expectedOutcome: string;
  risks: string[];
  alternatives?: Pattern[];
}

/**
 * Pattern matching configuration
 */
export interface PatternMatchingConfig {
  minConfidence: MatchConfidence;
  maxMatches: number;
  includePartialMatches: boolean;
  weightedScoring: boolean;
  contextWindow: number;
}

/**
 * Pattern analytics
 */
export interface PatternAnalytics {
  patternId: string;
  totalMatches: number;
  successfulMatches: number;
  failedMatches: number;
  averageConfidence: number;
  successRate: number;
  avgExecutionTime: number;
  lastUsed: Date;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Pattern context for matching
 */
export interface PatternContext {
  nodes?: Node[];
  opportunities?: Opportunity[];
  paths?: Path[];
  historicalData?: any[];
  environment?: Record<string, any>;
  timestamp: Date;
}
