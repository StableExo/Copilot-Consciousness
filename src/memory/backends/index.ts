/**
 * Memory Backends Module
 *
 * Provides persistent storage backends for TheWarden's memory system:
 * - SQLite: Local persistent storage with ACID compliance
 * - Redis: Distributed caching and storage
 * - PersistentMemoryStore: Unified interface with automatic fallback
 */

export { SQLiteStore, SQLiteStoreConfig, SQLiteStats } from './SQLiteStore';
export { RedisStore, RedisStoreConfig, RedisStats } from './RedisStore';
export {
  PersistentMemoryStore,
  PersistentMemoryConfig,
  PersistentMemoryStats,
  BackendType,
} from './PersistentMemoryStore';
