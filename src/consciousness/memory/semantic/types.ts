/**
 * Semantic Memory Types
 *
 * Type definitions for the semantic memory system inspired by the AGI repository's
 * Memory Core architecture. This enables structured, searchable memories with
 * semantic context and relationships.
 *
 * @see https://github.com/StableExo/AGI for the original Memory Core concept
 */

import { Timestamp } from '../../../types';

/**
 * A structured memory entry following the AGI Memory Core schema.
 * Each memory represents a complete task or learning experience.
 */
export interface SemanticMemoryEntry {
  /** Unique identifier, typically a UTC timestamp */
  taskId: string;

  /** High-level statement of the goal or objective */
  objective: string;

  /** Step-by-step plan that was formulated */
  plan: string;

  /** Chronological log of commands and tool calls executed */
  actions: string;

  /** Most important takeaways from the task */
  keyLearnings: string;

  /** List of files created, modified, or deleted */
  artifactsChanged: string;

  /** IDs of related memory entries for graph-based associations */
  relatedMemories: string[];

  /** Timestamp when this memory was created */
  timestamp: Timestamp;

  /** Optional metadata for extensibility */
  metadata: Record<string, unknown>;
}

/**
 * Search result from semantic memory queries
 */
export interface SemanticSearchResult {
  /** The matched memory entry */
  memory: SemanticMemoryEntry;

  /** Similarity score (0-1, higher is more similar) */
  similarityScore: number;

  /** The original query text */
  query: string;

  /** Rank in the result set */
  rank: number;
}

/**
 * Configuration for the semantic memory system
 */
export interface SemanticMemoryConfig {
  /** Directory path for storing memory files */
  memoryDir: string;

  /** Maximum number of results to return in searches */
  topK: number;

  /** Whether to auto-index new memories */
  autoIndex: boolean;

  /** Minimum similarity score threshold for search results */
  minSimilarityThreshold: number;
}

/**
 * Options for creating a new memory entry
 */
export interface CreateMemoryOptions {
  /** High-level goal of the task */
  objective: string;

  /** Step-by-step plan */
  plan: string;

  /** Log of actions taken */
  actions: string;

  /** Key insights and takeaways */
  keyLearnings: string;

  /** Files that were modified */
  artifactsChanged: string;

  /** Related memory IDs to link */
  relatedMemories?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Memory index entry for fast lookups
 */
export interface MemoryIndexEntry {
  /** Index position */
  id: number;

  /** Filename of the memory */
  filename: string;

  /** Cached objective for quick filtering */
  objective: string;

  /** Timestamp for sorting */
  timestamp: Timestamp;
}

/**
 * Log entry for the central memory log
 */
export interface MemoryLogEntry {
  /** ISO timestamp */
  timestamp: string;

  /** Summary of the objective */
  objective: string;

  /** Task ID for reference */
  taskId: string;
}

/**
 * Statistics about the semantic memory system
 */
export interface SemanticMemoryStats {
  /** Total number of memories */
  totalMemories: number;

  /** Number of indexed memories */
  indexedMemories: number;

  /** Total relationships between memories */
  totalRelationships: number;

  /** Oldest memory timestamp */
  oldestMemory?: Timestamp;

  /** Newest memory timestamp */
  newestMemory?: Timestamp;
}

/**
 * Event types emitted by the semantic memory system
 */
export enum SemanticMemoryEventType {
  MEMORY_CREATED = 'memory_created',
  MEMORY_INDEXED = 'memory_indexed',
  MEMORY_LINKED = 'memory_linked',
  SEARCH_PERFORMED = 'search_performed',
  INDEX_REBUILT = 'index_rebuilt',
}

/**
 * Event payload for memory system events
 */
export interface SemanticMemoryEvent {
  type: SemanticMemoryEventType;
  timestamp: Timestamp;
  data: unknown;
}
