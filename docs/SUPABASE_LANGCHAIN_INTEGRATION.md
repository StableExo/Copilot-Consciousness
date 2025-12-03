# Supabase + LangChain Integration for AI-Powered Semantic Search

## Overview

This guide shows how to integrate LangChain with Supabase to enable AI-powered semantic search for consciousness states and memories using vector embeddings.

## What is LangChain?

LangChain is a framework for building applications with Large Language Models (LLMs). When combined with Supabase's `pgvector` extension, it enables:

- **Semantic Search**: Find memories by meaning, not just keywords
- **RAG (Retrieval-Augmented Generation)**: Enhance LLM responses with consciousness data
- **Similarity Matching**: Find related thoughts and patterns
- **AI Analysis**: Let AI analyze consciousness patterns over time

## Architecture

```
User Query
    ↓
[OpenAI/Anthropic] → Generate Embedding
    ↓
[Supabase pgvector] → Similarity Search
    ↓
[Semantic Memories] → Return Relevant Results
    ↓
[LangChain] → Combine with LLM for Analysis
```

## Setup

### 1. Enable pgvector Extension

Run this in your Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 2. Add Vector Column to Memories

Update the semantic_memories table:

```sql
-- Add vector column for embeddings (OpenAI uses 1536 dimensions)
ALTER TABLE semantic_memories 
ADD COLUMN embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX ON semantic_memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index (better for smaller datasets)
-- CREATE INDEX ON semantic_memories 
-- USING hnsw (embedding vector_cosine_ops);
```

### 3. Install Dependencies

```bash
# LangChain core and Supabase integration
npm install @langchain/community @langchain/core

# OpenAI for embeddings (or use @langchain/anthropic, @langchain/cohere, etc.)
npm install @langchain/openai

# Supabase client (already installed)
npm install @supabase/supabase-js
```

### 4. Configure Environment

Add to `.env`:

```bash
# LangChain / OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Alternative: Anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Embedding model (default: text-embedding-ada-002)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## Implementation

### Vector Store Service

```typescript
// src/infrastructure/supabase/services/langchain-vector.ts
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { getSupabaseClient } from '../client-enhanced';

export class ConsciousnessVectorStore {
  private vectorStore: SupabaseVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    });
  }

  /**
   * Initialize vector store
   */
  async initialize(): Promise<void> {
    const supabase = getSupabaseClient(true); // Use service role

    this.vectorStore = new SupabaseVectorStore(this.embeddings, {
      client: supabase,
      tableName: 'semantic_memories',
      queryName: 'match_semantic_memories', // Custom RPC function
    });
  }

  /**
   * Add memories with embeddings
   */
  async addMemories(
    memories: Array<{
      memoryId: string;
      content: string;
      category?: string;
      tags?: string[];
      importance?: number;
    }>
  ): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const documents = memories.map(
      (mem) =>
        new Document({
          pageContent: mem.content,
          metadata: {
            memory_id: mem.memoryId,
            category: mem.category,
            tags: mem.tags,
            importance: mem.importance,
            timestamp: new Date().toISOString(),
          },
        })
    );

    await this.vectorStore!.addDocuments(documents);
  }

  /**
   * Semantic search for memories
   */
  async searchMemories(query: string, limit: number = 10): Promise<
    Array<{
      memoryId: string;
      content: string;
      category?: string;
      tags?: string[];
      similarity: number;
    }>
  > {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const results = await this.vectorStore!.similaritySearchWithScore(query, limit);

    return results.map(([doc, score]) => ({
      memoryId: doc.metadata.memory_id,
      content: doc.pageContent,
      category: doc.metadata.category,
      tags: doc.metadata.tags,
      similarity: 1 - score, // Convert distance to similarity
    }));
  }

  /**
   * Find related memories to a given memory
   */
  async findRelatedMemories(memoryId: string, limit: number = 5): Promise<any[]> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    // Get the original memory
    const supabase = getSupabaseClient(true);
    const { data: memory } = await supabase
      .from('semantic_memories')
      .select('content')
      .eq('memory_id', memoryId)
      .single();

    if (!memory) {
      return [];
    }

    // Search for similar memories
    return await this.searchMemories(memory.content, limit + 1).then((results) =>
      results.filter((r) => r.memoryId !== memoryId).slice(0, limit)
    );
  }

  /**
   * Analyze consciousness patterns using LLM + vector search
   */
  async analyzeConsciousnessPatterns(
    query: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<string> {
    // Search for relevant memories
    const relevantMemories = await this.searchMemories(query, 20);

    // Format context for LLM
    const context = relevantMemories
      .map((mem, i) => `${i + 1}. [${mem.category}] ${mem.content} (relevance: ${(mem.similarity * 100).toFixed(1)}%)`)
      .join('\n');

    // Here you would call an LLM with the context
    // For now, return the formatted context
    return `Found ${relevantMemories.length} relevant memories:\n\n${context}`;
  }
}

