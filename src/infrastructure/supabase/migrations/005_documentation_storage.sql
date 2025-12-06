-- Documentation Storage Migration
-- Version: 005
-- Description: Create tables for storing repository documentation and session summaries
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-06

-- ============================================================================
-- DOCUMENTATION TABLES
-- ============================================================================

-- 1. documentation: Store all markdown documentation files
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

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_documentation_content_tsv ON documentation USING GIN(content_tsv);
CREATE INDEX IF NOT EXISTS idx_documentation_doc_type ON documentation(doc_type);
CREATE INDEX IF NOT EXISTS idx_documentation_created_at ON documentation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentation_tags ON documentation USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_filename ON documentation(filename);

-- Trigger to update content_tsv automatically
CREATE OR REPLACE FUNCTION documentation_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON documentation FOR EACH ROW EXECUTE FUNCTION documentation_content_tsv_trigger();

-- 2. memory_logs: Store memory log entries (from .memory/log.md)
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

CREATE INDEX IF NOT EXISTS idx_memory_logs_session_date ON memory_logs(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_memory_logs_collaborator ON memory_logs(collaborator);
CREATE INDEX IF NOT EXISTS idx_memory_logs_tags ON memory_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memory_logs_created_at ON memory_logs(created_at DESC);

-- 3. knowledge_articles: Store knowledge base articles
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

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_article_id ON knowledge_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_content_tsv ON knowledge_articles USING GIN(content_tsv);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_created_at ON knowledge_articles(created_at DESC);

-- Trigger to update content_tsv automatically
CREATE OR REPLACE FUNCTION knowledge_articles_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON knowledge_articles FOR EACH ROW EXECUTE FUNCTION knowledge_articles_content_tsv_trigger();

-- 4. data_files: Store CSV and JSON data files
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

CREATE INDEX IF NOT EXISTS idx_data_files_file_type ON data_files(file_type);
CREATE INDEX IF NOT EXISTS idx_data_files_filename ON data_files(filename);
CREATE INDEX IF NOT EXISTS idx_data_files_tags ON data_files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_data_files_created_at ON data_files(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_files ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all documentation
CREATE POLICY "Allow authenticated read access to documentation"
  ON documentation FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access to documentation
CREATE POLICY "Allow service role full access to documentation"
  ON documentation
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read all memory logs
CREATE POLICY "Allow authenticated read access to memory_logs"
  ON memory_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access to memory logs
CREATE POLICY "Allow service role full access to memory_logs"
  ON memory_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read all knowledge articles
CREATE POLICY "Allow authenticated read access to knowledge_articles"
  ON knowledge_articles FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access to knowledge articles
CREATE POLICY "Allow service role full access to knowledge_articles"
  ON knowledge_articles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read all data files
CREATE POLICY "Allow authenticated read access to data_files"
  ON data_files FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access to data files
CREATE POLICY "Allow service role full access to data_files"
  ON data_files
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to search documentation by keyword
CREATE OR REPLACE FUNCTION search_documentation(search_query TEXT, doc_type_filter TEXT DEFAULT NULL)
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

-- Function to get related documentation
CREATE OR REPLACE FUNCTION get_related_documentation(doc_id UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  title TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d2.id,
    d2.filename,
    d2.title,
    ts_rank(d2.content_tsv, to_tsquery('english', 
      array_to_string((SELECT array_agg(word) FROM ts_stat('SELECT content_tsv FROM documentation WHERE id = ' || quote_literal(doc_id))), ' | ')
    )) AS similarity_score
  FROM documentation d2
  WHERE d2.id != doc_id
  ORDER BY similarity_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE documentation IS 'Stores all markdown documentation files from the repository';
COMMENT ON TABLE memory_logs IS 'Stores memory log entries from .memory/log.md';
COMMENT ON TABLE knowledge_articles IS 'Stores knowledge base articles';
COMMENT ON TABLE data_files IS 'Stores CSV and JSON data files';

COMMENT ON FUNCTION search_documentation IS 'Full-text search across documentation with ranking';
COMMENT ON FUNCTION get_related_documentation IS 'Find related documentation based on content similarity';
