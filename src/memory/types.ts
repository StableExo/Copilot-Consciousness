import { MemoryType, Priority, Timestamp, UUID } from '../types';

/**
 * Base interface for all memory entries
 */
export interface MemoryEntry {
  id: UUID;
  type: MemoryType;
  content: unknown;
  timestamp: Timestamp;
  priority: Priority;
  accessCount: number;
  lastAccessed: Timestamp;
  associations: UUID[];
  metadata: Record<string, unknown>;
}

/**
 * Interface for memory consolidation
 */
export interface ConsolidationResult {
  consolidated: MemoryEntry[];
  archived: UUID[];
  forgotten: UUID[];
}

/**
 * Memory search query
 */
export interface MemoryQuery {
  type?: MemoryType;
  priority?: Priority;
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  content?: string;
  limit?: number;
}

/**
 * Abstract base class for memory storage
 */
export abstract class MemoryStore {
  protected memories: Map<UUID, MemoryEntry> = new Map();

  /**
   * Store a new memory entry
   */
  abstract store(entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed'>): UUID;

  /**
   * Retrieve a memory entry by ID
   */
  abstract retrieve(id: UUID): MemoryEntry | null;

  /**
   * Search for memories matching a query
   */
  abstract search(query: MemoryQuery): MemoryEntry[];

  /**
   * Update an existing memory entry
   */
  abstract update(id: UUID, updates: Partial<MemoryEntry>): boolean;

  /**
   * Delete a memory entry
   */
  abstract delete(id: UUID): boolean;

  /**
   * Get all memories of a specific type
   */
  abstract getByType(type: MemoryType): MemoryEntry[];

  /**
   * Get the total number of stored memories
   */
  getSize(): number {
    return this.memories.size;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
  }
}
