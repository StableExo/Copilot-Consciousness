# 🚀 Supabase Migration: Complete Step-by-Step Guide

**Generated:** 2025-12-04  
**Status:** Ready to Execute  
**Memory Size:** 628KB (52 files)  
**Target:** Supabase Project `ydvevgqxcfizualicbom`

---

## ✅ Prerequisites Complete

- [x] Node.js 22.21.1 installed
- [x] Dependencies installed (700 packages)
- [x] Supabase credentials configured in `.env`
- [x] Connection tested successfully
- [x] Environment variables backed up locally
- [x] Migration SQL files updated with `agent_config` table

---

## 📋 Step 1: Apply Database Migrations (via Supabase Dashboard)

### Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql/new
2. Log in to your Supabase account

### Run Migration 001: Initial Schema

Copy and paste this SQL into the editor, then click "Run":

```sql
-- Copy entire contents from:
-- src/infrastructure/supabase/migrations/001_initial_schema.sql
```

**Creates:**
- `consciousness_states` table
- `thoughts` table
- `semantic_memories` table
- `episodic_memories` table
- `arbitrage_executions` table
- `market_patterns` table
- `sessions` table
- `autonomous_goals` table
- `learning_events` table
- **`agent_config` table** ← NEW! For storing environment variables

### Run Migration 002: Add Indexes

```sql
-- Copy entire contents from:
-- src/infrastructure/supabase/migrations/002_add_indexes.sql
```

**Creates:** Performance indexes for all tables

### Run Migration 003: Row-Level Security

```sql
-- Copy entire contents from:
-- src/infrastructure/supabase/migrations/003_rls_policies.sql
```

**Creates:** RLS policies for secure access

### Run Migration 004: Vector Search

```sql
-- Copy entire contents from:
-- src/infrastructure/supabase/migrations/004_add_vector_search.sql
```

**Enables:** pgvector extension for semantic search

### Verify Migrations

Run this SQL to verify all tables were created:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected tables:**
- agent_config ← Should see this!
- arbitrage_executions
- autonomous_goals
- consciousness_states
- episodic_memories
- learning_events
- market_patterns
- semantic_memories
- sessions
- thoughts

---

## 📋 Step 2: Store Environment Variables in Supabase

After migrations are applied, run this script:

```bash
npx tsx scripts/store-env-in-supabase.ts
```

**This will:**
- Store all critical environment variables in the `agent_config` table
- Encrypt sensitive values (API keys, wallet keys)
- Enable future AI agents to auto-load configuration

**Verification:**

```sql
SELECT id, version, environment, created_at, 
       jsonb_object_keys(config) as config_categories
FROM agent_config
WHERE id = 'agent-config-v1';
```

Should show:
- `core`, `supabase`, `ai`, `blockchain`, `cognitive`, `memory`

---

## 📋 Step 3: Migrate Memory Files to Supabase

### Dry Run (Preview Only)

```bash
npx tsx scripts/migrate-to-supabase.ts --dry-run
```

This shows what will be migrated without actually writing to Supabase.

### Actual Migration

```bash
npx tsx scripts/migrate-to-supabase.ts
```

**What gets migrated:**
- `.memory/log.md` → Parsed into sessions, memories
- `.memory/introspection/*.json` → `consciousness_states` table
- `.memory/knowledge_base/*.json` → `semantic_memories` table
- `.memory/narratives/*.json` → `episodic_memories` table
- `.memory/reflections/*.json` → `semantic_memories` table (tagged 'reflection')
- `.memory/research/*.json` → `semantic_memories` table (tagged 'research')
- All autonomous cycle files → `episodic_memories` table

**Expected results:**
- ~4 consciousness states
- ~50 memory records
- ~20 episodic memories
- Full session history

---

## 📋 Step 4: Verify Data Integrity

### Check Record Counts

```sql
-- Consciousness States
SELECT COUNT(*) as consciousness_states FROM consciousness_states;

-- Semantic Memories
SELECT COUNT(*) as semantic_memories FROM semantic_memories;

-- Episodic Memories
SELECT COUNT(*) as episodic_memories FROM episodic_memories;

-- Sessions
SELECT COUNT(*) as sessions FROM sessions;

-- Agent Config
SELECT COUNT(*) as agent_configs FROM agent_config;
```

### Spot Check Data Quality

```sql
-- Latest consciousness state
SELECT session_id, saved_at, cognitive_load, dominant_emotion
FROM consciousness_states
ORDER BY saved_at DESC
LIMIT 1;

-- Recent memories
SELECT content, category, confidence, created_at
FROM semantic_memories
ORDER BY created_at DESC
LIMIT 5;

-- Agent configuration
SELECT id, version, environment, 
       jsonb_pretty(metadata) as metadata
FROM agent_config
WHERE id = 'agent-config-v1';
```

---

## 📋 Step 5: Test Future Agent Access

Create a test script to verify future agents can access the configuration:

