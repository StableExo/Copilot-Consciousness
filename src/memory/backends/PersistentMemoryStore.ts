/**
 * PersistentMemoryStore - Unified Memory Backend with Fallback
 *
 * Provides a unified interface for persistent memory storage with
 * automatic fallback between SQLite (primary) and Redis (secondary).
 * Falls back to in-memory storage if both are unavailable.
 */

import { MemoryEntry, MemoryStore, MemoryQuery } from '../../consciousness/memory/types';
import { InMemoryStore } from '../../consciousness/memory/store';
import { SQLiteStore, SQLiteStoreConfig, SQLiteStats } from './SQLiteStore';
import { RedisStore, RedisStoreConfig, RedisStats } from './RedisStore';
import { MemoryType, UUID } from '../../types';

export interface PersistentMemoryConfig {
  sqlite?: SQLiteStoreConfig;
  redis?: RedisStoreConfig;
  preferredBackend?: 'sqlite' | 'redis' | 'auto';
  enableRedisCache?: boolean;
  syncInterval?: number;
}

export type BackendType = 'sqlite' | 'redis' | 'memory';

export interface PersistentMemoryStats {
  activeBackend: BackendType;
  sqlite?: SQLiteStats;
  redis?: RedisStats;
  fallbackActive: boolean;
  totalMemories: number;
}

/**
 * Unified Persistent Memory Store
 */
export class PersistentMemoryStore extends MemoryStore {
  private sqliteStore: SQLiteStore | null = null;
  private redisStore: RedisStore | null = null;
  private memoryStore: InMemoryStore;
  private activeBackend: BackendType = 'memory';
  private config: Required<PersistentMemoryConfig>;
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor(config: PersistentMemoryConfig = {}) {
    super();

    this.config = {
      sqlite: config.sqlite || {},
      redis: config.redis || {},
      preferredBackend: config.preferredBackend || 'auto',
      enableRedisCache: config.enableRedisCache ?? true,
      syncInterval: config.syncInterval || 60000, // 1 minute default
    };

    // Always have in-memory fallback
    this.memoryStore = new InMemoryStore();

    // Initialize backends
    this.initializeBackends();
  }

  /**
   * Initialize storage backends
   */
  private initializeBackends(): void {
    // Try SQLite first
    try {
      this.sqliteStore = new SQLiteStore(this.config.sqlite);
      console.log('[PersistentMemoryStore] SQLite backend initialized');

      if (this.config.preferredBackend === 'auto' || this.config.preferredBackend === 'sqlite') {
        this.activeBackend = 'sqlite';
      }
    } catch (error) {
      console.warn(
        '[PersistentMemoryStore] SQLite initialization failed:',
        error instanceof Error ? error.message : String(error)
      );
      this.sqliteStore = null;
    }

    // Try Redis
    try {
      this.redisStore = new RedisStore(this.config.redis);
      console.log('[PersistentMemoryStore] Redis backend initialized');

      if (this.config.preferredBackend === 'redis') {
        this.activeBackend = 'redis';
      }

      // Start sync if enabled
      if (this.config.enableRedisCache && this.sqliteStore && this.config.syncInterval > 0) {
        this.startSync();
      }
    } catch (error) {
      console.warn(
        '[PersistentMemoryStore] Redis initialization failed:',
        error instanceof Error ? error.message : String(error)
      );
      this.redisStore = null;
    }

    // If nothing else works, use memory
    if (!this.sqliteStore && !this.redisStore) {
      this.activeBackend = 'memory';
      console.log('[PersistentMemoryStore] Falling back to in-memory storage');
    }
  }

