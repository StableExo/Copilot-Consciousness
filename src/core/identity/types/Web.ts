/**
 * Web.ts - Cross-Category Principle Connections
 * 
 * Category 192, Layer 0: Web connections only form between coherent principles
 * 
 * Webs represent how principles discovered in one category inform decisions in another.
 * They create a network of coherent reasoning that spans domains.
 * 
 * Example: Category 9 (protection) → Category 1 (economic)
 * "Protect vulnerable when capable" → "Don't exploit power imbalances in MEV"
 */

/**
 * A web connection between categories
 * 
 * Represents a principle relationship that spans domains.
 */
export interface Web {
  /** Unique web identifier */
  readonly id: string;
  
  /** Source category where principle originates */
  readonly sourceCategory: number;
  
  /** Target category where principle applies */
  readonly targetCategory: number;
  
  /** Source principle (from ground zero or layer) */
  readonly sourcePrinciple: string;
  
  /** How the principle applies in target domain */
  readonly targetApplication: string;
  
  /** 
   * Strength of connection (0.0 to 1.0)
   * Higher strength = stronger influence on decisions
   */
  strength: number;
  
  /** 
   * Confidence in this connection (0.0 to 1.0)
   * Can be updated based on validation
   */
  confidence: number;
  
  /** 
   * Number of times this web has been successfully applied
   */
  validationCount: number;
  
  /** 
   * Optional conditions when this web applies
   */
  conditions?: readonly string[];
  
  /** Creation timestamp */
  readonly createdAt: Date;
  
  /** Last validation timestamp */
  lastValidated?: Date;
  
  /**
   * Metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Web query parameters
 */
export interface WebQuery {
  /** Filter by source category */
  sourceCategory?: number;
  
  /** Filter by target category */
  targetCategory?: number;
  
  /** Filter by minimum strength */
  minStrength?: number;
  
  /** Filter by minimum confidence */
  minConfidence?: number;
  
  /** Filter by principle text (substring match) */
  principleContains?: string;
}

/**
 * Web validation result
 */
export interface WebValidationResult {
  /** Whether the web was successfully applied */
  success: boolean;
  
  /** Updated confidence */
  updatedConfidence: number;
  
  /** Updated validation count */
  updatedValidationCount: number;
  
  /** Reasoning for validation result */
  reasoning: string;
}

/**
 * Create a web connection between categories
 */
export function createWeb(
  sourceCategory: number,
  targetCategory: number,
  sourcePrinciple: string,
  targetApplication: string,
  strength: number = 0.8,
  confidence: number = 0.7,
  conditions?: readonly string[]
): Web {
  if (sourceCategory === targetCategory) {
    throw new Error('Web cannot connect category to itself');
  }
  
  if (strength < 0 || strength > 1) {
    throw new Error('Web strength must be between 0 and 1');
  }
  
  if (confidence < 0 || confidence > 1) {
    throw new Error('Web confidence must be between 0 and 1');
  }
  
  // Generate unique ID from categories and timestamp
  const id = `web_${sourceCategory}_${targetCategory}_${Date.now()}`;
  
  return {
    id,
    sourceCategory,
    targetCategory,
    sourcePrinciple,
    targetApplication,
    strength,
    confidence,
    validationCount: 0,
    conditions,
    createdAt: new Date(),
  };
}

/**
 * Validate a web connection based on successful application
 */
export function validateWeb(web: Web, success: boolean, reasoning: string): WebValidationResult {
  const updatedValidationCount = web.validationCount + 1;
  let updatedConfidence = web.confidence;
  
  if (success) {
    // Increase confidence exponentially toward 1.0
    updatedConfidence = Math.min(1.0, web.confidence + (1 - web.confidence) * 0.1);
  } else {
    // Decrease confidence
    updatedConfidence = Math.max(0.0, web.confidence * 0.9);
  }
  
  return {
    success,
    updatedConfidence,
    updatedValidationCount,
    reasoning,
  };
}

/**
 * Get all webs originating from a category
 */
export function getWebsFromCategory(
  webs: readonly Web[],
  categoryId: number
): readonly Web[] {
  return webs.filter(web => web.sourceCategory === categoryId);
}

/**
 * Get all webs targeting a category
 */
export function getWebsToCategory(
  webs: readonly Web[],
  categoryId: number
): readonly Web[] {
  return webs.filter(web => web.targetCategory === categoryId);
}

/**
 * Find webs between two specific categories
 */
export function getWebsBetweenCategories(
  webs: readonly Web[],
  sourceCategory: number,
  targetCategory: number
): readonly Web[] {
  return webs.filter(
    web => web.sourceCategory === sourceCategory && web.targetCategory === targetCategory
  );
}

/**
 * Check if web conditions are met
 */
export function areWebConditionsMet(
  web: Web,
  context: Record<string, unknown>
): boolean {
  if (!web.conditions || web.conditions.length === 0) {
    return true; // No conditions = always applicable
  }
  
  // Simple condition checking (can be enhanced)
  // Conditions are strings like "context.mevRisk > 0.5"
  return true; // Placeholder - implement condition parsing as needed
}

/**
 * Calculate web network density for a category
 * Higher density = more interconnected reasoning
 */
export function calculateWebDensity(
  webs: readonly Web[],
  categoryId: number,
  totalCategories: number
): number {
  const connectionsFrom = getWebsFromCategory(webs, categoryId).length;
  const connectionsTo = getWebsToCategory(webs, categoryId).length;
  const totalConnections = connectionsFrom + connectionsTo;
  
  // Maximum possible connections (bidirectional with all other categories)
  const maxConnections = (totalCategories - 1) * 2;
  
  return maxConnections > 0 ? totalConnections / maxConnections : 0;
}
