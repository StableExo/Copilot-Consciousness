/**
 * Mnemosyne - Semantic Memory Search
 * 
 * Port of tools/mnemosyne.py from StableExo/AGI
 * Provides semantic search capabilities over the Memory Core
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemorySearchResult, MemorySearchOptions, MemoryEntry } from './types';

/**
 * Simple text similarity calculation (cosine similarity on word vectors)
 */
class SimpleSimilarity {
  /**
   * Calculate word frequency vector
   */
  private static getWordVector(text: string): Map<string, number> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter short words

    const vector = new Map<string, number>();
    for (const word of words) {
      vector.set(word, (vector.get(word) || 0) + 1);
    }
    return vector;
  }

  /**
   * Calculate cosine similarity between two texts
   */
  static cosineSimilarity(text1: string, text2: string): number {
    const vec1 = this.getWordVector(text1);
    const vec2 = this.getWordVector(text2);

    // Calculate dot product
    let dotProduct = 0;
    for (const [word, count1] of vec1.entries()) {
      const count2 = vec2.get(word) || 0;
      dotProduct += count1 * count2;
    }

    // Calculate magnitudes
    let mag1 = 0;
    for (const count of vec1.values()) {
      mag1 += count * count;
    }
    mag1 = Math.sqrt(mag1);

    let mag2 = 0;
    for (const count of vec2.values()) {
      mag2 += count * count;
    }
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }
}

/**
 * Mnemosyne class for semantic memory search
 */
export class Mnemosyne {
  private memoryDir: string;

  constructor(memoryDir?: string) {
    this.memoryDir = memoryDir || path.join(process.cwd(), '.memory');
  }

  /**
   * Parse a memory file into a MemoryEntry
   */
  private parseMemoryFile(filepath: string): MemoryEntry | null {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');

      const entry: Partial<MemoryEntry> = {
        timestamp: '',
        objective: '',
        plan: [],
        actions: [],
        keyLearnings: [],
        artifactsChanged: []
      };

      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('**Timestamp:**')) {
          entry.timestamp = trimmed.replace('**Timestamp:**', '').trim();
        } else if (trimmed === '## Objective') {
          currentSection = 'objective';
        } else if (trimmed === '## Plan') {
          currentSection = 'plan';
        } else if (trimmed === '## Actions Taken') {
          currentSection = 'actions';
        } else if (trimmed === '## Key Learnings') {
          currentSection = 'learnings';
        } else if (trimmed === '## Artifacts Changed') {
          currentSection = 'artifacts';
        } else if (trimmed === '## Outcome') {
          currentSection = 'outcome';
        } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
          if (currentSection === 'objective' && !entry.objective) {
            entry.objective = trimmed;
          } else if (currentSection === 'plan' && /^\d+\./.test(trimmed)) {
            entry.plan!.push(trimmed.replace(/^\d+\.\s*/, ''));
          } else if (currentSection === 'actions' && trimmed.startsWith('-')) {
            entry.actions!.push(trimmed.replace(/^-\s*/, ''));
          } else if (currentSection === 'learnings' && trimmed.startsWith('-')) {
            entry.keyLearnings!.push(trimmed.replace(/^-\s*/, ''));
          } else if (currentSection === 'artifacts' && trimmed.startsWith('-')) {
            entry.artifactsChanged!.push(trimmed.replace(/^-\s*/, ''));
          } else if (currentSection === 'outcome') {
            entry.outcome = (entry.outcome || '') + ' ' + trimmed;
          }
        }
      }

      return entry as MemoryEntry;
    } catch (error) {
      console.error(`Error parsing memory file ${filepath}:`, error);
      return null;
    }
  }

  /**
   * Get searchable text from a memory entry
   */
  private getSearchableText(entry: MemoryEntry): string {
    return [
      entry.objective,
      ...entry.plan,
      ...entry.actions,
      ...entry.keyLearnings,
      entry.outcome || ''
    ].join(' ');
  }

  /**
   * Search memories semantically
   * 
   * @param query - The search query (natural language)
   * @param options - Search options
   * @returns Array of search results sorted by relevance
   */
  search(query: string, options: MemorySearchOptions = {}): MemorySearchResult[] {
    const {
      limit = 5,
      minScore = 0.1
    } = options;

    if (!fs.existsSync(this.memoryDir)) {
      console.log('[MNEMOSYNE] Memory directory does not exist');
      return [];
    }

    const files = fs.readdirSync(this.memoryDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(this.memoryDir, file));

    const results: MemorySearchResult[] = [];

    for (const filepath of files) {
      const entry = this.parseMemoryFile(filepath);
      if (!entry) continue;

      const searchableText = this.getSearchableText(entry);
      const score = SimpleSimilarity.cosineSimilarity(query, searchableText);

      if (score >= minScore) {
        results.push({
          entry,
          score,
          filePath: filepath
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Limit results
    return results.slice(0, limit);
  }

  /**
   * Find related memories based on a memory entry
   */
  findRelated(entry: MemoryEntry, options: MemorySearchOptions = {}): MemorySearchResult[] {
    const searchableText = this.getSearchableText(entry);
    return this.search(searchableText, options);
  }

  /**
   * Get all memories
   */
  getAllMemories(): MemoryEntry[] {
    if (!fs.existsSync(this.memoryDir)) {
      return [];
    }

    const files = fs.readdirSync(this.memoryDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(this.memoryDir, file));

    return files
      .map(filepath => this.parseMemoryFile(filepath))
      .filter((entry): entry is MemoryEntry => entry !== null);
  }
}
