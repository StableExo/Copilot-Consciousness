# Supabase Environment Setup for TheWarden

## Overview

TheWarden stores **ALL environment variables in Supabase**, not in local `.env` files. This provides:
- ✅ Centralized configuration management
- ✅ Secure secret storage (encrypted)
- ✅ Environment-specific configs (dev, staging, production)
- ✅ No secrets in version control
- ✅ Easy updates without redeployment

## Architecture

### Environment Loading Flow

```
Runtime Start
  ├─> Load minimal .env (ONLY Supabase credentials)
  │   └─> If .env doesn't exist, use runtime environment variables
  │
  ├─> Connect to Supabase
  │
  ├─> Load ALL other environment variables from Supabase
  │   ├─> configurations table (plain configs)
  │   └─> secrets table (encrypted secrets)
  │
  ├─> Merge into process.env
  │
  ├─> Run Readiness Check
  │   └─> Verify all required variables present
  │
  └─> Start TheWarden
```

### What Goes Where

**Local .env (Optional - Only for Supabase credentials)**
```bash
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Supabase `configurations` Table (All other configs)**
```
- CHAIN_ID
- SCAN_INTERVAL
- MIN_PROFIT_THRESHOLD
- BASE_RPC_URL
- ETHEREUM_RPC_URL
- ... (all non-sensitive configs)
```

**Supabase `secrets` Table (Sensitive data - encrypted)**
```
- WALLET_PRIVATE_KEY
- API_KEYS
- ... (all sensitive secrets)
```

## Setup Instructions

### Step 1: Supabase Project Setup

If not already done, set up your Supabase project:

1. Create project at https://supabase.com
2. Run migrations:
   ```bash
   npm run db:migrate
   ```
3. Get your credentials:
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: Found in Project Settings > API

### Step 2: Configure Supabase Credentials

**Option A: Local .env file (Development)**

Create `.env` file in project root:
```bash
# Minimal .env for Supabase bootstrap
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**Option B: Runtime Environment Variables (Production)**

Set as environment variables in your deployment environment:
```bash
export USE_SUPABASE=true
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key-here
```

For Docker:
```bash
docker run -e USE_SUPABASE=true \
           -e SUPABASE_URL=https://your-project.supabase.co \
           -e SUPABASE_SERVICE_KEY=your-key \
           thewarden
```

For Kubernetes:
```yaml
env:
  - name: USE_SUPABASE
    value: "true"
  - name: SUPABASE_URL
    value: "https://your-project.supabase.co"
  - name: SUPABASE_SERVICE_KEY
    valueFrom:
      secretKeyRef:
        name: supabase-credentials
        key: service-key
```

### Step 3: Populate Supabase with Environment Variables

Use the environment loader utility:

```bash
# Load from .env.example template
npm run env:sync

# Or manually insert into Supabase
```

**Manual Insert (SQL)**

```sql
-- Insert configuration
INSERT INTO configurations (key, value, environment, description)
VALUES 
  ('CHAIN_ID', '8453', 'production', 'Base mainnet chain ID'),
  ('SCAN_INTERVAL', '1000', 'production', 'Scan interval in ms'),
  ('MIN_PROFIT_THRESHOLD', '0.01', 'production', 'Minimum profit in ETH');

-- Insert encrypted secrets
INSERT INTO secrets (key, encrypted_value, environment, description)
VALUES 
  ('WALLET_PRIVATE_KEY', encrypt_secret('0x...'), 'production', 'Trading wallet private key'),
  ('BASE_RPC_URL', encrypt_secret('https://...'), 'production', 'Base RPC endpoint');
```

### Step 4: Verify Setup

Check that readiness passes:

```bash
npm run check:readiness
```

Expected output when properly configured:
```
✅ Environment Variables: 2/2 present
✅ Memory System: Operational
✅ Supabase: Connected
✅ Network: Connected to base (chainId: 8453)
✅ Wallet: Configured (0x1234567890...abcdef12)
═══════════════════════════════════════════════════════════
✅ READINESS CHECK: PASSED
```

### Step 5: Start TheWarden

```bash
# With Supabase environment loading
npm run start:supabase

# Or for autonomous mode
npm run start:autonomous
```

## Usage Patterns

### Development

During development, you might want a mix of local and Supabase configs:

**.env (local overrides)**
```bash
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-key

# Local overrides (takes precedence)
CHAIN_ID=84532  # Base Sepolia testnet
DRY_RUN=true
```

The bootstrap will:
1. Load from Supabase first
2. Apply local .env overrides
3. Result: Testnet settings locally, production settings in Supabase

### Production

In production, NO local .env file exists:

1. Supabase credentials from runtime environment
2. ALL other configs from Supabase
3. Clean, centralized configuration

### CI/CD

GitHub Actions example:

```yaml
- name: Bootstrap Environment
  env:
    USE_SUPABASE: true
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
  run: npm run start:supabase
```

## Environment Management

### Viewing Current Configuration

```bash
# Check what's loaded
npm run env:show

# Check readiness (includes env vars check)
npm run check:readiness
```

### Updating Configuration

**Option 1: Supabase Dashboard**
1. Go to Table Editor
2. Edit `configurations` or `secrets` table
3. Changes take effect on next restart

**Option 2: SQL**
```sql
UPDATE configurations 
SET value = '2000' 
WHERE key = 'SCAN_INTERVAL' AND environment = 'production';
```

