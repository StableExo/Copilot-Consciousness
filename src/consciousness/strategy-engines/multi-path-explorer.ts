/**
 * Multi-Path Explorer Engine
 *
 * Adapted from AxionCitadel TriangularArbEngine for generalized path finding
 * and route optimization in problem spaces.
 *
 * Features:
 * - Multi-hop path discovery from initial to goal state
 * - Route optimization based on multiple criteria
 * - Cyclic dependency detection
 * - Path validation and feasibility checking
 */

import {
  Path,
  PathStatus,
  PathExplorationConfig,
  PathFindingResult,
  OptimizationCriteria,
  CyclicPathInfo,
  PathValidationResult,
} from './types/path';
import { Node, Transition, ProblemSpace } from './types/problem-space';
import { buildGraph, Graph, getOutgoingEdges, detectCycle } from './utils/graph-builder';
import { scorePath, ScoringCriterion } from './utils/scorer';

/**
 * Path exploration statistics
 */
export interface PathExplorerStats {
  pathsExplored: number;
  pathsFound: number;
  cyclesDetected: number;
  avgPathLength: number;
  avgPathCost: number;
}

/**
 * Multi-Path Explorer Engine
 *
 * Finds and optimizes multiple solution paths through problem spaces.
 */
export class MultiPathExplorer {
  private config: Required<PathExplorationConfig>;
  private stats: PathExplorerStats;
  private graph?: Graph;

  constructor(config: Partial<PathExplorationConfig> = {}) {
    this.config = {
      maxPathLength: config.maxPathLength || 10,
      maxPathsToExplore: config.maxPathsToExplore || 1000,
      explorationStrategy: config.explorationStrategy || 'breadth-first',
      pruningEnabled: config.pruningEnabled !== false,
      cyclicDetection: config.cyclicDetection !== false,
      optimizationCriteria: config.optimizationCriteria || ['cost', 'time', 'risk'],
    };

    this.stats = {
      pathsExplored: 0,
      pathsFound: 0,
      cyclesDetected: 0,
      avgPathLength: 0,
      avgPathCost: 0,
    };
  }

  /**
   * Build internal graph representation from problem space
   */
  buildGraph(space: ProblemSpace): void {
    this.graph = buildGraph(space);
  }

