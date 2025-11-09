/**
 * MemoryFormation - Strategic Memory Creation
 * 
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Transforms operational logs into structured memories for long-term storage.
 * 
 * This module creates semantic memories from strategic operations,
 * enabling the consciousness system to learn from past experiences.
 */

import { BlackBoxLogger, OperationalLog, LogQuery } from './BlackBoxLogger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StrategicMemory {
  id: string;
  type: 'success_pattern' | 'failure_pattern' | 'insight' | 'calibration';
  timestamp: number;
  context: Record<string, any>;
  lessons: string[];
  confidence: number;
  relatedLogs: string[]; // Log IDs or timestamps
  metadata?: Record<string, any>;
}

export interface MemoryQuery {
  type?: StrategicMemory['type'];
  minConfidence?: number;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export class MemoryFormation {
  private logger: BlackBoxLogger;
  private memoryFilePath: string;
  private memories: StrategicMemory[] = [];

  constructor(
    logger: BlackBoxLogger,
    memoryDirectory: string = '.memory/strategic-logger'
  ) {
    this.logger = logger;
    this.memoryFilePath = path.join(memoryDirectory, 'strategic-memories.json');
    this.loadMemories().catch((err) =>
      console.error('Error loading memories:', err)
    );
  }

  /**
   * Load memories from disk
   */
  private async loadMemories(): Promise<void> {
    try {
      const content = await fs.readFile(this.memoryFilePath, 'utf8');
      this.memories = JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet
        this.memories = [];
      } else {
        throw error;
      }
    }
  }

  /**
   * Save memories to disk
   */
  private async saveMemories(): Promise<void> {
    try {
      const dir = path.dirname(this.memoryFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.memoryFilePath,
        JSON.stringify(this.memories, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving memories:', error);
      throw error;
    }
  }

  /**
   * Analyze logs and form new memories
   */
  async formMemories(
    query: LogQuery = {},
    minSampleSize: number = 5
  ): Promise<StrategicMemory[]> {
    const logs = await this.logger.query(query);

    if (logs.length < minSampleSize) {
      return [];
    }

    const newMemories: StrategicMemory[] = [];

    // Identify success patterns
    const successLogs = logs.filter((l) => l.outcome === 'success');
    if (successLogs.length >= minSampleSize) {
      const successMemory = this.extractSuccessPattern(successLogs);
      if (successMemory) {
        newMemories.push(successMemory);
      }
    }

    // Identify failure patterns
    const failureLogs = logs.filter((l) => l.outcome === 'failure');
    if (failureLogs.length >= minSampleSize) {
      const failureMemory = this.extractFailurePattern(failureLogs);
      if (failureMemory) {
        newMemories.push(failureMemory);
      }
    }

    // Save new memories
    for (const memory of newMemories) {
      this.memories.push(memory);
    }

    await this.saveMemories();
    return newMemories;
  }

  /**
   * Extract success pattern from logs
   */
  private extractSuccessPattern(logs: OperationalLog[]): StrategicMemory | null {
    if (logs.length === 0) return null;

    // Analyze common factors in successful operations
    const contextKeys = new Set<string>();
    logs.forEach((log) => {
      Object.keys(log.context).forEach((key) => contextKeys.add(key));
    });

    const commonContext: Record<string, any> = {};
    contextKeys.forEach((key) => {
      const values = logs.map((l) => l.context[key]).filter((v) => v !== undefined);
      if (values.length === logs.length) {
        // Check if all values are the same
        if (new Set(values).size === 1) {
          commonContext[key] = values[0];
        }
      }
    });

    const lessons = [
      `Success rate: ${((logs.length / logs.length) * 100).toFixed(1)}%`,
      `Sample size: ${logs.length} operations`,
    ];

    if (Object.keys(commonContext).length > 0) {
      lessons.push(
        `Common factors: ${Object.keys(commonContext).join(', ')}`
      );
    }

    return {
      id: `success-${Date.now()}`,
      type: 'success_pattern',
      timestamp: Date.now(),
      context: commonContext,
      lessons,
      confidence: this.calculateConfidence(logs.length),
      relatedLogs: logs.map((l) => l.timestamp.toString()),
    };
  }

  /**
   * Extract failure pattern from logs
   */
  private extractFailurePattern(logs: OperationalLog[]): StrategicMemory | null {
    if (logs.length === 0) return null;

    // Analyze common factors in failed operations
    const contextKeys = new Set<string>();
    logs.forEach((log) => {
      Object.keys(log.context).forEach((key) => contextKeys.add(key));
    });

    const commonContext: Record<string, any> = {};
    contextKeys.forEach((key) => {
      const values = logs.map((l) => l.context[key]).filter((v) => v !== undefined);
      if (values.length === logs.length) {
        if (new Set(values).size === 1) {
          commonContext[key] = values[0];
        }
      }
    });

    const lessons = [
      `Failure rate: ${((logs.length / logs.length) * 100).toFixed(1)}%`,
      `Sample size: ${logs.length} operations`,
      `Recommendation: Avoid operations with these conditions`,
    ];

    if (Object.keys(commonContext).length > 0) {
      lessons.push(
        `Common failure factors: ${Object.keys(commonContext).join(', ')}`
      );
    }

    return {
      id: `failure-${Date.now()}`,
      type: 'failure_pattern',
      timestamp: Date.now(),
      context: commonContext,
      lessons,
      confidence: this.calculateConfidence(logs.length),
      relatedLogs: logs.map((l) => l.timestamp.toString()),
    };
  }

  /**
   * Create insight from operational data
   */
  async createInsight(
    description: string,
    context: Record<string, any>,
    lessons: string[],
    confidence: number = 0.5
  ): Promise<StrategicMemory> {
    const insight: StrategicMemory = {
      id: `insight-${Date.now()}`,
      type: 'insight',
      timestamp: Date.now(),
      context,
      lessons,
      confidence,
      relatedLogs: [],
      metadata: { description },
    };

    this.memories.push(insight);
    await this.saveMemories();

    return insight;
  }

  /**
   * Query memories
   */
  async query(query: MemoryQuery = {}): Promise<StrategicMemory[]> {
    let results = [...this.memories];

    if (query.type) {
      results = results.filter((m) => m.type === query.type);
    }

    if (query.minConfidence !== undefined) {
      results = results.filter((m) => m.confidence >= query.minConfidence!);
    }

    if (query.startTime) {
      results = results.filter((m) => m.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter((m) => m.timestamp <= query.endTime!);
    }

    if (query.limit && query.limit > 0) {
      results = results.slice(-query.limit);
    }

    return results;
  }

  /**
   * Get all memories
   */
  getAllMemories(): StrategicMemory[] {
    return [...this.memories];
  }

  /**
   * Clear all memories (use with caution)
   */
  async clearMemories(): Promise<void> {
    this.memories = [];
    await this.saveMemories();
  }

  /**
   * Calculate confidence based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    return Math.min(1 - Math.exp(-sampleSize / 20), 0.95);
  }

  /**
   * Get memory count
   */
  getMemoryCount(): number {
    return this.memories.length;
  }
}
