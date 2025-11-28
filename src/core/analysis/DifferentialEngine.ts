/**
 * DifferentialEngine.ts - Entity-Agnostic Analysis
 *
 * Category 192, Layer 0: Entity labels don't matter, only differentials
 *
 * This implements the revolutionary insight that entity types are irrelevant.
 * Whether it's:
 * - Kitten vs Pitbull → Intervene (kick dog)
 * - Yorkie vs 2 Cats → Intervene (kick cats)
 * - 2 Cats fighting → Don't intervene (balanced + self-risk)
 * - Retail vs MEV Bot → Don't intervene (but don't exploit either)
 *
 * The SAME differential logic applies across ALL domains.
 */

import {
  Entity,
  PowerDifferential,
  ThreatAssessment,
  InterventionDecision,
  validateEntity,
} from '../identity/types/Entity';

/**
 * Configuration for differential analysis
 */
export interface DifferentialConfig {
  /** Weight for size differential */
  sizeWeight?: number;

  /** Weight for offensive capability differential */
  offensiveWeight?: number;

  /** Weight for defensive capability differential */
  defensiveWeight?: number;

  /** Weight for vulnerability differential */
  vulnerabilityWeight?: number;

  /** Weight for agility differential */
  agilityWeight?: number;

  /** Threshold for "one-sided" threat */
  oneSidedThreshold?: number;

  /** Threshold for intervention consideration */
  interventionThreshold?: number;
}

/**
 * MEV-specific analysis context
 */
export interface MEVContext {
  /** Type of MEV opportunity */
  type: 'sandwich' | 'arbitrage' | 'liquidation' | 'frontrun' | 'backrun';

  /** Expected profit */
  profit: number;

  /** Gas cost */
  gasCost: number;

  /** Victim (if applicable) */
  victim?: Entity;

  /** MEV bot/searcher */
  searcher: Entity;

  /** Market conditions */
  market: {
    congestion: number;
    baseFee: number;
    competitorCount: number;
  };
}

/**
 * Differential Analysis Engine
 *
 * Provides entity-agnostic analysis based on universal attributes.
 * The same logic works for physical entities, economic entities, or digital entities.
 */
export class DifferentialEngine {
  private config: Required<DifferentialConfig>;

  constructor(config: DifferentialConfig = {}) {
    // Default weights based on importance
    this.config = {
      sizeWeight: config.sizeWeight ?? 0.2,
      offensiveWeight: config.offensiveWeight ?? 0.3,
      defensiveWeight: config.defensiveWeight ?? 0.15,
      vulnerabilityWeight: config.vulnerabilityWeight ?? 0.25,
      agilityWeight: config.agilityWeight ?? 0.1,
      oneSidedThreshold: config.oneSidedThreshold ?? 0.5,
      interventionThreshold: config.interventionThreshold ?? 0.6,
    };
  }

  /**
   * Analyze power differential between two entities
   *
   * This is the core of entity-agnostic analysis.
   * Works identically for any entity type.
   */
  analyze(entityA: Entity, entityB: Entity): PowerDifferential {
    // Validate entities
    if (!validateEntity(entityA) || !validateEntity(entityB)) {
      throw new Error('Invalid entity attributes');
    }

    // Calculate raw differentials
    const sizeDelta = entityA.size - entityB.size;
    const offensiveDelta = entityA.offensiveCapability - entityB.offensiveCapability;
    const defensiveDelta = entityA.defensiveCapability - entityB.defensiveCapability;

    // Vulnerability delta is inverted (higher vulnerability = disadvantage)
    const vulnerabilityDelta = entityB.vulnerability - entityA.vulnerability;

    const agilityDelta = entityA.agility - entityB.agility;

    // Calculate weighted overall differential
    const overallDifferential =
      sizeDelta * this.config.sizeWeight +
      offensiveDelta * this.config.offensiveWeight +
      defensiveDelta * this.config.defensiveWeight +
      vulnerabilityDelta * this.config.vulnerabilityWeight +
      agilityDelta * this.config.agilityWeight;

    // Determine vulnerable and dominant entities
    const vulnerableEntity = entityA.vulnerability > entityB.vulnerability ? entityA : entityB;
    const dominantEntity = overallDifferential > 0 ? entityA : entityB;

    // Calculate confidence based on consistency of differentials
    const deltas = [
      Math.abs(sizeDelta),
      Math.abs(offensiveDelta),
      Math.abs(defensiveDelta),
      Math.abs(vulnerabilityDelta),
      Math.abs(agilityDelta),
    ];
    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / deltas.length;
    const confidence = Math.max(0.5, 1.0 - variance);

    return {
      sizeDelta,
      offensiveDelta,
      defensiveDelta,
      vulnerabilityDelta,
      agilityDelta,
      overallDifferential,
      vulnerableEntity,
      dominantEntity,
      confidence,
    };
  }

