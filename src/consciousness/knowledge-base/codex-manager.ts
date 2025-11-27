/**
 * Codex Manager
 *
 * Adapted from AxionCitadel's codex_manager.py and bloodhound.py
 * Manages knowledge base with dynamic indexing and semantic organization
 */

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  references: string[]; // IDs of related entries
  importance: number; // 0-1
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessed?: number;
  metadata: Record<string, unknown>;
}

export interface KnowledgeIndex {
  entries: Map<string, KnowledgeEntry>;
  categories: Map<string, Set<string>>; // category -> entry IDs
  tags: Map<string, Set<string>>; // tag -> entry IDs
  contentIndex: Map<string, Set<string>>; // word -> entry IDs (simple inverted index)
}

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchedTerms: string[];
}

/**
 * Codex Manager System
 * Provides dynamic knowledge base management with semantic search
 */
export class CodexManager {
  private index: KnowledgeIndex;
  private updateCallbacks: Array<(entry: KnowledgeEntry) => void> = [];

  constructor() {
    this.index = {
      entries: new Map(),
      categories: new Map(),
      tags: new Map(),
      contentIndex: new Map(),
    };
  }

  /**
   * Add or update a knowledge entry
   */
  addEntry(
    title: string,
    content: string,
    category: string,
    tags: string[] = [],
    importance: number = 0.5
  ): KnowledgeEntry {
    const id = this.generateId('knowledge');

    const entry: KnowledgeEntry = {
      id,
      title,
      content,
      category,
      tags,
      references: [],
      importance: Math.max(0, Math.min(1, importance)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
      metadata: {},
    };

    this.indexEntry(entry);
    this.notifyUpdate(entry);

    return entry;
  }

  /**
   * Update an existing entry
   */
  updateEntry(
    id: string,
    updates: Partial<Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessCount'>>
  ): boolean {
    const entry = this.index.entries.get(id);
    if (!entry) return false;

    // Remove old indexes
    this.removeFromIndexes(entry);

    // Apply updates
    Object.assign(entry, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Re-index
    this.indexEntry(entry);
    this.notifyUpdate(entry);

    return true;
  }

  /**
   * Get an entry by ID and track access
   */
  getEntry(id: string): KnowledgeEntry | null {
    const entry = this.index.entries.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      // Increase importance with usage
      entry.importance = Math.min(1, entry.importance + 0.001);
    }
    return entry || null;
  }

  /**
   * Search knowledge base
   */
  search(
    query: string,
    options: {
      category?: string;
      tags?: string[];
      limit?: number;
      minImportance?: number;
    } = {}
  ): SearchResult[] {
    const queryTerms = this.tokenize(query);
    const results: SearchResult[] = [];

    // Get candidate entries
    let candidates: Set<string> = new Set();

    if (options.category) {
      candidates = this.index.categories.get(options.category) || new Set();
    } else {
      candidates = new Set(this.index.entries.keys());
    }

    // Filter by tags if specified
    if (options.tags && options.tags.length > 0) {
      const tagMatches = new Set<string>();
      options.tags.forEach((tag) => {
        const tagEntries = this.index.tags.get(tag.toLowerCase());
        if (tagEntries) {
          tagEntries.forEach((id) => tagMatches.add(id));
        }
      });
      candidates = new Set([...candidates].filter((id) => tagMatches.has(id)));
    }

    // Score each candidate
    candidates.forEach((id) => {
      const entry = this.index.entries.get(id);
      if (!entry) return;

      // Skip if below minimum importance
      if (options.minImportance && entry.importance < options.minImportance) {
        return;
      }

      const score = this.scoreEntry(entry, queryTerms);
      if (score > 0) {
        const matchedTerms = this.getMatchedTerms(entry, queryTerms);
        results.push({ entry, score, matchedTerms });
      }
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    const limit = options.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * Link two knowledge entries
   */
  createReference(fromId: string, toId: string): boolean {
    const fromEntry = this.index.entries.get(fromId);
    const toEntry = this.index.entries.get(toId);

    if (!fromEntry || !toEntry) return false;

    if (!fromEntry.references.includes(toId)) {
      fromEntry.references.push(toId);
      fromEntry.updatedAt = Date.now();
    }

    return true;
  }

  /**
   * Get entries by category
   */
  getByCategory(category: string): KnowledgeEntry[] {
    const ids = this.index.categories.get(category) || new Set();
    return Array.from(ids)
      .map((id) => this.index.entries.get(id))
      .filter((entry): entry is KnowledgeEntry => entry !== undefined);
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): KnowledgeEntry[] {
    const ids = this.index.tags.get(tag.toLowerCase()) || new Set();
    return Array.from(ids)
      .map((id) => this.index.entries.get(id))
      .filter((entry): entry is KnowledgeEntry => entry !== undefined);
  }

  /**
   * Get related entries based on references and tags
   */
  getRelated(entryId: string, limit: number = 5): KnowledgeEntry[] {
    const entry = this.index.entries.get(entryId);
    if (!entry) return [];

    const related = new Map<string, number>(); // entry ID -> relevance score

    // Add direct references
    entry.references.forEach((refId) => {
      related.set(refId, 1.0);
    });

    // Add entries with shared tags
    entry.tags.forEach((tag) => {
      const tagEntries = this.index.tags.get(tag.toLowerCase()) || new Set();
      tagEntries.forEach((id) => {
        if (id !== entryId) {
          related.set(id, (related.get(id) || 0) + 0.5);
        }
      });
    });

    // Add entries in same category
    const categoryEntries = this.index.categories.get(entry.category) || new Set();
    categoryEntries.forEach((id) => {
      if (id !== entryId) {
        related.set(id, (related.get(id) || 0) + 0.3);
      }
    });

    // Sort by relevance and return top N
    return Array.from(related.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.index.entries.get(id))
      .filter((e): e is KnowledgeEntry => e !== undefined);
  }

  /**
   * Get knowledge statistics
   */
  getStats(): {
    totalEntries: number;
    totalCategories: number;
    totalTags: number;
    mostAccessed: KnowledgeEntry[];
    mostImportant: KnowledgeEntry[];
    recentlyUpdated: KnowledgeEntry[];
  } {
    const entries = Array.from(this.index.entries.values());

    return {
      totalEntries: entries.length,
      totalCategories: this.index.categories.size,
      totalTags: this.index.tags.size,
      mostAccessed: entries.sort((a, b) => b.accessCount - a.accessCount).slice(0, 10),
      mostImportant: entries.sort((a, b) => b.importance - a.importance).slice(0, 10),
      recentlyUpdated: entries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    };
  }

  /**
   * Subscribe to knowledge updates
   */
  onUpdate(callback: (entry: KnowledgeEntry) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Export knowledge base
   */
  export(): KnowledgeEntry[] {
    return Array.from(this.index.entries.values());
  }

  /**
   * Import knowledge base
   */
  import(entries: KnowledgeEntry[]): void {
    this.index.entries.clear();
    this.index.categories.clear();
    this.index.tags.clear();
    this.index.contentIndex.clear();

    entries.forEach((entry) => {
      this.indexEntry(entry);
    });
  }

  private indexEntry(entry: KnowledgeEntry): void {
    // Add to main index
    this.index.entries.set(entry.id, entry);

    // Index by category
    if (!this.index.categories.has(entry.category)) {
      this.index.categories.set(entry.category, new Set());
    }
    this.index.categories.get(entry.category)!.add(entry.id);

    // Index by tags
    entry.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      if (!this.index.tags.has(normalizedTag)) {
        this.index.tags.set(normalizedTag, new Set());
      }
      this.index.tags.get(normalizedTag)!.add(entry.id);
    });

    // Index content words
    const words = this.tokenize(entry.title + ' ' + entry.content);
    words.forEach((word) => {
      if (!this.index.contentIndex.has(word)) {
        this.index.contentIndex.set(word, new Set());
      }
      this.index.contentIndex.get(word)!.add(entry.id);
    });
  }

  private removeFromIndexes(entry: KnowledgeEntry): void {
    // Remove from category index
    const categorySet = this.index.categories.get(entry.category);
    if (categorySet) {
      categorySet.delete(entry.id);
    }

    // Remove from tag indexes
    entry.tags.forEach((tag) => {
      const tagSet = this.index.tags.get(tag.toLowerCase());
      if (tagSet) {
        tagSet.delete(entry.id);
      }
    });

    // Remove from content index
    const words = this.tokenize(entry.title + ' ' + entry.content);
    words.forEach((word) => {
      const wordSet = this.index.contentIndex.get(word);
      if (wordSet) {
        wordSet.delete(entry.id);
      }
    });
  }

  private scoreEntry(entry: KnowledgeEntry, queryTerms: string[]): number {
    let score = 0;

    // Title matches (high weight)
    const titleTerms = this.tokenize(entry.title);
    queryTerms.forEach((term) => {
      if (titleTerms.includes(term)) {
        score += 10;
      }
    });

    // Content matches (medium weight)
    const contentTerms = this.tokenize(entry.content);
    queryTerms.forEach((term) => {
      if (contentTerms.includes(term)) {
        score += 5;
      }
    });

    // Tag matches (medium-high weight)
    const normalizedTags = entry.tags.map((t) => t.toLowerCase());
    queryTerms.forEach((term) => {
      if (normalizedTags.includes(term)) {
        score += 7;
      }
    });

    // Boost by importance
    score *= 1 + entry.importance;

    // Boost by access count (popular entries)
    score *= 1 + Math.log1p(entry.accessCount) * 0.1;

    return score;
  }

  private getMatchedTerms(entry: KnowledgeEntry, queryTerms: string[]): string[] {
    const allTerms = this.tokenize(entry.title + ' ' + entry.content + ' ' + entry.tags.join(' '));
    return queryTerms.filter((term) => allTerms.includes(term));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2); // Ignore very short words
  }

  private notifyUpdate(entry: KnowledgeEntry): void {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(entry);
      } catch (_error) {
        // Ignore callback errors
      }
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
