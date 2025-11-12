/**
 * Strategy Engines - Main Exports
 * 
 * Multi-Engine Strategy System for Copilot-Consciousness
 * Provides advanced spatial reasoning, pattern recognition, and 
 * multi-path problem-solving capabilities.
 */

// Core Engines
export { SpatialReasoningEngine } from './spatial-reasoning';
export type {
  SpatialReasoningConfig,
  SpatialReasoningStats
} from './spatial-reasoning';

export { MultiPathExplorer } from './multi-path-explorer';
export type {
  PathExplorerStats
} from './multi-path-explorer';

export { OpportunityScorer } from './opportunity-scorer';
export type {
  OpportunityScorerStats
} from './opportunity-scorer';

export { PatternRecognitionEngine } from './pattern-recognition';
export type {
  PatternRecognitionStats
} from './pattern-recognition';

// Type Exports
export type {
  // Problem Space Types
  ProblemSpace,
  Node,
  Transition,
  Constraint,
  ConstraintType,
  DimensionalAnalysis,
  SpatialCluster,
  ProblemSpaceAnalysis
} from './types/problem-space';

export type {
  // Path Types
  Path,
  PathStatus,
  PathExplorationConfig,
  PathFindingResult,
  OptimizationCriteria,
  CyclicPathInfo,
  PathValidationResult,
  RouteSegment,
  PathComparison
} from './types/path';

export type {
  // Opportunity Types
  Opportunity,
  OpportunityType,
  OpportunityStatus,
  OpportunityRanking,
  MultiCriteriaEvaluation,
  OpportunityScoringConfig,
  ValueCalculationParams,
  RiskAdjustmentParams,
  OpportunityComparison,
  EvaluationCriterion
} from './types/opportunity';

export type {
  // Pattern Types
  Pattern,
  PatternCategory,
  MatchConfidence,
  PatternMatch,
  PatternLibrary,
  PatternLearningResult,
  PatternEvolutionConfig,
  CompositePattern,
  PatternRecommendation,
  PatternMatchingConfig,
  PatternAnalytics,
  PatternContext,
  Condition,
  Action
} from './types/pattern';

// Utility Exports
export {
  calculateDistance,
  euclideanDistance,
  manhattanDistance,
  chebyshevDistance,
  minkowskiDistance,
  cosineSimilarity,
  cosineDistance,
  normalizeVector,
  minMaxNormalize,
  standardize
} from './utils/distance-calculator';
export type { DistanceMetric } from './utils/distance-calculator';

export {
  buildGraph,
  addEdge,
  getNeighbors,
  getOutgoingEdges,
  hasPath,
  findShortestPath,
  detectCycle,
  calculateConnectivity
} from './utils/graph-builder';
export type { Graph, GraphEdge } from './utils/graph-builder';

export {
  weightedSum,
  weightedProduct,
  normalizeValues,
  topsis,
  rankByScore,
  percentileRank,
  riskAdjustedScore,
  scoreOpportunity,
  scorePath
} from './utils/scorer';
export type {
  ScoringMethod,
  ScoringCriterion
} from './utils/scorer';