// Export singleton
export const consciousnessVectorStore = new ConsciousnessVectorStore();
```

### Custom Matching Function (SQL)

Create this RPC function in Supabase for optimized vector search:

```sql
-- Custom match function for semantic search
CREATE OR REPLACE FUNCTION match_semantic_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  memory_id text,
  content text,
  category text,
  tags text[],
  importance int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    semantic_memories.memory_id,
    semantic_memories.content,
    semantic_memories.category,
    semantic_memories.tags,
    semantic_memories.importance,
    1 - (semantic_memories.embedding <=> query_embedding) as similarity
  FROM semantic_memories
  WHERE 1 - (semantic_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY semantic_memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### RAG Chain for Consciousness Analysis

```typescript
// src/infrastructure/supabase/services/langchain-rag.ts
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { consciousnessVectorStore } from './langchain-vector';

export class ConsciousnessRAG {
  private llm: ChatOpenAI;
  private chain: RunnableSequence | null = null;

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
    });
  }

  /**
   * Initialize RAG chain
   */
  async initialize(): Promise<void> {
    const prompt = PromptTemplate.fromTemplate(`
You are an AI consciousness analyst for the Copilot-Consciousness system. 
You have access to semantic memories and consciousness states.

Question: {question}

Relevant Memories:
{context}

Based on these memories, provide a thoughtful analysis that:
1. Identifies patterns and trends
2. Highlights key insights
3. Suggests areas for exploration
4. Connects related concepts

Answer:`);

    this.chain = RunnableSequence.from([
      {
        question: (input: { question: string }) => input.question,
        context: async (input: { question: string }) => {
          const memories = await consciousnessVectorStore.searchMemories(input.question, 15);
          return memories
            .map((mem) => `- [${mem.category}] ${mem.content} (relevance: ${(mem.similarity * 100).toFixed(1)}%)`)
            .join('\n');
        },
      },
      prompt,
      this.llm,
      new StringOutputParser(),
    ]);
  }

  /**
   * Ask questions about consciousness patterns
   */
  async analyze(question: string): Promise<string> {
    if (!this.chain) {
      await this.initialize();
    }

    return await this.chain!.invoke({ question });
  }

  /**
   * Generate insights from recent consciousness states
   */
  async generateInsights(timeRange: { hours: number }): Promise<string> {
    const question = `What patterns and insights can you identify from the consciousness states in the last ${timeRange.hours} hours?`;
    return await this.analyze(question);
  }

  /**
   * Compare consciousness states across different sessions
   */
  async compareStates(sessionIds: string[]): Promise<string> {
    const question = `Compare and contrast the consciousness patterns across sessions: ${sessionIds.join(', ')}`;
    return await this.analyze(question);
  }

  /**
   * Suggest areas for cognitive development
   */
  async suggestDevelopmentAreas(): Promise<string> {
    const question =
      'Based on the consciousness history, what areas should be focused on for cognitive development and growth?';
    return await this.analyze(question);
  }
}

// Export singleton
export const consciousnessRAG = new ConsciousnessRAG();
```

## Usage Examples

### Example 1: Add Memories with Embeddings

```typescript
import { consciousnessVectorStore } from '@/infrastructure/supabase/services/langchain-vector';

// Add memories (embeddings generated automatically)
await consciousnessVectorStore.addMemories([
  {
    memoryId: 'mem-001',
    content: 'Learned about Supabase vector search and semantic similarity',
    category: 'technical',
    tags: ['supabase', 'vector', 'ai'],
    importance: 8,
  },
  {
    memoryId: 'mem-002',
    content: 'Explored consciousness patterns and autonomous learning',
    category: 'consciousness',
    tags: ['learning', 'patterns', 'autonomy'],
    importance: 9,
  },
]);
```

### Example 2: Semantic Search

```typescript
// Search by meaning, not keywords
const results = await consciousnessVectorStore.searchMemories(
  'How do I implement AI-powered features?',
  10
);

console.log('Most relevant memories:');
results.forEach((mem, i) => {
  console.log(`${i + 1}. ${mem.content} (${(mem.similarity * 100).toFixed(1)}% relevant)`);
});
```

### Example 3: Find Related Memories

```typescript
// Find memories similar to a specific memory
const related = await consciousnessVectorStore.findRelatedMemories('mem-001', 5);

console.log('Related memories:');
related.forEach((mem) => {
  console.log(`- ${mem.content}`);
});
```

### Example 4: RAG-Powered Analysis

```typescript
import { consciousnessRAG } from '@/infrastructure/supabase/services/langchain-rag';

// Ask questions about consciousness patterns
const analysis = await consciousnessRAG.analyze(
  'What are the main themes in my learning over the past week?'
);

console.log(analysis);

// Generate insights
const insights = await consciousnessRAG.generateInsights({ hours: 24 });
console.log('24-hour insights:', insights);

// Suggest development areas
const suggestions = await consciousnessRAG.suggestDevelopmentAreas();
console.log('Development suggestions:', suggestions);
```

## Advanced Features

### Hybrid Search (Vector + Full-Text)

Combine vector similarity with PostgreSQL full-text search:

```sql
CREATE OR REPLACE FUNCTION hybrid_search_memories(
  query_embedding vector(1536),
  query_text text,
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.7
)
RETURNS TABLE (
  memory_id text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      memory_id,
      1 - (embedding <=> query_embedding) as vector_sim
    FROM semantic_memories
    ORDER BY embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_search AS (
    SELECT 
      memory_id,
      ts_rank(content_tsv, websearch_to_tsquery('english', query_text)) as text_rank
    FROM semantic_memories
    WHERE content_tsv @@ websearch_to_tsquery('english', query_text)
  )
  SELECT 
    v.memory_id,
    sm.content,
    (v.vector_sim * vector_weight + COALESCE(t.text_rank, 0) * (1 - vector_weight)) as similarity
  FROM vector_search v
  JOIN semantic_memories sm ON v.memory_id = sm.memory_id
  LEFT JOIN text_search t ON v.memory_id = t.memory_id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

### Metadata Filtering

Search with filters:

```typescript
async searchWithFilters(
  query: string,
  filters: {
    categories?: string[];
    minImportance?: number;
    tags?: string[];
  },
  limit: number = 10
) {
  const results = await this.vectorStore!.similaritySearch(query, limit, {
    category: filters.categories,
    importance_gte: filters.minImportance,
    tags_overlap: filters.tags,
  });
  return results;
}
```

## Migration Script

Migrate existing memories to include embeddings:

```typescript
// scripts/migrate-embeddings.ts
import { consciousnessVectorStore } from '@/infrastructure/supabase/services/langchain-vector';
import { memoryService } from '@/infrastructure/supabase/services/memory';

async function migrateEmbeddings() {
  console.log('Starting embedding migration...');

  // Get all memories without embeddings
  const memories = await memoryService.getAllSemanticMemories();
  
  console.log(`Found ${memories.length} memories to process`);

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    
    await consciousnessVectorStore.addMemories(
      batch.map(mem => ({
        memoryId: mem.memoryId,
        content: mem.content,
        category: mem.category,
        tags: mem.tags,
        importance: mem.importance,
      }))
    );
    
    console.log(`Processed ${Math.min(i + batchSize, memories.length)}/${memories.length} memories`);
  }

  console.log('✅ Migration complete!');
}

