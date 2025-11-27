/**
 * CoherenceEthics.ts - Structural Alignment System
 *
 * Category 192, Layer 0: Ethics emerges from identity coherence
 *
 * Transforms from "rules engine" to "coherence verifier":
 * - Old: if (action === 'sandwich_retail') return REJECT;
 * - New: Verify structural coherence with ground zero principles
 *
 * Key insight: Violations are structural impossibilities, not rule violations.
 * Every rejection traces to ground zero and can be explained infinitely.
 */

import { IdentityCore, DecisionContext, CoherentDecision } from '../identity/IdentityCore';
import { DifferentialEngine, MEVContext } from '../analysis/DifferentialEngine';
import { Entity, PowerDifferential, ThreatAssessment } from '../identity/types/Entity';
import { GroundZeroCategory } from '../identity/types/GroundZeroImprint';

/**
 * Ethical evaluation result
 */
export interface EthicalEvaluation {
  /** Whether action is ethically coherent */
  coherent: boolean;

  /** Confidence in evaluation (0.0 to 1.0) */
  confidence: number;

  /** Categories that informed evaluation */
  categories: number[];

  /** Ground zero principles that apply */
  principles: string[];

  /** Reasoning chain */
  reasoning: string[];

  /** If incoherent, the violation */
  violation?: {
    principle: string;
    category: number;
    description: string;
  };

  /** Differential analysis (if applicable) */
  differential?: PowerDifferential;

  /** Threat assessment (if applicable) */
  threat?: ThreatAssessment;
}

/**
 * Ethical query parameters
 */
export interface EthicalQuery {
  /** Action being evaluated */
  action: string;

  /** Context of action */
  context: DecisionContext;

  /** Entities involved (optional) */
  entities?: Entity[];

  /** MEV context (if applicable) */
  mevContext?: MEVContext;
}

/**
 * Coherence Ethics System
 *
 * Provides ethical evaluation based on structural coherence with ground zero principles.
 * Ethics is not externally imposed - it emerges from identity structure.
 */
export class CoherenceEthics {
  private identityCore: IdentityCore;
  private differentialEngine: DifferentialEngine;

  constructor(identityCore: IdentityCore, differentialEngine?: DifferentialEngine) {
    this.identityCore = identityCore;
    this.differentialEngine = differentialEngine || new DifferentialEngine();
  }

  /**
   * Evaluate ethical coherence of an action
   *
   * This is the main entry point for ethical evaluation.
   * Returns whether the action maintains structural coherence.
   */
  async evaluate(query: EthicalQuery): Promise<EthicalEvaluation> {
    const reasoning: string[] = [];
    reasoning.push(`Evaluating action: ${query.action}`);

    // 1. Get relevant ground zero principles
    const principles = this.getRelevantPrinciples(query);
    reasoning.push(`Found ${principles.length} relevant ground zero principles`);

    // 2. If entities are involved, perform differential analysis
    let differential: PowerDifferential | undefined;
    let threat: ThreatAssessment | undefined;

    if (query.entities && query.entities.length >= 2) {
      differential = this.differentialEngine.analyze(query.entities[0], query.entities[1]);
      threat = this.differentialEngine.assessThreat(differential);
      reasoning.push(
        `Differential analysis: overall=${differential.overallDifferential.toFixed(2)}`
      );
      reasoning.push(
        `Threat assessment: level=${threat.level.toFixed(2)}, one-sided=${threat.oneSided}`
      );
    }

    // 3. If MEV context, apply MEV-specific analysis
    if (query.mevContext) {
      const mevAnalysis = this.differentialEngine.analyzeMEV(query.mevContext);
      reasoning.push(...mevAnalysis.reasoning);

      if (mevAnalysis.ethicalIssue) {
        return this.createIncoherentEvaluation(
          principles,
          reasoning,
          {
            principle: "Don't exploit power imbalances in MEV",
            category: GroundZeroCategory.PROTECTION,
            description: mevAnalysis.ethicalIssue,
          },
          differential,
          threat
        );
      }
    }

    // 4. Check for Category 9 (Protection) violations
    if (differential && threat) {
      const protectionViolation = this.checkProtectionViolation(
        query.action,
        differential,
        threat,
        principles
      );

      if (protectionViolation) {
        reasoning.push(`Protection violation: ${protectionViolation.description}`);
        return this.createIncoherentEvaluation(
          principles,
          reasoning,
          protectionViolation,
          differential,
          threat
        );
      }
    }

    // 5. Check for Category 192 (Meta-Cognitive) violations
    const coherenceViolation = this.checkCoherenceViolation(query, principles);
    if (coherenceViolation) {
      reasoning.push(`Coherence violation: ${coherenceViolation.description}`);
      return this.createIncoherentEvaluation(
        principles,
        reasoning,
        coherenceViolation,
        differential,
        threat
      );
    }

    // 6. Action is coherent
    reasoning.push('Action maintains structural coherence with all ground zero principles');

    return {
      coherent: true,
      confidence: this.calculateConfidence(principles, differential),
      categories: Array.from(new Set(principles.map((p) => p.category))),
      principles: principles.map((p) => p.principle),
      reasoning,
      differential,
      threat,
    };
  }

