/**
 * Memory Service for Supabase
 * 
 * Handles persistence of semantic and episodic memories
 */

import { getSupabaseClient } from '../client';
import type { Database } from '../schemas/database.types';

type SemanticMemoryRow = Database['public']['Tables']['semantic_memories']['Row'];
type SemanticMemoryInsert = Database['public']['Tables']['semantic_memories']['Insert'];
type EpisodicMemoryRow = Database['public']['Tables']['episodic_memories']['Row'];
type EpisodicMemoryInsert = Database['public']['Tables']['episodic_memories']['Insert'];

export interface SemanticMemory {
  memoryId: string;
  content: string;
  timestamp: number;
  category?: string;
  tags?: string[];
  importance?: number;
  activationCount?: number;
  lastAccessed?: number;
  associations?: any[];
  metadata?: any;
  context?: any;
}

export interface EpisodicMemory {
  episodeId: string;
  timestamp: number;
  type: string;
  description?: string;
  context: any;
  emotionalState?: any;
  outcome?: string;
  success?: boolean;
  importance?: number;
  recallCount?: number;
  lastRecalled?: number;
  relatedEpisodes?: string[];
  tags?: string[];
  metadata?: any;
}

/**
 * Service for managing memories in Supabase
 */
export class MemoryService {
  private supabase = getSupabaseClient(true);

  // ============================================================================
  // SEMANTIC MEMORIES
  // ============================================================================

  /**
   * Save a semantic memory
   */
  async saveSemanticMemory(memory: SemanticMemory): Promise<SemanticMemoryRow> {
    const insert: SemanticMemoryInsert = {
      memory_id: memory.memoryId,
      content: memory.content,
      timestamp: new Date(memory.timestamp).toISOString(),
      category: memory.category,
      tags: memory.tags || [],
      importance: memory.importance || 1,
      activation_count: memory.activationCount || 0,
      last_accessed: memory.lastAccessed ? new Date(memory.lastAccessed).toISOString() : null,
      associations: memory.associations as any,
      metadata: memory.metadata as any,
      context: memory.context as any,
    };

    const { data, error } = await this.supabase
      .from('semantic_memories')
      .insert(insert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save semantic memory: ${error.message}`);
    }

    return data;
  }

  /**
   * Get semantic memory by ID
   */
  async getSemanticMemory(memoryId: string): Promise<SemanticMemory | null> {
    const { data, error } = await this.supabase
      .from('semantic_memories')
      .select('*')
      .eq('memory_id', memoryId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapSemanticRow(data);
  }

  /**
   * Search semantic memories by content
   */
  async searchSemanticMemories(query: string, limit: number = 10): Promise<SemanticMemory[]> {
    const { data, error } = await this.supabase
      .from('semantic_memories')
      .select('*')
      .textSearch('content_tsv', query, { type: 'websearch', config: 'english' })
      .order('importance', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapSemanticRow(row));
  }

  /**
   * Get semantic memories by category
   */
  async getSemanticMemoriesByCategory(
    category: string,
    limit: number = 100
  ): Promise<SemanticMemory[]> {
    const { data, error } = await this.supabase
      .from('semantic_memories')
      .select('*')
      .eq('category', category)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapSemanticRow(row));
  }

  /**
   * Get semantic memories by tags
   */
  async getSemanticMemoriesByTags(tags: string[], limit: number = 100): Promise<SemanticMemory[]> {
    const { data, error } = await this.supabase
      .from('semantic_memories')
      .select('*')
      .contains('tags', tags)
      .order('importance', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapSemanticRow(row));
  }

  /**
   * Update semantic memory activation
   */
  async activateSemanticMemory(memoryId: string): Promise<void> {
    const { error } = await this.supabase.rpc('activate_semantic_memory', {
      memory_id: memoryId,
    });

    if (error) {
      console.error('Failed to activate memory:', error);
    }
  }

  // ============================================================================
  // EPISODIC MEMORIES
  // ============================================================================

  /**
   * Save an episodic memory
   */
  async saveEpisodicMemory(memory: EpisodicMemory): Promise<EpisodicMemoryRow> {
    const insert: EpisodicMemoryInsert = {
      episode_id: memory.episodeId,
      timestamp: new Date(memory.timestamp).toISOString(),
      type: memory.type,
      description: memory.description,
      context: memory.context as any,
      emotional_state: memory.emotionalState as any,
      outcome: memory.outcome,
      success: memory.success,
      importance: memory.importance || 1,
      recall_count: memory.recallCount || 0,
      last_recalled: memory.lastRecalled ? new Date(memory.lastRecalled).toISOString() : null,
      related_episodes: memory.relatedEpisodes || [],
      tags: memory.tags || [],
      metadata: memory.metadata as any,
    };

    const { data, error } = await this.supabase
      .from('episodic_memories')
      .insert(insert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save episodic memory: ${error.message}`);
    }

