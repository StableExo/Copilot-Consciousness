/**
 * MemoryMigrationService - Automatic Memory Backend Migration
 *
 * Provides seamless migration from in-memory storage to persistent backends
 * (SQLite and Redis) with zero downtime and automatic failover.
 *
 * Features:
 * - Auto-detect available backends
 * - Migrate in-memory data to SQLite/Redis
 * - Background migration with progress tracking
 * - Rollback support for failed migrations
 * - Health checks and automatic failover
 */

import { MemoryEntry, MemoryStore } from '../../consciousness/memory/types';
import { InMemoryStore } from '../../consciousness/memory/store';
import { SQLiteStore, SQLiteStoreConfig } from './SQLiteStore';
import { RedisStore, RedisStoreConfig } from './RedisStore';
import { UUID } from '../../types';

/**
 * Migration status
 */
export type MigrationStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';

/**
 * Migration progress tracking
 */
export interface MigrationProgress {
  status: MigrationStatus;
  sourceBackend: string;
  targetBackend: string;
  totalEntries: number;
  migratedEntries: number;
  failedEntries: number;
  startTime: number;
  endTime?: number;
  errorMessage?: string;
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  sqlite?: SQLiteStoreConfig;
  redis?: RedisStoreConfig;
  batchSize?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  enableAutoMigration?: boolean;
  healthCheckIntervalMs?: number;
}

/**
 * Migration event types
 */
export type MigrationEventType =
  | 'migration-started'
  | 'migration-progress'
  | 'migration-completed'
  | 'migration-failed'
  | 'health-check'
  | 'failover';

/**
 * Migration event handler
 */
export type MigrationEventHandler = (event: MigrationEventType, data: unknown) => void;

/**
 * Memory Migration Service
 */
export class MemoryMigrationService {
  private sourceStore: MemoryStore | null = null;
  private sqliteStore: SQLiteStore | null = null;
  private redisStore: RedisStore | null = null;
  private activeStore: MemoryStore;
  private config: Required<MigrationConfig>;
  private migrationProgress: MigrationProgress | null = null;
  private eventHandlers: Set<MigrationEventHandler> = new Set();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private migrationHistory: MigrationProgress[] = [];

  constructor(config: MigrationConfig = {}) {
    this.config = {
      sqlite: config.sqlite || {},
      redis: config.redis || {},
      batchSize: config.batchSize || 100,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      enableAutoMigration: config.enableAutoMigration ?? true,
      healthCheckIntervalMs: config.healthCheckIntervalMs || 30000,
    };

    // Start with in-memory store
    this.activeStore = new InMemoryStore();
    this.sourceStore = this.activeStore;

    // Initialize backends
    this.initializeBackends();

    // Start health checks if auto-migration is enabled
    if (this.config.enableAutoMigration) {
      this.startHealthChecks();
    }
  }

  /**
   * Initialize storage backends
   */
  private initializeBackends(): void {
    // Initialize SQLite
    try {
      this.sqliteStore = new SQLiteStore(this.config.sqlite);
      console.log('[MemoryMigrationService] SQLite backend available');
    } catch (error) {
      console.warn(
        '[MemoryMigrationService] SQLite not available:',
        error instanceof Error ? error.message : String(error)
      );
    }

    // Initialize Redis
    try {
      this.redisStore = new RedisStore(this.config.redis);
      console.log('[MemoryMigrationService] Redis backend available');
    } catch (error) {
      console.warn(
        '[MemoryMigrationService] Redis not available:',
        error instanceof Error ? error.message : String(error)
      );
    }

    // Auto-migrate if backends are available
    if (this.config.enableAutoMigration && (this.sqliteStore || this.redisStore)) {
      // Defer migration to allow initial data to be stored
      setTimeout(() => {
        this.autoMigrate().catch((err) => {
          console.error('[MemoryMigrationService] Auto-migration failed:', err.message);
        });
      }, 5000);
    }
  }

