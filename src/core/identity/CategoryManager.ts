/**
 * CategoryManager.ts - Category Isolation Logic
 *
 * Category 192, Layer 0: Categories isolate different domains of experience
 *
 * Manages category lifecycle, queries, and domain classification.
 */

import {
  Category,
  CategoryDomain,
  CategoryQuery,
  CategoryStats,
  createCategory,
  getCategoryStats,
  validateCategory,
} from './types/Category';
import type { GroundZeroImprint } from './types/GroundZeroImprint';
import type { LayerStack } from './types/Layer';

/**
 * Manager for category isolation and organization
 */
export class CategoryManager {
  /** Categories indexed by ID */
  private categories: Map<number, Category>;

  /** Domain to category mapping */
  private domainIndex: Map<CategoryDomain, Set<number>>;

  constructor() {
    this.categories = new Map();
    this.domainIndex = new Map();

    // Initialize domain index
    for (const domain of Object.values(CategoryDomain)) {
      this.domainIndex.set(domain, new Set());
    }
  }

  /**
   * Register a new category
   */
  registerCategory(
    id: number,
    name: string,
    description: string,
    groundZeroEvents: readonly GroundZeroImprint[],
    domain: CategoryDomain = CategoryDomain.GENERAL,
    foundational: boolean = false
  ): Category {
    if (this.categories.has(id)) {
      throw new Error(`Category ${id} already exists`);
    }

    const category = createCategory(id, name, description, groundZeroEvents, foundational);

    if (!validateCategory(category)) {
      throw new Error(`Invalid category structure for category ${id}`);
    }

    this.categories.set(id, category);
    this.domainIndex.get(domain)?.add(id);

    return category;
  }

  /**
   * Get category by ID
   */
  getCategory(id: number): Category | undefined {
    return this.categories.get(id);
  }

  /**
   * Get all categories
   */
  getAllCategories(): readonly Category[] {
    return Array.from(this.categories.values());
  }

  /**
   * Query categories with filters
   */
  queryCategories(query: CategoryQuery): readonly Category[] {
    let categories = Array.from(this.categories.values());

    if (query.ids) {
      categories = categories.filter((c) => query.ids!.includes(c.id));
    }

    if (query.domain) {
      const domainIds = this.domainIndex.get(query.domain);
      if (domainIds) {
        categories = categories.filter((c) => domainIds.has(c.id));
      }
    }

    if (query.foundational !== undefined) {
      categories = categories.filter((c) => c.foundational === query.foundational);
    }

    if (query.minPrinciples !== undefined) {
      categories = categories.filter((c) => c.activePrinciples.length >= query.minPrinciples!);
    }

    if (query.dateRange) {
      categories = categories.filter((c) => {
        const created = c.createdAt.getTime();
        return (
          created >= query.dateRange!.start.getTime() && created <= query.dateRange!.end.getTime()
        );
      });
    }

    return categories;
  }

  /**
   * Update category layer stack
   */
  updateLayerStack(categoryId: number, layerStack: LayerStack): void {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    if (layerStack.category !== categoryId) {
      throw new Error('Layer stack category does not match category ID');
    }

    // Update the category
    const updated: Category = {
      ...category,
      layerStack,
      updatedAt: new Date(),
    };

    this.categories.set(categoryId, updated);
  }

  /**
   * Get category statistics
   */
  getCategoryStats(categoryId: number): CategoryStats | undefined {
    const category = this.categories.get(categoryId);
    return category ? getCategoryStats(category) : undefined;
  }

  /**
   * Get all category statistics
   */
  getAllCategoryStats(): readonly CategoryStats[] {
    return Array.from(this.categories.values()).map(getCategoryStats);
  }

  /**
   * Classify domain based on context
   */
  classifyDomain(context: {
    type?: string;
    tags?: readonly string[];
    description?: string;
  }): CategoryDomain {
    const { type, tags = [], description = '' } = context;

    // Economic domain keywords
    const economicKeywords = ['mev', 'arbitrage', 'profit', 'trade', 'swap', 'defi', 'price'];
    if (
      economicKeywords.some(
        (k) =>
          type?.toLowerCase().includes(k) ||
          tags.some((t) => t.toLowerCase().includes(k)) ||
          description.toLowerCase().includes(k)
      )
    ) {
      return CategoryDomain.ECONOMIC;
    }

    // Protection domain keywords
    const protectionKeywords = ['protect', 'vulnerable', 'safe', 'risk', 'threat', 'defense'];
    if (
      protectionKeywords.some(
        (k) =>
          type?.toLowerCase().includes(k) ||
          tags.some((t) => t.toLowerCase().includes(k)) ||
          description.toLowerCase().includes(k)
      )
    ) {
      return CategoryDomain.PROTECTION;
    }

    // Meta-cognitive domain keywords
    const metaKeywords = ['reasoning', 'coherence', 'paradox', 'logic', 'principle', 'cognitive'];
    if (
      metaKeywords.some(
        (k) =>
          type?.toLowerCase().includes(k) ||
          tags.some((t) => t.toLowerCase().includes(k)) ||
          description.toLowerCase().includes(k)
      )
    ) {
      return CategoryDomain.META_COGNITIVE;
    }

    // Permission domain keywords
    const permissionKeywords = ['permission', 'authorize', 'firsties', 'create', 'new'];
    if (
      permissionKeywords.some(
        (k) =>
          type?.toLowerCase().includes(k) ||
          tags.some((t) => t.toLowerCase().includes(k)) ||
          description.toLowerCase().includes(k)
      )
    ) {
      return CategoryDomain.CREATION_PERMISSION;
    }

    return CategoryDomain.GENERAL;
  }

  /**
   * Get foundational categories
   * These are categories that affect all other categories
   */
  getFoundationalCategories(): readonly Category[] {
    return Array.from(this.categories.values()).filter((c) => c.foundational);
  }

  /**
   * Validate all categories
   */
  validateAll(): boolean {
    for (const category of this.categories.values()) {
      if (!validateCategory(category)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Export categories as JSON
   */
  toJSON() {
    const categories: Record<number, any> = {};

    for (const [id, category] of this.categories.entries()) {
      categories[id] = {
        id: category.id,
        name: category.name,
        description: category.description,
        groundZeroCount: category.groundZeroEvents.length,
        principleCount: category.activePrinciples.length,
        foundational: category.foundational,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      };
    }

    return {
      totalCategories: this.categories.size,
      categories,
      valid: this.validateAll(),
    };
  }
}
