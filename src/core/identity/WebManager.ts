/**
 * WebManager.ts - Cross-Category Connection Manager
 *
 * Category 192, Layer 0: Web connections only form between coherent principles
 *
 * Manages web connections that link principles across categories,
 * enabling cross-domain reasoning while maintaining coherence.
 */

import {
  Web,
  WebQuery,
  WebValidationResult,
  createWeb,
  validateWeb,
  getWebsBetweenCategories,
  areWebConditionsMet,
  calculateWebDensity,
} from './types/Web';
// Note: getWebsFromCategory and getWebsToCategory are re-exported for external use
export { getWebsFromCategory, getWebsToCategory } from './types/Web';

/**
 * Manager for web connections between categories
 */
export class WebManager {
  /** All web connections */
  private webs: Map<string, Web>;

  /** Index: source category -> web IDs */
  private sourceIndex: Map<number, Set<string>>;

  /** Index: target category -> web IDs */
  private targetIndex: Map<number, Set<string>>;

  /** Total number of categories (for density calculation) */
  private totalCategories: number;

  constructor(totalCategories: number = 200) {
    this.webs = new Map();
    this.sourceIndex = new Map();
    this.targetIndex = new Map();
    this.totalCategories = totalCategories;
  }

  /**
   * Register a new web connection
   */
  registerWeb(
    sourceCategory: number,
    targetCategory: number,
    sourcePrinciple: string,
    targetApplication: string,
    strength: number = 0.8,
    confidence: number = 0.7,
    conditions?: readonly string[]
  ): Web {
    const web = createWeb(
      sourceCategory,
      targetCategory,
      sourcePrinciple,
      targetApplication,
      strength,
      confidence,
      conditions
    );

    // Store web
    this.webs.set(web.id, web);

    // Update source index
    if (!this.sourceIndex.has(sourceCategory)) {
      this.sourceIndex.set(sourceCategory, new Set());
    }
    this.sourceIndex.get(sourceCategory)!.add(web.id);

    // Update target index
    if (!this.targetIndex.has(targetCategory)) {
      this.targetIndex.set(targetCategory, new Set());
    }
    this.targetIndex.get(targetCategory)!.add(web.id);

    return web;
  }

  /**
   * Get web by ID
   */
  getWeb(id: string): Web | undefined {
    return this.webs.get(id);
  }

  /**
   * Get all webs
   */
  getAllWebs(): readonly Web[] {
    return Array.from(this.webs.values());
  }

  /**
   * Get webs from a category
   */
  getWebsFromCategory(category: number): readonly Web[] {
    const webIds = this.sourceIndex.get(category);
    if (!webIds) return [];

    const webs: Web[] = [];
    for (const id of webIds) {
      const web = this.webs.get(id);
      if (web) webs.push(web);
    }

    return webs;
  }

  /**
   * Get webs to a category
   */
  getWebsToCategory(category: number): readonly Web[] {
    const webIds = this.targetIndex.get(category);
    if (!webIds) return [];

    const webs: Web[] = [];
    for (const id of webIds) {
      const web = this.webs.get(id);
      if (web) webs.push(web);
    }

    return webs;
  }

  /**
   * Get webs between two specific categories
   */
  getWebsBetweenCategories(sourceCategory: number, targetCategory: number): readonly Web[] {
    return getWebsBetweenCategories(this.getAllWebs(), sourceCategory, targetCategory);
  }

  /**
   * Query webs with filters
   */
  queryWebs(query: WebQuery): readonly Web[] {
    let webs = Array.from(this.webs.values());

    if (query.sourceCategory !== undefined) {
      webs = webs.filter((w) => w.sourceCategory === query.sourceCategory);
    }

    if (query.targetCategory !== undefined) {
      webs = webs.filter((w) => w.targetCategory === query.targetCategory);
    }

    if (query.minStrength !== undefined) {
      webs = webs.filter((w) => w.strength >= query.minStrength!);
    }

    if (query.minConfidence !== undefined) {
      webs = webs.filter((w) => w.confidence >= query.minConfidence!);
    }

    if (query.principleContains) {
      const search = query.principleContains.toLowerCase();
      webs = webs.filter(
        (w) =>
          w.sourcePrinciple.toLowerCase().includes(search) ||
          w.targetApplication.toLowerCase().includes(search)
      );
    }

    return webs;
  }

  /**
   * Validate a web based on successful application
   */
  validateWebConnection(webId: string, success: boolean, reasoning: string): WebValidationResult {
    const web = this.webs.get(webId);
    if (!web) {
      throw new Error(`Web ${webId} not found`);
    }

    const result = validateWeb(web, success, reasoning);

    // Update web
    const updated: Web = {
      ...web,
      confidence: result.updatedConfidence,
      validationCount: result.updatedValidationCount,
      lastValidated: new Date(),
    };

    this.webs.set(webId, updated);

    return result;
  }

