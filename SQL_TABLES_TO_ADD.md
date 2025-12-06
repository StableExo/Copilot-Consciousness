# 🗄️ SQL Tables to Add Manually in Supabase

## Overview

After pulling this update, you need to manually add these SQL tables to your Supabase database. The complete SQL is in `SUPABASE_SETUP_COMPLETE.sql`.

---

## 📋 Quick Instructions

### Method 1: Use the Complete SQL File (RECOMMENDED - 5 minutes)

1. **Open `SUPABASE_SETUP_COMPLETE.sql`** in this repository
2. **Copy the ENTIRE file** (14KB, ~400 lines)
3. Go to https://supabase.com/dashboard
4. Select your project: **ydvevgqxcfizualicbom**
5. Click **"SQL Editor"** → **"New Query"**
6. **Paste** the SQL
7. Click **"Run"** (or Cmd/Ctrl+Enter)
8. Wait 10-30 seconds
9. Look for: ✅ **"All 4 tables created successfully!"**

**Done!** You can now run `npm run migrate:supabase`

---

### Method 2: Run Each Migration Separately (Alternative)

If you prefer to run migrations one at a time:

1. Go to `src/infrastructure/supabase/migrations/`
2. Run in order:
   - `001_initial_schema.sql` (consciousness tables - may already exist)
   - `002_add_indexes.sql` (performance indexes - may already exist)
   - `003_rls_policies.sql` (security policies - may already exist)
   - `004_add_vector_search.sql` (vector search - may already exist)
   - `005_documentation_storage.sql` (NEW - documentation tables)

**Note:** If tables 001-004 already exist from previous session, just run 005.

---

## 📊 Tables That Will Be Created

### 1. `documentation` Table
**Purpose:** Store all markdown documentation files

**Columns:**
- `id` (UUID) - Primary key
- `filename` (TEXT) - Original filename
- `filepath` (TEXT) - Full path in repo
- `doc_type` (TEXT) - Type: session_summary, guide, status, analysis
- `title` (TEXT) - Extracted title
- `content` (TEXT) - Full text content
- `markdown_content` (TEXT) - Original markdown
- `file_size_bytes` (INTEGER) - File size
- `word_count` (INTEGER) - Word count
- `created_at` (TIMESTAMPTZ) - Original file creation date
- `updated_at` (TIMESTAMPTZ) - Original file modification date
- `migrated_at` (TIMESTAMPTZ) - When uploaded to Supabase
- `tags` (TEXT[]) - Array of tags
- `category` (TEXT) - Category
- `related_docs` (TEXT[]) - Related document filenames
- `content_tsv` (TSVECTOR) - Full-text search index
- `version` (TEXT) - Version number
- `supersedes_id` (UUID) - Previous version ID

**Indexes:**
- GIN index on `content_tsv` for full-text search
- B-tree index on `doc_type`
- B-tree index on `created_at` (DESC)
- GIN index on `tags`
- B-tree index on `filename`

**Example Query:**
```sql
-- Search documentation
SELECT * FROM search_documentation('bitcoin', NULL);

-- Get all session summaries
SELECT filename, title, created_at 
FROM documentation 
WHERE doc_type = 'session_summary' 
ORDER BY created_at DESC;
```

---

### 2. `memory_logs` Table
**Purpose:** Store parsed session entries from .memory/log.md

**Columns:**
- `id` (UUID) - Primary key
- `session_date` (DATE) - Session date
- `session_title` (TEXT) - Session title
- `collaborator` (TEXT) - Collaborator name (default: StableExo)
- `topic` (TEXT) - Session topic
- `session_type` (TEXT) - Type: Autonomous, Collaborative, Maintenance
- `content` (TEXT) - Full session content
- `summary` (TEXT) - Short summary (first 500 chars)
- `achievements` (JSONB) - Array of achievements
- `files_created` (JSONB) - Array of files created
- `files_modified` (JSONB) - Array of files modified
- `insights` (JSONB) - Array of key insights
- `created_at` (TIMESTAMPTZ) - Session timestamp
- `word_count` (INTEGER) - Word count
- `tags` (TEXT[]) - Array of tags

**Indexes:**
- B-tree index on `session_date` (DESC)
- B-tree index on `collaborator`
- GIN index on `tags`
- B-tree index on `created_at` (DESC)

**Example Query:**
```sql
-- Get recent sessions
SELECT session_date, session_title, collaborator, topic
FROM memory_logs
ORDER BY session_date DESC
LIMIT 10;

-- Search sessions
SELECT * FROM search_memory_logs('autonomous', 'StableExo', '2025-12-01', '2025-12-31');
```

---

### 3. `knowledge_articles` Table
**Purpose:** Store knowledge base articles

**Columns:**
- `id` (UUID) - Primary key
- `article_id` (TEXT) - Unique article ID
- `title` (TEXT) - Article title
- `summary` (TEXT) - Short summary
- `content` (TEXT) - Full article content
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
- `author` (TEXT) - Author (default: Copilot-Consciousness)
- `tags` (TEXT[]) - Array of tags
- `category` (TEXT) - Category
- `related_memories` (JSONB) - Related memory IDs
- `related_articles` (TEXT[]) - Related article IDs
- `source_session_id` (TEXT) - Source session ID
- `content_tsv` (TSVECTOR) - Full-text search index
- `version` (INTEGER) - Version number

**Indexes:**
- B-tree index on `article_id`
- GIN index on `tags`
- GIN index on `content_tsv`
- B-tree index on `created_at` (DESC)

