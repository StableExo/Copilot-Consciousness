/**
 * Spatial Reasoning Engine
 *
 * Adapted from AxionCitadel SpatialArbEngine for generalized multi-dimensional
 * problem analysis and opportunity detection.
 *
 * Features:
 * - Multi-dimensional problem space analysis
 * - Spatial pattern detection and clustering
 * - Opportunity mapping across problem dimensions
 * - Cross-domain reasoning and insights
 */

import {
  ProblemSpace,
  Node,
  DimensionalAnalysis,
  SpatialCluster,
  ProblemSpaceAnalysis,
} from './types/problem-space';
import { Opportunity, OpportunityType, OpportunityStatus } from './types/opportunity';
import { calculateDistance, DistanceMetric } from './utils/distance-calculator';
import { buildGraph, calculateConnectivity } from './utils/graph-builder';

/**
 * Spatial reasoning configuration
 */
export interface SpatialReasoningConfig {
  dimensions?: string[];
  distanceMetric?: DistanceMetric;
  clusteringThreshold?: number;
  maxDimensions?: number;
  normalization?: 'minmax' | 'zscore' | 'none';
  minClusterSize?: number;
  minOpportunityScore?: number;
}

/**
 * Engine statistics
 */
export interface SpatialReasoningStats {
  problemsAnalyzed: number;
  clustersFound: number;
  opportunitiesDetected: number;
  avgClusterSize: number;
  avgOpportunityScore: number;
}

/**
 * Spatial Reasoning Engine
 *
 * Provides multi-dimensional analysis and opportunity detection
 * in abstract problem spaces.
 */
export class SpatialReasoningEngine {
  private config: Required<SpatialReasoningConfig>;
  private stats: SpatialReasoningStats;

  constructor(config: SpatialReasoningConfig = {}) {
    this.config = {
      dimensions: config.dimensions || ['time', 'space', 'resources', 'risk', 'complexity'],
      distanceMetric: config.distanceMetric || 'euclidean',
      clusteringThreshold: config.clusteringThreshold || 0.7,
      maxDimensions: config.maxDimensions || 10,
      normalization: config.normalization || 'minmax',
      minClusterSize: config.minClusterSize || 3,
      minOpportunityScore: config.minOpportunityScore || 0.6,
    };

    this.stats = {
      problemsAnalyzed: 0,
      clustersFound: 0,
      opportunitiesDetected: 0,
      avgClusterSize: 0,
      avgOpportunityScore: 0,
    };
  }

  /**
   * Analyze a problem space across multiple dimensions
   */
  analyzeProblem(space: ProblemSpace): ProblemSpaceAnalysis {
    this.stats.problemsAnalyzed++;

    // Validate dimensions
    if (space.dimensions.length > this.config.maxDimensions) {
      throw new Error(
        `Problem space has ${space.dimensions.length} dimensions, ` +
          `exceeding maximum of ${this.config.maxDimensions}`
      );
    }

    // Perform dimensional analysis
    const dimensionalAnalyses = this.analyzeDimensions(space);

    // Detect spatial clusters
    const clusters = this.detectClusters(space);
    this.stats.clustersFound += clusters.length;

    // Calculate connectivity using graph representation
    const graph = buildGraph(space);
    const connectivity = calculateConnectivity(graph);

    // Calculate complexity score
    const complexity = this.calculateComplexity(space);

    // Calculate feasibility score
    const feasibility = this.calculateFeasibility(space);

    return {
      space,
      dimensionalAnalyses,
      clusters,
      connectivity,
      complexity,
      feasibility,
      metadata: {
        timestamp: new Date(),
        engineVersion: '1.0.0',
      },
    };
  }

  /**
   * Analyze individual dimensions of the problem space
   */
  private analyzeDimensions(space: ProblemSpace): DimensionalAnalysis[] {
    const analyses: DimensionalAnalysis[] = [];

    for (let dimIdx = 0; dimIdx < space.dimensions.length; dimIdx++) {
      const dimension = space.dimensions[dimIdx];
      const values = space.nodes
        .map((node) => node.position[dimIdx])
        .filter((v) => v !== undefined && !isNaN(v));

      if (values.length === 0) continue;

      // Calculate statistics
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

      // Create distribution histogram (10 bins)
      const distribution = this.createDistribution(values, min, max, 10);

      analyses.push({
        dimension,
        min,
        max,
        mean,
        variance,
        distribution,
      });
    }

    return analyses;
  }

