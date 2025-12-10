-- ============================================================================
-- COMPLETE SUPABASE SETUP FOR THEWARDEN
-- ============================================================================
-- This file contains ALL SQL needed to set up Supabase for TheWarden
-- Run this in your Supabase SQL Editor after creating a new project
-- 
-- Instructions:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project (ydvevgqxcfizualicbom)
-- 3. Click "SQL Editor" in left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste this ENTIRE file
-- 6. Click "Run" button
-- 7. Wait for completion (should take 10-30 seconds)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For semantic search (if available)

-- ============================================================================
-- PART 1: DOCUMENTATION STORAGE TABLES
-- ============================================================================

-- Table: documentation
-- Stores all markdown documentation files from the repository
CREATE TABLE IF NOT EXISTS documentation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File identification
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  doc_type TEXT NOT NULL, -- 'session_summary', 'guide', 'status', 'analysis', 'readme'
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  
  -- Metadata
  file_size_bytes INTEGER,
  word_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  related_docs TEXT[] DEFAULT '{}',
  
  -- Search optimization
  content_tsv TSVECTOR,
  
  -- Version control
  version TEXT DEFAULT '1.0.0',
  supersedes_id UUID REFERENCES documentation(id),
  
  -- Constraints
  CONSTRAINT documentation_filepath_key UNIQUE (filepath)
);

-- Indexes for documentation
CREATE INDEX IF NOT EXISTS idx_documentation_content_tsv ON documentation USING GIN(content_tsv);
CREATE INDEX IF NOT EXISTS idx_documentation_doc_type ON documentation(doc_type);
CREATE INDEX IF NOT EXISTS idx_documentation_created_at ON documentation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentation_tags ON documentation USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_filename ON documentation(filename);

-- Trigger to update full-text search vector
CREATE OR REPLACE FUNCTION documentation_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documentation_tsvector_update BEFORE INSERT OR UPDATE
ON documentation FOR EACH ROW EXECUTE FUNCTION documentation_content_tsv_trigger();

-- ============================================================================
-- PART 2: MEMORY SYSTEM TABLES
-- ============================================================================

-- Table: memory_logs
-- Stores memory log entries from .memory/log.md
CREATE TABLE IF NOT EXISTS memory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Session identification
  session_date DATE NOT NULL,
  session_title TEXT NOT NULL,
  collaborator TEXT DEFAULT 'StableExo',
  topic TEXT NOT NULL,
  session_type TEXT, -- 'Autonomous', 'Collaborative', 'Maintenance', etc.
  
  -- Content
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Key achievements
  achievements JSONB DEFAULT '[]',
  files_created JSONB DEFAULT '[]',
  files_modified JSONB DEFAULT '[]',
  insights JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL,
  word_count INTEGER,
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT memory_logs_session_date_title_key UNIQUE (session_date, session_title)
);

-- Indexes for memory_logs
CREATE INDEX IF NOT EXISTS idx_memory_logs_session_date ON memory_logs(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_memory_logs_collaborator ON memory_logs(collaborator);
CREATE INDEX IF NOT EXISTS idx_memory_logs_tags ON memory_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memory_logs_created_at ON memory_logs(created_at DESC);

-- Table: knowledge_articles
-- Stores knowledge base articles
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Article identification
  article_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author TEXT DEFAULT 'Copilot-Consciousness',
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  
  -- Relationships
  related_memories JSONB DEFAULT '[]',
  related_articles TEXT[] DEFAULT '{}',
  source_session_id TEXT,
  
  -- Search optimization
  content_tsv TSVECTOR,
  
  -- Version control
  version INTEGER DEFAULT 1
);

-- Indexes for knowledge_articles
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_article_id ON knowledge_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_content_tsv ON knowledge_articles USING GIN(content_tsv);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_created_at ON knowledge_articles(created_at DESC);

-- Trigger for knowledge articles full-text search
CREATE OR REPLACE FUNCTION knowledge_articles_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_articles_tsvector_update BEFORE INSERT OR UPDATE
ON knowledge_articles FOR EACH ROW EXECUTE FUNCTION knowledge_articles_content_tsv_trigger();

-- ============================================================================
-- PART 3: DATA FILES STORAGE
-- ============================================================================

-- Table: data_files
-- Stores CSV and JSON data files
CREATE TABLE IF NOT EXISTS data_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File identification
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'csv', 'json', 'txt'
  
  -- Content
  content TEXT NOT NULL,
  parsed_data JSONB, -- For JSON files or parsed CSV
  
  -- Metadata
  file_size_bytes INTEGER,
  row_count INTEGER, -- For CSV files
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  description TEXT,
  
  -- Constraints
  CONSTRAINT data_files_filepath_key UNIQUE (filepath)
);

