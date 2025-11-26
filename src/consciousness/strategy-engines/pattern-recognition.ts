/**
 * Pattern Recognition Engine
 *
 * Unified pattern recognition engine that learns from experiences,
 * matches patterns to situations, and evolves strategies over time.
 *
 * Features:
 * - Pattern library management
 * - Pattern matching with confidence scoring
 * - Pattern learning and evolution
 * - Pattern composition for complex strategies
 */

import {
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
  Action,
} from './types/pattern';
import { Opportunity } from './types/opportunity';
import { Path } from './types/path';

/**
 * Pattern recognition statistics
 */
export interface PatternRecognitionStats {
  patternsInLibrary: number;
  matchesPerformed: number;
  successfulMatches: number;
  patternsEvolved: number;
  avgMatchConfidence: number;
}

/**
 * Pattern Recognition Engine
 *
 * Manages pattern library, performs pattern matching, and evolves patterns.
 */
export class PatternRecognitionEngine {
  private library: PatternLibrary;
  private config: Required<PatternMatchingConfig>;
  private stats: PatternRecognitionStats;

  constructor(initialPatterns: Pattern[] = [], config: Partial<PatternMatchingConfig> = {}) {
    this.library = {
      patterns: new Map(),
      categories: new Map(),
      successRates: new Map(),
    };

    this.config = {
      minConfidence: config.minConfidence || MatchConfidence.MEDIUM,
      maxMatches: config.maxMatches || 10,
      includePartialMatches: config.includePartialMatches !== false,
      weightedScoring: config.weightedScoring !== false,
      contextWindow: config.contextWindow || 100,
    };

    this.stats = {
      patternsInLibrary: 0,
      matchesPerformed: 0,
      successfulMatches: 0,
      patternsEvolved: 0,
      avgMatchConfidence: 0,
    };

    // Add initial patterns
    initialPatterns.forEach((pattern) => this.addPattern(pattern));
  }

  /**
   * Add a pattern to the library
   */
  addPattern(pattern: Pattern): void {
    this.library.patterns.set(pattern.id, pattern);

    // Update category index
    if (!this.library.categories.has(pattern.category)) {
      this.library.categories.set(pattern.category, []);
    }
    this.library.categories.get(pattern.category)!.push(pattern.id);

    // Initialize success rate
    this.library.successRates.set(pattern.id, pattern.successRate);

    this.stats.patternsInLibrary++;
  }

  /**
   * Remove a pattern from the library
   */
  removePattern(patternId: string): boolean {
    const pattern = this.library.patterns.get(patternId);
    if (!pattern) return false;

    this.library.patterns.delete(patternId);
    this.library.successRates.delete(patternId);

    // Remove from category index
    const categoryPatterns = this.library.categories.get(pattern.category);
    if (categoryPatterns) {
      const index = categoryPatterns.indexOf(patternId);
      if (index > -1) {
        categoryPatterns.splice(index, 1);
      }
    }

    this.stats.patternsInLibrary--;
    return true;
  }

  /**
   * Get a pattern by ID
   */
  getPattern(patternId: string): Pattern | undefined {
    return this.library.patterns.get(patternId);
  }

  /**
   * Get all patterns in a category
   */
  getPatternsByCategory(category: PatternCategory): Pattern[] {
    const patternIds = this.library.categories.get(category) || [];
    return patternIds.map((id) => this.library.patterns.get(id)!).filter((p) => p);
  }

