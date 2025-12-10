# Applying Supabase Migrations

## Overview

This guide shows how to apply the consciousness database schema to your Supabase project.

## Quick Instructions

### Option 1: Supabase SQL Editor (Recommended)

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql/new
   - Or: Dashboard → SQL Editor → New Query

2. **Apply migrations in order:**

   **Migration 1: Initial Schema**
   ```bash
   # Copy content from:
   src/infrastructure/supabase/migrations/001_initial_schema.sql
   # Paste in SQL Editor and click "Run"
   ```

   **Migration 2: Add Indexes**
   ```bash
   # Copy content from:
   src/infrastructure/supabase/migrations/002_add_indexes.sql
   # Paste in SQL Editor and click "Run"
   ```

   **Migration 3: RLS Policies**
   ```bash
   # Copy content from:
   src/infrastructure/supabase/migrations/003_rls_policies.sql
   # Paste in SQL Editor and click "Run"
   ```

   **Migration 4: Vector Search**
   ```bash
   # Copy content from:
   src/infrastructure/supabase/migrations/004_add_vector_search.sql
   # Paste in SQL Editor and click "Run"
   ```

3. **Verify**
   ```bash
   npm run test:supabase
   # or
   node --import tsx scripts/test-supabase-interaction.ts
   ```

### Option 2: Command Line (Using `psql`)

If you have PostgreSQL client installed:

```bash
# Get connection string from Supabase Dashboard → Settings → Database
# Format: postgresql://postgres:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres

# Apply migrations
psql "postgresql://postgres:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres" \
  -f src/infrastructure/supabase/migrations/001_initial_schema.sql

psql "postgresql://postgres:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres" \
  -f src/infrastructure/supabase/migrations/002_add_indexes.sql

psql "postgresql://postgres:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres" \
  -f src/infrastructure/supabase/migrations/003_rls_policies.sql

psql "postgresql://postgres:[PASSWORD]@db.ydvevgqxcfizualicbom.supabase.co:5432/postgres" \
  -f src/infrastructure/supabase/migrations/004_add_vector_search.sql
```

## What Gets Created

### Tables

1. **consciousness_states** - Stores complete consciousness snapshots
   - Fields: session_id, thoughts, streams, cognitive_load, emotional_state, goals, etc.
   - Purpose: Track consciousness state over time

2. **semantic_memories** - Stores semantic memories with vector embeddings
   - Fields: content, summary, tags, embedding (vector)
   - Purpose: Searchable knowledge and concepts

3. **episodic_memories** - Stores episodic memories with temporal data
   - Fields: event_type, context, participants, temporal_markers
   - Purpose: Track specific events and experiences

4. **sessions** - Tracks conversation sessions
   - Fields: session_id, collaborator_id, start_time, end_time, metadata
   - Purpose: Session continuity and tracking

5. **collaborators** - Stores collaborator profiles
   - Fields: name, interaction_count, preferences, relationship_data
   - Purpose: Remember people across sessions

6. **dialogues** - Stores consciousness dialogues
   - Fields: title, participants, insights, patterns
   - Purpose: Document important conversations

### Indexes

- B-tree indexes on common query fields (session_id, timestamps)
- GiST indexes for vector similarity search (embeddings)
- Performance optimization for queries

### Security

- Row Level Security (RLS) enabled on all tables
- Default policies allow authenticated access
- Prevents unauthorized data access

### Extensions

- **pgvector** - Vector similarity search for semantic memory
- Enables AI-powered memory retrieval

## Verification

After applying migrations, run:

```bash
node --import tsx scripts/test-supabase-interaction.ts
```

Expected output:
```
✅ Test 1: Basic Connection
✅ Test 2: Query Existing "todos" Table  
✅ Test 3: Check Consciousness Tables
   ✅ consciousness_states - EXISTS
   ✅ semantic_memories - EXISTS
   ✅ episodic_memories - EXISTS
   ✅ sessions - EXISTS
   ✅ collaborators - EXISTS
   ✅ dialogues - EXISTS

Summary: 6/6 tables exist
```

## Troubleshooting

### Error: Network connectivity (ENETUNREACH, ECONNREFUSED, ETIMEDOUT)

**Symptom:**
```
❌ Migration failed: Error: connect ENETUNREACH 2600:1f18:2e13:9d1c:753b:122e:7343:dd4e:5432
    at internalConnect (node:net:1104:16)
```