**Option 3: API**
```bash
curl -X PATCH https://your-project.supabase.co/rest/v1/configurations?key=eq.SCAN_INTERVAL \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "2000"}'
```

### Environment-Specific Configs

Supabase supports multiple environments:

```sql
-- Development
INSERT INTO configurations (key, value, environment)
VALUES ('CHAIN_ID', '84532', 'development');

-- Production
INSERT INTO configurations (key, value, environment)
VALUES ('CHAIN_ID', '8453', 'production');
```

Select environment on startup:
```bash
NODE_ENV=production npm run start:supabase
```

## Troubleshooting

### "SUPABASE_URL environment variable is required"

**Problem**: Supabase credentials not available

**Solution**:
1. Create `.env` with Supabase credentials, OR
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as environment variables

```bash
export USE_SUPABASE=true
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-key
npm run start:supabase
```

### "Missing required variables: CHAIN_ID, WALLET_PRIVATE_KEY"

**Problem**: Environment variables not in Supabase

**Solution**: Populate Supabase tables

```bash
# Sync from .env.example
npm run env:sync

# Or check what's missing
npm run check:readiness
```

### "Failed to load environment from Supabase: unauthorized"

**Problem**: Invalid Supabase credentials

**Solution**:
1. Verify `SUPABASE_SERVICE_KEY` (not anon key)
2. Check key hasn't expired
3. Verify project URL is correct

### Bootstrap Works But App Fails

**Problem**: Missing specific environment variables

**Solution**: Check readiness report details

```bash
npm run check:readiness
```

The report shows exactly which variables are missing.

## Security Best Practices

### 1. Never Commit Secrets

✅ **Correct** - In Supabase:
```sql
INSERT INTO secrets (key, encrypted_value, environment)
VALUES ('WALLET_PRIVATE_KEY', encrypt_secret('0x...'), 'production');
```

❌ **Wrong** - In .env file in git:
```bash
WALLET_PRIVATE_KEY=0x123...  # DON'T DO THIS
```

### 2. Use Service Role Key for Bootstrap

The bootstrap process needs `SUPABASE_SERVICE_KEY` (not anon key) to access encrypted secrets.

**Anon Key**: Limited access, public-facing
**Service Role Key**: Full access, server-side only

### 3. Encrypt Sensitive Data

Use Supabase's encryption for sensitive values:

```sql
-- Encrypted
INSERT INTO secrets (key, encrypted_value, environment)
VALUES ('API_KEY', encrypt_secret('abc123'), 'production');

-- Plain (non-sensitive)
INSERT INTO configurations (key, value, environment)
VALUES ('SCAN_INTERVAL', '1000', 'production');
```

### 4. Rotate Keys Regularly

Update secrets in Supabase, restart app:

```sql
UPDATE secrets 
SET encrypted_value = encrypt_secret('new-key-value')
WHERE key = 'API_KEY' AND environment = 'production';
```

### 5. Use Row-Level Security

Enable RLS on Supabase tables:

```sql
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON secrets
  FOR ALL
  USING (auth.role() = 'service_role');
```

## Migration from .env to Supabase

### Step 1: Export Existing .env

```bash
# Your existing .env
cat .env
```

### Step 2: Classify Variables

- **Public configs** → `configurations` table
- **Secrets** → `secrets` table (encrypted)
- **Supabase creds** → Keep in .env OR runtime env vars

### Step 3: Insert into Supabase

```bash
npm run env:migrate
```

Or manually:
```sql
INSERT INTO configurations (key, value, environment)
SELECT key, value, 'production' FROM env_file_parsed;

INSERT INTO secrets (key, encrypted_value, environment)
SELECT key, encrypt_secret(value), 'production' FROM env_secrets_parsed;
```

### Step 4: Test

```bash
# Test with Supabase
USE_SUPABASE=true npm run check:readiness

# Should pass
✅ READINESS CHECK: PASSED
```

### Step 5: Remove .env

```bash
# Backup first
cp .env .env.backup

# Then remove
rm .env

# Verify still works
npm run start:supabase
```

## Advanced Configuration

### Dynamic Configuration Updates

TheWarden can reload configuration without restart:

```typescript
import { loadEnvFromSupabase } from './utils/supabaseEnvLoader';

// Reload configuration
await loadEnvFromSupabase({ 
  environment: 'production',
  override: true  // Override existing values
});
```

### Configuration Versioning

Track configuration changes:

```sql
CREATE TABLE configuration_history (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger on configuration changes
CREATE TRIGGER track_configuration_changes
  AFTER UPDATE ON configurations
  FOR EACH ROW
  EXECUTE FUNCTION log_configuration_change();
```

### Multi-Region Deployments

Different regions, different configs:

```sql
INSERT INTO configurations (key, value, environment, region)
VALUES 
  ('RPC_URL', 'https://us-rpc.example.com', 'production', 'us-east-1'),
  ('RPC_URL', 'https://eu-rpc.example.com', 'production', 'eu-west-1');
```

Load by region:
```typescript
await loadEnvFromSupabase({ 
  environment: 'production',
  region: process.env.AWS_REGION
});
```

## See Also

- [Autonomous Readiness Check](./AUTONOMOUS_READINESS_CHECK.md)
- [Supabase Setup Guide](./SUPABASE_SETUP_GUIDE.md)
- [Environment Loader Implementation](../src/utils/supabaseEnvLoader.ts)
- [Bootstrap Process](../src/bootstrap-supabase.ts)
