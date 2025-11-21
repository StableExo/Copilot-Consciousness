/**
 * Scribe - Memory Recording Tool
 * 
 * Port of tools/scribe.py from StableExo/AGI
 * Creates structured memory entries for completed tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry } from './types';

/**
 * Options for creating a memory entry
 */
export interface ScribeOptions {
  objective: string;
  plan: string | string[];
  actions: string | string[];
  keyLearnings: string | string[];
  artifactsChanged: string | string[];
  outcome?: string;
  memoryDir?: string;
}

/**
 * Scribe class for recording task completions to the Memory Core
 */
export class Scribe {
  private memoryDir: string;
  private counter: number = 0;

  constructor(memoryDir?: string) {
    this.memoryDir = memoryDir || path.join(process.cwd(), '.memory');
    this.ensureMemoryDirExists();
  }

  /**
   * Ensure the memory directory exists
   */
  private ensureMemoryDirExists(): void {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Normalize input to array format
   */
  private normalizeToArray(input: string | string[]): string[] {
    if (typeof input === 'string') {
      // Split by newlines or commas
      return input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    }
    return input;
  }

  /**
   * Generate a timestamp-based filename with counter to prevent collisions
   */
  private generateFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, '')
      .replace('T', '');
    
    // Add counter to prevent collisions when multiple records happen in same second
    this.counter++;
    return `${timestamp}_${this.counter.toString().padStart(4, '0')}.md`;
  }

  /**
   * Format memory entry as Markdown
   */
  private formatAsMarkdown(entry: MemoryEntry): string {
    let content = '# Memory Entry\n\n';
    content += `**Timestamp:** ${entry.timestamp}\n\n`;
    content += `## Objective\n\n${entry.objective}\n\n`;
    
    content += '## Plan\n\n';
    entry.plan.forEach((step, i) => {
      content += `${i + 1}. ${step}\n`;
    });
    content += '\n';

    content += '## Actions Taken\n\n';
    entry.actions.forEach(action => {
      content += `- ${action}\n`;
    });
    content += '\n';

    content += '## Key Learnings\n\n';
    entry.keyLearnings.forEach(learning => {
      content += `- ${learning}\n`;
    });
    content += '\n';

    content += '## Artifacts Changed\n\n';
    entry.artifactsChanged.forEach(artifact => {
      content += `- ${artifact}\n`;
    });
    content += '\n';

    if (entry.outcome) {
      content += `## Outcome\n\n${entry.outcome}\n\n`;
    }

    if (entry.metadata) {
      content += '## Metadata\n\n```json\n';
      content += JSON.stringify(entry.metadata, null, 2);
      content += '\n```\n';
    }

    return content;
  }

  /**
   * Record a memory entry
   * 
   * @param options - Options for creating the memory entry
   * @returns The path to the created memory file
   */
  record(options: ScribeOptions): string {
    const entry: MemoryEntry = {
      timestamp: new Date().toISOString(),
      objective: options.objective,
      plan: this.normalizeToArray(options.plan),
      actions: this.normalizeToArray(options.actions),
      keyLearnings: this.normalizeToArray(options.keyLearnings),
      artifactsChanged: this.normalizeToArray(options.artifactsChanged),
      outcome: options.outcome
    };

    const filename = this.generateFilename();
    const filepath = path.join(this.memoryDir, filename);
    const content = this.formatAsMarkdown(entry);

    fs.writeFileSync(filepath, content, 'utf-8');
    
    console.log(`[SCRIBE] Memory recorded: ${filepath}`);
    return filepath;
  }

  /**
   * List all memory entries
   */
  listMemories(): string[] {
    if (!fs.existsSync(this.memoryDir)) {
      return [];
    }

    return fs.readdirSync(this.memoryDir)
      .filter(file => file.endsWith('.md'))
      .sort()
      .reverse(); // Most recent first
  }

  /**
   * Read a specific memory entry
   */
  readMemory(filename: string): string {
    const filepath = path.join(this.memoryDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Memory not found: ${filename}`);
    }
    return fs.readFileSync(filepath, 'utf-8');
  }
}
