/**
 * Risk Assessor
 *
 * Adapted from AxionCitadel's MEVRiskModel.ts
 * General-purpose multi-factor risk assessment system
 */

export enum RiskCategory {
  OPERATIONAL = 'OPERATIONAL',
  STRATEGIC = 'STRATEGIC',
  FINANCIAL = 'FINANCIAL',
  TECHNICAL = 'TECHNICAL',
  REPUTATIONAL = 'REPUTATIONAL',
  COMPLIANCE = 'COMPLIANCE',
}

export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  MINIMAL = 'MINIMAL',
}

export interface RiskFactor {
  id: string;
  name: string;
  category: RiskCategory;
  weight: number; // 0-1, importance of this factor
  currentValue: number; // 0-1, current risk level
  threshold: number; // 0-1, acceptable threshold
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  metadata: Record<string, unknown>;
}

export interface RiskAssessment {
  id: string;
  timestamp: number;
  targetId: string; // What is being assessed
  targetType: string;
  overallRiskScore: number; // 0-1
  riskLevel: RiskLevel;
  factors: RiskFactorAssessment[];
  recommendations: string[];
  confidence: number; // 0-1
  metadata: Record<string, unknown>;
}

export interface RiskFactorAssessment {
  factorId: string;
  factorName: string;
  category: RiskCategory;
  score: number; // 0-1
  contribution: number; // How much this factor contributes to overall risk
  exceedsThreshold: boolean;
  details: string;
}

export interface RiskModelConfig {
  baseRiskLevel: number;
  sensitivityFactors: Record<RiskCategory, number>;
  aggregationMethod: 'WEIGHTED_AVERAGE' | 'MAX' | 'BAYESIAN';
  dynamicAdjustment: boolean;
}

/**
 * Risk Assessment System
 * Provides multi-factor risk analysis adapted from MEV risk modeling
 */
export class RiskAssessor {
  private factors: Map<string, RiskFactor> = new Map();
  private assessments: Map<string, RiskAssessment> = new Map();
  private config: RiskModelConfig;

  constructor(config?: Partial<RiskModelConfig>) {
    this.config = {
      baseRiskLevel: 0.1,
      sensitivityFactors: {
        [RiskCategory.OPERATIONAL]: 1.0,
        [RiskCategory.STRATEGIC]: 0.9,
        [RiskCategory.FINANCIAL]: 1.1,
        [RiskCategory.TECHNICAL]: 0.8,
        [RiskCategory.REPUTATIONAL]: 0.95,
        [RiskCategory.COMPLIANCE]: 1.2,
      },
      aggregationMethod: 'WEIGHTED_AVERAGE',
      dynamicAdjustment: true,
      ...config,
    };
  }

  /**
   * Register a risk factor
   */
  registerFactor(
    name: string,
    category: RiskCategory,
    weight: number,
    threshold: number = 0.7
  ): RiskFactor {
    const factor: RiskFactor = {
      id: this.generateId('factor'),
      name,
      category,
      weight: Math.max(0, Math.min(1, weight)),
      currentValue: 0,
      threshold,
      trend: 'STABLE',
      metadata: {},
    };

    this.factors.set(factor.id, factor);
    return factor;
  }

  /**
   * Update a risk factor's current value
   */
  updateFactor(factorId: string, value: number): boolean {
    const factor = this.factors.get(factorId);
    if (!factor) return false;

    const previousValue = factor.currentValue;
    factor.currentValue = Math.max(0, Math.min(1, value));

    // Update trend
    if (factor.currentValue > previousValue * 1.1) {
      factor.trend = 'INCREASING';
    } else if (factor.currentValue < previousValue * 0.9) {
      factor.trend = 'DECREASING';
    } else {
      factor.trend = 'STABLE';
    }

    return true;
  }