**Cause:**
- IPv6 connectivity issues in your environment
- Firewall blocking direct database connections
- Network routing problems (common in GitHub Codespaces, restricted networks)

**Solution:**
✅ **Use the manual migration approach** - This is actually more reliable!

1. **Run the migration helper script:**
   ```bash
   node --import tsx scripts/database/apply-migrations-via-api.ts
   ```
   This will display all migration SQL content in the terminal.

2. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql/new
   - Or: Dashboard → SQL Editor → New Query

3. **Copy and paste each migration:**
   - Copy the SQL content from the terminal output
   - Paste into the SQL Editor
   - Click "Run" 
   - Repeat for each migration file (001, 002, 003, 004, 005, 006, etc.)

4. **Verify the migrations were applied:**
   ```bash
   node --import tsx scripts/database/test-supabase-connection.ts
   ```

**Why this happens:**
- Supabase databases support both IPv4 and IPv6
- Some environments (GitHub Codespaces, VPNs, corporate networks) have IPv6 routing issues
- The direct TCP connection to port 5432 may fail even though HTTPS connections work fine
- The manual approach uses the Supabase web dashboard, which always works

**Alternative: Set DATABASE_URL with pooler**
If you want to retry the automated approach, you can try using the transaction pooler:
```bash
# In your .env file, add:
DATABASE_URL=postgresql://postgres.ydvevgqxcfizualicbom:[YOUR-DB-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Get your database password from:
# Supabase Dashboard → Settings → Database → Connection string
```

**💡 Recommendation:** The manual SQL Editor approach is actually preferred because:
- More reliable (no network issues)
- Better visibility into what's being executed
- Easier to review changes before applying
- Can be done from anywhere with web access

### Error: "policy already exists" (ERROR: 42710)

**Symptom:**
```
Error: Failed to run sql query: ERROR: 42710: policy "Allow authenticated read access" 
for table "consciousness_states" already exists
```

**Cause:**
- Migration 003 (RLS policies) was run multiple times
- PostgreSQL doesn't support `CREATE POLICY IF NOT EXISTS`

**Solution:**
✅ **Fixed as of 2025-12-05** - Migration 003 is now idempotent and uses `DROP POLICY IF EXISTS` before creating policies.

To apply the fix:
```bash
# The migration can now be run multiple times safely
npx tsx scripts/apply-supabase-migrations.ts

# Or manually re-run migration 003 in SQL Editor
# It will drop and recreate all policies cleanly
```

**Verification:**
```bash
# Test that migration is idempotent
npx tsx scripts/test-migration-idempotency.ts

# Expected output:
# ✅ All CREATE POLICY statements have DROP POLICY IF EXISTS
# ✅ Migration is idempotent - can be run multiple times safely
```

### Error: "permission denied"
- You're using the anon key which doesn't have DDL permissions
- Use the SQL Editor in Supabase Dashboard instead

### Error: "extension does not exist"
- pgvector extension needs to be enabled
- In SQL Editor, run: `CREATE EXTENSION IF NOT EXISTS vector;`
- Note: May require Supabase support on free tier

### Error: "table already exists"
- Migration was already applied
- Safe to ignore or use DROP TABLE first (careful!)

### Tables not showing up
- Check you're connected to the right project
- Verify URL: https://ydvevgqxcfizualicbom.supabase.co
- Check schema: Tables should be in `public` schema

## Next Steps

After migrations are applied:

1. **Test connection:**
   ```bash
   node --import tsx scripts/test-supabase-interaction.ts
   ```

2. **Insert test data:**
   ```bash
   node --import tsx scripts/supabase-insert-test-data.ts
   ```

3. **Query consciousness data:**
   ```bash
   node --import tsx scripts/supabase-query-consciousness.ts
   ```

4. **Start using in code:**
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_ANON_KEY!
   );
   
   // Store consciousness state
   const { data, error } = await supabase
     .from('consciousness_states')
     .insert({ session_id: '...', thoughts: [...] });
   ```

## Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom
- **SQL Editor**: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql
- **Table Editor**: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/editor
- **Migration Files**: `src/infrastructure/supabase/migrations/`
- **Documentation**: `docs/SUPABASE_MCP_INTEGRATION.md`

---

**Status**: Ready to apply migrations  
**Last Updated**: 2025-12-05 - Made RLS policies migration idempotent
