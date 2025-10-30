/**
 * Memory Core with FAISS indexing for AGI-aligned consciousness
 */

import { AGIMemoryEntry } from './types';

/**
 * Interface for vector embeddings (e.g., from SentenceTransformer)
 */
export interface EmbeddingModel {
  encode(text: string): Promise<number[]>;
}

/**
 * Interface for FAISS index operations
 */
export interface FAISSIndex {
  add(vector: number[]): void;
  search(queryVector: number[], limit: number): Promise<Array<{ id: string; distance: number }>>;
}

/**
 * Memory Core class for AGI-aligned memory management with vector indexing
 * 
 * This implementation provides an interface for FAISS integration.
 * Actual FAISS implementation should be provided via dependency injection.
 */
export class MemoryCore {
  private index: FAISSIndex | null;
  private mapping: Map<string, string>;
  private embedding: EmbeddingModel | null;
  private memories: Map<string, AGIMemoryEntry>;
  private dimension: number;

  /**
   * Create a new MemoryCore instance
   * 
   * @param dimension - Vector dimension for embeddings (default: 384 for all-MiniLM-L6-v2)
   * @param index - Optional FAISS index implementation
   * @param embedding - Optional embedding model implementation
   */
  constructor(
    dimension: number = 384,
    index?: FAISSIndex,
    embedding?: EmbeddingModel
  ) {
    this.dimension = dimension;
    this.index = index || null;
    this.mapping = new Map();
    this.embedding = embedding || null;
    this.memories = new Map();
  }

  /**
   * Store a memory entry in the core
   * 
   * @param memory - Memory entry to store
   * @returns Promise that resolves when the memory is stored
   */
  async store(memory: AGIMemoryEntry): Promise<void> {
    // Store the memory
    this.memories.set(memory.id, memory);
    
    // If embedding model is available, create vector and add to index
    if (this.embedding && this.index) {
      const vector = await this.embedding.encode(memory.content);
      this.index.add(vector);
      this.mapping.set(memory.id, memory.path || memory.id);
    } else {
      // Fallback: just store in mapping
      this.mapping.set(memory.id, memory.path || memory.id);
    }
  }

  /**
   * Search for similar memories using vector similarity
   * 
   * @param query - Query string to search for
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Promise that resolves to array of matching memory entries
   */
  async search(query: string, limit: number = 5): Promise<AGIMemoryEntry[]> {
    // If we have embedding and index, use vector search
    if (this.embedding && this.index) {
      const queryVector = await this.embedding.encode(query);
      const results = await this.index.search(queryVector, limit);
      
      // Convert results to memory entries
      return results
        .map(result => this.memories.get(result.id))
        .filter((mem): mem is AGIMemoryEntry => mem !== undefined);
    }
    
    // Fallback: simple text matching
    const queryLower = query.toLowerCase();
    const matches: Array<{ memory: AGIMemoryEntry; score: number }> = [];
    
    for (const memory of this.memories.values()) {
      const contentLower = memory.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        // Simple scoring based on how many times query appears
        const score = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
        matches.push({ memory, score });
      }
    }
    
    // Sort by score and return top results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(m => m.memory);
  }

  /**
   * Retrieve a memory by ID
   * 
   * @param id - Memory ID
   * @returns Memory entry or undefined if not found
   */
  getMemory(id: string): AGIMemoryEntry | undefined {
    return this.memories.get(id);
  }

  /**
   * Get all stored memories
   * 
   * @returns Array of all memory entries
   */
  getAllMemories(): AGIMemoryEntry[] {
    return Array.from(this.memories.values());
  }

  /**
   * Delete a memory from the core
   * 
   * @param id - Memory ID to delete
   * @returns true if memory was deleted, false if not found
   */
  deleteMemory(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) {
      this.mapping.delete(id);
    }
    return deleted;
  }

  /**
   * Clear all memories from the core
   */
  clear(): void {
    this.memories.clear();
    this.mapping.clear();
  }

  /**
   * Get the number of stored memories
   * 
   * @returns Number of memories in the core
   */
  getSize(): number {
    return this.memories.size;
  }

  /**
   * Set the embedding model for vector search
   * 
   * @param embedding - Embedding model implementation
   */
  setEmbeddingModel(embedding: EmbeddingModel): void {
    this.embedding = embedding;
  }

  /**
   * Set the FAISS index for vector search
   * 
   * @param index - FAISS index implementation
   */
  setFAISSIndex(index: FAISSIndex): void {
    this.index = index;
  }
}
