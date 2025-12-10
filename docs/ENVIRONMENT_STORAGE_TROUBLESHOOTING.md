# Environment Storage Tables - Troubleshooting Guide

This guide helps resolve issues with the `environment_configs` and `environment_secrets` tables in Supabase.

## Common Issue: "Could not find column in schema cache"

### Problem

When running `verify-environment-tables.ts`, you see:

```
❌ Cannot write to environment_configs: Could not find the 'category' column of 'environment_configs' in the schema cache
```

### Root Cause

PostgREST (Supabase's API layer) caches the database schema. When columns are added via direct SQL migrations, the client-side cache becomes stale and doesn't reflect the actual database structure.

### Solutions

#### Option 1: Apply Hotfix (Recommended)

The hotfix script guides you through applying missing column additions:

```bash
npm run supabase:hotfix-env
# or
node --import tsx scripts/database/apply-environment-hotfix.ts
```

This will:
1. Check your current table structure
2. Provide the hotfix SQL to run in Supabase Dashboard
3. Wait for you to apply it
4. Verify the fix worked

#### Option 2: Reload Schema Cache

Force PostgREST to reload its schema:

```bash
npm run supabase:reload-schema
# or
node --import tsx scripts/database/reload-supabase-schema.ts
```

This sends signals to PostgREST to refresh its cache immediately.

#### Option 3: Wait for Auto-Reload

PostgREST automatically reloads its schema cache every 30-60 seconds. Simply wait a minute and try again:

```bash
# Wait 60 seconds, then:
npm run supabase:verify-env
```

#### Option 4: Use Service Key

Using `SUPABASE_SERVICE_KEY` instead of `SUPABASE_ANON_KEY` gives you better permissions and bypasses some cache issues:

```bash
# In your .env file:
SUPABASE_SERVICE_KEY=your_service_key_here

# Then verify:
npm run supabase:verify-env
```

⚠️ **Security Note**: Service keys have elevated permissions. Only use them in secure environments and never commit them to version control.

## Available Scripts

### Verification

```bash
# Verify environment tables are set up correctly
npm run supabase:verify-env
```

### Hotfix Application

```bash
# Apply missing column additions
npm run supabase:hotfix-env
```

### Schema Reload

```bash
# Force PostgREST to reload schema cache
npm run supabase:reload-schema
```

### Complete Migration

```bash
# Apply all migrations including environment storage
node --import tsx scripts/database/apply-supabase-migrations.ts
```

## Migration Files

### Main Migration
- **File**: `src/infrastructure/supabase/migrations/006_environment_storage.sql`
- **Purpose**: Creates `environment_configs` and `environment_secrets` tables
- **Features**: 
  - Automatic backup of old schema tables
  - Idempotent column additions
  - RLS policies and triggers

### Hotfix Migration
- **File**: `src/infrastructure/supabase/migrations/006_environment_storage_hotfix.sql`
- **Purpose**: Adds missing columns to existing tables
- **Use When**: Schema cache issues or incomplete initial migration

## Table Structures

### environment_configs

Non-sensitive configuration storage:

- `id` - UUID primary key
- `config_name` - Unique configuration name (e.g., 'SUPABASE_URL')
- `config_value` - Configuration value
- `description` - Optional description
- `category` - Category: 'database', 'api', 'blockchain', 'service', 'feature_flag'
- `is_required` - Boolean flag
- `value_type` - Type: 'string', 'number', 'boolean', 'json', 'url'
- `validation_regex` - Optional validation pattern
- `created_at`, `updated_at` - Timestamps
- `created_by`, `updated_by` - Audit fields

### environment_secrets

Encrypted sensitive data storage:

- `id` - UUID primary key
- `config_id` - Optional reference to environment_configs
- `secret_name` - Unique secret name
- `encrypted_value` - Encrypted secret (use SupabaseEnvStorage to encrypt/decrypt)
- `encryption_key_id` - Key reference
- `description` - Optional description
- `category` - Category: 'api_key', 'private_key', 'password', 'token', 'credential'
- `allowed_services` - Array of services allowed to access
- `created_at`, `updated_at`, `last_accessed_at` - Timestamps
- `created_by`, `updated_by` - Audit fields
- `access_count` - Usage tracking

## Using SupabaseEnvStorage Service

After tables are set up, use the `SupabaseEnvStorage` service:

```typescript
import { SupabaseEnvStorage } from './src/services/SupabaseEnvStorage';

const storage = new SupabaseEnvStorage();

// Store non-sensitive config
await storage.setConfig('API_URL', 'https://api.example.com', {
  category: 'api',
  is_required: true,
  value_type: 'url'
});

// Retrieve config
const apiUrl = await storage.getConfig('API_URL');

// Store encrypted secret
await storage.setSecret('API_KEY', 'secret-value', 'encryption-key', {
  category: 'api_key'
});

// Retrieve and decrypt secret
const apiKey = await storage.getSecret('API_KEY', 'encryption-key');

// Import from .env file
const { configs, secrets } = await storage.importFromEnv();
console.log(`Imported ${configs} configs and ${secrets} secrets`);
```

## Debugging Steps

### 1. Check Table Existence

```sql
-- In Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('environment_configs', 'environment_secrets');
```

### 2. Check Column Structure

```sql
-- Check environment_configs columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'environment_configs' 
ORDER BY ordinal_position;

-- Check environment_secrets columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'environment_secrets' 
ORDER BY ordinal_position;
```

### 3. Check RLS Policies

```sql
-- View RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('environment_configs', 'environment_secrets');
```

### 4. Test Direct Insert

```sql
-- Test insert (as service_role)
INSERT INTO environment_configs (config_name, config_value, category, is_required)
VALUES ('TEST_CONFIG', 'test_value', 'test', false);

-- Check if it worked
SELECT * FROM environment_configs WHERE config_name = 'TEST_CONFIG';

-- Clean up
DELETE FROM environment_configs WHERE config_name = 'TEST_CONFIG';
```

## Getting Help

If issues persist after trying all solutions:

1. Check Supabase service status: https://status.supabase.com
2. Review Supabase logs in Dashboard → Logs
3. Verify environment variables are set correctly
4. Ensure database migrations were applied successfully
5. Check for connection issues or firewall rules

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgREST Schema Cache](https://postgrest.org/en/stable/admin.html#schema-cache)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
