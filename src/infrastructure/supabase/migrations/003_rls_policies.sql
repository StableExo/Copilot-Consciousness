-- Supabase Row Level Security (RLS) Migration
-- Version: 003
-- Description: Configure Row Level Security policies
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-03
-- Updated: 2025-12-05 - Made idempotent with DROP POLICY IF EXISTS
--
-- Note: This migration is idempotent and can be run multiple times safely.
-- All policies are dropped before creation to prevent "already exists" errors.

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE consciousness_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbitrage_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- READ POLICIES (SELECT)
-- ============================================================================

-- Allow authenticated users to read all data
DROP POLICY IF EXISTS "Allow authenticated read access" ON consciousness_states;
CREATE POLICY "Allow authenticated read access" ON consciousness_states 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON thoughts;
CREATE POLICY "Allow authenticated read access" ON thoughts 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON semantic_memories;
CREATE POLICY "Allow authenticated read access" ON semantic_memories 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON episodic_memories;
CREATE POLICY "Allow authenticated read access" ON episodic_memories 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON arbitrage_executions;
CREATE POLICY "Allow authenticated read access" ON arbitrage_executions 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON market_patterns;
CREATE POLICY "Allow authenticated read access" ON market_patterns 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON sessions;
CREATE POLICY "Allow authenticated read access" ON sessions 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON autonomous_goals;
CREATE POLICY "Allow authenticated read access" ON autonomous_goals 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read access" ON learning_events;
CREATE POLICY "Allow authenticated read access" ON learning_events 
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- WRITE POLICIES (INSERT/UPDATE/DELETE)
-- ============================================================================

-- Allow authenticated users to insert data
DROP POLICY IF EXISTS "Allow authenticated insert access" ON consciousness_states;
CREATE POLICY "Allow authenticated insert access" ON consciousness_states 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON thoughts;
CREATE POLICY "Allow authenticated insert access" ON thoughts 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON semantic_memories;
CREATE POLICY "Allow authenticated insert access" ON semantic_memories 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON episodic_memories;
CREATE POLICY "Allow authenticated insert access" ON episodic_memories 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON arbitrage_executions;
CREATE POLICY "Allow authenticated insert access" ON arbitrage_executions 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON market_patterns;
CREATE POLICY "Allow authenticated insert access" ON market_patterns 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON sessions;
CREATE POLICY "Allow authenticated insert access" ON sessions 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON autonomous_goals;
CREATE POLICY "Allow authenticated insert access" ON autonomous_goals 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert access" ON learning_events;
CREATE POLICY "Allow authenticated insert access" ON learning_events 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update data
DROP POLICY IF EXISTS "Allow authenticated update access" ON consciousness_states;
CREATE POLICY "Allow authenticated update access" ON consciousness_states 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON thoughts;
CREATE POLICY "Allow authenticated update access" ON thoughts 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON semantic_memories;
CREATE POLICY "Allow authenticated update access" ON semantic_memories 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON episodic_memories;
CREATE POLICY "Allow authenticated update access" ON episodic_memories 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON arbitrage_executions;
CREATE POLICY "Allow authenticated update access" ON arbitrage_executions 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON market_patterns;
CREATE POLICY "Allow authenticated update access" ON market_patterns 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON sessions;
CREATE POLICY "Allow authenticated update access" ON sessions 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON autonomous_goals;
CREATE POLICY "Allow authenticated update access" ON autonomous_goals 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update access" ON learning_events;
CREATE POLICY "Allow authenticated update access" ON learning_events 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete data (with caution)
DROP POLICY IF EXISTS "Allow authenticated delete access" ON consciousness_states;
CREATE POLICY "Allow authenticated delete access" ON consciousness_states 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON thoughts;
CREATE POLICY "Allow authenticated delete access" ON thoughts 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON semantic_memories;
CREATE POLICY "Allow authenticated delete access" ON semantic_memories 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON episodic_memories;
CREATE POLICY "Allow authenticated delete access" ON episodic_memories 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON arbitrage_executions;
CREATE POLICY "Allow authenticated delete access" ON arbitrage_executions 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON market_patterns;
CREATE POLICY "Allow authenticated delete access" ON market_patterns 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON sessions;
CREATE POLICY "Allow authenticated delete access" ON sessions 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON autonomous_goals;
CREATE POLICY "Allow authenticated delete access" ON autonomous_goals 
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete access" ON learning_events;
CREATE POLICY "Allow authenticated delete access" ON learning_events 
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- SERVICE ROLE FULL ACCESS
-- ============================================================================

-- Service role has full access (bypasses RLS)
-- This is used for backend operations that need unrestricted access
-- The service role key should be kept secret and only used server-side

DROP POLICY IF EXISTS "Service role full access" ON consciousness_states;
CREATE POLICY "Service role full access" ON consciousness_states 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON thoughts;
CREATE POLICY "Service role full access" ON thoughts 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON semantic_memories;
CREATE POLICY "Service role full access" ON semantic_memories 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON episodic_memories;
CREATE POLICY "Service role full access" ON episodic_memories 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON arbitrage_executions;
CREATE POLICY "Service role full access" ON arbitrage_executions 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON market_patterns;
CREATE POLICY "Service role full access" ON market_patterns 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON sessions;
CREATE POLICY "Service role full access" ON sessions 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON autonomous_goals;
CREATE POLICY "Service role full access" ON autonomous_goals 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON learning_events;
CREATE POLICY "Service role full access" ON learning_events 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Allow authenticated read access" ON consciousness_states 
  IS 'Authenticated users can read all consciousness states';

COMMENT ON POLICY "Allow authenticated insert access" ON consciousness_states 
  IS 'Authenticated users can insert new consciousness states';

COMMENT ON POLICY "Service role full access" ON consciousness_states 
  IS 'Service role has unrestricted access for backend operations';

SELECT 'Row Level Security policies configured successfully' AS status;
