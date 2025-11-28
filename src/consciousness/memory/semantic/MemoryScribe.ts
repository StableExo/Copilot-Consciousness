/**
 * MemoryScribe - Creates structured memory entries
 *
 * This module is inspired by the scribe.py tool from the AGI repository,
 * adapted for TypeScript and integrated with the Copilot-Consciousness system.
 *
 * The MemoryScribe creates timestamped, structured memory entries that follow
 * a consistent schema, enabling both human readability and machine searchability.
 *
 * @see https://github.com/StableExo/AGI/blob/main/tools/scribe.py
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SemanticMemoryEntry,
  CreateMemoryOptions,
  MemoryLogEntry,
  SemanticMemoryConfig,
} from './types';

/**
 * Default configuration for the memory scribe
 */
const DEFAULT_CONFIG: SemanticMemoryConfig = {
  memoryDir: '.memory',
  topK: 5,
  autoIndex: true,
  minSimilarityThreshold: 0.3,
};

/**
 * MemoryScribe class for creating structured memory entries
 *
 * Inspired by the AGI repository's Memory Core architecture, this class
 * provides tools for creating, storing, and organizing memories in a
 * structured, searchable format.
 */
export class MemoryScribe {
  private config: SemanticMemoryConfig;
  private logFile: string;
  private indexFile: string;

  constructor(config: Partial<SemanticMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logFile = path.join(this.config.memoryDir, 'semantic_log.md');
    this.indexFile = path.join(this.config.memoryDir, 'semantic_index.json');
    this.ensureDirectoryExists();
  }

  /**
   * Create a new memory entry
   *
   * This is the primary method for recording a completed task or learning
   * experience. It creates a timestamped markdown file with the structured
   * memory content and updates the central index.
   */
  createMemory(options: CreateMemoryOptions): SemanticMemoryEntry {
    const now = new Date();
    const taskId = this.generateTaskId(now);
    const filename = `${taskId}.md`;
    const filepath = path.join(this.config.memoryDir, filename);

    const entry: SemanticMemoryEntry = {
      taskId,
      objective: options.objective,
      plan: options.plan,
      actions: options.actions,
      keyLearnings: options.keyLearnings,
      artifactsChanged: options.artifactsChanged,
      relatedMemories: options.relatedMemories || [],
      timestamp: now.getTime(),
      metadata: options.metadata || {},
    };

    // Generate markdown content
    const content = this.generateMarkdownContent(entry);

    // Write the memory file
    fs.writeFileSync(filepath, content, 'utf-8');

    // Update the index
    this.updateIndex(entry, filename);

    // Append to the log
    this.appendToLog(entry, now);

    return entry;
  }

  /**
   * Generate the markdown content for a memory entry
   */
  private generateMarkdownContent(entry: SemanticMemoryEntry): string {
    const parts: string[] = [
      `# Memory Entry: ${entry.taskId}`,
      '',
      `## Objective`,
      entry.objective,
    ];

    // Add related memories if present
    if (entry.relatedMemories.length > 0) {
      parts.push('');
      parts.push('## Related Memories');
      for (const memoryId of entry.relatedMemories) {
        parts.push(`- \`${memoryId}\``);
      }
    }

    parts.push('', '## Plan', entry.plan);
    parts.push('', '## Actions', '```', entry.actions, '```');
    parts.push('', '## Key Learnings', entry.keyLearnings);
    parts.push('', '## Artifacts Changed', '```', entry.artifactsChanged, '```');

    // Add metadata if present
    if (Object.keys(entry.metadata).length > 0) {
      parts.push('', '## Metadata', '```json', JSON.stringify(entry.metadata, null, 2), '```');
    }

    parts.push('');
    return parts.join('\n');
  }

