#!/usr/bin/env node
/**
 * Migrate Repository Files to Supabase
 * Migrates documentation, memory logs, and data files to Supabase cloud storage
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { glob } from 'glob';

dotenv.config();

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || DRY_RUN;
const ARCHIVE_DIR = path.join(process.cwd(), '.migrated-files');
const SUMMARY_MAX_LENGTH = 500; // Maximum characters for session summary

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Statistics
const stats = {
  documentation: { scanned: 0, migrated: 0, skipped: 0, errors: 0 },
  memoryLogs: { scanned: 0, migrated: 0, skipped: 0, errors: 0 },
  dataFiles: { scanned: 0, migrated: 0, skipped: 0, errors: 0 },
  totalBytes: 0,
  startTime: Date.now(),
};

/**
 * Determine document type from filename
 */
function getDocType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.startsWith('session_summary')) return 'session_summary';
  if (lower.includes('guide')) return 'guide';
  if (lower.includes('status')) return 'status';
  if (lower.includes('analysis') || lower.includes('deep_dive')) return 'analysis';
  if (lower === 'readme.md') return 'readme';
  if (lower.includes('integration') || lower.includes('implementation')) return 'implementation';
  if (lower.includes('summary')) return 'summary';
  return 'guide';
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  // Fallback: use filename without extension
  return filename.replace(/\.md$/i, '').replace(/_/g, ' ');
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Extract tags from filename and content
 */
function extractTags(filename: string, content: string): string[] {
  const tags: Set<string> = new Set();
  
  // From filename
  const nameParts = filename.toLowerCase().replace(/\.md$/i, '').split(/[-_]/);
  nameParts.forEach(part => {
    if (part.length > 3) tags.add(part);
  });
  
  // From content (look for common keywords)
  const keywords = ['supabase', 'consciousness', 'memory', 'bitcoin', 'mev', 'arbitrage', 'ml', 'autonomous'];
  keywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) {
      tags.add(keyword);
    }
  });
  
  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

/**
 * Migrate documentation files
 */
