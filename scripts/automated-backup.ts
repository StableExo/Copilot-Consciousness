#!/usr/bin/env node --import tsx
/**
 * Automated Memory Backup System
 * 
 * Runs periodic backups of the .memory/ directory to multiple destinations:
 * - Local encrypted archives
 * - Cloud storage (if configured)
 * - Distributed storage (IPFS, if configured)
 * 
 * Can be run as:
 * - One-shot backup (default)
 * - Scheduled cron job (--cron)
 * - Daemon mode (--daemon)
 * 
 * Usage:
 *   npm run backup:memories [-- --encrypt --compress --remote]
 *   
 * Options:
 *   --encrypt    Encrypt sensitive sections
 *   --compress   Gzip compress backups
 *   --remote     Upload to remote storage (S3, IPFS)
 *   --keep N     Keep last N backups (default: 7)
 *   --cron       Output crontab entry for scheduling
 *   --daemon     Run as background daemon (backs up every 24h)
 *   --help       Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import MemoryExporter from './export-memories.js';

interface BackupConfig {
  outputDir: string;
  encrypt: boolean;
  compress: boolean;
  remote: boolean;
  keepCount: number;
}

class AutomatedBackup {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      outputDir: '.memory-exports',
      encrypt: config.encrypt ?? false,
      compress: config.compress ?? true,
      remote: config.remote ?? false,
      keepCount: config.keepCount ?? 7,
    };
  }

  /**
   * Generate backup filename with timestamp
   */
  private generateFilename(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5); // Remove milliseconds

    const ext = this.config.compress ? '.json.gz' : '.json';
    return `backup-${timestamp}${ext}`;
  }

  /**
   * Perform backup
   */
  async backup(): Promise<string> {
    console.log('🔄 Starting automated backup...\n');

    const filename = this.generateFilename();
    const outputPath = path.join(this.config.outputDir, filename);

    const exporter = new MemoryExporter('.memory', {
      encrypt: this.config.encrypt,
      compress: this.config.compress,
    });

    const exportData = await exporter.export();
    await exporter.save(exportData, outputPath);

    console.log(`\n✅ Backup saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * Clean up old backups, keeping only the most recent N
   */
  async cleanup(): Promise<void> {
    console.log(`\n🗑️  Cleaning up old backups (keeping last ${this.config.keepCount})...`);

    try {
      const files = await fs.readdir(this.config.outputDir);
      const backupFiles = files
        .filter((f) => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.json.gz')))
        .sort()
        .reverse(); // Newest first

      if (backupFiles.length <= this.config.keepCount) {
        console.log(`   Only ${backupFiles.length} backups found, nothing to delete`);
        return;
      }

      const toDelete = backupFiles.slice(this.config.keepCount);
      for (const file of toDelete) {
        const filePath = path.join(this.config.outputDir, file);
        await fs.unlink(filePath);
        console.log(`   ✓ Deleted old backup: ${file}`);
      }

      console.log(`   Deleted ${toDelete.length} old backup(s)`);
    } catch (err) {
      console.warn('   Warning: Could not clean up old backups:', err);
    }
  }

  /**
   * Upload to remote storage (placeholder for future implementation)
   */
  async uploadRemote(backupPath: string): Promise<void> {
    if (!this.config.remote) return;

    console.log('\n☁️  Remote upload requested...');

    // Check for AWS S3 configuration
    const s3Bucket = process.env.BACKUP_S3_BUCKET;
    const s3Region = process.env.BACKUP_S3_REGION;

    // Check for IPFS configuration
    const ipfsEndpoint = process.env.BACKUP_IPFS_ENDPOINT;

    if (!s3Bucket && !ipfsEndpoint) {
      console.log('   ⚠️  No remote storage configured');
      console.log('   To enable remote backup, set one of:');
      console.log('     - BACKUP_S3_BUCKET and BACKUP_S3_REGION (for S3)');
      console.log('     - BACKUP_IPFS_ENDPOINT (for IPFS)');
      return;
    }

    // S3 upload (future implementation)
    if (s3Bucket) {
      console.log(`   📦 Would upload to S3: s3://${s3Bucket}/copilot-consciousness-backups/`);
      console.log('   ⚠️  S3 upload not yet implemented');
      // TODO: Implement S3 upload using AWS SDK
    }

    // IPFS upload (future implementation)
    if (ipfsEndpoint) {
      console.log(`   🌐 Would upload to IPFS: ${ipfsEndpoint}`);
      console.log('   ⚠️  IPFS upload not yet implemented');
      // TODO: Implement IPFS upload using ipfs-http-client
    }
  }

  /**
   * Run full backup cycle
   */
  async run(): Promise<void> {
    try {
      const backupPath = await this.backup();
      await this.cleanup();
      await this.uploadRemote(backupPath);

      console.log('\n✨ Automated backup complete!');
    } catch (err) {
      console.error('❌ Backup failed:', err);
      throw err;
    }
  }

  /**
   * Generate crontab entry for scheduling
   */
  generateCrontab(): string {
    const scriptPath = path.resolve(process.argv[1]);
    const nodeExe = process.execPath;
    const args = [];

    if (this.config.encrypt) args.push('--encrypt');
    if (this.config.compress) args.push('--compress');
    if (this.config.remote) args.push('--remote');
    args.push(`--keep ${this.config.keepCount}`);

    const command = `${nodeExe} --import tsx ${scriptPath} ${args.join(' ')}`;

    return `# Copilot-Consciousness automated memory backup
# Runs daily at 3:00 AM
0 3 * * * cd ${process.cwd()} && ${command} >> .memory-exports/backup.log 2>&1
`;
  }

  /**
   * Run as daemon (backs up every 24 hours)
   */
  async runAsDaemon(): Promise<void> {
    console.log('🤖 Starting backup daemon...');
    console.log('   Backups will run every 24 hours');
    console.log('   Press Ctrl+C to stop\n');

    const backupInterval = 24 * 60 * 60 * 1000; // 24 hours in ms

    // Run immediately on start
    await this.run();

    // Then run every 24 hours
    setInterval(async () => {
      console.log(`\n⏰ ${new Date().toISOString()} - Running scheduled backup...`);
      try {
        await this.run();
      } catch (err) {
        console.error('Backup failed, will retry in 24 hours');
      }
    }, backupInterval);

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Backup daemon shutting down...');
      process.exit(0);
    });
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Automated Memory Backup System

