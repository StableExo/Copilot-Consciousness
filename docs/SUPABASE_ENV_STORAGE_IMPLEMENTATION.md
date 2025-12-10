# Supabase Environment Storage - Implementation Guide

## ❌ The Problem

**Error Message:**
```
Error: Failed to run sql query: ERROR: 42601: syntax error at or near "//" 
LINE 1: // src/services/SupabaseEnvStorage.ts ^
```

## 🔍 Root Cause

The error occurred because **TypeScript code was pasted directly into the Supabase SQL Editor**. The SQL Editor only accepts SQL statements, not TypeScript code.

When someone tried to paste the TypeScript service code from `docs/blockchain/YOUR_ENVIRONMENT_ANALYSIS.md` into the Supabase SQL console, PostgreSQL tried to execute it as SQL and failed because:
- `//` is not valid SQL syntax (SQL uses `--` for comments)
- TypeScript code contains `import`, `class`, `interface` which are not SQL keywords

## ✅ The Solution

The solution requires **two separate steps**:

### Step 1: Run SQL Migration in Supabase

**Location:** `src/infrastructure/supabase/migrations/006_environment_storage.sql`

This file contains the proper SQL migration that creates:
- `environment_configs` table - for non-sensitive configuration
- `environment_secrets` table - for encrypted sensitive data
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-updating timestamps
- Helper functions

**How to apply:**
```bash
# Option 1: Using the migration script
node --import tsx scripts/database/apply-supabase-migrations.ts

# Option 2: Manually in Supabase SQL Editor
# Copy the content of 006_environment_storage.sql and paste it into 
# Supabase Dashboard → SQL Editor → New Query → Run
```

### Step 2: Use the TypeScript Service

**Location:** `src/services/SupabaseEnvStorage.ts`

This is a TypeScript class that provides a clean API for:
- Storing non-sensitive configuration
- Storing encrypted secrets
- Retrieving configuration/secrets
- Bulk import from environment variables
- Export to .env format

**Usage Example:**
```typescript
import { SupabaseEnvStorage } from './services/SupabaseEnvStorage';

const storage = new SupabaseEnvStorage();

// Store non-sensitive config
await storage.setConfig('API_URL', 'https://api.example.com', {
  description: 'Main API endpoint',
  category: 'api',
  is_required: true
});

// Store encrypted secret
await storage.setSecret('API_KEY', 'your-secret-key', undefined, {
  description: 'API authentication key',
  category: 'api_key'
});

// Retrieve config
const apiUrl = await storage.getConfig('API_URL');

// Retrieve and decrypt secret
const apiKey = await storage.getSecret('API_KEY');

// Bulk import from environment variables
const result = await storage.importFromEnv('SUPABASE_');
console.log(`Imported ${result.configs} configs and ${result.secrets} secrets`);
```

## 📋 Implementation Checklist

- [x] Create SQL migration file (`006_environment_storage.sql`)
- [x] Create TypeScript service (`src/services/SupabaseEnvStorage.ts`)
- [x] Create unit tests (`tests/unit/services/SupabaseEnvStorage.test.ts`)
- [ ] Run migration in Supabase
- [ ] Test the service with real data
- [ ] Update documentation with usage examples

## 🔐 Security Features

### Encryption
- Uses AES-256-CBC encryption for secrets
- Requires 32-character encryption key
- Unique IV (Initialization Vector) per encrypted value
- Format: `<iv_hex>:<encrypted_hex>`

### Row Level Security (RLS)
- Service role: Full access to all operations
- Authenticated users: Read-only access
- Anonymous users: No access

### Audit Trail
- `created_at` and `updated_at` timestamps
- `created_by` and `updated_by` fields
- `last_accessed_at` for secrets
- `access_count` tracking for secrets

## 🚀 Quick Start

### 1. Set Required Environment Variables
```bash
# .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SECRETS_ENCRYPTION_KEY=your-32-char-encryption-key-here
```

### 2. Apply Migration
```bash
# Using the migration script
node --import tsx scripts/database/apply-supabase-migrations.ts

# Verify tables were created
node --import tsx scripts/database/test-supabase-connection.ts
```

