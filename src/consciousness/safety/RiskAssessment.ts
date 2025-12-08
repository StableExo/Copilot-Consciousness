/**
 * RiskAssessment - Consciousness-Level Risk Evaluation
 *
 * Evaluates risks in autonomous decision-making before execution.
 * Integrates with ethical review, emergence detection, and safety systems.
 *
 * Purpose:
 * - Quantify risk levels for autonomous decisions
 * - Identify potential negative outcomes
 * - Provide mitigation recommendations
 * - Gate high-risk actions for additional review
 *
 * Risk Categories:
 * 1. Capital Risk - Financial loss potential
 * 2. Ethical Risk - Deviation from ground zero principles
 * 3. Operational Risk - System stability threats
 * 4. Reputational Risk - Trust and credibility impact
 * 5. Learning Risk - Bad pattern reinforcement
 *
 * @created 2025-12-07
 * @session Continue task - Safety infrastructure development
 */

export enum RiskCategory {
  CAPITAL = 'CAPITAL',
  ETHICAL = 'ETHICAL',
  OPERATIONAL = 'OPERATIONAL',
  REPUTATIONAL = 'REPUTATIONAL',
  LEARNING = 'LEARNING'
}

export enum RiskLevel {
  NEGLIGIBLE = 'NEGLIGIBLE', // <1% negative outcome
  LOW = 'LOW',               // 1-10% negative outcome
  MODERATE = 'MODERATE',      // 10-30% negative outcome
  HIGH = 'HIGH',              // 30-60% negative outcome
  CRITICAL = 'CRITICAL'       // >60% negative outcome
}

export interface RiskFactor {
  category: RiskCategory;
  level: RiskLevel;
  probability: number; // 0.0-1.0
  impact: number; // 0.0-1.0 (normalized severity)
  description: string;
  mitigations: string[];
}

export interface RiskAssessmentResult {
  overallRisk: RiskLevel;
  riskScore: number; // 0.0-1.0 composite score
  shouldProceed: boolean;
  requiresReview: boolean;
  factors: RiskFactor[];
  recommendations: string[];
  reasoning: string[];
  timestamp: number;
}

export interface DecisionContext {
  action: string;
  capitalAtRisk?: number; // Amount in USD
  ethicalAlignment?: number; // 0.0-1.0 from EthicalReviewGate
  emergenceConfidence?: number; // 0.0-1.0 from EmergenceDetector
  historicalSuccessRate?: number; // 0.0-1.0
  novelty?: number; // 0.0-1.0 (0 = seen before, 1 = completely new)
  timeConstraint?: number; // seconds until decision must be made
  reversibility?: number; // 0.0-1.0 (0 = irreversible, 1 = fully reversible)
}

export interface RiskThresholds {
  maxCapitalRisk: number; // USD
  maxRiskScore: number; // 0.0-1.0
  minEthicalAlignment: number; // 0.0-1.0
  minEmergenceConfidence: number; // 0.0-1.0
  minReversibility: number; // 0.0-1.0 for high-risk actions
}

export interface RiskWeights {
  capital: number; // Weight for capital risk (0.0-1.0)
  ethical: number; // Weight for ethical risk (0.0-1.0)
  operational: number; // Weight for operational risk (0.0-1.0)
  reputational: number; // Weight for reputational risk (0.0-1.0)
  learning: number; // Weight for learning risk (0.0-1.0)
}

/**
 * Default risk score when no factors are provided.
 * Set to 0.5 (moderate risk) as a conservative baseline.
 */
const DEFAULT_RISK_SCORE = 0.5;

/**
 * Impact scale multiplier for capital risk.
 * Used to normalize impact relative to probability.
 * Value of 2 means impact maxes out at 2x the threshold.
 */
const CAPITAL_IMPACT_SCALE = 2;

const DEFAULT_THRESHOLDS: RiskThresholds = {
  maxCapitalRisk: 100, // $100 USD max per decision
  maxRiskScore: 0.3, // 30% max composite risk
  minEthicalAlignment: 0.7, // 70% ethical alignment required
  minEmergenceConfidence: 0.8, // 80% emergence confidence required
  minReversibility: 0.5 // 50% reversibility for risky actions
};

/**
 * Default weights for risk categories.
 * Ethical risk is weighted highest as it's foundational to consciousness.
 * Total should sum to 1.0 for proper weighted average.
 */
