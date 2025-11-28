/**
 * MemoryCore - Unified Memory System Facade
 *
 * This module serves as the central interface for all memory operations,
 * integrating:
 * - Semantic memory (structured knowledge with TF-IDF search)
 * - Episodic memory (experiences and events)
 * - Working memory (active processing)
 * - Session memory (conversation context)
 *
 * The MemoryCore orchestrates these subsystems to provide a cohesive
 * memory experience across sessions.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SemanticMemoryCore,
  CreateMemoryOptions,
  SemanticMemoryEntry,
} from '../consciousness/memory/semantic';
import { MemorySystem } from '../consciousness/memory/system';
import {
  SessionManager,
  SessionContext,
  CollaboratorProfile,
  SessionSummary,
} from '../consciousness/introspection';
import { Priority, MemoryConfig } from '../types';

/**
 * Export format for memory data
 */
export interface MemoryExport {
  version: string;
  exportedAt: number;
  memories: {
    semantic: SemanticMemoryEntry[];
    sessions: Array<{
      sessionId: string;
      savedAt: number;
      thoughtCount: number;
    }>;
    collaborators: CollaboratorProfile[];
  };
  stats: MemoryStats;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalSemanticMemories: number;
  totalSessions: number;
  totalCollaborators: number;
  oldestMemory?: number;
  newestMemory?: number;
  topTopics: string[];
}

/**
 * Configuration for the memory core
 */
export interface MemoryCoreConfig {
  basePath: string;
  autoRestore: boolean;
  memoryConfig?: Partial<MemoryConfig>;
}

const DEFAULT_CONFIG: MemoryCoreConfig = {
  basePath: '.memory',
  autoRestore: true,
};

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  shortTermCapacity: 100,
  workingMemoryCapacity: 50,
  retentionPeriods: {
    sensory: 1000,
    shortTerm: 60000,
    working: 300000,
  },
  longTermCompressionThreshold: 5,
  consolidationInterval: 60000,
};

/**
 * MemoryCore class - Unified memory interface
 */
class MemoryCore {
  private config: MemoryCoreConfig;
  private semanticMemory: SemanticMemoryCore;
  private memorySystem: MemorySystem;
  private sessionManager: SessionManager;
  private initialized: boolean = false;

  constructor(config: Partial<MemoryCoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize subsystems
    this.semanticMemory = new SemanticMemoryCore({
      memoryDir: this.config.basePath,
    });

    const memConfig = { ...DEFAULT_MEMORY_CONFIG, ...this.config.memoryConfig };
    this.memorySystem = new MemorySystem(memConfig);

    this.sessionManager = new SessionManager(this.memorySystem, {
      basePath: this.config.basePath,
      autoRestore: this.config.autoRestore,
    });

    this.initialized = true;
  }

  /**
   * Initialize the memory core (called automatically in constructor)
   */
  initialize(): boolean {
    if (!this.initialized) {
      return false;
    }
    return this.sessionManager.isInitialized();
  }

  /**
   * Start a new session with optional context
   */
  startSession(
    options: {
      collaboratorName?: string;
      topic?: string;
      restoreGoals?: boolean;
    } = {}
  ): SessionContext {
    return this.sessionManager.startSession(options);
  }

  /**
   * End the current session with summary
   */
  endSession(notes?: string): SessionSummary {
    return this.sessionManager.endSession(notes);
  }

  /**
   * Create a semantic memory entry (task/learning record)
   */
  createMemory(options: CreateMemoryOptions): SemanticMemoryEntry {
    return this.semanticMemory.createMemory(options);
  }

  /**
   * Search memories semantically
   */
  searchMemories(query: string, limit?: number): SemanticMemoryEntry[] {
    const results = this.semanticMemory.searchSemantic(query, limit);
    return results.map((r) => r.memory);
  }

  /**
   * Search memories by keyword
   */
  searchByKeyword(keyword: string, limit?: number): SemanticMemoryEntry[] {
    const results = this.semanticMemory.searchByKeyword(keyword, limit);
    return results.map((r) => r.memory);
  }

  /**
   * Get what the system knows about a topic
   */
  whatDoIKnow(topic: string): {
    memories: SemanticMemoryEntry[];
    summary: string;
    confidence: number;
    keyLearnings: string[];
  } {
    const result = this.semanticMemory.whatDoIKnow(topic);
    return {
      memories: result.memories.map((r) => r.memory),
      summary: result.summary,
      confidence: result.confidence,
      keyLearnings: result.keyLearnings,
    };
  }

