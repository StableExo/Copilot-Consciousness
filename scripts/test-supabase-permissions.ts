/**
 * Test Supabase Permissions and Features
 * Verifies what capabilities are enabled
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config.js';

const { url, key, keyType } = getSupabaseConfig();
const supabase = createClient(url, key);

async function main() {
  console.log('🔐 Supabase Permissions & Features Test\n');
  console.log('━'.repeat(70));

  const results: Array<{ test: string; status: string; details: string }> = [];

  // Test 1: Basic API Access
  console.log('\n1️⃣  Testing Basic API Access...');
  console.log(`   Key Type: ${keyType}`);
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (response.ok) {
      results.push({ test: 'Basic API Access', status: '✅', details: 'REST API accessible' });
      console.log('   ✅ REST API accessible');
    } else {
      results.push({ test: 'Basic API Access', status: '❌', details: `HTTP ${response.status}` });
      console.log(`   ❌ HTTP ${response.status}`);
    }
  } catch (error: any) {
    results.push({ test: 'Basic API Access', status: '❌', details: error.message });
    console.log(`   ❌ ${error.message}`);
  }

  // Test 2: List Available Tables
  console.log('\n2️⃣  Listing Available Tables...');
  try {
    // Try to get schema information
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/openapi+json')) {
      const schema = await response.json();
      const tables = Object.keys(schema.definitions || {});
      
      results.push({ 
        test: 'List Tables', 
        status: '✅', 
        details: `${tables.length} tables exposed` 
      });
      
      console.log(`   ✅ Found ${tables.length} exposed tables/views`);
      if (tables.length > 0) {
        console.log('   📋 Available tables:');
        tables.slice(0, 10).forEach(t => console.log(`      • ${t}`));
        if (tables.length > 10) {
          console.log(`      ... and ${tables.length - 10} more`);
        }
      }
    } else {
      results.push({ test: 'List Tables', status: '⚠️', details: 'Schema not in OpenAPI format' });
      console.log('   ⚠️  Schema not in expected format');
    }
  } catch (error: any) {
    results.push({ test: 'List Tables', status: '❌', details: error.message });
    console.log(`   ❌ ${error.message}`);
  }

  // Test 3: Check Public Schema Access
  console.log('\n3️⃣  Testing Public Schema Access...');
  try {
    // Try to query pg_tables (if accessible)
    const { data, error } = await supabase.rpc('pg_catalog.pg_tables', {});
    
    if (!error) {
      results.push({ test: 'Public Schema', status: '✅', details: 'Can query system tables' });
      console.log('   ✅ System catalog accessible');
    } else {
      results.push({ test: 'Public Schema', status: '⚠️', details: 'Limited system access' });
      console.log('   ⚠️  Limited system catalog access (normal for anon key)');
    }
  } catch (error: any) {
    results.push({ test: 'Public Schema', status: '⚠️', details: 'Expected with anon key' });
    console.log('   ⚠️  System catalog not accessible (expected with anon key)');
  }

  // Test 4: Test RPC Function Calls
  console.log('\n4️⃣  Testing RPC Function Calls...');
  try {
    // Try a simple function call
    const { data, error } = await supabase.rpc('version', {});
    
    if (!error && data) {
      results.push({ test: 'RPC Functions', status: '✅', details: 'Can call functions' });
      console.log('   ✅ RPC function calls working');
    } else {
      results.push({ test: 'RPC Functions', status: '⚠️', details: error?.message || 'Function not found' });
      console.log('   ⚠️  RPC functions not yet configured');
    }
  } catch (error: any) {
    results.push({ test: 'RPC Functions', status: '⚠️', details: 'No functions created yet' });
    console.log('   ⚠️  No RPC functions available yet (normal for new project)');
  }

  // Test 5: Test Storage Access
  console.log('\n5️⃣  Testing Storage Access...');
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (!error) {
      results.push({ 
        test: 'Storage Access', 
        status: '✅', 
        details: `${data.length} buckets found` 
      });
      console.log(`   ✅ Storage accessible - ${data.length} buckets`);
      if (data.length > 0) {
        console.log('   📦 Available buckets:');
        data.forEach(b => console.log(`      • ${b.name} (${b.public ? 'public' : 'private'})`));
      }
    } else {
      results.push({ test: 'Storage Access', status: '⚠️', details: error.message });
      console.log(`   ⚠️  ${error.message}`);
    }
  } catch (error: any) {
    results.push({ test: 'Storage Access', status: '❌', details: error.message });
    console.log(`   ❌ ${error.message}`);
  }

  // Test 6: Test Auth Access
  console.log('\n6️⃣  Testing Auth Access...');
  try {
    const { data, error } = await supabase.auth.getSession();
    
    results.push({ 
      test: 'Auth Access', 
      status: '✅', 
      details: data.session ? 'Authenticated' : 'Anonymous' 
    });
    console.log(`   ✅ Auth accessible - ${data.session ? 'Authenticated' : 'Anonymous session'}`);
  } catch (error: any) {
    results.push({ test: 'Auth Access', status: '❌', details: error.message });
    console.log(`   ❌ ${error.message}`);
  }

  // Test 7: Test Real-time Subscriptions
  console.log('\n7️⃣  Testing Real-time Subscriptions...');
  try {
    const channel = supabase.channel('test-channel');
    
    // Set timeout for subscription test
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Subscription timeout')), 5000)
    );
    
    const subscribeTest = new Promise((resolve) => {
      channel
        .on('broadcast', { event: 'test' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve(status);
          }
        });
    });

    try {
      const status = await Promise.race([subscribeTest, timeout]);
      results.push({ test: 'Real-time', status: '✅', details: 'Subscriptions working' });
      console.log('   ✅ Real-time subscriptions working');
      await channel.unsubscribe();
    } catch {
      results.push({ test: 'Real-time', status: '⚠️', details: 'Timeout or disabled' });
      console.log('   ⚠️  Real-time might be disabled or slow');
    }
  } catch (error: any) {
    results.push({ test: 'Real-time', status: '❌', details: error.message });
    console.log(`   ❌ ${error.message}`);
  }

  // Test 8: Try to Create a Test Table
  console.log('\n8️⃣  Testing DDL Permissions (Create Table)...');
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'CREATE TABLE IF NOT EXISTS test_permissions (id serial primary key, created_at timestamptz default now());'
    });
    
    if (!error) {
      results.push({ test: 'DDL Permissions', status: '✅', details: 'Can create tables' });
      console.log('   ✅ DDL permissions available (can create tables)');
      
      // Clean up
      await supabase.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS test_permissions;'
      });
    } else {
      results.push({ test: 'DDL Permissions', status: '⚠️', details: 'Anon key limitation' });
      console.log('   ⚠️  DDL not available with anon key (expected - use SQL Editor)');
    }
  } catch (error: any) {
    results.push({ test: 'DDL Permissions', status: '⚠️', details: 'Use SQL Editor' });
    console.log('   ⚠️  DDL requires SQL Editor (expected for security)');
  }

  // Summary
  console.log('\n━'.repeat(70));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.status === '✅').length;
  const warned = results.filter(r => r.status === '⚠️').length;
  const failed = results.filter(r => r.status === '❌').length;

  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ⚠️  Warnings: ${warned}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${results.length} tests\n`);

  console.log('━'.repeat(70));
  console.log('\n📋 Detailed Results\n');
  
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.test}`);
    console.log(`      Status: ${r.status}`);
    console.log(`      Details: ${r.details}\n`);
  });

  console.log('━'.repeat(70));
  console.log('\n💡 Recommendations\n');
  
  if (passed >= 5) {
    console.log('   🎉 Excellent! Most features are accessible.');
    console.log('   ✅ Ready to apply migrations via SQL Editor');
    console.log('   ✅ Ready to use Supabase client for CRUD operations');
  } else if (passed >= 3) {
    console.log('   ✓ Good! Core features are working.');
    console.log('   📝 Some advanced features may need configuration');
  } else {
    console.log('   ⚠️  Limited access detected.');
    console.log('   🔧 Check API settings in Supabase Dashboard');
  }

  console.log('\n   📍 Next Steps:');
  console.log('      1. Apply migrations via SQL Editor');
  console.log('      2. Test data insertion with demo script');
  console.log('      3. Verify consciousness tables exist\n');
  
  console.log('━'.repeat(70) + '\n');
}

main().catch(console.error);
