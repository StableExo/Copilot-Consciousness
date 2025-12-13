#!/usr/bin/env tsx
/**
 * Apply Cognitive Ledger Migration
 * 
 * This script applies the 007_cognitive_ledger.sql migration to Supabase.
 * It reads the SQL file and executes it using the Supabase Management API.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function applyMigration() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║      Cognitive Ledger Migration - Application Script          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Read migration file
  console.log('📄 Reading migration file...');
  const migrationPath = join(
    process.cwd(),
    'src/infrastructure/supabase/migrations/007_cognitive_ledger.sql'
  );
  
  let migrationSQL: string;
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ Migration file loaded (${migrationSQL.length} bytes)\n`);
  } catch (error: any) {
    console.error('❌ Failed to read migration file:', error.message);
    process.exit(1);
  }

  // Create Supabase client
  console.log('🔌 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ Connected\n');

  // Check if tables already exist
  console.log('🔍 Checking existing schema...');
  const { data: existingTables, error: checkError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['memory_entries', 'arbitrage_episodes']);

  if (checkError) {
    console.warn('⚠️  Could not check existing tables (this is OK for first run)');
  } else if (existingTables && existingTables.length > 0) {
    console.warn('⚠️  Tables already exist:');
    existingTables.forEach((t: any) => console.warn(`   - ${t.table_name}`));
    console.warn('\nThis migration may fail if tables already exist.');
    console.warn('Consider dropping tables first or skipping migration.\n');
    
    // Optionally exit
    if (process.env.FORCE_MIGRATION !== 'true') {
      console.log('💡 Set FORCE_MIGRATION=true to proceed anyway\n');
      process.exit(0);
    }
  }

  // Apply migration
  console.log('🚀 Applying migration...\n');
  
  try {
    // Execute the SQL migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If exec_sql doesn't exist, we'll need to execute it differently
      console.log('⚠️  Direct SQL execution not available.');
      console.log('   Please apply the migration manually using Supabase SQL Editor:');
      console.log(`   File: ${migrationPath}\n`);
      console.log('   Steps:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Create new query');
      console.log('   3. Paste contents of 007_cognitive_ledger.sql');
      console.log('   4. Run query\n');
      
      // Write instructions to file for easy reference
      const instructionsPath = join(process.cwd(), 'MIGRATION_INSTRUCTIONS.md');
      const instructions = `# Cognitive Ledger Migration Instructions

## Apply via Supabase Dashboard

1. **Open Supabase Dashboard**: ${SUPABASE_URL.replace('https://', 'https://app.')}
2. **Navigate to**: SQL Editor
3. **Create new query**
4. **Copy migration file**: \`${migrationPath}\`
5. **Paste and Run**

## Or use Supabase CLI

\`\`\`bash
# If you have supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
\`\`\`

## Verify Migration

After applying, run the test script:

\`\`\`bash
npm run test:cognitive-ledger
\`\`\`

## Migration File Location

\`${migrationPath}\`
`;
      
      writeFileSync(instructionsPath, instructions);
      console.log(`📝 Instructions written to: ${instructionsPath}\n`);
      
      process.exit(0);
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying schema...');
    const { data: newTables, error: verifyError } = await supabase
      .from('memory_entries')
      .select('id')
      .limit(0);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.error('   Tables may not have been created correctly.\n');
      process.exit(1);
    }

    console.log('✅ Schema verified successfully!\n');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION COMPLETE!                                        ║');
    console.log('║                                                                ║');
    console.log('║  New tables created:                                          ║');
    console.log('║  • memory_entries (immutable ledger)                          ║');
    console.log('║  • arbitrage_episodes (decision engine)                       ║');
    console.log('║                                                                ║');
    console.log('║  New views created:                                           ║');
    console.log('║  • timeline_view (unified event stream)                       ║');
    console.log('║  • learning_opportunities (mistake detection)                 ║');
    console.log('║  • decision_pattern_analysis (success patterns)               ║');
    console.log('║                                                                ║');
    console.log('║  Next steps:                                                  ║');
    console.log('║  1. Run test script: npm run test:cognitive-ledger           ║');
    console.log('║  2. Migrate existing data if needed                          ║');
    console.log('║  3. Integrate with consciousness system                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration().catch(console.error);

// Helper to write file (imported from fs)
import { writeFileSync } from 'fs';