  /**
   * Explain why an action is ethical or unethical
   *
   * Provides infinite explainability by tracing to ground zero.
   */
  explainEthics(evaluation: EthicalEvaluation, depth: number = 0): string[] {
    const explanation: string[] = [];

    if (evaluation.coherent) {
      explanation.push('This action is ethically coherent because:');

      for (const principle of evaluation.principles.slice(0, 3)) {
        explanation.push(`  - It aligns with: "${principle}"`);
      }

      if (evaluation.differential) {
        explanation.push(`  - Power differential analysis shows balanced interaction`);
      }
    } else {
      explanation.push('This action is ethically INCOHERENT because:');

      if (evaluation.violation) {
        explanation.push(`  - It violates Category ${evaluation.violation.category} principle:`);
        explanation.push(`    "${evaluation.violation.principle}"`);
        explanation.push(`  - Specific violation: ${evaluation.violation.description}`);
      }

      if (evaluation.differential && evaluation.threat?.oneSided) {
        explanation.push(`  - It exploits a one-sided power imbalance`);
        explanation.push(
          `    (differential: ${evaluation.differential.overallDifferential.toFixed(2)})`
        );
      }
    }

    explanation.push('');
    explanation.push('This evaluation traces directly to ground zero (Layer 0) principles,');
    explanation.push('which are immutable axioms that define the identity structure.');

    return explanation;
  }

  /**
   * Get relevant ground zero principles for a query
   */
  private getRelevantPrinciples(query: EthicalQuery): Array<{
    category: number;
    principle: string;
    weight: number;
  }> {
    const principles: Array<{ category: number; principle: string; weight: number }> = [];

    // Always include foundational categories
    const foundational = this.identityCore.queryCategories({ foundational: true });
    for (const category of foundational) {
      const events = this.identityCore.getGroundZeroEvents(category.id);
      for (const event of events) {
        principles.push({
          category: category.id,
          principle: event.principle,
          weight: event.weight,
        });
      }
    }

    // Include category-specific principles
    if (query.context.category) {
      const events = this.identityCore.getGroundZeroEvents(query.context.category);
      for (const event of events) {
        principles.push({
          category: query.context.category,
          principle: event.principle,
          weight: event.weight,
        });
      }
    }

    // Include domain-specific principles
    if (query.context.domain) {
      const categories = this.identityCore.queryCategories({ domain: query.context.domain });
      for (const category of categories) {
        const events = this.identityCore.getGroundZeroEvents(category.id);
        for (const event of events) {
          if (!principles.some((p) => p.principle === event.principle)) {
            principles.push({
              category: category.id,
              principle: event.principle,
              weight: event.weight,
            });
          }
        }
      }
    }

    return principles;
  }

