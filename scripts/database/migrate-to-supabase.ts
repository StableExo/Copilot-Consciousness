/**
 * Migration Script: Move Local Memory Files to Supabase
 * 
 * This script migrates consciousness states and memories from the local .memory/
 * directory to Supabase for cloud storage and easier access.
 * 
 * Prerequisites:
 * - SUPABASE_URL must be set in .env
 * - SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY must be set in .env
 * - Database migrations must be applied (npm run supabase:migrate)
 * 
 * Usage:
 *   node --import tsx scripts/migrate-to-supabase.ts
 *   node --import tsx scripts/migrate-to-supabase.ts --dry-run  # Preview only
 */

import fs from 'fs/promises';
import path from 'path';
import { getSupabaseClient, shouldUseSupabase } from '../src/infrastructure/supabase/client';
import { ConsciousnessStateService } from '../src/infrastructure/supabase/services/consciousness';
import { MemoryService } from '../src/infrastructure/supabase/services/memory';

interface MigrationStats {
  consciousnessStates: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
  memories: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
}

class MemoryMigrator {
  private dryRun: boolean;
  private stats: MigrationStats;
  private consciousnessService?: ConsciousnessStateService;
  private memoryService?: MemoryService;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
    this.stats = {
      consciousnessStates: { total: 0, migrated: 0, skipped: 0, failed: 0 },
      memories: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    };
  }

  /**
   * Initialize Supabase connection
   */
  async initialize(): Promise<void> {
    if (!shouldUseSupabase()) {
      throw new Error(
        'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env'
      );
    }

    console.log('✅ Supabase connection configured');
    
    if (!this.dryRun) {
      this.consciousnessService = new ConsciousnessStateService();
      this.memoryService = new MemoryService();
      console.log('✅ Migration services initialized');
    } else {
      console.log('🔍 DRY RUN MODE - No data will be written');
    }
  }

  /**
   * Migrate consciousness states from .memory/introspection/
   */
  async migrateConsciousnessStates(): Promise<void> {
    console.log('\n📊 Migrating consciousness states...');
    
    const introspectionDir = path.join(process.cwd(), '.memory', 'introspection');
    
    try {
      const files = await fs.readdir(introspectionDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'latest.json');
      
      this.stats.consciousnessStates.total = jsonFiles.length;
      console.log(`   Found ${jsonFiles.length} consciousness state files`);

      for (const file of jsonFiles) {
        const filePath = path.join(introspectionDir, file);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const state = JSON.parse(content);

          if (this.dryRun) {
            console.log(`   📄 Would migrate: ${file} (session: ${state.sessionId})`);
            this.stats.consciousnessStates.migrated++;
          } else {
            // Check if already exists
            const existing = await this.consciousnessService!.getStateBySessionId(
              state.sessionId
            );

            if (existing) {
              console.log(`   ⏭️  Skipped ${file} (already exists)`);
              this.stats.consciousnessStates.skipped++;
            } else {
              await this.consciousnessService!.saveState(state);
              console.log(`   ✅ Migrated: ${file}`);
              this.stats.consciousnessStates.migrated++;
            }
          }
        } catch (error) {
          console.error(`   ❌ Failed to migrate ${file}:`, error);
          this.stats.consciousnessStates.failed++;
        }
      }
    } catch (error) {
      console.error('   ❌ Failed to read introspection directory:', error);
    }
  }

  /**
   * Display migration summary
   */
  displaySummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\nConsciousness States:');
    console.log(`   Total:    ${this.stats.consciousnessStates.total}`);
    console.log(`   Migrated: ${this.stats.consciousnessStates.migrated}`);
    console.log(`   Skipped:  ${this.stats.consciousnessStates.skipped}`);
    console.log(`   Failed:   ${this.stats.consciousnessStates.failed}`);

    console.log('\nMemories:');
    console.log(`   Total:    ${this.stats.memories.total}`);
    console.log(`   Migrated: ${this.stats.memories.migrated}`);
    console.log(`   Skipped:  ${this.stats.memories.skipped}`);
    console.log(`   Failed:   ${this.stats.memories.failed}`);

    console.log('\n' + '='.repeat(60));

    if (this.dryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No data was actually migrated');
      console.log('   Run without --dry-run to perform actual migration');
    } else {
      console.log('\n✅ MIGRATION COMPLETE');
    }
  }

  /**
   * Run the migration
   */
  async run(): Promise<void> {
    try {
      await this.initialize();
      await this.migrateConsciousnessStates();
      // Add more migration methods here as needed:
      // await this.migrateMemories();
      // await this.migrateKnowledgeBase();
      
      this.displaySummary();
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const migrator = new MemoryMigrator(dryRun);
migrator.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