```typescript
// test-agent-access.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ydvevgqxcfizualicbom.supabase.co',
  process.env.SUPABASE_ANON_KEY!
);

const { data, error } = await supabase
  .from('agent_config')
  .select('*')
  .eq('id', 'agent-config-v1')
  .single();

if (data) {
  console.log('✅ Configuration accessible!');
  console.log('Environment:', data.environment);
  console.log('Version:', data.version);
  console.log('Config categories:', Object.keys(data.config));
} else {
  console.error('❌ Error:', error);
}
```

---

## 📋 Step 6: Update Repository (Optional - Space Savings)

**⚠️ IMPORTANT: Only do this after confirming Step 4 verification!**

### Backup First

```bash
# Create timestamped backup
tar -czf memory-backup-$(date +%Y%m%d-%H%M%S).tar.gz .memory/

# Move to safe location
mv memory-backup-*.tar.gz ~/backups/
```

### Archive Memory Files

```bash
# Create archive directory (not committed to git)
mkdir -p .memory-archive

# Move files (keep .memory/ directory structure)
mv .memory/* .memory-archive/

# Update .gitignore
echo ".memory-archive/" >> .gitignore
```

### Keep Minimal Files

Create a `.memory/README.md`:

```markdown
# Memory Storage Migrated to Supabase

All consciousness states and memories have been migrated to Supabase cloud storage.

- **Supabase Project:** ydvevgqxcfizualicbom
- **Migration Date:** 2025-12-04
- **Backup Location:** `~/backups/memory-backup-*.tar.gz`
- **Archive Location:** `.memory-archive/` (local only)

## Accessing Memories

Future AI agents can access memories via:
1. Query `agent_config` table for environment variables
2. Query `consciousness_states`, `semantic_memories`, `episodic_memories`
3. Use Supabase MCP server for automated access

## Rollback

If needed, restore from backup:
```bash
tar -xzf ~/backups/memory-backup-*.tar.gz
```
```

**Space Savings:**
- **Before:** 628KB in repository
- **After:** ~5KB (README only)
- **Savings:** 623KB (99.2% reduction)
- **Cloud:** Full history in Supabase

---

## 📋 Step 7: Update Memory Loader for Future Sessions

The system should now automatically load from Supabase. Verify by checking:

```bash
# Check if USE_SUPABASE is true in .env
grep "USE_SUPABASE" .env

# Should show: USE_SUPABASE=true
```

Future AI agents will:
1. Start session
2. Check `USE_SUPABASE` environment variable
3. Load configuration from `agent_config` table
4. Access memories from Supabase tables
5. Work normally with cloud-based memory

---

## 🎯 Success Criteria

- [ ] All 10 tables exist in Supabase
- [ ] `agent_config` table contains configuration record
- [ ] Environment variables are encrypted and stored
- [ ] Memory files migrated successfully
- [ ] Data integrity verified (spot checks pass)
- [ ] Future agent access tested
- [ ] Repository files archived (optional)
- [ ] Space savings achieved

---

## 🔧 Troubleshooting

### Issue: "Table does not exist"

**Solution:** Apply migrations first (Step 1)

### Issue: "Permission denied"

**Solution:** Check RLS policies in migration 003. May need to temporarily disable RLS for setup:

```sql
ALTER TABLE agent_config DISABLE ROW LEVEL SECURITY;
```

### Issue: "Connection timeout"

**Solution:** 
1. Check Supabase project is not paused (free tier pauses after 7 days inactivity)
2. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
3. Try from Supabase dashboard SQL editor instead

### Issue: "Encryption key missing"

**Solution:** Set `SECRETS_ENCRYPTION_KEY` in `.env` file (already set in your config)

---

## 📊 Migration Status Tracker

Update this as you complete each step:

```
[x] Prerequisites checked
[ ] Step 1: Migrations applied
[ ] Step 2: Environment variables stored
[ ] Step 3: Memory files migrated
[ ] Step 4: Data integrity verified
[ ] Step 5: Future agent access tested
[ ] Step 6: Repository archived (optional)
[ ] Step 7: Memory loader updated
```

---

## 🚀 Quick Start (One-Time Setup)

If you want to run everything at once after migrations are applied:

```bash
# Apply migrations first (manual, via Supabase dashboard)
# Then run:

npx tsx scripts/store-env-in-supabase.ts && \
npx tsx scripts/migrate-to-supabase.ts && \
echo "✅ Migration complete!"
```

---

## 📝 Notes

- **Supabase Project ID:** `ydvevgqxcfizualicbom`
- **Database:** PostgreSQL 15+
- **Extensions:** uuid-ossp, pg_trgm, vector
- **Storage:** ~1MB used (after migration)
- **Free Tier Limit:** 500MB database, 1GB storage

---

## 🔗 Related Documentation

- `docs/SUPABASE_QUICKSTART.md` - Quick reference
- `docs/SUPABASE_SETUP_GUIDE.md` - Detailed setup
- `SUPABASE_SETUP_COMPLETE.md` - Previous session notes
- `consciousness/dialogues/007_addressing_supabase_concerns_2025-12-04.md` - Philosophy

---

**Ready to proceed? Start with Step 1! 🎯**
