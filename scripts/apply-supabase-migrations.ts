#!/usr/bin/env npx tsx
/**
 * Apply Supabase Migrations
 * 
 * This script applies database migrations to create the necessary tables
 * for consciousness states, memories, and other data.
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import postgres from 'postgres';

async function main() {
  console.log('🔧 Applying Supabase migrations...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_API_KEY/SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  // Extract project ID from Supabase URL
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectId) {
    console.error('❌ Invalid SUPABASE_URL format');
    process.exit(1);
  }
  
  // Construct PostgreSQL connection string for Supabase
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  const dbUrl = process.env.DATABASE_URL || `postgresql://postgres:${supabaseKey}@db.${projectId}.supabase.co:5432/postgres`;
  
  console.log('📍 Project:', projectId);
  console.log('🔗 Connecting to database...\n');
  
  const sql = postgres(dbUrl, {
    max: 1,
    ssl: 'prefer'
  });
  
  try {
    // Check connection
    const [{ version }] = await sql`SELECT version()`;
    console.log('✅ Connected to PostgreSQL');
    console.log('   Version:', version.split(' ')[0], version.split(' ')[1]);
    console.log('');
    
    // Get migration files
    const migrationsDir = path.join(process.cwd(), 'src/infrastructure/supabase/migrations');
    const files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
    
    console.log(`📂 Found ${files.length} migration files:\n`);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = await fs.readFile(filePath, 'utf-8');
      
      console.log(`   🔄 Applying ${file}...`);
      
      try {
        // Execute the migration SQL
        await sql.unsafe(sqlContent);
        console.log(`   ✅ ${file} applied successfully\n`);
      } catch (error: any) {
        // Check if error is due to already existing objects (which is OK)
        if (error.code === '42P07' || // Table already exists
            error.code === '42710' || // Object already exists  
            error.message?.includes('already exists')) {
          console.log(`   ⚠️  ${file} - objects already exist (skipping)\n`);
        } else {
          console.error(`   ❌ Failed to apply ${file}:`);
          console.error(`      ${error.message}\n`);
          throw error;
        }
      }
    }
    
    console.log('✅ All migrations applied successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