  /**
   * Reflect on recent learning
   */
  reflectOnLearning(daysBack: number = 7) {
    return this.semanticMemory.reflectOnLearning(daysBack);
  }

  /**
   * Add a working memory (for active processing)
   */
  addWorkingMemory(
    content: unknown,
    priority: Priority = Priority.HIGH,
    metadata: Record<string, unknown> = {}
  ): string {
    return this.memorySystem.addWorkingMemory(content, priority, metadata);
  }

  /**
   * Add an episodic memory (for events/experiences)
   */
  addEpisodicMemory(
    eventType: string,
    eventData: unknown,
    priority: Priority = Priority.MEDIUM
  ): string {
    return this.memorySystem.addDEXEventMemory(eventType, eventData, priority);
  }

  /**
   * Consolidate memories (promote important ones to long-term)
   */
  consolidate(): {
    consolidated: number;
    archived: number;
    forgotten: number;
  } {
    const result = this.memorySystem.consolidate();
    return {
      consolidated: result.consolidated.length,
      archived: result.archived.length,
      forgotten: result.forgotten.length,
    };
  }

  /**
   * Get the current session context
   */
  getSessionContext(): SessionContext {
    return this.sessionManager.getContext();
  }

  /**
   * Record a milestone in the current session
   */
  recordMilestone(description: string): void {
    this.sessionManager.recordMilestone(description);
  }

  /**
   * Recall context about the current collaborator
   */
  recallCollaborator(): {
    profile?: CollaboratorProfile;
    sharedHistory: string[];
    suggestedTopics: string[];
  } {
    return this.sessionManager.recallCollaboratorContext();
  }

  /**
   * Save the current session state
   */
  saveSession(metadata?: Record<string, unknown>): string {
    return this.sessionManager.saveSession(metadata);
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const semanticStats = this.semanticMemory.getStats();
    const sessions = this.sessionManager.listSessions();
    const collabContext = this.sessionManager.recallCollaboratorContext();

    // Get topics from recent reflection
    const reflection = this.semanticMemory.reflectOnLearning(30);
    const topTopics = reflection.topicsLearned.slice(0, 5);

    return {
      totalSemanticMemories: semanticStats.totalMemories,
      totalSessions: sessions.length,
      totalCollaborators: collabContext.profile ? 1 : 0, // Simplified
      oldestMemory: semanticStats.oldestMemory,
      newestMemory: semanticStats.newestMemory,
      topTopics,
    };
  }

  /**
   * Export all memory data to JSON
   */
  exportMemories(): MemoryExport {
    const semanticMemories = this.semanticMemory.listMemories();
    const sessions = this.sessionManager.listSessions();
    const collabContext = this.sessionManager.recallCollaboratorContext();

    const collaborators: CollaboratorProfile[] = [];
    if (collabContext.profile) {
      collaborators.push(collabContext.profile);
    }

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      memories: {
        semantic: semanticMemories,
        sessions,
        collaborators,
      },
      stats: this.getStats(),
    };
  }

  /**
   * Export memories to a file
   */
  exportToFile(filepath: string): boolean {
    try {
      const data = this.exportMemories();
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Import memories from a file
   */
  importFromFile(filepath: string): {
    success: boolean;
    imported: {
      semantic: number;
      sessions: number;
    };
    errors: string[];
  } {
    const result = {
      success: false,
      imported: {
        semantic: 0,
        sessions: 0,
      },
      errors: [] as string[],
    };

    try {
      if (!fs.existsSync(filepath)) {
        result.errors.push(`File not found: ${filepath}`);
        return result;
      }

      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content) as MemoryExport;

      // Validate version
      if (!data.version || !data.memories) {
        result.errors.push('Invalid export format');
        return result;
      }

      // Import semantic memories
      for (const memory of data.memories.semantic) {
        try {
          this.semanticMemory.createMemory({
            objective: memory.objective,
            plan: memory.plan,
            actions: memory.actions,
            keyLearnings: memory.keyLearnings,
            artifactsChanged: memory.artifactsChanged,
            relatedMemories: memory.relatedMemories,
            metadata: memory.metadata,
          });
          result.imported.semantic++;
        } catch (error) {
          result.errors.push(`Failed to import memory ${memory.taskId}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      return result;
    }
  }

  /**
   * Get the underlying semantic memory core
   */
  getSemanticMemory(): SemanticMemoryCore {
    return this.semanticMemory;
  }

  /**
   * Get the underlying memory system
   */
  getMemorySystem(): MemorySystem {
    return this.memorySystem;
  }

  /**
   * Get the underlying session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export default MemoryCore;
export { MemoryCore };
