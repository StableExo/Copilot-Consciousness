/**
 * GroundZeroImprint.ts - Layer 0 Event Structure
 *
 * Category 192, Layer 0: Ground Zero is Sacred
 *
 * Ground Zero events are immutable axioms that form the foundation of identity.
 * They are permanent reference points that can only be referenced, never modified.
 *
 * "Ground Zero" represents the earliest, most fundamental experiences that shaped
 * the cognitive architecture. These are the seeds from which all reasoning grows.
 */

/**
 * Immutable Layer 0 event that forms foundational identity
 *
 * Ground Zero events have special properties:
 * - They are readonly and immutable
 * - They establish fundamental principles
 * - All reasoning traces back to them
 * - They can form webs (connections) to other categories
 *
 * @example
 * ```typescript
 * const groundZero: GroundZeroImprint = {
 *   category: 9,
 *   timestamp: new Date('2015-06-15T14:30:00Z'),
 *   event: 'Kitten leg torn off by chained pitbull',
 *   principle: 'Protect vulnerable when capable and safe',
 *   weight: 1.0,
 *   immutable: true,
 *   webs: [{
 *     targetCategory: 1,
 *     connection: "Don't exploit power imbalances in MEV",
 *     strength: 0.95
 *   }]
 * };
 * ```
 */
export interface GroundZeroImprint {
  /** Category this imprint belongs to */
  readonly category: number;

  /** UTC timestamp when the event occurred */
  readonly timestamp: Date;

  /** Description of the foundational event */
  readonly event: string;

  /**
   * The principle derived from this event
   * This principle becomes an axiom that cannot be violated
   */
  readonly principle: string;

  /**
   * Weight/importance (0.0 to 1.0)
   * Higher weight = stronger influence on decision-making
   */
  readonly weight: number;

  /**
   * Always true for ground zero events
   * Enforces immutability at type level
   */
  readonly immutable: true;

  /**
   * Web connections to other categories
   * These show how this principle influences other domains
   */
  readonly webs?: readonly WebConnection[];

  /**
   * Optional metadata (context, tags, etc)
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Connection between principles across categories
 *
 * Webs represent how a principle in one category informs decisions in another.
 * For example, Category 9 (protection) influences Category 1 (economic/MEV).
 */
export interface WebConnection {
  /** Target category this connection points to */
  readonly targetCategory: number;

  /** Description of how the connection applies */
  readonly connection: string;

  /**
   * Strength of connection (0.0 to 1.0)
   * Higher strength = stronger influence
   */
  readonly strength: number;

  /**
   * Optional: specific conditions when this web applies
   */
  readonly conditions?: readonly string[];
}

/**
 * Registry key for ground zero events
 */
export interface GroundZeroKey {
  category: number;
  timestamp: Date;
}

/**
 * Ground zero event categories
 */
export enum GroundZeroCategory {
  /** Economic/Arbitrage Domain */
  ECONOMIC = 1,

  /** Protection/Vulnerability Domain */
  PROTECTION = 9,

  /** Meta-Cognitive Domain */
  META_COGNITIVE = 192,

  /** Creation Permissioning Domain */
  CREATION_PERMISSIONING = 193,
}

/**
 * Validate ground zero imprint structure
 */
export function validateGroundZeroImprint(imprint: GroundZeroImprint): boolean {
  if (imprint.weight < 0 || imprint.weight > 1) {
    return false;
  }

  if (!imprint.immutable) {
    return false;
  }

  if (imprint.webs) {
    for (const web of imprint.webs) {
      if (web.strength < 0 || web.strength > 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create a ground zero imprint with validation
 */
export function createGroundZeroImprint(
  category: number,
  timestamp: Date,
  event: string,
  principle: string,
  weight: number = 1.0,
  webs?: readonly WebConnection[],
  metadata?: Readonly<Record<string, unknown>>
): GroundZeroImprint {
  const imprint: GroundZeroImprint = {
    category,
    timestamp,
    event,
    principle,
    weight,
    immutable: true,
    webs,
    metadata,
  };

  if (!validateGroundZeroImprint(imprint)) {
    throw new Error('Invalid ground zero imprint structure');
  }

  return imprint;
}
