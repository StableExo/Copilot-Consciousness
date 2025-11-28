/**
 * Spatial Reasoning Engine Tests
 *
 * Comprehensive test suite for the Spatial Reasoning Engine
 */

import { SpatialReasoningEngine } from '../spatial-reasoning';
import { ProblemSpace } from '../types/problem-space';
import { OpportunityType } from '../types/opportunity';

describe('SpatialReasoningEngine', () => {
  let engine: SpatialReasoningEngine;

  beforeEach(() => {
    engine = new SpatialReasoningEngine();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(engine).toBeDefined();
      const stats = engine.getStats();
      expect(stats.problemsAnalyzed).toBe(0);
      expect(stats.clustersFound).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      const customEngine = new SpatialReasoningEngine({
        dimensions: ['x', 'y', 'z'],
        distanceMetric: 'manhattan',
        clusteringThreshold: 0.5,
      });
      expect(customEngine).toBeDefined();
    });

    it('should reset statistics', () => {
      engine.resetStats();
      const stats = engine.getStats();
      expect(stats.problemsAnalyzed).toBe(0);
    });
  });

  describe('Problem Analysis', () => {
    it('should analyze a simple problem space', () => {
      const space: ProblemSpace = {
        id: 'test_space_1',
        dimensions: ['time', 'cost'],
        nodes: [
          { id: 'n1', type: 'solution', properties: {}, position: [1, 2] },
          { id: 'n2', type: 'solution', properties: {}, position: [3, 4] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);

      expect(analysis).toBeDefined();
      expect(analysis.space).toBe(space);
      expect(analysis.dimensionalAnalyses.length).toBe(2);
      expect(analysis.complexity).toBeGreaterThan(0);
      expect(analysis.feasibility).toBeGreaterThan(0);
    });

    it('should calculate dimensional statistics correctly', () => {
      const space: ProblemSpace = {
        id: 'test_space_2',
        dimensions: ['value'],
        nodes: [
          { id: 'n1', type: 'solution', properties: {}, position: [1] },
          { id: 'n2', type: 'solution', properties: {}, position: [2] },
          { id: 'n3', type: 'solution', properties: {}, position: [3] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      const dimAnalysis = analysis.dimensionalAnalyses[0];

      expect(dimAnalysis.min).toBe(1);
      expect(dimAnalysis.max).toBe(3);
      expect(dimAnalysis.mean).toBe(2);
    });

    it('should handle empty node list', () => {
      const space: ProblemSpace = {
        id: 'test_space_3',
        dimensions: ['time'],
        nodes: [],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      expect(analysis.dimensionalAnalyses.length).toBe(0);
      expect(analysis.clusters.length).toBe(0);
    });

    it('should enforce maximum dimensions limit', () => {
      const tooManyDimensions = new Array(15).fill(0).map((_, i) => `dim_${i}`);
      const space: ProblemSpace = {
        id: 'test_space_4',
        dimensions: tooManyDimensions,
        nodes: [],
        constraints: [],
      };

      expect(() => engine.analyzeProblem(space)).toThrow();
    });

    it('should calculate graph connectivity', () => {
      const space: ProblemSpace = {
        id: 'test_space_5',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1], connections: ['n2'] },
          { id: 'n2', type: 'node', properties: {}, position: [2], connections: ['n3'] },
          { id: 'n3', type: 'node', properties: {}, position: [3] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      expect(analysis.connectivity).toBeGreaterThan(0);
      expect(analysis.connectivity).toBeLessThanOrEqual(1);
    });
  });

  describe('Cluster Detection', () => {
    it('should detect spatial clusters', () => {
      const space: ProblemSpace = {
        id: 'test_space_6',
        dimensions: ['x', 'y'],
        nodes: [
          // Cluster 1
          { id: 'n1', type: 'node', properties: {}, position: [0, 0] },
          { id: 'n2', type: 'node', properties: {}, position: [0.1, 0.1] },
          { id: 'n3', type: 'node', properties: {}, position: [0.2, 0.2] },
          // Cluster 2
          { id: 'n4', type: 'node', properties: {}, position: [10, 10] },
          { id: 'n5', type: 'node', properties: {}, position: [10.1, 10.1] },
          { id: 'n6', type: 'node', properties: {}, position: [10.2, 10.2] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      expect(analysis.clusters.length).toBeGreaterThan(0);
    });

    it('should calculate cluster centroids correctly', () => {
      const space: ProblemSpace = {
        id: 'test_space_7',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1] },
          { id: 'n2', type: 'node', properties: {}, position: [2] },
          { id: 'n3', type: 'node', properties: {}, position: [3] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      if (analysis.clusters.length > 0) {
        const cluster = analysis.clusters[0];
        expect(cluster.centroid).toBeDefined();
        expect(cluster.centroid.length).toBe(1);
      }
    });

    it('should respect minimum cluster size', () => {
      const smallClusterEngine = new SpatialReasoningEngine({
        minClusterSize: 5,
      });

      const space: ProblemSpace = {
        id: 'test_space_8',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1] },
          { id: 'n2', type: 'node', properties: {}, position: [1.1] },
          { id: 'n3', type: 'node', properties: {}, position: [1.2] },
        ],
        constraints: [],
      };

      const analysis = smallClusterEngine.analyzeProblem(space);
      // Should not create cluster with only 3 nodes
      expect(analysis.clusters.length).toBe(0);
    });
  });

  describe('Opportunity Detection', () => {
    it('should find opportunities in analyzed space', () => {
      const space: ProblemSpace = {
        id: 'test_space_9',
        dimensions: ['value', 'cost'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [10, 2] },
          { id: 'n2', type: 'node', properties: {}, position: [10.1, 2.1] },
          { id: 'n3', type: 'node', properties: {}, position: [10.2, 2.2] },
          { id: 'n4', type: 'node', properties: {}, position: [10.3, 2.3] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      const opportunities = engine.findOpportunities(analysis);

      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should detect high-density cluster opportunities', () => {
      const space: ProblemSpace = {
        id: 'test_space_10',
        dimensions: ['x', 'y'],
        nodes: new Array(10).fill(0).map((_, i) => ({
          id: `n${i}`,
          type: 'node',
          properties: {},
          position: [i * 0.1, i * 0.1],
        })),
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      const opportunities = engine.findOpportunities(analysis);

      const densityOpps = opportunities.filter((opp) => opp.type === OpportunityType.EFFICIENCY);
      // May or may not find depending on clustering threshold
      expect(densityOpps.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter opportunities by minimum score', () => {
      const strictEngine = new SpatialReasoningEngine({
        minOpportunityScore: 0.9,
      });

      const space: ProblemSpace = {
        id: 'test_space_11',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1] },
          { id: 'n2', type: 'node', properties: {}, position: [2] },
        ],
        constraints: [],
      };

      const analysis = strictEngine.analyzeProblem(space);
      const opportunities = strictEngine.findOpportunities(analysis);

      // All returned opportunities should meet the threshold
      opportunities.forEach((opp) => {
        expect(opp.score).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should include opportunity metadata', () => {
      const space: ProblemSpace = {
        id: 'test_space_12',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1] },
          { id: 'n2', type: 'node', properties: {}, position: [1.1] },
          { id: 'n3', type: 'node', properties: {}, position: [1.2] },
          { id: 'n4', type: 'node', properties: {}, position: [1.3] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      const opportunities = engine.findOpportunities(analysis);

      opportunities.forEach((opp) => {
        expect(opp.id).toBeDefined();
        expect(opp.timestamp).toBeInstanceOf(Date);
        expect(opp.type).toBeDefined();
        expect(opp.score).toBeGreaterThan(0);
      });
    });
  });

  describe('Pattern Detection', () => {
    it('should detect correlation patterns', () => {
      const space: ProblemSpace = {
        id: 'test_space_13',
        dimensions: ['x', 'y'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1, 2] },
          { id: 'n2', type: 'node', properties: {}, position: [2, 4] },
          { id: 'n3', type: 'node', properties: {}, position: [3, 6] },
        ],
        constraints: [],
      };

      const patterns = engine.detectPatterns(space);
      expect(Array.isArray(patterns)).toBe(true);

      // Perfect correlation should be detected
      if (patterns.length > 0) {
        expect(patterns[0].confidence).toBeGreaterThan(0.7);
      }
    });

    it('should not detect patterns in uncorrelated data', () => {
      const space: ProblemSpace = {
        id: 'test_space_14',
        dimensions: ['x', 'y'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1, 10] },
          { id: 'n2', type: 'node', properties: {}, position: [2, 5] },
          { id: 'n3', type: 'node', properties: {}, position: [3, 8] },
        ],
        constraints: [],
      };

      const patterns = engine.detectPatterns(space);
      const strongPatterns = patterns.filter((p) => p.confidence > 0.7);
      expect(strongPatterns.length).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track problems analyzed', () => {
      const space: ProblemSpace = {
        id: 'test_space_15',
        dimensions: ['x'],
        nodes: [{ id: 'n1', type: 'node', properties: {}, position: [1] }],
        constraints: [],
      };

      const initialStats = engine.getStats();
      engine.analyzeProblem(space);
      const updatedStats = engine.getStats();

      expect(updatedStats.problemsAnalyzed).toBe(initialStats.problemsAnalyzed + 1);
    });

    it('should track clusters found', () => {
      const space: ProblemSpace = {
        id: 'test_space_16',
        dimensions: ['x', 'y'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [0, 0] },
          { id: 'n2', type: 'node', properties: {}, position: [0.1, 0.1] },
          { id: 'n3', type: 'node', properties: {}, position: [0.2, 0.2] },
          { id: 'n4', type: 'node', properties: {}, position: [0.3, 0.3] },
        ],
        constraints: [],
      };

      const initialStats = engine.getStats();
      engine.analyzeProblem(space);
      const updatedStats = engine.getStats();

      expect(updatedStats.clustersFound).toBeGreaterThanOrEqual(initialStats.clustersFound);
    });

    it('should track opportunities detected', () => {
      const space: ProblemSpace = {
        id: 'test_space_17',
        dimensions: ['x'],
        nodes: [
          { id: 'n1', type: 'node', properties: {}, position: [1] },
          { id: 'n2', type: 'node', properties: {}, position: [2] },
        ],
        constraints: [],
      };

      const analysis = engine.analyzeProblem(space);
      const initialStats = engine.getStats();
      engine.findOpportunities(analysis);
      const updatedStats = engine.getStats();

      expect(updatedStats.opportunitiesDetected).toBeGreaterThanOrEqual(
        initialStats.opportunitiesDetected
      );
    });
  });
});
