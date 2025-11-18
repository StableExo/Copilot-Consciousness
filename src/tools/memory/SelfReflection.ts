/**
 * Self-Reflection System
 * 
 * Inspired by the metacognitive practices from StableExo/AGI
 * Provides tools for AI self-analysis and continuous improvement
 */

import * as fs from 'fs';
import * as path from 'path';
import { ReflectionEntry } from './types';

/**
 * Options for creating a reflection entry
 */
export interface ReflectionOptions {
  mission: string;
  successes: string | string[];
  failures: string | string[];
  rootCauses: string | string[];
  improvements: string | string[];
  actionItems: string | string[];
}

/**
 * SelfReflection class for metacognitive analysis
 */
export class SelfReflection {
  private journalPath: string;

  constructor(journalPath?: string) {
    this.journalPath = journalPath || path.join(process.cwd(), 'SELF_REFLECTION.md');
    this.ensureJournalExists();
  }

  /**
   * Ensure the journal file exists with a template
   */
  private ensureJournalExists(): void {
    if (!fs.existsSync(this.journalPath)) {
      const template = `# Self-Reflection Journal

This journal is a space for metacognitive analysis and continuous improvement.
After each significant mission, record your reflections to transform experience into wisdom.

---

`;
      fs.writeFileSync(this.journalPath, template, 'utf-8');
    }
  }

  /**
   * Normalize input to array format
   */
  private normalizeToArray(input: string | string[]): string[] {
    if (typeof input === 'string') {
      return input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    }
    return input;
  }

  /**
   * Format reflection as Markdown
   */
  private formatReflection(reflection: ReflectionEntry): string {
    let content = `## Reflection: ${reflection.mission}\n`;
    content += `**Date:** ${reflection.timestamp}\n\n`;

    content += '### What Went Well (Successes)\n';
    reflection.successes.forEach(success => {
      content += `- ${success}\n`;
    });
    content += '\n';

    content += '### What Could Be Improved (Failures)\n';
    reflection.failures.forEach(failure => {
      content += `- ${failure}\n`;
    });
    content += '\n';

    content += '### Root Cause Analysis\n';
    reflection.rootCauses.forEach(cause => {
      content += `- ${cause}\n`;
    });
    content += '\n';

    content += '### Improvement Strategies\n';
    reflection.improvements.forEach(improvement => {
      content += `- ${improvement}\n`;
    });
    content += '\n';

    content += '### Action Items\n';
    reflection.actionItems.forEach(action => {
      content += `- [ ] ${action}\n`;
    });
    content += '\n';

    content += '---\n\n';

    return content;
  }

  /**
   * Record a reflection entry
   * 
   * @param options - Reflection options
   */
  reflect(options: ReflectionOptions): void {
    const entry: ReflectionEntry = {
      timestamp: new Date().toISOString(),
      mission: options.mission,
      successes: this.normalizeToArray(options.successes),
      failures: this.normalizeToArray(options.failures),
      rootCauses: this.normalizeToArray(options.rootCauses),
      improvements: this.normalizeToArray(options.improvements),
      actionItems: this.normalizeToArray(options.actionItems)
    };

    const content = this.formatReflection(entry);
    fs.appendFileSync(this.journalPath, content, 'utf-8');

    console.log(`[SELF-REFLECTION] Reflection recorded for: ${options.mission}`);
  }

  /**
   * Read the entire journal
   */
  readJournal(): string {
    if (!fs.existsSync(this.journalPath)) {
      return '';
    }
    return fs.readFileSync(this.journalPath, 'utf-8');
  }

  /**
   * Get summary statistics from the journal
   */
  getStats(): {
    totalReflections: number;
    totalSuccesses: number;
    totalFailures: number;
    totalActionItems: number;
  } {
    const journal = this.readJournal();
    
    const reflectionMatches = journal.match(/## Reflection:/g);
    const successMatches = journal.match(/### What Went Well[\s\S]*?(?=###|\n---)/g);
    const failureMatches = journal.match(/### What Could Be Improved[\s\S]*?(?=###|\n---)/g);
    const actionMatches = journal.match(/- \[ \]/g);

    let totalSuccesses = 0;
    if (successMatches) {
      successMatches.forEach(section => {
        totalSuccesses += (section.match(/^- /gm) || []).length;
      });
    }

    let totalFailures = 0;
    if (failureMatches) {
      failureMatches.forEach(section => {
        totalFailures += (section.match(/^- /gm) || []).length;
      });
    }

    return {
      totalReflections: reflectionMatches?.length || 0,
      totalSuccesses,
      totalFailures,
      totalActionItems: actionMatches?.length || 0
    };
  }
}