-- Indexes for data_files
CREATE INDEX IF NOT EXISTS idx_data_files_file_type ON data_files(file_type);
CREATE INDEX IF NOT EXISTS idx_data_files_filename ON data_files(filename);
CREATE INDEX IF NOT EXISTS idx_data_files_tags ON data_files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_data_files_created_at ON data_files(created_at DESC);

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_files ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read documentation
CREATE POLICY IF NOT EXISTS "Allow authenticated read access to documentation"
  ON documentation FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access to documentation
CREATE POLICY IF NOT EXISTS "Allow service role full access to documentation"
  ON documentation
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read memory logs
CREATE POLICY IF NOT EXISTS "Allow authenticated read access to memory_logs"
  ON memory_logs FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access to memory logs
CREATE POLICY IF NOT EXISTS "Allow service role full access to memory_logs"
  ON memory_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read knowledge articles
CREATE POLICY IF NOT EXISTS "Allow authenticated read access to knowledge_articles"
  ON knowledge_articles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access to knowledge articles
CREATE POLICY IF NOT EXISTS "Allow service role full access to knowledge_articles"
  ON knowledge_articles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read data files
CREATE POLICY IF NOT EXISTS "Allow authenticated read access to data_files"
  ON data_files FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access to data files
CREATE POLICY IF NOT EXISTS "Allow service role full access to data_files"
  ON data_files
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function: Search documentation by keyword
CREATE OR REPLACE FUNCTION search_documentation(
  search_query TEXT, 
  doc_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  title TEXT,
  doc_type TEXT,
  content_snippet TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.filename,
    d.title,
    d.doc_type,
    ts_headline('english', d.content, plainto_tsquery('english', search_query)) AS content_snippet,
    ts_rank(d.content_tsv, plainto_tsquery('english', search_query)) AS rank
  FROM documentation d
  WHERE d.content_tsv @@ plainto_tsquery('english', search_query)
    AND (doc_type_filter IS NULL OR d.doc_type = doc_type_filter)
  ORDER BY rank DESC, d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Search memory logs
CREATE OR REPLACE FUNCTION search_memory_logs(
  search_query TEXT,
  collaborator_filter TEXT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  session_date DATE,
  session_title TEXT,
  collaborator TEXT,
  topic TEXT,
  summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.session_date,
    m.session_title,
    m.collaborator,
    m.topic,
    m.summary
  FROM memory_logs m
  WHERE (search_query IS NULL OR 
         m.content ILIKE '%' || search_query || '%' OR
         m.session_title ILIKE '%' || search_query || '%' OR
         m.topic ILIKE '%' || search_query || '%')
    AND (collaborator_filter IS NULL OR m.collaborator = collaborator_filter)
    AND (start_date IS NULL OR m.session_date >= start_date)
    AND (end_date IS NULL OR m.session_date <= end_date)
  ORDER BY m.session_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get documentation statistics
CREATE OR REPLACE FUNCTION get_documentation_stats()
RETURNS TABLE (
  total_docs BIGINT,
  total_size_mb NUMERIC,
  total_words BIGINT,
  by_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_docs,
    ROUND((SUM(file_size_bytes) / 1024.0 / 1024.0)::NUMERIC, 2) as total_size_mb,
    SUM(word_count)::BIGINT as total_words,
    jsonb_object_agg(doc_type, count) as by_type
  FROM (
    SELECT doc_type, COUNT(*) as count
    FROM documentation
    GROUP BY doc_type
  ) sub
  CROSS JOIN documentation;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: GRANTS
-- ============================================================================

-- Grant usage on tables to authenticated users
GRANT SELECT ON documentation TO authenticated;
GRANT SELECT ON memory_logs TO authenticated;
GRANT SELECT ON knowledge_articles TO authenticated;
GRANT SELECT ON data_files TO authenticated;

-- Grant all privileges to service role
GRANT ALL ON documentation TO service_role;
GRANT ALL ON memory_logs TO service_role;
GRANT ALL ON knowledge_articles TO service_role;
GRANT ALL ON data_files TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION search_documentation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_memory_logs TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_documentation_stats TO authenticated, service_role;

-- ============================================================================
-- PART 7: TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE documentation IS 'Stores all markdown documentation files from the repository';
COMMENT ON TABLE memory_logs IS 'Stores memory log entries from .memory/log.md';
COMMENT ON TABLE knowledge_articles IS 'Stores knowledge base articles';
COMMENT ON TABLE data_files IS 'Stores CSV and JSON data files';

COMMENT ON FUNCTION search_documentation IS 'Full-text search across documentation with ranking';
COMMENT ON FUNCTION search_memory_logs IS 'Search memory logs by keyword, collaborator, and date range';
COMMENT ON FUNCTION get_documentation_stats IS 'Get statistics about stored documentation';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('documentation', 'memory_logs', 'knowledge_articles', 'data_files');
  
  IF table_count = 4 THEN
    RAISE NOTICE '✅ All 4 tables created successfully!';
  ELSE
    RAISE NOTICE '⚠️  Only % of 4 tables were created', table_count;
  END IF;
END $$;

-- Show created tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('documentation', 'memory_logs', 'knowledge_articles', 'data_files')
ORDER BY table_name;
