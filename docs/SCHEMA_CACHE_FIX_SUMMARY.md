# Schema Cache Fix - Complete Summary

## Problem Statement

When running the environment storage verification script:

```bash
node --import tsx scripts/database/verify-environment-tables.ts
```

The script fails at step 5 with the error:

```
❌ Cannot write to environment_configs: Could not find the 'category' column of 'environment_configs' in the schema cache
```

## Root Cause Analysis

**The Issue**: PostgREST (Supabase's REST API layer) maintains an internal cache of the database schema. When database columns are added via direct SQL migrations, PostgREST's cache becomes stale and doesn't reflect the actual database structure.

**Why It Happens**:
1. Migrations add columns directly to PostgreSQL tables
2. PostgREST caches table schemas for performance
3. The cache doesn't automatically invalidate when schema changes occur
4. Client API calls use the cached schema, which is missing the new columns
5. Attempts to insert data with new columns fail with "column not found in schema cache"

**Key Insight**: The columns *do exist* in the database - you can verify this by querying PostgreSQL directly. The issue is purely with PostgREST's cached view of the schema.

## Solution Overview

We've implemented a multi-layered solution to handle this issue:

### 1. Enhanced Verification Script ✅
**File**: `scripts/database/verify-environment-tables.ts`

**What It Does**:
- Detects schema cache issues automatically
- Provides clear, actionable troubleshooting instructions
- Shows 4 different fix options
- Continues verification even if write test fails

**Usage**:
```bash
npm run supabase:verify-env
```

### 2. Schema Reload Script ✅
**File**: `scripts/database/reload-supabase-schema.ts`

**What It Does**:
- Attempts to send NOTIFY signal to PostgREST
- Forces schema refresh with metadata queries
- Waits for PostgREST to process updates
- Verifies schema is accessible

**Usage**:
```bash
npm run supabase:reload-schema
```

**Limitations**: 
- May not work if PostgREST doesn't support NOTIFY from client
- Depends on PostgREST configuration
- Some Supabase plans may have this disabled

### 3. Hotfix Application Guide ✅
**File**: `scripts/database/apply-environment-hotfix.ts`

**What It Does**:
- Checks current table structure
- Provides the exact SQL to apply
- Gives direct link to Supabase SQL Editor
- Guides you through manual application
- Verifies fix after application

**Usage**:
```bash
npm run supabase:hotfix-env
```

### 4. Comprehensive Documentation ✅
**Files**:
- `docs/ENVIRONMENT_STORAGE_TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `docs/ENVIRONMENT_STORAGE_FIX_TESTING.md` - Testing procedures
- This summary document

## How to Fix the Issue

### Option 1: Wait for Auto-Reload (Simplest)
PostgREST automatically reloads its schema cache periodically (typically every 30-60 seconds).

```bash
# Wait 1-2 minutes, then test again
sleep 60
npm run supabase:verify-env
```

**Pros**: No action required
**Cons**: May take several minutes; not guaranteed to work

### Option 2: Apply Hotfix SQL (Recommended)
This ensures all columns are added and triggers a schema reload.

```bash
# Step 1: Run hotfix script
npm run supabase:hotfix-env

# Step 2: Follow instructions to apply SQL in Supabase Dashboard
# The script will provide:
#   - Direct link to SQL Editor
#   - The exact SQL to run
#   - Instructions on what to do

# Step 3: Press Enter when done

# Step 4: Verify
npm run supabase:verify-env
```

**Pros**: Most reliable; ensures all columns exist
**Cons**: Requires manual step in Supabase Dashboard

### Option 3: Reload Schema Cache (Quick)
Try to force PostgREST to reload immediately.

```bash
# Step 1: Run reload script
npm run supabase:reload-schema

# Step 2: Wait a moment
sleep 10

# Step 3: Verify
npm run supabase:verify-env
```

**Pros**: Quick, no manual SQL required
**Cons**: May not work on all Supabase plans

### Option 4: Use Different Credentials
Using `SUPABASE_SERVICE_KEY` instead of `SUPABASE_ANON_KEY` sometimes bypasses cache issues.

```bash
# Set service key
export SUPABASE_SERVICE_KEY=your_service_key_here

# Verify
npm run supabase:verify-env
```

**Pros**: Simple environment variable change
**Cons**: Still may not resolve underlying cache issue

## The Hotfix SQL

The hotfix adds missing columns to existing tables. Here's what it does:

```sql
-- Adds to environment_configs:
ALTER TABLE environment_configs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE environment_configs ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;
ALTER TABLE environment_configs ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'string';
ALTER TABLE environment_configs ADD COLUMN IF NOT EXISTS validation_regex TEXT;

-- Adds to environment_secrets:
ALTER TABLE environment_secrets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE environment_secrets ADD COLUMN IF NOT EXISTS encryption_key_id TEXT;
ALTER TABLE environment_secrets ADD COLUMN IF NOT EXISTS allowed_services TEXT[] DEFAULT '{}';
ALTER TABLE environment_secrets ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;
ALTER TABLE environment_secrets ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

-- Creates indexes
CREATE INDEX IF NOT EXISTS idx_environment_configs_category ON environment_configs(category);
CREATE INDEX IF NOT EXISTS idx_environment_configs_is_required ON environment_configs(is_required);
CREATE INDEX IF NOT EXISTS idx_environment_secrets_category ON environment_secrets(category);
```

**Safe to run multiple times** - Uses `IF NOT EXISTS` clauses.

## Quick Reference

### NPM Scripts
```bash
npm run supabase:verify-env      # Verify tables and detect issues
npm run supabase:reload-schema   # Force schema cache reload
npm run supabase:hotfix-env      # Apply hotfix with guidance
```

### Direct Script Execution
```bash
# With environment variables
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node --import tsx scripts/database/verify-environment-tables.ts
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node --import tsx scripts/database/reload-supabase-schema.ts
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node --import tsx scripts/database/apply-environment-hotfix.ts
```

## Expected Results After Fix

When the fix is successful, verification should show:

```
🔍 Verifying Environment Storage Tables...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Supabase URL: https://your-project.supabase.co
🔗 Connecting to database...

1️⃣  Testing environment_configs table...
   ✅ environment_configs table exists
   📊 Current rows: 0

2️⃣  Testing environment_secrets table...
   ✅ environment_secrets table exists
   📊 Current rows: 0

3️⃣  Verifying environment_configs structure...
   ✅ Structure verified

4️⃣  Verifying environment_secrets structure...
   ✅ Structure verified

5️⃣  Testing write permissions...
   ✅ Write permissions OK
   🧹 Test entry cleaned up

6️⃣  Listing existing configurations...
   📋 No configurations stored yet

7️⃣  Listing existing secrets...
   🔐 No secrets stored yet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All verification checks passed!
```

## Technical Details

### PostgREST Schema Cache
- **Purpose**: Performance optimization - avoid querying pg_catalog on every request
- **Reload Triggers**:
  - Time-based (configurable interval, typically 60s)
  - NOTIFY signal on `pgrst` channel
  - Process restart
- **Cache Contents**: Table names, column names, types, foreign keys, RLS policies

### Why Migrations Cause Issues
1. Migration applies via postgres client (direct SQL)
2. PostgREST not notified of change
3. Cache contains old schema
4. API requests use cached schema
5. New columns appear as "not found"

### Why This Matters
Without the fix:
- ❌ Cannot use SupabaseEnvStorage service
- ❌ Cannot store environment configurations
- ❌ Cannot store encrypted secrets
- ❌ Application features dependent on env storage fail

With the fix:
- ✅ Full access to environment storage
- ✅ Can store and retrieve configs
- ✅ Can store and retrieve encrypted secrets
- ✅ Application features work correctly

## Testing Checklist

After applying any fix:

- [ ] Run `npm run supabase:verify-env`
- [ ] All 7 checks pass
- [ ] No schema cache errors
- [ ] Write permissions test succeeds
- [ ] Can create and delete test entries
- [ ] SupabaseEnvStorage service works

## Support and Further Help

### Documentation
- **Troubleshooting**: `docs/ENVIRONMENT_STORAGE_TROUBLESHOOTING.md`
- **Testing Guide**: `docs/ENVIRONMENT_STORAGE_FIX_TESTING.md`
- **This Summary**: `docs/SCHEMA_CACHE_FIX_SUMMARY.md`

### Common Questions

**Q: Why does the error mention "schema cache" if columns exist?**
A: The columns exist in PostgreSQL, but PostgREST's API layer has an outdated cached view.

**Q: Will this affect production?**
A: The hotfix SQL is safe and idempotent. It only adds missing columns if they don't exist.

**Q: How often does this happen?**
A: Usually only after initial migration or when adding new columns to existing tables.

**Q: Can I prevent this in the future?**
A: Use Supabase's migration tools (supabase db push) which handle cache invalidation automatically.

**Q: What if the fix doesn't work?**
A: Try restarting the Supabase PostgREST service via Dashboard → Settings → API, or wait longer for auto-reload.

## Summary

This fix provides:
1. **Detection** - Automatically identifies schema cache issues
2. **Guidance** - Clear instructions on how to resolve
3. **Tools** - Scripts to reload cache and apply fixes
4. **Documentation** - Comprehensive guides for troubleshooting
5. **Prevention** - Better understanding to avoid future issues

The core solution is applying the hotfix SQL in Supabase Dashboard to ensure all columns exist and trigger a schema reload.
