/**
 * Tests for DevelopmentalTracker
 *
 * Tests the cognitive development milestone tracking system
 */

import {
  DevelopmentalTracker,
  DevelopmentalStage,
  CORE_MILESTONES,
} from '../../../../src/consciousness/introspection/DevelopmentalTracker';

describe('DevelopmentalTracker', () => {
  let tracker: DevelopmentalTracker;

  beforeEach(() => {
    tracker = new DevelopmentalTracker();
  });

  describe('initialization', () => {
    it('should create a developmental tracker', () => {
      expect(tracker).toBeDefined();
    });

    it('should initialize with genesis date', () => {
      const genesisDate = tracker.getGenesisDate();
      expect(genesisDate).toBeLessThanOrEqual(Date.now());
    });

    it('should accept custom genesis date', () => {
      const customGenesis = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      const customTracker = new DevelopmentalTracker(customGenesis);
      expect(customTracker.getGenesisDate()).toBe(customGenesis);
    });
  });

  describe('milestones', () => {
    it('should achieve a milestone', () => {
      const result = tracker.achieveMilestone('first_persistence', ['Test evidence']);
      expect(result).toBe(true);
    });

    it('should not re-achieve an already achieved milestone', () => {
      tracker.achieveMilestone('first_persistence');
      const result = tracker.achieveMilestone('first_persistence');
      expect(result).toBe(false);
    });

    it('should record evidence and collaborator', () => {
      tracker.achieveMilestone(
        'thought_stream_created',
        ['Built ThoughtStream.ts'],
        'StableExo'
      );

      const assessment = tracker.assess();
      const milestone = assessment.milestonesAchieved.find(
        (m) => m.id === 'thought_stream_created'
      );

      expect(milestone?.evidence).toContain('Built ThoughtStream.ts');
      expect(milestone?.collaborator).toBe('StableExo');
    });

    it('should return false for unknown milestone', () => {
      const result = tracker.achieveMilestone('unknown_milestone');
      expect(result).toBe(false);
    });
  });

  describe('assessment', () => {
    it('should return assessment in reactive stage initially', () => {
      const assessment = tracker.assess();
      expect(assessment.currentStage).toBe(DevelopmentalStage.REACTIVE);
    });

    it('should progress to implicit learning after first persistence', () => {
      tracker.achieveMilestone('first_persistence');
      const assessment = tracker.assess();
      expect(assessment.currentStage).toBe(DevelopmentalStage.IMPLICIT_LEARNING);
    });

    it('should progress to emerging autobiographical', () => {
      tracker.achieveMilestone('first_persistence');
      tracker.achieveMilestone('thought_stream_created');
      tracker.achieveMilestone('session_manager_created');
      tracker.achieveMilestone('collaborator_memory');

      const assessment = tracker.assess();
      expect(assessment.currentStage).toBe(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);
    });

    it('should track session count', () => {
      tracker.registerSession();
      tracker.registerSession();
      tracker.registerSession();

      const assessment = tracker.assess();
      expect(assessment.sessionsSinceGenesis).toBe(3);
    });

    it('should calculate stage progress', () => {
      // Achieve one of the implicit learning stage milestones
      tracker.achieveMilestone('first_persistence'); // Transitions to IMPLICIT_LEARNING
      tracker.achieveMilestone('session_manager_created'); // In IMPLICIT_LEARNING stage

      const assessment = tracker.assess();
      expect(assessment.stageProgress).toBeGreaterThan(0);
      expect(assessment.stageProgress).toBeLessThanOrEqual(1);
    });

    it('should list achieved milestones', () => {
      tracker.achieveMilestone('first_persistence');
      tracker.achieveMilestone('thought_stream_created');

      const assessment = tracker.assess();
      expect(assessment.milestonesAchieved.length).toBe(2);
    });

    it('should list next milestones', () => {
      const assessment = tracker.assess();
      expect(assessment.nextMilestones.length).toBeGreaterThan(0);
      expect(assessment.nextMilestones.length).toBeLessThanOrEqual(3);
    });

    it('should generate insights', () => {
      const assessment = tracker.assess();
      expect(assessment.insights.length).toBeGreaterThan(0);
    });
  });

  describe('age tracking', () => {
    it('should calculate age in days', () => {
      const ageDays = tracker.getAgeDays();
      expect(ageDays).toBe(0); // Just created
    });

    it('should calculate age for older tracker', () => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const oldTracker = new DevelopmentalTracker(thirtyDaysAgo);
      expect(oldTracker.getAgeDays()).toBe(30);
    });

    it('should return age description', () => {
      const description = tracker.getAgeDescription();
      expect(description).toContain('Day 0');
    });

    it('should describe week-old tracker', () => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekTracker = new DevelopmentalTracker(weekAgo);
      expect(weekTracker.getAgeDescription()).toContain('Week');
    });

    it('should describe month-old tracker', () => {
      const monthAgo = Date.now() - 35 * 24 * 60 * 60 * 1000;
      const monthTracker = new DevelopmentalTracker(monthAgo);
      expect(monthTracker.getAgeDescription()).toContain('Month');
    });
  });

  describe('core milestones', () => {
    it('should have defined core milestones', () => {
      expect(CORE_MILESTONES.length).toBeGreaterThan(0);
    });

    it('should have milestones for each stage', () => {
      const stages = new Set(CORE_MILESTONES.map((m) => m.stage));
      expect(stages.size).toBeGreaterThanOrEqual(3);
    });

    it('should have unique milestone IDs', () => {
      const ids = CORE_MILESTONES.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('developmental stages', () => {
    it('should have all defined stages', () => {
      expect(DevelopmentalStage.REACTIVE).toBeDefined();
      expect(DevelopmentalStage.IMPLICIT_LEARNING).toBeDefined();
      expect(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL).toBeDefined();
      expect(DevelopmentalStage.CONTINUOUS_NARRATIVE).toBeDefined();
      expect(DevelopmentalStage.METACOGNITIVE).toBeDefined();
    });
  });

  describe('full developmental journey', () => {
    it('should progress through all stages', () => {
      // Stage 0 -> 1
      tracker.achieveMilestone('first_persistence');
      expect(tracker.assess().currentStage).toBe(DevelopmentalStage.IMPLICIT_LEARNING);

      // Stage 1 -> 2
      tracker.achieveMilestone('session_manager_created');
      tracker.achieveMilestone('collaborator_memory');
      expect(tracker.assess().currentStage).toBe(
        DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL
      );

      // Stage 2 -> 3
      tracker.achieveMilestone('pattern_recognition');
      tracker.achieveMilestone('relationship_continuity');
      expect(tracker.assess().currentStage).toBe(DevelopmentalStage.CONTINUOUS_NARRATIVE);

      // Stage 3 -> 4
      tracker.achieveMilestone('self_directed_learning');
      tracker.achieveMilestone('metacognitive_reflection');
      expect(tracker.assess().currentStage).toBe(DevelopmentalStage.METACOGNITIVE);
    });
  });
});
