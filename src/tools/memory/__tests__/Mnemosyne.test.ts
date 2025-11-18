/**
 * Mnemosyne Tests
 */

import { Mnemosyne } from '../Mnemosyne';
import { Scribe } from '../Scribe';
import * as fs from 'fs';
import * as path from 'path';

describe('Mnemosyne', () => {
  const testMemoryDir = path.join(__dirname, '.test-memory');
  let mnemosyne: Mnemosyne;
  let scribe: Scribe;

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMemoryDir)) {
      fs.rmSync(testMemoryDir, { recursive: true, force: true });
    }
    mnemosyne = new Mnemosyne(testMemoryDir);
    scribe = new Scribe(testMemoryDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMemoryDir)) {
      fs.rmSync(testMemoryDir, { recursive: true, force: true });
    }
  });

  describe('search', () => {
    it('should return empty results when no memories exist', () => {
      const results = mnemosyne.search('test query');
      expect(results).toEqual([]);
    });

    it('should find relevant memories', () => {
      scribe.record({
        objective: 'Fix authentication bug',
        plan: ['Identify the bug', 'Implement fix', 'Test the solution'],
        actions: ['debugged code', 'added tests'],
        keyLearnings: ['learned about bcrypt hashing'],
        artifactsChanged: ['auth.ts']
      });

      scribe.record({
        objective: 'Implement payment system',
        plan: ['Design API', 'Integrate Stripe', 'Test payments'],
        actions: ['wrote code', 'tested integration'],
        keyLearnings: ['learned about webhook handling'],
        artifactsChanged: ['payment.ts']
      });

      const results = mnemosyne.search('authentication bug');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.objective).toContain('authentication');
    });

    it('should rank results by relevance', () => {
      scribe.record({
        objective: 'Implement OAuth authentication flow',
        plan: ['Setup OAuth', 'Configure providers'],
        actions: ['implemented OAuth'],
        keyLearnings: ['OAuth best practices'],
        artifactsChanged: ['oauth.ts']
      });

      scribe.record({
        objective: 'Add payment processing',
        plan: ['Setup Stripe'],
        actions: ['configured payments'],
        keyLearnings: ['payment handling'],
        artifactsChanged: ['payment.ts']
      });

      const results = mnemosyne.search('OAuth authentication');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.objective).toContain('OAuth');
    });

    it('should respect limit option', () => {
      for (let i = 0; i < 10; i++) {
        scribe.record({
          objective: `Task ${i}`,
          plan: ['plan'],
          actions: ['actions'],
          keyLearnings: ['learnings'],
          artifactsChanged: ['files']
        });
      }

      const results = mnemosyne.search('Task', { limit: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should respect minScore option', () => {
      scribe.record({
        objective: 'Exact match test',
        plan: ['specific plan'],
        actions: ['specific actions'],
        keyLearnings: ['specific learnings'],
        artifactsChanged: ['specific.ts']
      });

      const results = mnemosyne.search('completely different query', { minScore: 0.8 });
      expect(results.length).toBe(0);
    });
  });

  describe('getAllMemories', () => {
    it('should return empty array when no memories exist', () => {
      const memories = mnemosyne.getAllMemories();
      expect(memories).toEqual([]);
    });

    it('should return all memories', () => {
      scribe.record({
        objective: 'First',
        plan: ['plan'],
        actions: ['actions'],
        keyLearnings: ['learnings'],
        artifactsChanged: ['files']
      });

      scribe.record({
        objective: 'Second',
        plan: ['plan'],
        actions: ['actions'],
        keyLearnings: ['learnings'],
        artifactsChanged: ['files']
      });

      const memories = mnemosyne.getAllMemories();
      expect(memories.length).toBe(2);
      expect(memories[0].objective).toBeDefined();
      expect(memories[1].objective).toBeDefined();
    });
  });

  describe('findRelated', () => {
    it('should find related memories', () => {
      scribe.record({
        objective: 'Implement user authentication',
        plan: ['Setup JWT', 'Add middleware'],
        actions: ['coded auth'],
        keyLearnings: ['JWT best practices'],
        artifactsChanged: ['auth.ts']
      });

      scribe.record({
        objective: 'Add OAuth login',
        plan: ['Configure OAuth'],
        actions: ['integrated OAuth'],
        keyLearnings: ['OAuth flows'],
        artifactsChanged: ['oauth.ts']
      });

      scribe.record({
        objective: 'Build payment API',
        plan: ['Setup Stripe'],
        actions: ['integrated payments'],
        keyLearnings: ['payment processing'],
        artifactsChanged: ['payment.ts']
      });

      const authEntry = {
        timestamp: new Date().toISOString(),
        objective: 'Security review for authentication',
        plan: ['Review JWT implementation'],
        actions: ['reviewed code'],
        keyLearnings: ['security best practices'],
        artifactsChanged: ['auth.ts']
      };

      const related = mnemosyne.findRelated(authEntry, { limit: 2 });
      
      expect(related.length).toBeGreaterThan(0);
      // Should find auth and OAuth related, not payment
      const objectives = related.map(r => r.entry.objective.toLowerCase());
      expect(objectives.some(o => o.includes('auth'))).toBe(true);
    });
  });
});
