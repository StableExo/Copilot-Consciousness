/**
 * PatternDetector - Detect recurring profitable patterns
 *
 * Uses clustering and statistical analysis to identify time-based patterns,
 * chain patterns, sequence patterns, and opportunity clusters.
 */

import { Pattern, TrainingRecord } from './types';
// PatternConditions reserved for advanced pattern matching
import type { PatternConditions as _PatternConditions } from './types';
import { ArbitragePath } from '../arbitrage/types';

export interface PatternStats {
  totalPatterns: number;
  activePatterns: number;
  lastDetectionTime: number;
  matchesFound: number;
}

interface ClusterPoint {
  features: number[];
  profitable: boolean;
  profit: number;
  timestamp: number;
}

/**
 * PatternDetector - Identifies recurring profitable patterns
 */
export class PatternDetector {
  private patterns: Map<string, Pattern> = new Map();
  private trainingData: TrainingRecord[] = [];
  private stats: PatternStats;

  constructor() {
    this.stats = {
      totalPatterns: 0,
      activePatterns: 0,
      lastDetectionTime: 0,
      matchesFound: 0,
    };
  }

  /**
   * Add training data for pattern detection
   */
  addTrainingData(record: TrainingRecord): void {
    this.trainingData.push(record);

    // Keep only recent data (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.trainingData = this.trainingData.filter((r) => r.timestamp > thirtyDaysAgo);
  }

  /**
   * Detect patterns from training data
   */
  async detectPatterns(): Promise<Pattern[]> {
    const detectedPatterns: Pattern[] = [];

    // Detect time-based patterns
    const timePatterns = this.detectTimePatterns();
    detectedPatterns.push(...timePatterns);

    // Detect chain patterns
    const chainPatterns = this.detectChainPatterns();
    detectedPatterns.push(...chainPatterns);

    // Detect sequence patterns
    const sequencePatterns = this.detectSequencePatterns();
    detectedPatterns.push(...sequencePatterns);

    // Detect cluster patterns (similar opportunities)
    const clusterPatterns = this.detectClusterPatterns();
    detectedPatterns.push(...clusterPatterns);

    // Store patterns
    for (const pattern of detectedPatterns) {
      this.patterns.set(pattern.id, pattern);
    }

    this.stats.totalPatterns = this.patterns.size;
    this.stats.activePatterns = detectedPatterns.filter((p) => p.confidence > 0.6).length;
    this.stats.lastDetectionTime = Date.now();

    return detectedPatterns;
  }

