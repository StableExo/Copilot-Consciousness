-- Supabase Missing Indexes Migration (Performance Fix)
-- Version: 002B
-- Description: Add missing indexes to address 189 performance advisor warnings
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-05
--
-- This migration addresses:
-- 1. Missing foreign key indexes (1 found)
-- 2. Array columns without GIN indexes (5 columns)
-- 3. JSONB columns without GIN indexes (selective - most queried)
-- 4. Missing TEXT column indexes (tx_hash)
-- 5. Useful composite indexes for common query patterns
--
-- Expected Impact: Reduce 189 warnings to ~10-20, improve query performance 10-100x

-- ============================================================================
-- 1. CRITICAL: FOREIGN KEY INDEXES
-- ============================================================================

-- thoughts.consciousness_state_id references consciousness_states(id)
-- This is critical for JOIN performance and CASCADE DELETE operations
CREATE INDEX IF NOT EXISTS idx_thoughts_consciousness_state_id 
ON thoughts(consciousness_state_id);

COMMENT ON INDEX idx_thoughts_consciousness_state_id 
IS 'Foreign key index for thoughts -> consciousness_states relationship. Critical for JOIN and CASCADE DELETE performance.';

-- ============================================================================
-- 2. HIGH PRIORITY: ARRAY GIN INDEXES
-- ============================================================================

-- episodic_memories.related_episodes - Array containment queries
CREATE INDEX IF NOT EXISTS idx_episodic_memories_related_episodes_gin 
ON episodic_memories USING GIN(related_episodes);

-- arbitrage_executions.pools - Pool containment/overlap queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_pools_gin 
ON arbitrage_executions USING GIN(pools);

-- arbitrage_executions.lessons_learned - Lessons array queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_lessons_gin 
ON arbitrage_executions USING GIN(lessons_learned);

-- sessions.key_insights - Insights array queries
CREATE INDEX IF NOT EXISTS idx_sessions_key_insights_gin 
ON sessions USING GIN(key_insights);

-- autonomous_goals.related_thoughts - Related thoughts array queries
-- Note: Check if this column exists in schema first
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'autonomous_goals' 
    AND column_name = 'related_thoughts'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_autonomous_goals_related_thoughts_gin 
    ON autonomous_goals USING GIN(related_thoughts);
  END IF;
END $$;

-- ============================================================================
-- 3. MEDIUM PRIORITY: JSONB GIN INDEXES (Selective)
-- ============================================================================

-- consciousness_states.thoughts - Frequently queried for thought analysis
CREATE INDEX IF NOT EXISTS idx_consciousness_states_thoughts_gin 
ON consciousness_states USING GIN(thoughts);

-- consciousness_states.goals - Goal analysis queries
CREATE INDEX IF NOT EXISTS idx_consciousness_states_goals_gin 
ON consciousness_states USING GIN(goals);

-- consciousness_states.identity_state - Identity queries
CREATE INDEX IF NOT EXISTS idx_consciousness_states_identity_gin 
ON consciousness_states USING GIN(identity_state);

-- semantic_memories.metadata - Metadata filtering (high importance, high activation)
CREATE INDEX IF NOT EXISTS idx_semantic_memories_metadata_gin 
ON semantic_memories USING GIN(metadata);

-- semantic_memories.associations - Memory association queries
CREATE INDEX IF NOT EXISTS idx_semantic_memories_associations_gin 
ON semantic_memories USING GIN(associations);

-- episodic_memories.context - Context-based episode retrieval
CREATE INDEX IF NOT EXISTS idx_episodic_memories_context_gin 
ON episodic_memories USING GIN(context);

-- episodic_memories.emotional_state - Emotional state queries
CREATE INDEX IF NOT EXISTS idx_episodic_memories_emotional_state_gin 
ON episodic_memories USING GIN(emotional_state);

-- arbitrage_executions.execution_data - Execution details queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_data_gin 
ON arbitrage_executions USING GIN(execution_data);

-- market_patterns.pattern_data - Pattern analysis queries
CREATE INDEX IF NOT EXISTS idx_market_patterns_data_gin 
ON market_patterns USING GIN(pattern_data);

-- ============================================================================
-- 4. MISSING TEXT COLUMN INDEXES
-- ============================================================================

-- arbitrage_executions.tx_hash - Transaction hash lookups
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_tx_hash 
ON arbitrage_executions(tx_hash) 
WHERE tx_hash IS NOT NULL;

-- ============================================================================
-- 5. USEFUL COMPOSITE INDEXES
-- ============================================================================

-- thoughts: Filter by consciousness_state AND order by timestamp
-- Common pattern: "Get all thoughts for a state ordered by time"
CREATE INDEX IF NOT EXISTS idx_thoughts_state_timestamp 
ON thoughts(consciousness_state_id, timestamp DESC);