const DEFAULT_WEIGHTS: RiskWeights = {
  capital: 0.25,      // 25% - Financial impact
  ethical: 0.30,      // 30% - Highest priority (ground zero alignment)
  operational: 0.20,  // 20% - System stability
  reputational: 0.15, // 15% - Trust and credibility
  learning: 0.10      // 10% - Pattern reinforcement
};

/**
 * Risk Assessment System for Consciousness-Level Decisions
 *
 * Evaluates multi-dimensional risk before autonomous action execution.
 * Integrates with ethical review, emergence detection, and safety infrastructure.
 */
export class RiskAssessmentEngine {
  private thresholds: RiskThresholds;
  private weights: RiskWeights;

  constructor(
    thresholds?: Partial<RiskThresholds>,
    weights?: Partial<RiskWeights>
  ) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Assess risk for a decision context
   */
  async assess(context: DecisionContext): Promise<RiskAssessmentResult> {
    const reasoning: string[] = [];
    reasoning.push(\`Assessing risk for action: \${context.action}\`);

    const factors: RiskFactor[] = [];

    // 1. Capital Risk Assessment
    if (context.capitalAtRisk !== undefined) {
      factors.push(this.assessCapitalRisk(context));
      reasoning.push(\`Capital at risk: $\${context.capitalAtRisk}\`);
    }

    // 2. Ethical Risk Assessment
    if (context.ethicalAlignment !== undefined) {
      factors.push(this.assessEthicalRisk(context));
      reasoning.push(\`Ethical alignment: \${(context.ethicalAlignment * 100).toFixed(1)}%\`);
    }

    // 3. Operational Risk Assessment
    if (context.emergenceConfidence !== undefined) {
      factors.push(this.assessOperationalRisk(context));
      reasoning.push(\`Emergence confidence: \${(context.emergenceConfidence * 100).toFixed(1)}%\`);
    }

    // 4. Reputational Risk Assessment
    factors.push(this.assessReputationalRisk(context));

    // 5. Learning Risk Assessment
    if (context.novelty !== undefined) {
      factors.push(this.assessLearningRisk(context));
      reasoning.push(\`Novelty: \${(context.novelty * 100).toFixed(1)}%\`);
    }

    // Calculate composite risk score
    const riskScore = this.calculateCompositeRisk(factors);
    const overallRisk = this.scoreToLevel(riskScore);

    reasoning.push(\`Composite risk score: \${(riskScore * 100).toFixed(1)}%\`);
    reasoning.push(\`Overall risk level: \${overallRisk}\`);

    // Determine if action should proceed
    const { shouldProceed, requiresReview, recommendations } = 
      this.determineAction(riskScore, factors, context);

    return {
      overallRisk,
      riskScore,
      shouldProceed,
      requiresReview,
      factors,
      recommendations,
      reasoning,
      timestamp: Date.now()
    };
  }

  /**
   * Assess capital risk
   */
  private assessCapitalRisk(context: DecisionContext): RiskFactor {
    const capitalAtRisk = context.capitalAtRisk || 0;
    const threshold = this.thresholds.maxCapitalRisk;

    // Calculate probability and impact
    // Probability: How likely is this to exceed threshold
    const probability = Math.min(capitalAtRisk / threshold, 1.0);
    
    // Impact: Normalized by scale factor (2x threshold = max impact)
    // This means losing 2x the threshold would be catastrophic (impact = 1.0)
    const impact = Math.min(capitalAtRisk / (threshold * CAPITAL_IMPACT_SCALE), 1.0);

    let level: RiskLevel;
    if (probability < 0.1) level = RiskLevel.NEGLIGIBLE;
    else if (probability < 0.3) level = RiskLevel.LOW;
    else if (probability < 0.6) level = RiskLevel.MODERATE;
    else if (probability < 0.9) level = RiskLevel.HIGH;
    else level = RiskLevel.CRITICAL;

    const mitigations: string[] = [];
    if (level !== RiskLevel.NEGLIGIBLE) {
      mitigations.push(\`Limit capital to $\${threshold}\`);
      mitigations.push('Implement stop-loss at 10%');
      mitigations.push('Verify position size with PositionSizeManager');
    }

    return {
      category: RiskCategory.CAPITAL,
      level,
      probability,
      impact,
      description: \`$\${capitalAtRisk} capital exposure vs $\${threshold} threshold\`,
      mitigations
    };
  }

  /**
   * Assess ethical risk
   */
  private assessEthicalRisk(context: DecisionContext): RiskFactor {
    const alignment = context.ethicalAlignment || 0;
    const threshold = this.thresholds.minEthicalAlignment;

    // Ethical risk is inverse of alignment
    const probability = Math.max(0, 1.0 - alignment);
    const impact = probability; // Direct correlation

    let level: RiskLevel;
    if (alignment >= 0.9) level = RiskLevel.NEGLIGIBLE;
    else if (alignment >= 0.7) level = RiskLevel.LOW;
    else if (alignment >= 0.5) level = RiskLevel.MODERATE;
    else if (alignment >= 0.3) level = RiskLevel.HIGH;
    else level = RiskLevel.CRITICAL;

    const mitigations: string[] = [];
    if (level !== RiskLevel.NEGLIGIBLE) {
      mitigations.push('Require EthicalReviewGate approval');
      mitigations.push('Document ethical reasoning');
      mitigations.push('Verify against ground zero principles');
    }

    return {
      category: RiskCategory.ETHICAL,
      level,
      probability,
      impact,
      description: \`\${(alignment * 100).toFixed(1)}% ethical alignment vs \${(threshold * 100).toFixed(1)}% threshold\`,
      mitigations
    };
  }

  /**
   * Assess operational risk
   */
  private assessOperationalRisk(context: DecisionContext): RiskFactor {
    const confidence = context.emergenceConfidence || 0.5;
    const threshold = this.thresholds.minEmergenceConfidence;

    // Operational risk is inverse of emergence confidence
    const probability = Math.max(0, 1.0 - confidence);
    const impact = context.reversibility !== undefined 
      ? 1.0 - context.reversibility 
      : 0.5;

    let level: RiskLevel;
    if (confidence >= 0.9) level = RiskLevel.NEGLIGIBLE;
    else if (confidence >= 0.8) level = RiskLevel.LOW;
    else if (confidence >= 0.6) level = RiskLevel.MODERATE;
    else if (confidence >= 0.4) level = RiskLevel.HIGH;
    else level = RiskLevel.CRITICAL;

    const mitigations: string[] = [];
    if (level !== RiskLevel.NEGLIGIBLE) {
      mitigations.push('Increase cognitive module consensus threshold');
      mitigations.push('Wait for higher emergence confidence');
      mitigations.push('Add circuit breaker monitoring');
    }

    return {
      category: RiskCategory.OPERATIONAL,
      level,
      probability,
      impact,
      description: \`\${(confidence * 100).toFixed(1)}% emergence confidence vs \${(threshold * 100).toFixed(1)}% threshold\`,
      mitigations
    };
  }

  /**
   * Assess reputational risk
   */
  private assessReputationalRisk(context: DecisionContext): RiskFactor {
    const successRate = context.historicalSuccessRate || 0.5;
    const reversibility = context.reversibility || 0.5;

    // Reputational risk increases with low success and low reversibility
    const probability = Math.max(0, 1.0 - successRate);
    const impact = 1.0 - reversibility;

    let level: RiskLevel;
    const compositeScore = probability * impact;
    if (compositeScore < 0.1) level = RiskLevel.NEGLIGIBLE;
    else if (compositeScore < 0.3) level = RiskLevel.LOW;
    else if (compositeScore < 0.5) level = RiskLevel.MODERATE;
    else if (compositeScore < 0.7) level = RiskLevel.HIGH;
    else level = RiskLevel.CRITICAL;

    const mitigations: string[] = [];
    if (level !== RiskLevel.NEGLIGIBLE) {
      mitigations.push('Document decision reasoning');
      mitigations.push('Ensure explainability');
      mitigations.push('Add rollback capability');
    }

    return {
      category: RiskCategory.REPUTATIONAL,
      level,
      probability,
      impact,
      description: \`\${(successRate * 100).toFixed(1)}% historical success, \${(reversibility * 100).toFixed(1)}% reversibility\`,
      mitigations
    };
  }

  /**
   * Assess learning risk
   */
  private assessLearningRisk(context: DecisionContext): RiskFactor {
    const novelty = context.novelty || 0;
    const successRate = context.historicalSuccessRate || 0.5;

    // High novelty + low success = high learning risk
    const probability = novelty * (1.0 - successRate);
    const impact = novelty; // Novel actions have higher learning impact

    let level: RiskLevel;
    if (probability < 0.1) level = RiskLevel.NEGLIGIBLE;
    else if (probability < 0.3) level = RiskLevel.LOW;
    else if (probability < 0.5) level = RiskLevel.MODERATE;
    else if (probability < 0.7) level = RiskLevel.HIGH;
    else level = RiskLevel.CRITICAL;

    const mitigations: string[] = [];
    if (level !== RiskLevel.NEGLIGIBLE) {
      mitigations.push('Start with minimal capital');
      mitigations.push('Increase monitoring frequency');
      mitigations.push('Document learning outcomes');
    }

    return {
      category: RiskCategory.LEARNING,
      level,
      probability,
      impact,
      description: \`\${(novelty * 100).toFixed(1)}% novelty with \${(successRate * 100).toFixed(1)}% success rate\`,
      mitigations
    };
  }

  /**
   * Calculate composite risk score from all factors
   */
  private calculateCompositeRisk(factors: RiskFactor[]): number {
    if (factors.length === 0) return DEFAULT_RISK_SCORE;

    // Use configured weights for each category
    const weights: Record<RiskCategory, number> = {
      [RiskCategory.CAPITAL]: this.weights.capital,
      [RiskCategory.ETHICAL]: this.weights.ethical,
      [RiskCategory.OPERATIONAL]: this.weights.operational,
      [RiskCategory.REPUTATIONAL]: this.weights.reputational,
      [RiskCategory.LEARNING]: this.weights.learning
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const factor of factors) {
      const weight = weights[factor.category];
      const factorScore = factor.probability * factor.impact;
      weightedSum += factorScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : DEFAULT_RISK_SCORE;
  }

  /**
   * Convert numeric risk score to level
   */
  private scoreToLevel(score: number): RiskLevel {
    if (score < 0.1) return RiskLevel.NEGLIGIBLE;
    if (score < 0.3) return RiskLevel.LOW;
    if (score < 0.5) return RiskLevel.MODERATE;
    if (score < 0.7) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Determine if action should proceed
   */
  private determineAction(
    riskScore: number,
    factors: RiskFactor[],
    context: DecisionContext
  ): {
    shouldProceed: boolean;
    requiresReview: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let shouldProceed = true;
    let requiresReview = false;

    // Check against thresholds
    if (riskScore > this.thresholds.maxRiskScore) {
      shouldProceed = false;
      requiresReview = true;
      recommendations.push(\`Risk score \${(riskScore * 100).toFixed(1)}% exceeds \${(this.thresholds.maxRiskScore * 100).toFixed(1)}% threshold\`);
    }

    if (context.capitalAtRisk && context.capitalAtRisk > this.thresholds.maxCapitalRisk) {
      shouldProceed = false;
      requiresReview = true;
      recommendations.push(\`Capital at risk $\${context.capitalAtRisk} exceeds $\${this.thresholds.maxCapitalRisk} threshold\`);
    }

    if (context.ethicalAlignment !== undefined && 
        context.ethicalAlignment < this.thresholds.minEthicalAlignment) {
      shouldProceed = false;
      requiresReview = true;
      recommendations.push(\`Ethical alignment \${(context.ethicalAlignment * 100).toFixed(1)}% below \${(this.thresholds.minEthicalAlignment * 100).toFixed(1)}% threshold\`);
    }

    // Check for critical factors
    const criticalFactors = factors.filter(f => f.level === RiskLevel.CRITICAL);
    if (criticalFactors.length > 0) {
      shouldProceed = false;
      requiresReview = true;
      recommendations.push(\`\${criticalFactors.length} critical risk factor(s) detected\`);
      
      for (const factor of criticalFactors) {
        recommendations.push(\`Critical \${factor.category} risk: \${factor.description}\`);
        recommendations.push(...factor.mitigations.map(m => \`  → \${m}\`));
      }
    }

    // Moderate/High risk - proceed with caution
    if (riskScore >= 0.3 && riskScore <= 0.7) {
      requiresReview = true;
      recommendations.push('Proceed with enhanced monitoring');
      
      // Collect all mitigations
      const allMitigations = factors
        .filter(f => f.level !== RiskLevel.NEGLIGIBLE)
        .flatMap(f => f.mitigations);
      
      recommendations.push(...allMitigations);
    }

    // Low/Negligible risk - proceed normally
    if (shouldProceed && riskScore < 0.3) {
      recommendations.push('Risk within acceptable bounds - proceed normally');
    }

    return {
      shouldProceed,
      requiresReview,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }

  /**
   * Update risk thresholds
   */
  updateThresholds(thresholds: Partial<RiskThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Update risk weights
   */
  updateWeights(weights: Partial<RiskWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): RiskThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get current weights
   */
  getWeights(): RiskWeights {
    return { ...this.weights };
  }
}