  /**
   * Create distribution histogram
   */
  private createDistribution(values: number[], min: number, max: number, bins: number): number[] {
    const distribution = new Array(bins).fill(0);
    const binSize = (max - min) / bins;

    if (binSize === 0) {
      distribution[0] = values.length;
      return distribution;
    }

    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      distribution[binIndex]++;
    }

    return distribution;
  }

  /**
   * Detect spatial clusters using distance-based clustering
   */
  private detectClusters(space: ProblemSpace): SpatialCluster[] {
    const clusters: SpatialCluster[] = [];
    const visited = new Set<string>();

    for (const node of space.nodes) {
      if (visited.has(node.id)) continue;

      // Find all nodes within clustering threshold
      const clusterNodes: Node[] = [node];
      visited.add(node.id);

      for (const otherNode of space.nodes) {
        if (visited.has(otherNode.id)) continue;

        const distance = calculateDistance(
          node.position,
          otherNode.position,
          this.config.distanceMetric
        );

        if (distance <= this.config.clusteringThreshold) {
          clusterNodes.push(otherNode);
          visited.add(otherNode.id);
        }
      }

      // Only create cluster if it meets minimum size
      if (clusterNodes.length >= this.config.minClusterSize) {
        const centroid = this.calculateCentroid(clusterNodes);
        const radius = this.calculateClusterRadius(clusterNodes, centroid);
        const density = clusterNodes.length / (Math.pow(radius, space.dimensions.length) + 1);

        clusters.push({
          id: `cluster_${clusters.length + 1}`,
          centroid,
          nodes: clusterNodes,
          radius,
          density,
          metadata: {
            createdAt: new Date(),
          },
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate centroid of a cluster
   */
  private calculateCentroid(nodes: Node[]): number[] {
    if (nodes.length === 0) return [];

    const dimensions = nodes[0].position.length;
    const centroid = new Array(dimensions).fill(0);

    for (const node of nodes) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += node.position[i];
      }
    }

    return centroid.map((sum) => sum / nodes.length);
  }

  /**
   * Calculate cluster radius (max distance from centroid)
   */
  private calculateClusterRadius(nodes: Node[], centroid: number[]): number {
    let maxDistance = 0;

    for (const node of nodes) {
      const distance = calculateDistance(node.position, centroid, this.config.distanceMetric);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }

    return maxDistance;
  }

  /**
   * Find opportunities in the problem space
   */
  findOpportunities(analysis: ProblemSpaceAnalysis): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Opportunity 1: High-density clusters (efficiency opportunities)
    for (const cluster of analysis.clusters) {
      if (cluster.density > 1.0) {
        const opp = this.createOpportunity(
          OpportunityType.EFFICIENCY,
          cluster.nodes,
          cluster.density,
          `High-density cluster with ${cluster.nodes.length} nodes`
        );
        opportunities.push(opp);
      }
    }

    // Opportunity 2: Low-variance dimensions (optimization opportunities)
    for (const dimAnalysis of analysis.dimensionalAnalyses) {
      if (dimAnalysis.variance < 0.1 && dimAnalysis.mean > 0.5) {
        const relevantNodes = this.getNodesInDimension(analysis.space, dimAnalysis.dimension);
        const opp = this.createOpportunity(
          OpportunityType.OPTIMIZATION,
          relevantNodes,
          1.0 - dimAnalysis.variance,
          `Low variance in ${dimAnalysis.dimension} dimension`
        );
        opportunities.push(opp);
      }
    }

    // Opportunity 3: High connectivity (network effect opportunities)
    if (analysis.connectivity > 0.8) {
      const opp = this.createOpportunity(
        OpportunityType.INNOVATION,
        analysis.space.nodes,
        analysis.connectivity,
        'High connectivity enables network effects'
      );
      opportunities.push(opp);
    }

    // Filter by minimum score
    const filtered = opportunities.filter((opp) => opp.score >= this.config.minOpportunityScore);

    this.stats.opportunitiesDetected += filtered.length;
    if (filtered.length > 0) {
      this.stats.avgOpportunityScore =
        filtered.reduce((sum, opp) => sum + opp.score, 0) / filtered.length;
    }

    return filtered;
  }

  /**
   * Get nodes relevant to a specific dimension
   */
  private getNodesInDimension(space: ProblemSpace, dimension: string): Node[] {
    const dimIndex = space.dimensions.indexOf(dimension);
    if (dimIndex === -1) return [];

    // Return nodes with significant values in this dimension
    return space.nodes.filter(
      (node) =>
        node.position[dimIndex] !== undefined &&
        !isNaN(node.position[dimIndex]) &&
        node.position[dimIndex] > 0.5
    );
  }

  /**
   * Create opportunity from analysis
   */
  private createOpportunity(
    type: OpportunityType,
    nodes: Node[],
    score: number,
    description: string
  ): Opportunity {
    return {
      id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: OpportunityStatus.IDENTIFIED,
      timestamp: new Date(),
      nodes,
      value: score * 100,
      cost: nodes.length * 0.1,
      risk: 1.0 - score,
      complexity: Math.log(nodes.length + 1),
      timeToRealize: nodes.length * 0.5,
      score,
      criteria: {
        density: score,
        nodeCount: nodes.length,
        feasibility: score,
      },
      description,
    };
  }

  /**
   * Calculate problem complexity score
   */
  private calculateComplexity(space: ProblemSpace): number {
    const nodeComplexity = Math.log(space.nodes.length + 1) / Math.log(100);
    const dimensionComplexity = space.dimensions.length / this.config.maxDimensions;
    const constraintComplexity = space.constraints.length / 10;

    return (nodeComplexity + dimensionComplexity + constraintComplexity) / 3;
  }

  /**
   * Calculate problem feasibility score
   */
  private calculateFeasibility(space: ProblemSpace): number {
    // Count satisfied hard constraints
    const hardConstraints = space.constraints.filter((c) => c.type === 'hard');
    if (hardConstraints.length === 0) return 1.0;

    // For now, return a baseline feasibility
    // In real implementation, would validate constraints against problem space
    return 0.8;
  }

  /**
   * Detect patterns across multiple dimensions
   */
  detectPatterns(
    space: ProblemSpace
  ): Array<{ pattern: string; confidence: number; nodes: Node[] }> {
    const patterns: Array<{ pattern: string; confidence: number; nodes: Node[] }> = [];

    // Pattern 1: Linear correlation between dimensions
    for (let i = 0; i < space.dimensions.length; i++) {
      for (let j = i + 1; j < space.dimensions.length; j++) {
        const correlation = this.calculateCorrelation(space, i, j);
        if (Math.abs(correlation) > 0.7) {
          patterns.push({
            pattern: `${space.dimensions[i]} correlates with ${space.dimensions[j]}`,
            confidence: Math.abs(correlation),
            nodes: space.nodes,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Calculate correlation between two dimensions
   */
  private calculateCorrelation(space: ProblemSpace, dim1: number, dim2: number): number {
    const values1 = space.nodes.map((n) => n.position[dim1]).filter((v) => !isNaN(v));
    const values2 = space.nodes.map((n) => n.position[dim2]).filter((v) => !isNaN(v));

    if (values1.length !== values2.length || values1.length === 0) return 0;

    const mean1 = values1.reduce((sum, v) => sum + v, 0) / values1.length;
    const mean2 = values2.reduce((sum, v) => sum + v, 0) / values2.length;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    if (denom1 === 0 || denom2 === 0) return 0;

    return numerator / Math.sqrt(denom1 * denom2);
  }

  /**
   * Get engine statistics
   */
  getStats(): SpatialReasoningStats {
    return { ...this.stats };
  }

  /**
   * Reset engine statistics
   */
  resetStats(): void {
    this.stats = {
      problemsAnalyzed: 0,
      clustersFound: 0,
      opportunitiesDetected: 0,
      avgClusterSize: 0,
      avgOpportunityScore: 0,
    };
  }
}