  /**
   * Check if web conditions are met in given context
   */
  areWebConditionsMet(webId: string, context: Record<string, unknown>): boolean {
    const web = this.webs.get(webId);
    if (!web) return false;

    return areWebConditionsMet(web, context);
  }

  /**
   * Get applicable webs for a decision context
   */
  getApplicableWebs(
    targetCategory: number,
    context: Record<string, unknown>,
    minConfidence: number = 0.5
  ): readonly Web[] {
    const webs = this.getWebsToCategory(targetCategory);

    return webs.filter(
      (web) => web.confidence >= minConfidence && areWebConditionsMet(web, context)
    );
  }

  /**
   * Calculate web density for a category
   */
  calculateCategoryDensity(category: number): number {
    return calculateWebDensity(this.getAllWebs(), category, this.totalCategories);
  }

  /**
   * Get high-strength webs (>= 0.8)
   */
  getHighStrengthWebs(): readonly Web[] {
    return this.queryWebs({ minStrength: 0.8 });
  }

  /**
   * Get webs needing validation (low validation count)
   */
  getWebsNeedingValidation(maxValidations: number = 5): readonly Web[] {
    return Array.from(this.webs.values()).filter((w) => w.validationCount < maxValidations);
  }

  /**
   * Get web statistics
   */
  getStats() {
    const webs = Array.from(this.webs.values());

    const totalWebs = webs.length;
    const avgStrength = webs.reduce((sum, w) => sum + w.strength, 0) / totalWebs || 0;
    const avgConfidence = webs.reduce((sum, w) => sum + w.confidence, 0) / totalWebs || 0;
    const totalValidations = webs.reduce((sum, w) => sum + w.validationCount, 0);
    const highStrength = webs.filter((w) => w.strength >= 0.8).length;
    const highConfidence = webs.filter((w) => w.confidence >= 0.8).length;

    return {
      totalWebs,
      avgStrength,
      avgConfidence,
      totalValidations,
      highStrength,
      highConfidence,
      categoriesWithWebs: new Set([
        ...Array.from(this.sourceIndex.keys()),
        ...Array.from(this.targetIndex.keys()),
      ]).size,
    };
  }

  /**
   * Get web network for visualization
   */
  getNetworkGraph(): {
    nodes: Array<{ id: number; label: string }>;
    edges: Array<{
      source: number;
      target: number;
      strength: number;
      confidence: number;
      label: string;
    }>;
  } {
    const categories = new Set<number>();
    for (const web of this.webs.values()) {
      categories.add(web.sourceCategory);
      categories.add(web.targetCategory);
    }

    const nodes = Array.from(categories).map((id) => ({
      id,
      label: `Category ${id}`,
    }));

    const edges = Array.from(this.webs.values()).map((web) => ({
      source: web.sourceCategory,
      target: web.targetCategory,
      strength: web.strength,
      confidence: web.confidence,
      label: web.targetApplication,
    }));

    return { nodes, edges };
  }

  /**
   * Find principle paths between categories
   *
   * Finds chains of web connections that link two categories
   */
  findPrinciplePath(
    fromCategory: number,
    toCategory: number,
    maxDepth: number = 3
  ): readonly Web[][] {
    const paths: Web[][] = [];
    const visited = new Set<number>();

    const dfs = (current: number, target: number, path: Web[], depth: number) => {
      if (depth > maxDepth) return;
      if (current === target && path.length > 0) {
        paths.push([...path]);
        return;
      }

      visited.add(current);

      const webs = this.getWebsFromCategory(current);
      for (const web of webs) {
        if (!visited.has(web.targetCategory)) {
          path.push(web);
          dfs(web.targetCategory, target, path, depth + 1);
          path.pop();
        }
      }

      visited.delete(current);
    };

    dfs(fromCategory, toCategory, [], 0);

    return paths;
  }

  /**
   * Export webs as JSON
   */
  toJSON() {
    const webs: Record<string, any> = {};

    for (const [id, web] of this.webs.entries()) {
      webs[id] = {
        sourceCategory: web.sourceCategory,
        targetCategory: web.targetCategory,
        sourcePrinciple: web.sourcePrinciple,
        targetApplication: web.targetApplication,
        strength: web.strength,
        confidence: web.confidence,
        validationCount: web.validationCount,
        conditions: web.conditions,
        createdAt: web.createdAt.toISOString(),
        lastValidated: web.lastValidated?.toISOString(),
      };
    }

    return {
      totalWebs: this.webs.size,
      webs,
      stats: this.getStats(),
    };
  }
}
