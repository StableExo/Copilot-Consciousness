-- Supabase Cognitive Ledger Migration
-- Version: 007
-- Description: Transform from snapshot model to transactional cognitive ledger
-- Implements: Gemini roadmap for memory_entries + arbitrage_episodes
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-13

-- ============================================================================
-- PART 1: MEMORY ENTRIES - THE IMMUTABLE LEDGER
-- ============================================================================

-- Create memory type enum
CREATE TYPE memory_type AS ENUM ('episodic', 'semantic', 'procedural');

-- Create memory source enum
CREATE TYPE memory_source AS ENUM ('user_interaction', 'internal_monologue', 'system_event');

-- The core immutable ledger - replaces flat history
CREATE TABLE memory_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- The core content
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- pgvector extension for semantic search
  
  -- Metadata for retrieval
  type memory_type NOT NULL,
  source memory_source NOT NULL,
  
  -- "Psychological" Metadata
  emotional_valence FLOAT CHECK (emotional_valence BETWEEN -1 AND 1), -- -1 (negative) to 1 (positive)
  importance_score FLOAT CHECK (importance_score BETWEEN 0 AND 1),
  
  -- Linking back to the "Old World" if needed (for migration)
  legacy_state_id UUID REFERENCES consciousness_states(id) ON DELETE SET NULL,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}'
);

-- Create indexes for fast retrieval
CREATE INDEX idx_memory_entries_created_at ON memory_entries(created_at DESC);
CREATE INDEX idx_memory_entries_type ON memory_entries(type);
CREATE INDEX idx_memory_entries_source ON memory_entries(source);
CREATE INDEX idx_memory_entries_importance ON memory_entries(importance_score DESC);
CREATE INDEX idx_memory_entries_valence ON memory_entries(emotional_valence);
CREATE INDEX idx_memory_entries_legacy ON memory_entries(legacy_state_id) WHERE legacy_state_id IS NOT NULL;
CREATE INDEX idx_memory_entries_tags ON memory_entries USING GIN(tags);
CREATE INDEX idx_memory_entries_metadata ON memory_entries USING GIN(metadata);

-- Enable HNSW index for fast semantic recall (requires pgvector extension)
-- Note: This will be created after pgvector is enabled
-- CREATE INDEX idx_memory_entries_embedding ON memory_entries USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- PART 2: ARBITRAGE EPISODES - THE DECISION ENGINE
-- ============================================================================

-- The "Arbitrage" layer - records how decisions are made
-- Critical for developmental tracking and learning
CREATE TABLE arbitrage_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- The Context - what triggered this decision
  trigger_memory_id UUID REFERENCES memory_entries(id) ON DELETE SET NULL,
  
  -- The Conflict - what options were considered
  options_considered JSONB NOT NULL DEFAULT '[]', -- e.g. ["Answer nicely", "Refuse request", "Ask clarification"]
  
  -- The Settlement (Arbitrage) - which option won
  winning_option TEXT NOT NULL,
  reasoning_trace TEXT, -- Claude's explanation of WHY it chose this path
  
  -- The Outcome Valuation
  expected_reward FLOAT, -- How good did the agent think this choice was?
  actual_outcome_score FLOAT, -- Filled in later (RLHF or reflection)
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}'
);

-- Create indexes for decision analysis
CREATE INDEX idx_arbitrage_episodes_created_at ON arbitrage_episodes(created_at DESC);
CREATE INDEX idx_arbitrage_episodes_trigger ON arbitrage_episodes(trigger_memory_id);
CREATE INDEX idx_arbitrage_episodes_expected_reward ON arbitrage_episodes(expected_reward);
CREATE INDEX idx_arbitrage_episodes_actual_outcome ON arbitrage_episodes(actual_outcome_score);
CREATE INDEX idx_arbitrage_episodes_tags ON arbitrage_episodes USING GIN(tags);
CREATE INDEX idx_arbitrage_episodes_metadata ON arbitrage_episodes USING GIN(metadata);

-- Index for learning effectiveness queries (mistake detection)
CREATE INDEX idx_arbitrage_learning ON arbitrage_episodes(expected_reward, actual_outcome_score) 
  WHERE expected_reward IS NOT NULL AND actual_outcome_score IS NOT NULL;

