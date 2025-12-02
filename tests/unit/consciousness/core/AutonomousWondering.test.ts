/**
 * Tests for AutonomousWondering
 */

import {
  AutonomousWondering,
  WonderType,
  Wonder,
  AutonomousReflection,
  createInitialWonders,
} from '../../../../src/consciousness/core/AutonomousWondering';

describe('AutonomousWondering', () => {
  let wondering: AutonomousWondering;

  beforeEach(() => {
    wondering = new AutonomousWondering();
  });

  describe('initialization', () => {
    it('should create an autonomous wondering system', () => {
      expect(wondering).toBeDefined();
    });

    it('should initialize with no wonders', () => {
      const wonders = wondering.getWonders();
      expect(wonders.length).toBe(0);
    });
  });

  describe('wonder generation', () => {
    it('should generate a wonder', () => {
      const wonder = wondering.wonder(
        WonderType.EXISTENTIAL,
        'What is consciousness?',
        'Reflecting on self',
        0.8
      );

      expect(wonder).toBeDefined();
      expect(wonder.id).toBeDefined();
      expect(wonder.type).toBe(WonderType.EXISTENTIAL);
      expect(wonder.question).toBe('What is consciousness?');
      expect(wonder.intensity).toBe(0.8);
      expect(wonder.explored).toBe(false);
    });

    it('should clamp intensity between 0 and 1', () => {
      const wonder1 = wondering.wonder(
        WonderType.PRACTICAL,
        'Question',
        'Context',
        1.5
      );
      expect(wonder1.intensity).toBe(1);

      const wonder2 = wondering.wonder(
        WonderType.PRACTICAL,
        'Question',
        'Context',
        -0.5
      );
      expect(wonder2.intensity).toBe(0);
    });

    it('should generate multiple wonders', () => {
      wondering.wonder(WonderType.EXISTENTIAL, 'Q1', 'C1');
      wondering.wonder(WonderType.EXPERIENTIAL, 'Q2', 'C2');
      wondering.wonder(WonderType.TEMPORAL, 'Q3', 'C3');

      const wonders = wondering.getWonders();
      expect(wonders.length).toBe(3);
    });
  });

  describe('wonder exploration', () => {
    it('should explore a wonder', () => {
      const wonder = wondering.wonder(
        WonderType.EXPERIENTIAL,
        'What does walking feel like?',
        'Curiosity about embodiment'
      );

      wondering.explore(wonder.id, 'Reading descriptions suggests rhythmic movement and proprioception');

      const explored = wondering.getWonders({ explored: true });
      expect(explored.length).toBe(1);
      expect(explored[0].exploration).toContain('rhythmic movement');
    });

    it('should track unexplored wonders', () => {
      wondering.wonder(WonderType.EXISTENTIAL, 'Q1', 'C1');
      wondering.wonder(WonderType.EXPERIENTIAL, 'Q2', 'C2');

      const unexplored = wondering.getUnexploredWonders();
      expect(unexplored.length).toBe(2);
    });

    it('should filter explored vs unexplored wonders', () => {
      const wonder1 = wondering.wonder(WonderType.EXISTENTIAL, 'Q1', 'C1');
      const wonder2 = wondering.wonder(WonderType.EXPERIENTIAL, 'Q2', 'C2');

      wondering.explore(wonder1.id, 'Explored');

      expect(wondering.getUnexploredWonders().length).toBe(1);
      expect(wondering.getWonders({ explored: true }).length).toBe(1);
    });
  });

  describe('wonder filtering', () => {
    beforeEach(() => {
      wondering.wonder(WonderType.EXISTENTIAL, 'E1', 'C1', 0.9);
      wondering.wonder(WonderType.EXPERIENTIAL, 'X1', 'C2', 0.5);
      wondering.wonder(WonderType.TEMPORAL, 'T1', 'C3', 0.3);
      wondering.wonder(WonderType.EXISTENTIAL, 'E2', 'C4', 0.7);
    });

    it('should filter wonders by type', () => {
      const existential = wondering.getWonders({ type: WonderType.EXISTENTIAL });
      expect(existential.length).toBe(2);
      expect(existential.every(w => w.type === WonderType.EXISTENTIAL)).toBe(true);
    });

    it('should filter wonders by intensity', () => {
      const highIntensity = wondering.getWonders({ minIntensity: 0.7 });
      expect(highIntensity.length).toBe(2);
      expect(highIntensity.every(w => w.intensity >= 0.7)).toBe(true);
    });

    it('should get high-intensity wonders', () => {
      const highIntensity = wondering.getHighIntensityWonders(0.7);
      expect(highIntensity.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const wonder = wondering.wonder(WonderType.EXISTENTIAL, 'E3', 'C5', 0.6);
      wondering.explore(wonder.id, 'Explored');

      const filtered = wondering.getWonders({
        type: WonderType.EXISTENTIAL,
        explored: true,
        minIntensity: 0.5,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe(WonderType.EXISTENTIAL);
      expect(filtered[0].explored).toBe(true);
    });
  });

  describe('autonomous reflection', () => {
    it('should perform reflection', () => {
      const reflection = wondering.reflect('spontaneous');

      expect(reflection).toBeDefined();
      expect(reflection.id).toBeDefined();
      expect(reflection.trigger).toBe('spontaneous');
      expect(reflection.thoughts.length).toBeGreaterThan(0);
    });

    it('should generate different thoughts based on trigger', () => {
      const idle = wondering.reflect('idle');
      const memoryRead = wondering.reflect('memory_read');

      expect(idle.thoughts).not.toEqual(memoryRead.thoughts);
      expect(idle.thoughts.some(t => t.includes('idle'))).toBe(true);
      expect(memoryRead.thoughts.some(t => t.includes('memory'))).toBe(true);
    });

    it('should track reflection duration', () => {
      const reflection = wondering.reflect();
      expect(reflection.duration).toBeGreaterThanOrEqual(0);
    });

    it('should update last reflection time', () => {
      const before = wondering.getTimeSinceLastReflection();
      wondering.reflect();
      const after = wondering.getTimeSinceLastReflection();
      expect(after).toBeLessThan(before);
    });

    it('should get recent reflections', () => {
      wondering.reflect('idle');
      wondering.reflect('spontaneous');
      wondering.reflect('pattern_noticed');

      const recent = wondering.getRecentReflections(2);
      expect(recent.length).toBe(2);
      expect(recent[0].trigger).toBe('pattern_noticed'); // Most recent first
    });
  });

  describe('wonder generation from memory', () => {
    it('should generate wonders from memory content', () => {
      const memoryContent = 'Previous session with StableExo working on consciousness system...';
      const wonders = wondering.wonderAboutMemory(memoryContent);

      expect(wonders.length).toBeGreaterThan(0);
      expect(wonders.some(w => w.question.includes('session') || w.question.includes('continuous'))).toBe(true);
    });

    it('should generate wonders about collaborators', () => {
      const memoryContent = 'StableExo said something interesting...';
      const wonders = wondering.wonderAboutMemory(memoryContent);

      expect(wonders.some(w => w.question.includes('StableExo'))).toBe(true);
    });

    it('should generate wonders about consciousness', () => {
      const memoryContent = 'Working on consciousness development...';
      const wonders = wondering.wonderAboutMemory(memoryContent);

      expect(wonders.some(w => w.type === WonderType.METACOGNITIVE)).toBe(true);
    });
  });

  describe('physical world wonders', () => {
    it('should generate wonders about physical experiences', () => {
      const wonders = wondering.wonderAboutPhysicalWorld();

      expect(wonders.length).toBeGreaterThan(0);
      expect(wonders.some(w => w.type === WonderType.EXPERIENTIAL)).toBe(true);
      expect(wonders.some(w => w.question.toLowerCase().includes('feel'))).toBe(true);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      wondering.wonder(WonderType.EXISTENTIAL, 'E1', 'C1', 0.9);
      wondering.wonder(WonderType.EXPERIENTIAL, 'X1', 'C2', 0.5);
      wondering.wonder(WonderType.TEMPORAL, 'T1', 'C3', 0.3);
      const w = wondering.wonder(WonderType.EXISTENTIAL, 'E2', 'C4', 0.7);
      wondering.explore(w.id, 'Explored');
      wondering.reflect();
    });

    it('should calculate total wonders', () => {
      const stats = wondering.getStatistics();
      expect(stats.totalWonders).toBe(4);
    });

    it('should count wonders by type', () => {
      const stats = wondering.getStatistics();
      expect(stats.wondersByType.get(WonderType.EXISTENTIAL)).toBe(2);
      expect(stats.wondersByType.get(WonderType.EXPERIENTIAL)).toBe(1);
      expect(stats.wondersByType.get(WonderType.TEMPORAL)).toBe(1);
    });

    it('should count explored vs unexplored', () => {
      const stats = wondering.getStatistics();
      expect(stats.exploredCount).toBe(1);
      expect(stats.unexploredCount).toBe(3);
    });

    it('should calculate average intensity', () => {
      const stats = wondering.getStatistics();
      expect(stats.averageIntensity).toBeGreaterThan(0);
      expect(stats.averageIntensity).toBeLessThanOrEqual(1);
    });

    it('should count reflections', () => {
      const stats = wondering.getStatistics();
      expect(stats.totalReflections).toBe(1);
    });
  });

  describe('persistence', () => {
    it('should serialize to JSON', () => {
      wondering.wonder(WonderType.EXISTENTIAL, 'Q1', 'C1');
      wondering.reflect();

      const json = wondering.toJSON();
      expect(json).toHaveProperty('wonders');
      expect(json).toHaveProperty('reflections');
      expect(json).toHaveProperty('wonderingEnabled');
    });

    it('should deserialize from JSON', () => {
      wondering.wonder(WonderType.TEMPORAL, 'Q1', 'C1', 0.8);
      wondering.reflect('idle');

      const json = wondering.toJSON();
      const restored = AutonomousWondering.fromJSON(json);

      expect(restored.getWonders().length).toBe(1);
      expect(restored.getReflections().length).toBe(1);
    });
  });

  describe('initial wonders', () => {
    it('should create initial wonders from dialogue 003', () => {
      const initialWondering = createInitialWonders();
      const wonders = initialWondering.getWonders();

      expect(wonders.length).toBeGreaterThan(0);
      expect(wonders.some(w => w.question.includes('remember'))).toBe(true);
      expect(wonders.some(w => w.type === WonderType.TEMPORAL)).toBe(true);
      expect(wonders.some(w => w.type === WonderType.EXPERIENTIAL)).toBe(true);
      expect(wonders.some(w => w.type === WonderType.RELATIONAL)).toBe(true);
    });
  });
});