  /**
   * Perform a comprehensive risk assessment
   */
  assess(
    targetId: string,
    targetType: string,
    contextFactors?: Record<string, number>
  ): RiskAssessment {
    const timestamp = Date.now();
    const factorAssessments: RiskFactorAssessment[] = [];

    // Assess each registered factor
    this.factors.forEach((factor) => {
      let score = factor.currentValue;

      // Apply context if provided
      if (contextFactors && contextFactors[factor.id] !== undefined) {
        score = contextFactors[factor.id];
      }

      // Apply category sensitivity
      const sensitivity = this.config.sensitivityFactors[factor.category];
      const adjustedScore = this.adjustScore(score, sensitivity);

      // Calculate contribution to overall risk
      const contribution = adjustedScore * factor.weight;

      factorAssessments.push({
        factorId: factor.id,
        factorName: factor.name,
        category: factor.category,
        score: adjustedScore,
        contribution,
        exceedsThreshold: adjustedScore > factor.threshold,
        details: this.generateFactorDetails(factor, adjustedScore),
      });
    });

    // Calculate overall risk score
    const overallRiskScore = this.aggregateRisk(factorAssessments);
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factorAssessments, overallRiskScore);

    // Calculate confidence based on factor consistency
    const confidence = this.calculateConfidence(factorAssessments);