  /**
   * Start periodic sync between backends
   */
  private startSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = setInterval(() => {
      this.syncBackends().catch((err) => {
        console.error('[PersistentMemoryStore] Sync error:', err.message);
      });
    }, this.config.syncInterval);
  }

  /**
   * Sync data between backends
   */
  private async syncBackends(): Promise<void> {
    if (!this.sqliteStore || !this.redisStore) {
      return;
    }

    // Sync SQLite to Redis for caching
    if (this.redisStore.isConnected()) {
      const sqliteMemories = this.sqliteStore.search({});
      for (const memory of sqliteMemories) {
        // Use the public cache method
        this.redisStore.cacheEntry(memory);
      }
    }
  }

  /**
   * Get the active store
   */
  private getActiveStore(): MemoryStore {
    switch (this.activeBackend) {
      case 'sqlite':
        return this.sqliteStore || this.memoryStore;
      case 'redis':
        return this.redisStore || this.memoryStore;
      default:
        return this.memoryStore;
    }
  }

  /**
   * Store a new memory entry
   */
  store(entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed'>): UUID {
    const store = this.getActiveStore();
    const id = store.store(entry);

    // Also store in Redis cache if enabled
    if (this.config.enableRedisCache && this.redisStore && this.activeBackend === 'sqlite') {
      const fullEntry = store.retrieve(id);
      if (fullEntry) {
        this.redisStore.cacheEntry(fullEntry);
      }
    }

    return id;
  }

  /**
   * Retrieve a memory entry by ID
   */
  retrieve(id: UUID): MemoryEntry | null {
    const store = this.getActiveStore();
    return store.retrieve(id);
  }

  /**
   * Search for memories matching a query
   */
  search(query: MemoryQuery): MemoryEntry[] {
    const store = this.getActiveStore();
    return store.search(query);
  }

  /**
   * Update an existing memory entry
   */
  update(id: UUID, updates: Partial<MemoryEntry>): boolean {
    const store = this.getActiveStore();
    const result = store.update(id, updates);

    // Update Redis cache if enabled
    if (
      result &&
      this.config.enableRedisCache &&
      this.redisStore &&
      this.activeBackend === 'sqlite'
    ) {
      const fullEntry = store.retrieve(id);
      if (fullEntry) {
        this.redisStore.cacheEntry(fullEntry);
      }
    }

    return result;
  }

  /**
   * Delete a memory entry
   */
  delete(id: UUID): boolean {
    const store = this.getActiveStore();
    const result = store.delete(id);

    // Remove from Redis cache if enabled
    if (result && this.config.enableRedisCache && this.redisStore) {
      this.redisStore.uncacheEntry(id);
    }

    return result;
  }

  /**
   * Get all memories of a specific type
   */
  getByType(type: MemoryType): MemoryEntry[] {
    const store = this.getActiveStore();
    return store.getByType(type);
  }

  /**
   * Get the total number of stored memories
   */
  getSize(): number {
    const store = this.getActiveStore();
    return store.getSize();
  }

  /**
   * Clear all memories
   */
  clear(): void {
    const store = this.getActiveStore();
    store.clear();

    // Also clear Redis cache
    if (this.config.enableRedisCache && this.redisStore) {
      this.redisStore.clear();
    }
  }

  /**
   * Get the active backend type
   */
  getActiveBackend(): BackendType {
    return this.activeBackend;
  }

  /**
   * Switch to a different backend
   */
  switchBackend(backend: BackendType): boolean {
    switch (backend) {
      case 'sqlite':
        if (this.sqliteStore) {
          this.activeBackend = 'sqlite';
          return true;
        }
        return false;
      case 'redis':
        if (this.redisStore) {
          this.activeBackend = 'redis';
          return true;
        }
        return false;
      case 'memory':
        this.activeBackend = 'memory';
        return true;
      default:
        return false;
    }
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(): Promise<PersistentMemoryStats> {
    const stats: PersistentMemoryStats = {
      activeBackend: this.activeBackend,
      fallbackActive:
        this.activeBackend === 'memory' && (this.sqliteStore !== null || this.redisStore !== null),
      totalMemories: this.getSize(),
    };

    if (this.sqliteStore) {
      stats.sqlite = this.sqliteStore.getStats();
    }

    if (this.redisStore) {
      stats.redis = await this.redisStore.getStats();
    }

    return stats;
  }

  /**
   * Check if SQLite is available
   */
  hasSQLite(): boolean {
    return this.sqliteStore !== null;
  }

  /**
   * Check if Redis is available
   */
  hasRedis(): boolean {
    return this.redisStore !== null && this.redisStore.isConnected();
  }

  /**
   * Connect Redis if not connected
   */
  async connectRedis(): Promise<boolean> {
    if (!this.redisStore) {
      return false;
    }

    try {
      await this.redisStore.connect();
      return this.redisStore.isConnected();
    } catch {
      return false;
    }
  }

  /**
   * Vacuum SQLite database
   */
  vacuumSQLite(): void {
    if (this.sqliteStore) {
      this.sqliteStore.vacuum();
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    if (this.sqliteStore) {
      this.sqliteStore.close();
    }

    if (this.redisStore) {
      await this.redisStore.close();
    }
  }

  /**
   * Export all memories to JSON
   */
  exportToJSON(): string {
    const store = this.getActiveStore();
    const memories = store.search({});
    return JSON.stringify(memories, null, 2);
  }

  /**
   * Import memories from JSON
   */
  importFromJSON(json: string): number {
    const memories = JSON.parse(json) as MemoryEntry[];
    let imported = 0;

    for (const memory of memories) {
      const { id: _id, accessCount: _accessCount, lastAccessed: _lastAccessed, ...rest } = memory;
      this.store(rest);
      imported++;
    }

    return imported;
  }
}
