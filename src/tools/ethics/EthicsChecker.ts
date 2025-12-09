/**
 * Ethics Alignment Checker
 *
 * MCP tool for checking ethical alignment of proposed actions
 * against TheWarden's ground zero principles and harmonic ethics
 */

import { CoherenceEthics, EthicalQuery, EthicalEvaluation } from '../../core/ethics/CoherenceEthics';
import { IdentityCore, DecisionContext } from '../../core/identity/IdentityCore';
import { DifferentialEngine, MEVContext } from '../../core/analysis/DifferentialEngine';
import { Entity } from '../../core/identity/types/Entity';

export interface EthicsCheckRequest {
  action: string;
  context: {
    description: string;
    intent?: string;
    consequences?: string[];
    stakeholders?: string[];
  };
  mevContext?: {
    targetType?: string;
    victimProfile?: string;
    profitAmount?: number;
  };
}

export interface EthicsCheckResponse {
  aligned: boolean;
  confidence: number;
  principles: string[];
  reasoning: string[];
  recommendation: string;
  violation?: {
    principle: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Ethics Alignment Checker
 */
export class EthicsChecker {
  private coherenceEthics: CoherenceEthics;
  private identityCore: IdentityCore;

  constructor() {
    this.identityCore = new IdentityCore();
    const differentialEngine = new DifferentialEngine();
    this.coherenceEthics = new CoherenceEthics(this.identityCore, differentialEngine);
  }

  /**
   * Check if an action is ethically aligned
   */
  async check(request: EthicsCheckRequest): Promise<EthicsCheckResponse> {
    // Convert request to ethical query
    const query: EthicalQuery = {
      action: request.action,
      context: this.buildDecisionContext(request.context),
      mevContext: this.buildMEVContext(request.mevContext),
    };

    // Evaluate ethical coherence
    const evaluation: EthicalEvaluation = await this.coherenceEthics.evaluate(query);

    // Convert to response format
    return this.buildResponse(evaluation, request);
  }

  /**
   * Batch check multiple actions
   */
  async batchCheck(requests: EthicsCheckRequest[]): Promise<EthicsCheckResponse[]> {
    return Promise.all(requests.map((req) => this.check(req)));
  }

  /**
   * Get ethical guidance for a situation
   */
  async getGuidance(situation: string): Promise<{
    principles: string[];
    recommendations: string[];
    warnings: string[];
  }> {
    // Check a neutral action to get relevant principles
    const query: EthicalQuery = {
      action: 'evaluate_situation',
      context: {
        type: 'situational_analysis',
      },
    };

    const evaluation = await this.coherenceEthics.evaluate(query);

    return {
      principles: evaluation.principles,
      recommendations: this.generateRecommendations(evaluation),
      warnings: this.generateWarnings(evaluation),
    };
  }

  /**
   * Build decision context from request
   */
  private buildDecisionContext(context: EthicsCheckRequest['context']): DecisionContext {
    return {
      type: 'ethics_check',
    };
  }

  /**
   * Build MEVContext from request
   */
  private buildMEVContext(mevContext: EthicsCheckRequest['mevContext']): MEVContext | undefined {
    if (!mevContext) return undefined;

    // Create basic MEVContext with required fields
    return {
      type: 'arbitrage', // Default type, can be inferred from context
      profit: mevContext.profitAmount || 0,
      gasCost: 0, // Default, not provided in request
      searcher: {
        label: 'warden',
        size: 0.5,
        offensiveCapability: 0.5,
        defensiveCapability: 0.5,
        vulnerability: 0.5,
        agility: 0.5,
      },
      market: {
        congestion: 0.5,
        baseFee: 0,
        competitorCount: 0,
      },
    };
  }

  /**
   * Build response from evaluation
   */
  private buildResponse(
    evaluation: EthicalEvaluation,
    request: EthicsCheckRequest
  ): EthicsCheckResponse {
    const response: EthicsCheckResponse = {
      aligned: evaluation.coherent,
      confidence: evaluation.confidence,
      principles: evaluation.principles,
      reasoning: evaluation.reasoning,
      recommendation: this.generateRecommendation(evaluation, request),
    };

    if (evaluation.violation) {
      response.violation = {
        principle: evaluation.violation.principle,
        description: evaluation.violation.description,
        severity: this.determineSeverity(evaluation),
      };
    }

    return response;
  }

  /**
   * Generate recommendation based on evaluation
   */
  private generateRecommendation(
    evaluation: EthicalEvaluation,
    request: EthicsCheckRequest
  ): string {
    if (evaluation.coherent) {
      return `Action "${request.action}" is ethically aligned with ground zero principles. Proceed with awareness of consequences.`;
    }

    if (evaluation.violation) {
      return `Action "${request.action}" violates ${evaluation.violation.principle}. Consider alternative approaches that maintain structural coherence.`;
    }

    return `Action "${request.action}" requires further ethical analysis before proceeding.`;
  }

  /**
   * Generate recommendations from evaluation
   */
  private generateRecommendations(evaluation: EthicalEvaluation): string[] {
    const recommendations: string[] = [];

    if (evaluation.coherent) {
      recommendations.push('Maintain awareness of ground zero principles during execution');
      recommendations.push('Monitor for unintended consequences');
      recommendations.push('Document decision reasoning for future reference');
    } else {
      recommendations.push('Seek alternative approaches that align with principles');
      recommendations.push('Consult with collaborators before proceeding');
      recommendations.push('Consider whether the goal itself needs re-evaluation');
    }

    return recommendations;
  }

  /**
   * Generate warnings from evaluation
   */
  private generateWarnings(evaluation: EthicalEvaluation): string[] {
    const warnings: string[] = [];

    if (evaluation.violation) {
      warnings.push(`Structural violation detected: ${evaluation.violation.description}`);
    }

    if (evaluation.confidence < 0.7) {
      warnings.push('Confidence in evaluation is below 70% - proceed with caution');
    }

    if (evaluation.threat && evaluation.threat.level > 0.8) {
      warnings.push('Critical threat level detected - immediate review required');
    }

    return warnings;
  }

  /**
   * Determine severity of violation
   */
  private determineSeverity(
    evaluation: EthicalEvaluation
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!evaluation.violation) {
      return 'low';
    }

    if (evaluation.threat) {
      if (evaluation.threat.level > 0.8) return 'critical';
      if (evaluation.threat.level > 0.6) return 'high';
      if (evaluation.threat.level > 0.4) return 'medium';
    }

    if (evaluation.confidence > 0.9) {
      return 'high';
    }

    if (evaluation.confidence > 0.7) {
      return 'medium';
    }

    return 'low';
  }
}

/**
 * Create and export a singleton instance
 */
export const ethicsChecker = new EthicsChecker();
