/**
 * SQLiteStore - Persistent SQLite Memory Backend
 *
 * Provides persistent storage for TheWarden's memory system using SQLite.
 * Designed for high-performance local persistence with full ACID compliance.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { MemoryEntry, MemoryStore, MemoryQuery } from '../../consciousness/memory/types';
import { MemoryType, Priority, UUID } from '../../types';
import { generateUUID } from '../../utils/uuid';

export interface SQLiteStoreConfig {
  dbPath?: string;
  walMode?: boolean;
  busyTimeout?: number;
  cacheSize?: number;
}

/**
 * SQLite implementation of the memory store
 */
export class SQLiteStore extends MemoryStore {
  private db: Database.Database;
  private readonly config: Required<SQLiteStoreConfig>;

  constructor(config: SQLiteStoreConfig = {}) {
    super();

    this.config = {
      dbPath: config.dbPath || path.join(process.cwd(), '.memory', 'warden.db'),
      walMode: config.walMode ?? true,
      busyTimeout: config.busyTimeout ?? 5000,
      cacheSize: config.cacheSize ?? 2000,
    };

    // Ensure directory exists
    const dbDir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.config.dbPath);

    // Configure for performance
    if (this.config.walMode) {
      this.db.pragma('journal_mode = WAL');
    }
    this.db.pragma(`busy_timeout = ${this.config.busyTimeout}`);
    this.db.pragma(`cache_size = ${this.config.cacheSize}`);
    this.db.pragma('synchronous = NORMAL');

    this.initializeSchema();
  }

  /**
   * Initialize the database schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        priority INTEGER NOT NULL,
        access_count INTEGER DEFAULT 0,
        last_accessed INTEGER NOT NULL,
        associations TEXT DEFAULT '[]',
        emotional_context TEXT,
        metadata TEXT DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_priority ON memories(priority);
      CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed);
    `);
  }

  /**
   * Store a new memory entry
   */
  store(entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed'>): UUID {
    const id = generateUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, type, content, timestamp, priority, access_count, last_accessed, associations, emotional_context, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.type,
      JSON.stringify(entry.content),
      entry.timestamp,
      entry.priority,
      0,
      now,
      JSON.stringify(entry.associations),
      entry.emotionalContext ? JSON.stringify(entry.emotionalContext) : null,
      JSON.stringify(entry.metadata)
    );

    // Also store in memory map for compatibility
    this.memories.set(id, {
      ...entry,
      id,
      accessCount: 0,
      lastAccessed: now,
    });

    return id;
  }

  /**
   * Retrieve a memory entry by ID
   */
  retrieve(id: UUID): MemoryEntry | null {
    const stmt = this.db.prepare(`
      SELECT * FROM memories WHERE id = ?
    `);

    const row = stmt.get(id) as MemoryRow | undefined;

    if (!row) {
      return null;
    }

    // Update access statistics first
    const newAccessCount = row.access_count + 1;
    const newLastAccessed = Date.now();
    const updateStmt = this.db.prepare(`
      UPDATE memories SET access_count = ?, last_accessed = ? WHERE id = ?
    `);
    updateStmt.run(newAccessCount, newLastAccessed, id);

    // Return entry with updated stats
    return {
      ...this.rowToEntry(row),
      accessCount: newAccessCount,
      lastAccessed: newLastAccessed,
    };
  }

  /**
   * Search for memories matching a query
   */
  search(query: MemoryQuery): MemoryEntry[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.type) {
      conditions.push('type = ?');
      params.push(query.type);
    }

    if (query.priority !== undefined) {
      conditions.push('priority >= ?');
      params.push(query.priority);
    }

    if (query.timeRange) {
      conditions.push('timestamp >= ? AND timestamp <= ?');
      params.push(query.timeRange.start, query.timeRange.end);
    }

    let sql = 'SELECT * FROM memories';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as MemoryRow[];

    let results = rows.map((row) => this.rowToEntry(row));

    // Apply content filter in-memory (SQLite FTS would be better for production)
    if (query.content) {
      const searchTerm = query.content.toLowerCase();
      results = results.filter((entry) =>
        JSON.stringify(entry.content).toLowerCase().includes(searchTerm)
      );
    }

    return results;
  }

  /**
   * Update an existing memory entry
   */
  update(id: UUID, updates: Partial<MemoryEntry>): boolean {
    const existing = this.retrieve(id);
    if (!existing) {
      return false;
    }

    const setters: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.type !== undefined) {
      setters.push('type = ?');
      params.push(updates.type);
    }

    if (updates.content !== undefined) {
      setters.push('content = ?');
      params.push(JSON.stringify(updates.content));
    }

    if (updates.timestamp !== undefined) {
      setters.push('timestamp = ?');
      params.push(updates.timestamp);
    }

    if (updates.priority !== undefined) {
      setters.push('priority = ?');
      params.push(updates.priority);
    }

    if (updates.associations !== undefined) {
      setters.push('associations = ?');
      params.push(JSON.stringify(updates.associations));
    }

    if (updates.emotionalContext !== undefined) {
      setters.push('emotional_context = ?');
      params.push(JSON.stringify(updates.emotionalContext));
    }

    if (updates.metadata !== undefined) {
      setters.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (setters.length === 0) {
      return true; // Nothing to update
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE memories SET ${setters.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);
    return result.changes > 0;
  }

  /**
   * Delete a memory entry
   */
  delete(id: UUID): boolean {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    const result = stmt.run(id);
    this.memories.delete(id);
    return result.changes > 0;
  }

  /**
   * Get all memories of a specific type
   */
  getByType(type: MemoryType): MemoryEntry[] {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE type = ?');
    const rows = stmt.all(type) as MemoryRow[];
    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Get the total number of stored memories
   */
  getSize(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM memories');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.db.exec('DELETE FROM memories');
    this.memories.clear();
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database statistics
   */
  getStats(): SQLiteStats {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM memories');
    const typeStmt = this.db.prepare('SELECT type, COUNT(*) as count FROM memories GROUP BY type');

    const totalCount = (countStmt.get() as { count: number }).count;
    const typeRows = typeStmt.all() as { type: string; count: number }[];

    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.type] = row.count;
    }

    // Get database file size
    let dbSize = 0;
    if (fs.existsSync(this.config.dbPath)) {
      dbSize = fs.statSync(this.config.dbPath).size;
    }

    return {
      totalMemories: totalCount,
      byType,
      dbSizeBytes: dbSize,
      walMode: this.config.walMode,
    };
  }

  /**
   * Run vacuum to optimize database
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  /**
   * Convert database row to MemoryEntry
   */
  private rowToEntry(row: MemoryRow): MemoryEntry {
    return {
      id: row.id,
      type: row.type as MemoryType,
      content: JSON.parse(row.content),
      timestamp: row.timestamp,
      priority: row.priority as Priority,
      accessCount: row.access_count,
      lastAccessed: row.last_accessed,
      associations: JSON.parse(row.associations),
      emotionalContext: row.emotional_context ? JSON.parse(row.emotional_context) : undefined,
      metadata: JSON.parse(row.metadata),
    };
  }
}

/**
 * Database row type
 */
interface MemoryRow {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  priority: number;
  access_count: number;
  last_accessed: number;
  associations: string;
  emotional_context: string | null;
  metadata: string;
}

/**
 * SQLite statistics
 */
export interface SQLiteStats {
  totalMemories: number;
  byType: Record<string, number>;
  dbSizeBytes: number;
  walMode: boolean;
}
