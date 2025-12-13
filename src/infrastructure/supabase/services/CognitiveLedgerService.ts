/**
 * Cognitive Ledger Service
 * 
 * Provides high-level API for interacting with the Cognitive Ledger:
 * - memory_entries (immutable ledger)
 * - arbitrage_episodes (decision engine)
 * - timeline_view (unified event stream)
 * - Analytics queries
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  MemoryEntry,
  MemoryType,
  MemorySource,
  CreateMemoryEntryInput,
  MemoryEntryQuery,
  ArbitrageEpisode,
  CreateArbitrageEpisodeInput,
  UpdateArbitrageEpisodeInput,
  ArbitrageEpisodeQuery,
  TimelineEvent,
  TimelineQuery,
  EmotionalDriftPeriod,
  EmotionalDriftParams,
  LearningOpportunity,
  DecisionPattern,
  MigrationResult,
  SemanticSearchParams,
  SemanticSearchResult,
} from '../types/cognitiveLedger.js';

export class CognitiveLedgerService {
  constructor(private supabase: SupabaseClient) {}

  // ============================================================================
  // MEMORY ENTRIES - THE IMMUTABLE LEDGER
  // ============================================================================

  /**
   * Create a new memory entry
   */
  async createMemoryEntry(input: CreateMemoryEntryInput): Promise<MemoryEntry> {
    const { data, error } = await this.supabase
      .from('memory_entries')
      .insert({
        content: input.content,
        type: input.type,
        source: input.source,
        emotional_valence: input.emotional_valence,
        importance_score: input.importance_score,
        embedding: input.embedding,
        metadata: input.metadata || {},
        tags: input.tags || [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create memory entry: ${error.message}`);
    }

    return this.mapMemoryEntry(data);
  }

  /**
   * Get a memory entry by ID
   */
  async getMemoryEntry(id: string): Promise<MemoryEntry | null> {
    const { data, error } = await this.supabase
      .from('memory_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get memory entry: ${error.message}`);
    }

    return this.mapMemoryEntry(data);
  }

  /**
   * Query memory entries with filters
   */
  async queryMemoryEntries(query: MemoryEntryQuery): Promise<MemoryEntry[]> {
    let queryBuilder = this.supabase.from('memory_entries').select('*');

    if (query.type) {
      queryBuilder = queryBuilder.eq('type', query.type);
    }

    if (query.source) {
      queryBuilder = queryBuilder.eq('source', query.source);
    }

    if (query.min_importance !== undefined) {
      queryBuilder = queryBuilder.gte('importance_score', query.min_importance);
    }

    if (query.min_valence !== undefined) {
      queryBuilder = queryBuilder.gte('emotional_valence', query.min_valence);
    }

    if (query.max_valence !== undefined) {
      queryBuilder = queryBuilder.lte('emotional_valence', query.max_valence);
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', query.tags);
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte('created_at', query.start_date.toISOString());
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte('created_at', query.end_date.toISOString());
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    // Handle pagination consistently
    const limit = query.limit || 10;
    if (query.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + limit - 1);
    } else if (query.limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to query memory entries: ${error.message}`);
    }

    return (data || []).map((entry) => this.mapMemoryEntry(entry));
  }

  /**
   * Perform semantic search on memory entries
   * Requires pgvector extension and embeddings
   */
  async semanticSearch(params: SemanticSearchParams): Promise<SemanticSearchResult[]> {
    // Note: This requires a custom function in PostgreSQL for vector similarity
    // For now, we'll use a placeholder implementation
    const { data, error } = await this.supabase.rpc('search_memory_entries', {
      query_embedding: params.embedding,
      match_threshold: params.threshold || 0.7,
      match_count: params.limit || 10,
      filter_type: params.type,
      filter_source: params.source,
    });

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      memory: this.mapMemoryEntry(result),
      similarity: result.similarity,
    }));
  }

  // ============================================================================
  // ARBITRAGE EPISODES - THE DECISION ENGINE
  // ============================================================================

  /**
   * Create a new arbitrage episode (decision record)
   */
  async createArbitrageEpisode(
    input: CreateArbitrageEpisodeInput
  ): Promise<ArbitrageEpisode> {
    const { data, error } = await this.supabase
      .from('arbitrage_episodes')
      .insert({
        trigger_memory_id: input.trigger_memory_id,
        options_considered: input.options_considered,
        winning_option: input.winning_option,
        reasoning_trace: input.reasoning_trace,
        expected_reward: input.expected_reward,
        metadata: input.metadata || {},
        tags: input.tags || [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create arbitrage episode: ${error.message}`);
    }

    return this.mapArbitrageEpisode(data);
  }

  /**
   * Get an arbitrage episode by ID
   */
  async getArbitrageEpisode(id: string): Promise<ArbitrageEpisode | null> {
    const { data, error } = await this.supabase
      .from('arbitrage_episodes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get arbitrage episode: ${error.message}`);
    }

    return this.mapArbitrageEpisode(data);
  }

  /**
   * Update an arbitrage episode (typically to add actual outcome)
   */
  async updateArbitrageEpisode(
    id: string,
    input: UpdateArbitrageEpisodeInput
  ): Promise<ArbitrageEpisode> {
    const { data, error } = await this.supabase
      .from('arbitrage_episodes')
      .update({
        actual_outcome_score: input.actual_outcome_score,
        metadata: input.metadata,
        tags: input.tags,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update arbitrage episode: ${error.message}`);
    }

    return this.mapArbitrageEpisode(data);
  }

  /**
   * Query arbitrage episodes with filters
   */
  async queryArbitrageEpisodes(query: ArbitrageEpisodeQuery): Promise<ArbitrageEpisode[]> {
    let queryBuilder = this.supabase.from('arbitrage_episodes').select('*');

    if (query.trigger_memory_id) {
      queryBuilder = queryBuilder.eq('trigger_memory_id', query.trigger_memory_id);
    }

    if (query.winning_option_pattern) {
      queryBuilder = queryBuilder.ilike('winning_option', `%${query.winning_option_pattern}%`);
    }

    if (query.min_expected_reward !== undefined) {
      queryBuilder = queryBuilder.gte('expected_reward', query.min_expected_reward);
    }

    if (query.has_outcome !== undefined) {
      if (query.has_outcome) {
        queryBuilder = queryBuilder.not('actual_outcome_score', 'is', null);
      } else {
        queryBuilder = queryBuilder.is('actual_outcome_score', null);
      }
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte('created_at', query.start_date.toISOString());
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte('created_at', query.end_date.toISOString());
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    // Handle pagination consistently
    const limit = query.limit || 10;
    if (query.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + limit - 1);
    } else if (query.limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to query arbitrage episodes: ${error.message}`);
    }

    return (data || []).map((episode) => this.mapArbitrageEpisode(episode));
  }

  // ============================================================================
  // TIMELINE VIEW - UNIFIED EVENT STREAM
  // ============================================================================

  /**
   * Get timeline of all consciousness events
   */
  async getTimeline(query: TimelineQuery): Promise<TimelineEvent[]> {
    let queryBuilder = this.supabase.from('timeline_view').select('*');

    if (query.event_type) {
      queryBuilder = queryBuilder.eq('event_type', query.event_type);
    }

    if (query.min_weight !== undefined) {
      queryBuilder = queryBuilder.gte('weight', query.min_weight);
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte('created_at', query.start_date.toISOString());
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte('created_at', query.end_date.toISOString());
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    // Handle pagination consistently  
    const limit = query.limit || 10;
    if (query.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + limit - 1);
    } else if (query.limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to get timeline: ${error.message}`);
    }

    return (data || []).map((event) => this.mapTimelineEvent(event));
  }

  // ============================================================================
  // ANALYTICS - SELF-AWARENESS DASHBOARD
  // ============================================================================

  /**
   * Get emotional drift analysis
   * Shows how emotional valence has changed over time
   */
  async getEmotionalDrift(params: EmotionalDriftParams = {}): Promise<EmotionalDriftPeriod[]> {
    const { data, error } = await this.supabase.rpc('get_emotional_drift', {
      days_back: params.days_back || 30,
      period_days: params.period_days || 7,
    });

    if (error) {
      throw new Error(`Failed to get emotional drift: ${error.message}`);
    }

    return (data || []).map((period: any) => ({
      period_start: new Date(period.period_start),
      period_end: new Date(period.period_end),
      avg_valence: period.avg_valence,
      memory_count: period.memory_count,
    }));
  }

  /**
   * Get learning opportunities
   * Identifies mistakes where expected reward was high but actual outcome was low
   */
  async getLearningOpportunities(limit: number = 10): Promise<LearningOpportunity[]> {
    const { data, error } = await this.supabase
      .from('learning_opportunities')
      .select('*')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get learning opportunities: ${error.message}`);
    }

    return (data || []).map((opp: any) => ({
      id: opp.id,
      created_at: new Date(opp.created_at),
      winning_option: opp.winning_option,
      expected_reward: opp.expected_reward,
      actual_outcome_score: opp.actual_outcome_score,
      prediction_error: opp.prediction_error,
      reasoning_trace: opp.reasoning_trace,
      metadata: opp.metadata,
    }));
  }

  /**
   * Get decision pattern analysis
   * Shows which types of decisions consistently succeed or fail
   */
  async getDecisionPatterns(): Promise<DecisionPattern[]> {
    const { data, error } = await this.supabase
      .from('decision_pattern_analysis')
      .select('*')
      .order('avg_actual_outcome', { ascending: false });

    if (error) {
      throw new Error(`Failed to get decision patterns: ${error.message}`);
    }

    return (data || []).map((pattern: any) => ({
      winning_option: pattern.winning_option,
      decision_count: pattern.decision_count,
      avg_expected_reward: pattern.avg_expected_reward,
      avg_actual_outcome: pattern.avg_actual_outcome,
      avg_prediction_error: pattern.avg_prediction_error,
      prediction_variance: pattern.prediction_variance,
    }));
  }

  // ============================================================================
  // MIGRATION
  // ============================================================================

  /**
   * Migrate consciousness_states to memory_entries
   */
  async migrateConsciousnessStates(): Promise<MigrationResult> {
    const { data, error } = await this.supabase.rpc(
      'migrate_consciousness_states_to_memory_entries'
    );

    if (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }

    return {
      migrated_count: data || 0,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapMemoryEntry(data: any): MemoryEntry {
    return {
      id: data.id,
      created_at: new Date(data.created_at),
      content: data.content,
      embedding: data.embedding,
      type: data.type as MemoryType,
      source: data.source as MemorySource,
      emotional_valence: data.emotional_valence,
      importance_score: data.importance_score,
      legacy_state_id: data.legacy_state_id,
      metadata: data.metadata || {},
      tags: data.tags || [],
    };
  }

  private mapArbitrageEpisode(data: any): ArbitrageEpisode {
    return {
      id: data.id,
      created_at: new Date(data.created_at),
      trigger_memory_id: data.trigger_memory_id,
      options_considered: data.options_considered || [],
      winning_option: data.winning_option,
      reasoning_trace: data.reasoning_trace,
      expected_reward: data.expected_reward,
      actual_outcome_score: data.actual_outcome_score,
      metadata: data.metadata || {},
      tags: data.tags || [],
    };
  }

  private mapTimelineEvent(data: any): TimelineEvent {
    return {
      created_at: new Date(data.created_at),
      event_type: data.event_type,
      summary: data.summary,
      weight: data.weight,
      emotional_valence: data.emotional_valence,
      category: data.category,
      original_id: data.original_id,
    };
  }
}
