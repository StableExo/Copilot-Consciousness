/**
 * LangChain Vector Store Service for Semantic Memory Search
 * 
 * Enables AI-powered semantic search using OpenAI embeddings and Supabase pgvector
 */

import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { getSupabaseClient } from '../client-enhanced';

export interface SemanticMemoryDocument {
  memoryId: string;
  content: string;
  category?: string;
  tags?: string[];
  importance?: number;
  timestamp?: number;
}

export interface SearchResult {
  memoryId: string;
  content: string;
  category?: string;
  tags?: string[];
  importance?: number;
  similarity: number;
}

/**
 * Vector store for consciousness memories with semantic search
 */
export class ConsciousnessVectorStore {
  private vectorStore: SupabaseVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private initialized: boolean = false;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for vector search');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    });
  }

  /**
   * Initialize vector store connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const supabase = getSupabaseClient(true); // Use service role

    this.vectorStore = new SupabaseVectorStore(this.embeddings, {
      client: supabase,
      tableName: 'semantic_memories',
      queryName: 'match_semantic_memories', // Custom RPC function
    });

    this.initialized = true;
  }

  /**
   * Ensure initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Add semantic memories with automatic embedding generation
   */
  async addMemories(memories: SemanticMemoryDocument[]): Promise<void> {
    await this.ensureInitialized();

    const documents = memories.map(
      (mem) =>
        new Document({
          pageContent: mem.content,
          metadata: {
            memory_id: mem.memoryId,
            category: mem.category || null,
            tags: mem.tags || [],
            importance: mem.importance || 1,
            timestamp: mem.timestamp || Date.now(),
          },
        })
    );

    await this.vectorStore!.addDocuments(documents);
  }

  /**
   * Semantic search for memories by meaning
   */
  async searchMemories(query: string, limit: number = 10): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const results = await this.vectorStore!.similaritySearchWithScore(query, limit);

    return results.map(([doc, distance]) => ({
      memoryId: doc.metadata.memory_id,
      content: doc.pageContent,
      category: doc.metadata.category,
      tags: doc.metadata.tags,
      importance: doc.metadata.importance,
      similarity: 1 - distance, // Convert distance to similarity (0-1)
    }));
  }

  /**
   * Search with metadata filters
   */
  async searchWithFilters(
    query: string,
    filters: {
      categories?: string[];
      minImportance?: number;
      tags?: string[];
    },
    limit: number = 10
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    // Build metadata filter
    const metadataFilter: any = {};

    if (filters.categories && filters.categories.length > 0) {
      metadataFilter.category = { $in: filters.categories };
    }

    if (filters.minImportance) {
      metadataFilter.importance = { $gte: filters.minImportance };
    }

    if (filters.tags && filters.tags.length > 0) {
      metadataFilter.tags = { $contains: filters.tags };
    }

    const results = await this.vectorStore!.similaritySearchWithScore(query, limit, metadataFilter);

    return results.map(([doc, distance]) => ({
      memoryId: doc.metadata.memory_id,
      content: doc.pageContent,
      category: doc.metadata.category,
      tags: doc.metadata.tags,
      importance: doc.metadata.importance,
      similarity: 1 - distance,
    }));
  }

  /**
   * Find memories related to a specific memory
   */
  async findRelatedMemories(memoryId: string, limit: number = 5): Promise<SearchResult[]> {
    await this.ensureInitialized();

    // Get the original memory content
    const supabase = getSupabaseClient(true);
    const { data: memory, error } = await supabase
      .from('semantic_memories')
      .select('content')
      .eq('memory_id', memoryId)
      .single();

    if (error || !memory) {
      console.error('Failed to fetch memory:', error);
      return [];
    }

    // Search for similar memories (excluding the original)
    const results = await this.searchMemories(memory.content, limit + 1);
    return results.filter((r) => r.memoryId !== memoryId).slice(0, limit);
  }

  /**
   * Get embedding for a text (useful for custom similarity calculations)
   */
  async getEmbedding(text: string): Promise<number[]> {
    return await this.embeddings.embedQuery(text);
  }

  /**
   * Check if vector store is ready
   */
  isReady(): boolean {
    return this.initialized && this.vectorStore !== null;
  }
}

// Export singleton instance
export const consciousnessVectorStore = new ConsciousnessVectorStore();
