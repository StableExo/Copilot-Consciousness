#!/usr/bin/env node --import tsx
/**
 * Quick Environment Display for AI Agents
 * 
 * This script loads environment variables from Supabase and displays them
 * in a format easy for AI agents to consume.
 * 
 * Usage:
 * ```bash
 * node --import tsx scripts/show-env-from-supabase.ts
 * # or
 * npm run env:show
 * ```
 * 
 * For specific categories:
 * ```bash
 * node --import tsx scripts/show-env-from-supabase.ts blockchain
 * node --import tsx scripts/show-env-from-supabase.ts api
 * ```
 */

import 'dotenv/config';
import { loadEnvFromSupabase } from '../src/utils/supabaseEnvLoader';
import { SupabaseEnvStorage } from '../src/services/SupabaseEnvStorage';

interface DisplayOptions {
  category?: string;
  showSecrets?: boolean;
  maskSecrets?: boolean;
}

async function displayEnvironment(options: DisplayOptions = {}) {
  const { category, showSecrets = false, maskSecrets = true } = options;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 ENVIRONMENT VARIABLES FROM SUPABASE');
  console.log('═══════════════════════════════════════════════════════════');

  // Check if Supabase is enabled
  const useSupabase = process.env.USE_SUPABASE === 'true';
  if (!useSupabase) {
    console.log('❌ Supabase is DISABLED (USE_SUPABASE=false)');
    console.log('   Set USE_SUPABASE=true in .env to enable');
    console.log('═══════════════════════════════════════════════════════════');
    return;
  }

  // Check credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('❌ Supabase credentials MISSING');
    console.log('   Required: SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    console.log('═══════════════════════════════════════════════════════════');
    return;
  }

  try {
    const storage = new SupabaseEnvStorage();

    // Load configurations
    console.log(`\n📋 CONFIGURATION VARIABLES${category ? ` (${category})` : ''}`);
    console.log('─────────────────────────────────────────────────────────');

    const configs = await storage.getAllConfigs(category);
    
    if (configs.length === 0) {
      console.log('   (none found)');
    } else {
      // Group by category
      const byCategory = configs.reduce((acc, config) => {
        const cat = config.category || 'uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(config);
        return acc;
      }, {} as Record<string, typeof configs>);

      for (const [cat, items] of Object.entries(byCategory)) {
        console.log(`\n   [${cat.toUpperCase()}]`);
        items.forEach(config => {
          const value = config.config_value;
          const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
          console.log(`   ${config.config_name} = ${displayValue}`);
          if (config.description) {
            console.log(`      → ${config.description}`);
          }
        });
      }

      console.log(`\n   Total: ${configs.length} configuration variables`);
    }

    // Load secrets if requested
    if (showSecrets) {
      console.log(`\n🔐 SECRET VARIABLES${category ? ` (${category})` : ''}`);
      console.log('─────────────────────────────────────────────────────────');

      const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.log('   ⚠️  Cannot display secrets: SECRETS_ENCRYPTION_KEY not set');
      } else {
        const secrets = await storage.getAllSecrets(category);
        
        if (secrets.length === 0) {
          console.log('   (none found)');
        } else {
          for (const secret of secrets) {
            try {
              const value = await storage.getSecret(secret.secret_name, encryptionKey);
              const displayValue = maskSecrets && value
                ? '***' + value.substring(Math.max(0, value.length - 4))
                : value || '(decryption failed)';
              
              console.log(`   ${secret.secret_name} = ${displayValue}`);
              if (secret.description) {
                console.log(`      → ${secret.description}`);
              }
            } catch (error) {
              console.log(`   ${secret.secret_name} = ❌ decryption failed`);
            }
          }

          console.log(`\n   Total: ${secrets.length} secret variables`);
        }
      }
    } else {
      console.log('\n🔐 SECRET VARIABLES');
      console.log('─────────────────────────────────────────────────────────');
      console.log('   (hidden, use --secrets to display)');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Environment loaded successfully');
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n💡 TIP: To load these variables into TheWarden:');
    console.log('   npm run start:supabase');
    console.log('   # or');
    console.log('   npm run start:mainnet:supabase');

  } catch (error) {
    console.error('\n❌ ERROR loading environment:');
    console.error(error);
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const category = args.find(arg => !arg.startsWith('--'));
const showSecrets = args.includes('--secrets');
const noMask = args.includes('--no-mask');

// Run
displayEnvironment({
  category,
  showSecrets,
  maskSecrets: !noMask,
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
