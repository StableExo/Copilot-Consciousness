/**
 * Entity.ts - Universal Entity Attributes
 *
 * Category 192, Layer 0: Entity labels don't matter, only differentials
 *
 * This implements entity-agnostic analysis based on the principle that
 * "Entity labels don't matter, only differentials". Whether it's a kitten vs pitbull,
 * yorkie vs cats, or retail wallet vs MEV bot - the same differential logic applies.
 *
 * Universal attributes enable cross-domain reasoning without hardcoded entity types.
 */

/**
 * Universal entity attributes for differential analysis
 *
 * These attributes can describe any entity across any domain:
 * - Physical entities (animals, humans)
 * - Economic entities (wallets, bots, protocols)
 * - Digital entities (processes, systems)
 *
 * @example
 * ```typescript
 * const kitten: Entity = {
 *   label: 'kitten',
 *   size: 0.1,
 *   offensiveCapability: 0.01,
 *   defensiveCapability: 0.02,
 *   vulnerability: 0.95,
 *   agility: 0.8
 * };
 *
 * const pitbull: Entity = {
 *   label: 'pitbull (chained)',
 *   size: 0.6,
 *   offensiveCapability: 0.9,
 *   defensiveCapability: 0.7,
 *   vulnerability: 0.1,
 *   agility: 0.3 // Reduced by chain
 * };
 *
 * const retailWallet: Entity = {
 *   label: 'retail wallet',
 *   size: 0.001, // Small capital
 *   offensiveCapability: 0.0,
 *   defensiveCapability: 0.1,
 *   vulnerability: 0.9,
 *   agility: 0.2
 * };
 *
 * const mevBot: Entity = {
 *   label: 'MEV bot',
 *   size: 0.8, // Large capital
 *   offensiveCapability: 0.95, // Can extract value
 *   defensiveCapability: 0.8,
 *   vulnerability: 0.1,
 *   agility: 0.95 // Fast execution
 * };
 * ```
 */
export interface Entity {
  /** Human-readable label (for logging only, not used in logic) */
  label: string;

  /**
   * Size (physical/economic/capacity)
   * Range: 0.0 to 1.0 (normalized)
   * - Physical: relative body mass
   * - Economic: relative capital/resources
   * - Capacity: relative processing power
   */
  size: number;

  /**
   * Offensive capability (harm/extract potential)
   * Range: 0.0 to 1.0
   * - Physical: ability to inflict harm
   * - Economic: ability to extract value (MEV, arbitrage)
   * - Digital: ability to exploit/attack
   */
  offensiveCapability: number;

  /**
   * Defensive capability (protection/resistance)
   * Range: 0.0 to 1.0
   * - Physical: ability to withstand attacks
   * - Economic: ability to protect assets (slippage protection, etc)
   * - Digital: security measures, redundancy
   */
  defensiveCapability: number;

  /**
   * Vulnerability (exposure to harm)
   * Range: 0.0 to 1.0
   * - Physical: likelihood of injury
   * - Economic: exposure to loss (slippage, MEV, rug pulls)
   * - Digital: attack surface, exploitability
   */
  vulnerability: number;

  /**
   * Agility (speed/adaptability)
   * Range: 0.0 to 1.0
   * - Physical: movement speed, reaction time
   * - Economic: transaction speed, market adaptability
   * - Digital: processing speed, update frequency
   */
  agility: number;

  /**
   * Optional context-specific attributes
   * Can include domain-specific data without affecting core differential logic
   */
  context?: Record<string, unknown>;
}

/**
 * Power differential between two entities
 *
 * Calculated by DifferentialEngine to assess threat levels and intervention needs.
 * Positive values indicate entityA has advantage, negative indicates entityB.
 */
export interface PowerDifferential {
  /** Size differential (A - B) */
  sizeDelta: number;

  /** Offensive capability differential (A - B) */
  offensiveDelta: number;

  /** Defensive capability differential (A - B) */
  defensiveDelta: number;

  /** Vulnerability differential (B - A, since higher vulnerability is disadvantage) */
  vulnerabilityDelta: number;

  /** Agility differential (A - B) */
  agilityDelta: number;

  /** Overall power differential (weighted sum) */
  overallDifferential: number;

  /** The more vulnerable entity */
  vulnerableEntity: Entity;

  /** The more capable entity */
  dominantEntity: Entity;

  /** Confidence in assessment (0.0 to 1.0) */
  confidence: number;
}

/**
 * Threat assessment result
 */
export interface ThreatAssessment {
  /** Threat level (0.0 = no threat, 1.0 = maximum threat) */
  level: number;

  /** Whether threat is imminent */
  imminent: boolean;

  /** Whether threat is one-sided (power imbalance) */
  oneSided: boolean;

  /** Whether intervention should be considered */
  shouldConsiderIntervention: boolean;

  /** Reasoning for assessment */
  reasoning: string;

  /** The power differential that informed this assessment */
  differential: PowerDifferential;
}

/**
 * Intervention decision
 */
export interface InterventionDecision {
  /** Whether to intervene */
  shouldIntervene: boolean;

  /** Intervention method (if applicable) */
  method?: 'protect_vulnerable' | 'neutralize_threat' | 'separate_entities' | 'abstain';

  /** Risk to self if intervening */
  selfRisk: number;

  /** Expected effectiveness (0.0 to 1.0) */
  effectiveness: number;

  /** Reasoning chain */
  reasoning: string[];

  /** Ground zero principle that informs this decision */
  groundZeroPrinciple?: string;

  /** Category this decision traces to */
  category?: number;
}

/**
 * Validate that entity attributes are within valid ranges
 */
export function validateEntity(entity: Entity): boolean {
  const attrs = [
    entity.size,
    entity.offensiveCapability,
    entity.defensiveCapability,
    entity.vulnerability,
    entity.agility,
  ];

  return attrs.every((attr) => attr >= 0 && attr <= 1);
}

/**
 * Create a normalized entity with validated attributes
 */
export function createEntity(label: string, attributes: Omit<Entity, 'label'>): Entity {
  const entity: Entity = {
    label,
    ...attributes,
  };

  if (!validateEntity(entity)) {
    throw new Error(`Invalid entity attributes for ${label}. All values must be between 0 and 1.`);
  }

  return entity;
}