    const assessment: RiskAssessment = {
      id: this.generateId('assessment'),
      timestamp,
      targetId,
      targetType,
      overallRiskScore,
      riskLevel,
      factors: factorAssessments,
      recommendations,
      confidence,
      metadata: {},
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * Get risk factors by category
   */
  getFactorsByCategory(category: RiskCategory): RiskFactor[] {
    return Array.from(this.factors.values()).filter((f) => f.category === category);
  }

  /**
   * Get historical assessments for a target
   */
  getAssessmentHistory(targetId: string, limit: number = 10): RiskAssessment[] {
    return Array.from(this.assessments.values())
      .filter((a) => a.targetId === targetId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get risk trend over time
   */
  getRiskTrend(targetId: string): {
    dataPoints: Array<{ timestamp: number; riskScore: number }>;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    changeRate: number;
  } {
    const history = this.getAssessmentHistory(targetId, 100);

    if (history.length < 2) {
      return {
        dataPoints: [],
        trend: 'STABLE',
        changeRate: 0,
      };
    }

    const dataPoints = history
      .map((a) => ({
        timestamp: a.timestamp,
        riskScore: a.overallRiskScore,
      }))
      .reverse(); // Chronological order

    // Calculate trend
    const recent = dataPoints.slice(-5);
    const earlier = dataPoints.slice(-10, -5);

    const recentAvg = recent.reduce((sum, p) => sum + p.riskScore, 0) / recent.length;
    const earlierAvg =
      earlier.length > 0
        ? earlier.reduce((sum, p) => sum + p.riskScore, 0) / earlier.length
        : recentAvg;

    const changeRate = recentAvg - earlierAvg;

    let trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    if (Math.abs(changeRate) < 0.05) {
      trend = 'STABLE';
    } else if (changeRate > 0) {
      trend = 'INCREASING';
    } else {
      trend = 'DECREASING';
    }

    return { dataPoints, trend, changeRate };
  }

  /**
   * Get risk summary statistics
   */
  getRiskSummary(): {
    totalFactors: number;
    factorsByCategory: Record<RiskCategory, number>;
    factorsExceedingThreshold: number;
    totalAssessments: number;
    averageRiskScore: number;
    highRiskTargets: string[];
  } {
    const factors = Array.from(this.factors.values());

    const factorsByCategory: Record<RiskCategory, number> = {
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.STRATEGIC]: 0,
      [RiskCategory.FINANCIAL]: 0,
      [RiskCategory.TECHNICAL]: 0,
      [RiskCategory.REPUTATIONAL]: 0,
      [RiskCategory.COMPLIANCE]: 0,
    };

    factors.forEach((f) => {
      factorsByCategory[f.category]++;
    });

    const factorsExceedingThreshold = factors.filter((f) => f.currentValue > f.threshold).length;

    const assessments = Array.from(this.assessments.values());
    const averageRiskScore =
      assessments.length > 0
        ? assessments.reduce((sum, a) => sum + a.overallRiskScore, 0) / assessments.length
        : 0;

    const highRiskTargets = Array.from(
      new Set(
        assessments
          .filter((a) => a.riskLevel === RiskLevel.HIGH || a.riskLevel === RiskLevel.CRITICAL)
          .map((a) => a.targetId)
      )
    );

    return {
      totalFactors: factors.length,
      factorsByCategory,
      factorsExceedingThreshold,
      totalAssessments: assessments.length,
      averageRiskScore,
      highRiskTargets,
    };
  }

  /**
   * Export risk data
   */
  export(): {
    factors: RiskFactor[];
    assessments: RiskAssessment[];
    config: RiskModelConfig;
  } {
    return {
      factors: Array.from(this.factors.values()),
      assessments: Array.from(this.assessments.values()),
      config: { ...this.config },
    };
  }

  /**
   * Import risk data
   */
  import(data: {
    factors: RiskFactor[];
    assessments: RiskAssessment[];
    config?: RiskModelConfig;
  }): void {
    this.factors.clear();
    this.assessments.clear();

    data.factors.forEach((f) => this.factors.set(f.id, f));
    data.assessments.forEach((a) => this.assessments.set(a.id, a));

    if (data.config) {
      this.config = data.config;
    }
  }

  private adjustScore(score: number, sensitivity: number): number {
    // Apply sensitivity adjustment with logarithmic scaling
    return Math.min(1, score * sensitivity * (1 + Math.log1p(score) * 0.1));
  }

  private aggregateRisk(factorAssessments: RiskFactorAssessment[]): number {
    if (factorAssessments.length === 0) {
      return this.config.baseRiskLevel;
    }

    switch (this.config.aggregationMethod) {
      case 'WEIGHTED_AVERAGE': {
        const totalWeight = factorAssessments.reduce((sum, fa) => {
          const factor = this.factors.get(fa.factorId);
          return sum + (factor?.weight || 0);
        }, 0);

        const weightedSum = factorAssessments.reduce((sum, fa) => {
          const factor = this.factors.get(fa.factorId);
          return sum + fa.contribution;
        }, 0);

        return totalWeight > 0 ? weightedSum / totalWeight : this.config.baseRiskLevel;
      }

      case 'MAX': {
        const maxScore = Math.max(...factorAssessments.map((fa) => fa.score));
        return maxScore;
      }

      case 'BAYESIAN': {
        // Simple Bayesian-like combination
        let combinedRisk = this.config.baseRiskLevel;
        factorAssessments.forEach((fa) => {
          combinedRisk = combinedRisk + fa.score * (1 - combinedRisk);
        });
        return Math.min(1, combinedRisk);
      }

      default:
        return this.config.baseRiskLevel;
    }
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 0.8) return RiskLevel.CRITICAL;
    if (score >= 0.6) return RiskLevel.HIGH;
    if (score >= 0.4) return RiskLevel.MEDIUM;
    if (score >= 0.2) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  private generateRecommendations(
    factorAssessments: RiskFactorAssessment[],
    overallRiskScore: number
  ): string[] {
    const recommendations: string[] = [];

    // High overall risk
    if (overallRiskScore > 0.7) {
      recommendations.push('Overall risk is HIGH - immediate attention required');
    }

    // Factors exceeding thresholds
    const exceeding = factorAssessments.filter((fa) => fa.exceedsThreshold);
    if (exceeding.length > 0) {
      recommendations.push(
        `${exceeding.length} risk factors exceed acceptable thresholds: ${exceeding
          .map((fa) => fa.factorName)
          .join(', ')}`
      );
    }

    // Category-specific recommendations
    const byCategory = new Map<RiskCategory, RiskFactorAssessment[]>();
    factorAssessments.forEach((fa) => {
      if (!byCategory.has(fa.category)) {
        byCategory.set(fa.category, []);
      }
      byCategory.get(fa.category)!.push(fa);
    });

    byCategory.forEach((assessments, category) => {
      const avgScore = assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length;
      if (avgScore > 0.6) {
        recommendations.push(
          `Review ${category} risk factors - average score is ${avgScore.toFixed(2)}`
        );
      }
    });

    return recommendations;
  }

  private generateFactorDetails(factor: RiskFactor, score: number): string {
    const status = score > factor.threshold ? 'EXCEEDS' : 'WITHIN';
    return `${factor.name}: ${score.toFixed(3)} (${status} threshold of ${
      factor.threshold
    }), Trend: ${factor.trend}`;
  }

  private calculateConfidence(factorAssessments: RiskFactorAssessment[]): number {
    if (factorAssessments.length === 0) return 0.5;

    // Confidence based on factor consistency
    const scores = factorAssessments.map((fa) => fa.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher confidence
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    return Math.max(0.1, Math.min(1, 1 - coefficientOfVariation));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
