# Database Scripts - Environment Storage Tools

This directory contains scripts for managing Supabase environment storage tables.

## Quick Start - Fix Schema Cache Issue

If you're seeing the error:
```
❌ Cannot write to environment_configs: Could not find the 'category' column of 'environment_configs' in the schema cache
```

**Run this:**
```bash
npm run supabase:hotfix-env
```

Then follow the on-screen instructions to apply the hotfix SQL in Supabase Dashboard.

## Available Scripts

### Verification
```bash
npm run supabase:verify-env
# or
node --import tsx scripts/database/verify-environment-tables.ts
```
Verifies that environment storage tables exist and are properly configured.

### Schema Reload
```bash
npm run supabase:reload-schema
# or
node --import tsx scripts/database/reload-supabase-schema.ts
```
Forces PostgREST to reload its schema cache.

### Hotfix Application
```bash
npm run supabase:hotfix-env
# or
node --import tsx scripts/database/apply-environment-hotfix.ts
```
Guides you through applying the hotfix migration to add missing columns.

### Migration Application
```bash
node --import tsx scripts/database/apply-supabase-migrations.ts
```
Applies all Supabase migrations including environment storage setup.

## File Descriptions

### Core Scripts

- **`verify-environment-tables.ts`** - Comprehensive verification of environment storage tables
  - Checks table existence
  - Verifies column structure
  - Tests write permissions
  - Lists existing data
  - Detects schema cache issues

- **`reload-supabase-schema.ts`** - Forces PostgREST schema cache reload
  - Sends NOTIFY signal to PostgREST
  - Forces metadata queries
  - Waits for cache processing
  - Verifies columns are accessible

- **`apply-environment-hotfix.ts`** - Guided hotfix application
  - Checks current structure
  - Provides SQL to apply
  - Links to Supabase SQL Editor
  - Verifies after application

- **`apply-supabase-migrations.ts`** - Complete migration runner
  - Applies all migration files
  - Handles connection issues
  - Provides fallback options

### Migration Files

Located in `src/infrastructure/supabase/migrations/`:

- **`006_environment_storage.sql`** - Main migration
  - Creates environment_configs table
  - Creates environment_secrets table
  - Sets up RLS policies
  - Adds triggers and indexes

- **`006_environment_storage_hotfix.sql`** - Hotfix migration
  - Adds missing columns if not present
  - Idempotent (safe to run multiple times)
  - Handles incomplete migrations

### Utility Scripts

- **`check-schema-debug.ts`** - Debug script to check what columns exist
- **`supabase-config.ts`** - Supabase configuration helpers
- **`test-supabase-connection.ts`** - Tests basic connectivity

## Environment Variables

Required:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key  # Recommended
# or
SUPABASE_ANON_KEY=your_anon_key        # Limited permissions
```

Optional:
```bash
DATABASE_URL=postgresql://...  # For direct postgres connection
```

## Workflow

### First Time Setup

1. **Apply migrations**:
   ```bash
   node --import tsx scripts/database/apply-supabase-migrations.ts
   ```

2. **Verify setup**:
   ```bash
   npm run supabase:verify-env
   ```

3. **If issues, apply hotfix**:
   ```bash
   npm run supabase:hotfix-env
   ```

### Schema Cache Issues

If you see "column not found in schema cache":

**Option 1 - Quick Fix (Recommended)**:
```bash
npm run supabase:hotfix-env
# Follow instructions to apply SQL
```

**Option 2 - Force Reload**:
```bash
npm run supabase:reload-schema
```

**Option 3 - Wait**:
```bash
# Wait 60 seconds for auto-reload
sleep 60
npm run supabase:verify-env
```

## Common Issues

### "Module not found" Error
```bash
npm install
```

### "Unsupported engine" Error
```bash
nvm install 22
nvm use 22
# or
nvm alias default 22
```

### "Connection refused" Error
Check:
- SUPABASE_URL is correct
- Internet connection works
- Firewall allows connections
- Try using DATABASE_URL instead

### "Permission denied" Error
Use SERVICE_KEY instead of ANON_KEY:
```bash
export SUPABASE_SERVICE_KEY=your_service_key
```

## Table Structure

### environment_configs (12 columns)
Non-sensitive configuration storage:
- `id`, `config_name`, `config_value`
- `description`, `category`, `is_required`
- `value_type`, `validation_regex`
- `created_at`, `updated_at`
- `created_by`, `updated_by`

### environment_secrets (14 columns)
Encrypted sensitive data:
- `id`, `config_id`, `secret_name`
- `encrypted_value`, `encryption_key_id`
- `description`, `category`, `allowed_services`
- `created_at`, `updated_at`, `last_accessed_at`
- `created_by`, `updated_by`, `access_count`

## Documentation

- **Troubleshooting Guide**: `docs/ENVIRONMENT_STORAGE_TROUBLESHOOTING.md`
- **Testing Guide**: `docs/ENVIRONMENT_STORAGE_FIX_TESTING.md`
- **Complete Summary**: `docs/SCHEMA_CACHE_FIX_SUMMARY.md`

## Using the Service

After tables are set up:

```typescript
import { SupabaseEnvStorage } from './src/services/SupabaseEnvStorage';

const storage = new SupabaseEnvStorage();

// Store config
await storage.setConfig('API_URL', 'https://api.example.com');

// Get config
const url = await storage.getConfig('API_URL');

// Store secret
await storage.setSecret('API_KEY', 'secret', 'encryption-key');

// Get secret
const key = await storage.getSecret('API_KEY', 'encryption-key');
```

## Need Help?

1. Check the troubleshooting guide
2. Run verification with verbose output
3. Review Supabase logs in Dashboard
4. Ensure environment variables are set
5. Try the hotfix script

For detailed explanations, see the documentation files listed above.