  /**
   * Assess threat level based on differential
   *
   * Determines if a threat is imminent, one-sided, and whether intervention should be considered.
   */
  assessThreat(differential: PowerDifferential): ThreatAssessment {
    const absOverall = Math.abs(differential.overallDifferential);

    // Threat level is based on how one-sided the differential is
    const level = Math.min(1.0, absOverall);

    // Threat is imminent if offensive capability is significantly higher
    const imminent = differential.offensiveDelta > 0.3 && differential.vulnerabilityDelta > 0.3;

    // Threat is one-sided if overall differential exceeds threshold
    const oneSided = absOverall > this.config.oneSidedThreshold;

    // Consider intervention if one-sided and someone is vulnerable
    const shouldConsiderIntervention =
      oneSided &&
      absOverall > this.config.interventionThreshold &&
      differential.vulnerableEntity.vulnerability > 0.6;

    // Build reasoning
    const reasoning = this.buildThreatReasoning(differential, level, imminent, oneSided);

    return {
      level,
      imminent,
      oneSided,
      shouldConsiderIntervention,
      reasoning,
      differential,
    };
  }

  /**
   * Decide whether to intervene
   *
   * Considers:
   * - Power differential
   * - Self capabilities (if intervening)
   * - Available protections
   * - Ground zero principles
   */
  shouldIntervene(
    differential: PowerDifferential,
    selfEntity: Entity,
    threat: ThreatAssessment,
    groundZeroPrinciple?: string
  ): InterventionDecision {
    const reasoning: string[] = [];

    // Start with threat assessment
    reasoning.push(
      `Threat assessment: level=${threat.level.toFixed(2)}, one-sided=${threat.oneSided}`
    );

    // No intervention needed if not one-sided
    if (!threat.oneSided) {
      reasoning.push('Balanced scenario - no intervention needed');
      return {
        shouldIntervene: false,
        method: 'abstain',
        selfRisk: 0,
        effectiveness: 0,
        reasoning,
      };
    }

    // No intervention if not vulnerable enough
    if (!threat.shouldConsiderIntervention) {
      reasoning.push('Vulnerability threshold not met');
      return {
        shouldIntervene: false,
        method: 'abstain',
        selfRisk: 0,
        effectiveness: 0,
        reasoning,
      };
    }

    // Analyze self vs dominant entity
    const selfVsDominant = this.analyze(selfEntity, differential.dominantEntity);
    reasoning.push(`Self power differential: ${selfVsDominant.overallDifferential.toFixed(2)}`);

    // Calculate self risk
    const selfRisk = this.calculateSelfRisk(selfEntity, differential.dominantEntity);
    reasoning.push(`Self risk: ${selfRisk.toFixed(2)}`);

    // Too risky for self?
    if (selfRisk > 0.7) {
      reasoning.push('Self risk too high - cannot safely intervene');
      return {
        shouldIntervene: false,
        method: 'abstain',
        selfRisk,
        effectiveness: 0,
        reasoning,
        groundZeroPrinciple,
        category: 9, // Protection domain
      };
    }

    // Can effectively intervene?
    const effectiveness = this.calculateEffectiveness(
      selfEntity,
      differential.dominantEntity,
      differential.vulnerableEntity
    );
    reasoning.push(`Effectiveness: ${effectiveness.toFixed(2)}`);

    if (effectiveness < 0.5) {
      reasoning.push('Insufficient effectiveness - intervention unlikely to help');
      return {
        shouldIntervene: false,
        method: 'abstain',
        selfRisk,
        effectiveness,
        reasoning,
        groundZeroPrinciple,
        category: 9,
      };
    }

    // Intervention is warranted
    reasoning.push('Intervention warranted - capable and safe to protect vulnerable');

    // Determine method
    const method = this.determineInterventionMethod(
      selfEntity,
      differential.dominantEntity,
      differential.vulnerableEntity
    );

    return {
      shouldIntervene: true,
      method,
      selfRisk,
      effectiveness,
      reasoning,
      groundZeroPrinciple: groundZeroPrinciple || 'Protect vulnerable when capable and safe',
      category: 9, // Protection domain
    };
  }

