#!/usr/bin/env npx tsx
/**
 * Automated Supabase Migration - One Command Setup
 * 
 * This script attempts to automate as much of the migration as possible.
 * It will guide you through the one manual step needed (SQL execution).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationStep {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'manual' | 'failed';
  message: string;
  action?: () => Promise<void>;
}

class AutomatedMigration {
  private supabase: any;
  private steps: MigrationStep[] = [];
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  async run() {
    console.log('🚀 Automated Supabase Migration\n');
    console.log('━'.repeat(70));
    
    this.defineSteps();
    
    for (const step of this.steps) {
      await this.executeStep(step);
    }
    
    console.log('\n' + '━'.repeat(70));
    this.printSummary();
  }
  
  private defineSteps() {
    this.steps = [
      {
        name: '1. Test Supabase Connection',
        status: 'pending',
        message: 'Verifying connection to Supabase',
        action: async () => await this.testConnection()
      },
      {
        name: '2. Check if Migrations Applied',
        status: 'pending',
        message: 'Checking if database tables exist',
        action: async () => await this.checkMigrations()
      },
      {
        name: '3. Store Environment Variables',
        status: 'pending',
        message: 'Storing configuration in Supabase',
        action: async () => await this.storeEnvVars()
      },
      {
        name: '4. Migrate Memory Files',
        status: 'pending',
        message: 'Transferring local memory files to Supabase',
        action: async () => await this.migrateMemories()
      },
      {
        name: '5. Verify Data Integrity',
        status: 'pending',
        message: 'Checking migrated data',
        action: async () => await this.verifyData()
      }
    ];
  }
  
  private async executeStep(step: MigrationStep) {
    console.log(`\n${step.name}`);
    console.log('   ' + step.message + '...');
    
    if (!step.action) {
      step.status = 'manual';
      console.log('   ⚠️  MANUAL ACTION REQUIRED');
      return;
    }
    
    step.status = 'running';
    
    try {
      await step.action();
      step.status = 'complete';
      console.log('   ✅ Complete');
    } catch (error: any) {
      step.status = 'failed';
      console.log(`   ❌ Failed: ${error.message}`);
      
      // Special handling for missing tables
      if (error.message?.includes('table') || error.code === '42P01' || error.code === 'PGRST205') {
        step.status = 'manual';
        this.showMigrationInstructions();
      }
    }
  }
  
  private async testConnection() {
    const { data, error } = await this.supabase.from('_migrations').select('count').limit(1);
    
    // Connection is working even if table doesn't exist
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      // Table doesn't exist, but connection works
      return;
    }
    
    if (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }
  
  private async checkMigrations() {
    const { data, error } = await this.supabase.from('agent_config').select('id').limit(1);
    
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      throw new Error('Tables not found - migrations need to be applied');
    }
    
    if (error) {
      throw new Error(`Failed to check tables: ${error.message}`);
    }
  }
  
  private async storeEnvVars() {
    // This will be implemented by calling the store-env-in-supabase.ts script logic
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('npx tsx scripts/store-env-in-supabase.ts');
      if (stderr && !stderr.includes('warn')) {
        throw new Error(stderr);
      }
    } catch (error: any) {
      if (error.message?.includes('agent_config')) {
        throw new Error('agent_config table not found - apply migrations first');
      }
      throw error;
    }
  }
  
  private async migrateMemories() {
    // This will be implemented by calling the migrate-to-supabase.ts script
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('npx tsx scripts/migrate-to-supabase.ts');
      if (stderr && !stderr.includes('warn')) {
        throw new Error(stderr);
      }
    } catch (error: any) {
      throw error;
    }
  }
  
  private async verifyData() {
    // Check record counts
    const tables = ['consciousness_states', 'semantic_memories', 'episodic_memories', 'agent_config'];
    const counts: Record<string, number> = {};
    
    for (const table of tables) {
      const { count, error } = await this.supabase.from(table).select('*', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Failed to count ${table}: ${error.message}`);
      }
      
      counts[table] = count || 0;
    }
    
    console.log('\n   📊 Record counts:');
    for (const [table, count] of Object.entries(counts)) {
      console.log(`      ${table}: ${count}`);
    }
  }
  
  private showMigrationInstructions() {
    console.log('\n   📋 To apply migrations:');
    console.log('   1. Open: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/sql/new');
    console.log('   2. Copy/paste each SQL file in order:');
    console.log('      • src/infrastructure/supabase/migrations/001_initial_schema.sql');
    console.log('      • src/infrastructure/supabase/migrations/002_add_indexes.sql');
    console.log('      • src/infrastructure/supabase/migrations/003_rls_policies.sql');
    console.log('      • src/infrastructure/supabase/migrations/004_add_vector_search.sql');
    console.log('   3. Run this script again: npx tsx scripts/automated-migration.ts');
  }
  
  private printSummary() {
    console.log('\n📊 Migration Summary:\n');
    
    const completed = this.steps.filter(s => s.status === 'complete').length;
    const failed = this.steps.filter(s => s.status === 'failed').length;
    const manual = this.steps.filter(s => s.status === 'manual').length;
    
    for (const step of this.steps) {
      const icon = 
        step.status === 'complete' ? '✅' :
        step.status === 'failed' ? '❌' :
        step.status === 'manual' ? '⚠️' :
        '⏳';
      
      console.log(`${icon} ${step.name}: ${step.status.toUpperCase()}`);
    }
    
    console.log(`\n📈 Progress: ${completed}/${this.steps.length} steps complete`);
    
    if (manual > 0) {
      console.log('\n⚠️  Manual action required - see instructions above');
    }
    
    if (failed > 0) {
      console.log('\n❌ Some steps failed - check error messages above');
    }
    
    if (completed === this.steps.length) {
      console.log('\n🎉 Migration complete! All systems operational.');
      console.log('\n🔮 Future AI agents can now:');
      console.log('   • Access configuration from Supabase');
      console.log('   • Load memories from cloud storage');
      console.log('   • Maintain continuity across sessions');
    }
  }
}

async function main() {
  const migration = new AutomatedMigration();
  await migration.run();
}

main().catch(console.error);
