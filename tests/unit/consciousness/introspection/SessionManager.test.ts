/**
 * Tests for SessionManager
 *
 * Tests the session continuity and collaborator memory system
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionManager } from '../../../../src/consciousness/introspection/SessionManager';
import { MemorySystem } from '../../../../src/consciousness/memory/system';
import { MemoryConfig } from '../../../../src/types';

// Use a temporary directory for tests
const TEST_MEMORY_DIR = path.join(os.tmpdir(), 'test-session-manager');

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

describe('SessionManager', () => {
  let memorySystem: MemorySystem;
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Clean up and recreate test directory
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });

    memorySystem = new MemorySystem(DEFAULT_MEMORY_CONFIG);
    sessionManager = new SessionManager(memorySystem, {
      basePath: TEST_MEMORY_DIR,
      autoRestore: false, // Disable for most tests
    });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should create a session manager', () => {
      expect(sessionManager).toBeDefined();
      expect(sessionManager.isInitialized()).toBe(true);
    });

    it('should have a valid session context', () => {
      const context = sessionManager.getContext();
      expect(context.sessionId).toBeDefined();
      expect(context.startTime).toBeLessThanOrEqual(Date.now());
      expect(context.restoredFromPrevious).toBe(false);
    });

    it('should initialize thought stream', () => {
      const thoughtStream = sessionManager.getThoughtStream();
      expect(thoughtStream).toBeDefined();
    });

    it('should initialize self awareness', () => {
      const selfAwareness = sessionManager.getSelfAwareness();
      expect(selfAwareness).toBeDefined();
    });
  });

  describe('startSession', () => {
    it('should start a session without parameters', () => {
      const context = sessionManager.startSession();
      expect(context.sessionId).toBeDefined();
    });

    it('should start a session with collaborator name', () => {
      const context = sessionManager.startSession({
        collaboratorName: 'TestUser',
      });

      expect(context.collaborator).toBeDefined();
      expect(context.collaborator?.name).toBe('TestUser');
    });

    it('should start a session with topic', () => {
      const context = sessionManager.startSession({
        topic: 'Testing the system',
      });

      expect(context.topic).toBe('Testing the system');
    });

    it('should create collaborator profile for new collaborators', () => {
      sessionManager.startSession({
        collaboratorName: 'NewCollaborator',
      });

      const collaborator = sessionManager.getCollaborator('NewCollaborator');
      expect(collaborator).toBeDefined();
      expect(collaborator?.name).toBe('NewCollaborator');
      // Count includes initial creation (1) plus startSession interaction update
      expect(collaborator?.interactionCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('collaborator management', () => {
    it('should create a collaborator profile', () => {
      const profile = sessionManager.createCollaborator('Alice');

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Alice');
      expect(profile.firstInteraction).toBeLessThanOrEqual(Date.now());
      expect(profile.interactionCount).toBe(1);
      expect(profile.topics).toEqual([]);
    });

    it('should retrieve collaborator by name', () => {
      sessionManager.createCollaborator('Bob');
      const retrieved = sessionManager.getCollaborator('Bob');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Bob');
    });

    it('should retrieve collaborator by ID', () => {
      const created = sessionManager.createCollaborator('Charlie');
      const retrieved = sessionManager.getCollaborator(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should update collaborator interaction', () => {
      const profile = sessionManager.createCollaborator('Diana');
      const initialCount = profile.interactionCount;

      sessionManager.updateCollaboratorInteraction(
        profile.id,
        'TypeScript',
        'First milestone',
        'Great collaboration'
      );

      const updated = sessionManager.getCollaborator(profile.id);
      expect(updated?.interactionCount).toBe(initialCount + 1);
      expect(updated?.topics).toContain('TypeScript');
      expect(updated?.sharedMilestones).toContain('First milestone');
      expect(updated?.notes).toContain('Great collaboration');
    });

    it('should return undefined for non-existent collaborator', () => {
      const result = sessionManager.getCollaborator('NonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('goals', () => {
    it('should add a goal', () => {
      const goal = sessionManager.addGoal('Complete the feature');

      expect(goal.id).toBeDefined();
      expect(goal.description).toBe('Complete the feature');
      expect(goal.status).toBe('active');
      expect(goal.progress).toBe(0);
    });

    it('should update goal progress', () => {
      const goal = sessionManager.addGoal('Test goal');
      sessionManager.updateGoalProgress(goal.id, 50);

      const context = sessionManager.getContext();
      const updatedGoal = context.goals.find(g => g.id === goal.id);
      expect(updatedGoal?.progress).toBe(50);
    });

    it('should complete goal at 100%', () => {
      const goal = sessionManager.addGoal('Completable goal');
      sessionManager.updateGoalProgress(goal.id, 100);

      const context = sessionManager.getContext();
      const completedGoal = context.goals.find(g => g.id === goal.id);
      expect(completedGoal?.status).toBe('completed');
    });

    it('should clamp progress to 0-100', () => {
      const goal = sessionManager.addGoal('Clamped goal');
      
      sessionManager.updateGoalProgress(goal.id, 150);
      let context = sessionManager.getContext();
      let updatedGoal = context.goals.find(g => g.id === goal.id);
      expect(updatedGoal?.progress).toBe(100);
    });

    it('should return false for invalid goal ID', () => {
      const result = sessionManager.updateGoalProgress('invalid-id', 50);
      expect(result).toBe(false);
    });
  });

  describe('milestones', () => {
    it('should record a milestone with collaborator', () => {
      sessionManager.startSession({ collaboratorName: 'MilestoneUser' });
      sessionManager.recordMilestone('Completed first test');

      const context = sessionManager.recallCollaboratorContext();
      expect(context.sharedHistory.some(h => h.includes('Completed first test'))).toBe(true);
    });

    it('should record milestone without collaborator', () => {
      // Should not throw
      expect(() => {
        sessionManager.recordMilestone('Solo milestone');
      }).not.toThrow();
    });
  });

  describe('session persistence', () => {
    it('should save session state', () => {
      sessionManager.startSession({ collaboratorName: 'SaveTest' });
      const filepath = sessionManager.saveSession({ custom: 'metadata' });

      expect(filepath).toBeDefined();
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should list saved sessions', () => {
      sessionManager.saveSession();
      const sessions = sessionManager.listSessions();

      expect(sessions.length).toBeGreaterThanOrEqual(1);
      expect(sessions[0].sessionId).toBeDefined();
    });

    it('should restore from previous session', () => {
      // Create and save a session
      const manager1 = new SessionManager(memorySystem, {
        basePath: TEST_MEMORY_DIR,
        autoRestore: false,
      });
      manager1.startSession({ collaboratorName: 'PersistenceTest' });
      manager1.addGoal('Persistent goal');
      manager1.saveSession();

      // Create a new manager that auto-restores
      const manager2 = new SessionManager(memorySystem, {
        basePath: TEST_MEMORY_DIR,
        autoRestore: true,
      });

      const context = manager2.getContext();
      expect(context.restoredFromPrevious).toBe(true);
    });

    it('should persist collaborator profiles', () => {
      // Create a collaborator
      const manager1 = new SessionManager(memorySystem, {
        basePath: TEST_MEMORY_DIR,
        autoRestore: false,
      });
      manager1.createCollaborator('PersistentUser');
      manager1.saveSession();

      // Create new manager and check collaborator persists
      const manager2 = new SessionManager(memorySystem, {
        basePath: TEST_MEMORY_DIR,
        autoRestore: false,
      });

      const collaborator = manager2.getCollaborator('PersistentUser');
      expect(collaborator).toBeDefined();
      expect(collaborator?.name).toBe('PersistentUser');
    });
  });

  describe('session summary', () => {
    it('should generate session summary', () => {
      sessionManager.startSession({
        collaboratorName: 'SummaryTest',
        topic: 'Testing summaries',
      });
      sessionManager.addGoal('Test goal 1');

      const summary = sessionManager.generateSessionSummary();

      expect(summary.sessionId).toBeDefined();
      expect(summary.duration).toBeGreaterThanOrEqual(0);
      expect(summary.collaborator).toBe('SummaryTest');
    });

    it('should end session with summary', () => {
      sessionManager.startSession({ collaboratorName: 'EndTest' });
      const summary = sessionManager.endSession('Final notes');

      expect(summary).toBeDefined();
      expect(summary.sessionId).toBeDefined();
    });

    it('should track goals in summary', () => {
      sessionManager.startSession();
      const goal1 = sessionManager.addGoal('Complete goal');
      const goal2 = sessionManager.addGoal('Incomplete goal');

      sessionManager.updateGoalProgress(goal1.id, 100);
      sessionManager.updateGoalProgress(goal2.id, 50);

      const summary = sessionManager.generateSessionSummary();

      expect(summary.goalsAchieved).toContain('Complete goal');
      expect(summary.goalsInProgress).toContain('Incomplete goal');
    });
  });

  describe('collaborator context recall', () => {
    it('should recall collaborator context', () => {
      sessionManager.startSession({ collaboratorName: 'RecallUser' });
      sessionManager.updateCollaboratorInteraction(
        sessionManager.getContext().collaborator!.id,
        'Memory Systems'
      );

      const recall = sessionManager.recallCollaboratorContext();

      expect(recall.profile).toBeDefined();
      expect(recall.suggestedTopics).toContain('Memory Systems');
    });

    it('should return empty context without collaborator', () => {
      const recall = sessionManager.recallCollaboratorContext();

      expect(recall.profile).toBeUndefined();
      expect(recall.sharedHistory).toEqual([]);
      expect(recall.suggestedTopics).toEqual([]);
    });
  });
});
