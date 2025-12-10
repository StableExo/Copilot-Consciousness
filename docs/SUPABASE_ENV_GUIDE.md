# Environment Variables: Supabase Integration Guide

**Purpose**: Enable TheWarden and AI agents to access configuration without pasting credentials every session.

## Overview

TheWarden can now store and retrieve environment variables from Supabase, providing:

- ✅ **Persistent storage** - Variables survive across sessions
- ✅ **Centralized management** - One source of truth for all deployments
- ✅ **Encrypted secrets** - Sensitive data stored securely
- ✅ **No copy/paste needed** - AI agents can load vars directly from Supabase
- ✅ **Version control** - Track configuration changes over time

## Quick Start

### 1. Enable Supabase in .env

```bash
# Required Supabase credentials (keep these in .env)
USE_SUPABASE=true
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SECRETS_ENCRYPTION_KEY=your-32-character-encryption-key
```

### 2. Upload Your Environment to Supabase

**Option A: From .env file**
```bash
npm run env:add-production
```

This reads your current `.env` file and uploads all variables to Supabase.

**Option B: Manually add variables**
```typescript
import { saveEnvVar } from './src/utils/supabaseEnvLoader';

// Save a configuration (non-sensitive)
await saveEnvVar('RPC_URL', 'https://mainnet.base.org', {
  category: 'blockchain',
  description: 'Base mainnet RPC endpoint'
});

// Save a secret (encrypted)
await saveEnvVar('PRIVATE_KEY', '0x...', {
  isSecret: true,
  category: 'blockchain',
  description: 'Wallet private key'
});
```

### 3. View Variables from Supabase

```bash
# View all configurations
npm run env:show

# View specific category
npm run env:show blockchain

# View secrets (masked by default)
npm run env:show:secrets

# View secrets unmasked (be careful!)
node --import tsx scripts/show-env-from-supabase.ts --secrets --no-mask
```

### 4. Start TheWarden with Supabase Environment

```bash
# Development
npm run start:supabase

# Mainnet
npm run start:mainnet:supabase
```

## How It Works

### Startup Flow

```
1. Load .env file (for Supabase credentials)
   ↓
2. Connect to Supabase
   ↓
3. Load environment_configs table (non-sensitive)
   ↓
4. Load environment_secrets table (encrypted)
   ↓
5. Decrypt secrets using SECRETS_ENCRYPTION_KEY
   ↓
6. Merge into process.env (local .env takes precedence)
   ↓
7. Start TheWarden with full configuration
```

### Database Tables

**environment_configs** - Non-sensitive configuration
```
- config_name (e.g., 'RPC_URL')
- config_value (plain text)
- category ('blockchain', 'api', 'database', etc.)
- description
- created_at / updated_at
```

**environment_secrets** - Encrypted sensitive data
```
- secret_name (e.g., 'PRIVATE_KEY')
- encrypted_value (AES-256 encrypted)
- encryption_key_id (key identifier)
- category
- description
- created_at / updated_at
```

## For AI Agents

### Quick Access Pattern

When starting a new session:

```bash
# 1. View current environment
npm run env:show

# 2. View secrets if needed
npm run env:show:secrets

# 3. Start TheWarden with loaded environment
npm run start:supabase
```

### Programmatic Access

```typescript
import { loadEnvVar } from './src/utils/supabaseEnvLoader';

// Load a specific variable
const rpcUrl = await loadEnvVar('RPC_URL');

// Load a secret
const privateKey = await loadEnvVar('PRIVATE_KEY', { isSecret: true });
```

### Full Environment Load

```typescript
import { loadEnvFromSupabase } from './src/utils/supabaseEnvLoader';

const result = await loadEnvFromSupabase({
  environment: 'production',
  loadSecrets: true,
  required: ['RPC_URL', 'PRIVATE_KEY', 'CHAIN_ID']
});

if (result.success) {
  console.log(`Loaded ${result.configsLoaded} configs`);
  console.log(`Loaded ${result.secretsLoaded} secrets`);
} else {
  console.error('Errors:', result.errors);
}
```

## Configuration Categories

Organize variables by category for easier management:

- **blockchain** - RPC URLs, chain IDs, contract addresses
- **api** - API keys, endpoints, rate limits
- **database** - Database URLs, credentials
- **service** - Service configurations, ports, hosts
- **feature_flag** - Feature toggles, A/B tests

Example:
```bash
# View only blockchain configs
npm run env:show blockchain

# View only API configs
npm run env:show api
```

## Security Best Practices

### What to Store in Supabase

