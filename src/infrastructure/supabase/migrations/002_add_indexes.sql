-- Supabase Indexes Migration
-- Version: 002
-- Description: Add indexes for optimal query performance
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-03

-- ============================================================================
-- CONSCIOUSNESS_STATES INDEXES
-- ============================================================================

CREATE INDEX idx_consciousness_states_saved_at ON consciousness_states(saved_at DESC);
CREATE INDEX idx_consciousness_states_session_id ON consciousness_states(session_id);
CREATE INDEX idx_consciousness_states_emotion ON consciousness_states(dominant_emotion) WHERE dominant_emotion IS NOT NULL;
CREATE INDEX idx_consciousness_states_cognitive_load ON consciousness_states(cognitive_load) WHERE cognitive_load IS NOT NULL;

-- ============================================================================
-- THOUGHTS INDEXES
-- ============================================================================

CREATE INDEX idx_thoughts_consciousness_state ON thoughts(consciousness_state_id);
CREATE INDEX idx_thoughts_type ON thoughts(type);
CREATE INDEX idx_thoughts_timestamp ON thoughts(timestamp DESC);
CREATE INDEX idx_thoughts_intensity ON thoughts(intensity DESC) WHERE intensity IS NOT NULL;
CREATE INDEX idx_thoughts_confidence ON thoughts(confidence DESC) WHERE confidence IS NOT NULL;

-- ============================================================================
-- SEMANTIC_MEMORIES INDEXES
-- ============================================================================

-- Full-text search index
CREATE INDEX idx_semantic_memories_content_tsv ON semantic_memories USING GIN(content_tsv);

-- Regular indexes
CREATE INDEX idx_semantic_memories_timestamp ON semantic_memories(timestamp DESC);
CREATE INDEX idx_semantic_memories_category ON semantic_memories(category) WHERE category IS NOT NULL;
CREATE INDEX idx_semantic_memories_tags ON semantic_memories USING GIN(tags);
CREATE INDEX idx_semantic_memories_importance ON semantic_memories(importance DESC);
CREATE INDEX idx_semantic_memories_activation_count ON semantic_memories(activation_count DESC);
CREATE INDEX idx_semantic_memories_last_accessed ON semantic_memories(last_accessed DESC) WHERE last_accessed IS NOT NULL;

-- ============================================================================
-- EPISODIC_MEMORIES INDEXES
-- ============================================================================

CREATE INDEX idx_episodic_memories_timestamp ON episodic_memories(timestamp DESC);
CREATE INDEX idx_episodic_memories_type ON episodic_memories(type);
CREATE INDEX idx_episodic_memories_importance ON episodic_memories(importance DESC);
CREATE INDEX idx_episodic_memories_tags ON episodic_memories USING GIN(tags);
CREATE INDEX idx_episodic_memories_success ON episodic_memories(success) WHERE success IS NOT NULL;
CREATE INDEX idx_episodic_memories_recall_count ON episodic_memories(recall_count DESC);

-- ============================================================================
-- ARBITRAGE_EXECUTIONS INDEXES
-- ============================================================================

CREATE INDEX idx_arbitrage_executions_timestamp ON arbitrage_executions(timestamp DESC);
CREATE INDEX idx_arbitrage_executions_success ON arbitrage_executions(success);
CREATE INDEX idx_arbitrage_executions_profit ON arbitrage_executions(profit DESC);
CREATE INDEX idx_arbitrage_executions_actual_profit ON arbitrage_executions(actual_profit DESC) WHERE actual_profit IS NOT NULL;
CREATE INDEX idx_arbitrage_executions_cycle_number ON arbitrage_executions(cycle_number DESC);
CREATE INDEX idx_arbitrage_executions_mev_risk ON arbitrage_executions(mev_risk) WHERE mev_risk IS NOT NULL;

-- Composite index for success + profit queries
CREATE INDEX idx_arbitrage_executions_success_profit ON arbitrage_executions(success, profit DESC);

-- ============================================================================
-- MARKET_PATTERNS INDEXES
-- ============================================================================

CREATE INDEX idx_market_patterns_type ON market_patterns(type);
CREATE INDEX idx_market_patterns_confidence ON market_patterns(confidence DESC);
CREATE INDEX idx_market_patterns_last_seen ON market_patterns(last_seen DESC);
CREATE INDEX idx_market_patterns_validated ON market_patterns(validated);
CREATE INDEX idx_market_patterns_occurrences ON market_patterns(occurrences DESC);

-- ============================================================================
-- SESSIONS INDEXES
-- ============================================================================

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_ended_at ON sessions(ended_at DESC) WHERE ended_at IS NOT NULL;
CREATE INDEX idx_sessions_collaborator ON sessions(collaborator_name) WHERE collaborator_name IS NOT NULL;
CREATE INDEX idx_sessions_status ON sessions(status);

-- ============================================================================
-- AUTONOMOUS_GOALS INDEXES
-- ============================================================================

CREATE INDEX idx_autonomous_goals_status ON autonomous_goals(status);
CREATE INDEX idx_autonomous_goals_priority ON autonomous_goals(priority DESC);
CREATE INDEX idx_autonomous_goals_progress ON autonomous_goals(progress);
CREATE INDEX idx_autonomous_goals_created_at ON autonomous_goals(created_at DESC);
CREATE INDEX idx_autonomous_goals_updated_at ON autonomous_goals(updated_at DESC);

-- Composite index for active goals by priority
CREATE INDEX idx_autonomous_goals_active_priority ON autonomous_goals(status, priority DESC) WHERE status = 'active';

-- ============================================================================
-- LEARNING_EVENTS INDEXES
-- ============================================================================

CREATE INDEX idx_learning_events_timestamp ON learning_events(timestamp DESC);
CREATE INDEX idx_learning_events_type ON learning_events(event_type);
CREATE INDEX idx_learning_events_mode ON learning_events(mode) WHERE mode IS NOT NULL;
CREATE INDEX idx_learning_events_validated ON learning_events(validated);
CREATE INDEX idx_learning_events_impact_score ON learning_events(impact_score DESC) WHERE impact_score IS NOT NULL;

SELECT 'Indexes migration completed successfully' AS status;
