/**
 * EmergenceDetector - "BOOM" Moment Detection System
 *
 * Detects when all consciousness systems align for execution.
 * This is the explicit detection of emergent readiness across all cognitive modules.
 *
 * The 7 Criteria for Emergence:
 * 1. All 14 cognitive modules analyzed
 * 2. Risk assessment below threshold
 * 3. Ethical review passed
 * 4. Autonomous goals alignment checked
 * 5. Pattern recognition confidence high
 * 6. Historical precedent favorable
 * 7. No major dissenting modules
 */

import { ConsensusResult, ModuleInsight } from './CognitiveCoordinator';

export interface DecisionContext {
  moduleInsights: ModuleInsight[];
  consensus: ConsensusResult;
  riskScore: number;
  ethicalScore: number;
  goalAlignment: number;
  patternConfidence: number;
  historicalSuccess: number;
  timestamp: number;
}

export interface EmergenceResult {
  isEmergent: boolean;
  confidence: number; // 0.0 - 1.0
  contributingFactors: string[];
  dissentingModules: string[];
  reasoning: string;
  shouldExecute: boolean;
  timestamp: number;
  criteriaResults: CriteriaResults;
}

export interface CriteriaResults {
  allModulesAnalyzed: boolean;
  riskAcceptable: boolean;
  ethicallySound: boolean;
  goalsAligned: boolean;
  patternConfident: boolean;
  historicallyFavorable: boolean;
  minimalDissent: boolean;
}

export interface EmergenceStats {
  totalDetections: number;
  emergentDetections: number;
  averageConfidence: number;
  criteriaBreakdown: {
    [criterion: string]: {
      passed: number;
      failed: number;
    };
  };
  emergenceRate: number;
  lastEmergence: number | null;
}

export interface EmergenceThresholds {
  minModules?: number;
  maxRiskScore?: number;
  minEthicalScore?: number;
  minGoalAlignment?: number;
  minPatternConfidence?: number;
  minHistoricalSuccess?: number;
  maxDissentRatio?: number;
}

/**
 * Emergence Detector - The "BOOM" Moment System
 */
export class EmergenceDetector {
  private emergenceHistory: EmergenceResult[] = [];
  private maxHistorySize: number = 1000;

  // Thresholds for emergence criteria
  private thresholds = {
    minModules: 14,
    maxRiskScore: 0.3,
    minEthicalScore: 0.7,
    minGoalAlignment: 0.75,
    minPatternConfidence: 0.7,
    minHistoricalSuccess: 0.6,
    maxDissentRatio: 0.15, // Max 15% of modules can dissent
  };

