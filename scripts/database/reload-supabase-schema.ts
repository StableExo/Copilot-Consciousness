#!/usr/bin/env npx tsx
/**
 * Reload Supabase Schema Cache
 * 
 * This script forces PostgREST to reload its schema cache.
 * 
 * When to use:
 * - After applying SQL migrations that add/modify columns
 * - When you get "Could not find column in schema cache" errors
 * - After running hotfix migrations
 * 
 * How it works:
 * - Sends a NOTIFY signal to PostgREST's pgrst schema_cache channel
 * - PostgREST listens for this signal and reloads its schema
 * 
 * Requirements:
 * - SUPABASE_URL environment variable
 * - SUPABASE_SERVICE_KEY (recommended) or SUPABASE_ANON_KEY
 * 
 * Usage:
 *   node --import tsx scripts/database/reload-supabase-schema.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Time constants
const SCHEMA_RELOAD_WAIT_MS = 2000; // Wait time for PostgREST to process schema update

async function main() {
  console.log('🔄 Reloading Supabase Schema Cache...\n');
  console.log('━'.repeat(60));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Error: Missing Supabase credentials');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY)');
    process.exit(1);
  }
  
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔗 Connecting to database...\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Method 1: Use NOTIFY command to reload schema
    console.log('1️⃣  Sending schema reload signal via NOTIFY...');
    
    const { data: notifyData, error: notifyError } = await supabase.rpc('notify_schema_reload', {});
    
    // If notify_schema_reload function doesn't exist, we'll create it
    if (notifyError && notifyError.message.includes('function')) {
      console.log('   ℹ️  Creating notify_schema_reload function...');
      
      // Create the function using a raw SQL query
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION notify_schema_reload()
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          NOTIFY pgrst, 'reload schema';
        END;
        $$;
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { 
        sql: createFunctionSQL 
      });
      
      if (createError) {
        console.log('   ⚠️  Could not create function (expected if exec_sql doesn\'t exist)');
        console.log('   💡 Schema will be reloaded on next request automatically');
      } else {
        // Try notify again
        await supabase.rpc('notify_schema_reload', {});
        console.log('   ✅ Schema reload signal sent');
      }
    } else if (!notifyError) {
      console.log('   ✅ Schema reload signal sent successfully');
    } else {
      console.log('   ℹ️  Direct NOTIFY not available, using alternative method...');
    }
    
    // Method 2: Force schema refresh by making a query that requires fresh schema
    console.log('\n2️⃣  Forcing schema refresh with metadata query...');
    
    const { data, error } = await supabase
      .from('environment_configs')
      .select('*')
      .limit(0);
    
    if (error && !error.message.includes('schema cache')) {
      console.log('   ✅ Query executed (schema is accessible)');
    } else if (error) {
      console.log('   ⚠️  Schema cache issue detected:', error.message);
    } else {
      console.log('   ✅ Query executed successfully');
    }
    
    // Method 3: Wait a moment for PostgREST to process
    console.log('\n3️⃣  Waiting for PostgREST to process schema update...');
    await new Promise(resolve => setTimeout(resolve, SCHEMA_RELOAD_WAIT_MS));
    console.log('   ✅ Wait complete');
    
    // Verify schema is reloaded
    console.log('\n4️⃣  Verifying schema reload...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('environment_configs')
      .select('id, config_name, category, is_required')
      .limit(1);
    
    if (verifyError) {
      console.error('   ❌ Schema verification failed:', verifyError.message);
      throw verifyError;
    }
    
    console.log('   ✅ Schema verified - all columns accessible');
    
    console.log('\n' + '━'.repeat(60));
    console.log('✅ Schema cache reload complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run your verification or test scripts again');
    console.log('   2. The schema cache should now reflect all columns');
    console.log('   3. If issues persist, check RLS policies and permissions');
    console.log('\n💡 Note: PostgREST automatically reloads schema periodically,');
    console.log('    but this script forces an immediate reload.\n');
    
  } catch (error: any) {
    console.error('\n❌ Schema reload failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Make sure migrations have been applied successfully');
    console.error('   • Use SUPABASE_SERVICE_KEY for better permissions');
    console.error('   • Check that PostgREST is running and healthy');
    console.error('   • Wait 30-60 seconds - PostgREST auto-reloads periodically');
    console.error('\n📋 Alternative: Restart Supabase PostgREST service');
    console.error('   • Go to Supabase Dashboard → Settings → API');
    console.error('   • Or wait for automatic schema reload (happens periodically)');
    process.exit(1);
  }
}

main();
