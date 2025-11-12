/**
 * Pattern Tracker
 * 
 * Adapted from AxionCitadel's bloodhound.py
 * Tracks and analyzes patterns in data, decisions, and outcomes
 */

export enum PatternType {
  TEMPORAL = 'TEMPORAL',        // Time-based patterns
  BEHAVIORAL = 'BEHAVIORAL',    // Behavior patterns
  CORRELATION = 'CORRELATION',  // Correlations between events
  ANOMALY = 'ANOMALY',         // Unusual patterns
  CYCLIC = 'CYCLIC'            // Repeating cycles
}

export enum PatternStrength {
  VERY_STRONG = 0.9,
  STRONG = 0.7,
  MODERATE = 0.5,
  WEAK = 0.3,
  VERY_WEAK = 0.1
}

export interface Pattern {
  id: string;
  name: string;
  type: PatternType;
  description: string;
  strength: number; // 0-1
  confidence: number; // 0-1
  occurrences: PatternOccurrence[];
  features: Record<string, unknown>;
  predictivePower: number; // 0-1
  createdAt: number;
  updatedAt: number;
  lastSeen?: number;
  metadata: Record<string, unknown>;
}

export interface PatternOccurrence {
  timestamp: number;
  context: Record<string, unknown>;
  matchScore: number; // How well this occurrence matches the pattern
  outcome?: unknown;
}

export interface PatternPrediction {
  patternId: string;
  probability: number; // 0-1
  expectedOutcome: unknown;
  confidence: number;
  timeframe?: number; // When pattern is expected (timestamp)
}

/**
 * Pattern Tracking System
 * Identifies, tracks, and learns from patterns in system behavior
 */
export class PatternTracker {
  private patterns: Map<string, Pattern> = new Map();
  private observations: Array<{
    timestamp: number;
    data: Record<string, unknown>;
    outcome?: unknown;
  }> = [];
  private maxObservations: number = 10000;

  /**
   * Record an observation
   */
  recordObservation(
    data: Record<string, unknown>,
    outcome?: unknown
  ): void {
    this.observations.push({
      timestamp: Date.now(),
      data,
      outcome
    });

    // Maintain observation limit
    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }

    // Check for pattern matches
    this.checkPatternMatches(data);

