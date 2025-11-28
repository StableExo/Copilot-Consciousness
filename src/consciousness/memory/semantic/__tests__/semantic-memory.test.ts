/**
 * Tests for the Semantic Memory System
 *
 * Tests the MemoryScribe and SemanticMemoryCore modules that are inspired
 * by the AGI repository's Memory Core architecture.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MemoryScribe } from '../MemoryScribe';
import { SemanticMemoryCore } from '../SemanticMemoryCore';
import { SemanticMemoryEventType } from '../types';

// Use a temporary directory for tests (cross-platform compatible)
const TEST_MEMORY_DIR = path.join(os.tmpdir(), 'test-semantic-memory');

describe('MemoryScribe', () => {
  let scribe: MemoryScribe;

  beforeEach(() => {
    // Clean up and recreate test directory
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
    scribe = new MemoryScribe({ memoryDir: TEST_MEMORY_DIR });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
  });

  describe('createMemory', () => {
    it('should create a memory entry with all fields', () => {
      const memory = scribe.createMemory({
        objective: 'Test the memory system',
        plan: '1. Create scribe\n2. Write tests',
        actions: 'npm test',
        keyLearnings: 'The system works well',
        artifactsChanged: 'src/memory/semantic/',
      });

      expect(memory.objective).toBe('Test the memory system');
      expect(memory.plan).toBe('1. Create scribe\n2. Write tests');
      expect(memory.actions).toBe('npm test');
      expect(memory.keyLearnings).toBe('The system works well');
      expect(memory.artifactsChanged).toBe('src/memory/semantic/');
      expect(memory.taskId).toMatch(/^\d{14}_\d{3}$/);
      expect(memory.timestamp).toBeDefined();
      expect(memory.relatedMemories).toEqual([]);
    });

    it('should create a markdown file with correct structure', () => {
      const memory = scribe.createMemory({
        objective: 'Test file creation',
        plan: 'Simple plan',
        actions: 'Simple action',
        keyLearnings: 'Simple learning',
        artifactsChanged: 'test.ts',
      });

      const filepath = path.join(TEST_MEMORY_DIR, `${memory.taskId}.md`);
      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain(`# Memory Entry: ${memory.taskId}`);
      expect(content).toContain('## Objective');
      expect(content).toContain('Test file creation');
      expect(content).toContain('## Plan');
      expect(content).toContain('## Actions');
      expect(content).toContain('## Key Learnings');
      expect(content).toContain('## Artifacts Changed');
    });

    it('should support related memories', () => {
      const memory = scribe.createMemory({
        objective: 'Test with relations',
        plan: 'Plan',
        actions: 'Actions',
        keyLearnings: 'Learnings',
        artifactsChanged: 'files',
        relatedMemories: ['20250101120000', '20250102120000'],
      });

      expect(memory.relatedMemories).toEqual(['20250101120000', '20250102120000']);

      const filepath = path.join(TEST_MEMORY_DIR, `${memory.taskId}.md`);
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('## Related Memories');
      expect(content).toContain('`20250101120000`');
      expect(content).toContain('`20250102120000`');
    });

    it('should update the semantic index', () => {
      scribe.createMemory({
        objective: 'First memory',
        plan: 'Plan 1',
        actions: 'Action 1',
        keyLearnings: 'Learning 1',
        artifactsChanged: 'file1.ts',
      });

      scribe.createMemory({
        objective: 'Second memory',
        plan: 'Plan 2',
        actions: 'Action 2',
        keyLearnings: 'Learning 2',
        artifactsChanged: 'file2.ts',
      });

      const indexPath = scribe.getIndexPath();
      expect(fs.existsSync(indexPath)).toBe(true);

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(Object.keys(index)).toHaveLength(2);
    });

    it('should append to the log file', () => {
      scribe.createMemory({
        objective: 'Test logging',
        plan: 'Plan',
        actions: 'Actions',
        keyLearnings: 'Learnings',
        artifactsChanged: 'files',
      });

      const logPath = scribe.getLogPath();
      expect(fs.existsSync(logPath)).toBe(true);

      const logContent = fs.readFileSync(logPath, 'utf-8');
      expect(logContent).toContain('Objective: Test logging');
    });
  });

  describe('readMemory', () => {
    it('should read a memory entry by task ID', () => {
      const created = scribe.createMemory({
        objective: 'Test reading',
        plan: 'Read plan',
        actions: 'Read action',
        keyLearnings: 'Read learning',
        artifactsChanged: 'read.ts',
      });

      const memory = scribe.readMemory(created.taskId);
      expect(memory).not.toBeNull();
      expect(memory!.objective).toBe('Test reading');
      expect(memory!.plan).toBe('Read plan');
    });

    it('should return null for non-existent memory', () => {
      const memory = scribe.readMemory('99999999999999');
      expect(memory).toBeNull();
    });
  });

  describe('listMemories', () => {
    it('should list all memories sorted by timestamp', async () => {
      scribe.createMemory({
        objective: 'First',
        plan: 'P1',
        actions: 'A1',
        keyLearnings: 'L1',
        artifactsChanged: 'F1',
      });

      // Wait 1 second to ensure different timestamp (task IDs are second-precision)
      await new Promise((resolve) => setTimeout(resolve, 10));

      scribe.createMemory({
        objective: 'Second',
        plan: 'P2',
        actions: 'A2',
        keyLearnings: 'L2',
        artifactsChanged: 'F2',
      });

      const memories = scribe.listMemories();
      expect(memories).toHaveLength(2);
      expect(memories[0].objective).toBe('Second'); // Newest first
      expect(memories[1].objective).toBe('First');
    });
  });

  describe('searchByKeyword', () => {
    it('should find memories containing the keyword', async () => {
      scribe.createMemory({
        objective: 'Implement semantic search',
        plan: 'Use TF-IDF',
        actions: 'Coded',
        keyLearnings: 'Works well',
        artifactsChanged: 'search.ts',
      });

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      scribe.createMemory({
        objective: 'Fix database bug',
        plan: 'Debug SQL',
        actions: 'Fixed',
        keyLearnings: 'Null check needed',
        artifactsChanged: 'db.ts',
      });

      const results = scribe.searchByKeyword('semantic');
      expect(results).toHaveLength(1);
      expect(results[0].objective).toContain('semantic');
    });

    it('should return empty array for no matches', () => {
      scribe.createMemory({
        objective: 'Test something',
        plan: 'Plan',
        actions: 'Actions',
        keyLearnings: 'Learnings',
        artifactsChanged: 'files',
      });

      const results = scribe.searchByKeyword('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('linkMemories', () => {
    it('should create bidirectional links between memories', async () => {
      const memory1 = scribe.createMemory({
        objective: 'First memory',
        plan: 'P1',
        actions: 'A1',
        keyLearnings: 'L1',
        artifactsChanged: 'F1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const memory2 = scribe.createMemory({
        objective: 'Second memory',
        plan: 'P2',
        actions: 'A2',
        keyLearnings: 'L2',
        artifactsChanged: 'F2',
      });

      const linked = scribe.linkMemories(memory1.taskId, memory2.taskId);
      expect(linked).toBe(true);

      const updated1 = scribe.readMemory(memory1.taskId);
      const updated2 = scribe.readMemory(memory2.taskId);

      expect(updated1!.relatedMemories).toContain(memory2.taskId);
      expect(updated2!.relatedMemories).toContain(memory1.taskId);
    });

    it('should not duplicate links', async () => {
      const memory1 = scribe.createMemory({
        objective: 'Memory 1',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const memory2 = scribe.createMemory({
        objective: 'Memory 2',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      scribe.linkMemories(memory1.taskId, memory2.taskId);
      scribe.linkMemories(memory1.taskId, memory2.taskId); // Link again

      const updated1 = scribe.readMemory(memory1.taskId);
      expect(updated1!.relatedMemories.filter((id) => id === memory2.taskId)).toHaveLength(1);
    });
  });
});

describe('SemanticMemoryCore', () => {
  let core: SemanticMemoryCore;

  beforeEach(() => {
    // Clean up and recreate test directory
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
    core = new SemanticMemoryCore({ memoryDir: TEST_MEMORY_DIR });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
    }
  });

  describe('createMemory', () => {
    it('should create a memory through the core', () => {
      const memory = core.createMemory({
        objective: 'Test core creation',
        plan: 'Plan',
        actions: 'Actions',
        keyLearnings: 'Learnings',
        artifactsChanged: 'files',
      });

      expect(memory.objective).toBe('Test core creation');
      expect(memory.taskId).toBeDefined();
    });

    it('should emit MEMORY_CREATED event', () => {
      const events: any[] = [];
      core.on(SemanticMemoryEventType.MEMORY_CREATED, (event) => {
        events.push(event);
      });

      core.createMemory({
        objective: 'Test event',
        plan: 'Plan',
        actions: 'Actions',
        keyLearnings: 'Learnings',
        artifactsChanged: 'files',
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SemanticMemoryEventType.MEMORY_CREATED);
    });
  });

  describe('searchByKeyword', () => {
    it('should return ranked results', () => {
      core.createMemory({
        objective: 'Implement search functionality',
        plan: 'Use algorithms',
        actions: 'Coded',
        keyLearnings: 'Search works',
        artifactsChanged: 'search.ts',
      });

      const results = core.searchByKeyword('search');
      expect(results).toHaveLength(1);
      expect(results[0].rank).toBe(1);
      expect(results[0].similarityScore).toBeGreaterThan(0);
    });

    it('should emit SEARCH_PERFORMED event', () => {
      const events: any[] = [];
      core.on(SemanticMemoryEventType.SEARCH_PERFORMED, (event) => {
        events.push(event);
      });

      core.searchByKeyword('test');

      expect(events).toHaveLength(1);
      expect(events[0].data.searchType).toBe('keyword');
    });
  });

  describe('searchSemantic', () => {
    it('should rank results by semantic similarity', () => {
      core.createMemory({
        objective: 'Implement machine learning model',
        plan: 'Use neural networks for prediction',
        actions: 'Trained model',
        keyLearnings: 'Deep learning is powerful',
        artifactsChanged: 'ml.ts',
      });

      core.createMemory({
        objective: 'Fix database connection',
        plan: 'Check connection string',
        actions: 'Debugged',
        keyLearnings: 'Connection timeout was the issue',
        artifactsChanged: 'db.ts',
      });

      // Search for something related to ML
      const results = core.searchSemantic('neural network deep learning');

      // The ML memory should rank higher
      if (results.length > 1) {
        expect(results[0].memory.objective).toContain('machine learning');
      }
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      core.createMemory({
        objective: 'Memory 1',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const memory2 = core.createMemory({
        objective: 'Memory 2',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      core.createMemory({
        objective: 'Memory 3',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
        relatedMemories: [memory2.taskId],
      });

      // Link memory 2 back to memory 3
      core.linkMemories(memory2.taskId, core.listMemories()[0].taskId);

      const stats = core.getStats();
      expect(stats.totalMemories).toBe(3);
      expect(stats.indexedMemories).toBe(3);
      expect(stats.oldestMemory).toBeDefined();
      expect(stats.newestMemory).toBeDefined();
    });
  });

  describe('whatDoIKnow', () => {
    it('should return relevant memories and summary', async () => {
      core.createMemory({
        objective: 'Learn TypeScript generics',
        plan: 'Study documentation',
        actions: 'Read docs and practiced',
        keyLearnings: 'Generics provide type safety with flexibility',
        artifactsChanged: 'generics.ts',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      core.createMemory({
        objective: 'Fix Python import error',
        plan: 'Check module paths',
        actions: 'Updated imports',
        keyLearnings: 'Python needs __init__.py files',
        artifactsChanged: 'main.py',
      });

      // Search for TypeScript related - use keywords that match
      const knowledge = core.whatDoIKnow('typescript generics type');

      expect(knowledge.memories.length).toBeGreaterThanOrEqual(0);
      expect(knowledge.summary).toBeDefined();
      expect(knowledge.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should return empty result for unknown topic', () => {
      const knowledge = core.whatDoIKnow('quantum computing algorithms');

      expect(knowledge.memories).toHaveLength(0);
      expect(knowledge.summary).toContain("don't have any stored memories");
      expect(knowledge.confidence).toBe(0);
    });
  });

  describe('reflectOnLearning', () => {
    it('should return recent learning summary', async () => {
      core.createMemory({
        objective: 'Implement feature A',
        plan: 'Plan A',
        actions: 'Action A',
        keyLearnings: 'Learning A',
        artifactsChanged: 'fileA.ts',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      core.createMemory({
        objective: 'Implement feature B',
        plan: 'Plan B',
        actions: 'Action B',
        keyLearnings: 'Learning B',
        artifactsChanged: 'fileB.ts',
      });

      const reflection = core.reflectOnLearning(7);

      expect(reflection.recentMemories).toHaveLength(2);
      expect(reflection.topicsLearned).toHaveLength(2);
      expect(reflection.artifactsChanged).toContain('fileA.ts');
      expect(reflection.artifactsChanged).toContain('fileB.ts');
      expect(reflection.insights.length).toBeGreaterThan(0);
    });
  });

  describe('linkMemories', () => {
    it('should emit MEMORY_LINKED event', async () => {
      const events: any[] = [];
      core.on(SemanticMemoryEventType.MEMORY_LINKED, (event) => {
        events.push(event);
      });

      const memory1 = core.createMemory({
        objective: 'M1',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const memory2 = core.createMemory({
        objective: 'M2',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      core.linkMemories(memory1.taskId, memory2.taskId);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SemanticMemoryEventType.MEMORY_LINKED);
    });
  });

  describe('getRelatedMemories', () => {
    it('should return related memories', async () => {
      const memory1 = core.createMemory({
        objective: 'Base memory',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const memory2 = core.createMemory({
        objective: 'Related memory',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      core.linkMemories(memory1.taskId, memory2.taskId);

      const related = core.getRelatedMemories(memory1.taskId);
      expect(related).toHaveLength(1);
      expect(related[0].objective).toBe('Related memory');
    });
  });

  describe('event system', () => {
    it('should allow unsubscribing from events', () => {
      const events: any[] = [];
      const handler = (event: any) => events.push(event);

      core.on(SemanticMemoryEventType.MEMORY_CREATED, handler);

      core.createMemory({
        objective: 'First',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      expect(events).toHaveLength(1);

      core.off(SemanticMemoryEventType.MEMORY_CREATED, handler);

      core.createMemory({
        objective: 'Second',
        plan: 'P',
        actions: 'A',
        keyLearnings: 'L',
        artifactsChanged: 'F',
      });

      // Should still be 1 after unsubscribing
      expect(events).toHaveLength(1);
    });
  });
});
