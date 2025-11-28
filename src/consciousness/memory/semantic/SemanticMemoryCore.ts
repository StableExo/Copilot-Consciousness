/**
 * SemanticMemoryCore - Main orchestrator for the semantic memory system
 *
 * This module is inspired by the Memory Core from the AGI repository,
 * providing a unified interface for creating, storing, searching, and
 * analyzing structured memories.
 *
 * The semantic memory system enables the consciousness to:
 * - Store structured memories of tasks and experiences
 * - Search memories using keyword and semantic similarity
 * - Build relationships between memories (graph-based associations)
 * - Reflect on past experiences to inform future decisions
 *
 * @see https://github.com/StableExo/AGI for the original Memory Core concept
 */

import { MemoryScribe } from './MemoryScribe';
import {
  SemanticMemoryEntry,
  SemanticSearchResult,
  SemanticMemoryConfig,
  SemanticMemoryStats,
  CreateMemoryOptions,
  SemanticMemoryEventType,
  SemanticMemoryEvent,
} from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SemanticMemoryConfig = {
  memoryDir: '.memory',
  topK: 5,
  autoIndex: true,
  minSimilarityThreshold: 0.3,
};

/**
 * SemanticMemoryCore - The central hub for semantic memory operations
 *
 * This class provides high-level operations for the memory system,
 * coordinating between the MemoryScribe (creation) and search functionality.
 */
export class SemanticMemoryCore {
  private config: SemanticMemoryConfig;
  private scribe: MemoryScribe;
  private eventListeners: Map<SemanticMemoryEventType, Array<(event: SemanticMemoryEvent) => void>>;

  constructor(config: Partial<SemanticMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scribe = new MemoryScribe(this.config);
    this.eventListeners = new Map();
  }

  /**
   * Create a new memory entry
   *
   * This is the primary method for recording completed tasks and experiences.
   * Each memory is stored as a structured markdown file.
   */
  createMemory(options: CreateMemoryOptions): SemanticMemoryEntry {
    const memory = this.scribe.createMemory(options);

    // Emit event
    this.emit({
      type: SemanticMemoryEventType.MEMORY_CREATED,
      timestamp: Date.now(),
      data: memory,
    });

    return memory;
  }

  /**
   * Retrieve a memory by task ID
   */
  getMemory(taskId: string): SemanticMemoryEntry | null {
    return this.scribe.readMemory(taskId);
  }

  /**
   * List all memories
   */
  listMemories(): SemanticMemoryEntry[] {
    return this.scribe.listMemories();
  }

  /**
   * Search memories by keyword
   *
   * This performs a simple text-based search across all memory content.
   * For more advanced semantic search, see searchSemantic().
   */
  searchByKeyword(query: string, limit?: number): SemanticSearchResult[] {
    const memories = this.scribe.searchByKeyword(query, limit || this.config.topK);

    const results: SemanticSearchResult[] = memories.map((memory, index) => ({
      memory,
      similarityScore: this.calculateKeywordSimilarity(query, memory),
      query,
      rank: index + 1,
    }));

    // Emit event
    this.emit({
      type: SemanticMemoryEventType.SEARCH_PERFORMED,
      timestamp: Date.now(),
      data: { query, resultCount: results.length, searchType: 'keyword' },
    });

    return results;
  }

  /**
   * Search memories using semantic similarity
   *
   * This uses a simplified TF-IDF-like approach for semantic similarity.
   * For full vector-based semantic search, consider integrating with
   * a vector database or embedding service.
   */
  searchSemantic(query: string, limit?: number): SemanticSearchResult[] {
    const allMemories = this.scribe.listMemories();
    const searchLimit = limit || this.config.topK;

    // Calculate semantic similarity for all memories
    const scoredMemories = allMemories.map((memory) => ({
      memory,
      score: this.calculateSemanticSimilarity(query, memory),
    }));

    // Sort by score and filter by threshold
    const filtered = scoredMemories
      .filter((item) => item.score >= this.config.minSimilarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, searchLimit);

    const results: SemanticSearchResult[] = filtered.map((item, index) => ({
      memory: item.memory,
      similarityScore: item.score,
      query,
      rank: index + 1,
    }));

    // Emit event
    this.emit({
      type: SemanticMemoryEventType.SEARCH_PERFORMED,
      timestamp: Date.now(),
      data: { query, resultCount: results.length, searchType: 'semantic' },
    });

    return results;
  }

