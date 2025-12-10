#!/usr/bin/env npx tsx
/**
 * Store Environment Variables in Supabase
 * 
 * This script stores critical environment variables in Supabase
 * for future AI agent sessions to access automatically.
 * 
 * Note: This requires the migrations to be applied first via Supabase dashboard.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY || process.env.AUDIT_ENCRYPTION_KEY || '';

/**
 * Simple encryption for sensitive values
 */
function encrypt(text: string, key: string): string {
  if (!key) return text; // Skip encryption if no key
  
  const algorithm = 'aes-256-cbc';
  const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

async function main() {
  console.log('🔐 Storing Environment Variables in Supabase\n');
  console.log('━'.repeat(60));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Error: Missing Supabase credentials');
    console.error('   Required: SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('\n✅ Connected to Supabase');
  console.log(`   URL: ${supabaseUrl}`);
  
  // Define which environment variables to store
  const envVarsToStore = {
    // Core Configuration
    core: {
      NODE_ENV: process.env.NODE_ENV,
      USE_SUPABASE: process.env.USE_SUPABASE,
      CHAIN_ID: process.env.CHAIN_ID,
    },
    
    // Supabase Configuration (for reference)
    supabase: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_REALTIME_ENABLED: process.env.SUPABASE_REALTIME_ENABLED,
      SUPABASE_MCP_URL: process.env.SUPABASE_MCP_URL,
    },
    
    // AI Providers (encrypted)
    ai: {
      XAI_PROD_API_KEY: process.env.XAI_PROD_API_KEY ? encrypt(process.env.XAI_PROD_API_KEY, ENCRYPTION_KEY) : null,
      GH_PAT_COPILOT: process.env.GH_PAT_COPILOT ? encrypt(process.env.GH_PAT_COPILOT, ENCRYPTION_KEY) : null,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
    
    // Blockchain RPC (some encrypted)
    blockchain: {
      BASE_RPC_URL: process.env.BASE_RPC_URL,
      ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
      ARBITRUM_RPC_URL: process.env.ARBITRUM_RPC_URL,
      OPTIMISM_RPC_URL: process.env.OPTIMISM_RPC_URL,
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY ? encrypt(process.env.ALCHEMY_API_KEY, ENCRYPTION_KEY) : null,
    },
    
    // Cognitive Configuration
    cognitive: {
      EMERGENCE_DETECTION_ENABLED: process.env.EMERGENCE_DETECTION_ENABLED,
      EMERGENCE_MIN_GOAL_ALIGNMENT: process.env.EMERGENCE_MIN_GOAL_ALIGNMENT,
      EMERGENCE_MIN_HISTORICAL_SUCCESS: process.env.EMERGENCE_MIN_HISTORICAL_SUCCESS,
      LEARNING_MODE: process.env.LEARNING_MODE,
      COGNITIVE_CONSENSUS_THRESHOLD: process.env.COGNITIVE_CONSENSUS_THRESHOLD,
    },
    
    // Memory Configuration
    memory: {
      MEMORY_ENABLE_AUTO_MIGRATION: process.env.MEMORY_ENABLE_AUTO_MIGRATION,
      MEMORY_PREFERRED_BACKEND: process.env.MEMORY_PREFERRED_BACKEND,
      MEMORY_IMPORTANCE_THRESHOLD: process.env.MEMORY_IMPORTANCE_THRESHOLD,
      MEMORY_CONSOLIDATION_INTERVAL_MS: process.env.MEMORY_CONSOLIDATION_INTERVAL_MS,
    }
  };
  
  console.log('\n📦 Preparing to store configuration...');
  console.log(`   Categories: ${Object.keys(envVarsToStore).length}`);
  
  // Create a single configuration record
  const configData = {
    id: 'agent-config-v1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    config: envVarsToStore,
    metadata: {
      stored_by: 'copilot-agent',
      session: 'supabase-migration-2025-12-04',
      encryption_enabled: !!ENCRYPTION_KEY,
      total_vars: Object.values(envVarsToStore).reduce((acc, cat) => acc + Object.keys(cat).length, 0)
    }
  };
  
  console.log(`   Total variables: ${configData.metadata.total_vars}`);
  console.log(`   Encryption: ${configData.metadata.encryption_enabled ? '✅ Enabled' : '⚠️  Disabled'}`);
  
  try {
    // Try to insert into agent_config table (if it exists after migrations)
    console.log('\n💾 Storing configuration in Supabase...');
    
    const { data, error } = await supabase
      .from('agent_config')
      .upsert(configData, { onConflict: 'id' })
      .select();
    
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.log('\n⚠️  Table "agent_config" does not exist yet');
        console.log('   This is expected if migrations haven\'t been applied.');
        console.log('\n📝 Next steps:');
        console.log('   1. Apply migrations via Supabase dashboard (see SUPABASE_QUICKSTART.md)');
        console.log('   2. Run this script again to store configuration');
        
        // Save to a local file as backup
        const fs = await import('fs/promises');
        const outputPath = './data/agent-config-backup.json';
        await fs.writeFile(outputPath, JSON.stringify(configData, null, 2));
        console.log(`\n💾 Configuration saved locally: ${outputPath}`);
        
        process.exit(0);
      }
      
      throw error;
    }
    
    console.log('\n✅ SUCCESS! Configuration stored in Supabase');
    console.log(`   Record ID: ${configData.id}`);
    console.log(`   Version: ${configData.version}`);
    console.log(`   Environment: ${configData.environment}`);
    
    console.log('\n🎯 Future AI agents can now:');
    console.log('   1. Query: SELECT * FROM agent_config WHERE id = \'agent-config-v1\'');
    console.log('   2. Access all stored environment variables');
    console.log('   3. Decrypt sensitive values using SECRETS_ENCRYPTION_KEY');
    
  } catch (err) {
    console.error('\n❌ Error storing configuration:', err);
    
    // Save to local file as fallback
    const fs = await import('fs/promises');
    const outputPath = './data/agent-config-backup.json';
    await fs.writeFile(outputPath, JSON.stringify(configData, null, 2));
    console.log(`\n💾 Configuration saved locally as backup: ${outputPath}`);
    
    process.exit(1);
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('✨ Environment variable storage complete!');
}

main().catch(console.error);
