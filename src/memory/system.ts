import { MemoryConfig } from '../types';
import { MemoryEntry, ConsolidationResult } from './types';
import { InMemoryStore } from './store';
import { MemoryType, Priority } from '../types';

/**
 * Main memory system managing different memory types
 */
export class MemorySystem {
  private store: InMemoryStore;
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.store = new InMemoryStore();
  }

  /**
   * Add a sensory memory (very short-term)
   */
  addSensoryMemory(content: unknown, metadata: Record<string, unknown> = {}): string {
    return this.store.store({
      type: MemoryType.SENSORY,
      content,
      timestamp: Date.now(),
      priority: Priority.LOW,
      associations: [],
      metadata,
    });
  }

  /**
   * Add a short-term memory
   */
  addShortTermMemory(
    content: unknown,
    priority: Priority = Priority.MEDIUM,
    metadata: Record<string, unknown> = {}
  ): string {
    return this.store.store({
      type: MemoryType.SHORT_TERM,
      content,
      timestamp: Date.now(),
      priority,
      associations: [],
      metadata,
    });
  }

  /**
   * Add to working memory (active processing)
   */
  addWorkingMemory(
    content: unknown,
    priority: Priority = Priority.HIGH,
    metadata: Record<string, unknown> = {}
  ): string {
    // Check working memory capacity
    const workingMemories = this.store.getByType(MemoryType.WORKING);
    if (workingMemories.length >= this.config.workingMemoryCapacity) {
      // Remove oldest low-priority working memory
      const sorted = workingMemories.sort((a, b) => a.timestamp - b.timestamp);
      for (const mem of sorted) {
        if (mem.priority <= Priority.MEDIUM) {
          this.store.delete(mem.id);
          break;
        }
      }
    }

    return this.store.store({
      type: MemoryType.WORKING,
      content,
      timestamp: Date.now(),
      priority,
      associations: [],
      metadata,
    });
  }

  /**
   * Convert a memory to long-term storage
   */
  consolidateToLongTerm(memoryId: string, memoryType: MemoryType = MemoryType.LONG_TERM): boolean {
    const memory = this.store.retrieve(memoryId);
    if (!memory) {
      return false;
    }

    return this.store.update(memoryId, {
      type: memoryType,
      priority: Math.min(memory.priority + 1, Priority.CRITICAL) as Priority,
    });
  }

  /**
   * Retrieve a memory by ID
   */
  getMemory(id: string): MemoryEntry | null {
    return this.store.retrieve(id);
  }

  /**
   * Search memories
   */
  searchMemories(
    query: {
      type?: MemoryType;
      priority?: Priority;
      timeRange?: { start: number; end: number };
      content?: string;
      limit?: number;
    }
  ): MemoryEntry[] {
    return this.store.search(query);
  }

  /**
   * Associate two memories
   */
  associateMemories(memoryId1: string, memoryId2: string): boolean {
    const memory1 = this.store.retrieve(memoryId1);
    const memory2 = this.store.retrieve(memoryId2);

    if (!memory1 || !memory2) {
      return false;
    }

    if (!memory1.associations.includes(memoryId2)) {
      memory1.associations.push(memoryId2);
      this.store.update(memoryId1, { associations: memory1.associations });
    }

    if (!memory2.associations.includes(memoryId1)) {
      memory2.associations.push(memoryId1);
      this.store.update(memoryId2, { associations: memory2.associations });
    }

    return true;
  }

  /**
   * Perform memory consolidation (cleanup and optimization)
   */
  consolidate(): ConsolidationResult {
    const now = Date.now();
    const consolidated: MemoryEntry[] = [];
    const archived: string[] = [];
    const forgotten: string[] = [];

    // Process sensory memories
    const sensoryMemories = this.store.getByType(MemoryType.SENSORY);
    for (const memory of sensoryMemories) {
      if (now - memory.timestamp > this.config.retentionPeriods.sensory) {
        this.store.delete(memory.id);
        forgotten.push(memory.id);
      }
    }

    // Process short-term memories
    const shortTermMemories = this.store.getByType(MemoryType.SHORT_TERM);
    for (const memory of shortTermMemories) {
      if (now - memory.timestamp > this.config.retentionPeriods.shortTerm) {
        if (memory.accessCount > this.config.longTermCompressionThreshold) {
          // Promote to long-term
          this.consolidateToLongTerm(memory.id);
          consolidated.push(memory);
        } else {
          // Forget
          this.store.delete(memory.id);
          forgotten.push(memory.id);
        }
      }
    }

    // Process working memories
    const workingMemories = this.store.getByType(MemoryType.WORKING);
    for (const memory of workingMemories) {
      if (now - memory.timestamp > this.config.retentionPeriods.working) {
        if (memory.priority >= Priority.HIGH) {
          // Archive to long-term
          this.consolidateToLongTerm(memory.id);
          archived.push(memory.id);
        } else {
          // Move to short-term
          this.store.update(memory.id, { type: MemoryType.SHORT_TERM });
        }
      }
    }

    return { consolidated, archived, forgotten };
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total: number;
    byType: Record<MemoryType, number>;
  } {
    const byType: Record<MemoryType, number> = {
      [MemoryType.SENSORY]: 0,
      [MemoryType.SHORT_TERM]: 0,
      [MemoryType.WORKING]: 0,
      [MemoryType.LONG_TERM]: 0,
      [MemoryType.EPISODIC]: 0,
      [MemoryType.SEMANTIC]: 0,
      [MemoryType.PROCEDURAL]: 0,
    };

    for (const type of Object.values(MemoryType)) {
      byType[type] = this.store.getByType(type).length;
    }

    return {
      total: this.store.getSize(),
      byType,
    };
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.store.clear();
  }
}
