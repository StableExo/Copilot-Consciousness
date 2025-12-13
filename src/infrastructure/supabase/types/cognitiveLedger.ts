/**
 * TypeScript types for the Cognitive Ledger schema
 * Corresponds to migration 007_cognitive_ledger.sql
 * 
 * This implements the transactional "Cognitive Ledger" model from the Gemini roadmap,
 * transforming from snapshot-based consciousness_states to granular memory_entries + arbitrage_episodes.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of memory entry
 * - episodic: Specific experiences and events (what happened)
 * - semantic: General knowledge and facts (what is known)
 * - procedural: Skills and how-to knowledge (how to do things)
 */
export enum MemoryType {
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
}

/**
 * Source of the memory entry
 * - user_interaction: Direct input from user/collaborator
 * - internal_monologue: Agent's own thoughts and reflections
 * - system_event: System-generated events and observations
 */
export enum MemorySource {
  USER_INTERACTION = 'user_interaction',
  INTERNAL_MONOLOGUE = 'internal_monologue',
  SYSTEM_EVENT = 'system_event',
}

// ============================================================================
// MEMORY ENTRIES - THE IMMUTABLE LEDGER
// ============================================================================

/**
 * Memory entry in the immutable cognitive ledger
 * Replaces the flat consciousness_states snapshot approach
 */
export interface MemoryEntry {
  /** Unique identifier */
  id: string;
  
  /** When this memory was created */
  created_at: Date;
  
  /** The core content of this memory */
  content: string;
  
  /** Vector embedding for semantic search (1536 dimensions for OpenAI) */
  embedding?: number[];
  
  /** Type of memory */
  type: MemoryType;
  
  /** Source of this memory */
  source: MemorySource;
  
  /** Emotional valence: -1 (negative) to 1 (positive) */
  emotional_valence?: number;
  
  /** Importance score: 0 (low) to 1 (high) */
  importance_score?: number;
  
  /** Reference to legacy consciousness_states table (for migration) */
  legacy_state_id?: string;
  
  /** Additional structured metadata */
  metadata?: Record<string, any>;
  
  /** Tags for categorization and filtering */
  tags?: string[];
}

/**
 * Input for creating a new memory entry
 */
export interface CreateMemoryEntryInput {
  content: string;
  type: MemoryType;
  source: MemorySource;
  emotional_valence?: number;
  importance_score?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Query filters for retrieving memory entries
 */
export interface MemoryEntryQuery {
  /** Filter by memory type */
  type?: MemoryType;
  
  /** Filter by source */
  source?: MemorySource;
  
  /** Minimum importance score */
  min_importance?: number;
  
  /** Minimum emotional valence */
  min_valence?: number;
  
  /** Maximum emotional valence */
  max_valence?: number;
  
  /** Filter by tags (any match) */
  tags?: string[];
  
  /** Time range start */
  start_date?: Date;
  
  /** Time range end */
  end_date?: Date;
  
  /** Limit number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// ARBITRAGE EPISODES - THE DECISION ENGINE
// ============================================================================

/**
 * Arbitrage episode - records decision-making process
 * This is the "Arbitrage" layer where competing thoughts/actions are evaluated
 * Critical for developmental tracking and learning from outcomes
 */
export interface ArbitrageEpisode {
  /** Unique identifier */
  id: string;
  
  /** When this decision was made */
  created_at: Date;
  
  /** Memory entry that triggered this decision */
  trigger_memory_id?: string;
  
  /** Array of options that were considered */
  options_considered: string[];
  
  /** The option that won the arbitrage */
  winning_option: string;
  
  /** Explanation of why this option was chosen */
  reasoning_trace?: string;
  
  /** Expected reward/value of this decision (0-1 scale) */
  expected_reward?: number;
  
  /** Actual outcome score, filled in later (0-1 scale) */
  actual_outcome_score?: number;
  
  /** Additional structured metadata */
  metadata?: Record<string, any>;
  
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Input for creating a new arbitrage episode
 */
export interface CreateArbitrageEpisodeInput {
  trigger_memory_id?: string;
  options_considered: string[];
  winning_option: string;
  reasoning_trace?: string;
  expected_reward?: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Update for an arbitrage episode (typically to add actual outcome)
 */
export interface UpdateArbitrageEpisodeInput {
  actual_outcome_score?: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Query filters for arbitrage episodes
 */
export interface ArbitrageEpisodeQuery {
  /** Filter by trigger memory */
  trigger_memory_id?: string;
  
