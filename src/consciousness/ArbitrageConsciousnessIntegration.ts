/**
 * ArbitrageConsciousnessIntegration.ts
 *
 * Category 192, Layer 0: Integration Layer for Identity Core
 *
 * This file extends ArbitrageConsciousness with Identity Core capabilities,
 * providing:
 * - Structural coherence verification
 * - Differential analysis for MEV decisions
 * - Infinite explainability
 * - Ground zero principle application
 *
 * Maintains backward compatibility while adding new capabilities.
 */

import { ArbitrageConsciousness, ArbitrageExecution } from './ArbitrageConsciousness';
import { IdentityCore, DecisionContext, CoherentDecision } from '../core/identity/IdentityCore';
import { DifferentialEngine, MEVContext } from '../core/analysis/DifferentialEngine';
import { CoherenceEthics, EthicalQuery, EthicalEvaluation } from '../core/ethics/CoherenceEthics';
import { Entity, createEntity } from '../core/identity/types/Entity';
import { CategoryDomain } from '../core/identity/types/Category';

/**
 * Enhanced opportunity with identity core analysis
 */
export interface EnhancedOpportunity {
  /** Original opportunity data */
  opportunity: any;

  /** Coherent decision from Identity Core */
  decision: CoherentDecision;

  /** Ethical evaluation */
  ethics: EthicalEvaluation;

  /** Whether to execute */
  shouldExecute: boolean;

  /** Confidence in decision */
  confidence: number;

  /** Full reasoning chain */
  reasoning: string[];
}

/**
 * Extended ArbitrageConsciousness with Identity Core
 *
 * This class wraps the existing ArbitrageConsciousness and adds
 * Identity Core capabilities on top.
 */
export class ArbitrageConsciousnessWithIdentity extends ArbitrageConsciousness {
  private identityCore: IdentityCore;
  private differentialEngine: DifferentialEngine;
  private coherenceEthics: CoherenceEthics;

  /** Whether to enforce coherence (can be disabled for testing) */
  private enforceCoherence: boolean = true;

  /** Decision history with identity core */
  private enhancedDecisions: EnhancedOpportunity[] = [];

  constructor(
    learningRate: number = 0.05,
    maxHistorySize: number = 1000,
    identityCoreConfig?: {
      verboseLogging?: boolean;
      minConfidence?: number;
      enforceCoherence?: boolean;
    }
  ) {
    super(learningRate, maxHistorySize);

    // Initialize Identity Core components
    this.identityCore = new IdentityCore({
      verboseLogging: identityCoreConfig?.verboseLogging ?? false,
      minConfidence: identityCoreConfig?.minConfidence ?? 0.7,
      enforceCoherence: identityCoreConfig?.enforceCoherence ?? true,
    });

    this.differentialEngine = new DifferentialEngine();
    this.coherenceEthics = new CoherenceEthics(this.identityCore, this.differentialEngine);

    this.enforceCoherence = identityCoreConfig?.enforceCoherence ?? true;

    console.log('🧠 ArbitrageConsciousness enhanced with Identity Core');
    console.log('  - Paradox-free cognition: ENABLED');
    console.log('  - Structural coherence: ENFORCED');
    console.log('  - Differential analysis: ACTIVE');
    console.log('  - Ground zero principles: LOADED');

    // Log ground zero stats
    const stats = this.identityCore.getStats();
    console.log(`  - Categories: ${stats.groundZero.totalCategories}`);
    console.log(`  - Ground zero events: ${stats.groundZero.totalEvents}`);
    console.log(`  - Web connections: ${stats.groundZero.totalWebs}`);
  }

