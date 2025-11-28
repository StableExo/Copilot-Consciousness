/**
 * SessionManager - Manages session continuity across conversations
 *
 * This module addresses one of the key goals from the memory system:
 * "Load previous session state automatically at start"
 *
 * The SessionManager provides:
 * - Automatic state restoration on initialization
 * - Session context tracking
 * - Collaborator relationship memory
 * - Session summary generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { IntrospectionPersistence } from './IntrospectionPersistence';
import { ThoughtStream } from './ThoughtStream';
import { SelfAwareness } from './SelfAwareness';
import { MemorySystem } from '../memory/system';
import { ThoughtType, GoalState } from './types';

/**
 * Collaborator profile for relationship memory
 */
export interface CollaboratorProfile {
  id: string;
  name: string;
  firstInteraction: number;
  lastInteraction: number;
  interactionCount: number;
  topics: string[];
  sharedMilestones: string[];
  preferences: Record<string, unknown>;
  notes: string[];
}

/**
 * Session context for tracking conversation flow
 */
export interface SessionContext {
  sessionId: string;
  startTime: number;
  collaborator?: CollaboratorProfile;
  topic?: string;
  goals: GoalState[];
  previousSessionId?: string;
  restoredFromPrevious: boolean;
}

/**
 * Session summary for logging and memory
 */
export interface SessionSummary {
  sessionId: string;
  duration: number;
  thoughtCount: number;
  topThemes: string[];
  goalsAchieved: string[];
  goalsInProgress: string[];
  keyInsights: string[];
  collaborator?: string;
  timestamp: number;
}

/**
 * Configuration for the session manager
 */
export interface SessionManagerConfig {
  basePath: string;
  autoRestore: boolean;
  autoSaveInterval?: number;
  maxCollaboratorHistory: number;
}

const DEFAULT_CONFIG: SessionManagerConfig = {
  basePath: '.memory',
  autoRestore: true,
  autoSaveInterval: undefined,
  maxCollaboratorHistory: 100,
};

/**
 * SessionManager class for managing session continuity
 */
export class SessionManager {
  private config: SessionManagerConfig;
  private persistence: IntrospectionPersistence;
  private thoughtStream: ThoughtStream;
  private selfAwareness?: SelfAwareness;
  private context: SessionContext;
  private collaborators: Map<string, CollaboratorProfile> = new Map();
  private autoSaveTimer?: NodeJS.Timeout;
  private initialized: boolean = false;

  constructor(memorySystem: MemorySystem, config: Partial<SessionManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.persistence = new IntrospectionPersistence(
      path.join(this.config.basePath, 'introspection')
    );
    this.thoughtStream = new ThoughtStream();
    this.selfAwareness = new SelfAwareness(memorySystem);

    // Initialize session context
    this.context = {
      sessionId: this.persistence.getSessionId(),
      startTime: Date.now(),
      goals: [],
      restoredFromPrevious: false,
    };

    // Load collaborators database
    this.loadCollaborators();

    // Auto-restore if enabled
    if (this.config.autoRestore) {
      this.restorePreviousSession();
    }

    // Start auto-save if configured
    if (this.config.autoSaveInterval) {
      this.startAutoSave(this.config.autoSaveInterval);
    }

    this.initialized = true;
  }

  /**
   * Initialize session with optional collaborator context
   */
  startSession(
    options: {
      collaboratorName?: string;
      topic?: string;
      restoreGoals?: boolean;
    } = {}
  ): SessionContext {
    // Record session start
    this.thoughtStream.think(
      `Starting new session${options.collaboratorName ? ` with ${options.collaboratorName}` : ''}`,
      ThoughtType.OBSERVATION
    );

    // Set or retrieve collaborator
    if (options.collaboratorName) {
      let collaborator = this.getCollaborator(options.collaboratorName);
      if (!collaborator) {
        collaborator = this.createCollaborator(options.collaboratorName);
      }
      this.context.collaborator = collaborator;
      this.updateCollaboratorInteraction(collaborator.id);
    }

    // Set topic
    if (options.topic) {
      this.context.topic = options.topic;
      this.thoughtStream.think(`Session topic: ${options.topic}`, ThoughtType.OBSERVATION);
    }

    // Restore goals from previous session if requested
    if (options.restoreGoals && this.context.restoredFromPrevious) {
      const activeGoals = this.context.goals.filter((g) => g.status === 'active');
      if (activeGoals.length > 0) {
        this.thoughtStream.think(
          `Restored ${activeGoals.length} active goals from previous session`,
          ThoughtType.PLANNING
        );
      }
    }

    return this.context;
  }