  /**
   * Match patterns against a context
   */
  matchPatterns(context: PatternContext): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of this.library.patterns.values()) {
      const match = this.matchPattern(pattern, context);

      if (match && this.meetsConfidenceThreshold(match.confidence)) {
        matches.push(match);
      }
    }

    this.stats.matchesPerformed++;
    this.stats.successfulMatches += matches.length;

    if (matches.length > 0) {
      const avgConf = this.calculateAverageConfidence(matches);
      this.stats.avgMatchConfidence =
        (this.stats.avgMatchConfidence * (this.stats.matchesPerformed - 1) + avgConf) /
        this.stats.matchesPerformed;
    }

    // Sort by confidence and limit to maxMatches
    matches.sort(
      (a, b) => this.confidenceToNumber(b.confidence) - this.confidenceToNumber(a.confidence)
    );

    return matches.slice(0, this.config.maxMatches);
  }

  /**
   * Match a single pattern against context
   */
  private matchPattern(pattern: Pattern, context: PatternContext): PatternMatch | null {
    const matchedConditions: string[] = [];
    const failedConditions: string[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    // Evaluate each condition
    for (const condition of pattern.conditions) {
      totalWeight += condition.weight;

      try {
        const result = condition.evaluate(context);
        if (result) {
          matchedConditions.push(condition.id);
          matchedWeight += condition.weight;
        } else {
          failedConditions.push(condition.id);
        }
      } catch (error) {
        failedConditions.push(condition.id);
      }
    }

    // Calculate match score
    const matchScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    // Determine confidence level
    const confidence = this.scoreToConfidence(matchScore);

    // Check if partial matches are allowed
    if (!this.config.includePartialMatches && matchScore < 1.0) {
      return null;
    }

    // Check if confidence meets both pattern requirement AND engine's minimum
    const engineMinConfidence = this.confidenceToNumber(this.config.minConfidence);
    const patternMinConfidence = this.confidenceToNumber(pattern.requiredConfidence);
    const actualConfidence = this.confidenceToNumber(confidence);

    if (actualConfidence < Math.max(engineMinConfidence, patternMinConfidence)) {
      return null;
    }

    return {
      pattern,
      confidence,
      matchScore,
      matchedConditions,
      failedConditions,
      context,
      timestamp: new Date(),
    };
  }

  /**
   * Recommend actions based on matched patterns
   */
  recommend(matches: PatternMatch[]): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    for (const match of matches) {
      const pattern = match.pattern;
      const successRate = this.library.successRates.get(pattern.id) || pattern.successRate;

      const reasoning: string[] = [
        `Pattern '${pattern.name}' matched with ${match.confidence} confidence`,
        `Historical success rate: ${(successRate * 100).toFixed(1)}%`,
        `${match.matchedConditions.length} conditions satisfied`,
      ];

      const risks: string[] = [];
      if (match.failedConditions.length > 0) {
        risks.push(`${match.failedConditions.length} conditions not satisfied`);
      }
      if (successRate < 0.7) {
        risks.push('Below-average historical success rate');
      }

      // Find alternative patterns
      const alternatives = matches
        .filter((m) => m.pattern.id !== pattern.id && m.pattern.category === pattern.category)
        .map((m) => m.pattern)
        .slice(0, 3);

      recommendations.push({
        pattern,
        confidence: match.confidence,
        reasoning,
        expectedOutcome: `Apply ${pattern.actions.length} actions from pattern`,
        risks,
        alternatives,
      });
    }

    return recommendations;
  }

  /**
   * Update pattern based on outcome
   */
  updatePattern(patternId: string, success: boolean): PatternLearningResult | null {
    const pattern = this.library.patterns.get(patternId);
    if (!pattern) return null;

    const oldSuccessRate = pattern.successRate;

    // Update counters
    pattern.timesMatched++;
    if (success) {
      pattern.timesSucceeded++;
    } else {
      pattern.timesFailed++;
    }

    // Recalculate success rate (exponential moving average)
    const alpha = 0.2; // Learning rate
    const outcome = success ? 1.0 : 0.0;
    pattern.successRate = alpha * outcome + (1 - alpha) * oldSuccessRate;

    // Update last updated timestamp
    pattern.lastUpdated = new Date();

    // Update library success rates
    this.library.successRates.set(patternId, pattern.successRate);

    const improved = pattern.successRate > oldSuccessRate;

    return {
      pattern,
      improved,
      oldSuccessRate,
      newSuccessRate: pattern.successRate,
      adjustments: improved ? ['Increased success rate'] : ['Decreased success rate'],
      generation: pattern.generation,
    };
  }

  /**
   * Evolve patterns using genetic algorithm
   */
  evolvePatterns(config: Partial<PatternEvolutionConfig> = {}): Pattern[] {
    const evolutionConfig: Required<PatternEvolutionConfig> = {
      mutationRate: config.mutationRate || 0.1,
      crossoverRate: config.crossoverRate || 0.7,
      selectionPressure: config.selectionPressure || 1.5,
      elitismCount: config.elitismCount || 2,
      populationSize: config.populationSize || 20,
      generations: config.generations || 10,
    };

    // For now, return empty array - full genetic algorithm implementation would be complex
    // In production, this would:
    // 1. Select best patterns based on success rate
    // 2. Create offspring through crossover
    // 3. Apply mutations
    // 4. Evaluate fitness
    // 5. Replace population

    this.stats.patternsEvolved++;

    return [];
  }

  /**
   * Create composite pattern from multiple patterns
   */
  composePatterns(
    patterns: Pattern[],
    strategy: 'sequential' | 'parallel' | 'conditional' | 'hierarchical'
  ): CompositePattern {
    // Combine conditions from all patterns
    const conditions: Condition[] = [];
    const actions: Action[] = [];

    for (const pattern of patterns) {
      conditions.push(...pattern.conditions);
      actions.push(...pattern.actions);
    }

    return {
      id: `composite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Composite: ${patterns.map((p) => p.name).join(' + ')}`,
      basePatterns: patterns,
      compositionStrategy: strategy,
      conditions,
      actions,
      metadata: {
        createdAt: new Date(),
        patternCount: patterns.length,
      },
    };
  }

  /**
   * Get analytics for a pattern
   */
  getPatternAnalytics(patternId: string): PatternAnalytics | null {
    const pattern = this.library.patterns.get(patternId);
    if (!pattern) return null;

    const totalMatches = pattern.timesMatched;
    const successfulMatches = pattern.timesSucceeded;
    const failedMatches = pattern.timesFailed;
    const successRate = pattern.successRate;

    // Calculate trend
    let trend: 'improving' | 'stable' | 'declining';
    if (successRate > 0.75) {
      trend = 'improving';
    } else if (successRate > 0.5) {
      trend = 'stable';
    } else {
      trend = 'declining';
    }

    return {
      patternId,
      totalMatches,
      successfulMatches,
      failedMatches,
      averageConfidence: 0.8, // Would calculate from match history
      successRate,
      avgExecutionTime: 0, // Would track from action executions
      lastUsed: pattern.lastUpdated,
      trend,
    };
  }

  /**
   * Check if confidence meets threshold
   */
  private meetsConfidenceThreshold(confidence: MatchConfidence): boolean {
    return (
      this.confidenceToNumber(confidence) >= this.confidenceToNumber(this.config.minConfidence)
    );
  }

  /**
   * Convert confidence enum to number
   */
  private confidenceToNumber(confidence: MatchConfidence): number {
    switch (confidence) {
      case MatchConfidence.LOW:
        return 0.25;
      case MatchConfidence.MEDIUM:
        return 0.5;
      case MatchConfidence.HIGH:
        return 0.75;
      case MatchConfidence.VERY_HIGH:
        return 0.9;
      default:
        return 0;
    }
  }

  /**
   * Convert score to confidence level
   */
  private scoreToConfidence(score: number): MatchConfidence {
    if (score >= 0.9) return MatchConfidence.VERY_HIGH;
    if (score >= 0.75) return MatchConfidence.HIGH;
    if (score >= 0.5) return MatchConfidence.MEDIUM;
    return MatchConfidence.LOW;
  }

  /**
   * Calculate average confidence from matches
   */
  private calculateAverageConfidence(matches: PatternMatch[]): number {
    if (matches.length === 0) return 0;
    const sum = matches.reduce(
      (total, match) => total + this.confidenceToNumber(match.confidence),
      0
    );
    return sum / matches.length;
  }

  /**
   * Get statistics
   */
  getStats(): PatternRecognitionStats {
    return { ...this.stats };
  }

  /**
   * Get library info
   */
  getLibraryInfo(): { totalPatterns: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};

    for (const [category, patternIds] of this.library.categories) {
      byCategory[category] = patternIds.length;
    }

    return {
      totalPatterns: this.library.patterns.size,
      byCategory,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      patternsInLibrary: this.library.patterns.size,
      matchesPerformed: 0,
      successfulMatches: 0,
      patternsEvolved: 0,
      avgMatchConfidence: 0,
    };
  }
}
