# Supabase Memory Migration - Quick Start Guide

## Overview
This guide helps you migrate the `.memory/` directory from the repository to Supabase cloud storage, freeing up repo space while making memories accessible across sessions.

## Prerequisites

### 1. Supabase Account & Project
If you don't have one yet:
1. Visit https://supabase.com
2. Sign up for free (includes 500MB database + 1GB file storage)
3. Create a new project (takes ~2 minutes to provision)
4. Note your project URL and API keys from Settings > API

### 2. Environment Configuration
Create a `.env` file in the project root with:

```bash
# Supabase Configuration
USE_SUPABASE=true
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
# Optional: For admin operations
# SUPABASE_SERVICE_KEY=your-service-role-key-here
```

## Migration Steps

### Step 1: Apply Database Migrations

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your project's SQL Editor:
   `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`

2. Copy and run each migration file in order:
   - `src/infrastructure/supabase/migrations/001_initial_schema.sql`
   - `src/infrastructure/supabase/migrations/002_add_indexes.sql`
   - `src/infrastructure/supabase/migrations/003_rls_policies.sql`
   - `src/infrastructure/supabase/migrations/004_add_vector_search.sql`

3. Verify tables were created:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

**Option B: Via Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Apply migrations
supabase db push
```

### Step 2: Test Connection

```bash
npm run test:supabase
# or
npx tsx scripts/test-supabase.ts
```

Expected output:
```
✅ Supabase connection successful!
✅ Table 'consciousness_states' exists
✅ Table 'semantic_memories' exists
...
```

### Step 3: Migrate Memory Files

**Dry Run (Preview)**
```bash
npm run migrate:supabase -- --dry-run
```

This shows what will be migrated without actually writing to Supabase.

**Actual Migration**
```bash
npm run migrate:supabase
```

The script will:
- Migrate consciousness states from `.memory/introspection/*.json`
- Migrate memory log entries from `.memory/log.md`
- Migrate knowledge base articles from `.memory/knowledge_base/*.json`
- Show progress and statistics

### Step 4: Verify Migration

```bash
npx tsx scripts/verify-supabase-data.ts
```

This script (you may need to create it) checks:
- Number of records in each table
- Data integrity
- No corruption during migration

### Step 5: Clean Up Repository (Optional)

**⚠️ IMPORTANT: Only do this after verifying Step 4!**

Once you've confirmed all data is safely in Supabase:

```bash
# Backup first!
tar -czf memory-backup-$(date +%Y%m%d).tar.gz .memory/

# Move to archive (don't delete yet)
mkdir -p .memory-archive
mv .memory/* .memory-archive/

# Update .gitignore to keep .memory-archive local
echo ".memory-archive/" >> .gitignore
```

Wait a few days/weeks to ensure Supabase is working perfectly before deleting `.memory-archive/`.

## Configuration Options

### Memory System Behavior

In `.env`, you can configure:

```bash
# Use Supabase as primary storage
USE_SUPABASE=true

# Fallback to local files if Supabase unavailable
MEMORY_FALLBACK_TO_LOCAL=true

# Auto-sync local changes to Supabase
MEMORY_AUTO_SYNC=true

# Sync interval (milliseconds)
MEMORY_SYNC_INTERVAL=60000
```

### Hybrid Mode (Recommended)

Keep both local and cloud:
- **Primary**: Supabase (cloud)
- **Backup**: Local `.memory/` files
- **Sync**: Automatic bidirectional

This provides:
- ✅ Cloud accessibility
- ✅ Local backup
- ✅ Offline support
- ✅ Best of both worlds

## Troubleshooting

### Connection Failed
```
Error: Could not connect to Supabase
```

**Solutions:**
1. Check `SUPABASE_URL` format: Must be `https://PROJECT_ID.supabase.co`
2. Verify API key is correct (no extra spaces)
3. Check project is not paused (free tier pauses after 7 days inactivity)

### Table Not Found
```
Error: Could not find table 'consciousness_states'
```

**Solution:** Run migrations (Step 1) first.

### Permission Denied
```
Error: new row violates row-level security policy
```

**Solution:** Check RLS policies in migration 003. May need to disable RLS for service key operations.

### Migration Timeout
If migrating large amounts of data:

```bash
# Increase timeout
MIGRATION_TIMEOUT=300000 npm run migrate:supabase
```

## Architecture

### Tables Created

| Table | Purpose | Size Impact |
|-------|---------|-------------|
| `consciousness_states` | Introspection snapshots | ~50KB per state |
| `semantic_memories` | Knowledge articles | ~10KB per article |
| `episodic_memories` | Session experiences | ~5KB per memory |
| `sessions` | Session metadata | ~1KB per session |
| `thoughts` | Individual thoughts | ~500B per thought |

### Storage Savings

Typical `.memory/` directory:
- **Before**: 584KB in repository
- **After**: ~50KB (latest state only)
- **Savings**: ~534KB (91% reduction)
- **Cloud**: Full history in Supabase

## Next Steps

After migration:
1. Update consciousness modules to use Supabase client
2. Implement auto-save on state changes
3. Add memory search via pgvector semantic search
4. Enable real-time sync across sessions
5. Add memory dashboard (optional)

## Maintenance

### Regular Tasks
- **Weekly**: Check Supabase dashboard for storage usage
- **Monthly**: Review and archive old memories if needed
- **Quarterly**: Export backup via `npm run export:memories`

### Monitoring
```bash
# Check Supabase usage
curl "https://YOUR_PROJECT.supabase.co/rest/v1/consciousness_states?select=count" \
  -H "apikey: YOUR_KEY"
```

## Support

- Supabase Docs: https://supabase.com/docs
- Repository Issues: https://github.com/StableExo/Copilot-Consciousness/issues
- Memory System Design: See `consciousness/dialogues/007_addressing_supabase_concerns_2025-12-04.md`

## Security Notes

- ✅ Row-Level Security (RLS) enabled by default
- ✅ API keys are safe to use in client code (publishable key only)
- ✅ Service key should NEVER be committed to git
- ✅ Encryption available via `export:memories --encrypt`
- ✅ Client-side encryption before upload (future: Phase 3)

---

**Ready?** Start with Step 1: Apply Database Migrations

**Questions?** Check the troubleshooting section or ask in issues.