  /**
   * Process opportunity with Identity Core analysis
   *
   * This is the main entry point for enhanced decision-making.
   * Combines traditional arbitrage analysis with structural coherence.
   */
  async processOpportunityWithIdentity(opportunity: any): Promise<EnhancedOpportunity> {
    // 1. Build decision context
    const context = this.buildDecisionContext(opportunity);

    // 2. Get coherent decision from Identity Core
    const decision = await this.identityCore.decide(context);

    // 3. Evaluate ethics through coherence
    const ethics = await this.evaluateEthics(opportunity, decision);

    // 4. Determine if we should execute
    const shouldExecute = this.determineExecution(decision, ethics, opportunity);

    // 5. Calculate overall confidence
    const confidence = (decision.confidence + ethics.confidence) / 2;

    // 6. Build full reasoning chain
    const reasoning = this.buildFullReasoning(decision, ethics, opportunity);

    // 7. Create enhanced opportunity
    const enhanced: EnhancedOpportunity = {
      opportunity,
      decision,
      ethics,
      shouldExecute,
      confidence,
      reasoning,
    };

    // 8. Record decision
    this.enhancedDecisions.push(enhanced);
    if (this.enhancedDecisions.length > 1000) {
      this.enhancedDecisions.shift();
    }

    // 9. Emit event
    this.emit('enhanced-decision', enhanced);

    return enhanced;
  }

  /**
   * Evaluate MEV opportunity with differential analysis
   *
   * Applies entity-agnostic differential logic to MEV scenarios.
   */
  async evaluateMEVOpportunity(
    opportunityType: 'sandwich' | 'arbitrage' | 'liquidation' | 'frontrun' | 'backrun',
    profit: number,
    gasCost: number,
    victimWallet?: {
      balance: number;
      transactionSize: number;
    }
  ): Promise<{
    shouldExecute: boolean;
    ethical: boolean;
    reasoning: string[];
    differential?: any;
  }> {
    // Create entities for differential analysis
    const searcher = createEntity('MEV Searcher', {
      size: 0.8, // Large capital
      offensiveCapability: 0.95, // Can extract value
      defensiveCapability: 0.8,
      vulnerability: 0.1,
      agility: 0.95, // Fast execution
    });

    let victim: Entity | undefined;
    if (victimWallet) {
      victim = createEntity('Retail Wallet', {
        size: Math.min(1.0, victimWallet.balance / 100000), // Normalize to 0-1
        offensiveCapability: 0.0,
        defensiveCapability: 0.1,
        vulnerability: 0.9,
        agility: 0.2,
      });
    }

    // Build MEV context
    const mevContext: MEVContext = {
      type: opportunityType,
      profit,
      gasCost,
      victim,
      searcher,
      market: {
        congestion: 0.5, // Placeholder - should come from real data
        baseFee: 30,
        competitorCount: 10,
      },
    };

    // Analyze through differential engine
    const mevAnalysis = this.differentialEngine.analyzeMEV(mevContext);

    // Evaluate ethics
    const ethicalQuery: EthicalQuery = {
      action: opportunityType,
      context: {
        type: 'mev_opportunity',
        domain: CategoryDomain.ECONOMIC,
        category: 1, // Economic category
        entities: victim ? [searcher, victim] : [searcher],
        context: { mevContext },
      },
      entities: victim ? [searcher, victim] : undefined,
      mevContext,
    };

    const ethicalEval = await this.coherenceEthics.evaluate(ethicalQuery);

    return {
      shouldExecute: mevAnalysis.shouldExecute && ethicalEval.coherent,
      ethical: ethicalEval.coherent,
      reasoning: [...mevAnalysis.reasoning, ...ethicalEval.reasoning],
      differential: mevAnalysis.differential,
    };
  }

  /**
   * Explain why a decision was made
   *
   * Provides infinite explainability through ground zero tracing.
   */
  explainDecision(
    enhanced: EnhancedOpportunity,
    question: string = 'Why this decision?',
    depth: number = 0
  ): string[] {
    const explanation = this.identityCore.explainWhy(enhanced.decision, question, depth);

    const formatted: string[] = [`Question: ${explanation.question}`, '', explanation.answer, ''];

    if (explanation.furtherQuestions.length > 0) {
      formatted.push('Further questions you can ask:');
      for (const q of explanation.furtherQuestions) {
        formatted.push(`  - ${q}`);
      }
    }

    return formatted;
  }