  /**
   * Register event handler
   */
  on(handler: MigrationEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: MigrationEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: MigrationEventType, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event, data);
      } catch (error) {
        console.error('[MemoryMigrationService] Event handler error:', error);
      }
    }
  }

  /**
   * Start health checks for backends
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Perform health check on backends
   */
  private performHealthCheck(): void {
    const health = {
      sqlite: this.sqliteStore !== null,
      redis: this.redisStore?.isConnected() ?? false,
      activeBackend: this.getActiveBackendName(),
      memoryEntries: this.activeStore.getSize(),
    };

    this.emit('health-check', health);

    // Auto-failover if active backend is unhealthy
    if (this.getActiveBackendName() === 'sqlite' && !health.sqlite) {
      this.performFailover('redis');
    } else if (this.getActiveBackendName() === 'redis' && !health.redis) {
      this.performFailover('sqlite');
    }
  }

  /**
   * Perform failover to another backend
   */
  private performFailover(targetBackend: 'sqlite' | 'redis' | 'memory'): void {
    const previousBackend = this.getActiveBackendName();

    switch (targetBackend) {
      case 'sqlite':
        if (this.sqliteStore) {
          this.activeStore = this.sqliteStore;
        }
        break;
      case 'redis':
        if (this.redisStore) {
          this.activeStore = this.redisStore;
        }
        break;
      case 'memory':
        this.activeStore = this.sourceStore || new InMemoryStore();
        break;
    }

    console.log(
      `[MemoryMigrationService] Failover: ${previousBackend} -> ${this.getActiveBackendName()}`
    );
    this.emit('failover', { from: previousBackend, to: this.getActiveBackendName() });
  }

  /**
   * Get active backend name
   */
  getActiveBackendName(): string {
    if (this.activeStore === this.sqliteStore) return 'sqlite';
    if (this.activeStore === this.redisStore) return 'redis';
    return 'memory';
  }

  /**
   * Get the active store for operations
   */
  getActiveStore(): MemoryStore {
    return this.activeStore;
  }

  /**
   * Automatically migrate to the best available backend
   */
  async autoMigrate(): Promise<MigrationProgress> {
    // Prefer SQLite as primary, Redis as secondary
    if (this.sqliteStore) {
      return this.migrateToSQLite();
    } else if (this.redisStore) {
      return this.migrateToRedis();
    }

    throw new Error('No persistent backend available for migration');
  }

  /**
   * Migrate from current store to SQLite
   */
  async migrateToSQLite(): Promise<MigrationProgress> {
    if (!this.sqliteStore) {
      throw new Error('SQLite backend not available');
    }

    return this.migrate(this.activeStore, this.sqliteStore, 'sqlite');
  }

  /**
   * Migrate from current store to Redis
   */
  async migrateToRedis(): Promise<MigrationProgress> {
    if (!this.redisStore) {
      throw new Error('Redis backend not available');
    }

    return this.migrate(this.activeStore, this.redisStore, 'redis');
  }

  /**
   * Core migration logic
   */
  private async migrate(
    source: MemoryStore,
    target: MemoryStore,
    targetName: string
  ): Promise<MigrationProgress> {
    const sourceName = this.getActiveBackendName();

    // Skip if already on target backend
    if (this.activeStore === target) {
      return {
        status: 'completed',
        sourceBackend: targetName,
        targetBackend: targetName,
        totalEntries: target.getSize(),
        migratedEntries: 0,
        failedEntries: 0,
        startTime: Date.now(),
        endTime: Date.now(),
      };
    }

    // Get all entries from source
    const entries = source.search({});
    const totalEntries = entries.length;

    // Initialize progress
    this.migrationProgress = {
      status: 'in-progress',
      sourceBackend: sourceName,
      targetBackend: targetName,
      totalEntries,
      migratedEntries: 0,
      failedEntries: 0,
      startTime: Date.now(),
    };

    this.emit('migration-started', this.migrationProgress);
    console.log(
      `[MemoryMigrationService] Migration started: ${sourceName} -> ${targetName} (${totalEntries} entries)`
    );

    // Process in batches
    for (let i = 0; i < entries.length; i += this.config.batchSize) {
      const batch = entries.slice(i, i + this.config.batchSize);

      for (const entry of batch) {
        try {
          await this.migrateEntry(entry, target);
          this.migrationProgress.migratedEntries++;
        } catch (error) {
          this.migrationProgress.failedEntries++;
          console.error(
            `[MemoryMigrationService] Failed to migrate entry ${entry.id}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Emit progress
      this.emit('migration-progress', { ...this.migrationProgress });
    }

    // Finalize
    this.migrationProgress.endTime = Date.now();

    if (this.migrationProgress.failedEntries === 0) {
      this.migrationProgress.status = 'completed';
      this.activeStore = target;
      console.log(`[MemoryMigrationService] Migration completed successfully`);
    } else if (this.migrationProgress.migratedEntries > 0) {
      this.migrationProgress.status = 'completed';
      this.activeStore = target;
      console.log(
        `[MemoryMigrationService] Migration completed with ${this.migrationProgress.failedEntries} failed entries`
      );
    } else {
      this.migrationProgress.status = 'failed';
      this.migrationProgress.errorMessage = 'All entries failed to migrate';
      console.error('[MemoryMigrationService] Migration failed completely');
    }

    this.migrationHistory.push({ ...this.migrationProgress });
    this.emit(
      this.migrationProgress.status === 'completed' ? 'migration-completed' : 'migration-failed',
      this.migrationProgress
    );

    return this.migrationProgress;
  }

  /**
   * Migrate a single entry with retry logic
   *
   * Note: Migration creates new IDs in the target store. This is by design:
   * - Original IDs may conflict with existing entries in the target
   * - Memory references should be based on content, not IDs
   * - For ID preservation, use a custom migration with update() instead of store()
   */
  private async migrateEntry(entry: MemoryEntry, target: MemoryStore): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        // Store the entry in target (excluding auto-generated fields)
        // Note: This generates a new ID in the target store
        const {
          id: _originalId,
          accessCount: _accessCount,
          lastAccessed: _lastAccessed,
          ...rest
        } = entry;
        target.store(rest);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await this.delay(this.config.retryDelayMs * (attempt + 1));
      }
    }

    throw lastError || new Error('Migration failed after retries');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current migration progress
   */
  getMigrationProgress(): MigrationProgress | null {
    return this.migrationProgress ? { ...this.migrationProgress } : null;
  }

  /**
   * Get migration history
   */
  getMigrationHistory(): MigrationProgress[] {
    return [...this.migrationHistory];
  }

  /**
   * Rollback to previous backend
   */
  async rollback(): Promise<boolean> {
    if (this.migrationHistory.length === 0) {
      return false;
    }

    const lastMigration = this.migrationHistory[this.migrationHistory.length - 1];

    switch (lastMigration.sourceBackend) {
      case 'sqlite':
        if (this.sqliteStore) {
          this.activeStore = this.sqliteStore;
          return true;
        }
        break;
      case 'redis':
        if (this.redisStore) {
          this.activeStore = this.redisStore;
          return true;
        }
        break;
      case 'memory':
        if (this.sourceStore) {
          this.activeStore = this.sourceStore;
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Force switch to a specific backend without migration
   */
  switchBackend(backend: 'sqlite' | 'redis' | 'memory'): boolean {
    switch (backend) {
      case 'sqlite':
        if (this.sqliteStore) {
          this.activeStore = this.sqliteStore;
          return true;
        }
        break;
      case 'redis':
        if (this.redisStore) {
          this.activeStore = this.redisStore;
          return true;
        }
        break;
      case 'memory':
        if (this.sourceStore) {
          this.activeStore = this.sourceStore;
          return true;
        }
        break;
    }
    return false;
  }

  /**
   * Store an entry using the active backend
   */
  store(entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed'>): UUID {
    return this.activeStore.store(entry);
  }

  /**
   * Retrieve an entry using the active backend
   */
  retrieve(id: UUID): MemoryEntry | null {
    return this.activeStore.retrieve(id);
  }

  /**
   * Get backend availability status
   */
  getBackendStatus(): {
    memory: boolean;
    sqlite: boolean;
    redis: boolean;
    active: string;
  } {
    return {
      memory: this.sourceStore !== null,
      sqlite: this.sqliteStore !== null,
      redis: this.redisStore?.isConnected() ?? false,
      active: this.getActiveBackendName(),
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.sqliteStore) {
      this.sqliteStore.close();
    }

    if (this.redisStore) {
      await this.redisStore.close();
    }
  }
}
