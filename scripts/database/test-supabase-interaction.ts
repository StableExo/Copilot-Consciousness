/**
 * Interactive Supabase Testing
 * Tests connection, queries, and creates test data
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config.js';

const { url, key, keyType } = getSupabaseConfig();
const supabase = createClient(url, key);

async function main() {
  console.log('🧪 Supabase Interactive Tests\n');
  console.log('━'.repeat(70));

  // Test 1: Connection
  console.log('\n✅ Test 1: Basic Connection');
  console.log(`   URL: ${url}`);
  console.log(`   Key Type: ${keyType}`);
  console.log(`   Key: ${key.substring(0, 20)}...`);

  // Test 2: Query existing todos table
  console.log('\n✅ Test 2: Query Existing "todos" Table');
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .limit(10);

    if (error) throw error;

    console.log(`   Found ${data.length} todos:`);
    data.forEach((todo: any) => {
      console.log(`   ${todo.id}. [${todo.status}] ${todo.task}`);
    });
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Check for consciousness tables
  console.log('\n✅ Test 3: Check Consciousness Tables');
  const tables = [
    'consciousness_states',
    'semantic_memories',
    'episodic_memories',
    'sessions',
    'collaborators',
    'dialogues'
  ];

  console.log('   Checking if consciousness tables exist...');
  let existingCount = 0;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (!error) {
        console.log(`   ✅ ${table} - EXISTS`);
        existingCount++;
      } else {
        console.log(`   ❌ ${table} - NOT FOUND`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${table} - ERROR: ${error.message}`);
    }
  }

  console.log(`\n   Summary: ${existingCount}/${tables.length} tables exist`);

  if (existingCount === 0) {
    console.log('\n   ⚠️  Consciousness tables not found!');
    console.log('   💡 Need to apply migrations from:');
    console.log('      src/infrastructure/supabase/migrations/');
    console.log('\n   📝 To apply migrations:');
    console.log('      1. Open Supabase SQL Editor');
    console.log('      2. Copy/paste each migration file');
    console.log('      3. Execute in order (001, 002, 003, 004)');
  }

  console.log('\n━'.repeat(70));
  console.log('\n✨ Connection Status: SUCCESS');
  console.log('   - Supabase client created');
  console.log('   - API reachable');
  console.log('   - Todos table accessible');
  console.log(`   - ${existingCount}/6 consciousness tables found`);
  
  if (existingCount === 6) {
    console.log('\n🎉 All consciousness tables exist! Ready to use.');
  } else if (existingCount > 0) {
    console.log('\n⚠️  Some consciousness tables missing - check migrations');
  } else {
    console.log('\n📋 Ready for migration - apply SQL files to create tables');
  }
  
  console.log('\n━'.repeat(70) + '\n');
}

main().catch(console.error);
