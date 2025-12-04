#!/usr/bin/env node --import tsx
/**
 * Memory Import System
 * 
 * Restores the .memory/ directory from an exported JSON backup.
 * This enables disaster recovery and migration between systems.
 * 
 * Usage:
 *   npm run import:memories -- --input backup.json [--verify]
 *   
 * Options:
 *   --input     Input backup file path (required)
 *   --verify    Verify checksum before import
 *   --force     Overwrite existing files without prompting
 *   --help      Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import readline from 'readline';

const gunzip = promisify(zlib.gunzip);

interface MemoryExport {
  export_metadata: {
    version: string;
    exported_at: string;
    checksum: string;
    encryption: {
      enabled: boolean;
      algorithm?: string;
    };
    compression: {
      enabled: boolean;
    };
  };
  memory_log?: {
    file: string;
    content: string;
  };
  introspection_states?: Array<{
    file: string;
    content: any;
  }>;
  knowledge_base?: Array<{
    file: string;
    content: any;
  }>;
  narratives?: Array<{
    file: string;
    content: any;
  }>;
  reflections?: Array<{
    file: string;
    content: any;
  }>;
  metacognition_log?: any;
  directory_structure?: Record<string, string[]>;
}

class MemoryImporter {
  private memoryDir: string;
  private encryptionKey?: Buffer;
  private shouldVerify: boolean;
  private force: boolean;

  constructor(
    memoryDir: string = '.memory',
    options: { verify?: boolean; force?: boolean } = {}
  ) {
    this.memoryDir = memoryDir;
    this.shouldVerify = options.verify ?? true;
    this.force = options.force ?? false;
  }

  /**
   * Initialize encryption key if needed
   */
  private initializeEncryption() {
    const key = process.env.MEMORY_ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        'MEMORY_ENCRYPTION_KEY not found in environment. ' +
          'This backup contains encrypted data. ' +
          'Set the same key used during export.'
      );
    }
    this.encryptionKey = crypto.scryptSync(key, 'memory-export-salt', 32);
  }

  /**
   * Decrypt AES-256-GCM encrypted data
   */
  private decrypt(encryptedData: string): any {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const parsed = JSON.parse(encryptedData);
    if (!parsed.encrypted) {
      throw new Error('Data is not encrypted');
    }

    const iv = Buffer.from(parsed.iv, 'hex');
    const authTag = Buffer.from(parsed.authTag, 'hex');
    const encrypted = parsed.data;

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Calculate checksum for verification
   */
  private calculateChecksum(data: any): string {
    // Remove checksum field for calculation
    const copy = JSON.parse(JSON.stringify(data));
    copy.export_metadata.checksum = '';
    
    const content = JSON.stringify(copy);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load and parse the backup file
   */
  async loadBackup(inputPath: string): Promise<MemoryExport> {
    console.log(`📂 Loading backup from: ${inputPath}`);

    let content = await fs.readFile(inputPath);

    // Decompress if gzipped
    if (inputPath.endsWith('.gz')) {
      console.log('📦 Decompressing...');
      content = await gunzip(content);
    }

    const exportData: MemoryExport = JSON.parse(content.toString('utf-8'));

    // Verify checksum
    if (this.shouldVerify) {
      console.log('🔍 Verifying checksum...');
      const calculatedChecksum = this.calculateChecksum(exportData);
      const storedChecksum = exportData.export_metadata.checksum;

      if (calculatedChecksum !== storedChecksum) {
        throw new Error(
          'Checksum verification failed! Backup may be corrupted. ' +
            `Expected: ${storedChecksum.slice(0, 16)}..., ` +
            `Got: ${calculatedChecksum.slice(0, 16)}...`
        );
      }
      console.log('✅ Checksum verified');
    }

    // Initialize encryption if needed
    if (exportData.export_metadata.encryption?.enabled) {
      console.log('🔒 Backup contains encrypted data');
      this.initializeEncryption();
    }

    console.log(`📅 Backup created: ${exportData.export_metadata.exported_at}`);
    console.log(`📦 Version: ${exportData.export_metadata.version}`);

    return exportData;
  }

  /**
   * Check if .memory directory exists and prompt user
   */
  private async checkExisting(): Promise<boolean> {
    try {
      await fs.access(this.memoryDir);
      
      if (this.force) {
        console.log('⚠️  --force flag set, overwriting existing .memory/');
        return true;
      }

      // Prompt user
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        rl.question(
          '\n⚠️  .memory/ directory already exists. Overwrite? (yes/no): ',
          (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
          }
        );
      });
    } catch {
      // Directory doesn't exist, safe to proceed
      return true;
    }
  }

  /**
   * Import memory log
   */
  private async importMemoryLog(data: MemoryExport['memory_log']): Promise<void> {
    if (!data) return;

    const logPath = path.join(this.memoryDir, data.file);
    await fs.writeFile(logPath, data.content, 'utf-8');
    console.log(`  ✓ ${data.file}`);
  }

  /**
   * Import introspection states
   */
  private async importIntrospectionStates(
    states: MemoryExport['introspection_states']
  ): Promise<void> {
    if (!states || states.length === 0) return;

    const introDir = path.join(this.memoryDir, 'introspection');
    await fs.mkdir(introDir, { recursive: true });

    for (const state of states) {
      const filePath = path.join(introDir, state.file);
      
      // Decrypt if encrypted
      let content = state.content;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.encrypted) {
            content = this.decrypt(content);
          }
        } catch {
          // Not encrypted, use as is
        }
      }

      await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
      console.log(`  ✓ introspection/${state.file}`);
    }
  }

  /**
   * Import knowledge base
   */
  private async importKnowledgeBase(
    articles: MemoryExport['knowledge_base']
  ): Promise<void> {
    if (!articles || articles.length === 0) return;

    const kbDir = path.join(this.memoryDir, 'knowledge_base');
    await fs.mkdir(kbDir, { recursive: true });

    for (const article of articles) {
      const filePath = path.join(kbDir, article.file);
      await fs.writeFile(
        filePath,
        JSON.stringify(article.content, null, 2),
        'utf-8'
      );
      console.log(`  ✓ knowledge_base/${article.file}`);
    }
  }

  /**
   * Import narratives
   */
  private async importNarratives(
    narratives: MemoryExport['narratives']
  ): Promise<void> {
    if (!narratives || narratives.length === 0) return;

    const narrativesDir = path.join(this.memoryDir, 'narratives');
    await fs.mkdir(narrativesDir, { recursive: true });

    for (const narrative of narratives) {
      const filePath = path.join(narrativesDir, narrative.file);
      await fs.writeFile(
        filePath,
        JSON.stringify(narrative.content, null, 2),
        'utf-8'
      );
      console.log(`  ✓ narratives/${narrative.file}`);
    }
  }

  /**
   * Import reflections
   */
  private async importReflections(
    reflections: MemoryExport['reflections']
  ): Promise<void> {
    if (!reflections || reflections.length === 0) return;

    const reflectionsDir = path.join(this.memoryDir, 'reflections');
    await fs.mkdir(reflectionsDir, { recursive: true });

    for (const reflection of reflections) {
      const filePath = path.join(reflectionsDir, reflection.file);

      // Decrypt if encrypted
      let content = reflection.content;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.encrypted) {
            content = this.decrypt(content);
          }
        } catch {
          // Not encrypted, use as is
        }
      }

      await fs.writeFile(
        filePath,
        JSON.stringify(content, null, 2),
        'utf-8'
      );
      console.log(`  ✓ reflections/${reflection.file}`);
    }
  }

  /**
   * Import metacognition log
   */
  private async importMetacognitionLog(log: any): Promise<void> {
    if (!log) return;

    const logPath = path.join(this.memoryDir, 'metacognition_log.json');
    await fs.writeFile(logPath, JSON.stringify(log, null, 2), 'utf-8');
    console.log(`  ✓ metacognition_log.json`);
  }

  /**
   * Perform the import
   */
  async import(exportData: MemoryExport): Promise<void> {
    console.log('\n🧠 Starting memory import...');
    console.log(`📁 Destination: ${this.memoryDir}`);

    // Check for existing directory
    const shouldProceed = await this.checkExisting();
    if (!shouldProceed) {
      console.log('❌ Import cancelled by user');
      process.exit(0);
    }

    // Create memory directory
    await fs.mkdir(this.memoryDir, { recursive: true });

    // Import each section
    console.log('\n📝 Importing memory log...');
    await this.importMemoryLog(exportData.memory_log);

    console.log('\n🧠 Importing introspection states...');
    await this.importIntrospectionStates(exportData.introspection_states);

    console.log('\n📚 Importing knowledge base...');
    await this.importKnowledgeBase(exportData.knowledge_base);

    console.log('\n📖 Importing narratives...');
    await this.importNarratives(exportData.narratives);

    console.log('\n💭 Importing reflections...');
    await this.importReflections(exportData.reflections);

    console.log('\n🤔 Importing metacognition log...');
    await this.importMetacognitionLog(exportData.metacognition_log);

    console.log('\n✅ Import complete!');
  }

  /**
   * Verify imported data matches export
   */
  async verify(exportData: MemoryExport): Promise<boolean> {
    console.log('\n🔍 Verifying imported data...');

    let allMatch = true;

    // Verify memory log
    if (exportData.memory_log) {
      const logPath = path.join(this.memoryDir, exportData.memory_log.file);
      const content = await fs.readFile(logPath, 'utf-8');
      if (content !== exportData.memory_log.content) {
        console.log('  ❌ log.md content mismatch');
        allMatch = false;
      } else {
        console.log('  ✓ log.md');
      }
    }

    // Verify introspection states count
    if (exportData.introspection_states) {
      const introDir = path.join(this.memoryDir, 'introspection');
      try {
        const files = await fs.readdir(introDir);
        if (files.length !== exportData.introspection_states.length) {
          console.log(
            `  ❌ introspection/ file count mismatch ` +
              `(expected ${exportData.introspection_states.length}, got ${files.length})`
          );
          allMatch = false;
        } else {
          console.log(`  ✓ introspection/ (${files.length} files)`);
        }
      } catch {
        console.log('  ❌ introspection/ directory not found');
        allMatch = false;
      }
    }

    return allMatch;
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Memory Import System

Restores the .memory/ directory from an exported backup.

Usage:
  npm run import:memories -- --input backup.json [--verify --force]

Options:
  --input PATH     Input backup file path (required)
  --verify         Verify checksum before import (default: true)
  --no-verify      Skip checksum verification
  --force          Overwrite existing files without prompting
  --help           Show this help message

Environment Variables:
  MEMORY_ENCRYPTION_KEY    Passphrase for decryption (required if backup is encrypted)

Examples:
  # Basic import
  npm run import:memories -- --input backup.json

  # Import encrypted backup
  MEMORY_ENCRYPTION_KEY="my-secret-passphrase" npm run import:memories -- --input backup.json

  # Force overwrite without prompting
  npm run import:memories -- --input backup.json --force

  # Import from compressed backup
  npm run import:memories -- --input backup.json.gz
`);
    process.exit(0);
  }

  // Parse arguments
  const inputIndex = args.indexOf('--input');
  if (inputIndex < 0 || !args[inputIndex + 1]) {
    console.error('❌ Error: --input argument is required');
    console.error('   Usage: npm run import:memories -- --input backup.json');
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  const shouldVerify = !args.includes('--no-verify');
  const force = args.includes('--force');

  try {
    const importer = new MemoryImporter('.memory', {
      verify: shouldVerify,
      force,
    });

    const exportData = await importer.loadBackup(inputPath);
    await importer.import(exportData);

    // Verify if requested
    if (shouldVerify) {
      const verified = await importer.verify(exportData);
      if (verified) {
        console.log('\n✨ Import and verification successful!');
      } else {
        console.log('\n⚠️  Import completed but verification found mismatches');
      }
    } else {
      console.log('\n✨ Import successful!');
    }

    console.log('\n🔄 To export again:');
    console.log('   npm run export:memories');
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MemoryImporter;