  /**
   * Find all paths from start to goal node
   */
  async findPaths(params: {
    start: Node | string;
    goal: Node | string;
    space?: ProblemSpace;
    constraints?: Array<(path: Path) => boolean>;
  }): Promise<PathFindingResult> {
    const startTime = Date.now();

    // Build graph if space provided
    if (params.space) {
      this.buildGraph(params.space);
    }

    if (!this.graph) {
      throw new Error('Graph not built. Provide a problem space or call buildGraph first.');
    }

    const startId = typeof params.start === 'string' ? params.start : params.start.id;
    const goalId = typeof params.goal === 'string' ? params.goal : params.goal.id;

    let paths: Path[];

    switch (this.config.explorationStrategy) {
      case 'breadth-first':
        paths = this.breadthFirstSearch(startId, goalId);
        break;
      case 'depth-first':
        paths = this.depthFirstSearch(startId, goalId);
        break;
      case 'best-first':
        paths = this.bestFirstSearch(startId, goalId);
        break;
      case 'a-star':
        paths = this.aStarSearch(startId, goalId);
        break;
      default:
        paths = this.breadthFirstSearch(startId, goalId);
    }

    // Apply constraints if provided
    if (params.constraints) {
      paths = paths.filter((path) => params.constraints!.every((c) => c(path)));
    }

    // Find optimal path
    const optimalPath = paths.length > 0 ? this.selectOptimalPath(paths) : undefined;

    const timeMs = Date.now() - startTime;

    this.stats.pathsFound += paths.length;
    if (paths.length > 0) {
      this.stats.avgPathLength = paths.reduce((sum, p) => sum + p.nodes.length, 0) / paths.length;
      this.stats.avgPathCost = paths.reduce((sum, p) => sum + p.totalCost, 0) / paths.length;
    }

    return {
      paths,
      explored: this.stats.pathsExplored,
      pruned: 0,
      timeMs,
      optimalPath,
      metadata: {
        strategy: this.config.explorationStrategy,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Breadth-first search for paths
   */
  private breadthFirstSearch(startId: string, goalId: string): Path[] {
    const paths: Path[] = [];
    const queue: Array<{ nodeId: string; path: string[]; transitions: Transition[] }> = [
      { nodeId: startId, path: [startId], transitions: [] },
    ];

    while (queue.length > 0 && paths.length < this.config.maxPathsToExplore) {
      const current = queue.shift()!;
      this.stats.pathsExplored++;

      // Check if we reached the goal
      if (current.nodeId === goalId) {
        const path = this.constructPath(current.path, current.transitions);
        if (this.validatePath(path).isValid) {
          paths.push(path);
        }
        continue;
      }

      // Check path length limit
      if (current.path.length >= this.config.maxPathLength) {
        continue;
      }

      // Explore neighbors
      const edges = getOutgoingEdges(this.graph!, current.nodeId);
      for (const edge of edges) {
        // Avoid cycles if detection enabled
        if (this.config.cyclicDetection && current.path.includes(edge.to)) {
          continue;
        }

        queue.push({
          nodeId: edge.to,
          path: [...current.path, edge.to],
          transitions: [...current.transitions, edge.data!],
        });
      }
    }

    return paths;
  }

  /**
   * Depth-first search for paths
   */
  private depthFirstSearch(startId: string, goalId: string): Path[] {
    const paths: Path[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, path: string[], transitions: Transition[]): void => {
      if (paths.length >= this.config.maxPathsToExplore) return;
      if (path.length > this.config.maxPathLength) return;

      this.stats.pathsExplored++;

      if (nodeId === goalId) {
        const completePath = this.constructPath(path, transitions);
        if (this.validatePath(completePath).isValid) {
          paths.push(completePath);
        }
        return;
      }

      if (this.config.cyclicDetection) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
      }

      const edges = getOutgoingEdges(this.graph!, nodeId);
      for (const edge of edges) {
        if (!this.config.cyclicDetection || !visited.has(edge.to)) {
          dfs(edge.to, [...path, edge.to], [...transitions, edge.data!]);
        }
      }

      if (this.config.cyclicDetection) {
        visited.delete(nodeId);
      }
    };

    dfs(startId, [startId], []);
    return paths;
  }

  /**
   * Best-first search (greedy)
   */
  private bestFirstSearch(startId: string, goalId: string): Path[] {
    // Simplified best-first search
    // In full implementation, would use priority queue based on heuristic
    return this.breadthFirstSearch(startId, goalId);
  }

  /**
   * A* search algorithm
   */
  private aStarSearch(startId: string, goalId: string): Path[] {
    // Simplified A* implementation
    // In full implementation, would use f(n) = g(n) + h(n)
    return this.breadthFirstSearch(startId, goalId);
  }

  /**
   * Construct Path object from node IDs and transitions
   */
  private constructPath(nodeIds: string[], transitions: Transition[]): Path {
    const nodes = nodeIds.map((id) => this.graph!.nodes.get(id)!).filter((n) => n);

    const totalCost = transitions.reduce((sum, t) => sum + t.cost, 0);
    const totalTime = transitions.reduce((sum, t) => sum + t.time, 0);
    const totalRisk = transitions.reduce((sum, t) => sum + t.risk, 0);

    return {
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodes,
      transitions,
      totalCost,
      totalTime,
      totalRisk,
      score: 0, // Will be calculated later
      status: PathStatus.VALID,
      metadata: {
        createdAt: new Date(),
      },
    };
  }

  /**
   * Optimize a path based on criteria
   */
  optimizePath(path: Path, criteria: OptimizationCriteria[]): Path {
    // Calculate score based on criteria
    const scoringCriteria: ScoringCriterion[] = criteria.map((c) => ({
      name: c.criterion,
      weight: c.weight,
      type: c.type,
    }));

    const score = scorePath(path, scoringCriteria);

    return {
      ...path,
      score,
      status: score > 0.7 ? PathStatus.OPTIMAL : PathStatus.SUBOPTIMAL,
    };
  }

  /**
   * Select optimal path from multiple paths
   */
  private selectOptimalPath(paths: Path[]): Path {
    if (paths.length === 0) {
      throw new Error('No paths to select from');
    }

    // Default optimization: minimize cost, time, and risk equally
    const criteria: OptimizationCriteria[] = [
      { criterion: 'cost', weight: 0.33, type: 'minimize' },
      { criterion: 'time', weight: 0.33, type: 'minimize' },
      { criterion: 'risk', weight: 0.34, type: 'minimize' },
    ];

    const optimizedPaths = paths.map((p) => this.optimizePath(p, criteria));

    // Return path with highest score
    return optimizedPaths.reduce((best, current) => (current.score > best.score ? current : best));
  }

  /**
   * Validate a path
   */
  validatePath(path: Path): PathValidationResult {
    const violations: string[] = [];

    // Check path length
    if (path.nodes.length > this.config.maxPathLength) {
      violations.push(
        `Path length ${path.nodes.length} exceeds maximum ${this.config.maxPathLength}`
      );
    }

    // Check for cycles
    if (this.config.cyclicDetection) {
      const nodeIds = path.nodes.map((n) => n.id);
      const uniqueIds = new Set(nodeIds);
      if (uniqueIds.size !== nodeIds.length) {
        violations.push('Path contains cycles');
      }
    }

    // Check transitions match nodes
    if (path.transitions.length !== path.nodes.length - 1) {
      violations.push('Transitions count does not match node count');
    }

    const isValid = violations.length === 0;
    const status = isValid ? PathStatus.VALID : PathStatus.INVALID;

    return {
      isValid,
      status,
      violations,
      score: isValid ? path.score : 0,
      suggestions: isValid ? [] : ['Consider shorter path', 'Remove cycles'],
    };
  }

  /**
   * Detect if a path contains cycles
   */
  detectCycle(path: Path): CyclicPathInfo {
    const nodeIds = path.nodes.map((n) => n.id);
    const seen = new Map<string, number>();

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      if (seen.has(nodeId)) {
        const cycleStart = seen.get(nodeId)!;
        return {
          isCyclic: true,
          cycleStart: nodeId,
          cycleNodes: nodeIds.slice(cycleStart, i + 1),
          cycleLength: i - cycleStart + 1,
        };
      }
      seen.set(nodeId, i);
    }

    return { isCyclic: false };
  }

  /**
   * Detect cycles in the entire graph
   */
  detectGraphCycles(): string[][] {
    if (!this.graph) return [];

    const cycle = detectCycle(this.graph);
    if (cycle) {
      this.stats.cyclesDetected++;
      return [cycle];
    }

    return [];
  }

  /**
   * Get engine statistics
   */
  getStats(): PathExplorerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      pathsExplored: 0,
      pathsFound: 0,
      cyclesDetected: 0,
      avgPathLength: 0,
      avgPathCost: 0,
    };
  }
}