async function migrateDocumentation() {
  console.log('\n📄 Migrating Documentation Files...');
  
  // Find all markdown files in root directory
  const mdFiles = fs.readdirSync(process.cwd())
    .filter(f => f.endsWith('.md') && f !== 'README.md') // Keep README local
    .filter(f => !f.startsWith('.')); // Skip hidden files
  
  stats.documentation.scanned = mdFiles.length;
  
  for (const filename of mdFiles) {
    try {
      const filepath = path.join(process.cwd(), filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      const fileStats = fs.statSync(filepath);
      
      const docType = getDocType(filename);
      const title = extractTitle(content, filename);
      const wordCount = countWords(content);
      const tags = extractTags(filename, content);
      
      if (VERBOSE) {
        console.log(`  Processing: ${filename}`);
        console.log(`    Type: ${docType}, Size: ${fileStats.size} bytes, Words: ${wordCount}`);
      }
      
      if (!DRY_RUN) {
        // Check if already exists
        const { data: existing, error: checkError } = await supabase
          .from('documentation')
          .select('id')
          .eq('filepath', filepath)
          .single();
        
        if (existing) {
          console.log(`  ⏭️  Skipping ${filename} (already exists)`);
          stats.documentation.skipped++;
          continue;
        }
        
        // Insert into Supabase
        const { error } = await supabase
          .from('documentation')
          .insert({
            filename,
            filepath,
            doc_type: docType,
            title,
            content,
            markdown_content: content,
            file_size_bytes: fileStats.size,
            word_count: wordCount,
            tags,
            created_at: fileStats.birthtime,
            updated_at: fileStats.mtime,
          });
        
        if (error) {
          console.error(`  ❌ Error migrating ${filename}: ${error.message}`);
          stats.documentation.errors++;
        } else {
          console.log(`  ✅ Migrated ${filename}`);
          stats.documentation.migrated++;
          stats.totalBytes += fileStats.size;
        }
      } else {
        console.log(`  [DRY RUN] Would migrate: ${filename}`);
        stats.documentation.migrated++;
        stats.totalBytes += fileStats.size;
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error processing ${filename}: ${error.message}`);
      stats.documentation.errors++;
    }
  }
}

/**
 * Migrate memory directory
 */
async function migrateMemoryDirectory() {
  console.log('\n🧠 Migrating Memory Directory...');
  
  const memoryDir = path.join(process.cwd(), '.memory');
  
  if (!fs.existsSync(memoryDir)) {
    console.log('  ⚠️  .memory directory not found, skipping');
    return;
  }
  
  // Migrate memory log
  await migrateMemoryLog(path.join(memoryDir, 'log.md'));
  
  // Migrate knowledge base
  await migrateKnowledgeBase(path.join(memoryDir, 'knowledge_base'));
  
  // Migrate other JSON files
  await migrateMemoryFiles(memoryDir);
}

/**
 * Migrate memory log file
 */
async function migrateMemoryLog(logPath: string) {
  if (!fs.existsSync(logPath)) {
    console.log('  ⚠️  log.md not found, skipping');
    return;
  }
  
  console.log('  📝 Parsing memory log...');
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const sessions = parseMemoryLog(content);
  
  stats.memoryLogs.scanned = sessions.length;
  
  for (const session of sessions) {
    try {
      if (VERBOSE) {
        console.log(`    Processing session: ${session.title}`);
      }
      
      if (!DRY_RUN) {
        // Check if already exists
        const { data: existing } = await supabase
          .from('memory_logs')
          .select('id')
          .eq('session_date', session.date)
          .eq('session_title', session.title)
          .single();
        
        if (existing) {
          stats.memoryLogs.skipped++;
          continue;
        }
        
        // Insert into Supabase
        const { error } = await supabase
          .from('memory_logs')
          .insert({
            session_date: session.date,
            session_title: session.title,
            collaborator: session.collaborator,
            topic: session.topic,
            session_type: session.sessionType,
            content: session.content,
            summary: session.summary,
            created_at: session.createdAt,
            word_count: countWords(session.content),
            tags: session.tags,
          });
        
        if (error) {
          console.error(`    ❌ Error: ${error.message}`);
          stats.memoryLogs.errors++;
        } else {
          stats.memoryLogs.migrated++;
        }
      } else {
        stats.memoryLogs.migrated++;
      }
      
    } catch (error: any) {
      console.error(`    ❌ Error: ${error.message}`);
      stats.memoryLogs.errors++;
    }
  }
  
  console.log(`  ✅ Processed ${sessions.length} session logs`);
}

/**
 * Parse memory log into sessions
 */
function parseMemoryLog(content: string): any[] {
  const sessions: any[] = [];
  const sessionBlocks = content.split(/^## Session:/gm).slice(1);
  
  for (const block of sessionBlocks) {
    const lines = block.split('\n');
    const header = lines[0].trim();
    
    // Parse header: "2025-12-05 - Bitcoin Mempool Integration Preparation Complete 🪙⚡✨"
    const match = header.match(/^([0-9-]+)\s*-\s*(.+)$/);
    if (!match) continue;
    
    const [, dateStr, titleFull] = match;
    // Remove emojis using Unicode ranges (more comprehensive than specific chars)
    const title = titleFull.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
    
    // Extract metadata
    let collaborator = 'StableExo';
    let topic = title;
    let sessionType = 'Collaborative';
    
    for (const line of lines.slice(1, 10)) {
      if (line.includes('**Collaborator**:')) {
        collaborator = line.split(':')[1].trim();
      } else if (line.includes('**Topic**:')) {
        topic = line.split(':')[1].trim();
      } else if (line.includes('**Session Type**:')) {
        sessionType = line.split(':')[1].trim();
      }
    }
    
    sessions.push({
      date: dateStr,
      title,
      collaborator,
      topic,
      sessionType,
      content: block,
      summary: lines.slice(1, 5).join(' ').substring(0, SUMMARY_MAX_LENGTH),
      createdAt: new Date(dateStr),
      tags: extractTags(title, block),
    });
  }
  
  return sessions;
}

/**
 * Migrate knowledge base articles
 */
async function migrateKnowledgeBase(kbDir: string) {
  if (!fs.existsSync(kbDir)) {
    console.log('  ⚠️  knowledge_base directory not found, skipping');
    return;
  }
  
  console.log('  📚 Migrating knowledge base articles...');
  
  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.json'));
  
  for (const filename of files) {
    try {
      const filepath = path.join(kbDir, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      const article = JSON.parse(content);
      
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('knowledge_articles')
          .upsert({
            article_id: article.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            tags: article.tags || [],
            category: article.category,
            related_memories: article.relatedMemories || [],
          });
        
        if (error) {
          console.error(`    ❌ Error: ${error.message}`);
        }
      }
      
    } catch (error: any) {
      console.error(`    ❌ Error processing ${filename}: ${error.message}`);
    }
  }
}

/**
 * Migrate other memory files
 */
async function migrateMemoryFiles(memoryDir: string) {
  console.log('  📦 Migrating other memory files...');
  
  // Find all JSON files in memory directory (recursively)
  const jsonFiles = await glob('**/*.json', {
    cwd: memoryDir,
    ignore: ['**/node_modules/**', '**/knowledge_base/**'],
  });
  
  for (const relativePath of jsonFiles) {
    try {
      const filepath = path.join(memoryDir, relativePath);
      const content = fs.readFileSync(filepath, 'utf-8');
      const fileStats = fs.statSync(filepath);
      
      if (VERBOSE) {
        console.log(`    Processing: ${relativePath}`);
      }
      
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('data_files')
          .upsert({
            filename: path.basename(relativePath),
            filepath: filepath.replace(process.cwd(), ''),
            file_type: 'json',
            content,
            parsed_data: JSON.parse(content),
            file_size_bytes: fileStats.size,
            tags: ['memory', 'json'],
            category: 'memory',
          });
        
        if (error && !error.message.includes('duplicate')) {
          console.error(`    ❌ Error: ${error.message}`);
          stats.dataFiles.errors++;
        } else {
          stats.dataFiles.migrated++;
        }
      } else {
        stats.dataFiles.migrated++;
      }
      
    } catch (error: any) {
      console.error(`    ❌ Error processing ${relativePath}: ${error.message}`);
      stats.dataFiles.errors++;
    }
  }
}

/**
 * Migrate data files
 */
async function migrateDataFiles() {
  console.log('\n📊 Migrating Data Files...');
  
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    console.log('  ⚠️  data directory not found, skipping');
    return;
  }
  
  // Find CSV and JSON files
  const files = await glob('**/*.{csv,json}', {
    cwd: dataDir,
    ignore: ['**/node_modules/**'],
  });
  
  stats.dataFiles.scanned = files.length;
  
  for (const relativePath of files) {
    try {
      const filepath = path.join(dataDir, relativePath);
      const content = fs.readFileSync(filepath, 'utf-8');
      const fileStats = fs.statSync(filepath);
      const fileType = path.extname(relativePath).substring(1);
      
      if (VERBOSE) {
        console.log(`  Processing: ${relativePath}`);
      }
      
      let parsedData = null;
      let rowCount = null;
      
      if (fileType === 'json') {
        try {
          parsedData = JSON.parse(content);
        } catch {
          // Invalid JSON, store as text
        }
      } else if (fileType === 'csv') {
        rowCount = content.split('\n').length - 1;
      }
      
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('data_files')
          .upsert({
            filename: path.basename(relativePath),
            filepath: filepath.replace(process.cwd(), ''),
            file_type: fileType,
            content,
            parsed_data: parsedData,
            file_size_bytes: fileStats.size,
            row_count: rowCount,
            tags: [fileType, 'data'],
            category: 'data',
          });
        
        if (error && !error.message.includes('duplicate')) {
          console.error(`  ❌ Error: ${error.message}`);
          stats.dataFiles.errors++;
        } else {
          console.log(`  ✅ Migrated ${relativePath}`);
          stats.dataFiles.migrated++;
        }
      } else {
        console.log(`  [DRY RUN] Would migrate: ${relativePath}`);
        stats.dataFiles.migrated++;
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error processing ${relativePath}: ${error.message}`);
      stats.dataFiles.errors++;
    }
  }
}

/**
 * Archive migrated files
 */
async function archiveMigratedFiles() {
  if (DRY_RUN) {
    console.log('\n📦 [DRY RUN] Skipping file archival');
    return;
  }
  
  console.log('\n📦 Archiving migrated files...');
  console.log('  (Files will be moved to .migrated-files directory)');
  
  // Create archive directory
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
  
  // Archive markdown files
  const mdFiles = fs.readdirSync(process.cwd())
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .filter(f => !f.startsWith('.'));
  
  for (const filename of mdFiles) {
    const source = path.join(process.cwd(), filename);
    const dest = path.join(ARCHIVE_DIR, filename);
    fs.renameSync(source, dest);
    console.log(`  📦 Archived: ${filename}`);
  }
  
  console.log(`  ✅ Archived ${mdFiles.length} documentation files`);
}

/**
 * Print migration summary
 */
function printSummary() {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n📄 Documentation:');
  console.log(`   Scanned:  ${stats.documentation.scanned}`);
  console.log(`   Migrated: ${stats.documentation.migrated}`);
  console.log(`   Skipped:  ${stats.documentation.skipped}`);
  console.log(`   Errors:   ${stats.documentation.errors}`);
  
  console.log('\n🧠 Memory Logs:');
  console.log(`   Scanned:  ${stats.memoryLogs.scanned}`);
  console.log(`   Migrated: ${stats.memoryLogs.migrated}`);
  console.log(`   Skipped:  ${stats.memoryLogs.skipped}`);
  console.log(`   Errors:   ${stats.memoryLogs.errors}`);
  
  console.log('\n📊 Data Files:');
  console.log(`   Scanned:  ${stats.dataFiles.scanned}`);
  console.log(`   Migrated: ${stats.dataFiles.migrated}`);
  console.log(`   Skipped:  ${stats.dataFiles.skipped}`);
  console.log(`   Errors:   ${stats.dataFiles.errors}`);
  
  const totalMigrated = stats.documentation.migrated + stats.memoryLogs.migrated + stats.dataFiles.migrated;
  const totalErrors = stats.documentation.errors + stats.memoryLogs.errors + stats.dataFiles.errors;
  
  console.log('\n📈 Total:');
  console.log(`   Migrated: ${totalMigrated} items`);
  console.log(`   Size:     ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Errors:   ${totalErrors}`);
  console.log(`   Duration: ${duration}s`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('   Run without --dry-run to perform actual migration');
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Supabase Migration...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    await migrateDocumentation();
    await migrateMemoryDirectory();
    await migrateDataFiles();
    
    if (!DRY_RUN) {
      await archiveMigratedFiles();
    }
    
    printSummary();
    
    console.log('\n✅ Migration complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Verify data in Supabase dashboard');
    console.log('   2. Update code to read from Supabase');
    console.log('   3. Test all functionality');
    console.log('   4. Commit changes with: git add .migrated-files/ && git commit -m "Migrate files to Supabase"');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate();
