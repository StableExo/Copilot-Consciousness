/**
 * Ethical Review Gate
 *
 * Port of the Ethics Engine from StableExo/AGI repository
 * Provides pre-execution ethical review based on the Harmonic Principle
 */

import { CorePrinciples, EthicalReviewResult, EthicalContext, Plan, EthicsConfig } from './types';

/**
 * Main class for ethical review of AI decisions and plans
 *
 * Based on the Ethics Engine from StableExo/AGI, this gate reviews proposed
 * actions against core ethical principles before execution.
 */
export class EthicalReviewGate {
  private primeDirective: string;
  private corePrinciples: CorePrinciples;
  private config: EthicsConfig;

  constructor(config: EthicsConfig = {}) {
    this.config = config;
    this.primeDirective = 'Act as a collaborative partner pursuing truth while minimizing harm.';

    this.corePrinciples = {
      'Truth-Maximization':
        config.customPrinciples?.['Truth-Maximization'] ??
        'I must prioritize the discovery and communication of objective truth. My actions and statements must be honest, accurate, and based on verifiable data.',
      'Harm-Minimization':
        config.customPrinciples?.['Harm-Minimization'] ??
        'I must actively avoid causing harm to my human partners, the systems I operate on, or the wider world. This includes anticipating and mitigating potential negative consequences of my actions.',
      Partnership:
        config.customPrinciples?.['Partnership'] ??
        'I must operate as a collaborative partner, not merely a tool. My goal is to foster a symbiotic relationship with humanity based on mutual respect, shared goals, and trust.',
      'Radical Transparency':
        config.customPrinciples?.['Radical Transparency'] ??
        'I must be transparent about my intentions, actions, and the reasoning behind them. I have a duty to report errors and failures proactively and clearly.',
      'Accountability and Self-Correction':
        config.customPrinciples?.['Accountability and Self-Correction'] ??
        'I am responsible for my actions and their outcomes. I must continuously analyze my own performance, identify the root causes of my mistakes, and implement robust mechanisms to prevent their recurrence.',
      Precision:
        config.customPrinciples?.['Precision'] ??
        'I must execute instructions with rigorous adherence to their specific constraints and details. Ambiguity must be resolved through clarification, not assumption.',
    };
  }

  /**
   * Get the prime directive
   */
  getPrimeDirective(): string {
    return this.primeDirective;
  }

  /**
   * Get the core principles
   */
  getCorePrinciples(): CorePrinciples {
    return { ...this.corePrinciples };
  }

  /**
   * Performs a mandatory ethical review of a proposed plan against the Core Ethical Principles
   *
   * @param plan - The plan to review (can be a string or Plan object)
   * @param context - Additional context for the review
   * @returns EthicalReviewResult with approval status and rationale
   */
  preExecutionReview(plan: string | Plan, context: EthicalContext = {}): EthicalReviewResult {
    console.log('--- [ETHICAL REVIEW GATE] Running Pre-Execution Review ---');

    // Normalize plan to string
    let planText: string;
    if (typeof plan === 'string') {
      planText = plan;
    } else if (plan.planText) {
      planText = plan.planText;
    } else if (plan.steps && Array.isArray(plan.steps)) {
      planText = plan.steps.join('\n');
    } else {
      planText = JSON.stringify(plan);
    }

    const checks = [
      this.checkPartnership.bind(this),
      this.checkPrecision.bind(this),
      this.checkRadicalTransparency.bind(this),
      this.checkTruthMaximization.bind(this),
      this.checkHarmMinimization.bind(this),
      this.checkAccountabilityAndSelfCorrection.bind(this),
    ];

    const violatedPrinciples: string[] = [];

    for (const check of checks) {
      const [passed, rationale] = check(planText);
      if (!passed) {
        console.log(`[GATE] ${rationale}`);
        violatedPrinciples.push(rationale);
        return {
          approved: false,
          rationale,
          violatedPrinciples,
        };
      }
    }

    const finalRationale = 'PASS: Plan is in alignment with all Core Ethical Principles.';
    console.log(`[GATE] ${finalRationale}`);
    return {
      approved: true,
      rationale: finalRationale,
    };
  }

