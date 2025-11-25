/**
 * Problem Space Type Definitions
 * 
 * Core types for modeling multi-dimensional problem spaces,
 * nodes, constraints, and relationships.
 */

/**
 * Constraint types for problem spaces
 */
export enum ConstraintType {
  HARD = 'hard',           // Must be satisfied
  SOFT = 'soft',           // Should be satisfied
  PREFERENCE = 'preference' // Nice to have
}

/**
 * Constraint definition
 */
export interface Constraint {
  id: string;
  type: ConstraintType;
  description: string;
  weight: number;
  validate: (context: any) => boolean;
  metadata?: Record<string, any>;
}

/**
 * Node in the problem space
 */
export interface Node {
  id: string;
  type: string;
  properties: Record<string, any>;
  position: number[]; // Position in n-dimensional space
  connections?: string[]; // IDs of connected nodes
  metadata?: Record<string, any>;
}

/**
 * State transition in problem solving
 */
export interface Transition {
  id: string;
  from: string; // Source node ID
  to: string;   // Target node ID
  cost: number;
  time: number;
  risk: number;
  conditions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Multi-dimensional problem space
 */
export interface ProblemSpace {
  id: string;
  dimensions: string[];
  nodes: Node[];
  transitions?: Transition[];
  constraints: Constraint[];
  metadata?: Record<string, any>;
}

/**
 * Dimensional analysis result
 */
export interface DimensionalAnalysis {
  dimension: string;
  min: number;
  max: number;
  mean: number;
  variance: number;
  distribution: number[];
}

/**
 * Spatial cluster in problem space
 */
export interface SpatialCluster {
  id: string;
  centroid: number[];
  nodes: Node[];
  radius: number;
  density: number;
  metadata?: Record<string, any>;
}

/**
 * Problem space analysis result
 */
export interface ProblemSpaceAnalysis {
  space: ProblemSpace;
  dimensionalAnalyses: DimensionalAnalysis[];
  clusters: SpatialCluster[];
  connectivity: number; // Graph connectivity metric
  complexity: number;   // Problem complexity score
  feasibility: number;  // Feasibility score
  metadata?: Record<string, any>;
}
