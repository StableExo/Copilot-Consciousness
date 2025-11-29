/**
 * Scribe Tests
 */

import { Scribe } from '../Scribe';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Scribe', () => {
  const testMemoryDir = path.join(__dirname, '.test-memory');
  let scribe: Scribe;

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMemoryDir)) {
      fs.rmSync(testMemoryDir, { recursive: true, force: true });
    }
    scribe = new Scribe(testMemoryDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMemoryDir)) {
      fs.rmSync(testMemoryDir, { recursive: true, force: true });
    }
  });

  describe('record', () => {
    it('should create a memory entry', () => {
      const filepath = scribe.record({
        objective: 'Test objective',
        plan: '1. Step one\n2. Step two',
        actions: 'ran tests, committed code',
        keyLearnings: 'learned something important',
        artifactsChanged: 'file1.ts, file2.ts',
      });

      expect(fs.existsSync(filepath)).toBe(true);
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('Test objective');
      expect(content).toContain('Step one');
      expect(content).toContain('Step two');
      expect(content).toContain('ran tests');
      expect(content).toContain('learned something important');
    });

    it('should handle array inputs', () => {
      const filepath = scribe.record({
        objective: 'Array test',
        plan: ['Step one', 'Step two', 'Step three'],
        actions: ['action1', 'action2'],
        keyLearnings: ['learning1', 'learning2'],
        artifactsChanged: ['file1.ts', 'file2.ts'],
      });

      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('Step one');
      expect(content).toContain('action2');
      expect(content).toContain('learning1');
      expect(content).toContain('file2.ts');
    });

    it('should include optional outcome', () => {
      const filepath = scribe.record({
        objective: 'Outcome test',
        plan: 'plan text',
        actions: 'actions text',
        keyLearnings: 'learnings text',
        artifactsChanged: 'files text',
        outcome: 'Successfully completed the task',
      });

      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('Outcome');
      expect(content).toContain('Successfully completed the task');
    });

    it('should generate unique filenames', async () => {
      const file1 = scribe.record({
        objective: 'First',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      // Wait to ensure different timestamp (need at least 1 second for the format)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const file2 = scribe.record({
        objective: 'Second',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      expect(file1).not.toBe(file2);
    });
  });

  describe('listMemories', () => {
    it('should return empty array when no memories exist', () => {
      const memories = scribe.listMemories();
      expect(memories).toEqual([]);
    });

    it('should list all memory files', async () => {
      scribe.record({
        objective: 'First memory',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      scribe.record({
        objective: 'Second memory',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      const memories = scribe.listMemories();
      expect(memories.length).toBe(2);
      expect(memories[0]).toMatch(/\.md$/);
    });

    it('should return memories in reverse chronological order', async () => {
      const file1 = scribe.record({
        objective: 'First',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      // Ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const file2 = scribe.record({
        objective: 'Second',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      const memories = scribe.listMemories();
      expect(memories.length).toBe(2);
      expect(memories[0]).toBe(path.basename(file2));
      expect(memories[1]).toBe(path.basename(file1));
    });
  });

  describe('readMemory', () => {
    it('should read a specific memory', () => {
      const filepath = scribe.record({
        objective: 'Test read',
        plan: 'plan',
        actions: 'actions',
        keyLearnings: 'learnings',
        artifactsChanged: 'files',
      });

      const filename = path.basename(filepath);
      const content = scribe.readMemory(filename);

      expect(content).toContain('Test read');
    });

    it('should throw error for non-existent memory', () => {
      expect(() => {
        scribe.readMemory('nonexistent.md');
      }).toThrow('Memory not found');
    });
  });
});