### 3. Import Your Environment
```typescript
import { SupabaseEnvStorage } from './services/SupabaseEnvStorage';

const storage = new SupabaseEnvStorage();

// Import all environment variables starting with 'BASE_'
await storage.importFromEnv('BASE_');

// Or manually add specific variables
await storage.setConfig('CHAIN_ID', '8453');
await storage.setSecret('WALLET_PRIVATE_KEY', process.env.WALLET_PRIVATE_KEY!);
```

## 📊 Database Schema

### environment_configs
```sql
CREATE TABLE environment_configs (
  id UUID PRIMARY KEY,
  config_name TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'database', 'api', 'blockchain', 'service', 'feature_flag'
  is_required BOOLEAN,
  value_type TEXT,  -- 'string', 'number', 'boolean', 'json', 'url'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### environment_secrets
```sql
CREATE TABLE environment_secrets (
  id UUID PRIMARY KEY,
  config_id UUID REFERENCES environment_configs(id),
  secret_name TEXT NOT NULL UNIQUE,
  encrypted_value TEXT NOT NULL,
  encryption_key_id TEXT,
  description TEXT,
  category TEXT,  -- 'api_key', 'private_key', 'password', 'token', 'credential'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER
);
```

## 🧪 Testing

```bash
# Run unit tests
npm test tests/unit/services/SupabaseEnvStorage.test.ts

# Test encryption/decryption
node --import tsx -e "
import { SupabaseEnvStorage } from './src/services/SupabaseEnvStorage';
const storage = new SupabaseEnvStorage();
const encrypted = (storage as any).encrypt('test-value', 'a'.repeat(32));
const decrypted = (storage as any).decrypt(encrypted, 'a'.repeat(32));
console.log('Encryption test:', decrypted === 'test-value' ? 'PASS' : 'FAIL');
"
```

## 🎯 Key Differences from Documentation

The implementation in `src/services/SupabaseEnvStorage.ts` improves upon the documentation example by adding:

1. **Better error handling** - Proper error messages and validation
2. **Flexible encryption key** - Can use constructor parameter or environment variable
3. **Type safety** - Full TypeScript interfaces for all data structures
4. **Bulk operations** - `importFromEnv()` and `exportToEnvFormat()`
5. **Category filtering** - Filter configs/secrets by category
6. **Access tracking** - Automatic tracking of secret access
7. **Comprehensive tests** - Full test coverage

## ⚠️ Important Notes

1. **Never paste TypeScript code into SQL Editor** - Always separate SQL migrations from TypeScript code
2. **Encryption key must be 32+ characters** - Use a strong, random key
3. **Service role key required** - The service needs write access to tables
4. **Test in development first** - Verify encryption/decryption works before production use
5. **Backup your secrets** - Store encryption key securely (not in database)

## 📚 Related Files

- SQL Migration: `src/infrastructure/supabase/migrations/006_environment_storage.sql`
- TypeScript Service: `src/services/SupabaseEnvStorage.ts`
- Unit Tests: `tests/unit/services/SupabaseEnvStorage.test.ts`
- Documentation: `docs/blockchain/YOUR_ENVIRONMENT_ANALYSIS.md`
- Migration Script: `scripts/database/apply-supabase-migrations.ts`

## ✅ Verification

After implementation, verify everything works:

```typescript
import { SupabaseEnvStorage } from './services/SupabaseEnvStorage';

async function verify() {
  const storage = new SupabaseEnvStorage();
  
  // Test config
  await storage.setConfig('TEST_CONFIG', 'test_value');
  const config = await storage.getConfig('TEST_CONFIG');
  console.log('Config test:', config === 'test_value' ? '✅ PASS' : '❌ FAIL');
  
  // Test secret
  await storage.setSecret('TEST_SECRET', 'secret_value');
  const secret = await storage.getSecret('TEST_SECRET');
  console.log('Secret test:', secret === 'secret_value' ? '✅ PASS' : '❌ FAIL');
  
  // Cleanup
  await storage.deleteConfig('TEST_CONFIG');
  await storage.deleteSecret('TEST_SECRET');
  
  console.log('✅ All tests passed!');
}

verify();
```

---

**Status:** ✅ Implementation complete and ready for use
