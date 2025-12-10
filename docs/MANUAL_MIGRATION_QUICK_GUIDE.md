# Quick Guide: Manual Supabase Migrations

## ✅ This is the recommended approach when automated migrations fail!

### Step 1: Run the Migration Helper Script

```bash
node --import tsx scripts/database/apply-migrations-via-api.ts
```

This will output all migration SQL files in order with clear separators.

### Step 2: Copy Each Migration to Supabase SQL Editor

1. **Open Supabase SQL Editor**
   - Direct link: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql/new
   - Or navigate: Dashboard → SQL Editor → New Query

2. **For each migration** (in this order):
   - `001_initial_schema.sql` - Creates base tables
   - `002_add_indexes.sql` - Adds indexes
   - `002B_add_missing_indexes.sql` - Additional indexes
   - `003_rls_policies.sql` - Row Level Security policies
   - `004_add_vector_search.sql` - Vector search support
   - `005_documentation_storage.sql` - Documentation tables
   - **`006_environment_storage.sql`** - Environment config tables ⭐ (This is the one from your issue!)

3. **For each migration file:**
   - Copy the SQL content from the terminal output
   - Paste it into the SQL Editor
   - Click the "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for success confirmation
   - Move to the next migration

### Step 3: Verify Tables Were Created

After running all migrations, verify in Supabase:
- Go to: Table Editor (Dashboard → Table Editor)
- You should see tables like:
  - `consciousness_states`
  - `semantic_memories`
  - `episodic_memories`
  - `environment_configs` ⭐ (New from migration 006)
  - `environment_secrets` ⭐ (New from migration 006)
  - And others...

Or test with the verification script:
```bash
node --import tsx scripts/database/test-supabase-connection.ts
```

## Alternative: Copy Files Directly

If you prefer, you can also copy the SQL files directly:

```bash
# View a specific migration
cat src/infrastructure/supabase/migrations/006_environment_storage.sql

# Copy all content, then paste in SQL Editor
```

## Why Manual Works Better

✅ **No network connectivity issues** - Uses HTTPS web dashboard  
✅ **Better visibility** - See exactly what's being executed  
✅ **Step-by-step control** - Run one migration at a time  
✅ **Error handling** - See SQL errors immediately in the UI  
✅ **Works anywhere** - From any machine with web access  

## Migration 006: Environment Storage

This migration creates tables for storing your environment configuration securely:

- **environment_configs** - Non-sensitive config (URLs, chain IDs, etc.)
- **environment_secrets** - Encrypted sensitive data (API keys, private keys)
- Includes RLS policies for security
- Audit trail with timestamps and user tracking

This is what enables the environment storage feature from `YOUR_ENVIRONMENT_ANALYSIS.md`!

---

**Status**: ✅ Ready to run  
**User Confirmed**: "Manually adding the tables on my side seem to work pretty good"
