/**
 * Consciousness State Service
 * 
 * Handles persistence and retrieval of consciousness states to/from Supabase
 */

import { getSupabaseClient } from '../client';
import type { Database } from '../schemas/database.types';

type ConsciousnessStateRow = Database['public']['Tables']['consciousness_states']['Row'];
type ConsciousnessStateInsert = Database['public']['Tables']['consciousness_states']['Insert'];
type ThoughtRow = Database['public']['Tables']['thoughts']['Row'];
type ThoughtInsert = Database['public']['Tables']['thoughts']['Insert'];

/**
 * Consciousness state data structure (matching existing format)
 */
export interface ConsciousnessState {
  version: string;
  savedAt: number;
  sessionId: string;
  thoughts: Thought[];
  streams: any[];
  selfAwarenessState: {
    cognitiveLoad: number;
    emotionalState: {
      valence: number;
      arousal: number;
      dominantEmotion: string;
      emotionalHistory: any[];
    };
    goals: Goal[];
    capabilities: string[];
    limitations: string[];
    timestamp: number;
    identityState?: any;
    autonomousWonderingState?: any;
  };
  metadata: any;
}

export interface Thought {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  context: {
    relatedMemoryIds: string[];
    cognitiveState: string;
    confidence: number;
    emotionalValence: number;
  };
  associations: string[];
  intensity: number;
  metadata: any;
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  progress: number;
  status: string;
  relatedThoughts: string[];
}

/**
 * Service for managing consciousness states in Supabase
 */
export class ConsciousnessStateService {
  private supabase = getSupabaseClient(true); // Use service role for backend operations

  /**
   * Save a consciousness state
   */
  async saveState(state: ConsciousnessState): Promise<ConsciousnessStateRow> {
    const stateInsert: ConsciousnessStateInsert = {
      session_id: state.sessionId,
      saved_at: new Date(state.savedAt).toISOString(),
      version: state.version,
      cognitive_load: state.selfAwarenessState.cognitiveLoad,
      emotional_valence: state.selfAwarenessState.emotionalState.valence,
      emotional_arousal: state.selfAwarenessState.emotionalState.arousal,
      dominant_emotion: state.selfAwarenessState.emotionalState.dominantEmotion,
      thoughts: state.thoughts as any,
      streams: state.streams as any,
      goals: state.selfAwarenessState.goals as any,
      capabilities: state.selfAwarenessState.capabilities as any,
      limitations: state.selfAwarenessState.limitations as any,
      identity_state: state.selfAwarenessState.identityState as any,
      autonomous_wondering_state: state.selfAwarenessState.autonomousWonderingState as any,
      metadata: state.metadata as any,
    };

    const { data, error } = await (this.supabase
      .from('consciousness_states')
      .insert(stateInsert as any)
      .select()
      .single() as any);

    if (error) {
      throw new Error(`Failed to save consciousness state: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from consciousness state insert');
    }

    // Save individual thoughts for better querying
    if (state.thoughts.length > 0) {
      await this.saveThoughts(data.id, state.thoughts);
    }

    return data as ConsciousnessStateRow;
  }

  /**
   * Save thoughts associated with a consciousness state
   */
  private async saveThoughts(consciousnessStateId: string, thoughts: Thought[]): Promise<void> {
    const thoughtInserts: ThoughtInsert[] = thoughts.map((thought) => ({
      consciousness_state_id: consciousnessStateId,
      thought_id: thought.id,
      content: thought.content,
      type: thought.type,
      timestamp: new Date(thought.timestamp).toISOString(),
      cognitive_state: thought.context.cognitiveState,
      confidence: thought.context.confidence,
      emotional_valence: thought.context.emotionalValence,
      intensity: thought.intensity,
      associations: thought.associations as any,
      related_memory_ids: thought.context.relatedMemoryIds as any,
      metadata: thought.metadata as any,
    }));

    const { error } = await (this.supabase.from('thoughts').insert(thoughtInserts as any) as any);

    if (error) {
      console.error('Failed to save thoughts:', error);
      // Don't throw - thoughts are supplementary to main state
    }
  }

  /**
   * Get consciousness state by session ID
   */
  async getStateBySessionId(sessionId: string): Promise<ConsciousnessState | null> {
    const { data, error } = await this.supabase
      .from('consciousness_states')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToState(data);
  }

  /**
   * Get latest consciousness state
   */
  async getLatestState(): Promise<ConsciousnessState | null> {
    const { data, error } = await this.supabase
      .from('consciousness_states')
      .select('*')
      .order('saved_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToState(data);
  }

  /**
   * Get all consciousness states (paginated)
   */
  async getAllStates(limit: number = 100, offset: number = 0): Promise<ConsciousnessState[]> {
    const { data, error } = await this.supabase
      .from('consciousness_states')
      .select('*')
      .order('saved_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapRowToState(row));
  }

  /**
   * Search thoughts by content
   */
  async searchThoughts(query: string, limit: number = 10): Promise<ThoughtRow[]> {
    const { data, error } = await this.supabase
      .from('thoughts')
      .select('*')
      .textSearch('content', query)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  }

  /**
   * Get thoughts by type
   */
  async getThoughtsByType(type: string, limit: number = 100): Promise<ThoughtRow[]> {
    const { data, error } = await this.supabase
      .from('thoughts')
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  }

  /**
   * Get consciousness states by date range
   */
  async getStatesByDateRange(startDate: Date, endDate: Date): Promise<ConsciousnessState[]> {
    const { data, error } = await this.supabase
      .from('consciousness_states')
      .select('*')
      .gte('saved_at', startDate.toISOString())
      .lte('saved_at', endDate.toISOString())
      .order('saved_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapRowToState(row));
  }

  /**
   * Delete old consciousness states (cleanup)
   */
  async deleteOldStates(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await this.supabase
      .from('consciousness_states')
      .delete()
      .lt('saved_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to delete old states: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Map database row to ConsciousnessState
   */
  private mapRowToState(row: ConsciousnessStateRow): ConsciousnessState {
    return {
      version: row.version,
      savedAt: new Date(row.saved_at).getTime(),
      sessionId: row.session_id,
      thoughts: (row.thoughts as any) || [],
      streams: (row.streams as any) || [],
      selfAwarenessState: {
        cognitiveLoad: row.cognitive_load || 0,
        emotionalState: {
          valence: row.emotional_valence || 0,
          arousal: row.emotional_arousal || 0,
          dominantEmotion: row.dominant_emotion || 'neutral',
          emotionalHistory: [],
        },
        goals: (row.goals as any) || [],
        capabilities: (row.capabilities as any) || [],
        limitations: (row.limitations as any) || [],
        timestamp: new Date(row.saved_at).getTime(),
        identityState: row.identity_state as any,
        autonomousWonderingState: row.autonomous_wondering_state as any,
      },
      metadata: row.metadata as any,
    };
  }
}

// Export singleton instance
export const consciousnessStateService = new ConsciousnessStateService();
