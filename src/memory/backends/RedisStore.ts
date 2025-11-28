/**
 * RedisStore - Redis Memory Backend
 *
 * Provides high-performance Redis-based storage for TheWarden's memory system.
 * Designed for distributed deployments with fast access and automatic expiration.
 */

import Redis from 'ioredis';
import { MemoryEntry, MemoryStore, MemoryQuery } from '../../consciousness/memory/types';
import { MemoryType, UUID } from '../../types';
// Priority reserved for priority-based memory features
import type { Priority as _Priority } from '../../types';
import { generateUUID } from '../../utils/uuid';

export interface RedisStoreConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectionTimeout?: number;
  maxRetries?: number;
  enableReadyCheck?: boolean;
}

/**
 * Redis implementation of the memory store
 */
export class RedisStore extends MemoryStore {
  private redis: Redis;
  private readonly config: Required<Pick<RedisStoreConfig, 'keyPrefix'>>;
  private connected: boolean = false;

  constructor(config: RedisStoreConfig = {}) {
    super();

    this.config = {
      keyPrefix: config.keyPrefix || 'warden:memory:',
    };

    this.redis = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      connectTimeout: config.connectionTimeout || 10000,
      maxRetriesPerRequest: config.maxRetries || 3,
      enableReadyCheck: config.enableReadyCheck ?? true,
      lazyConnect: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.connected = true;
      console.log('[RedisStore] Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('[RedisStore] Redis error:', err.message);
    });

    this.redis.on('close', () => {
      this.connected = false;
      console.log('[RedisStore] Redis connection closed');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.redis.connect();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.redis.status === 'ready';
  }

  /**
   * Get the full key for a memory entry
   */
  private getKey(id: UUID): string {
    return `${this.config.keyPrefix}${id}`;
  }

  /**
   * Get the type index key
   */
  private getTypeIndexKey(type: MemoryType): string {
    return `${this.config.keyPrefix}type:${type}`;
  }

  /**
   * Get the timestamp sorted set key
   */
  private getTimestampIndexKey(): string {
    return `${this.config.keyPrefix}timestamp_index`;
  }

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

    // Store synchronously in memory map for immediate access
    this.memories.set(id, memoryEntry);

    // Queue async Redis operations
    this.storeAsync(memoryEntry).catch((err) => {
      console.error('[RedisStore] Async store error:', err.message);
    });

    return id;
  }

  /**
   * Async store operation
   */
  private async storeAsync(entry: MemoryEntry): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    const key = this.getKey(entry.id);
    const typeIndexKey = this.getTypeIndexKey(entry.type);
    const timestampIndexKey = this.getTimestampIndexKey();

    const pipeline = this.redis.pipeline();

    // Store the entry
    pipeline.set(key, JSON.stringify(entry));

    // Add to type index
    pipeline.sadd(typeIndexKey, entry.id);

    // Add to timestamp sorted set
    pipeline.zadd(timestampIndexKey, entry.timestamp, entry.id);