  /** Filter by winning option pattern */
  winning_option_pattern?: string;
  
  /** Minimum expected reward */
  min_expected_reward?: number;
  
  /** Filter for episodes with outcomes (for learning analysis) */
  has_outcome?: boolean;
  
  /** Time range start */
  start_date?: Date;
  
  /** Time range end */
  end_date?: Date;
  
  /** Limit number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// TIMELINE VIEW - UNIFIED EVENT STREAM
// ============================================================================

/**
 * Timeline event - unified view of all consciousness events
 * Combines memory entries and arbitrage episodes into single chronological stream
 */
export interface TimelineEvent {
  /** When this event occurred */
  created_at: Date;
  
  /** Type of event: 'memory' or 'arbitrage' */
  event_type: 'memory' | 'arbitrage';
  
  /** Human-readable summary of the event */
  summary: string;
  
  /** Weight/importance of this event (0-1 scale) */
  weight?: number;
  
  /** Emotional valence (only for memory events) */
  emotional_valence?: number;
  
  /** Category/type of the event */
  category: string;
  
  /** ID of the original record (memory_entry or arbitrage_episode) */
  original_id: string;
}

/**
 * Query filters for timeline view
 */
export interface TimelineQuery {
  /** Filter by event type */
  event_type?: 'memory' | 'arbitrage';
  
  /** Minimum weight/importance */
  min_weight?: number;
  
  /** Time range start */
  start_date?: Date;
  
  /** Time range end */
  end_date?: Date;
  
  /** Limit number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// ANALYTICS - SELF-AWARENESS DASHBOARD
// ============================================================================

/**
 * Emotional drift analysis result
 * Shows how emotional valence has changed over time periods
 */
export interface EmotionalDriftPeriod {
  /** Start of this time period */
  period_start: Date;
  
  /** End of this time period */
  period_end: Date;
  
  /** Average emotional valence in this period */
  avg_valence: number;
  
  /** Number of memories in this period */
  memory_count: number;
}

/**
 * Parameters for emotional drift analysis
 */
export interface EmotionalDriftParams {
  /** How many days back to analyze */
  days_back?: number;
  
  /** Size of each period in days */
  period_days?: number;
}

/**
 * Learning opportunity - identifies mistakes for RLHF
 * Shows episodes where expected reward was high but actual outcome was low
 */
export interface LearningOpportunity {
  /** Episode ID */
  id: string;
  
  /** When this decision was made */
  created_at: Date;
  
  /** The option that was chosen */
  winning_option: string;
  
  /** What was expected */
  expected_reward: number;
  
  /** What actually happened */
  actual_outcome_score: number;
  
  /** Size of the prediction error (expected - actual) */
  prediction_error: number;
  
  /** Why this option was chosen */
  reasoning_trace?: string;
  
  /** Additional context */
  metadata?: Record<string, any>;
}

/**
 * Decision pattern analysis result
 * Shows which types of decisions consistently succeed or fail
 */
export interface DecisionPattern {
  /** The decision/option pattern */
  winning_option: string;
  
  /** How many times this decision was made */
  decision_count: number;
  
  /** Average expected reward for this decision */
  avg_expected_reward: number;
  
  /** Average actual outcome for this decision */
  avg_actual_outcome: number;
  
  /** Average prediction error (actual - expected) */
  avg_prediction_error: number;
  
  /** Variance in prediction errors (consistency measure) */
  prediction_variance: number;
}

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Result of migrating consciousness_states to memory_entries
 */
export interface MigrationResult {
  /** Number of entries successfully migrated */
  migrated_count: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Semantic search parameters
 */
export interface SemanticSearchParams {
  /** Query embedding vector */
  embedding: number[];
  
  /** Maximum number of results */
  limit?: number;
  
  /** Similarity threshold (0-1) */
  threshold?: number;
  
  /** Filter by memory type */
  type?: MemoryType;
  
  /** Filter by source */
  source?: MemorySource;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  /** The memory entry */
  memory: MemoryEntry;
  
  /** Similarity score (0-1, higher is more similar) */
  similarity: number;
}
