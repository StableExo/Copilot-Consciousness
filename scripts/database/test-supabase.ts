#!/usr/bin/env npx tsx
/**
 * Test Supabase Connection
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient } from '../src/infrastructure/supabase/client.js';

async function main() {
  console.log('🔗 Testing Supabase connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Key:', process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  
  try {
    const client = getSupabaseClient();
    
    // Test connection by querying consciousness_states table
    const { data, error } = await client.from('consciousness_states').select('id').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = empty table (OK)
      console.error('❌ Connection failed:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      process.exit(1);
    }
    
    console.log('✅ Connection successful!');
    console.log('📊 Query result:', data || '(empty table)');
    
    // Try to get count of records
    const { count } = await client.from('consciousness_states').select('*', { count: 'exact', head: true });
    console.log('📈 Total consciousness states:', count || 0);
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
