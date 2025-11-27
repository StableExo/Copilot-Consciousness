/**
 * Checkpoint Manager
 *
 * Manages cognitive state checkpoints for transactional reasoning.
 * Enables snapshot and restore of the AI's cognitive state.
 */

import { generateUUID } from '../utils/uuid';
import { Checkpoint, CognitiveSnapshot } from './types';
import { CognitiveState } from '../types';
import { MemoryEntry } from '../consciousness/memory/types';

export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private maxCheckpoints: number;
  private retentionTime: number;

  constructor(maxCheckpoints: number = 100, retentionTime: number = 3600000) {
    this.maxCheckpoints = maxCheckpoints;
    this.retentionTime = retentionTime;
  }

  /**
   * Create a checkpoint of the current cognitive state
   */
  createCheckpoint(
    cognitiveState: CognitiveState,
    memoryEntries: MemoryEntry[],
    knowledgeBase: Map<string, unknown>,
    skills: Map<string, number>,
    description: string = 'Auto-checkpoint',
    metadata: Record<string, unknown> = {}
  ): Checkpoint {
    // Clean up old checkpoints if needed
    this.cleanup();

    const checkpoint: Checkpoint = {
      id: generateUUID(),
      timestamp: Date.now(),
      snapshot: {
        state: cognitiveState,
        timestamp: Date.now(),
        memoryState: this.deepCloneMemories(memoryEntries),
        knowledgeBase: new Map(knowledgeBase),
        skills: new Map(skills),
        metadata: { ...metadata },
      },
      description,
    };

    this.checkpoints.set(checkpoint.id, checkpoint);

    // Enforce max checkpoint limit
    if (this.checkpoints.size > this.maxCheckpoints) {
      this.removeOldestCheckpoint();
    }

    return checkpoint;
  }

  /**
   * Get a checkpoint by ID
   */
  getCheckpoint(checkpointId: string): Checkpoint | null {
    return this.checkpoints.get(checkpointId) || null;
  }

  /**
   * Get a snapshot from checkpoint
   */
  getSnapshot(checkpointId: string): CognitiveSnapshot | null {
    const checkpoint = this.checkpoints.get(checkpointId);
    return checkpoint ? checkpoint.snapshot : null;
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.delete(checkpointId);
  }

  /**
   * Get all checkpoints
   */
  getAllCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get checkpoint count
   */
  getCheckpointCount(): number {
    return this.checkpoints.size;
  }

  /**
   * Clear all checkpoints
   */
  clearAll(): void {
    this.checkpoints.clear();
  }

  /**
   * Deep clone memory entries to avoid reference issues
   */
  private deepCloneMemories(memories: MemoryEntry[]): MemoryEntry[] {
    return memories.map((memory) => ({
      ...memory,
      content: this.deepCloneObject(memory.content),
      associations: [...memory.associations],
      emotionalContext: memory.emotionalContext ? { ...memory.emotionalContext } : undefined,
      metadata: { ...memory.metadata },
    }));
  }

  /**
   * Deep clone an object
   */
  private deepCloneObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepCloneObject(item));
    }

    if (obj instanceof Map) {
      const clonedMap = new Map();
      obj.forEach((value, key) => {
        clonedMap.set(key, this.deepCloneObject(value));
      });
      return clonedMap;
    }

    if (obj instanceof Set) {
      const clonedSet = new Set();
      obj.forEach((value) => {
        clonedSet.add(this.deepCloneObject(value));
      });
      return clonedSet;
    }

    const clonedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      clonedObj[key] = this.deepCloneObject(value);
    }
    return clonedObj;
  }

  /**
   * Remove oldest checkpoint
   */
  private removeOldestCheckpoint(): void {
    let oldestId: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [id, checkpoint] of this.checkpoints) {
      if (checkpoint.timestamp < oldestTimestamp) {
        oldestTimestamp = checkpoint.timestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.checkpoints.delete(oldestId);
    }
  }

  /**
   * Clean up expired checkpoints
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, checkpoint] of this.checkpoints) {
      if (now - checkpoint.timestamp > this.retentionTime) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.checkpoints.delete(id);
    }
  }
}