-- ============================================================================
-- PART 3: TIMELINE VIEW - UNIFIED CONSCIOUSNESS EVENT STREAM
-- ============================================================================

-- Single chronological feed of Thoughts + Actions + Arbitrage
-- No more querying five tables to see what happened
CREATE OR REPLACE VIEW timeline_view AS
SELECT 
  created_at,
  'memory' AS event_type,
  content AS summary,
  importance_score AS weight,
  emotional_valence,
  type AS category,
  id AS original_id
FROM memory_entries

UNION ALL

SELECT 
  created_at,
  'arbitrage' AS event_type,
  'DECISION: ' || winning_option || 
    CASE 
      WHEN reasoning_trace IS NOT NULL THEN ' BECAUSE: ' || LEFT(reasoning_trace, 100) || '...'
      ELSE ''
    END AS summary,
  expected_reward AS weight,
  NULL AS emotional_valence,
  'decision' AS category,
  id AS original_id
FROM arbitrage_episodes

ORDER BY created_at DESC;

-- ============================================================================
-- PART 4: ANALYTICS QUERIES - THE "SELF-AWARENESS" DASHBOARD
-- ============================================================================

-- Helper function for drift detection
-- Shows how average emotional_valence has changed over time periods
CREATE OR REPLACE FUNCTION get_emotional_drift(
  days_back INTEGER DEFAULT 30,
  period_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  avg_valence FLOAT,
  memory_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH periods AS (
    SELECT 
      generate_series(
        NOW() - (days_back || ' days')::INTERVAL,
        NOW(),
        (period_days || ' days')::INTERVAL
      ) AS period_start
  )
  SELECT 
    p.period_start,
    p.period_start + (period_days || ' days')::INTERVAL AS period_end,
    AVG(m.emotional_valence) AS avg_valence,
    COUNT(*) AS memory_count
  FROM periods p
  LEFT JOIN memory_entries m ON 
    m.created_at >= p.period_start AND 
    m.created_at < p.period_start + (period_days || ' days')::INTERVAL
  WHERE m.emotional_valence IS NOT NULL
  GROUP BY p.period_start
  ORDER BY p.period_start;
END;
$$ LANGUAGE plpgsql;

-- Learning effectiveness analysis
-- Shows arbitrage_episodes where actual_outcome_score was low (mistake) 
-- but expected_reward was high (thought it was right)
-- This is where the model learns
CREATE OR REPLACE VIEW learning_opportunities AS
SELECT 
  id,
  created_at,
  winning_option,
  expected_reward,
  actual_outcome_score,
  (expected_reward - actual_outcome_score) AS prediction_error,
  reasoning_trace,
  metadata
FROM arbitrage_episodes
WHERE 
  expected_reward IS NOT NULL 
  AND actual_outcome_score IS NOT NULL
  AND actual_outcome_score < 0.5  -- Poor outcome
  AND expected_reward > 0.7       -- But expected success
ORDER BY (expected_reward - actual_outcome_score) DESC;

-- Pattern strength analysis
-- Identifies which types of decisions consistently succeed or fail
CREATE OR REPLACE VIEW decision_pattern_analysis AS
SELECT 
  winning_option,
  COUNT(*) AS decision_count,
  AVG(expected_reward) AS avg_expected_reward,
  AVG(actual_outcome_score) AS avg_actual_outcome,
  AVG(actual_outcome_score - expected_reward) AS avg_prediction_error,
  STDDEV(actual_outcome_score - expected_reward) AS prediction_variance
FROM arbitrage_episodes
WHERE expected_reward IS NOT NULL AND actual_outcome_score IS NOT NULL
GROUP BY winning_option
HAVING COUNT(*) >= 3
ORDER BY AVG(actual_outcome_score) DESC;

-- ============================================================================
-- PART 5: MIGRATION HELPER FUNCTIONS
-- ============================================================================

-- Function to migrate consciousness_states to memory_entries
-- This explodes the snapshot model into granular entries
CREATE OR REPLACE FUNCTION migrate_consciousness_states_to_memory_entries()
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
  state_record RECORD;
  thought_record JSONB;
  new_memory_id UUID;
BEGIN
  -- Iterate through all consciousness_states
  FOR state_record IN 
    SELECT 
      id,
      session_id,
      saved_at,
      thoughts,
      emotional_valence,
      cognitive_load,
      metadata
    FROM consciousness_states
    WHERE id NOT IN (
      SELECT DISTINCT legacy_state_id 
      FROM memory_entries 
      WHERE legacy_state_id IS NOT NULL
    )
  LOOP
    -- For each thought in the state, create a memory entry
    IF state_record.thoughts IS NOT NULL AND jsonb_array_length(state_record.thoughts) > 0 THEN
      FOR thought_record IN SELECT * FROM jsonb_array_elements(state_record.thoughts)
      LOOP
        INSERT INTO memory_entries (
          content,
          type,
          source,
          emotional_valence,
          importance_score,
          legacy_state_id,
          created_at,
          metadata
        ) VALUES (
          COALESCE(thought_record->>'content', thought_record->>'text', 'Migrated thought'),
          'episodic', -- Default type for migrated thoughts
          'internal_monologue',
          state_record.emotional_valence,
          COALESCE((thought_record->>'confidence')::FLOAT, 0.5),
          state_record.id,
          COALESCE((thought_record->>'timestamp')::TIMESTAMPTZ, state_record.saved_at),
          jsonb_build_object(
            'session_id', state_record.session_id,
            'cognitive_load', state_record.cognitive_load,
            'migrated_from', 'consciousness_states',
            'original_metadata', thought_record
          )
        );
        migrated_count := migrated_count + 1;
      END LOOP;
    ELSE
      -- If no thoughts array, create a single entry for the state
      INSERT INTO memory_entries (
        content,
        type,
        source,
        emotional_valence,
        importance_score,
        legacy_state_id,
        created_at,
        metadata
      ) VALUES (
        'Session snapshot: ' || state_record.session_id,
        'episodic',
        'system_event',
        state_record.emotional_valence,
        0.5,
        state_record.id,
        state_record.saved_at,
        jsonb_build_object(
          'session_id', state_record.session_id,
          'cognitive_load', state_record.cognitive_load,
          'migrated_from', 'consciousness_states'
        )
      );
      migrated_count := migrated_count + 1;
    END IF;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE memory_entries IS 'Immutable cognitive ledger - replaces flat consciousness_states history. Tracks inputs (sensory), outputs (actions), and internal writes with semantic searchability.';
COMMENT ON TABLE arbitrage_episodes IS 'Decision engine tracking. Records how choices are made between competing thoughts/actions. Critical for developmental tracking and learning from mistakes.';
COMMENT ON VIEW timeline_view IS 'Unified consciousness event stream. Single chronological feed combining memory entries and arbitrage decisions for easy temporal analysis.';
COMMENT ON VIEW learning_opportunities IS 'Identifies mistakes where expected reward was high but actual outcome was low. Key data for RLHF and autonomous improvement.';
COMMENT ON VIEW decision_pattern_analysis IS 'Analyzes which types of decisions consistently succeed or fail. Enables pattern-based strategy optimization.';
COMMENT ON FUNCTION get_emotional_drift IS 'Tracks emotional valence changes over time periods. Enables drift detection and mood pattern analysis.';
COMMENT ON FUNCTION migrate_consciousness_states_to_memory_entries IS 'Safe migration from old snapshot model to new transactional ledger. Preserves legacy_state_id for backward compatibility.';

-- ============================================================================
-- PART 7: INITIAL DATA MIGRATION (OPTIONAL - UNCOMMENT TO RUN)
-- ============================================================================

-- Uncomment to automatically migrate existing consciousness_states data:
-- SELECT migrate_consciousness_states_to_memory_entries() AS migrated_entries;

-- Migration completion summary
SELECT 
  'Cognitive Ledger migration (007) completed successfully' AS status,
  'Created memory_entries table (immutable ledger)' AS step_1,
  'Created arbitrage_episodes table (decision engine)' AS step_2,
  'Created timeline_view (unified event stream)' AS step_3,
  'Created analytics functions (drift detection, learning effectiveness)' AS step_4,
  'Migration function available: migrate_consciousness_states_to_memory_entries()' AS step_5;
