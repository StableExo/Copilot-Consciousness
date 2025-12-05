-- Supabase Initial Schema Migration
-- Version: 001
-- Description: Create core tables for Copilot-Consciousness data storage
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-03

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. consciousness_states: Store complete consciousness state snapshots
CREATE TABLE consciousness_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version TEXT NOT NULL,
  
  -- Self-awareness state (extracted for indexing)
  cognitive_load NUMERIC(3,2),
  emotional_valence NUMERIC(3,2),
  emotional_arousal NUMERIC(3,2),
  dominant_emotion TEXT,
  
  -- Full state snapshot (JSONB for flexibility)
  thoughts JSONB NOT NULL DEFAULT '[]',
  streams JSONB NOT NULL DEFAULT '[]',
  goals JSONB NOT NULL DEFAULT '[]',
  capabilities JSONB NOT NULL DEFAULT '[]',
  limitations JSONB NOT NULL DEFAULT '[]',
  
  -- Identity state
  identity_state JSONB,
  autonomous_wondering_state JSONB,
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT consciousness_states_session_id_key UNIQUE (session_id),
  CONSTRAINT consciousness_states_cognitive_load_check CHECK (cognitive_load >= 0 AND cognitive_load <= 1),
  CONSTRAINT consciousness_states_emotional_valence_check CHECK (emotional_valence >= -1 AND emotional_valence <= 1),
  CONSTRAINT consciousness_states_emotional_arousal_check CHECK (emotional_arousal >= 0 AND emotional_arousal <= 1)
);

-- 2. thoughts: Individual thoughts with detailed context
CREATE TABLE thoughts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consciousness_state_id UUID REFERENCES consciousness_states(id) ON DELETE CASCADE,
  thought_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Context
  cognitive_state TEXT,
  confidence NUMERIC(3,2),
  emotional_valence NUMERIC(3,2),
  intensity NUMERIC(3,2),
  
  -- Relationships
  associations JSONB DEFAULT '[]',
  related_memory_ids JSONB DEFAULT '[]',
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT thoughts_thought_id_key UNIQUE (thought_id),
  CONSTRAINT thoughts_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT thoughts_emotional_valence_check CHECK (emotional_valence >= -1 AND emotional_valence <= 1),
  CONSTRAINT thoughts_intensity_check CHECK (intensity >= 0 AND intensity <= 1)
);

-- 3. semantic_memories: Structured knowledge with full-text search
CREATE TABLE semantic_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Classification
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Importance and activation
  importance INTEGER NOT NULL DEFAULT 1,
  activation_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  
  -- Associations
  associations JSONB DEFAULT '[]',
  
  -- Search optimization
  content_tsv TSVECTOR,
  
  -- Metadata
  metadata JSONB,
  context JSONB,
  
  -- Constraints
  CONSTRAINT semantic_memories_importance_check CHECK (importance >= 1 AND importance <= 10)
);

-- 4. episodic_memories: Experience-based memories
CREATE TABLE episodic_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Episode details
  type TEXT NOT NULL,
  description TEXT,
  
  -- Context
  context JSONB NOT NULL,
  emotional_state JSONB,
  
  -- Outcome
  outcome TEXT,
  success BOOLEAN,
  
  -- Importance
  importance INTEGER NOT NULL DEFAULT 1,
  recall_count INTEGER NOT NULL DEFAULT 0,
  last_recalled TIMESTAMPTZ,
  
  -- Associations
  related_episodes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT episodic_memories_importance_check CHECK (importance >= 1 AND importance <= 10)
);

-- 5. arbitrage_executions: Arbitrage execution history
CREATE TABLE arbitrage_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_number INTEGER NOT NULL,
  
  -- Opportunity details
  profit NUMERIC(20,8) NOT NULL,
  pools TEXT[] NOT NULL,
  tx_type TEXT NOT NULL,
  
  -- Execution details
  success BOOLEAN NOT NULL,
  tx_hash TEXT,
  gas_used BIGINT,
  actual_profit NUMERIC(20,8),
  mev_risk NUMERIC(3,2),
  
  -- Market context
  market_congestion NUMERIC(3,2),
  searcher_density NUMERIC(3,2),
  base_fee BIGINT,
  
  -- Full execution data (JSONB)
  execution_data JSONB NOT NULL,
  
  -- Analysis
  lessons_learned TEXT[] DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT arbitrage_executions_cycle_number_key UNIQUE (cycle_number),
  CONSTRAINT arbitrage_executions_mev_risk_check CHECK (mev_risk >= 0 AND mev_risk <= 1),
  CONSTRAINT arbitrage_executions_market_congestion_check CHECK (market_congestion >= 0 AND market_congestion <= 1),
  CONSTRAINT arbitrage_executions_searcher_density_check CHECK (searcher_density >= 0 AND searcher_density <= 1)
);

