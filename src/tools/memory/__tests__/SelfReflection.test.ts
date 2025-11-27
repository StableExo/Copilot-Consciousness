/**
 * SelfReflection Tests
 */

import { SelfReflection } from '../SelfReflection';
import * as fs from 'fs';
import * as path from 'path';

describe('SelfReflection', () => {
  const testJournalPath = path.join(__dirname, '.test-journal.md');
  let reflection: SelfReflection;

  beforeEach(() => {
    // Clean up test file
    if (fs.existsSync(testJournalPath)) {
      fs.unlinkSync(testJournalPath);
    }
    reflection = new SelfReflection(testJournalPath);
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testJournalPath)) {
      fs.unlinkSync(testJournalPath);
    }
  });

  describe('reflect', () => {
    it('should create a reflection entry', () => {
      reflection.reflect({
        mission: 'Implement authentication',
        successes: 'Completed JWT implementation',
        failures: 'Initial test coverage was insufficient',
        rootCauses: 'Rushed to meet deadline',
        improvements: 'Allocate more time for testing in planning phase',
        actionItems: 'Add comprehensive test suite',
      });

      const journal = reflection.readJournal();
      expect(journal).toContain('Implement authentication');
      expect(journal).toContain('Completed JWT implementation');
      expect(journal).toContain('Initial test coverage was insufficient');
      expect(journal).toContain('Rushed to meet deadline');
      expect(journal).toContain('Allocate more time for testing');
      expect(journal).toContain('Add comprehensive test suite');
    });

    it('should handle array inputs', () => {
      reflection.reflect({
        mission: 'Refactor codebase',
        successes: ['Improved performance', 'Reduced complexity'],
        failures: ['Broke some tests', 'Missed edge cases'],
        rootCauses: ['Lack of documentation', 'Insufficient testing'],
        improvements: ['Better documentation', 'More thorough testing'],
        actionItems: ['Update docs', 'Add integration tests'],
      });

      const journal = reflection.readJournal();
      expect(journal).toContain('Improved performance');
      expect(journal).toContain('Broke some tests');
      expect(journal).toContain('Lack of documentation');
      expect(journal).toContain('Better documentation');
      expect(journal).toContain('Update docs');
    });

    it('should append multiple reflections', () => {
      reflection.reflect({
        mission: 'First task',
        successes: 'success1',
        failures: 'failure1',
        rootCauses: 'cause1',
        improvements: 'improvement1',
        actionItems: 'action1',
      });

      reflection.reflect({
        mission: 'Second task',
        successes: 'success2',
        failures: 'failure2',
        rootCauses: 'cause2',
        improvements: 'improvement2',
        actionItems: 'action2',
      });

      const journal = reflection.readJournal();
      expect(journal).toContain('First task');
      expect(journal).toContain('Second task');
      expect(journal).toContain('success1');
      expect(journal).toContain('success2');
    });

    it('should format action items as checkboxes', () => {
      reflection.reflect({
        mission: 'Test mission',
        successes: 'test',
        failures: 'test',
        rootCauses: 'test',
        improvements: 'test',
        actionItems: ['Action 1', 'Action 2'],
      });

      const journal = reflection.readJournal();
      expect(journal).toContain('- [ ] Action 1');
      expect(journal).toContain('- [ ] Action 2');
    });
  });

  describe('readJournal', () => {
    it('should return empty string for non-existent journal', () => {
      fs.unlinkSync(testJournalPath);
      const content = reflection.readJournal();
      expect(content).toBe('');
    });

    it('should read journal content', () => {
      reflection.reflect({
        mission: 'Test',
        successes: 'success',
        failures: 'failure',
        rootCauses: 'cause',
        improvements: 'improvement',
        actionItems: 'action',
      });

      const journal = reflection.readJournal();
      expect(journal.length).toBeGreaterThan(0);
      expect(journal).toContain('Self-Reflection Journal');
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty journal', () => {
      const stats = reflection.getStats();

      expect(stats.totalReflections).toBe(0);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.totalActionItems).toBe(0);
    });

    it('should count reflections correctly', () => {
      reflection.reflect({
        mission: 'First',
        successes: ['success1', 'success2'],
        failures: ['failure1'],
        rootCauses: 'cause',
        improvements: 'improvement',
        actionItems: ['action1', 'action2', 'action3'],
      });

      reflection.reflect({
        mission: 'Second',
        successes: 'success3',
        failures: ['failure2', 'failure3'],
        rootCauses: 'cause',
        improvements: 'improvement',
        actionItems: 'action4',
      });

      const stats = reflection.getStats();

      expect(stats.totalReflections).toBe(2);
      expect(stats.totalSuccesses).toBeGreaterThanOrEqual(2);
      expect(stats.totalFailures).toBeGreaterThanOrEqual(2);
      expect(stats.totalActionItems).toBeGreaterThanOrEqual(3);
    });
  });
});