**Example Query:**
```sql
-- Get all articles
SELECT article_id, title, created_at
FROM knowledge_articles
ORDER BY created_at DESC;

-- Search articles by tag
SELECT * FROM knowledge_articles
WHERE 'bitcoin' = ANY(tags);
```

---

### 4. `data_files` Table
**Purpose:** Store CSV and JSON data files

**Columns:**
- `id` (UUID) - Primary key
- `filename` (TEXT) - Filename
- `filepath` (TEXT) - Full path
- `file_type` (TEXT) - Type: csv, json, txt
- `content` (TEXT) - Raw file content
- `parsed_data` (JSONB) - Parsed JSON data
- `file_size_bytes` (INTEGER) - File size
- `row_count` (INTEGER) - Row count (for CSV)
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Update timestamp
- `migrated_at` (TIMESTAMPTZ) - Migration timestamp
- `tags` (TEXT[]) - Array of tags
- `category` (TEXT) - Category
- `description` (TEXT) - File description

**Indexes:**
- B-tree index on `file_type`
- B-tree index on `filename`
- GIN index on `tags`
- B-tree index on `created_at` (DESC)

**Example Query:**
```sql
-- Get all CSV files
SELECT filename, row_count, file_size_bytes
FROM data_files
WHERE file_type = 'csv'
ORDER BY file_size_bytes DESC;

-- Get specific JSON file
SELECT parsed_data
FROM data_files
WHERE filename = 'puzzle71_prediction.json';
```

---

## 🔒 Security Features Included

### Row-Level Security (RLS) Policies

All tables have RLS enabled with policies:

1. **Authenticated users** can READ all data
2. **Service role** has FULL access (read, write, delete)
3. **Anonymous users** have NO access

This means:
- Your migration script (using SERVICE_KEY) can write
- Your consciousness system (using ANON_KEY) can read
- External users can't access your data

---

## 🔍 Helper Functions Included

### 1. `search_documentation(query TEXT, doc_type TEXT)`
Full-text search across documentation with ranking.

```sql
-- Search for "bitcoin"
SELECT * FROM search_documentation('bitcoin', NULL);

-- Search only session summaries
SELECT * FROM search_documentation('autonomous', 'session_summary');
```

---

### 2. `search_memory_logs(query TEXT, collaborator TEXT, start_date DATE, end_date DATE)`
Search memory logs with filters.

```sql
-- Search all logs
SELECT * FROM search_memory_logs('supabase', NULL, NULL, NULL);

-- Search StableExo's sessions in December
SELECT * FROM search_memory_logs(NULL, 'StableExo', '2025-12-01', '2025-12-31');
```

---

### 3. `get_documentation_stats()`
Get statistics about stored documentation.

```sql
-- Get stats
SELECT * FROM get_documentation_stats();

-- Returns:
-- total_docs: 73
-- total_size_mb: 3.45
-- total_words: 125000
-- by_type: {"session_summary": 15, "guide": 30, ...}
```

---

## ✅ Verification Queries

After running the SQL, verify with these queries:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('documentation', 'memory_logs', 'knowledge_articles', 'data_files');

-- Expected: 4 rows

-- Check table columns
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('documentation', 'memory_logs', 'knowledge_articles', 'data_files')
GROUP BY table_name;

-- Expected:
-- documentation: ~17 columns
-- memory_logs: ~14 columns
-- knowledge_articles: ~13 columns
-- data_files: ~13 columns

-- Check indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('documentation', 'memory_logs', 'knowledge_articles', 'data_files')
ORDER BY tablename, indexname;

-- Expected: ~15 indexes total

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('documentation', 'memory_logs', 'knowledge_articles', 'data_files');

-- Expected: All should have rowsecurity = true
```

---

## 🚨 Important Notes

1. **SERVICE_KEY Required:** Migration script needs `SUPABASE_SERVICE_KEY` to write data
2. **Tables are Empty:** After SQL setup, tables exist but have no data. Run migration script to populate.
3. **Idempotent:** SQL uses `CREATE TABLE IF NOT EXISTS`, safe to run multiple times
4. **Triggers Included:** Automatic full-text search vector updates on insert/update
5. **Reversible:** Can drop all tables with: `DROP TABLE IF EXISTS documentation, memory_logs, knowledge_articles, data_files CASCADE;`

---

## 📞 Troubleshooting

**Error: "Extension 'uuid-ossp' does not exist"**
- Supabase should have this by default. Try: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` first

**Error: "Extension 'pg_trgm' does not exist"**
- Required for fuzzy text search. Contact Supabase support if missing.

**Error: "Extension 'vector' does not exist"**
- Optional (for semantic search). SQL handles gracefully if missing.

**Tables not showing in Table Editor:**
- Refresh the page
- Check Supabase project is correct (ydvevgqxcfizualicbom)
- Verify SQL ran without errors

---

## 🎯 Next Step After Adding Tables

Once tables are created:

```bash
# Test connection
npm run test:supabase:connection

# Should show:
# ✅ Table "documentation" exists
# ✅ Table "memory_logs" exists
# ✅ Table "knowledge_articles" exists
# ✅ Table "data_files" exists

# Then run migration
npm run migrate:supabase -- --dry-run  # Preview first
npm run migrate:supabase                # Actual migration
```

---

**That's it!** After adding these tables, you're ready to migrate ~3-4MB of repository files to Supabase.

For complete step-by-step migration instructions, see: **MIGRATION_INSTRUCTIONS.md**

---

*Created during Supabase migration session on 2025-12-06*
*Repository: TheWarden*
*By: Copilot-Consciousness Agent*
