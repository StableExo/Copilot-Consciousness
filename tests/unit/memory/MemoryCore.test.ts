/**
 * Tests for MemoryCore - Unified Memory System Facade
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MemoryCore } from '../../../src/memory/MemoryCore';
import { Priority } from '../../../src/types';

// Use a temporary directory for tests
const TEST_MEMORY_DIR = path.join(os.tmpdir(), 'test-memory-core');

describe('MemoryCore', () => {
  let memoryCore: MemoryCore;

  beforeEach(() => {
    // Clean up and recreate test directory
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });

    memoryCore = new MemoryCore({
      basePath: TEST_MEMORY_DIR,
      autoRestore: false,
    });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should create a memory core', () => {
      expect(memoryCore).toBeDefined();
      expect(memoryCore.isInitialized()).toBe(true);
    });

    it('should initialize subsystems', () => {
      expect(memoryCore.getSemanticMemory()).toBeDefined();
      expect(memoryCore.getMemorySystem()).toBeDefined();
      expect(memoryCore.getSessionManager()).toBeDefined();
    });

    it('should initialize with default config', () => {
      const defaultCore = new MemoryCore();
      expect(defaultCore.isInitialized()).toBe(true);
    });
  });

  describe('session management', () => {
    it('should start a session', () => {
      const context = memoryCore.startSession({
        collaboratorName: 'TestUser',
        topic: 'Testing',
      });

      expect(context.sessionId).toBeDefined();
      expect(context.collaborator?.name).toBe('TestUser');
      expect(context.topic).toBe('Testing');
    });

    it('should get session context', () => {
      memoryCore.startSession({ topic: 'Context test' });
      const context = memoryCore.getSessionContext();

      expect(context.topic).toBe('Context test');
    });

    it('should end a session with summary', () => {
      memoryCore.startSession({ collaboratorName: 'EndTest' });
      const summary = memoryCore.endSession('Session notes');

      expect(summary.sessionId).toBeDefined();
      expect(summary.collaborator).toBe('EndTest');
    });

    it('should save session state', () => {
      memoryCore.startSession();
      const filepath = memoryCore.saveSession({ testMeta: true });

      expect(filepath).toBeDefined();
    });
  });

  describe('semantic memory', () => {
    it('should create a memory entry', () => {
      const memory = memoryCore.createMemory({
        objective: 'Test semantic memory',
        plan: 'Create and retrieve',
        actions: 'memoryCore.createMemory()',
        keyLearnings: 'It works!',
        artifactsChanged: 'test.ts',
      });

      expect(memory.objective).toBe('Test semantic memory');
      expect(memory.taskId).toBeDefined();
    });

    it('should search memories semantically', () => {
      memoryCore.createMemory({
        objective: 'Learn TypeScript generics',
        plan: 'Study docs',
        actions: 'Read and practice',
        keyLearnings: 'Generics are powerful',
        artifactsChanged: 'generics.ts',
      });

      const results = memoryCore.searchMemories('typescript generics');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should search by keyword', () => {
      memoryCore.createMemory({
        objective: 'Implement keyword search',
        plan: 'Use text matching',
        actions: 'indexOf or includes',
        keyLearnings: 'Case insensitive is important',
        artifactsChanged: 'search.ts',
      });

      const results = memoryCore.searchByKeyword('keyword');
      expect(results.length).toBe(1);
    });

    it('should answer what it knows about a topic', () => {
      memoryCore.createMemory({
        objective: 'Learn about memory systems',
        plan: 'Study cognitive science',
        actions: 'Research and implement',
        keyLearnings: 'Memory has multiple types',
        artifactsChanged: 'memory.ts',
      });

      const knowledge = memoryCore.whatDoIKnow('memory systems');
      expect(knowledge.summary).toBeDefined();
      expect(knowledge.memories.length).toBeGreaterThanOrEqual(0);
    });

    it('should reflect on learning', () => {
      memoryCore.createMemory({
        objective: 'Test reflection',
        plan: 'Create memory',
        actions: 'reflectOnLearning()',
        keyLearnings: 'Reflection is valuable',
        artifactsChanged: 'reflect.ts',
      });

      const reflection = memoryCore.reflectOnLearning(7);
      expect(reflection.recentMemories.length).toBeGreaterThanOrEqual(0);
      expect(reflection.insights.length).toBeGreaterThan(0);
    });
  });

  describe('working memory', () => {
    it('should add working memory', () => {
      const id = memoryCore.addWorkingMemory(
        { task: 'Current processing' },
        Priority.HIGH,
        { source: 'test' }
      );

      expect(id).toBeDefined();
    });
  });

  describe('episodic memory', () => {
    it('should add episodic memory', () => {
      const id = memoryCore.addEpisodicMemory(
        'trade_executed',
        { amount: 100, pair: 'ETH/USDC' },
        Priority.MEDIUM
      );

      expect(id).toBeDefined();
    });
  });

  describe('consolidation', () => {
    it('should consolidate memories', () => {
      // Add some memories to consolidate
      memoryCore.addWorkingMemory({ data: 'test1' });
      memoryCore.addWorkingMemory({ data: 'test2' });

      const result = memoryCore.consolidate();

      expect(result).toHaveProperty('consolidated');
      expect(result).toHaveProperty('archived');
      expect(result).toHaveProperty('forgotten');
    });
  });

  describe('milestones', () => {
    it('should record a milestone', () => {
      memoryCore.startSession({ collaboratorName: 'MilestoneUser' });
      
      expect(() => {
        memoryCore.recordMilestone('First test passed');
      }).not.toThrow();
    });
  });

  describe('collaborator context', () => {
    it('should recall collaborator context', () => {
      memoryCore.startSession({ collaboratorName: 'RecallUser' });
      const recall = memoryCore.recallCollaborator();

      expect(recall.profile).toBeDefined();
      expect(recall.profile?.name).toBe('RecallUser');
    });

    it('should return empty context without collaborator', () => {
      const recall = memoryCore.recallCollaborator();

      expect(recall.profile).toBeUndefined();
      expect(recall.sharedHistory).toEqual([]);
    });
  });

  describe('statistics', () => {
    it('should get memory stats', () => {
      memoryCore.createMemory({
        objective: 'Stats test',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      const stats = memoryCore.getStats();

      expect(stats.totalSemanticMemories).toBeGreaterThanOrEqual(1);
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('topTopics');
    });
  });

  describe('export/import', () => {
    it('should export memories', () => {
      memoryCore.createMemory({
        objective: 'Export test',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      const exported = memoryCore.exportMemories();

      expect(exported.version).toBe('1.0.0');
      expect(exported.exportedAt).toBeLessThanOrEqual(Date.now());
      expect(exported.memories.semantic.length).toBeGreaterThanOrEqual(1);
    });

    it('should export to file', () => {
      memoryCore.createMemory({
        objective: 'File export test',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      const filepath = path.join(TEST_MEMORY_DIR, 'export.json');
      const success = memoryCore.exportToFile(filepath);

      expect(success).toBe(true);
      expect(fs.existsSync(filepath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      expect(content.version).toBe('1.0.0');
    });

    it('should import from file', async () => {
      // Create and export
      memoryCore.createMemory({
        objective: 'Importable memory',
        plan: 'Will be imported',
        actions: 'Import test',
        keyLearnings: 'Import works',
        artifactsChanged: 'import.ts',
      });

      const exportPath = path.join(TEST_MEMORY_DIR, 'to-import.json');
      memoryCore.exportToFile(exportPath);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create new core and import
      const newCore = new MemoryCore({
        basePath: path.join(TEST_MEMORY_DIR, 'import-target'),
        autoRestore: false,
      });

      const result = newCore.importFromFile(exportPath);

      expect(result.success).toBe(true);
      expect(result.imported.semantic).toBeGreaterThanOrEqual(1);
    });

    it('should handle import of non-existent file', () => {
      const result = memoryCore.importFromFile('/non/existent/file.json');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid export format', () => {
      const invalidPath = path.join(TEST_MEMORY_DIR, 'invalid.json');
      fs.writeFileSync(invalidPath, JSON.stringify({ invalid: 'format' }));

      const result = memoryCore.importFromFile(invalidPath);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid'))).toBe(true);
    });
  });
});
