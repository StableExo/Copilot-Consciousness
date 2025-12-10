#!/usr/bin/env node
/**
 * Simple Supabase Connection Test (Pure JavaScript)
 * 
 * Tests connection to Supabase using environment variables.
 */

import { createClient } from '@supabase/supabase-js';

// Read environment variables from .env file manually
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  } catch (error) {
    console.log('⚠️  Could not load .env file, using existing environment');
  }
}

async function testSupabase() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Supabase Connection Test (Simple)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Load .env
  loadEnv();
  
  // Check configuration
  console.log('🔍 Checking Configuration...');
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const useSupabase = process.env.USE_SUPABASE === 'true';
  
  console.log('  SUPABASE_URL:', url ? '✓ Set' : '✗ Missing');
  console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
  console.log('  SUPABASE_PUBLISHABLE_KEY:', process.env.SUPABASE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing');
  console.log('  SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
  console.log('  USE_SUPABASE:', useSupabase);
  
  if (!url || !anonKey) {
    console.log('\n❌ Missing required environment variables!');
    console.log('   Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file\n');
    process.exit(1);
  }
  
  if (!useSupabase) {
    console.log('\n⚠️  USE_SUPABASE is not set to true');
    console.log('   Set USE_SUPABASE=true in .env to enable Supabase\n');
  }
  
  // Create client
  console.log('\n🔌 Creating Supabase Client...');
  const supabase = createClient(url, anonKey);
  console.log('  ✓ Client created successfully\n');
  
  // Test connection with a simple query
  console.log('📊 Testing Database Connection...');
  try {
    // Try to query the sessions table (should exist)
    const { data, error, count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: false })
      .limit(1);
    
    if (error) {
      console.log('  ⚠️  Query returned error:', error.message);
      console.log('  Code:', error.code);
      
      // Some errors are OK (like empty table)
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        console.log('  ✓ Connection successful (table is empty)\n');
      } else {
        console.log('  ✗ Connection may have issues\n');
      }
    } else {
      console.log('  ✓ Query successful!');
      console.log('  Rows found:', count || 0);
      if (data && data.length > 0) {
        console.log('  Sample data:', JSON.stringify(data[0], null, 2));
      }
      console.log();
    }
  } catch (err) {
    console.log('  ✗ Query failed:', err.message);
    console.log();
  }
  
  // Test multiple tables
  console.log('📋 Testing Table Access...');
  const tables = [
    'consciousness_states',
    'thoughts',
    'semantic_memories',
    'episodic_memories',
    'arbitrage_executions',
    'sessions',
    'autonomous_goals',
    'learning_events',
    'market_patterns',
    'agent_config',
  ];
  
  const results = [];
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(0);
      
      if (error && error.code !== 'PGRST116') {
        results.push({ table, accessible: false, error: error.message });
      } else {
        results.push({ table, accessible: true });
      }
    } catch (err) {
      results.push({ table, accessible: false, error: err.message });
    }
  }
  
  const accessible = results.filter(r => r.accessible);
  const inaccessible = results.filter(r => !r.accessible);
  
  console.log(`  ✓ ${accessible.length}/${tables.length} tables accessible\n`);
  
  if (accessible.length > 0) {
    console.log('  Accessible tables:');
    accessible.forEach(r => console.log(`    ✓ ${r.table}`));
  }
  
  if (inaccessible.length > 0) {
    console.log('\n  Inaccessible tables:');
    inaccessible.forEach(r => console.log(`    ✗ ${r.table}: ${r.error}`));
  }
  
  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (accessible.length >= 8) {
    console.log('  ✅ Supabase is properly configured and connected!');
    console.log(`  ${accessible.length} out of ${tables.length} core tables are accessible.\n`);
    process.exit(0);
  } else {
    console.log('  ⚠️  Some tables are not accessible.');
    console.log('  This may be normal if migrations haven\'t been run yet.');
    console.log('  Run migrations with: npm run supabase:migrate\n');
    process.exit(0);
  }
}

testSupabase().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
