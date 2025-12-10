#!/usr/bin/env npx tsx
/**
 * Apply Supabase Migrations
 * 
 * This script applies database migrations to create the necessary tables
 * for consciousness states, memories, and environment storage.
 * 
 * IMPORTANT: If this script fails with network errors (ENETUNREACH, ECONNREFUSED),
 * use the manual migration approach instead:
 *   node --import tsx scripts/database/apply-migrations-via-api.ts
 * 
 * Then copy/paste the SQL into Supabase Dashboard → SQL Editor → New Query → Run
 * 
 * Connection requirements:
 * - SUPABASE_URL environment variable
 * - SUPABASE_API_KEY or SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY
 * - Optional: DATABASE_URL for custom connection string
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
  // Format options:
  //   1. Direct: postgresql://postgres:password@db.project-id.supabase.co:5432/postgres
  //   2. Pooler: postgresql://postgres.project-ref:password@aws-0-region.pooler.supabase.com:6543/postgres
  //   3. Transaction pooler: Use port 6543 for better connection pooling
  // 
  // Note: Direct connections (port 5432) may have IPv6 routing issues in some environments.
  // If DATABASE_URL is not set, we'll try the direct connection first, but provide clear
  // fallback instructions if it fails.
  const dbUrl = process.env.DATABASE_URL || 
    `postgresql://postgres:${supabaseKey}@db.${projectId}.supabase.co:5432/postgres`;
  
  console.log('📍 Project:', projectId);
  console.log('🔗 Connecting to database...\n');
  
  // Configure postgres client with better timeout and error handling
  const sql = postgres(dbUrl, {
    max: 1,
    ssl: 'prefer',
    connect_timeout: 10,
    idle_timeout: 20
  });
  
  try {
    // Check connection
    console.log('⏳ Testing database connection...\n');
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
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    
    // Provide helpful guidance based on error type
    if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('\n' + '═'.repeat(70));
      console.error('🔧 CONNECTION ISSUE DETECTED');
      console.error('═'.repeat(70));
      console.error('\nThe direct database connection failed. This can happen due to:');
      console.error('  • Network connectivity issues (IPv6/IPv4 routing)');
      console.error('  • Firewall or security group restrictions');
      console.error('  • Incorrect DATABASE_URL configuration');
      console.error('\n📋 ALTERNATIVE SOLUTION - Apply migrations manually:');
      console.error('═'.repeat(70));
      console.error('\n1️⃣  Run the manual migration helper:');
      console.error('   node --import tsx scripts/database/apply-migrations-via-api.ts\n');
      console.error('2️⃣  Copy the SQL content for each migration\n');
      console.error('3️⃣  Go to Supabase Dashboard → SQL Editor → New Query\n');
      console.error('4️⃣  Paste and run each migration\n');
      console.error(`5️⃣  Direct link: https://supabase.com/dashboard/project/${projectId}/sql/new\n`);
      console.error('═'.repeat(70));
      console.error('\n💡 TIP: The manual approach is often more reliable and gives you');
      console.error('    better visibility into what\'s being executed.\n');
    }
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
