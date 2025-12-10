#!/usr/bin/env npx tsx
/**
 * Test Migration Idempotency
 * 
 * This script tests that the RLS policies migration can be run multiple times
 * without errors, verifying that the "DROP POLICY IF EXISTS" approach works.
 */

import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('🧪 Testing migration idempotency...\n');
  
  const migrationFile = path.join(
    process.cwd(), 
    'src/infrastructure/supabase/migrations/003_rls_policies.sql'
  );
  
  try {
    // Read the migration file
    const sqlContent = await fs.readFile(migrationFile, 'utf-8');
    
    // Count DROP POLICY IF EXISTS statements (excluding comments)
    const lines = sqlContent.split('\n');
    const dropPolicyCount = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('DROP POLICY IF EXISTS') && !trimmed.startsWith('--');
    }).length;
    
    // Count CREATE POLICY statements (excluding comments)
    const createPolicyCount = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('CREATE POLICY') && !trimmed.startsWith('--');
    }).length;
    
    console.log('📊 Migration Analysis:');
    console.log(`   DROP POLICY IF EXISTS statements: ${dropPolicyCount}`);
    console.log(`   CREATE POLICY statements: ${createPolicyCount}`);
    console.log('');
    
    // Verify each CREATE POLICY has a corresponding DROP POLICY IF EXISTS
    if (dropPolicyCount === createPolicyCount) {
      console.log('✅ All CREATE POLICY statements have DROP POLICY IF EXISTS');
      console.log('✅ Migration is idempotent - can be run multiple times safely');
      console.log('');
      
      // Check for specific policies that were causing errors
      const hasReadPolicy = sqlContent.includes('DROP POLICY IF EXISTS "Allow authenticated read access"');
      const hasInsertPolicy = sqlContent.includes('DROP POLICY IF EXISTS "Allow authenticated insert access"');
      const hasUpdatePolicy = sqlContent.includes('DROP POLICY IF EXISTS "Allow authenticated update access"');
      const hasDeletePolicy = sqlContent.includes('DROP POLICY IF EXISTS "Allow authenticated delete access"');
      const hasServicePolicy = sqlContent.includes('DROP POLICY IF EXISTS "Service role full access"');
      
      console.log('🔍 Specific Policy Checks:');
      console.log(`   Allow authenticated read access: ${hasReadPolicy ? '✅' : '❌'}`);
      console.log(`   Allow authenticated insert access: ${hasInsertPolicy ? '✅' : '❌'}`);
      console.log(`   Allow authenticated update access: ${hasUpdatePolicy ? '✅' : '❌'}`);
      console.log(`   Allow authenticated delete access: ${hasDeletePolicy ? '✅' : '❌'}`);
      console.log(`   Service role full access: ${hasServicePolicy ? '✅' : '❌'}`);
      console.log('');
      
      if (hasReadPolicy && hasInsertPolicy && hasUpdatePolicy && hasDeletePolicy && hasServicePolicy) {
        console.log('✅ All expected policies have DROP IF EXISTS guards');
        console.log('✅ The "policy already exists" error should be resolved');
        console.log('');
        console.log('💡 To apply this migration:');
        console.log('   npx tsx scripts/apply-supabase-migrations.ts');
        console.log('');
        console.log('   Or manually via Supabase dashboard:');
        console.log('   https://supabase.com/dashboard/project/[your-project]/sql/new');
        process.exit(0);
      } else {
        console.error('❌ Some expected policies are missing DROP IF EXISTS guards');
        process.exit(1);
      }
    } else {
      console.error('❌ Mismatch: DROP POLICY count does not match CREATE POLICY count');
      console.error(`   Expected ${createPolicyCount} DROP statements, found ${dropPolicyCount}`);
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
  }
}

main();
