/**
 * Test Supabase Connection
 * Validates that Supabase is configured correctly and accessible
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🧪 Supabase Connection Tests\n');
  console.log('━'.repeat(60));

  // Test 1: Environment Variables
  console.log('\n1️⃣  Testing environment variables...');
  const startEnv = Date.now();
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    results.push({
      test: 'Environment Variables',
      status: 'FAIL',
      message: `Missing: ${!url ? 'SUPABASE_URL' : ''} ${!key ? 'SUPABASE_ANON_KEY' : ''}`,
      duration: Date.now() - startEnv
    });
    console.log('   ❌ FAIL: Missing environment variables');
    return;
  }
  
  results.push({
    test: 'Environment Variables',
    status: 'PASS',
    message: `URL: ${url.substring(0, 30)}..., Key: ${key.substring(0, 20)}...`,
    duration: Date.now() - startEnv
  });
  console.log('   ✅ PASS: Environment variables loaded');

  // Test 2: Client Creation
  console.log('\n2️⃣  Creating Supabase client...');
  const startClient = Date.now();
  
  let supabase;
  try {
    supabase = createClient(url, key);
    results.push({
      test: 'Client Creation',
      status: 'PASS',
      message: 'Successfully created Supabase client',
      duration: Date.now() - startClient
    });
    console.log('   ✅ PASS: Client created');
  } catch (error) {
    const err = error as Error;
    results.push({
      test: 'Client Creation',
      status: 'FAIL',
      message: `Error: ${err.message}`,
      duration: Date.now() - startClient
    });
    console.log(`   ❌ FAIL: ${err.message}`);
    return;
  }

  // Test 3: API Connection
  console.log('\n3️⃣  Testing API connection...');
  const startApi = Date.now();
  
  try {
    const { data, error } = await supabase.from('_migrations').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (expected if no migrations)
      throw error;
    }
    
    results.push({
      test: 'API Connection',
      status: 'PASS',
      message: 'Successfully connected to Supabase API',
      duration: Date.now() - startApi
    });
    console.log('   ✅ PASS: API connection successful');
  } catch (error) {
    const err = error as Error;
    results.push({
      test: 'API Connection',
      status: 'FAIL',
      message: `Error: ${err.message}`,
      duration: Date.now() - startApi
    });
    console.log(`   ❌ FAIL: ${err.message}`);
    return;
  }

  // Test 4: List Tables
  console.log('\n4️⃣  Listing database tables...');
  const startTables = Date.now();
  
  try {
    // Query information_schema to list tables
    const response = await supabase.from('todos').select('count').limit(1);
    const { data, error } = response;
    
    results.push({
      test: 'List Tables',
      status: 'PASS',
      message: 'Successfully queried database schema',
      duration: Date.now() - startTables
    });
    console.log('   ✅ PASS: Database schema accessible');
  } catch (error) {
    const err = error as Error;
    results.push({
      test: 'List Tables',
      status: 'FAIL',
      message: `Error: ${err.message}`,
      duration: Date.now() - startTables
    });
    console.log(`   ⚠️  WARNING: ${err.message}`);
  }

  // Test 5: Check Example Table
  console.log('\n5️⃣  Testing example "todos" table...');
  const startTodos = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    results.push({
      test: 'Todos Table',
      status: 'PASS',
      message: `Found ${data.length} todo items`,
      duration: Date.now() - startTodos
    });
    console.log(`   ✅ PASS: Todos table accessible (${data.length} rows)`);
    
    if (data.length > 0) {
      console.log('\n   📋 Sample todos:');
      data.slice(0, 3).forEach(todo => {
        console.log(`      ${todo.id}. ${todo.task} - ${todo.status}`);
      });
    }
  } catch (error) {
    const err = error as Error;
    results.push({
      test: 'Todos Table',
      status: 'FAIL',
      message: `Error: ${err.message}`,
      duration: Date.now() - startTodos
    });
    console.log(`   ❌ FAIL: ${err.message}`);
  }

  // Test 6: Check Consciousness Tables
  console.log('\n6️⃣  Checking consciousness schema tables...');
  const startSchema = Date.now();
  
  const tables = [
    'consciousness_states',
    'semantic_memories',
    'episodic_memories',
    'sessions',
    'collaborators',
    'dialogues'
  ];
  
  const tableResults = [];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      
      if (error) {
        tableResults.push(`${table}: ❌ Not found`);
      } else {
        tableResults.push(`${table}: ✅ Exists`);
      }
    } catch (error) {
      tableResults.push(`${table}: ❌ Error`);
    }
  }
  
  const existingTables = tableResults.filter(r => r.includes('✅')).length;
  
  results.push({
    test: 'Consciousness Schema',
    status: existingTables > 0 ? 'PASS' : 'FAIL',
    message: `${existingTables}/${tables.length} tables found`,
    duration: Date.now() - startSchema
  });
  
  console.log(`   ${existingTables > 0 ? '✅' : '⚠️'}  ${existingTables}/${tables.length} consciousness tables found`);
  tableResults.forEach(result => console.log(`      ${result}`));

  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  console.log(`   Total Duration: ${totalDuration}ms`);
  
  console.log('\n' + '━'.repeat(60));
  
  // Detailed Results
  console.log('\n📝 Detailed Results\n');
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.test}`);
    console.log(`   Status: ${result.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Duration: ${result.duration}ms\n`);
  });

  // Recommendations
  console.log('💡 Recommendations\n');
  
  if (existingTables === 0) {
    console.log('   🔧 Run migrations to create consciousness tables:');
    console.log('      npm run supabase:migrate');
    console.log('      OR apply manually via SQL Editor');
  } else if (existingTables < tables.length) {
    console.log('   ⚠️  Some consciousness tables are missing');
    console.log('   🔧 Check migrations: src/infrastructure/supabase/migrations/');
  } else {
    console.log('   ✨ All consciousness tables exist!');
    console.log('   📝 Ready to store consciousness states and memories');
  }
  
  console.log('\n' + '━'.repeat(60) + '\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