✅ **Store in Supabase (as secrets):**
- Private keys
- API keys
- Database passwords
- Encryption keys (other than SECRETS_ENCRYPTION_KEY)

✅ **Store in Supabase (as configs):**
- RPC URLs
- Contract addresses
- Chain IDs
- Feature flags
- Non-sensitive configuration

❌ **Keep ONLY in local .env:**
- `SECRETS_ENCRYPTION_KEY` - The master key for decrypting secrets
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` - Needed to connect

### Encryption Key Management

The `SECRETS_ENCRYPTION_KEY` is the master key. It should be:
- ✅ 32 characters or longer
- ✅ Stored only in local .env files
- ✅ Never committed to git
- ✅ Backed up securely offline
- ✅ Rotated periodically

**Generate a secure key:**
```bash
# Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Troubleshooting

### "Supabase credentials not found"

**Solution**: Add to .env:
```bash
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
```

### "Cannot decrypt secret"

**Causes**:
1. Wrong encryption key
2. Secret encrypted with different key
3. Corrupted encrypted value

**Solution**:
```bash
# Re-encrypt with correct key
SECRETS_ENCRYPTION_KEY=your-correct-key npm run env:add-production
```

### "Required variable missing"

**Solution**: Add the variable to Supabase:
```bash
# Add manually using the script
node --import tsx scripts/add-production-env-to-supabase.ts

# Or programmatically
await saveEnvVar('MISSING_VAR', 'value', { category: 'blockchain' });
```

### Local .env variables not being overridden

This is **by design**. Local .env takes precedence to allow development overrides.

To force Supabase values:
```typescript
await loadEnvFromSupabase({
  override: true  // WARNING: Overrides local .env
});
```

## npm Scripts Reference

```bash
# View environment
npm run env:show                    # All configs (secrets hidden)
npm run env:show:secrets            # All configs + secrets (masked)
npm run env:show blockchain         # Specific category

# Upload environment
npm run env:add-production          # Upload from .env to Supabase

# Start with Supabase
npm run start:supabase              # Development mode
npm run start:mainnet:supabase      # Mainnet mode

# Supabase management
npm run supabase:status             # Check Supabase status
npm run supabase:verify-env         # Verify environment tables exist
```

## Example: Complete Setup Flow

```bash
# 1. Create Supabase project at supabase.com
# 2. Get your project URL and anon key
# 3. Generate encryption key
openssl rand -base64 32

# 4. Add to .env
cat >> .env << EOF
USE_SUPABASE=true
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SECRETS_ENCRYPTION_KEY=your-generated-key-here
EOF

# 5. Upload your environment
npm run env:add-production

# 6. Verify it worked
npm run env:show

# 7. Start TheWarden
npm run start:supabase
```

## Benefits for AI Agents

### Before Supabase Integration
- ❌ User must paste credentials every session
- ❌ Risk of exposing sensitive data in chat
- ❌ Time-consuming and error-prone
- ❌ No version control or audit trail

### After Supabase Integration  
- ✅ AI agents load credentials directly from Supabase
- ✅ No pasting sensitive data in chat
- ✅ Instant access to current configuration
- ✅ Complete audit trail of changes
- ✅ Multiple environments (prod/staging/dev)
- ✅ Team collaboration on configuration

## Advanced Usage

### Multiple Environments

Store different configs for different environments:

```typescript
// Load production config
await loadEnvFromSupabase({ environment: 'production' });

// Load staging config
await loadEnvFromSupabase({ environment: 'staging' });

// Load development config
await loadEnvFromSupabase({ environment: 'development' });
```

### Conditional Loading

```typescript
// Load required variables and fail if missing
const result = await loadEnvFromSupabase({
  required: ['RPC_URL', 'PRIVATE_KEY', 'CHAIN_ID'],
});

if (!result.success) {
  console.error('Missing required variables:', result.missingRequired);
  process.exit(1);
}
```

### Category-Specific Loading

```typescript
// Load only blockchain-related configs
await loadEnvFromSupabase({ category: 'blockchain' });

// TheWarden now has RPC_URL, CHAIN_ID, etc.
// but not API keys or database credentials
```

## Conclusion

With Supabase integration, TheWarden and AI agents can:

1. **Access configuration instantly** - No manual pasting needed
2. **Maintain security** - Secrets encrypted at rest
3. **Version control changes** - Track who changed what when
4. **Collaborate effectively** - Team members share same config
5. **Deploy confidently** - Centralized config reduces errors

**Next Steps:**
1. Enable Supabase in your .env
2. Upload your environment: `npm run env:add-production`
3. Start TheWarden: `npm run start:supabase`
4. AI agents can now access config without manual input! 🎉
