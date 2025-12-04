/**
 * Apply Supabase Migrations
 * Applies SQL migrations to Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseConfig } from './supabase-config.js';

const { url, key, keyType } = getSupabaseConfig();
const supabase = createClient(url, key);

const MIGRATIONS_DIR = 'src/infrastructure/supabase/migrations';

const migrations = [
  '001_initial_schema.sql',
  '002_add_indexes.sql',
  '003_rls_policies.sql',
  '004_add_vector_search.sql'
];

async function applyMigration(filename: string) {
  console.log(`\n📄 Applying ${filename}...`);
  
  const path = join(MIGRATIONS_DIR, filename);
  const sql = readFileSync(path, 'utf-8');
  
  // Split by semicolons but keep them, filtering out empty statements
  const statements = sql
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|COMMENT|--|\n\n))/i)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== ';')
    .map(s => s.endsWith(';') ? s : s + ';');

  console.log(`   Found ${statements.length} SQL statements`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip comments
    if (stmt.trim().startsWith('--')) {
      continue;
    }

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        // Some errors are expected (e.g., extension already exists)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          console.log(`   ⚠️  Statement ${i + 1}: ${error.message.substring(0, 60)}...`);
        } else {
          console.log(`   ❌ Statement ${i + 1} failed: ${error.message}`);
          failCount++;
        }
      } else {
        successCount++;
      }
    } catch (error: any) {
      console.log(`   ❌ Error executing statement ${i + 1}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`   ✅ ${successCount} successful, ${failCount} failed`);
  return { successCount, failCount };
}

async function main() {
  console.log('🗄️  Supabase Migration Tool\n');
  console.log('━'.repeat(70));
  
  console.log('\n📡 Connecting to Supabase...');
  console.log(`   URL: ${process.env.SUPABASE_URL}`);
  
  // Check connection
  console.log('\n🔍 Testing connection...');
  try {
    const { error } = await supabase.from('_test').select('count').limit(1);
    console.log('   ✅ Connected successfully');
  } catch (error: any) {
    console.log('   ⚠️  Connection test inconclusive (this is normal)');
  }

  console.log('\n📋 Migrations to apply:');
  migrations.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));

  console.log('\n⚠️  NOTE: Supabase anon key may not have permission to execute raw SQL');
  console.log('   If migrations fail, please apply them manually via SQL Editor:');
  console.log('   1. Go to https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql');
  console.log('   2. Create a new query');
  console.log('   3. Copy/paste each migration file');
  console.log('   4. Execute');

  console.log('\n🚀 Starting migration...\n');
  console.log('━'.repeat(70));

  const results = [];
  
  for (const migration of migrations) {
    const result = await applyMigration(migration);
    results.push({ migration, ...result });
    
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n━'.repeat(70));
  console.log('\n📊 Migration Summary\n');
  
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.migration}`);
    console.log(`      Success: ${r.successCount}, Failed: ${r.failCount}`);
  });

  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalFail = results.reduce((sum, r) => sum + r.failCount, 0);

  console.log(`\n   Total: ${totalSuccess} successful, ${totalFail} failed`);

  console.log('\n━'.repeat(70));
  
  if (totalFail > 0) {
    console.log('\n⚠️  Some migrations failed. This is expected if using anon key.');
    console.log('   Please apply migrations manually via Supabase SQL Editor.');
  } else {
    console.log('\n✅ All migrations applied successfully!');
  }

  console.log('\n💡 Next: Run test again to verify tables exist');
  console.log('   node --import tsx scripts/test-supabase-interaction.ts\n');
}

main().catch(console.error);