  /**
   * Detect time-based patterns (hour of day, day of week)
   */
  private detectTimePatterns(): Pattern[] {
    if (this.trainingData.length < 50) {
      return [];
    }

    const patterns: Pattern[] = [];

    // Group by hour of day
    const hourlyProfits = new Map<number, { total: number; count: number; profits: number[] }>();

    for (const record of this.trainingData) {
      if (!record.outcome.successful) continue;

      const date = new Date(record.timestamp);
      const hour = date.getUTCHours();
      const profit = Number(record.outcome.actualProfit || 0n);

      if (!hourlyProfits.has(hour)) {
        hourlyProfits.set(hour, { total: 0, count: 0, profits: [] });
      }

      const hourData = hourlyProfits.get(hour)!;
      hourData.total += profit;
      hourData.count++;
      hourData.profits.push(profit);
    }

    // Find profitable hours
    for (const [hour, data] of hourlyProfits.entries()) {
      if (data.count < 5) continue; // Need at least 5 samples

      const avgProfit = data.total / data.count;
      const successRate =
        data.count /
        this.trainingData.filter((r) => {
          const h = new Date(r.timestamp).getUTCHours();
          return h === hour;
        }).length;

      if (successRate > 0.7 && avgProfit > 0) {
        patterns.push({
          id: `time-hour-${hour}`,
          type: 'time',
          description: `High profitability at hour ${hour} UTC`,
          confidence: Math.min(successRate, 0.95),
          historicalProfitability: avgProfit,
          conditions: {
            timeOfDay: [hour],
          },
        });
      }
    }

    // Group by day of week
    const dailyProfits = new Map<number, { total: number; count: number }>();

    for (const record of this.trainingData) {
      if (!record.outcome.successful) continue;

      const date = new Date(record.timestamp);
      const day = date.getUTCDay();
      const profit = Number(record.outcome.actualProfit || 0n);

      if (!dailyProfits.has(day)) {
        dailyProfits.set(day, { total: 0, count: 0 });
      }

      const dayData = dailyProfits.get(day)!;
      dayData.total += profit;
      dayData.count++;
    }

    // Find profitable days
    for (const [day, data] of dailyProfits.entries()) {
      if (data.count < 10) continue;

      const avgProfit = data.total / data.count;
      const successRate =
        data.count /
        this.trainingData.filter((r) => {
          const d = new Date(r.timestamp).getUTCDay();
          return d === day;
        }).length;

      if (successRate > 0.7 && avgProfit > 0) {
        const dayNames = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
        patterns.push({
          id: `time-day-${day}`,
          type: 'time',
          description: `High profitability on ${dayNames[day]}`,
          confidence: Math.min(successRate, 0.95),
          historicalProfitability: avgProfit,
          conditions: {
            dayOfWeek: [day],
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect chain-specific patterns
   */
  private detectChainPatterns(): Pattern[] {
    // Placeholder for chain pattern detection
    // Would analyze which chain pairs are most profitable
    return [];
  }

  /**
   * Detect sequence patterns (lead-lag relationships)
   */
  private detectSequencePatterns(): Pattern[] {
    // Placeholder for sequence pattern detection
    // Would detect patterns like "Uniswap swap -> SushiSwap opportunity"
    return [];
  }

  /**
   * Detect cluster patterns using K-means-like clustering
   */
  private detectClusterPatterns(): Pattern[] {
    if (this.trainingData.length < 100) {
      return [];
    }

    // Extract features for clustering
    const points: ClusterPoint[] = this.trainingData.map((record) => ({
      features: [
        record.path.hops.length,
        record.path.totalFees,
        Number(record.path.estimatedProfit) / 1e18,
        record.features.volatility,
        record.features.liquidityDepth / 1e6,
      ],
      profitable: record.outcome.successful,
      profit: Number(record.outcome.actualProfit || 0n),
      timestamp: record.timestamp,
    }));

    // Simple clustering (in production, use proper K-means)
    const clusters = this.simpleClustering(points, 5);

    const patterns: Pattern[] = [];

    // Analyze each cluster
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (cluster.length < 10) continue;

      const profitable = cluster.filter((p) => p.profitable);
      const successRate = profitable.length / cluster.length;

      if (successRate > 0.75) {
        const avgProfit = profitable.reduce((sum, p) => sum + p.profit, 0) / profitable.length;
        const centroid = this.calculateCentroid(cluster);

        patterns.push({
          id: `cluster-${i}`,
          type: 'cluster',
          description: `Cluster ${i}: ${cluster.length} opportunities, ${(
            successRate * 100
          ).toFixed(1)}% success`,
          confidence: Math.min(successRate, 0.95),
          historicalProfitability: avgProfit,
          conditions: {
            // Store centroid as conditions (simplified)
            volumeRange: [centroid[0] * 0.8, centroid[0] * 1.2],
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Simple clustering algorithm
   */
  private simpleClustering(points: ClusterPoint[], k: number): ClusterPoint[][] {
    // Simplified clustering - in production, use proper K-means
    const clusters: ClusterPoint[][] = Array.from({ length: k }, () => []);

    for (const point of points) {
      // Assign to cluster based on hash of features
      const hash = point.features.reduce((sum, f) => sum + f, 0);
      const clusterIdx = Math.floor(Math.abs(hash)) % k;
      clusters[clusterIdx].push(point);
    }

    return clusters;
  }

  /**
   * Calculate cluster centroid
   */
  private calculateCentroid(cluster: ClusterPoint[]): number[] {
    if (cluster.length === 0) return [];

    const featureDim = cluster[0].features.length;
    const centroid = new Array(featureDim).fill(0);

    for (const point of cluster) {
      for (let i = 0; i < featureDim; i++) {
        centroid[i] += point.features[i];
      }
    }

    return centroid.map((sum) => sum / cluster.length);
  }

  /**
   * Find matching patterns for a path
   */
  findMatchingPatterns(path: ArbitragePath, timestamp: number): Pattern[] {
    const matches: Pattern[] = [];
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    const day = date.getUTCDay();

    for (const pattern of this.patterns.values()) {
      if (this.matchesPattern(pattern, path, hour, day)) {
        matches.push(pattern);
        this.stats.matchesFound++;
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if path matches a pattern
   */
  private matchesPattern(
    pattern: Pattern,
    path: ArbitragePath,
    hour: number,
    day: number
  ): boolean {
    const conditions = pattern.conditions;

    // Check time conditions
    if (conditions.timeOfDay && !conditions.timeOfDay.includes(hour)) {
      return false;
    }

    if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(day)) {
      return false;
    }

    // Check chain conditions
    // (simplified - would check actual chain IDs from path)

    // Check token conditions
    if (conditions.tokens) {
      const pathTokens = new Set([path.startToken, path.endToken]);
      const hasMatchingToken = conditions.tokens.some((token) => pathTokens.has(token));
      if (!hasMatchingToken) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get high-confidence patterns
   */
  getHighConfidencePatterns(minConfidence: number = 0.7): Pattern[] {
    return Array.from(this.patterns.values()).filter((p) => p.confidence >= minConfidence);
  }

  /**
   * Get statistics
   */
  getStats(): PatternStats {
    return { ...this.stats };
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
    this.trainingData = [];
    this.stats = {
      totalPatterns: 0,
      activePatterns: 0,
      lastDetectionTime: 0,
      matchesFound: 0,
    };
  }
}
