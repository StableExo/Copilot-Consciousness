/**
 * Multi-Path Explorer Tests
 *
 * Comprehensive test suite for the Multi-Path Explorer Engine
 */

import { MultiPathExplorer } from '../multi-path-explorer';
import { ProblemSpace, Node } from '../types/problem-space';
import { PathStatus } from '../types/path';

describe('MultiPathExplorer', () => {
  let explorer: MultiPathExplorer;

  beforeEach(() => {
    explorer = new MultiPathExplorer();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(explorer).toBeDefined();
      const stats = explorer.getStats();
      expect(stats.pathsExplored).toBe(0);
      expect(stats.pathsFound).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      const customExplorer = new MultiPathExplorer({
        maxPathLength: 5,
        explorationStrategy: 'depth-first',
        cyclicDetection: false,
      });
      expect(customExplorer).toBeDefined();
    });

    it('should reset statistics', () => {
      explorer.resetStats();
      const stats = explorer.getStats();
      expect(stats.pathsExplored).toBe(0);
      expect(stats.cyclesDetected).toBe(0);
    });
  });

  describe('Graph Building', () => {
    it('should build graph from problem space', () => {
      const space: ProblemSpace = {
        id: 'test_graph_1',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1] },
          { id: 'n2', type: 'node', properties: {}, position: [2] },
        ],
        transitions: [{ id: 't1', from: 'n1', to: 'n2', cost: 1, time: 1, risk: 0.1 }],
        constraints: [],
      };

      expect(() => explorer.buildGraph(space)).not.toThrow();
    });

    it('should handle empty problem space', () => {
      const space: ProblemSpace = {
        id: 'test_graph_2',
        dimensions: [],
        nodes: [],
        constraints: [],
      };

      expect(() => explorer.buildGraph(space)).not.toThrow();
    });
  });

  describe('Path Finding - Breadth First Search', () => {
    it('should find path from start to goal', async () => {
      const space: ProblemSpace = {
        id: 'test_bfs_1',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'middle', type: 'node', properties: {}, position: [1] },
          { id: 'goal', type: 'node', properties: {}, position: [2] },
        ],
        transitions: [
          { id: 't1', from: 'start', to: 'middle', cost: 1, time: 1, risk: 0.1 },
          { id: 't2', from: 'middle', to: 'goal', cost: 1, time: 1, risk: 0.1 },
        ],
        constraints: [],
      };

      const result = await explorer.findPaths({
        start: 'start',
        goal: 'goal',
        space,
      });

      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.optimalPath).toBeDefined();
      expect(result.timeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no path exists', async () => {
      const space: ProblemSpace = {
        id: 'test_bfs_2',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'isolated', type: 'node', properties: {}, position: [1] },
        ],
        transitions: [],
        constraints: [],
      };

      const result = await explorer.findPaths({
        start: 'start',
        goal: 'isolated',
        space,
      });

      expect(result.paths.length).toBe(0);
      expect(result.optimalPath).toBeUndefined();
    });

    it('should find multiple paths when they exist', async () => {
      const space: ProblemSpace = {
        id: 'test_bfs_3',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'm1', type: 'node', properties: {}, position: [1] },
          { id: 'm2', type: 'node', properties: {}, position: [1] },
          { id: 'goal', type: 'node', properties: {}, position: [2] },
        ],
        transitions: [
          { id: 't1', from: 'start', to: 'm1', cost: 1, time: 1, risk: 0.1 },
          { id: 't2', from: 'start', to: 'm2', cost: 1, time: 1, risk: 0.1 },
          { id: 't3', from: 'm1', to: 'goal', cost: 1, time: 1, risk: 0.1 },
          { id: 't4', from: 'm2', to: 'goal', cost: 1, time: 1, risk: 0.1 },
        ],
        constraints: [],
      };

      const result = await explorer.findPaths({
        start: 'start',
        goal: 'goal',
        space,
      });

      expect(result.paths.length).toBeGreaterThan(1);
    });

    it('should respect maximum path length', async () => {
      const shortExplorer = new MultiPathExplorer({ maxPathLength: 2 });

      const space: ProblemSpace = {
        id: 'test_bfs_4',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [0] },
          { id: 'n2', type: 'node', properties: {}, position: [1] },
          { id: 'n3', type: 'node', properties: {}, position: [2] },
          { id: 'n4', type: 'node', properties: {}, position: [3] },
        ],
        transitions: [
          { id: 't1', from: 'n1', to: 'n2', cost: 1, time: 1, risk: 0.1 },
          { id: 't2', from: 'n2', to: 'n3', cost: 1, time: 1, risk: 0.1 },
          { id: 't3', from: 'n3', to: 'n4', cost: 1, time: 1, risk: 0.1 },
        ],
        constraints: [],
      };

      const result = await shortExplorer.findPaths({
        start: 'n1',
        goal: 'n4',
        space,
      });

      // Path is too long (4 nodes), should not be found
      expect(result.paths.length).toBe(0);
    });
  });

  describe('Path Finding - Depth First Search', () => {
    it('should find path using depth-first search', async () => {
      const dfsExplorer = new MultiPathExplorer({
        explorationStrategy: 'depth-first',
      });

      const space: ProblemSpace = {
        id: 'test_dfs_1',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'goal', type: 'node', properties: {}, position: [1] },
        ],
        transitions: [{ id: 't1', from: 'start', to: 'goal', cost: 1, time: 1, risk: 0.1 }],
        constraints: [],
      };

      const result = await dfsExplorer.findPaths({
        start: 'start',
        goal: 'goal',
        space,
      });

      expect(result.paths.length).toBeGreaterThan(0);
    });
  });

  describe('Path Validation', () => {
    it('should validate valid paths', () => {
      const space: ProblemSpace = {
        id: 'test_validate_1',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [0] },
          { id: 'n2', type: 'node', properties: {}, position: [1] },
        ],
        transitions: [{ id: 't1', from: 'n1', to: 'n2', cost: 1, time: 1, risk: 0.1 }],
        constraints: [],
      };

      explorer.buildGraph(space);

      const path = {
        id: 'path_1',
        nodes: [space.nodes[0], space.nodes[1]],
        transitions: [space.transitions![0]],
        totalCost: 1,
        totalTime: 1,
        totalRisk: 0.1,
        score: 0.8,
        status: PathStatus.VALID,
      };

      const validation = explorer.validatePath(path);
      expect(validation.isValid).toBe(true);
      expect(validation.violations.length).toBe(0);
    });

    it('should detect invalid paths exceeding max length', () => {
      const nodes = new Array(15).fill(0).map((_, i) => ({
        id: `n${i}`,
        type: 'node',
        properties: {},
        position: [i],
      }));

      const transitions = new Array(14).fill(0).map((_, i) => ({
        id: `t${i}`,
        from: `n${i}`,
        to: `n${i + 1}`,
        cost: 1,
        time: 1,
        risk: 0.1,
      }));

      const path = {
        id: 'path_2',
        nodes,
        transitions,
        totalCost: 14,
        totalTime: 14,
        totalRisk: 1.4,
        score: 0,
        status: PathStatus.VALID,
      };

      const validation = explorer.validatePath(path);
      expect(validation.isValid).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
    });

    it('should detect paths with cycles', () => {
      const nodes = [
        { id: 'n1', type: 'node', properties: {}, position: [0] },
        { id: 'n2', type: 'node', properties: {}, position: [1] },
        { id: 'n1', type: 'node', properties: {}, position: [2] },
      ];

      const transitions = [
        { id: 't1', from: 'n1', to: 'n2', cost: 1, time: 1, risk: 0.1 },
        { id: 't2', from: 'n2', to: 'n1', cost: 1, time: 1, risk: 0.1 },
      ];

      const path = {
        id: 'path_3',
        nodes,
        transitions,
        totalCost: 2,
        totalTime: 2,
        totalRisk: 0.2,
        score: 0,
        status: PathStatus.VALID,
      };

      const validation = explorer.validatePath(path);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect cycles in a path', () => {
      const nodes = [
        { id: 'n1', type: 'node', properties: {}, position: [0] },
        { id: 'n2', type: 'node', properties: {}, position: [1] },
        { id: 'n3', type: 'node', properties: {}, position: [2] },
        { id: 'n2', type: 'node', properties: {}, position: [3] },
      ];

      const transitions = [
        { id: 't1', from: 'n1', to: 'n2', cost: 1, time: 1, risk: 0.1 },
        { id: 't2', from: 'n2', to: 'n3', cost: 1, time: 1, risk: 0.1 },
        { id: 't3', from: 'n3', to: 'n2', cost: 1, time: 1, risk: 0.1 },
      ];

      const path = {
        id: 'path_4',
        nodes,
        transitions,
        totalCost: 3,
        totalTime: 3,
        totalRisk: 0.3,
        score: 0,
        status: PathStatus.VALID,
      };

      const cycleInfo = explorer.detectCycle(path);
      expect(cycleInfo.isCyclic).toBe(true);
      expect(cycleInfo.cycleStart).toBe('n2');
    });

    it('should not detect cycles in acyclic paths', () => {
      const nodes = [
        { id: 'n1', type: 'node', properties: {}, position: [0] },
        { id: 'n2', type: 'node', properties: {}, position: [1] },
        { id: 'n3', type: 'node', properties: {}, position: [2] },
      ];

      const transitions = [
        { id: 't1', from: 'n1', to: 'n2', cost: 1, time: 1, risk: 0.1 },
        { id: 't2', from: 'n2', to: 'n3', cost: 1, time: 1, risk: 0.1 },
      ];

      const path = {
        id: 'path_5',
        nodes,
        transitions,
        totalCost: 2,
        totalTime: 2,
        totalRisk: 0.2,
        score: 0,
        status: PathStatus.VALID,
      };

      const cycleInfo = explorer.detectCycle(path);
      expect(cycleInfo.isCyclic).toBe(false);
    });
  });

  describe('Path Optimization', () => {
    it('should optimize path with given criteria', () => {
      const path = {
        id: 'path_6',
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [0] },
          { id: 'n2', type: 'node', properties: {}, position: [1] },
        ],
        transitions: [{ id: 't1', from: 'n1', to: 'n2', cost: 5, time: 10, risk: 0.2 }],
        totalCost: 5,
        totalTime: 10,
        totalRisk: 0.2,
        score: 0,
        status: PathStatus.VALID,
      };

      const criteria = [
        { criterion: 'cost', weight: 0.5, type: 'minimize' as const },
        { criterion: 'time', weight: 0.3, type: 'minimize' as const },
        { criterion: 'risk', weight: 0.2, type: 'minimize' as const },
      ];

      const optimized = explorer.optimizePath(path, criteria);
      expect(optimized.score).toBeDefined();
      expect(optimized.status).toBeDefined();
    });
  });

  describe('Constraint Handling', () => {
    it('should apply path constraints', async () => {
      const space: ProblemSpace = {
        id: 'test_constraint_1',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'middle', type: 'node', properties: { risky: true }, position: [1] },
          { id: 'goal', type: 'node', properties: {}, position: [2] },
        ],
        transitions: [
          { id: 't1', from: 'start', to: 'middle', cost: 1, time: 1, risk: 0.1 },
          { id: 't2', from: 'middle', to: 'goal', cost: 1, time: 1, risk: 0.1 },
        ],
        constraints: [],
      };

      const constraints = [(path: any) => !path.nodes.some((n: Node) => n.properties.risky)];

      const result = await explorer.findPaths({
        start: 'start',
        goal: 'goal',
        space,
        constraints,
      });

      // Path goes through risky node, should be filtered out
      expect(result.paths.length).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track paths explored', async () => {
      const space: ProblemSpace = {
        id: 'test_stats_1',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'goal', type: 'node', properties: {}, position: [1] },
        ],
        transitions: [{ id: 't1', from: 'start', to: 'goal', cost: 1, time: 1, risk: 0.1 }],
        constraints: [],
      };

      const initialStats = explorer.getStats();
      await explorer.findPaths({ start: 'start', goal: 'goal', space });
      const updatedStats = explorer.getStats();

      expect(updatedStats.pathsExplored).toBeGreaterThan(initialStats.pathsExplored);
    });

    it('should track paths found', async () => {
      const space: ProblemSpace = {
        id: 'test_stats_2',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'goal', type: 'node', properties: {}, position: [1] },
        ],
        transitions: [{ id: 't1', from: 'start', to: 'goal', cost: 1, time: 1, risk: 0.1 }],
        constraints: [],
      };

      const initialStats = explorer.getStats();
      await explorer.findPaths({ start: 'start', goal: 'goal', space });
      const updatedStats = explorer.getStats();

      expect(updatedStats.pathsFound).toBeGreaterThan(initialStats.pathsFound);
    });

    it('should calculate average path metrics', async () => {
      const space: ProblemSpace = {
        id: 'test_stats_3',
        dimensions: ['x'],
        nodes: [
          { id: 'start', type: 'node', properties: {}, position: [0] },
          { id: 'middle', type: 'node', properties: {}, position: [1] },
          { id: 'goal', type: 'node', properties: {}, position: [2] },
        ],
        transitions: [
          { id: 't1', from: 'start', to: 'middle', cost: 1, time: 1, risk: 0.1 },
          { id: 't2', from: 'middle', to: 'goal', cost: 1, time: 1, risk: 0.1 },
        ],
        constraints: [],
      };

      await explorer.findPaths({ start: 'start', goal: 'goal', space });
      const stats = explorer.getStats();

      if (stats.pathsFound > 0) {
        expect(stats.avgPathLength).toBeGreaterThan(0);
        expect(stats.avgPathCost).toBeGreaterThan(0);
      }
    });
  });
});