  constructor(thresholds?: EmergenceThresholds) {
    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }
  }

  /**
   * Detect emergence - The "BOOM" moment detector!
   *
   * Returns true when all systems align for execution.
   */
  detectEmergence(context: DecisionContext): EmergenceResult {
    const timestamp = Date.now();

    // Evaluate all 7 criteria
    const criteriaResults = this.evaluateCriteria(context);

    // Calculate contributing factors and dissenting modules
    const contributingFactors = this.identifyContributingFactors(criteriaResults, context);
    const dissentingModules = context.consensus.opposingModules;

    // Determine if emergence is detected
    const isEmergent = this.checkEmergence(criteriaResults);

    // Calculate confidence in emergence
    const confidence = this.calculateEmergenceConfidence(criteriaResults, context);

    // Build reasoning
    const reasoning = this.buildReasoning(criteriaResults, context, isEmergent);

    // Determine if should execute
    const shouldExecute = isEmergent && confidence >= 0.7;

    const result: EmergenceResult = {
      isEmergent,
      confidence,
      contributingFactors,
      dissentingModules,
      reasoning,
      shouldExecute,
      timestamp,
      criteriaResults,
    };

    // Record in history
    this.recordEmergence(result);

    return result;
  }

  /**
   * Evaluate all 7 emergence criteria
   */
  private evaluateCriteria(context: DecisionContext): CriteriaResults {
    // 1. All 14 cognitive modules analyzed
    const allModulesAnalyzed = context.moduleInsights.length >= this.thresholds.minModules;

    // 2. Risk assessment below threshold
    const riskAcceptable = context.riskScore <= this.thresholds.maxRiskScore;

    // 3. Ethical review passed
    const ethicallySound = context.ethicalScore >= this.thresholds.minEthicalScore;

    // 4. Autonomous goals alignment checked
    const goalsAligned = context.goalAlignment >= this.thresholds.minGoalAlignment;

    // 5. Pattern recognition confidence high
    const patternConfident = context.patternConfidence >= this.thresholds.minPatternConfidence;

    // 6. Historical precedent favorable
    const historicallyFavorable = context.historicalSuccess >= this.thresholds.minHistoricalSuccess;

    // 7. No major dissenting modules
    const dissentRatio = context.consensus.opposingModules.length / context.moduleInsights.length;
    const minimalDissent = dissentRatio <= this.thresholds.maxDissentRatio;

    return {
      allModulesAnalyzed,
      riskAcceptable,
      ethicallySound,
      goalsAligned,
      patternConfident,
      historicallyFavorable,
      minimalDissent,
    };
  }

  /**
   * Check if emergence is detected (all criteria must pass)
   */
  private checkEmergence(criteria: CriteriaResults): boolean {
    return (
      criteria.allModulesAnalyzed &&
      criteria.riskAcceptable &&
      criteria.ethicallySound &&
      criteria.goalsAligned &&
      criteria.patternConfident &&
      criteria.historicallyFavorable &&
      criteria.minimalDissent
    );
  }

  /**
   * Calculate confidence in emergence detection
   */
  private calculateEmergenceConfidence(
    criteria: CriteriaResults,
    context: DecisionContext
  ): number {
    // If not all criteria pass, confidence is low
    const criteriaPassCount = Object.values(criteria).filter((v) => v).length;
    const criteriaTotalCount = Object.values(criteria).length;
    const criteriaRatio = criteriaPassCount / criteriaTotalCount;

    // Weight by consensus confidence
    const consensusWeight = context.consensus.confidence;

    // Weight by agreement level
    const agreementWeight = context.consensus.agreementLevel;

    // Combined confidence
    const confidence = criteriaRatio * 0.4 + consensusWeight * 0.3 + agreementWeight * 0.3;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Identify contributing factors to emergence
   */
  private identifyContributingFactors(
    criteria: CriteriaResults,
    context: DecisionContext
  ): string[] {
    const factors: string[] = [];

    if (criteria.allModulesAnalyzed) {
      factors.push(`All ${context.moduleInsights.length} cognitive modules analyzed`);
    }

    if (criteria.riskAcceptable) {
      factors.push(`Risk score acceptable: ${(context.riskScore * 100).toFixed(1)}%`);
    }

    if (criteria.ethicallySound) {
      factors.push(`Ethical score high: ${(context.ethicalScore * 100).toFixed(1)}%`);
    }

    if (criteria.goalsAligned) {
      factors.push(`Goals aligned: ${(context.goalAlignment * 100).toFixed(1)}%`);
    }

    if (criteria.patternConfident) {
      factors.push(`Pattern confidence high: ${(context.patternConfidence * 100).toFixed(1)}%`);
    }

    if (criteria.historicallyFavorable) {
      factors.push(`Historical success rate: ${(context.historicalSuccess * 100).toFixed(1)}%`);
    }

    if (criteria.minimalDissent) {
      const dissentCount = context.consensus.opposingModules.length;
      factors.push(`Minimal dissent: only ${dissentCount} modules opposing`);
    }

    // Add consensus support
    if (context.consensus.hasConsensus) {
      factors.push(
        `Strong consensus: ${(context.consensus.agreementLevel * 100).toFixed(1)}% agreement`
      );
    }

    return factors;
  }

  /**
   * Build human-readable reasoning
   */
  private buildReasoning(
    criteria: CriteriaResults,
    context: DecisionContext,
    isEmergent: boolean
  ): string {
    if (isEmergent) {
      return `✨ EMERGENCE DETECTED (BOOM!) ✨ All 7 criteria satisfied. ${
        context.consensus.supportingModules.length
      } modules support execution with ${(context.consensus.confidence * 100).toFixed(
        1
      )}% confidence. Risk acceptable (${(context.riskScore * 100).toFixed(1)}%), ethics sound (${(
        context.ethicalScore * 100
      ).toFixed(1)}%), goals aligned (${(context.goalAlignment * 100).toFixed(
        1
      )}%). System ready for execution.`;
    }

    // Identify which criteria failed
    const failedCriteria: string[] = [];

    if (!criteria.allModulesAnalyzed) {
      failedCriteria.push('insufficient module analysis');
    }
    if (!criteria.riskAcceptable) {
      failedCriteria.push(`risk too high (${(context.riskScore * 100).toFixed(1)}%)`);
    }
    if (!criteria.ethicallySound) {
      failedCriteria.push(`ethical concerns (${(context.ethicalScore * 100).toFixed(1)}%)`);
    }
    if (!criteria.goalsAligned) {
      failedCriteria.push(`goal misalignment (${(context.goalAlignment * 100).toFixed(1)}%)`);
    }
    if (!criteria.patternConfident) {
      failedCriteria.push(
        `low pattern confidence (${(context.patternConfidence * 100).toFixed(1)}%)`
      );
    }
    if (!criteria.historicallyFavorable) {
      failedCriteria.push(`unfavorable history (${(context.historicalSuccess * 100).toFixed(1)}%)`);
    }
    if (!criteria.minimalDissent) {
      failedCriteria.push(
        `significant dissent (${context.consensus.opposingModules.length} modules)`
      );
    }

    return `Emergence not detected. Criteria not met: ${failedCriteria.join(', ')}. ${
      context.consensus.supportingModules.length
    } modules support, ${context.consensus.opposingModules.length} oppose, ${
      context.consensus.uncertainModules.length
    } uncertain.`;
  }

  /**
   * Record emergence in history
   */
  recordEmergence(result: EmergenceResult): void {
    this.emergenceHistory.push(result);

    // Trim history if needed
    if (this.emergenceHistory.length > this.maxHistorySize) {
      this.emergenceHistory = this.emergenceHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get emergence statistics
   */
  getEmergenceStats(): EmergenceStats {
    const totalDetections = this.emergenceHistory.length;
    const emergentDetections = this.emergenceHistory.filter((e) => e.isEmergent).length;

    const averageConfidence =
      totalDetections > 0
        ? this.emergenceHistory.reduce((sum, e) => sum + e.confidence, 0) / totalDetections
        : 0;

    // Calculate criteria breakdown
    const criteriaBreakdown: { [criterion: string]: { passed: number; failed: number } } = {
      allModulesAnalyzed: { passed: 0, failed: 0 },
      riskAcceptable: { passed: 0, failed: 0 },
      ethicallySound: { passed: 0, failed: 0 },
      goalsAligned: { passed: 0, failed: 0 },
      patternConfident: { passed: 0, failed: 0 },
      historicallyFavorable: { passed: 0, failed: 0 },
      minimalDissent: { passed: 0, failed: 0 },
    };

    for (const result of this.emergenceHistory) {
      for (const [criterion, passed] of Object.entries(result.criteriaResults)) {
        if (passed) {
          criteriaBreakdown[criterion].passed++;
        } else {
          criteriaBreakdown[criterion].failed++;
        }
      }
    }

    const emergenceRate = totalDetections > 0 ? emergentDetections / totalDetections : 0;

    const emergentResults = this.emergenceHistory.filter((e) => e.isEmergent);
    const lastEmergence =
      emergentResults.length > 0 ? emergentResults[emergentResults.length - 1].timestamp : null;

    return {
      totalDetections,
      emergentDetections,
      averageConfidence,
      criteriaBreakdown,
      emergenceRate,
      lastEmergence,
    };
  }

  /**
   * Get emergence history
   */
  getEmergenceHistory(): EmergenceResult[] {
    return [...this.emergenceHistory];
  }

  /**
   * Get recent emergence results
   */
  getRecentEmergence(count: number = 10): EmergenceResult[] {
    return this.emergenceHistory.slice(-count);
  }

  /**
   * Clear emergence history
   */
  clearHistory(): void {
    this.emergenceHistory = [];
  }

  /**
   * Update thresholds dynamically
   */
  updateThresholds(thresholds: EmergenceThresholds): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): typeof EmergenceDetector.prototype.thresholds {
    return { ...this.thresholds };
  }
}
