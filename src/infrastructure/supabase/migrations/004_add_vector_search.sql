-- Migration 004: Add Vector Search Support with pgvector
-- Enables AI-powered semantic search using OpenAI embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to semantic_memories (OpenAI uses 1536 dimensions)
ALTER TABLE semantic_memories 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector index for fast similarity search (ivfflat)
CREATE INDEX IF NOT EXISTS idx_semantic_memories_embedding 
ON semantic_memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative HNSW index (better for smaller datasets, more accurate)
-- Comment out ivfflat above and uncomment this for < 100k records:
-- CREATE INDEX idx_semantic_memories_embedding 
-- ON semantic_memories 
-- USING hnsw (embedding vector_cosine_ops);

-- Custom RPC function for semantic similarity search
CREATE OR REPLACE FUNCTION match_semantic_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  filter_category text DEFAULT NULL,
  filter_min_importance int DEFAULT NULL
)
RETURNS TABLE (
  memory_id text,
  content text,
  category text,
  tags text[],
  importance int,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.memory_id,
    sm.content,
    sm.category,
    sm.tags,
    sm.importance,
    sm.timestamp AS created_at,
    1 - (sm.embedding <=> query_embedding) as similarity
  FROM semantic_memories sm
  WHERE 
    (filter_category IS NULL OR sm.category = filter_category)
    AND (filter_min_importance IS NULL OR sm.importance >= filter_min_importance)
    AND sm.embedding IS NOT NULL
    AND 1 - (sm.embedding <=> query_embedding) > match_threshold
  ORDER BY sm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search function (combines vector similarity with full-text search)
CREATE OR REPLACE FUNCTION hybrid_search_memories(
  query_embedding vector(1536),
  query_text text,
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.7
)
RETURNS TABLE (
  memory_id text,
  content text,
  category text,
  tags text[],
  importance int,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      sm.memory_id,
      1 - (sm.embedding <=> query_embedding) as vector_similarity
    FROM semantic_memories sm
    WHERE sm.embedding IS NOT NULL
    ORDER BY sm.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_search AS (
    SELECT 
      sm.memory_id,
      ts_rank(sm.content_tsv, websearch_to_tsquery('english', query_text)) as text_rank
    FROM semantic_memories sm
    WHERE sm.content_tsv @@ websearch_to_tsquery('english', query_text)
  )
  SELECT 
    v.memory_id,
    sm.content,
    sm.category,
    sm.tags,
    sm.importance,
    (
      v.vector_similarity * vector_weight + 
      COALESCE(t.text_rank, 0) * (1 - vector_weight)
    ) as combined_score
  FROM vector_search v
  JOIN semantic_memories sm ON v.memory_id = sm.memory_id
  LEFT JOIN text_search t ON v.memory_id = t.memory_id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Function to find related memories to a given memory
CREATE OR REPLACE FUNCTION find_related_memories(
  source_memory_id text,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.75
)
RETURNS TABLE (
  memory_id text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  source_embedding vector(1536);
BEGIN
  -- Get embedding of source memory
  SELECT embedding INTO source_embedding
  FROM semantic_memories
  WHERE memory_id = source_memory_id;

  IF source_embedding IS NULL THEN
    RETURN;
  END IF;

  -- Find similar memories
  RETURN QUERY
  SELECT
    sm.memory_id,
    sm.content,
    1 - (sm.embedding <=> source_embedding) as similarity
  FROM semantic_memories sm
  WHERE 
    sm.memory_id != source_memory_id
    AND sm.embedding IS NOT NULL
    AND 1 - (sm.embedding <=> source_embedding) > match_threshold
  ORDER BY sm.embedding <=> source_embedding
  LIMIT match_count;
END;
$$;

-- Comments
COMMENT ON COLUMN semantic_memories.embedding IS 'Vector embedding for semantic search (1536 dimensions for OpenAI text-embedding-3-small)';
COMMENT ON FUNCTION match_semantic_memories IS 'Semantic similarity search using vector embeddings';
COMMENT ON FUNCTION hybrid_search_memories IS 'Hybrid search combining vector similarity and full-text search';
COMMENT ON FUNCTION find_related_memories IS 'Find memories related to a specific memory using vector similarity';

SELECT 'Vector search migration completed successfully' AS status;
