/**
 * Memory Core Types
 * 
 * Types for the Memory Core system inspired by StableExo/AGI
 */

/**
 * Memory entry representing a completed task
 */
export interface MemoryEntry {
  timestamp: string;
  objective: string;
  plan: string[];
  actions: string[];
  keyLearnings: string[];
  artifactsChanged: string[];
  outcome?: string;
  metadata?: Record<string, any>;
}

/**
 * Search result from memory query
 */
export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  filePath: string;
}

/**
 * Options for memory search
 */
export interface MemorySearchOptions {
  limit?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

/**
 * Self-reflection entry
 */
export interface ReflectionEntry {
  timestamp: string;
  mission: string;
  successes: string[];
  failures: string[];
  rootCauses: string[];
  improvements: string[];
  actionItems: string[];
}
