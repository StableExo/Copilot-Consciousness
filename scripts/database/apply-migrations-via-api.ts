#!/usr/bin/env npx tsx
/**
 * Apply Supabase Migrations via API
 * 
 * Note: This requires access to the Supabase Management API or SQL Editor.
 * For now, we'll document the migrations that need to be run manually.
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('📋 Supabase Migration Instructions\n');
  console.log('═'.repeat(60));
  
  const migrationsDir = path.join(process.cwd(), 'src/infrastructure/supabase/migrations');
  const files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
  
  // Get project ID from environment or use the one from the problem statement
  const supabaseUrl = process.env.SUPABASE_URL;
  const projectId = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'ydvevgqxcfizualicbom';
  
  console.log(`\n🎯 To apply these ${files.length} migrations to your Supabase database:\n`);
  console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
  console.log('2. Copy and paste each migration SQL below (in order)');
  console.log('3. Click "Run" to execute each one');
  console.log('4. Migrations are idempotent - safe to run multiple times\n');
  console.log('═'.repeat(60));
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sqlContent = await fs.readFile(filePath, 'utf-8');
    
    console.log(`\n\n${'─'.repeat(60)}`);
    console.log(`📄 Migration: ${file}`);
    console.log('─'.repeat(60));
    console.log(sqlContent);
  }
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('✅ After running all migrations, test the connection with:');
  console.log('   npx tsx scripts/test-supabase.ts');
  console.log('═'.repeat(60) + '\n');
}

main();
