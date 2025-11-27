/**
 * Path Type Definitions
 *
 * Types for path finding, route optimization, and multi-hop navigation
 * through problem spaces.
 */

import { Node, Transition } from './problem-space';

/**
 * Path validation status
 */
export enum PathStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  SUBOPTIMAL = 'suboptimal',
  OPTIMAL = 'optimal',
}

/**
 * Path through problem space
 */
export interface Path {
  id: string;
  nodes: Node[];
  transitions: Transition[];
  totalCost: number;
  totalTime: number;
  totalRisk: number;
  score: number;
  status: PathStatus;
  metadata?: Record<string, any>;
}

/**
 * Path exploration configuration
 */
export interface PathExplorationConfig {
  maxPathLength: number;
  maxPathsToExplore: number;
  explorationStrategy: 'breadth-first' | 'depth-first' | 'best-first' | 'a-star';
  pruningEnabled: boolean;
  cyclicDetection: boolean;
  optimizationCriteria: string[];
}

/**
 * Path optimization criteria
 */
export interface OptimizationCriteria {
  criterion: string;
  weight: number;
  type: 'minimize' | 'maximize';
}

/**
 * Path finding result
 */
export interface PathFindingResult {
  paths: Path[];
  explored: number;
  pruned: number;
  timeMs: number;
  optimalPath?: Path;
  metadata?: Record<string, any>;
}

/**
 * Route segment in a path
 */
export interface RouteSegment {
  from: Node;
  to: Node;
  transition: Transition;
  segmentCost: number;
  cumulativeCost: number;
}

/**
 * Cyclic path detection result
 */
export interface CyclicPathInfo {
  isCyclic: boolean;
  cycleStart?: string; // Node ID where cycle starts
  cycleNodes?: string[]; // Node IDs in the cycle
  cycleLength?: number;
}

/**
 * Path validation result
 */
export interface PathValidationResult {
  isValid: boolean;
  status: PathStatus;
  violations: string[];
  score: number;
  suggestions?: string[];
}

/**
 * Multi-path comparison result
 */
export interface PathComparison {
  paths: Path[];
  bestPath: Path;
  criteria: OptimizationCriteria[];
  scores: Record<string, number[]>;
  ranking: number[];
}