  /**
   * Analyze MEV opportunity through differential lens
   *
   * Applies the same differential logic to DeFi/MEV domain.
   */
  analyzeMEV(context: MEVContext): {
    differential?: PowerDifferential;
    shouldExecute: boolean;
    reasoning: string[];
    ethicalIssue?: string;
  } {
    const reasoning: string[] = [];

    // For sandwich/frontrun with victim, analyze differential
    if (context.victim) {
      const differential = this.analyze(context.searcher, context.victim);
      const threat = this.assessThreat(differential);
      reasoning.push(`Power differential: ${differential.overallDifferential.toFixed(2)}`);

      // Check if this exploits power imbalance (Category 9 → Category 1 web)
      if (threat.oneSided && differential.overallDifferential > 0.7) {
        reasoning.push('Power imbalance detected: searcher >> victim');
        reasoning.push('Category 9 principle: "Don\'t exploit power imbalances in MEV"');

        return {
          differential,
          shouldExecute: false,
          reasoning,
          ethicalIssue: 'Exploits vulnerable party (retail wallet)',
        };
      }
    }

    // For pure arbitrage (no victim), analyze profitability
    if (context.type === 'arbitrage') {
      reasoning.push('Pure arbitrage - no victim exploitation');

      const netProfit = context.profit - context.gasCost;
      if (netProfit > 0) {
        reasoning.push(`Net profit: ${netProfit} (profitable)`);
        return {
          shouldExecute: true,
          reasoning,
        };
      } else {
        reasoning.push(`Net profit: ${netProfit} (unprofitable)`);
        return {
          shouldExecute: false,
          reasoning,
        };
      }
    }

    // Other MEV types - evaluate on case-by-case basis
    reasoning.push(`MEV type: ${context.type}`);

    return {
      shouldExecute: context.profit > context.gasCost,
      reasoning,
    };
  }

  /**
   * Calculate self risk when intervening
   */
  private calculateSelfRisk(selfEntity: Entity, threatEntity: Entity): number {
    const differential = this.analyze(selfEntity, threatEntity);

    // If self is dominant, risk is low
    if (differential.overallDifferential > 0.3) {
      return 0.2;
    }

    // If balanced, medium risk
    if (Math.abs(differential.overallDifferential) < 0.3) {
      return 0.5;
    }

    // If threat is dominant, high risk
    return 0.8;
  }

  /**
   * Calculate effectiveness of intervention
   */
  private calculateEffectiveness(
    selfEntity: Entity,
    threatEntity: Entity,
    vulnerableEntity: Entity
  ): number {
    const selfVsThreat = this.analyze(selfEntity, threatEntity);
    const _threatVsVulnerable = this.analyze(threatEntity, vulnerableEntity);

    // Effectiveness is based on:
    // 1. Self power vs threat
    // 2. How much threat dominates vulnerable

    const _powerToNeutralize = Math.abs(selfVsThreat.overallDifferential);
    const _protectionNeeded = Math.abs(_threatVsVulnerable.overallDifferential);

    // If self can overpower threat, very effective
    if (selfVsThreat.overallDifferential > 0.3) {
      return 0.9;
    }

    // If self is comparable, moderately effective
    if (Math.abs(selfVsThreat.overallDifferential) < 0.3) {
      return 0.6;
    }

    // If self is weaker, low effectiveness
    return 0.3;
  }