    return data;
  }

  /**
   * Get episodic memory by ID
   */
  async getEpisodicMemory(episodeId: string): Promise<EpisodicMemory | null> {
    const { data, error } = await this.supabase
      .from('episodic_memories')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapEpisodicRow(data);
  }

  /**
   * Get episodic memories by type
   */
  async getEpisodicMemoriesByType(type: string, limit: number = 100): Promise<EpisodicMemory[]> {
    const { data, error } = await this.supabase
      .from('episodic_memories')
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapEpisodicRow(row));
  }

  /**
   * Get successful episodic memories
   */
  async getSuccessfulEpisodes(limit: number = 100): Promise<EpisodicMemory[]> {
    const { data, error } = await this.supabase
      .from('episodic_memories')
      .select('*')
      .eq('success', true)
      .order('importance', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapEpisodicRow(row));
  }

  /**
   * Update episodic memory recall
   */
  async recallEpisodicMemory(episodeId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('episodic_memories')
      .select('recall_count')
      .eq('episode_id', episodeId)
      .single();

    if (!error && data) {
      await this.supabase
        .from('episodic_memories')
        .update({
          recall_count: data.recall_count + 1,
          last_recalled: new Date().toISOString(),
        })
        .eq('episode_id', episodeId);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    semanticCount: number;
    episodicCount: number;
    totalImportance: number;
  }> {
    const [semanticResult, episodicResult] = await Promise.all([
      this.supabase.from('semantic_memories').select('id, importance', { count: 'exact' }),
      this.supabase.from('episodic_memories').select('id, importance', { count: 'exact' }),
    ]);

    const semanticCount = semanticResult.count || 0;
    const episodicCount = episodicResult.count || 0;
    const semanticImportance =
      semanticResult.data?.reduce((sum, row) => sum + row.importance, 0) || 0;
    const episodicImportance =
      episodicResult.data?.reduce((sum, row) => sum + row.importance, 0) || 0;

    return {
      semanticCount,
      episodicCount,
      totalImportance: semanticImportance + episodicImportance,
    };
  }

  /**
   * Delete old memories (cleanup)
   */
  async deleteOldMemories(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const [semanticResult, episodicResult] = await Promise.all([
      this.supabase
        .from('semantic_memories')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .eq('importance', 1)
        .select('id'),
      this.supabase
        .from('episodic_memories')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .eq('importance', 1)
        .select('id'),
    ]);

    const semanticDeleted = semanticResult.data?.length || 0;
    const episodicDeleted = episodicResult.data?.length || 0;

    return semanticDeleted + episodicDeleted;
  }

  // ============================================================================
  // MAPPING METHODS
  // ============================================================================

  private mapSemanticRow(row: SemanticMemoryRow): SemanticMemory {
    return {
      memoryId: row.memory_id,
      content: row.content,
      timestamp: new Date(row.timestamp).getTime(),
      category: row.category || undefined,
      tags: row.tags,
      importance: row.importance,
      activationCount: row.activation_count,
      lastAccessed: row.last_accessed ? new Date(row.last_accessed).getTime() : undefined,
      associations: row.associations as any,
      metadata: row.metadata as any,
      context: row.context as any,
    };
  }

  private mapEpisodicRow(row: EpisodicMemoryRow): EpisodicMemory {
    return {
      episodeId: row.episode_id,
      timestamp: new Date(row.timestamp).getTime(),
      type: row.type,
      description: row.description || undefined,
      context: row.context as any,
      emotionalState: row.emotional_state as any,
      outcome: row.outcome || undefined,
      success: row.success || undefined,
      importance: row.importance,
      recallCount: row.recall_count,
      lastRecalled: row.last_recalled ? new Date(row.last_recalled).getTime() : undefined,
      relatedEpisodes: row.related_episodes,
      tags: row.tags,
      metadata: row.metadata as any,
    };
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
