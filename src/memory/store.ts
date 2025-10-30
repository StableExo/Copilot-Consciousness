import { MemoryEntry, MemoryStore, MemoryQuery } from './types';
import { MemoryType, UUID } from '../types';
import { generateUUID } from '../utils/uuid';

/**
 * In-memory implementation of the memory store
 */
export class InMemoryStore extends MemoryStore {
  /**
   * Store a new memory entry
   */
  store(entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed'>): UUID {
    const id = generateUUID();
    const now = Date.now();

    const memoryEntry: MemoryEntry = {
      ...entry,
      id,
      accessCount: 0,
      lastAccessed: now,
    };

    this.memories.set(id, memoryEntry);
    return id;
  }

  /**
   * Retrieve a memory entry by ID
   */
  retrieve(id: UUID): MemoryEntry | null {
    const entry = this.memories.get(id);
    if (!entry) {
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.memories.set(id, entry);

    return entry;
  }

  /**
   * Search for memories matching a query
   */
  search(query: MemoryQuery): MemoryEntry[] {
    let results = Array.from(this.memories.values());

    // Filter by type
    if (query.type) {
      results = results.filter((entry) => entry.type === query.type);
    }

    // Filter by priority
    if (query.priority !== undefined) {
      results = results.filter((entry) => entry.priority >= query.priority!);
    }

    // Filter by time range
    if (query.timeRange) {
      results = results.filter(
        (entry) =>
          entry.timestamp >= query.timeRange!.start &&
          entry.timestamp <= query.timeRange!.end
      );
    }

    // Filter by content (simple string matching)
    if (query.content) {
      const searchTerm = query.content.toLowerCase();
      results = results.filter((entry) =>
        JSON.stringify(entry.content).toLowerCase().includes(searchTerm)
      );
    }

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Update an existing memory entry
   */
  update(id: UUID, updates: Partial<MemoryEntry>): boolean {
    const entry = this.memories.get(id);
    if (!entry) {
      return false;
    }

    const updatedEntry = { ...entry, ...updates };
    this.memories.set(id, updatedEntry);
    return true;
  }

  /**
   * Delete a memory entry
   */
  delete(id: UUID): boolean {
    return this.memories.delete(id);
  }

  /**
   * Get all memories of a specific type
   */
  getByType(type: MemoryType): MemoryEntry[] {
    return Array.from(this.memories.values()).filter((entry) => entry.type === type);
  }
}
