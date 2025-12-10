# Environment Storage Migration Fix

## Problem

The migration `006_environment_storage.sql` was failing with errors:

1. **First error**: `ERROR: 42703: column "category" does not exist`
2. **Second error**: `ERROR: 42703: column "config_name" of relation "environment_configs" does not exist`

### Root Cause

There are TWO issues:

1. **Missing columns**: Tables existed from a previous incomplete migration but were missing several columns
2. **Incompatible schema**: The existing `environment_configs` table has a COMPLETELY DIFFERENT schema than expected:

**Existing table schema** (old/incorrect):
```
- id, created_at, updated_at, environment, version, description, deployed
- config_data (JSON), chain_id, network, contract_address
- deployment_tx_hash, created_by, last_modified_by
```

**Expected table schema** (new/correct):
```
- id, config_name, config_value, description, category
- is_required, value_type, validation_regex
- created_at, updated_at, created_by, updated_by
```

These are fundamentally different tables. The old one appears to be for deployment/network configuration, while the new one is for key-value environment variables (as expected by `SupabaseEnvStorage.ts`).

## Solution

The migration has been updated to handle both scenarios:

1. **Backup incompatible tables**: If the existing table has the old schema (detected by presence of `config_data` column), it's renamed to `*_old_backup`
2. **Add missing columns**: If the table has the new schema but is missing columns, they are added with `ALTER TABLE`
3. **Create new tables**: If tables don't exist, they are created with the correct schema

The migration is now idempotent and handles all three cases:
- No table exists → Create new table
- Old incompatible schema exists → Rename old table, create new table
- New schema exists but missing columns → Add missing columns

## How to Apply the Fix

### Option 1: Run the Hotfix Script (Quickest)

The hotfix will:
- Detect if you have the old incompatible schema and back it up
- Add missing columns if you have the new schema
- Create indexes

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the contents of `006_environment_storage_hotfix.sql`
3. Run the query
4. Check the output message:
   - If it says "Old table backed up", proceed to run the full migration next
   - If it says "columns added", you're done!

### Option 2: Run the Full Migration (Recommended)

The full migration now includes all fixes:

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the contents of `006_environment_storage.sql`
3. Run the query
4. The migration will:
   - Back up any old tables with incompatible schema
   - Create new tables with correct schema
   - Add missing columns to existing correct tables
   - Create indexes, RLS policies, triggers, and functions

### Option 3: Using the CLI (If you have direct database access)

```bash
# Apply just the hotfix
npm run supabase:migrate -- --file src/infrastructure/supabase/migrations/006_environment_storage_hotfix.sql

# Or apply the full migration
npm run supabase:migrate -- --file src/infrastructure/supabase/migrations/006_environment_storage.sql
```

## What Changed

The migration now uses this pattern for each table:

```sql
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS environment_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_name TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  -- ... other columns
  category TEXT
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'environment_configs' 
      AND column_name = 'category'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN category TEXT;
  END IF;
  -- ... other columns
END $$;

-- Now safe to create indexes on those columns
CREATE INDEX IF NOT EXISTS idx_environment_configs_category 
  ON environment_configs(category);
```

## Verification

After applying the fix, verify it worked:

### Check for backed up tables

```sql
-- Check if old tables were renamed
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%_old_backup';
```

### Check new table structure

```sql
-- Check that columns exist in new tables
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('environment_configs', 'environment_secrets')
ORDER BY table_name, ordinal_position;
```

### Check indexes

```sql
-- Check that indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('environment_configs', 'environment_secrets');
```

### Use the verification script

```bash
node --import tsx scripts/database/verify-environment-tables.ts
```

## What Happens to Old Data?

If your existing `environment_configs` table had the old schema (with `config_data`, `deployment_tx_hash`, etc.), it has been renamed to `environment_configs_old_backup`. 

**The old data is preserved** but is not automatically migrated. If you need that data:

1. The backed up table remains in your database with all its data
2. You can query it: `SELECT * FROM environment_configs_old_backup;`
3. If you need to migrate the data to the new schema, you'll need a custom migration script (contact maintainers for assistance)
4. If you don't need the old data, you can drop the backup table:
   ```sql
   DROP TABLE IF EXISTS environment_configs_old_backup;
   DROP TABLE IF EXISTS environment_secrets_old_backup;
   ```

## Why This Happened

The original migration used `CREATE TABLE IF NOT EXISTS`, which is correct for creating new tables. However, if a table already exists from a previous migration attempt:

1. `CREATE TABLE IF NOT EXISTS` does nothing (skips creation)
2. The table structure remains as it was (without new columns)
3. Later statements like `CREATE INDEX` fail because columns don't exist

The fix adds explicit `ALTER TABLE ADD COLUMN` statements with existence checks, ensuring all columns are present regardless of how/when the table was created.
