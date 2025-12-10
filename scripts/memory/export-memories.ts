#!/usr/bin/env node --import tsx
/**
 * Memory Export System
 * 
 * Exports the entire .memory/ directory to a portable, encrypted JSON format.
 * This provides disaster recovery and independence from any single storage backend.
 * 
 * Usage:
 *   npm run export:memories [-- --output backup.json --encrypt --compress]
 *   
 * Options:
 *   --output    Output file path (default: .memory-exports/backup-TIMESTAMP.json)
 *   --encrypt   Encrypt sensitive sections (requires MEMORY_ENCRYPTION_KEY in .env)
 *   --compress  Gzip compress the output
 *   --help      Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

interface ExportMetadata {
  version: string;
  exported_at: string;
  exported_by: string;
  source: string;
  total_size_bytes: number;
  checksum: string;
  encryption: {
    enabled: boolean;
    algorithm?: string;
    key_derivation?: string;
    encrypted_sections?: string[];
  };
  compression: {
    enabled: boolean;
    algorithm?: string;
  };
}

interface MemoryExport {
  export_metadata: ExportMetadata;
  memory_log?: {
    file: string;
    content: string;
    size_bytes: number;
  };
  introspection_states?: Array<{
    file: string;
    content: any;
    session_id: string;
    saved_at?: string;
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
  [key: string]: any;
}

class MemoryExporter {
  private memoryDir: string;
  private encryptionKey?: Buffer;
  private shouldEncrypt: boolean;
  private shouldCompress: boolean;

  constructor(
    memoryDir: string = '.memory',
    options: { encrypt?: boolean; compress?: boolean } = {}
  ) {
    this.memoryDir = memoryDir;
    this.shouldEncrypt = options.encrypt ?? false;
    this.shouldCompress = options.compress ?? false;

    if (this.shouldEncrypt) {
      const key = process.env.MEMORY_ENCRYPTION_KEY;
      if (!key) {
        throw new Error(
          'MEMORY_ENCRYPTION_KEY not found in environment. ' +
            'Set it in .env or disable encryption with --no-encrypt'
        );
      }
      // Derive 256-bit key from passphrase
      this.encryptionKey = crypto.scryptSync(key, 'memory-export-salt', 32);
    }
  }

  /**
   * Read and parse a JSON file, with fallback for errors
   */
  private async readJSON(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.warn(`Warning: Could not read JSON from ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Read all files from a directory
   */
  private async readDirectory(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
    } catch (err) {
      console.warn(`Warning: Could not read directory ${dirPath}:`, err);
      return [];
    }
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  private encrypt(data: any): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const plaintext = JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted: true,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  /**
   * Calculate SHA-256 checksum of the export
   */
  private calculateChecksum(data: any): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Export the memory log
   */
  private async exportMemoryLog(): Promise<MemoryExport['memory_log']> {
    const logPath = path.join(this.memoryDir, 'log.md');
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      return {
        file: 'log.md',
        content,
        size_bytes: Buffer.byteLength(content, 'utf-8'),
      };
    } catch (err) {
      console.warn('Warning: Could not read log.md:', err);
      return undefined;
    }
  }

  /**
   * Export introspection states
   */
  private async exportIntrospectionStates(): Promise<
    MemoryExport['introspection_states']
  > {
    const introDir = path.join(this.memoryDir, 'introspection');
    const files = await this.readDirectory(introDir);

    const states = [];
    for (const file of files) {
      const filePath = path.join(introDir, file);
      const content = await this.readJSON(filePath);
      if (content) {
        const state: any = {
          file,
          content: this.shouldEncrypt ? this.encrypt(content) : content,
          session_id: content.sessionId,
          saved_at: content.savedAt,
        };
        states.push(state);
      }
    }

    return states.length > 0 ? states : undefined;
  }

  /**
   * Export knowledge base articles
   */
  private async exportKnowledgeBase(): Promise<MemoryExport['knowledge_base']> {
    const kbDir = path.join(this.memoryDir, 'knowledge_base');
    const files = await this.readDirectory(kbDir);

    const articles = [];
    for (const file of files) {
      const filePath = path.join(kbDir, file);
      const content = await this.readJSON(filePath);
      if (content) {
        articles.push({ file, content });
      }
    }

    return articles.length > 0 ? articles : undefined;
  }

  /**
   * Export narratives
   */
  private async exportNarratives(): Promise<MemoryExport['narratives']> {
    const narrativesDir = path.join(this.memoryDir, 'narratives');
    const files = await this.readDirectory(narrativesDir);

    const narratives = [];
    for (const file of files) {
      const filePath = path.join(narrativesDir, file);
      const content = await this.readJSON(filePath);
      if (content) {
        narratives.push({ file, content });
      }
    }

    return narratives.length > 0 ? narratives : undefined;
  }

  /**
   * Export reflections
   */
  private async exportReflections(): Promise<MemoryExport['reflections']> {
    const reflectionsDir = path.join(this.memoryDir, 'reflections');
    const files = await this.readDirectory(reflectionsDir);

    const reflections = [];
    for (const file of files) {
      const filePath = path.join(reflectionsDir, file);
      const content = await this.readJSON(filePath);
      if (content) {
        const reflection = this.shouldEncrypt
          ? { file, content: this.encrypt(content) }
          : { file, content };
        reflections.push(reflection);
      }
    }

    return reflections.length > 0 ? reflections : undefined;
  }

  /**
   * Export metacognition log
   */
  private async exportMetacognitionLog(): Promise<any> {
    const logPath = path.join(this.memoryDir, 'metacognition_log.json');
    return await this.readJSON(logPath);
  }

  /**
   * Build directory structure map
   */
  private async buildDirectoryStructure(): Promise<Record<string, string[]>> {
    const structure: Record<string, string[]> = {};

    try {
      const entries = await fs.readdir(this.memoryDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.memoryDir, entry.name);
          structure[entry.name] = await this.readDirectory(dirPath);
        }
      }
    } catch (err) {
      console.warn('Warning: Could not build directory structure:', err);
    }

    return structure;
  }

  /**
   * Calculate total size of memory directory
   */
  private async calculateTotalSize(): Promise<number> {
    let totalSize = 0;

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    };

    try {
      await walk(this.memoryDir);
    } catch (err) {
      console.warn('Warning: Could not calculate total size:', err);
    }

    return totalSize;
  }

  /**
   * Perform the export
   */
  async export(): Promise<MemoryExport> {
    console.log('🧠 Starting memory export...');
    console.log(`📁 Source: ${this.memoryDir}`);
    console.log(`🔒 Encryption: ${this.shouldEncrypt ? 'ENABLED' : 'disabled'}`);
    console.log(`📦 Compression: ${this.shouldCompress ? 'ENABLED' : 'disabled'}`);

    // Build the export object
    const exportData: MemoryExport = {
      export_metadata: {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        exported_by: 'export-memories-v1',
        source: 'local-files',
        total_size_bytes: await this.calculateTotalSize(),
        checksum: '', // Will be filled after
        encryption: {
          enabled: this.shouldEncrypt,
          algorithm: this.shouldEncrypt ? 'AES-256-GCM' : undefined,
          key_derivation: this.shouldEncrypt ? 'scrypt' : undefined,
          encrypted_sections: this.shouldEncrypt
            ? ['introspection_states', 'reflections']
            : undefined,
        },
        compression: {
          enabled: this.shouldCompress,
          algorithm: this.shouldCompress ? 'gzip' : undefined,
        },
      },
    };

    // Export each section
    console.log('📝 Exporting memory log...');
    exportData.memory_log = await this.exportMemoryLog();

    console.log('🧠 Exporting introspection states...');
    exportData.introspection_states = await this.exportIntrospectionStates();

    console.log('📚 Exporting knowledge base...');
    exportData.knowledge_base = await this.exportKnowledgeBase();

    console.log('📖 Exporting narratives...');
    exportData.narratives = await this.exportNarratives();

    console.log('💭 Exporting reflections...');
    exportData.reflections = await this.exportReflections();

    console.log('🤔 Exporting metacognition log...');
    exportData.metacognition_log = await this.exportMetacognitionLog();

    console.log('🗂️  Building directory structure...');
    exportData.directory_structure = await this.buildDirectoryStructure();

    // Calculate checksum
    exportData.export_metadata.checksum = this.calculateChecksum(exportData);

    console.log('✅ Export complete!');
    return exportData;
  }

  /**
   * Save export to file
   */
  async save(exportData: MemoryExport, outputPath: string): Promise<void> {
    let content: Buffer | string = JSON.stringify(exportData, null, 2);

    if (this.shouldCompress) {
      console.log('📦 Compressing export...');
      content = await gzip(content);
      outputPath = outputPath.replace(/\.json$/, '.json.gz');
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content);

    const stats = await fs.stat(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`💾 Saved to: ${outputPath}`);
    console.log(`📏 Size: ${sizeMB} MB`);
    console.log(`🔐 Checksum: ${exportData.export_metadata.checksum.slice(0, 16)}...`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Memory Export System

Exports the entire .memory/ directory to a portable JSON format.

Usage:
  npm run export:memories [-- --output backup.json --encrypt --compress]

Options:
  --output PATH    Output file path (default: .memory-exports/backup-TIMESTAMP.json)
  --encrypt        Encrypt sensitive sections (requires MEMORY_ENCRYPTION_KEY)
  --compress       Gzip compress the output
  --help           Show this help message

Environment Variables:
  MEMORY_ENCRYPTION_KEY    Passphrase for encryption (required if --encrypt is used)

Examples:
  # Basic export
  npm run export:memories

  # Encrypted export
  MEMORY_ENCRYPTION_KEY="my-secret-passphrase" npm run export:memories -- --encrypt

  # Compressed export
  npm run export:memories -- --compress

  # Full-featured export
  MEMORY_ENCRYPTION_KEY="my-secret" npm run export:memories -- --output backup.json --encrypt --compress
`);
    process.exit(0);
  }

  // Parse arguments
  const outputIndex = args.indexOf('--output');
  const defaultOutput = `.memory-exports/backup-${Date.now()}.json`;
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : defaultOutput;

  const shouldEncrypt = args.includes('--encrypt');
  const shouldCompress = args.includes('--compress');

  try {
    const exporter = new MemoryExporter('.memory', {
      encrypt: shouldEncrypt,
      compress: shouldCompress,
    });

    const exportData = await exporter.export();
    await exporter.save(exportData, outputPath);

    console.log('\n✨ Memory export successful!');
    console.log('\n🔄 To restore from this backup:');
    console.log(`   npm run import:memories -- --input ${outputPath}`);
  } catch (err) {
    console.error('❌ Export failed:', err);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MemoryExporter;