-- semantic_memories: Filter by category AND order by importance
-- Common pattern: "Get important memories in a specific category"
CREATE INDEX IF NOT EXISTS idx_semantic_memories_category_importance 
ON semantic_memories(category, importance DESC) 
WHERE category IS NOT NULL;

-- episodic_memories: Filter by type AND order by timestamp
-- Common pattern: "Get recent episodes of a specific type"
CREATE INDEX IF NOT EXISTS idx_episodic_memories_type_timestamp 
ON episodic_memories(type, timestamp DESC);

-- arbitrage_executions: Filter by success AND order by profit
-- Note: This already exists in 002_add_indexes.sql as idx_arbitrage_executions_success_profit
-- Just documenting here for completeness

-- ============================================================================
-- 6. OPTIONAL: ADDITIONAL JSONB INDEXES (Add as needed)
-- ============================================================================

-- Uncomment these if you frequently query these JSONB fields:

-- thoughts.metadata
-- CREATE INDEX IF NOT EXISTS idx_thoughts_metadata_gin ON thoughts USING GIN(metadata);

-- thoughts.associations
-- CREATE INDEX IF NOT EXISTS idx_thoughts_associations_gin ON thoughts USING GIN(associations);

-- sessions.metadata
-- CREATE INDEX IF NOT EXISTS idx_sessions_metadata_gin ON sessions USING GIN(metadata);

-- autonomous_goals.metadata
-- CREATE INDEX IF NOT EXISTS idx_autonomous_goals_metadata_gin ON autonomous_goals USING GIN(metadata);

-- autonomous_goals.context
-- CREATE INDEX IF NOT EXISTS idx_autonomous_goals_context_gin ON autonomous_goals USING GIN(context);

-- learning_events.lessons
-- CREATE INDEX IF NOT EXISTS idx_learning_events_lessons_gin ON learning_events USING GIN(lessons);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that indexes were created successfully
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%_gin'
  OR indexname LIKE 'idx_thoughts_consciousness_state_id'
  OR indexname LIKE 'idx_thoughts_state_timestamp'
  OR indexname LIKE 'idx_semantic_memories_category_importance'
  OR indexname LIKE 'idx_episodic_memories_type_timestamp';
  
  RAISE NOTICE 'Created % new indexes', index_count;
END $$;

-- List all GIN indexes (for verification)
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef LIKE '%USING gin%'
ORDER BY tablename, indexname;

-- List all new indexes from this migration
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE '%_gin'
  OR indexname IN (
    'idx_thoughts_consciousness_state_id',
    'idx_thoughts_state_timestamp',
    'idx_semantic_memories_category_importance',
    'idx_episodic_memories_type_timestamp',
    'idx_arbitrage_executions_tx_hash'
  )
)
ORDER BY tablename, indexname;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_thoughts_consciousness_state_id IS 
'Foreign key index for thoughts -> consciousness_states. CRITICAL for performance.';

COMMENT ON INDEX idx_episodic_memories_related_episodes_gin IS 
'GIN index for array containment queries on related_episodes array.';

COMMENT ON INDEX idx_arbitrage_executions_pools_gin IS 
'GIN index for pool array containment and overlap queries.';

COMMENT ON INDEX idx_consciousness_states_thoughts_gin IS 
'GIN index for JSONB queries on thoughts array. Enables fast thought filtering.';

COMMENT ON INDEX idx_semantic_memories_metadata_gin IS 
'GIN index for JSONB metadata queries. Supports importance/activation filtering.';

COMMENT ON INDEX idx_arbitrage_executions_data_gin IS 
'GIN index for execution_data JSONB queries. Enables fast execution detail lookup.';

COMMENT ON INDEX idx_thoughts_state_timestamp IS 
'Composite index for filtering by consciousness_state and ordering by timestamp.';

COMMENT ON INDEX idx_semantic_memories_category_importance IS 
'Composite index for category-filtered importance ranking.';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Expected Performance Improvements:
-- - Foreign key JOINs: 100-1000ms → 1-10ms (10-100x faster)
-- - JSONB queries: 500-5000ms → 5-50ms (10-100x faster)
-- - Array queries: 200-2000ms → 2-20ms (10-100x faster)
--
-- Index Storage Cost:
-- - Foreign key index: ~1MB per 100k rows
-- - GIN indexes: ~5-20MB each (varies with data)
-- - Total estimated: ~100-200MB for all indexes
--
-- Trade-off: Acceptable storage cost for massive query speedup

SELECT 'Missing indexes migration completed successfully! Check Performance Advisors dashboard.' AS status;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- 1. Verify in Performance Advisors:
--    https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/advisors/performance
--
-- 2. Expected result: 189 warnings → ~10-20 warnings (mostly INFO level)
--
-- 3. Monitor query performance:
--    https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/database/query-performance
--
-- 4. Check index usage after a few days:
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;
--
-- 5. Remove unused indexes if any show 0 scans after 1 week