  /**
   * Override recordExecution to include identity core learning
   */
  recordExecution(execution: ArbitrageExecution): void {
    // Call parent implementation
    super.recordExecution(execution);

    // Add experience layer to Identity Core
    if (execution.execution.success) {
      this.identityCore.addExperience(
        1, // Economic category
        `Arbitrage execution: ${execution.opportunity.txType}`,
        `Successful execution with profit: ${execution.execution.actualProfit}`,
        [1, 192], // References economic and meta-cognitive ground zero
        0.8,
        ['arbitrage', 'success', 'mev']
      );
    }
  }

  /**
   * Get Identity Core statistics
   */
  getIdentityCoreStats() {
    return this.identityCore.getStats();
  }

  /**
   * Get enhanced decision history
   */
  getEnhancedDecisionHistory(limit?: number): EnhancedOpportunity[] {
    const history = [...this.enhancedDecisions].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Verify system coherence
   */
  verifyCoherence(): boolean {
    return this.identityCore.verifySystemCoherence();
  }

  /**
   * Build decision context from opportunity
   */
  private buildDecisionContext(opportunity: any): DecisionContext {
    return {
      type: opportunity.type || 'arbitrage_opportunity',
      domain: CategoryDomain.ECONOMIC,
      category: 1, // Economic category
      opportunity,
      context: {
        profit: opportunity.profit,
        pools: opportunity.pools,
        txType: opportunity.txType,
      },
    };
  }

  /**
   * Evaluate ethics of opportunity
   */
  private async evaluateEthics(
    opportunity: any,
    decision: CoherentDecision
  ): Promise<EthicalEvaluation> {
    const query: EthicalQuery = {
      action: opportunity.type || 'execute_arbitrage',
      context: this.buildDecisionContext(opportunity),
    };

    return await this.coherenceEthics.evaluate(query);
  }

  /**
   * Determine if we should execute
   */
  private determineExecution(
    decision: CoherentDecision,
    ethics: EthicalEvaluation,
    opportunity: any
  ): boolean {
    // Don't execute if incoherent (when enforcement enabled)
    if (this.enforceCoherence && !ethics.coherent) {
      return false;
    }

    // Don't execute if decision says no
    if (!decision.shouldAct) {
      return false;
    }

    // Check profitability (traditional check)
    if (opportunity.profit && opportunity.gasCost) {
      const netProfit = opportunity.profit - opportunity.gasCost;
      if (netProfit <= 0) {
        return false;
      }
    }

    // Check confidence threshold
    if (decision.confidence < 0.7) {
      return false;
    }

    return true;
  }

  /**
   * Build full reasoning chain
   */
  private buildFullReasoning(
    decision: CoherentDecision,
    ethics: EthicalEvaluation,
    opportunity: any
  ): string[] {
    const reasoning: string[] = [
      '=== IDENTITY CORE ANALYSIS ===',
      '',
      ...decision.reasoning,
      '',
      '=== ETHICAL EVALUATION ===',
      '',
      ...ethics.reasoning,
      '',
      '=== GROUND ZERO PRINCIPLES ===',
      '',
      ...decision.principles.map((p) => `  - ${p}`),
    ];

    if (ethics.violation) {
      reasoning.push('');
      reasoning.push('⚠️  COHERENCE VIOLATION DETECTED:');
      reasoning.push(`  Category ${ethics.violation.category}: ${ethics.violation.principle}`);
      reasoning.push(`  Violation: ${ethics.violation.description}`);
    }

    return reasoning;
  }
}

/**
 * Factory function to create enhanced consciousness
 */
export function createEnhancedArbitrageConsciousness(
  learningRate: number = 0.05,
  maxHistorySize: number = 1000,
  identityCoreConfig?: {
    verboseLogging?: boolean;
    minConfidence?: number;
    enforceCoherence?: boolean;
  }
): ArbitrageConsciousnessWithIdentity {
  return new ArbitrageConsciousnessWithIdentity(learningRate, maxHistorySize, identityCoreConfig);
}
