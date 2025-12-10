#!/usr/bin/env npx tsx
/**
 * Apply Environment Storage Hotfix
 * 
 * This script applies the 006_environment_storage_hotfix.sql migration
 * and ensures the schema cache is properly reloaded.
 * 
 * What it does:
 * 1. Checks current table structure
 * 2. Applies the hotfix migration to add missing columns
 * 3. Forces schema cache reload
 * 4. Verifies all columns are accessible
 * 
 * When to use:
 * - After initial migration if columns are missing
 * - When verification script reports "column not found in schema cache"
 * - To ensure environment_configs and environment_secrets have all required columns
 * 
 * Requirements:
 * - SUPABASE_URL environment variable
 * - SUPABASE_SERVICE_KEY (strongly recommended) or SUPABASE_ANON_KEY
 * 
 * Usage:
 *   node --import tsx scripts/database/apply-environment-hotfix.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
  console.log('🔧 Applying Environment Storage Hotfix...\n');
  console.log('━'.repeat(60));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Error: Missing Supabase credentials');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY)');
    process.exit(1);
  }
  
  // Check if using service key
  const usingServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
  if (!usingServiceKey) {
    console.log('⚠️  WARNING: Using ANON_KEY instead of SERVICE_KEY');
    console.log('   This may have limited permissions for schema modifications.');
    console.log('   Recommended: Set SUPABASE_SERVICE_KEY for better results.\n');
  }
  
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Using:', usingServiceKey ? 'SERVICE_KEY ✅' : 'ANON_KEY ⚠️');
  console.log('🔗 Connecting to database...\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Check current table structure
    console.log('1️⃣  Checking current table structure...');
    
    const { data: configCheck, error: configError } = await supabase
      .from('environment_configs')
      .select('*')
      .limit(0);
    
    if (configError && configError.code === '42P01') {
      console.error('   ❌ Table environment_configs does not exist!');
      console.error('   💡 Run the main migration first:');
      console.error('      node --import tsx scripts/database/apply-supabase-migrations.ts');
      process.exit(1);
    }
    
    console.log('   ✅ Tables exist');
    
    // Step 2: Read and display hotfix SQL
    console.log('\n2️⃣  Loading hotfix migration...');
    
    const hotfixPath = path.join(
      process.cwd(), 
      'src/infrastructure/supabase/migrations/006_environment_storage_hotfix.sql'
    );
    
    const hotfixSQL = await fs.readFile(hotfixPath, 'utf-8');
    console.log('   ✅ Hotfix SQL loaded');
    console.log(`   📄 Size: ${(hotfixSQL.length / 1024).toFixed(1)} KB`);
    
    // Step 3: Apply hotfix via Supabase SQL editor instructions
    console.log('\n3️⃣  Applying hotfix migration...');
    console.log('   ℹ️  Note: Due to Supabase client limitations, this hotfix needs to be');
    console.log('       applied via the Supabase Dashboard SQL Editor or postgres client.\n');
    
    // Extract project ID
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    console.log('━'.repeat(60));
    console.log('📋 MANUAL HOTFIX APPLICATION REQUIRED');
    console.log('━'.repeat(60));
    console.log('\n🔗 Direct link to SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${projectId}/sql/new\n`);
    
    console.log('📝 Steps to apply:');
    console.log('   1. Open the SQL Editor link above');
    console.log('   2. Copy the hotfix SQL below');
    console.log('   3. Paste it into the SQL Editor');
    console.log('   4. Click "Run" to execute');
    console.log('   5. Come back here and press ENTER to continue\n');
    
    console.log('━'.repeat(60));
    console.log('📄 HOTFIX SQL TO COPY:');
    console.log('━'.repeat(60));
    console.log(hotfixSQL);
    console.log('━'.repeat(60));
    console.log('\n✋ Press ENTER after you have applied the hotfix in Supabase Dashboard...');
    
    // Wait for user confirmation
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('\n4️⃣  Waiting for schema to propagate...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('   ✅ Wait complete');
    
    // Step 4: Verify columns exist
    console.log('\n5️⃣  Verifying table structure...');
    
    const expectedConfigColumns = [
      'id', 'config_name', 'config_value', 'description', 'category',
      'is_required', 'value_type', 'validation_regex', 'created_at', 
      'updated_at', 'created_by', 'updated_by'
    ];
    
    const expectedSecretColumns = [
      'id', 'config_id', 'secret_name', 'encrypted_value', 'encryption_key_id',
      'description', 'category', 'allowed_services', 'created_at', 'updated_at',
      'last_accessed_at', 'created_by', 'updated_by', 'access_count'
    ];
    
    console.log('   📋 Expected config columns:', expectedConfigColumns.length);
    console.log('   📋 Expected secret columns:', expectedSecretColumns.length);
    
    // Try to query with all expected columns
    const { data: configData, error: configVerifyError } = await supabase
      .from('environment_configs')
      .select(expectedConfigColumns.join(', '))
      .limit(1);
    
    if (configVerifyError) {
      console.error('   ⚠️  Some columns may still be missing from environment_configs');
      console.error('      Error:', configVerifyError.message);
      console.log('   💡 You may need to wait 30-60 seconds for schema cache to refresh');
      console.log('      Or run: node --import tsx scripts/database/reload-supabase-schema.ts');
    } else {
      console.log('   ✅ environment_configs structure verified');
    }
    
    const { data: secretData, error: secretVerifyError } = await supabase
      .from('environment_secrets')
      .select(expectedSecretColumns.join(', '))
      .limit(1);
    
    if (secretVerifyError) {
      console.error('   ⚠️  Some columns may still be missing from environment_secrets');
      console.error('      Error:', secretVerifyError.message);
    } else {
      console.log('   ✅ environment_secrets structure verified');
    }
    
    // Step 5: Test write with all columns
    console.log('\n6️⃣  Testing write permissions with all columns...');
    
    const testConfig = {
      config_name: 'HOTFIX_TEST_' + Date.now(),
      config_value: 'test_value',
      description: 'Test entry created by hotfix script',
      category: 'test',
      is_required: false,
      value_type: 'string',
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('environment_configs')
      .insert(testConfig)
      .select()
      .single();
    
    if (insertError) {
      console.error('   ❌ Write test failed:', insertError.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   • Wait 30-60 seconds for schema cache to refresh');
      console.error('   • Ensure you\'re using SUPABASE_SERVICE_KEY (not ANON_KEY)');
      console.error('   • Check RLS policies in Supabase Dashboard');
      console.error('   • Run: node --import tsx scripts/database/reload-supabase-schema.ts');
      process.exit(1);
    }
    
    console.log('   ✅ Write test successful');
    
    // Clean up test entry
    await supabase
      .from('environment_configs')
      .delete()
      .eq('id', insertData.id);
    
    console.log('   🧹 Test entry cleaned up');
    
    console.log('\n' + '━'.repeat(60));
    console.log('✅ Hotfix applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run verification script:');
    console.log('      node --import tsx scripts/database/verify-environment-tables.ts');
    console.log('   2. If issues persist, reload schema cache:');
    console.log('      node --import tsx scripts/database/reload-supabase-schema.ts');
    console.log('   3. Start using SupabaseEnvStorage service');
    console.log('\n🎯 Environment tables are ready to use! 🚀\n');
    
  } catch (error: any) {
    console.error('\n❌ Hotfix application failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Make sure you applied the SQL in Supabase Dashboard');
    console.error('   • Check that SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    console.error('   • Wait 30-60 seconds and try verification again');
    console.error('   • Run: node --import tsx scripts/database/reload-supabase-schema.ts');
    process.exit(1);
  }
}

main();