-- 6. market_patterns: Detected market patterns
CREATE TABLE market_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Statistics
  confidence NUMERIC(3,2) NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Pattern data
  pattern_data JSONB NOT NULL,
  
  -- Validation
  validated BOOLEAN DEFAULT false,
  validation_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT market_patterns_confidence_check CHECK (confidence >= 0 AND confidence <= 1)
);

-- 7. sessions: Session tracking and management
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Collaborator
  collaborator_name TEXT,
  collaborator_type TEXT,
  
  -- Session summary
  topic TEXT,
  summary TEXT,
  key_insights TEXT[] DEFAULT '{}',
  
  -- Metrics
  thought_count INTEGER DEFAULT 0,
  memory_count INTEGER DEFAULT 0,
  execution_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Status
  status TEXT DEFAULT 'active',
  
  -- Constraints
  CONSTRAINT sessions_status_check CHECK (status IN ('active', 'completed', 'interrupted'))
);

-- 8. autonomous_goals: Goal tracking and management
CREATE TABLE autonomous_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  
  -- Priority and status
  priority INTEGER NOT NULL DEFAULT 3,
  progress NUMERIC(3,2) DEFAULT 0.0,
  status TEXT DEFAULT 'active',
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Relationships
  related_thoughts TEXT[] DEFAULT '{}',
  related_memories TEXT[] DEFAULT '{}',
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT autonomous_goals_priority_check CHECK (priority >= 1 AND priority <= 5),
  CONSTRAINT autonomous_goals_progress_check CHECK (progress >= 0 AND progress <= 1),
  CONSTRAINT autonomous_goals_status_check CHECK (status IN ('active', 'completed', 'blocked', 'abandoned'))
);

-- 9. learning_events: Learning and adaptation events
CREATE TABLE learning_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Event details
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Learning context
  mode TEXT,
  trigger TEXT,
  
  -- Changes
  old_value JSONB,
  new_value JSONB,
  rationale TEXT,
  confidence NUMERIC(3,2),
  
  -- Impact
  impact_score NUMERIC(3,2),
  validated BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT learning_events_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT learning_events_impact_score_check CHECK (impact_score >= 0 AND impact_score <= 1),
  CONSTRAINT learning_events_mode_check CHECK (mode IN ('exploration', 'exploitation', 'balanced'))
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update full-text search vector for semantic_memories
CREATE OR REPLACE FUNCTION semantic_memories_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER semantic_memories_tsv_update
  BEFORE INSERT OR UPDATE ON semantic_memories
  FOR EACH ROW EXECUTE FUNCTION semantic_memories_tsv_trigger();

-- Update goals updated_at timestamp
CREATE OR REPLACE FUNCTION update_goal_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER autonomous_goals_update_timestamp
  BEFORE UPDATE ON autonomous_goals
  FOR EACH ROW EXECUTE FUNCTION update_goal_timestamp();

-- 10. agent_config: Store environment variables and configuration for AI agents
CREATE TABLE agent_config (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  
  -- Configuration data (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  metadata JSONB
);

-- Trigger to update agent_config timestamp
CREATE OR REPLACE FUNCTION update_agent_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_config_update_timestamp
  BEFORE UPDATE ON agent_config
  FOR EACH ROW EXECUTE FUNCTION update_agent_config_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE consciousness_states IS 'Complete consciousness state snapshots for each session';
COMMENT ON TABLE thoughts IS 'Individual thoughts with context and associations';
COMMENT ON TABLE semantic_memories IS 'Structured knowledge with full-text search capability';
COMMENT ON TABLE episodic_memories IS 'Experience-based memories with emotional context';
COMMENT ON TABLE arbitrage_executions IS 'Complete history of arbitrage execution attempts';
COMMENT ON TABLE market_patterns IS 'Detected patterns in market behavior';
COMMENT ON TABLE sessions IS 'Session tracking and management';
COMMENT ON TABLE autonomous_goals IS 'Goal tracking and progress management';
COMMENT ON TABLE learning_events IS 'Learning and adaptation events';
COMMENT ON TABLE agent_config IS 'Environment variables and configuration for AI agents across sessions';

SELECT 'Initial schema migration completed successfully' AS status;