    await pipeline.exec();
  }

  /**
   * Retrieve a memory entry by ID
   */
  retrieve(id: UUID): MemoryEntry | null {
    // First check memory map
    const cached = this.memories.get(id);
    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.memories.set(id, cached);

      // Update access stats asynchronously
      this.updateAccessStatsAsync(id, cached.accessCount, cached.lastAccessed).catch(() => {});

      return cached;
    }

    return null;
  }

  /**
   * Async retrieve from Redis
   */
  async retrieveAsync(id: UUID): Promise<MemoryEntry | null> {
    // First check memory map
    const cached = this.memories.get(id);
    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.memories.set(id, cached);
      return cached;
    }

    if (!this.isConnected()) {
      return null;
    }

    const key = this.getKey(id);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const entry = JSON.parse(data) as MemoryEntry;
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Update in memory map and Redis
    this.memories.set(id, entry);
    await this.redis.set(key, JSON.stringify(entry));

    return entry;
  }

  /**
   * Update access stats asynchronously
   */
  private async updateAccessStatsAsync(
    id: UUID,
    accessCount: number,
    lastAccessed: number
  ): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    const key = this.getKey(id);
    const data = await this.redis.get(key);

    if (data) {
      const entry = JSON.parse(data) as MemoryEntry;
      entry.accessCount = accessCount;
      entry.lastAccessed = lastAccessed;
      await this.redis.set(key, JSON.stringify(entry));
    }
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
          entry.timestamp >= query.timeRange!.start && entry.timestamp <= query.timeRange!.end
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
   * Async search using Redis indices
   */
  async searchAsync(query: MemoryQuery): Promise<MemoryEntry[]> {
    if (!this.isConnected()) {
      return this.search(query);
    }

    let ids: string[] = [];

    if (query.type) {
      // Get IDs from type index
      ids = await this.redis.smembers(this.getTypeIndexKey(query.type));
    } else if (query.timeRange) {
      // Get IDs from timestamp sorted set
      ids = await this.redis.zrangebyscore(
        this.getTimestampIndexKey(),
        query.timeRange.start,
        query.timeRange.end
      );
    } else {
      // Get all IDs
      ids = await this.redis.zrange(this.getTimestampIndexKey(), 0, -1);
    }

    if (ids.length === 0) {
      return [];
    }

    // Fetch entries
    const keys = ids.map((id) => this.getKey(id));
    const dataArray = await this.redis.mget(...keys);

    let results: MemoryEntry[] = dataArray
      .filter((data): data is string => data !== null)
      .map((data) => JSON.parse(data) as MemoryEntry);

    // Apply additional filters
    if (query.priority !== undefined) {
      results = results.filter((entry) => entry.priority >= query.priority!);
    }

    if (query.content) {
      const searchTerm = query.content.toLowerCase();
      results = results.filter((entry) =>
        JSON.stringify(entry.content).toLowerCase().includes(searchTerm)
      );
    }

    // Sort by timestamp
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

    // Update async
    this.updateAsync(id, updatedEntry).catch(() => {});

    return true;
  }

  /**
   * Async update in Redis
   */
  private async updateAsync(id: UUID, entry: MemoryEntry): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    const key = this.getKey(id);
    await this.redis.set(key, JSON.stringify(entry));
  }

  /**
   * Delete a memory entry
   */
  delete(id: UUID): boolean {
    const entry = this.memories.get(id);
    if (!entry) {
      return false;
    }

    this.memories.delete(id);

    // Delete async
    this.deleteAsync(id, entry.type).catch(() => {});

    return true;
  }

  /**
   * Async delete from Redis
   */
  private async deleteAsync(id: UUID, type: MemoryType): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    const key = this.getKey(id);
    const typeIndexKey = this.getTypeIndexKey(type);
    const timestampIndexKey = this.getTimestampIndexKey();

    const pipeline = this.redis.pipeline();
    pipeline.del(key);
    pipeline.srem(typeIndexKey, id);
    pipeline.zrem(timestampIndexKey, id);
    await pipeline.exec();
  }

  /**
   * Get all memories of a specific type
   */
  getByType(type: MemoryType): MemoryEntry[] {
    return Array.from(this.memories.values()).filter((entry) => entry.type === type);
  }

  /**
   * Async get by type from Redis
   */
  async getByTypeAsync(type: MemoryType): Promise<MemoryEntry[]> {
    if (!this.isConnected()) {
      return this.getByType(type);
    }

    const ids = await this.redis.smembers(this.getTypeIndexKey(type));

    if (ids.length === 0) {
      return [];
    }

    const keys = ids.map((id) => this.getKey(id));
    const dataArray = await this.redis.mget(...keys);

    return dataArray
      .filter((data): data is string => data !== null)
      .map((data) => JSON.parse(data) as MemoryEntry);
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();

    // Clear async
    this.clearAsync().catch(() => {});
  }

  /**
   * Async clear from Redis
   */
  private async clearAsync(): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    // Get all keys with our prefix
    const keys = await this.redis.keys(`${this.config.keyPrefix}*`);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Sync local memory map with Redis
   */
  async syncFromRedis(): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    const ids = await this.redis.zrange(this.getTimestampIndexKey(), 0, -1);

    if (ids.length === 0) {
      return;
    }

    const keys = ids.map((id) => this.getKey(id));
    const dataArray = await this.redis.mget(...keys);

    this.memories.clear();
    for (const data of dataArray) {
      if (data) {
        const entry = JSON.parse(data) as MemoryEntry;
        this.memories.set(entry.id, entry);
      }
    }
  }

  /**
   * Cache an entry in local memory (for external sync purposes)
   */
  cacheEntry(entry: MemoryEntry): void {
    this.memories.set(entry.id, entry);
  }

  /**
   * Remove an entry from local cache
   */
  uncacheEntry(id: UUID): void {
    this.memories.delete(id);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Get Redis statistics
   */
  async getStats(): Promise<RedisStats> {
    const localCount = this.memories.size;

    if (!this.isConnected()) {
      return {
        connected: false,
        localMemories: localCount,
        redisMemories: 0,
        byType: {},
      };
    }

    const ids = await this.redis.zcard(this.getTimestampIndexKey());

    // Get counts by type
    const types = Object.values(MemoryType);
    const byType: Record<string, number> = {};

    for (const type of types) {
      byType[type] = await this.redis.scard(this.getTypeIndexKey(type));
    }

    return {
      connected: true,
      localMemories: localCount,
      redisMemories: ids,
      byType,
    };
  }
}

/**
 * Redis statistics
 */
export interface RedisStats {
  connected: boolean;
  localMemories: number;
  redisMemories: number;
  byType: Record<string, number>;
}