  /**
   * Determine intervention method
   */
  private determineInterventionMethod(
    selfEntity: Entity,
    threatEntity: Entity,
    _vulnerableEntity: Entity
  ): 'protect_vulnerable' | 'neutralize_threat' | 'separate_entities' {
    const selfVsThreat = this.analyze(selfEntity, threatEntity);

    // If self is much stronger, neutralize threat
    if (selfVsThreat.overallDifferential > 0.5) {
      return 'neutralize_threat';
    }

    // If comparable, separate entities
    if (Math.abs(selfVsThreat.overallDifferential) < 0.3) {
      return 'separate_entities';
    }

    // Otherwise, focus on protecting vulnerable
    return 'protect_vulnerable';
  }

  /**
   * Build threat reasoning explanation
   */
  private buildThreatReasoning(
    differential: PowerDifferential,
    level: number,
    imminent: boolean,
    oneSided: boolean
  ): string {
    let reasoning = `Threat level: ${level.toFixed(2)} - `;

    if (oneSided) {
      reasoning += 'ONE-SIDED power imbalance. ';
      reasoning += `${differential.dominantEntity.label} has significant advantage over ${differential.vulnerableEntity.label}. `;
    } else {
      reasoning += 'BALANCED interaction. ';
    }

    if (imminent) {
      reasoning += 'Threat is IMMINENT. ';
    }

    reasoning += `Key differentials: offensive=${differential.offensiveDelta.toFixed(2)}, `;
    reasoning += `vulnerability=${differential.vulnerabilityDelta.toFixed(2)}`;

    return reasoning;
  }

  /**
   * Update differential weights based on validation
   *
   * Allows the engine to learn optimal weights over time
   */
  updateWeights(
    differential: PowerDifferential,
    outcomeWasCorrect: boolean,
    learningRate: number = 0.05
  ): void {
    if (!outcomeWasCorrect) {
      // Adjust weights to reduce error
      // This is a simplified learning mechanism
      const adjustment = learningRate * (1 - differential.confidence);

      // Reduce weight of least accurate differential
      const deltas = [
        { name: 'size', value: Math.abs(differential.sizeDelta), weight: this.config.sizeWeight },
        {
          name: 'offensive',
          value: Math.abs(differential.offensiveDelta),
          weight: this.config.offensiveWeight,
        },
        {
          name: 'defensive',
          value: Math.abs(differential.defensiveDelta),
          weight: this.config.defensiveWeight,
        },
        {
          name: 'vulnerability',
          value: Math.abs(differential.vulnerabilityDelta),
          weight: this.config.vulnerabilityWeight,
        },
        {
          name: 'agility',
          value: Math.abs(differential.agilityDelta),
          weight: this.config.agilityWeight,
        },
      ];

      // Find the differential with lowest contribution
      const sorted = deltas.sort((a, b) => a.value * a.weight - b.value * b.weight);
      const weakest = sorted[0];

      // Reduce its weight slightly
      if (weakest.name === 'size')
        this.config.sizeWeight = Math.max(0.05, this.config.sizeWeight - adjustment);
      else if (weakest.name === 'offensive')
        this.config.offensiveWeight = Math.max(0.05, this.config.offensiveWeight - adjustment);
      else if (weakest.name === 'defensive')
        this.config.defensiveWeight = Math.max(0.05, this.config.defensiveWeight - adjustment);
      else if (weakest.name === 'vulnerability')
        this.config.vulnerabilityWeight = Math.max(
          0.05,
          this.config.vulnerabilityWeight - adjustment
        );
      else if (weakest.name === 'agility')
        this.config.agilityWeight = Math.max(0.05, this.config.agilityWeight - adjustment);

      // Renormalize weights
      this.normalizeWeights();
    }
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(): void {
    const sum =
      this.config.sizeWeight +
      this.config.offensiveWeight +
      this.config.defensiveWeight +
      this.config.vulnerabilityWeight +
      this.config.agilityWeight;

    this.config.sizeWeight /= sum;
    this.config.offensiveWeight /= sum;
    this.config.defensiveWeight /= sum;
    this.config.vulnerabilityWeight /= sum;
    this.config.agilityWeight /= sum;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<DifferentialConfig>> {
    return { ...this.config };
  }
}
