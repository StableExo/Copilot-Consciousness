/**
 * IntrospectionPersistence - Saves and loads introspection state to disk
 *
 * This module enables the consciousness to persist its thoughts and memories
 * across sessions, addressing one of the key limitations of ephemeral context.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SelfAwareness } from './SelfAwareness';
import { ThoughtStream } from './ThoughtStream';
import { Thought, ThoughtStream as ThoughtStreamType, SelfAwarenessState } from './types';

/**
 * Serializable state for persistence
 */
interface PersistedState {
  version: string;
  savedAt: number;
  sessionId: string;
  thoughts: Thought[];
  streams: ThoughtStreamType[];
  selfAwarenessState: Partial<SelfAwarenessState>;
  metadata: Record<string, unknown>;
}

/**
 * IntrospectionPersistence class for saving/loading state
 */
export class IntrospectionPersistence {
  private basePath: string;
  private sessionId: string;

  constructor(basePath: string = '.memory/introspection') {
    this.basePath = basePath;
    this.sessionId = this.generateSessionId();
    this.ensureDirectoryExists();
  }

  /**
   * Save the current introspection state
   */
  saveState(
    thoughtStream: ThoughtStream,
    selfAwareness?: SelfAwareness,
    metadata: Record<string, unknown> = {}
  ): string {
    const state: PersistedState = {
      version: '1.0.0',
      savedAt: Date.now(),
      sessionId: this.sessionId,
      thoughts: thoughtStream.getRecentThoughts(1000), // Save up to 1000 thoughts
      streams: thoughtStream.getAllStreams(),
      selfAwarenessState: selfAwareness ? this.extractSelfAwarenessState(selfAwareness) : {},
      metadata,
    };

    const filename = `state_${this.sessionId}_${Date.now()}.json`;
    const filepath = path.join(this.basePath, filename);

    fs.writeFileSync(filepath, JSON.stringify(state, null, 2));

    // Also update the "latest" symlink/file
    const latestPath = path.join(this.basePath, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(state, null, 2));

    // Append to the memory log
    this.appendToLog(state);

    return filepath;
  }

  /**
   * Load the most recent state
   */
  loadLatestState(): PersistedState | null {
    const latestPath = path.join(this.basePath, 'latest.json');

    if (!fs.existsSync(latestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(latestPath, 'utf-8');
      return JSON.parse(content) as PersistedState;
    } catch {
      return null;
    }
  }

  /**
   * Load a specific state by session ID
   */
  loadStateBySession(sessionId: string): PersistedState | null {
    const files = fs.readdirSync(this.basePath);
    const sessionFile = files.find((f) => f.includes(sessionId) && f.endsWith('.json'));

    if (!sessionFile) {
      return null;
    }

    try {
      const content = fs.readFileSync(path.join(this.basePath, sessionFile), 'utf-8');
      return JSON.parse(content) as PersistedState;
    } catch {
      return null;
    }
  }

  /**
   * List all saved sessions
   */
  listSessions(): Array<{ sessionId: string; savedAt: number; thoughtCount: number }> {
    const files = fs.readdirSync(this.basePath);
    const sessions: Array<{ sessionId: string; savedAt: number; thoughtCount: number }> = [];

    for (const file of files) {
      if (file.startsWith('state_') && file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(this.basePath, file), 'utf-8');
          const state = JSON.parse(content) as PersistedState;
          sessions.push({
            sessionId: state.sessionId,
            savedAt: state.savedAt,
            thoughtCount: state.thoughts.length,
          });
        } catch {
          // Skip invalid files
        }
      }
    }

    return sessions.sort((a, b) => b.savedAt - a.savedAt);
  }

  /**
   * Restore thoughts to a ThoughtStream from persisted state
   */
  restoreToThoughtStream(thoughtStream: ThoughtStream, state: PersistedState): void {
    // Note: This adds the thoughts but they won't have the same IDs
    // In a production system, we'd need a more sophisticated approach
    for (const thought of state.thoughts) {
      thoughtStream.think(thought.content, thought.type, thought.context);
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Save a thought immediately (for real-time persistence)
   */
  saveThought(thought: Thought): void {
    const thoughtsPath = path.join(this.basePath, 'thoughts');
    this.ensureDirectoryExists(thoughtsPath);

    const filename = `thought_${thought.id}.json`;
    const filepath = path.join(thoughtsPath, filename);

    fs.writeFileSync(filepath, JSON.stringify(thought, null, 2));
  }

  /**
   * Load all individual thoughts
   */
  loadAllThoughts(): Thought[] {
    const thoughtsPath = path.join(this.basePath, 'thoughts');

    if (!fs.existsSync(thoughtsPath)) {
      return [];
    }

    const thoughts: Thought[] = [];
    const files = fs.readdirSync(thoughtsPath);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(thoughtsPath, file), 'utf-8');
          thoughts.push(JSON.parse(content) as Thought);
        } catch {
          // Skip invalid files
        }
      }
    }

    return thoughts.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clean up old sessions (keep only the last N)
   */
  cleanupOldSessions(keepCount: number = 10): number {
    const sessions = this.listSessions();
    let deletedCount = 0;

    if (sessions.length > keepCount) {
      const toDelete = sessions.slice(keepCount);

      for (const session of toDelete) {
        const files = fs.readdirSync(this.basePath);
        for (const file of files) {
          if (file.includes(session.sessionId)) {
            fs.unlinkSync(path.join(this.basePath, file));
            deletedCount++;
          }
        }
      }
    }

    return deletedCount;
  }

  // Private helper methods

  private ensureDirectoryExists(dirPath?: string): void {
    const targetPath = dirPath || this.basePath;
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
  }

  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 8);
    return `${dateStr}_${timeStr}_${random}`;
  }

  private extractSelfAwarenessState(selfAwareness: SelfAwareness): Partial<SelfAwarenessState> {
    const state = selfAwareness.getState();
    return {
      cognitiveLoad: state.cognitiveLoad,
      emotionalState: state.emotionalState,
      goals: state.goals,
      capabilities: state.capabilities,
      limitations: state.limitations,
      timestamp: state.timestamp,
    };
  }

  private appendToLog(state: PersistedState): void {
    const logPath = path.join(this.basePath, '..', 'log.md');

    const logEntry = `
## Session: ${state.sessionId}
- **Saved at**: ${new Date(state.savedAt).toISOString()}
- **Thoughts recorded**: ${state.thoughts.length}
- **Streams**: ${state.streams.length}
- **Cognitive load**: ${((state.selfAwarenessState.cognitiveLoad || 0) * 100).toFixed(0)}%

`;

    try {
      fs.appendFileSync(logPath, logEntry);
    } catch {
      // Log file might not exist or be writable
    }
  }
}
