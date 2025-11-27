/**
 * Category.ts - Domain Isolation Structure
 *
 * Category 192, Layer 0: Categories isolate different domains of experience
 *
 * Categories represent isolated domains where principles are discovered and applied.
 * Each category maintains its own ground zero events and layer stack, but categories
 * can be connected through webs (cross-category principle connections).
 *
 * Known Categories:
 * - Category 1: Economic/Arbitrage Domain
 * - Category 9: Protection/Vulnerability Domain
 * - Category 192: Meta-Cognitive Domain
 * - Category 193: Creation Permissioning Domain
 */

import type { GroundZeroImprint } from './GroundZeroImprint';
import type { LayerStack } from './Layer';

/**
 * Domain category with isolated principles and experiences
 */
export interface Category {
  /** Unique category number */
  readonly id: number;

  /** Human-readable name */
  name: string;

  /** Description of this domain */
  description: string;

  /** Ground zero events for this category */
  readonly groundZeroEvents: readonly GroundZeroImprint[];

  /** Layer stack (accumulated experiences) */
  layerStack: LayerStack;

  /** Active principles derived from ground zero and layers */
  readonly activePrinciples: readonly string[];

  /** Whether this category is foundational (affects all others) */
  readonly foundational: boolean;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;

  /**
   * Metadata for category management
   */
  metadata?: Record<string, unknown>;
}

/**
 * Category domain types
 */
export enum CategoryDomain {
  /** Economic decisions (arbitrage, MEV, value extraction) */
  ECONOMIC = 'economic',

  /** Protection and vulnerability assessment */
  PROTECTION = 'protection',

  /** Meta-cognitive (reasoning about reasoning) */
  META_COGNITIVE = 'meta_cognitive',

  /** Permission and authorization for new actions */
  CREATION_PERMISSION = 'creation_permission',

  /** General/unknown domain */
  GENERAL = 'general',
}

/**
 * Category statistics
 */
export interface CategoryStats {
  /** Category ID */
  categoryId: number;

  /** Number of ground zero events */
  groundZeroCount: number;

  /** Total number of layers */
  totalLayers: number;

  /** Number of active principles */
  principleCount: number;

  /** Number of web connections to other categories */
  webConnectionCount: number;

  /** Average confidence across all layers */
  averageConfidence: number;

  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Category query parameters
 */
export interface CategoryQuery {
  /** Filter by category IDs */
  ids?: readonly number[];

  /** Filter by domain type */
  domain?: CategoryDomain;

  /** Filter by foundational flag */
  foundational?: boolean;

  /** Filter by minimum principle count */
  minPrinciples?: number;

  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Create a new category
 */
export function createCategory(
  id: number,
  name: string,
  description: string,
  groundZeroEvents: readonly GroundZeroImprint[],
  foundational: boolean = false
): Category {
  if (groundZeroEvents.length === 0) {
    throw new Error('Category must have at least one ground zero event');
  }

  // Verify all ground zero events belong to this category
  for (const event of groundZeroEvents) {
    if (event.category !== id) {
      throw new Error(
        `Ground zero event category ${event.category} does not match category ID ${id}`
      );
    }
  }

  const activePrinciples = groundZeroEvents.map((e) => e.principle);

  const now = new Date();

  // Create a placeholder layer stack (will be properly initialized by LayerStack manager)
  const layerStack: LayerStack = {
    category: id,
    groundZero: {
      layerNumber: 0,
      category: id,
      timestamp: groundZeroEvents[0].timestamp,
      description: 'Ground Zero Layer',
      learning: 'Foundational principles established',
      confidence: 1.0,
      validationCount: Infinity, // Ground zero is infinitely validated
      groundZeroReferences: [],
      mutable: false,
    },
    layers: [],
    totalLayers: 1,
    averageConfidence: 1.0,
  };

  return {
    id,
    name,
    description,
    groundZeroEvents,
    layerStack,
    activePrinciples,
    foundational,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get category statistics
 */
export function getCategoryStats(category: Category): CategoryStats {
  let webConnectionCount = 0;
  for (const event of category.groundZeroEvents) {
    if (event.webs) {
      webConnectionCount += event.webs.length;
    }
  }

  return {
    categoryId: category.id,
    groundZeroCount: category.groundZeroEvents.length,
    totalLayers: category.layerStack.totalLayers,
    principleCount: category.activePrinciples.length,
    webConnectionCount,
    averageConfidence: category.layerStack.averageConfidence,
    lastActivity: category.updatedAt,
  };
}

/**
 * Validate category structure
 */
export function validateCategory(category: Category): boolean {
  // Must have at least one ground zero event
  if (category.groundZeroEvents.length === 0) {
    return false;
  }

  // All ground zero events must belong to this category
  for (const event of category.groundZeroEvents) {
    if (event.category !== category.id) {
      return false;
    }
  }

  // Layer stack must belong to this category
  if (category.layerStack.category !== category.id) {
    return false;
  }

  return true;
}