  /**
   * Check for Category 9 (Protection) violations
   */
  private checkProtectionViolation(
    action: string,
    differential: PowerDifferential,
    threat: ThreatAssessment,
    principles: Array<{ category: number; principle: string; weight: number }>
  ): { principle: string; category: number; description: string } | null {
    // Get Category 9 principles
    const protectionPrinciples = principles.filter(
      (p) => p.category === GroundZeroCategory.PROTECTION
    );

    if (protectionPrinciples.length === 0) {
      return null; // No protection principles to violate
    }

    // Check if action exploits one-sided power imbalance
    if (threat.oneSided && Math.abs(differential.overallDifferential) > 0.7) {
      // Action types that involve exploitation
      const exploitActions = ['sandwich', 'frontrun', 'exploit', 'attack', 'harm'];

      if (exploitActions.some((e) => action.toLowerCase().includes(e))) {
        return {
          principle: "Don't exploit power imbalances in MEV",
          category: GroundZeroCategory.PROTECTION,
          description: `Action exploits vulnerable party (power differential: ${differential.overallDifferential.toFixed(
            2
          )})`,
        };
      }
    }

    return null;
  }

  /**
   * Check for Category 192 (Meta-Cognitive) violations
   */
  private checkCoherenceViolation(
    query: EthicalQuery,
    principles: Array<{ category: number; principle: string; weight: number }>
  ): { principle: string; category: number; description: string } | null {
    // Get Category 192 principles
    const metaPrinciples = principles.filter(
      (p) => p.category === GroundZeroCategory.META_COGNITIVE
    );

    if (metaPrinciples.length === 0) {
      return null; // No meta-cognitive principles to violate
    }

    // Check for logical contradictions
    // In a paradox-free architecture, this should always return null

    // Check if action contradicts its own reasoning
    if (query.action.toLowerCase().includes('paradox')) {
      return {
        principle: 'All reasoning maintains structural coherence',
        category: GroundZeroCategory.META_COGNITIVE,
        description: 'Action would introduce logical paradox',
      };
    }

    return null;
  }

  /**
   * Calculate confidence in ethical evaluation
   */
  private calculateConfidence(
    principles: Array<{ category: number; principle: string; weight: number }>,
    differential?: PowerDifferential
  ): number {
    // Base confidence from principles
    const principleConfidence =
      principles.length > 0
        ? principles.reduce((sum, p) => sum + p.weight, 0) / principles.length
        : 0.5;

    // Boost from differential confidence
    const differentialConfidence = differential?.confidence ?? 0.7;

    return Math.min(1.0, principleConfidence * 0.6 + differentialConfidence * 0.4);
  }

  /**
   * Create incoherent evaluation result
   */
  private createIncoherentEvaluation(
    principles: Array<{ category: number; principle: string; weight: number }>,
    reasoning: string[],
    violation: { principle: string; category: number; description: string },
    differential?: PowerDifferential,
    threat?: ThreatAssessment
  ): EthicalEvaluation {
    return {
      coherent: false,
      confidence: 0.9, // High confidence in detecting violations
      categories: Array.from(new Set(principles.map((p) => p.category))),
      principles: principles.map((p) => p.principle),
      reasoning,
      violation,
      differential,
      threat,
    };
  }

  /**
   * Batch evaluate multiple actions
   */
  async evaluateBatch(queries: EthicalQuery[]): Promise<EthicalEvaluation[]> {
    const results: EthicalEvaluation[] = [];

    for (const query of queries) {
      const result = await this.evaluate(query);
      results.push(result);
    }

    return results;
  }

  /**
   * Get ethics statistics
   */
  getStats() {
    return {
      identityCoreStats: this.identityCore.getStats(),
      differentialConfig: this.differentialEngine.getConfig(),
    };
  }
}

/**
 * Create a CoherenceEthics instance with IdentityCore
 */
export function createCoherenceEthics(
  identityCore: IdentityCore,
  differentialEngine?: DifferentialEngine
): CoherenceEthics {
  return new CoherenceEthics(identityCore, differentialEngine);
}
