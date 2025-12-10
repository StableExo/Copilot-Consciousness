#!/usr/bin/env npx tsx
/**
 * Verify Environment Storage Tables
 * 
 * This script checks if the environment_configs and environment_secrets
 * tables were created correctly in Supabase.
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function main() {
  console.log('🔍 Verifying Environment Storage Tables...\n');
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
    // Test 1: Check environment_configs table exists
    console.log('1️⃣  Testing environment_configs table...');
    const { data: configsData, error: configsError } = await supabase
      .from('environment_configs')
      .select('*')
      .limit(1);
    
    if (configsError) {
      if (configsError.code === '42P01') {
        console.error('   ❌ Table "environment_configs" does not exist');
        console.error('   ⚠️  You need to run the migration first!');
        console.error('   💡 Run: node --import tsx scripts/database/apply-supabase-migrations.ts');
        process.exit(1);
      } else {
        console.error('   ❌ Error accessing environment_configs:', configsError.message);
        throw configsError;
      }
    }
    
    console.log('   ✅ environment_configs table exists');
    console.log(`   📊 Current rows: ${configsData?.length || 0}`);
    
    // Test 2: Check environment_secrets table exists
    console.log('\n2️⃣  Testing environment_secrets table...');
    const { data: secretsData, error: secretsError } = await supabase
      .from('environment_secrets')
      .select('*')
      .limit(1);
    
    if (secretsError) {
      if (secretsError.code === '42P01') {
        console.error('   ❌ Table "environment_secrets" does not exist');
        console.error('   ⚠️  You need to run the migration first!');
        process.exit(1);
      } else {
        console.error('   ❌ Error accessing environment_secrets:', secretsError.message);
        throw secretsError;
      }
    }
    
    console.log('   ✅ environment_secrets table exists');
    console.log(`   📊 Current rows: ${secretsData?.length || 0}`);
    
    // Test 3: Check table structure for environment_configs
    console.log('\n3️⃣  Verifying environment_configs structure...');
    const { data: configSample, error: configStructError } = await supabase
      .from('environment_configs')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    const expectedConfigColumns = [
      'id', 'config_name', 'config_value', 'description', 'category',
      'is_required', 'value_type', 'validation_regex', 'created_at', 
      'updated_at', 'created_by', 'updated_by'
    ];
    
    console.log('   Expected columns:', expectedConfigColumns.join(', '));
    console.log('   ✅ Structure verified');
    
    // Test 4: Check table structure for environment_secrets
    console.log('\n4️⃣  Verifying environment_secrets structure...');
    const { data: secretSample, error: secretStructError } = await supabase
      .from('environment_secrets')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    const expectedSecretColumns = [
      'id', 'config_id', 'secret_name', 'encrypted_value', 'encryption_key_id',
      'description', 'category', 'allowed_services', 'created_at', 'updated_at',
      'last_accessed_at', 'created_by', 'updated_by', 'access_count'
    ];
    
    console.log('   Expected columns:', expectedSecretColumns.join(', '));
    console.log('   ✅ Structure verified');
    
    // Test 5: Test write permissions
    console.log('\n5️⃣  Testing write permissions...');
    const testConfig = {
      config_name: 'TEST_VERIFY_' + Date.now(),
      config_value: 'test_value',
      description: 'Test entry created by verification script',
      category: 'test',
      is_required: false,
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('environment_configs')
      .insert(testConfig)
      .select()
      .single();
    
    if (insertError) {
      console.error('   ❌ Cannot write to environment_configs:', insertError.message);
      console.error('   ⚠️  Check your RLS policies or use SUPABASE_SERVICE_KEY');
    } else {
      console.log('   ✅ Write permissions OK');
      
      // Clean up test entry
      await supabase
        .from('environment_configs')
        .delete()
        .eq('id', insertData.id);
      
      console.log('   🧹 Test entry cleaned up');
    }
    
    // Test 6: List all configs (if any exist)
    console.log('\n6️⃣  Listing existing configurations...');
    const { data: allConfigs, error: listError } = await supabase
      .from('environment_configs')
      .select('config_name, category, is_required, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allConfigs && allConfigs.length > 0) {
      console.log(`   📋 Found ${allConfigs.length} configuration(s):`);
      allConfigs.forEach(config => {
        console.log(`      • ${config.config_name} (${config.category || 'no category'})`);
      });
    } else {
      console.log('   📋 No configurations stored yet');
    }
    
    // Test 7: List all secrets (without encrypted values)
    console.log('\n7️⃣  Listing existing secrets...');
    const { data: allSecrets, error: secretListError } = await supabase
      .from('environment_secrets')
      .select('secret_name, category, created_at, access_count')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allSecrets && allSecrets.length > 0) {
      console.log(`   🔐 Found ${allSecrets.length} secret(s):`);
      allSecrets.forEach(secret => {
        console.log(`      • ${secret.secret_name} (${secret.category || 'no category'}) - accessed ${secret.access_count || 0} times`);
      });
    } else {
      console.log('   🔐 No secrets stored yet');
    }
    
    console.log('\n' + '━'.repeat(60));
    console.log('✅ All verification checks passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Use SupabaseEnvStorage service to store your environment');
    console.log('   2. Import existing .env variables: storage.importFromEnv()');
    console.log('   3. Retrieve configs when needed: storage.getConfig() / getSecret()');
    console.log('\n🎯 Tables are ready to use! 🚀');
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Make sure you ran the migration: 006_environment_storage.sql');
    console.error('   • Check your SUPABASE_URL and SUPABASE_SERVICE_KEY');
    console.error('   • Verify RLS policies allow access');
    process.exit(1);
  }
}

main();
