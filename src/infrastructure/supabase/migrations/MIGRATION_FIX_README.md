# Environment Storage Migration Fix

## Problem

The migration `006_environment_storage.sql` was failing with the error:

```
ERROR: 42703: column "category" does not exist
```

This occurred because the tables `environment_configs` and `environment_secrets` already existed in the database from a previous incomplete migration, but were missing several columns including `category`.

## Solution

The main migration file has been updated to include `ALTER TABLE` statements that add missing columns if they don't exist. This makes the migration idempotent (safe to run multiple times).

## How to Apply the Fix

### Option 1: Run the Hotfix Script (Quickest)

If you have existing tables and just need to add the missing columns:

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the contents of `006_environment_storage_hotfix.sql`
3. Run the query
4. You should see success messages for each column added

### Option 2: Run the Full Migration (Recommended)

The full migration `006_environment_storage.sql` now includes the hotfix:

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the contents of `006_environment_storage.sql`
3. Run the query
4. The migration will:
   - Create tables if they don't exist
   - Add missing columns to existing tables
   - Create indexes
   - Set up RLS policies
   - Create triggers and functions

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

```sql
-- Check that columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('environment_configs', 'environment_secrets')
ORDER BY table_name, ordinal_position;

-- Check that indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('environment_configs', 'environment_secrets');
```

Or use the provided verification script:

```bash
node --import tsx scripts/database/verify-environment-tables.ts
```

## Why This Happened

The original migration used `CREATE TABLE IF NOT EXISTS`, which is correct for creating new tables. However, if a table already exists from a previous migration attempt:

1. `CREATE TABLE IF NOT EXISTS` does nothing (skips creation)
2. The table structure remains as it was (without new columns)
3. Later statements like `CREATE INDEX` fail because columns don't exist

The fix adds explicit `ALTER TABLE ADD COLUMN` statements with existence checks, ensuring all columns are present regardless of how/when the table was created.