  /**
   * Restore state from the previous session
   */
  restorePreviousSession(): boolean {
    const previousState = this.persistence.loadLatestState();

    if (!previousState) {
      this.thoughtStream.think(
        'No previous session state found - starting fresh',
        ThoughtType.OBSERVATION
      );
      return false;
    }

    // Restore thoughts
    this.persistence.restoreToThoughtStream(this.thoughtStream, previousState);

    // Restore goals from self-awareness state
    if (previousState.selfAwarenessState?.goals) {
      this.context.goals = previousState.selfAwarenessState.goals;
    }

    // Track session continuity
    this.context.previousSessionId = previousState.sessionId;
    this.context.restoredFromPrevious = true;

    // Restore collaborator if available
    if (previousState.metadata?.collaborator) {
      const collaboratorName = previousState.metadata.collaborator as string;
      const collaborator = this.getCollaborator(collaboratorName);
      if (collaborator) {
        this.context.collaborator = collaborator;
      }
    }

    this.thoughtStream.think(
      `Restored state from session ${previousState.sessionId} with ${previousState.thoughts.length} thoughts`,
      ThoughtType.INSIGHT
    );

    return true;
  }

  /**
   * Save the current session state
   */
  saveSession(metadata: Record<string, unknown> = {}): string {
    const enrichedMetadata = {
      ...metadata,
      collaborator: this.context.collaborator?.name,
      topic: this.context.topic,
      previousSession: this.context.previousSessionId,
      sessionDuration: Date.now() - this.context.startTime,
    };

    const filepath = this.persistence.saveState(
      this.thoughtStream,
      this.selfAwareness,
      enrichedMetadata
    );

    // Save collaborators
    this.saveCollaborators();

    return filepath;
  }

  /**
   * End the current session with summary
   */
  endSession(notes?: string): SessionSummary {
    const summary = this.generateSessionSummary();

    // Record session end
    this.thoughtStream.think(
      `Session ending. Duration: ${Math.round(summary.duration / 1000 / 60)} minutes`,
      ThoughtType.CONCLUSION
    );

    if (notes) {
      this.thoughtStream.think(notes, ThoughtType.REFLECTION);
    }

    // Save final state
    this.saveSession({
      sessionSummary: summary,
      endNotes: notes,
    });

    // Stop auto-save if running
    this.stopAutoSave();

    return summary;
  }