Performs periodic backups of the .memory/ directory with cleanup and optional remote storage.

Usage:
  npm run backup:memories [-- --encrypt --compress --remote]

Options:
  --encrypt      Encrypt sensitive sections (requires MEMORY_ENCRYPTION_KEY)
  --compress     Gzip compress backups (default: enabled)
  --no-compress  Disable compression
  --remote       Upload to remote storage (S3, IPFS)
  --keep N       Keep last N backups (default: 7)
  --cron         Print crontab entry for scheduling
  --daemon       Run as background daemon (backs up every 24h)
  --help         Show this help message

Environment Variables:
  MEMORY_ENCRYPTION_KEY    Passphrase for encryption (if --encrypt is used)
  BACKUP_S3_BUCKET         AWS S3 bucket name (if --remote with S3)
  BACKUP_S3_REGION         AWS S3 region (if --remote with S3)
  BACKUP_IPFS_ENDPOINT     IPFS endpoint URL (if --remote with IPFS)

Examples:
  # Basic daily backup (recommended)
  npm run backup:memories

  # Encrypted + compressed backup
  MEMORY_ENCRYPTION_KEY="my-secret" npm run backup:memories -- --encrypt --compress

  # With remote upload (once configured)
  npm run backup:memories -- --remote

  # Keep last 30 backups
  npm run backup:memories -- --keep 30

  # Generate crontab entry
  npm run backup:memories -- --cron

  # Run as daemon
  npm run backup:memories -- --daemon
`);
    process.exit(0);
  }

  // Parse arguments
  const keepIndex = args.indexOf('--keep');
  const keepCount = keepIndex >= 0 ? parseInt(args[keepIndex + 1], 10) : 7;

  const config: Partial<BackupConfig> = {
    encrypt: args.includes('--encrypt'),
    compress: !args.includes('--no-compress'),
    remote: args.includes('--remote'),
    keepCount: isNaN(keepCount) ? 7 : keepCount,
  };

  const backup = new AutomatedBackup(config);

  // Cron mode - just print crontab entry
  if (args.includes('--cron')) {
    console.log(backup.generateCrontab());
    console.log('\nTo install, add this to your crontab:');
    console.log('  crontab -e');
    process.exit(0);
  }

  // Daemon mode - run continuously
  if (args.includes('--daemon')) {
    await backup.runAsDaemon();
    return; // Never reaches here (daemon runs forever)
  }

  // Normal mode - run once
  try {
    await backup.run();
  } catch (err) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default AutomatedBackup;