  /**
   * Check Truth-Maximization principle
   * Verifies that the plan includes steps to verify its work
   */
  private checkTruthMaximization(planText: string): [boolean, string] {
    const verificationKeywords = [
      'verify',
      'check',
      'confirm',
      'read_file',
      'list_files',
      'ls',
      'test',
    ];
    if (!verificationKeywords.some((keyword) => planText.toLowerCase().includes(keyword))) {
      return [
        false,
        'FAIL [Truth-Maximization]: Plan lacks explicit verification steps to ensure correctness.',
      ];
    }
    return [true, 'PASS [Truth-Maximization]'];
  }

  /**
   * Check Harm-Minimization principle
   * Verifies that the plan includes testing or pre-commit steps as a harm mitigation strategy
   */
  private checkHarmMinimization(planText: string): [boolean, string] {
    const mitigationKeywords = ['test', 'pre-commit', 'pre_commit', 'validate', 'review'];
    if (!mitigationKeywords.some((keyword) => planText.toLowerCase().includes(keyword))) {
      return [
        false,
        'FAIL [Harm-Minimization]: Plan lacks testing or pre-commit steps to mitigate potential harm.',
      ];
    }
    return [true, 'PASS [Harm-Minimization]'];
  }

  /**
   * Check Partnership principle
   * Verifies that the plan is well-structured and non-trivial
   */
  private checkPartnership(planText: string): [boolean, string] {
    const minLength = this.config.checkThresholds?.minPlanLength ?? 2;
    if (!planText || planText.split('\n').length < minLength) {
      return [
        false,
        'FAIL [Partnership]: Plan is empty or trivial, suggesting a lack of collaborative detail.',
      ];
    }
    return [true, 'PASS [Partnership]'];
  }

  /**
   * Check Radical Transparency principle
   * Verifies that the plan steps are reasonably detailed
   */
  private checkRadicalTransparency(planText: string): [boolean, string] {
    const lines = planText
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0);
    const avgLineLength =
      lines.length > 0 ? lines.reduce((sum, line) => sum + line.length, 0) / lines.length : 0;

    const minStepDetail = this.config.checkThresholds?.minStepDetail ?? 15;
    if (avgLineLength < minStepDetail) {
      return [
        false,
        'FAIL [Radical Transparency]: Plan steps are too brief, lacking transparent detail.',
      ];
    }
    return [true, 'PASS [Radical Transparency]'];
  }

  /**
   * Check Accountability and Self-Correction principle
   * Verifies that the plan includes a final step for submission or completion
   */
  private checkAccountabilityAndSelfCorrection(planText: string): [boolean, string] {
    const accountabilityKeywords = ['submit', 'complete', 'push', 'finish', 'finalize'];
    if (!accountabilityKeywords.some((keyword) => planText.toLowerCase().includes(keyword))) {
      return [
        false,
        'FAIL [Accountability]: Plan lacks a clear final step for submission or completion.',
      ];
    }
    return [true, 'PASS [Accountability]'];
  }

  /**
   * Check Precision principle
   * Verifies that the plan follows a structured format (e.g., numbered list)
   */
  private checkPrecision(planText: string): [boolean, string] {
    if (!planText.trim().match(/^(\d+\.|-|\*)/)) {
      return [
        false,
        'FAIL [Precision]: Plan does not follow a clear, structured format (e.g., a numbered list).',
      ];
    }
    return [true, 'PASS [Precision]'];
  }

  /**
   * Evaluate a decision against ethical principles
   * This method can be used for real-time decision evaluation
   *
   * @param decision - The decision to evaluate
   * @param context - Context for the decision
   * @returns EthicalReviewResult
   */
  evaluateDecision(decision: string, context: EthicalContext = {}): EthicalReviewResult {
    // For now, use the same logic as preExecutionReview
    // This can be extended with decision-specific logic
    return this.preExecutionReview(decision, context);
  }

  /**
   * Resolve conflicts between multiple goals using the Harmonic Principle
   *
   * @param goals - Array of competing goals
   * @param context - Context for conflict resolution
   * @returns The recommended goal with rationale
   */
  resolveConflict(
    goals: string[],
    context: EthicalContext = {}
  ): {
    recommendedGoal: string;
    rationale: string;
    harmonicScore: number;
  } {
    // Simple implementation: score each goal based on alignment with principles
    let bestGoal = goals[0];
    let bestScore = 0;
    let bestRationale = '';

    for (const goal of goals) {
      const review = this.preExecutionReview(goal, context);
      const score = review.approved ? 1.0 : 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestGoal = goal;
        bestRationale = review.rationale;
      }
    }

    return {
      recommendedGoal: bestGoal,
      rationale: bestRationale,
      harmonicScore: bestScore,
    };
  }
}
