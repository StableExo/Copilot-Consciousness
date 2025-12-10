#!/usr/bin/env node
/**
 * Test Supabase Connection Script
 * 
 * Verifies Supabase configuration and connectivity.
 * Tests both JavaScript client and postgres.js connections.
 * 
 * Usage:
 *   npm run test:supabase:connection
 *   node --import tsx scripts/test-supabase-connection.ts
 */

import { config } from 'dotenv';
import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  shouldUseSupabase 
} from '../src/infrastructure/supabase/client.js';

// Load environment variables
config();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testConfiguration(): Promise<TestResult> {
  console.log('\n🔍 Testing Supabase Configuration...');
  
  try {
    const configured = isSupabaseConfigured();
    const shouldUse = shouldUseSupabase();
    
    const requiredVars = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      USE_SUPABASE: process.env.USE_SUPABASE,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing',
    };
    
    console.log('Configuration Status:');
    console.log('  Configured:', configured);
    console.log('  Should Use Supabase:', shouldUse);
    console.log('  Environment Variables:', requiredVars);
    
    return {
      name: 'Configuration Check',
      passed: configured && shouldUse,
      message: configured && shouldUse 
        ? 'Supabase is properly configured' 
        : 'Supabase configuration is incomplete',
      details: requiredVars,
    };
  } catch (error: any) {
    return {
      name: 'Configuration Check',
      passed: false,
      message: `Configuration check failed: ${error.message}`,
      details: error,
    };
  }
}

async function testConnection(): Promise<TestResult> {
  console.log('\n🔌 Testing Supabase Client Connection...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Test basic query - get current timestamp
    const { data, error } = await supabase
      .from('consciousness_states')
      .select('count')
      .limit(1);
    
    if (error) {
      // Check if it's just an empty table or missing table (both are OK)
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        console.log('  ✓ Connection successful (table is empty)');
        return {
          name: 'Connection Test',
          passed: true,
          message: 'Successfully connected to Supabase (table is empty)',
        };
      }
      
      throw error;
    }
    
    console.log('  ✓ Connection successful');
    console.log('  Data:', data);
    
    return {
      name: 'Connection Test',
      passed: true,
      message: 'Successfully connected to Supabase',
      details: data,
    };
  } catch (error: any) {
    console.error('  ✗ Connection failed:', error.message);
    return {
      name: 'Connection Test',
      passed: false,
      message: `Connection failed: ${error.message}`,
      details: error,
    };
  }
}

async function testDatabaseQuery(): Promise<TestResult> {
  console.log('\n📊 Testing Database Query...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Try a simple SELECT NOW() query
    const { data, error } = await supabase.rpc('get_current_timestamp', {});
    
    if (error) {
      // Try alternative - direct query to a table
      console.log('  Trying alternative query method...');
      const { data: tableData, error: tableError } = await supabase
        .from('sessions')
        .select('session_id')
        .limit(1);
      
      if (tableError && !tableError.message.includes('no rows')) {
        throw tableError;
      }
      
      console.log('  ✓ Query successful (using table query)');
      return {
        name: 'Database Query Test',
        passed: true,
        message: 'Database queries work',
        details: tableData,
      };
    }
    
    console.log('  ✓ Query successful');
    console.log('  Result:', data);
    
    return {
      name: 'Database Query Test',
      passed: true,
      message: 'Database queries work correctly',
      details: data,
    };
  } catch (error: any) {
    console.error('  ✗ Query failed:', error.message);
    
    // If query fails, that's OK as long as connection works
    if (error.message.includes('not found') || error.code === '42883') {
      return {
        name: 'Database Query Test',
        passed: true,
        message: 'Connection works (function not found is OK)',
        details: 'Connection established successfully',
      };
    }
    
    return {
      name: 'Database Query Test',
      passed: false,
      message: `Query failed: ${error.message}`,
      details: error,
    };
  }
}

async function testTableAccess(): Promise<TestResult> {
  console.log('\n📋 Testing Table Access...');
  
  try {
    const supabase = getSupabaseClient();
    
    const tables = [
      'consciousness_states',
      'thoughts',
      'semantic_memories',
      'episodic_memories',
      'arbitrage_executions',
      'sessions',
      'autonomous_goals',
    ];
    
    const tableResults: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(0);
        
        tableResults[table] = !error || error.code === 'PGRST116';
      } catch (err) {
        tableResults[table] = false;
      }
    }
    
    const accessibleTables = Object.entries(tableResults)
      .filter(([, accessible]) => accessible)
      .map(([table]) => table);
    
    console.log('  Accessible tables:', accessibleTables.length, '/', tables.length);
    console.log('  Tables:', accessibleTables.join(', '));
    
    return {
      name: 'Table Access Test',
      passed: accessibleTables.length >= 5, // At least 5 tables accessible
      message: `${accessibleTables.length}/${tables.length} tables accessible`,
      details: tableResults,
    };
  } catch (error: any) {
    console.error('  ✗ Table access test failed:', error.message);
    return {
      name: 'Table Access Test',
      passed: false,
      message: `Table access test failed: ${error.message}`,
      details: error,
    };
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Supabase Connection Test Suite');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Run all tests
  results.push(await testConfiguration());
  
  if (results[0].passed) {
    results.push(await testConnection());
    results.push(await testDatabaseQuery());
    results.push(await testTableAccess());
  } else {
    console.log('\n⚠️  Skipping connection tests due to configuration errors');
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${icon} ${result.name}: ${result.message}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Overall: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (passed === total) {
    console.log('✅ All tests passed! Supabase is ready to use.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