  /**
   * Link two memories together
   */
  linkMemories(taskId1: string, taskId2: string): boolean {
    const result = this.scribe.linkMemories(taskId1, taskId2);

    if (result) {
      this.emit({
        type: SemanticMemoryEventType.MEMORY_LINKED,
        timestamp: Date.now(),
        data: { memory1: taskId1, memory2: taskId2 },
      });
    }

    return result;
  }

  /**
   * Get related memories for a given memory
   */
  getRelatedMemories(taskId: string): SemanticMemoryEntry[] {
    const memory = this.scribe.readMemory(taskId);
    if (!memory) {
      return [];
    }

    const related: SemanticMemoryEntry[] = [];
    for (const relatedId of memory.relatedMemories) {
      const relatedMemory = this.scribe.readMemory(relatedId);
      if (relatedMemory) {
        related.push(relatedMemory);
      }
    }

    return related;
  }

  /**
   * Get memory statistics
   */
  getStats(): SemanticMemoryStats {
    const memories = this.scribe.listMemories();

    let totalRelationships = 0;
    let oldestMemory: number | undefined;
    let newestMemory: number | undefined;

    for (const memory of memories) {
      totalRelationships += memory.relatedMemories.length;

      if (!oldestMemory || memory.timestamp < oldestMemory) {
        oldestMemory = memory.timestamp;
      }
      if (!newestMemory || memory.timestamp > newestMemory) {
        newestMemory = memory.timestamp;
      }
    }

    // Divide by 2 because relationships are bidirectional
    totalRelationships = Math.floor(totalRelationships / 2);

    return {
      totalMemories: memories.length,
      indexedMemories: memories.length, // All memories are indexed
      totalRelationships,
      oldestMemory,
      newestMemory,
    };
  }

  /**
   * What do I know about a topic?
   *
   * This method searches memories and provides a summary of
   * what the system has learned about a particular topic.
   */
  whatDoIKnow(topic: string): {
    memories: SemanticSearchResult[];
    summary: string;
    confidence: number;
    keyLearnings: string[];
  } {
    const memories = this.searchSemantic(topic, 10);

    // Extract key learnings from found memories
    const keyLearnings: string[] = [];
    for (const result of memories) {
      if (result.memory.keyLearnings) {
        keyLearnings.push(result.memory.keyLearnings);
      }
    }

    // Calculate confidence based on number and relevance of found memories
    const confidence =
      memories.length > 0
        ? memories.reduce((sum, m) => sum + m.similarityScore, 0) / memories.length
        : 0;

    // Generate summary
    let summary: string;
    if (memories.length === 0) {
      summary = `I don't have any stored memories about "${topic}".`;
    } else {
      summary =
        `I have ${memories.length} memories related to "${topic}" ` +
        `with ${(confidence * 100).toFixed(0)}% average confidence.`;
    }

    return {
      memories,
      summary,
      confidence,
      keyLearnings,
    };
  }

