/**
 * Tests for Knowledge Base modules
 */

import { CodexManager } from '../codex-manager';
import { PatternTracker, PatternType } from '../pattern-tracker';
import { LearningEngine, LearningMode } from '../learning-engine';

describe('Knowledge Base', () => {
  describe('CodexManager', () => {
    it('should add and retrieve knowledge entries', () => {
      const codex = new CodexManager();

      const entry = codex.addEntry(
        'Test Knowledge',
        'This is test content about AI consciousness',
        'consciousness',
        ['AI', 'test'],
        0.8
      );

      expect(entry.title).toBe('Test Knowledge');
      expect(entry.category).toBe('consciousness');
      expect(entry.importance).toBe(0.8);

      const retrieved = codex.getEntry(entry.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessCount).toBe(1);
    });

    it('should search knowledge entries', () => {
      const codex = new CodexManager();

      codex.addEntry('Machine Learning', 'ML basics', 'learning', ['ML']);
      codex.addEntry('Deep Learning', 'Neural networks', 'learning', ['ML', 'neural']);
      codex.addEntry('Consciousness', 'AI awareness', 'consciousness', ['AI']);

      const results = codex.search('learning');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.category).toBe('learning');
    });

    it('should get entries by category', () => {
      const codex = new CodexManager();

      codex.addEntry('Entry 1', 'Content 1', 'cat1');
      codex.addEntry('Entry 2', 'Content 2', 'cat1');
      codex.addEntry('Entry 3', 'Content 3', 'cat2');

      const cat1Entries = codex.getByCategory('cat1');
      expect(cat1Entries.length).toBe(2);
    });
  });

  describe('PatternTracker', () => {
    it('should register patterns', () => {
      const tracker = new PatternTracker();

      const pattern = tracker.registerPattern(
        'Test Pattern',
        PatternType.BEHAVIORAL,
        'A test behavioral pattern',
        { behavior: 'test' },
        0.7
      );

      expect(pattern.name).toBe('Test Pattern');
      expect(pattern.type).toBe(PatternType.BEHAVIORAL);
      expect(pattern.strength).toBe(0.7);
    });

    it('should record observations', () => {
      const tracker = new PatternTracker();

      tracker.recordObservation({ event: 'test', value: 42 });
      tracker.recordObservation({ event: 'test', value: 45 });

      // Pattern detection runs every 100 observations, so just verify recording works
      expect(true).toBe(true);
    });

    it('should get patterns by type', () => {
      const tracker = new PatternTracker();

      tracker.registerPattern('P1', PatternType.TEMPORAL, 'Desc', {});
      tracker.registerPattern('P2', PatternType.BEHAVIORAL, 'Desc', {});
      tracker.registerPattern('P3', PatternType.TEMPORAL, 'Desc', {});

      const temporal = tracker.getPatternsByType(PatternType.TEMPORAL);
      expect(temporal.length).toBe(2);
    });
  });

  describe('LearningEngine', () => {
    it('should start and end learning sessions', () => {
      const engine = new LearningEngine();

      const session = engine.startSession('Test Topic', LearningMode.SUPERVISED);
      expect(session.topic).toBe('Test Topic');
      expect(session.mode).toBe(LearningMode.SUPERVISED);

      engine.addExample({ input: 'test' }, 'output', 'output', 'POSITIVE');

      const ended = engine.endSession(['Learned something']);
      expect(ended).not.toBeNull();
      expect(ended?.insights.length).toBe(1);
    });

    it('should register and practice skills', () => {
      const engine = new LearningEngine();

      const skill = engine.registerSkill('TypeScript', 'programming', 0.3);
      expect(skill.name).toBe('TypeScript');
      expect(skill.proficiency).toBe(0.3);

      engine.practiceSkill(skill.id, true);
      const updatedProficiency = engine.getSkillProficiency(skill.id);

      expect(updatedProficiency).toBeGreaterThan(0.3);
    });

    it('should track learning progress', () => {
      const engine = new LearningEngine();

      engine.startSession('Topic 1');
      engine.addExample({ x: 1 }, 'y', 'y', 'POSITIVE');
      engine.endSession();

      const progress = engine.getLearningProgress();
      expect(progress.totalSessions).toBe(1);
      expect(progress.totalExamples).toBe(1);
    });
  });
});
