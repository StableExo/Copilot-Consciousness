/**
 * Environment Validation - No dependencies version
 */

const fs = require('fs');
const path = require('path');

// Simple .env parser
function parseEnv(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
  } catch (error) {
    console.log(`⚠️  Could not read .env file: ${error.message}`);
  }
  return env;
}

// Load .env
const envPath = path.join(__dirname, '../../.env');
const envVars = { ...process.env, ...parseEnv(envPath) };

const BLOCKCHAIN_VARS = {
  'NODE_ENV': { expected: 'production', desc: 'Should be "production" for mainnet' },
  'CHAIN_ID': { expected: '8453', desc: 'Base mainnet chain ID' },
  'DRY_RUN': { expected: 'false', desc: 'Should be "false" for real transactions' },
  'WALLET_PRIVATE_KEY': { sensitive: true, desc: 'Deployer wallet private key' },
  'BASE_RPC_URL': { sensitive: true, desc: 'Base mainnet RPC endpoint' },
  'ALCHEMY_API_KEY': { sensitive: true, desc: 'Alchemy API key' },
  'BASESCAN_API_KEY': { sensitive: true, desc: 'Basescan API key' },
  'TITHE_WALLET_ADDRESS': { desc: '70% profit recipient address' },
  'TITHE_BPS': { expected: '7000', desc: 'Tithe percentage (7000 = 70%)' },
  'MULTI_SIG_ADDRESS': { optional: true, desc: 'Multi-sig wallet (recommended)' },
  'COINMARKETCAP_API_KEY': { sensitive: true, optional: true, desc: 'CMC API key' },
  'ENABLE_COINMARKETCAP': { expected: 'true', optional: true, desc: 'Enable CMC' },
  'SUPABASE_URL': { optional: true, desc: 'Supabase project URL' },
  'SUPABASE_SERVICE_KEY': { sensitive: true, optional: true, desc: 'Supabase service key' },
};

function mask(value) {
  if (!value || value.length < 10) return '***';
  if (value.startsWith('0x')) {
    return `${value.substring(0, 6)}...${value.slice(-4)}`;
  }
  return `${value.substring(0, 8)}...${value.slice(-4)}`;
}

console.log('\n' + '═'.repeat(80));
console.log('🔍 YOUR BLOCKCHAIN ENVIRONMENT STATUS');
console.log('═'.repeat(80) + '\n');

let valid = 0, missing = 0, warnings = 0;

for (const [key, config] of Object.entries(BLOCKCHAIN_VARS)) {
  const value = envVars[key];
  const isSet = !!value;
  const symbol = isSet ? '✅' : (config.optional ? '⚠️ ' : '❌');
  
  const display = config.sensitive && value ? mask(value) : (value || '(not set)');
  
  console.log(`${symbol} ${key}`);
  console.log(`   Value: ${display}`);
  console.log(`   Info: ${config.desc}`);
  
  if (!isSet) {
    if (!config.optional) missing++;
    else warnings++;
  } else {
    if (config.expected && value !== config.expected) {
      console.log(`   ⚠️  Expected: ${config.expected}`);
      warnings++;
    } else {
      valid++;
    }
  }
  console.log('');
}

console.log('═'.repeat(80));
console.log(`✅ Valid: ${valid} | ❌ Missing: ${missing} | ⚠️  Warnings: ${warnings}`);
console.log('═'.repeat(80) + '\n');

if (missing === 0) {
  console.log('✅ ENVIRONMENT IS READY FOR BLOCKCHAIN DEPLOYMENT!\n');
} else {
  console.log('❌ FIX MISSING VARIABLES BEFORE DEPLOYING\n');
}

console.log('═'.repeat(80));
console.log('💡 SUPABASE ENVIRONMENT STORAGE');
console.log('═'.repeat(80));
console.log(`
YES! Supabase is PERFECT for storing your environment configuration!

✅ Your Supabase Status:
   SUPABASE_URL: ${envVars.SUPABASE_URL ? '✅ Configured' : '❌ Not set'}
   SUPABASE_SERVICE_KEY: ${envVars.SUPABASE_SERVICE_KEY ? '✅ Configured' : '❌ Not set'}

🔧 How to Store Environment in Supabase:

1. Create a table in your Supabase dashboard:
   
   CREATE TABLE environment_configs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     environment VARCHAR(50) NOT NULL,
     config_data JSONB NOT NULL,
     metadata JSONB,
     version INTEGER DEFAULT 1
   );
   
   -- Enable Row Level Security
   ALTER TABLE environment_configs ENABLE ROW LEVEL SECURITY;

2. Benefits:
   ✅ Encrypted storage with RLS
   ✅ Version history (track changes)
   ✅ Access from anywhere
   ✅ Backup/restore
   ✅ Team sharing (with proper permissions)
   ✅ Audit trail

3. Usage in code:
   - Store: Upload encrypted config on deployment
   - Retrieve: Load on startup
   - Update: Version control for changes
   - Rollback: Revert to previous version if needed

4. Security Best Practices:
   ✅ Use Supabase Vault for ultra-sensitive data (private keys)
   ✅ Enable RLS policies
   ✅ Use service role key (not anon key) for write operations
   ✅ Encrypt sensitive values before storing
   ✅ Log all access attempts
`);

console.log('═'.repeat(80));
console.log('🚀 NEXT STEPS:');
console.log('═'.repeat(80));
if (missing === 0) {
  console.log('1. Review configuration above');
  console.log('2. Run: npm run deploy:mainnet');
  console.log('3. Monitor deployment carefully');
  console.log('4. Verify contract on Basescan');
  console.log('5. Test with small amounts first');
} else {
  console.log('1. Add missing variables to .env');
  console.log('2. Re-run: node scripts/blockchain/check-env.cjs');
  console.log('3. When ready: npm run deploy:mainnet');
}
console.log('═'.repeat(80) + '\n');