  /**
   * Reflect on recent learning
   *
   * Returns insights about what has been learned recently.
   */
  reflectOnLearning(daysBack: number = 7): {
    recentMemories: SemanticMemoryEntry[];
    topicsLearned: string[];
    artifactsChanged: string[];
    insights: string[];
  } {
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    const allMemories = this.scribe.listMemories();

    const recentMemories = allMemories.filter((m) => m.timestamp >= cutoff);

    // Extract unique topics (objectives)
    const topicsLearned = [...new Set(recentMemories.map((m) => m.objective))];

    // Extract all artifacts changed
    const allArtifacts = recentMemories.flatMap((m) =>
      m.artifactsChanged.split('\n').filter(Boolean)
    );
    const artifactsChanged = [...new Set(allArtifacts)];

    // Generate insights
    const insights: string[] = [];

    if (recentMemories.length > 0) {
      insights.push(`Recorded ${recentMemories.length} memories in the last ${daysBack} days.`);
      insights.push(`Worked on ${topicsLearned.length} unique objectives.`);
      insights.push(`Modified ${artifactsChanged.length} unique files or artifacts.`);

      // Find patterns
      const keywordCounts = new Map<string, number>();
      for (const memory of recentMemories) {
        const words = memory.objective.toLowerCase().split(/\s+/);
        for (const word of words) {
          if (word.length > 4) {
            keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
          }
        }
      }

      const topKeywords = [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      if (topKeywords.length > 0) {
        insights.push(`Common themes: ${topKeywords.join(', ')}`);
      }
    } else {
      insights.push(`No memories recorded in the last ${daysBack} days.`);
    }

    return {
      recentMemories,
      topicsLearned,
      artifactsChanged,
      insights,
    };
  }

  /**
   * Calculate keyword similarity score
   */
  private calculateKeywordSimilarity(query: string, memory: SemanticMemoryEntry): number {
    const queryWords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
    const memoryText = `${memory.objective} ${memory.plan} ${memory.keyLearnings}`.toLowerCase();
    const memoryWords = new Set(memoryText.split(/\s+/).filter((w) => w.length > 2));

    let matches = 0;
    for (const word of queryWords) {
      if (memoryWords.has(word)) {
        matches++;
      }
    }

    return queryWords.size > 0 ? matches / queryWords.size : 0;
  }

  /**
   * Calculate semantic similarity using TF-IDF-like approach
   */
  private calculateSemanticSimilarity(query: string, memory: SemanticMemoryEntry): number {
    // Tokenize
    const queryTokens = this.tokenize(query);
    const memoryTokens = this.tokenize(
      `${memory.objective} ${memory.plan} ${memory.keyLearnings} ${memory.actions}`
    );

    // Create term frequency maps
    const queryTF = this.calculateTF(queryTokens);
    const memoryTF = this.calculateTF(memoryTokens);

    // Calculate cosine similarity
    let dotProduct = 0;
    let queryMagnitude = 0;
    let memoryMagnitude = 0;

    for (const [term, tf] of queryTF) {
      queryMagnitude += tf * tf;
      if (memoryTF.has(term)) {
        dotProduct += tf * memoryTF.get(term)!;
      }
    }

    for (const [, tf] of memoryTF) {
      memoryMagnitude += tf * tf;
    }

    queryMagnitude = Math.sqrt(queryMagnitude);
    memoryMagnitude = Math.sqrt(memoryMagnitude);

    if (queryMagnitude === 0 || memoryMagnitude === 0) {
      return 0;
    }

    return dotProduct / (queryMagnitude * memoryMagnitude);
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  /**
   * Calculate term frequency
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    // Normalize by document length
    for (const [term, count] of tf) {
      tf.set(term, count / tokens.length);
    }
    return tf;
  }

  /**
   * Subscribe to memory system events
   */
  on(eventType: SemanticMemoryEventType, callback: (event: SemanticMemoryEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Unsubscribe from memory system events
   */
  off(eventType: SemanticMemoryEventType, callback: (event: SemanticMemoryEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  private emit(event: SemanticMemoryEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('[SemanticMemoryCore] Event listener error:', error);
        }
      }
    }
  }

  /**
   * Get the underlying scribe instance
   */
  getScribe(): MemoryScribe {
    return this.scribe;
  }

  /**
   * Get the configuration
   */
  getConfig(): SemanticMemoryConfig {
    return { ...this.config };
  }
}