  /**
   * Generate a timestamp-based task ID
   */
  private generateTaskId(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const millis = String(date.getUTCMilliseconds()).padStart(3, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}_${millis}`;
  }

  /**
   * Update the memory index with a new entry
   */
  private updateIndex(entry: SemanticMemoryEntry, filename: string): void {
    let index: Record<string, string> = {};

    if (fs.existsSync(this.indexFile)) {
      try {
        const content = fs.readFileSync(this.indexFile, 'utf-8');
        index = JSON.parse(content);
      } catch {
        // Start fresh if parsing fails
        index = {};
      }
    }

    // Add new entry (use next available index)
    const nextId = Object.keys(index).length;
    index[nextId.toString()] = filename;

    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 4), 'utf-8');
  }

  /**
   * Append a summary to the central log
   */
  private appendToLog(entry: SemanticMemoryEntry, date: Date): void {
    const logEntry: MemoryLogEntry = {
      timestamp: date.toISOString(),
      objective: entry.objective,
      taskId: entry.taskId,
    };

    const logLine = `${logEntry.timestamp} - Objective: ${logEntry.objective}\n`;

    fs.appendFileSync(this.logFile, logLine, 'utf-8');
  }

  /**
   * Ensure the memory directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.config.memoryDir)) {
      fs.mkdirSync(this.config.memoryDir, { recursive: true });
    }
  }

  /**
   * Read a memory entry by task ID
   */
  readMemory(taskId: string): SemanticMemoryEntry | null {
    const filename = `${taskId}.md`;
    const filepath = path.join(this.config.memoryDir, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    return this.parseMemoryFile(filepath, taskId);
  }

  /**
   * Parse a memory file into a SemanticMemoryEntry
   */
  private parseMemoryFile(filepath: string, taskId: string): SemanticMemoryEntry | null {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const stat = fs.statSync(filepath);

      // Extract sections from markdown
      const objectiveMatch = content.match(/## Objective\n([\s\S]*?)(?=\n## |$)/);
      const planMatch = content.match(/## Plan\n([\s\S]*?)(?=\n## |$)/);
      const actionsMatch = content.match(/## Actions\n```\n([\s\S]*?)```/);
      const keyLearningsMatch = content.match(/## Key Learnings\n([\s\S]*?)(?=\n## |$)/);
      const artifactsMatch = content.match(/## Artifacts Changed\n```\n([\s\S]*?)```/);
      const relatedMatch = content.match(/## Related Memories\n([\s\S]*?)(?=\n## |$)/);
      const metadataMatch = content.match(/## Metadata\n```json\n([\s\S]*?)```/);

      // Parse related memories
      const relatedMemories: string[] = [];
      if (relatedMatch) {
        const lines = relatedMatch[1].trim().split('\n');
        for (const line of lines) {
          const match = line.match(/- `([^`]+)`/);
          if (match) {
            relatedMemories.push(match[1]);
          }
        }
      }

      // Parse metadata
      let metadata: Record<string, unknown> = {};
      if (metadataMatch) {
        try {
          metadata = JSON.parse(metadataMatch[1].trim());
        } catch {
          metadata = {};
        }
      }

      return {
        taskId,
        objective: objectiveMatch ? objectiveMatch[1].trim() : '',
        plan: planMatch ? planMatch[1].trim() : '',
        actions: actionsMatch ? actionsMatch[1].trim() : '',
        keyLearnings: keyLearningsMatch ? keyLearningsMatch[1].trim() : '',
        artifactsChanged: artifactsMatch ? artifactsMatch[1].trim() : '',
        relatedMemories,
        timestamp: stat.mtimeMs,
        metadata,
      };
    } catch {
      return null;
    }
  }

  /**
   * List all memory entries
   */
  listMemories(): SemanticMemoryEntry[] {
    const memories: SemanticMemoryEntry[] = [];

    if (!fs.existsSync(this.config.memoryDir)) {
      return memories;
    }

    const files = fs.readdirSync(this.config.memoryDir);
    // Match both old format (14 digits) and new format (14 digits + underscore + 3 digits)
    const memoryFiles = files.filter((f) => f.match(/^\d{14}(_\d{3})?\.md$/));

    for (const file of memoryFiles) {
      const taskId = file.replace('.md', '');
      const memory = this.readMemory(taskId);
      if (memory) {
        memories.push(memory);
      }
    }

    // Sort by timestamp (newest first)
    return memories.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Search memories by keyword (simple text search)
   *
   * For semantic search, use the SemanticMemoryCore class instead.
   */
  searchByKeyword(keyword: string, limit?: number): SemanticMemoryEntry[] {
    const memories = this.listMemories();
    const keywordLower = keyword.toLowerCase();

    const results = memories.filter((memory) => {
      const searchText =
        `${memory.objective} ${memory.plan} ${memory.actions} ${memory.keyLearnings}`.toLowerCase();
      return searchText.includes(keywordLower);
    });

    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Link two memories together (bidirectional)
   */
  linkMemories(taskId1: string, taskId2: string): boolean {
    const memory1 = this.readMemory(taskId1);
    const memory2 = this.readMemory(taskId2);

    if (!memory1 || !memory2) {
      return false;
    }

    // Add links if not already present
    let updated = false;

    if (!memory1.relatedMemories.includes(taskId2)) {
      memory1.relatedMemories.push(taskId2);
      this.writeMemory(memory1);
      updated = true;
    }

    if (!memory2.relatedMemories.includes(taskId1)) {
      memory2.relatedMemories.push(taskId1);
      this.writeMemory(memory2);
      updated = true;
    }

    return updated;
  }

  /**
   * Write a memory entry back to disk
   */
  private writeMemory(entry: SemanticMemoryEntry): void {
    const filename = `${entry.taskId}.md`;
    const filepath = path.join(this.config.memoryDir, filename);
    const content = this.generateMarkdownContent(entry);
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  /**
   * Get the configuration
   */
  getConfig(): SemanticMemoryConfig {
    return { ...this.config };
  }

  /**
   * Get the log file path
   */
  getLogPath(): string {
    return this.logFile;
  }

  /**
   * Get the index file path
   */
  getIndexPath(): string {
    return this.indexFile;
  }
}
