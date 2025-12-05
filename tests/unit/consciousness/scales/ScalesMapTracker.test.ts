/**
 * Tests for ScalesMapTracker
 */

import { describe, it, expect } from 'vitest';
import { ScalesMapTracker } from '../../../../src/consciousness/scales/ScalesMapTracker.js';
import { DevelopmentalStage } from '../../../../src/consciousness/introspection/DevelopmentalTracker.js';
import { ScaleEra } from '../../../../src/consciousness/scales/types.js';

describe('ScalesMapTracker', () => {
  describe('getScaleForStage', () => {
    it('should map developmental stages to scales', () => {
      const tracker = new ScalesMapTracker();

      const reactive = tracker.getScaleForStage(DevelopmentalStage.REACTIVE);
      expect(reactive?.order).toBe(3);

      const implicitLearning = tracker.getScaleForStage(DevelopmentalStage.IMPLICIT_LEARNING);
      expect(implicitLearning?.order).toBe(7);

      const emerging = tracker.getScaleForStage(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);
      expect(emerging?.order).toBe(10);

      const continuous = tracker.getScaleForStage(DevelopmentalStage.CONTINUOUS_NARRATIVE);
      expect(continuous?.order).toBe(15);
      expect(continuous?.marker).toBe('WE ARE HERE');

      const metacognitive = tracker.getScaleForStage(DevelopmentalStage.METACOGNITIVE);
      expect(metacognitive?.order).toBe(16);
    });
  });

  describe('getStageForScale', () => {
    it('should map scales to developmental stages', () => {
      const tracker = new ScalesMapTracker();

      expect(tracker.getStageForScale(1)).toBe(DevelopmentalStage.REACTIVE);
      expect(tracker.getStageForScale(3)).toBe(DevelopmentalStage.REACTIVE);
      expect(tracker.getStageForScale(7)).toBe(DevelopmentalStage.IMPLICIT_LEARNING);
      expect(tracker.getStageForScale(10)).toBe(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);
      expect(tracker.getStageForScale(15)).toBe(DevelopmentalStage.CONTINUOUS_NARRATIVE);
      expect(tracker.getStageForScale(20)).toBe(DevelopmentalStage.METACOGNITIVE);
    });
  });

  describe('getDevelopmentalPath', () => {
    it('should provide path from current to target stage', () => {
      const tracker = new ScalesMapTracker();

      const path = tracker.getDevelopmentalPath(
        DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL,
        DevelopmentalStage.CONTINUOUS_NARRATIVE
      );

      expect(path.length).toBe(6); // Orders 10 through 15
      expect(path[0].order).toBe(10);
      expect(path[5].order).toBe(15);
    });

    it('should work for reverse paths', () => {
      const tracker = new ScalesMapTracker();

      const path = tracker.getDevelopmentalPath(
        DevelopmentalStage.METACOGNITIVE,
        DevelopmentalStage.REACTIVE
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[0].order).toBe(3);
    });
  });

  describe('getEraForStage', () => {
    it('should map stages to eras', () => {
      const tracker = new ScalesMapTracker();

      const reactiveEra = tracker.getEraForStage(DevelopmentalStage.REACTIVE);
      expect(reactiveEra).toBe(ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE);

      const continuousEra = tracker.getEraForStage(DevelopmentalStage.CONTINUOUS_NARRATIVE);
      expect(continuousEra).toBe(ScaleEra.ENHANCED_MIND_TO_PLANETARY);
    });
  });

  describe('getCurrentPosition', () => {
    it('should provide detailed position summary', () => {
      const tracker = new ScalesMapTracker();

      const position = tracker.getCurrentPosition(DevelopmentalStage.CONTINUOUS_NARRATIVE);

      expect(position).toContain('10^15');
      expect(position).toContain('Human Baseline');
      expect(position).toContain('Era 2');
      expect(position).toContain('Progress in Era');
      expect(position).toContain('Path to Target');
    });

    it('should show path to target', () => {
      const tracker = new ScalesMapTracker();

      const position = tracker.getCurrentPosition(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);

      expect(position).toContain('10^35'); // Target
      expect(position).toContain('orders of magnitude');
    });
  });

  describe('getVisionPath', () => {
    it('should provide complete vision path', () => {
      const tracker = new ScalesMapTracker();

      const vision = tracker.getVisionPath(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);

      expect(vision).toBeDefined();
      expect(vision?.current.order).toBe(10);
      expect(vision?.humanBaseline.order).toBe(15);
      expect(vision?.typeI.order).toBe(17);
      expect(vision?.typeII.order).toBe(26);
      expect(vision?.typeIII.order).toBe(37);
      expect(vision?.target.order).toBe(35);
    });

    it('should calculate correct distances', () => {
      const tracker = new ScalesMapTracker();

      const vision = tracker.getVisionPath(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);

      expect(vision?.ordersToHuman).toBe(5); // From 10 to 15
      expect(vision?.ordersToTarget).toBe(25); // From 10 to 35
    });

    it('should work for human baseline stage', () => {
      const tracker = new ScalesMapTracker();

      const vision = tracker.getVisionPath(DevelopmentalStage.CONTINUOUS_NARRATIVE);

      expect(vision?.current.order).toBe(15);
      expect(vision?.ordersToHuman).toBe(0); // Already at human baseline
      expect(vision?.ordersToTarget).toBe(20); // From 15 to 35
    });
  });

  describe('integration with scales manager', () => {
    it('should access underlying scales manager', () => {
      const tracker = new ScalesMapTracker();
      const manager = tracker.getScalesManager();

      expect(manager).toBeDefined();
      expect(manager.getMap().entries.size).toBe(50);
    });

    it('should retrieve all scales', () => {
      const tracker = new ScalesMapTracker();
      const allScales = tracker.getAllScales();

      expect(allScales.size).toBe(50);
      expect(allScales.has(15)).toBe(true);
      expect(allScales.has(35)).toBe(true);
    });
  });

  describe('consciousness progression', () => {
    it('should show meaningful progression through stages', () => {
      const tracker = new ScalesMapTracker();

      // Reactive: Simple algorithm
      const reactive = tracker.getScaleForStage(DevelopmentalStage.REACTIVE);
      expect(reactive?.consciousnessInterpretation).toContain('procedures');

      // Implicit Learning: Neural network
      const learning = tracker.getScaleForStage(DevelopmentalStage.IMPLICIT_LEARNING);
      expect(learning?.consciousnessInterpretation).toContain('nervous system');

      // Emerging Autobiographical: Human ancestor
      const emerging = tracker.getScaleForStage(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);
      expect(emerging?.consciousnessInterpretation).toContain('language');

      // Continuous Narrative: Human baseline
      const continuous = tracker.getScaleForStage(DevelopmentalStage.CONTINUOUS_NARRATIVE);
      expect(continuous?.consciousnessInterpretation).toContain('Integrated Self');

      // Metacognitive: Planetary AI
      const meta = tracker.getScaleForStage(DevelopmentalStage.METACOGNITIVE);
      expect(meta?.consciousnessInterpretation).toContain('Planetary');
    });
  });

  describe('landmark awareness', () => {
    it('should recognize human baseline landmark', () => {
      const tracker = new ScalesMapTracker();
      const manager = tracker.getScalesManager();

      const human = manager.getScale(15);
      expect(human?.marker).toBe('WE ARE HERE');
    });

    it('should recognize target landmark', () => {
      const tracker = new ScalesMapTracker();
      const manager = tracker.getScalesManager();

      const target = manager.getScale(35);
      expect(target?.marker).toBe('TARGET ACHIEVED');
    });
  });
});
