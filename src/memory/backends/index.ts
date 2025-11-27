/**
 * Memory Backends Module
 *
 * Provides persistent storage backends for TheWarden's memory system:
 * - SQLite: Local persistent storage with ACID compliance
 * - Redis: Distributed caching and storage
 * - PersistentMemoryStore: Unified interface with automatic fallback
 * - MemoryMigrationService: Automatic migration from in-memory to persistent
 */

export { SQLiteStore, SQLiteStoreConfig, SQLiteStats } from './SQLiteStore';
export { RedisStore, RedisStoreConfig, RedisStats } from './RedisStore';
export {
  PersistentMemoryStore,
  PersistentMemoryConfig,
  PersistentMemoryStats,
  BackendType,
} from './PersistentMemoryStore';
export {
  MemoryMigrationService,
  MigrationConfig,
  MigrationProgress,
  MigrationStatus,
  MigrationEventType,
  MigrationEventHandler,
} from './MemoryMigrationService';