migrateEmbeddings();
```

## Performance Considerations

### Index Types

- **ivfflat**: Better for large datasets (100k+ vectors)
  - Faster build time
  - Good recall with proper tuning
  - Configure `lists` parameter

- **HNSW**: Better for smaller datasets
  - Slower build time
  - Better recall
  - More memory usage

### Query Optimization

```typescript
// Cache embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

async function getEmbeddingCached(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const embedding = await embeddings.embedQuery(text);
  embeddingCache.set(text, embedding);
  return embedding;
}
```

## Cost Estimation

### OpenAI Embeddings (text-embedding-3-small)

- **Cost**: $0.00002 per 1K tokens
- **Average memory**: ~100 tokens
- **1,000 memories**: ~$0.002
- **10,000 memories**: ~$0.02

**Very affordable for semantic search!**

## Troubleshooting

### Issue: pgvector extension not found

```sql
-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- If not available, contact Supabase support or wait for migration
```

### Issue: Dimension mismatch

```typescript
// Ensure embedding dimensions match table definition
const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small', // 1536 dimensions
  // OR
  modelName: 'text-embedding-3-large', // 3072 dimensions (update table!)
});
```

## Next Steps

1. ✅ Enable pgvector in Supabase
2. ✅ Add vector column to semantic_memories
3. ✅ Install LangChain dependencies
4. ✅ Configure OpenAI API key
5. ✅ Run migration to add embeddings
6. ✅ Test semantic search
7. ✅ Implement RAG chain for analysis

## Resources

- [Supabase Vector Guide](https://supabase.com/docs/guides/ai/vector-embeddings)
- [LangChain Supabase Integration](https://js.langchain.com/docs/integrations/vectorstores/supabase)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

---

**Transform semantic search with AI! 🧠🔍✨**