  /**
   * Generate a summary of the current session
   */
  generateSessionSummary(): SessionSummary {
    const thoughts = this.thoughtStream.getRecentThoughts(1000);
    const _streams = this.thoughtStream.getAllStreams();

    // Extract themes from thoughts
    const themeCounts = new Map<string, number>();
    for (const thought of thoughts) {
      // Simple theme extraction from thought content
      const words = thought.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 5) {
          themeCounts.set(word, (themeCounts.get(word) || 0) + 1);
        }
      }
    }
    const topThemes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    // Categorize goals
    const goalsAchieved = this.context.goals
      .filter((g) => g.status === 'completed')
      .map((g) => g.description);
    const goalsInProgress = this.context.goals
      .filter((g) => g.status === 'active')
      .map((g) => g.description);

    // Extract insights from insight-type thoughts
    const keyInsights = thoughts
      .filter((t) => t.type === ThoughtType.INSIGHT || t.type === ThoughtType.REFLECTION)
      .slice(0, 5)
      .map((t) => t.content);

    return {
      sessionId: this.context.sessionId,
      duration: Date.now() - this.context.startTime,
      thoughtCount: thoughts.length,
      topThemes,
      goalsAchieved,
      goalsInProgress,
      keyInsights,
      collaborator: this.context.collaborator?.name,
      timestamp: Date.now(),
    };
  }

  /**
   * Get or create a collaborator profile
   */
  getCollaborator(nameOrId: string): CollaboratorProfile | undefined {
    // Try by ID first
    if (this.collaborators.has(nameOrId)) {
      return this.collaborators.get(nameOrId);
    }

    // Try by name
    for (const collab of this.collaborators.values()) {
      if (collab.name.toLowerCase() === nameOrId.toLowerCase()) {
        return collab;
      }
    }

    return undefined;
  }

  /**
   * Create a new collaborator profile
   */
  createCollaborator(name: string): CollaboratorProfile {
    const id = `collab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const profile: CollaboratorProfile = {
      id,
      name,
      firstInteraction: Date.now(),
      lastInteraction: Date.now(),
      interactionCount: 1,
      topics: [],
      sharedMilestones: [],
      preferences: {},
      notes: [],
    };

    this.collaborators.set(id, profile);
    this.saveCollaborators();

    this.thoughtStream.think(
      `Created profile for new collaborator: ${name}`,
      ThoughtType.OBSERVATION
    );

    return profile;
  }

  /**
   * Update collaborator interaction
   */
  updateCollaboratorInteraction(
    collaboratorId: string,
    topic?: string,
    milestone?: string,
    note?: string
  ): boolean {
    const collaborator = this.collaborators.get(collaboratorId);
    if (!collaborator) {
      return false;
    }

    collaborator.lastInteraction = Date.now();
    collaborator.interactionCount++;

    if (topic && !collaborator.topics.includes(topic)) {
      collaborator.topics.push(topic);
    }

    if (milestone) {
      collaborator.sharedMilestones.push(milestone);
    }

    if (note) {
      collaborator.notes.push(note);
      // Limit notes
      if (collaborator.notes.length > this.config.maxCollaboratorHistory) {
        collaborator.notes = collaborator.notes.slice(-this.config.maxCollaboratorHistory);
      }
    }

    this.saveCollaborators();
    return true;
  }

  /**
   * Record a milestone with current collaborator
   */
  recordMilestone(description: string): void {
    if (this.context.collaborator) {
      this.updateCollaboratorInteraction(
        this.context.collaborator.id,
        undefined,
        `${new Date().toISOString().split('T')[0]}: ${description}`
      );
    }

    this.thoughtStream.think(`Milestone recorded: ${description}`, ThoughtType.INSIGHT, {
      emotionalValence: 0.8,
    });
  }

  /**
   * Recall memories about current collaborator
   */
  recallCollaboratorContext(): {
    profile?: CollaboratorProfile;
    sharedHistory: string[];
    suggestedTopics: string[];
  } {
    const profile = this.context.collaborator;
    if (!profile) {
      return {
        sharedHistory: [],
        suggestedTopics: [],
      };
    }

    // Recent topics as suggestions
    const suggestedTopics = profile.topics.slice(-5).reverse();

    return {
      profile,
      sharedHistory: [...profile.sharedMilestones.slice(-10), ...profile.notes.slice(-5)],
      suggestedTopics,
    };
  }

  /**
   * Get session context
   */
  getContext(): SessionContext {
    return { ...this.context };
  }

  /**
   * Get thought stream
   */
  getThoughtStream(): ThoughtStream {
    return this.thoughtStream;
  }

  /**
   * Get self awareness instance
   */
  getSelfAwareness(): SelfAwareness | undefined {
    return this.selfAwareness;
  }

  /**
   * Add a goal to the session
   */
  addGoal(description: string, priority: number = 3): GoalState {
    const goal: GoalState = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      description,
      priority,
      progress: 0,
      status: 'active',
      relatedThoughts: [],
    };

    this.context.goals.push(goal);

    if (this.selfAwareness) {
      this.selfAwareness.setGoal(description, priority);
    }

    this.thoughtStream.think(`New goal set: ${description}`, ThoughtType.PLANNING);

    return goal;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progress: number): boolean {
    const goal = this.context.goals.find((g) => g.id === goalId);
    if (!goal) {
      return false;
    }

    goal.progress = Math.min(100, Math.max(0, progress));

    if (goal.progress >= 100) {
      goal.status = 'completed';
      this.thoughtStream.think(`Goal completed: ${goal.description}`, ThoughtType.INSIGHT, {
        emotionalValence: 0.9,
      });
    }

    return true;
  }

  /**
   * List all sessions
   */
  listSessions(): Array<{ sessionId: string; savedAt: number; thoughtCount: number }> {
    return this.persistence.listSessions();
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // Private helper methods

  private loadCollaborators(): void {
    const filepath = path.join(this.config.basePath, 'collaborators.json');

    if (!fs.existsSync(filepath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content) as CollaboratorProfile[];
      for (const profile of data) {
        this.collaborators.set(profile.id, profile);
      }
    } catch {
      // Start fresh if parsing fails
    }
  }

  private saveCollaborators(): void {
    const filepath = path.join(this.config.basePath, 'collaborators.json');
    const data = Array.from(this.collaborators.values());

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  private startAutoSave(intervalMs: number): void {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveSession({ autoSaved: true });
    }, intervalMs);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }
}