    // Periodically detect new patterns
    if (this.observations.length % 100 === 0) {
      this.detectNewPatterns();
    }
  }

  /**
   * Register a known pattern
   */
  registerPattern(
    name: string,
    type: PatternType,
    description: string,
    features: Record<string, unknown>,
    strength: number = 0.5
  ): Pattern {
    const pattern: Pattern = {
      id: this.generateId('pattern'),
      name,
      type,
      description,
      strength: Math.max(0, Math.min(1, strength)),
      confidence: 0.5,
      occurrences: [],
      features,
      predictivePower: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };

    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  /**
   * Detect patterns in recent observations
   */
  detectNewPatterns(): Pattern[] {
    const newPatterns: Pattern[] = [];

    // Temporal pattern detection
    const temporalPatterns = this.detectTemporalPatterns();
    temporalPatterns.forEach(p => {
      this.patterns.set(p.id, p);
      newPatterns.push(p);
    });

    // Correlation detection
    const correlationPatterns = this.detectCorrelations();
    correlationPatterns.forEach(p => {
      this.patterns.set(p.id, p);
      newPatterns.push(p);
    });

    return newPatterns;
  }

  /**
   * Get pattern predictions based on current context
   */
  getPredictions(currentContext: Record<string, unknown>): PatternPrediction[] {
    const predictions: PatternPrediction[] = [];

    this.patterns.forEach(pattern => {
      const matchScore = this.calculateMatchScore(pattern, currentContext);
      
      if (matchScore > 0.5) {
        const prediction: PatternPrediction = {
          patternId: pattern.id,
          probability: matchScore * pattern.strength,
          expectedOutcome: this.predictOutcome(pattern),
          confidence: pattern.confidence * matchScore
        };

        // Add timeframe for temporal patterns
        if (pattern.type === PatternType.TEMPORAL || pattern.type === PatternType.CYCLIC) {
          prediction.timeframe = this.predictNextOccurrence(pattern);
        }

        predictions.push(prediction);
      }
    });

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Get a specific pattern by ID
   */
  getPattern(patternId: string): Pattern | null {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: PatternType): Pattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.type === type)
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get the strongest patterns
   */
  getStrongestPatterns(limit: number = 10): Pattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }

  /**
   * Update pattern based on new occurrence
   */
  updatePattern(
    patternId: string,
    occurrence: PatternOccurrence
  ): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;

    pattern.occurrences.push(occurrence);
    pattern.lastSeen = occurrence.timestamp;
    pattern.updatedAt = Date.now();

    // Update strength based on occurrence frequency
    const recentOccurrences = pattern.occurrences.filter(
      o => Date.now() - o.timestamp < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    pattern.strength = Math.min(
      1,
      pattern.strength + (recentOccurrences.length * 0.01)
    );

    // Update confidence based on match scores
    const avgMatchScore = pattern.occurrences.reduce(
      (sum, o) => sum + o.matchScore,
      0
    ) / pattern.occurrences.length;

    pattern.confidence = avgMatchScore;

    // Calculate predictive power
    pattern.predictivePower = this.calculatePredictivePower(pattern);

    return true;
  }

  /**
   * Get pattern analytics
   */
  getAnalytics(): {
    totalPatterns: number;
    byType: Record<PatternType, number>;
    avgStrength: number;
    avgConfidence: number;
    topPatterns: Pattern[];
  } {
    const patterns = Array.from(this.patterns.values());

    const byType: Record<PatternType, number> = {
      [PatternType.TEMPORAL]: 0,
      [PatternType.BEHAVIORAL]: 0,
      [PatternType.CORRELATION]: 0,
      [PatternType.ANOMALY]: 0,
      [PatternType.CYCLIC]: 0
    };

    patterns.forEach(p => {
      byType[p.type]++;
    });

    const avgStrength = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.strength, 0) / patterns.length
      : 0;

    const avgConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      byType,
      avgStrength,
      avgConfidence,
      topPatterns: this.getStrongestPatterns(5)
    };
  }

  /**
   * Export patterns for persistence
   */
  export(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Import patterns from persistence
   */
  import(patterns: Pattern[]): void {
    this.patterns.clear();
    patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  private checkPatternMatches(data: Record<string, unknown>): void {
    this.patterns.forEach(pattern => {
      const matchScore = this.calculateMatchScore(pattern, data);
      
      if (matchScore > 0.6) {
        const occurrence: PatternOccurrence = {
          timestamp: Date.now(),
          context: data,
          matchScore
        };

        this.updatePattern(pattern.id, occurrence);
      }
    });
  }

  private calculateMatchScore(
    pattern: Pattern,
    context: Record<string, unknown>
  ): number {
    let matches = 0;
    let total = 0;

    // Simple feature matching
    for (const [key, value] of Object.entries(pattern.features)) {
      total++;
      if (context[key] === value) {
        matches++;
      } else if (typeof value === 'number' && typeof context[key] === 'number') {
        // For numeric values, check if they're close
        const diff = Math.abs((context[key] as number) - value);
        const threshold = value * 0.2; // 20% tolerance
        if (diff < threshold) {
          matches += 0.7; // Partial match
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  private detectTemporalPatterns(): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Simple time-of-day pattern detection
    const hourBuckets = new Map<number, number>();
    
    this.observations.forEach(obs => {
      const hour = new Date(obs.timestamp).getHours();
      hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
    });

    // Find hours with high activity
    const avgCount = Array.from(hourBuckets.values()).reduce((a, b) => a + b, 0) / 24;
    
    hourBuckets.forEach((count, hour) => {
      if (count > avgCount * 1.5) {
        const pattern = this.registerPattern(
          `Peak activity at hour ${hour}`,
          PatternType.TEMPORAL,
          `High activity observed around ${hour}:00`,
          { hour, threshold: avgCount * 1.5 },
          count / (avgCount * 2)
        );
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private detectCorrelations(): Pattern[] {
    // Placeholder for correlation detection
    // In a full implementation, this would analyze correlations between observation features
    return [];
  }

  private predictOutcome(pattern: Pattern): unknown {
    // Predict based on historical outcomes
    const outcomesWithValues = pattern.occurrences
      .filter(o => o.outcome !== undefined)
      .map(o => o.outcome);

    if (outcomesWithValues.length === 0) {
      return null;
    }

    // Return most common outcome
    const occurrenceMap = new Map<string, number>();
    outcomesWithValues.forEach(outcome => {
      const key = JSON.stringify(outcome);
      occurrenceMap.set(key, (occurrenceMap.get(key) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon = null;

    occurrenceMap.forEach((count, outcomeStr) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = JSON.parse(outcomeStr);
      }
    });

    return mostCommon;
  }

  private predictNextOccurrence(pattern: Pattern): number | undefined {
    if (pattern.occurrences.length < 2) return undefined;

    // Calculate average time between occurrences
    const intervals: number[] = [];
    for (let i = 1; i < pattern.occurrences.length; i++) {
      intervals.push(
        pattern.occurrences[i].timestamp - pattern.occurrences[i - 1].timestamp
      );
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const lastOccurrence = pattern.occurrences[pattern.occurrences.length - 1].timestamp;

    return lastOccurrence + avgInterval;
  }

  private calculatePredictivePower(pattern: Pattern): number {
    const withOutcomes = pattern.occurrences.filter(o => o.outcome !== undefined);
    
    if (withOutcomes.length < 3) return 0;

    // Simple predictive power: consistency of outcomes
    const outcomes = withOutcomes.map(o => JSON.stringify(o.outcome));
    const uniqueOutcomes = new Set(outcomes);

    // More consistent outcomes = higher predictive power
    return 1 - (uniqueOutcomes.size / outcomes.length);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
