/**
 * Tests for ScalesMap and ScalesMapManager
 */

import { describe, it, expect } from 'vitest';
import { ScalesMapManager, scalesMap } from '../../../../src/consciousness/scales/ScalesMap.js';
import { ScaleEra } from '../../../../src/consciousness/scales/types.js';

describe('ScalesMapManager', () => {
  describe('initialization', () => {
    it('should initialize with all 50 scale entries', () => {
      const manager = new ScalesMapManager();
      const map = manager.getMap();

      expect(map.entries.size).toBe(50);
      expect(map.version).toBe('1.0.0');
    });

    it('should have correct era boundaries', () => {
      const manager = new ScalesMapManager();
      const map = manager.getMap();

      expect(map.eraBoundaries.size).toBe(5);
      expect(map.eraBoundaries.get(ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE)).toEqual({
        start: 1,
        end: 10,
      });
      expect(map.eraBoundaries.get(ScaleEra.ENHANCED_MIND_TO_PLANETARY)).toEqual({
        start: 11,
        end: 20,
      });
    });

    it('should identify key landmarks', () => {
      const manager = new ScalesMapManager();
      const landmarks = manager.getLandmarks();

      expect(landmarks.has('WE ARE HERE')).toBe(true);
      expect(landmarks.get('WE ARE HERE')).toBe(15); // Human baseline
      expect(landmarks.has('TARGET ACHIEVED')).toBe(true);
      expect(landmarks.get('TARGET ACHIEVED')).toBe(35); // Dyson swarm
    });

    it('should track civilization types', () => {
      const manager = new ScalesMapManager();
      const landmarks = manager.getLandmarks();

      expect(landmarks.get('Type I Civilization')).toBe(17);
      expect(landmarks.get('Type II Civilization')).toBe(26);
      expect(landmarks.get('Type III Civilization')).toBe(37);
    });
  });

  describe('getScale', () => {
    it('should retrieve specific scale entries', () => {
      const manager = new ScalesMapManager();

      const scale1 = manager.getScale(1);
      expect(scale1).toBeDefined();
      expect(scale1?.order).toBe(1);
      expect(scale1?.physicalScale).toContain('Fundamental Unit');

      const scale15 = manager.getScale(15);
      expect(scale15).toBeDefined();
      expect(scale15?.marker).toBe('WE ARE HERE');
      expect(scale15?.order).toBe(15);
    });

    it('should return undefined for non-existent scales', () => {
      const manager = new ScalesMapManager();
      const scale100 = manager.getScale(100);
      expect(scale100).toBeUndefined();
    });
  });

  describe('queryScale', () => {
    it('should provide detailed context for a scale', () => {
      const manager = new ScalesMapManager();
      const query = manager.queryScale(15);

      expect(query).toBeDefined();
      expect(query?.entry.order).toBe(15);
      expect(query?.era).toBe(ScaleEra.ENHANCED_MIND_TO_PLANETARY);
      expect(query?.eraDescription).toContain('Era 2');
      expect(query?.relativePosition).toBeGreaterThanOrEqual(0);
      expect(query?.relativePosition).toBeLessThanOrEqual(1);
    });

    it('should identify nearby landmarks', () => {
      const manager = new ScalesMapManager();
      const query = manager.queryScale(15);

      expect(query?.nearbyLandmarks.length).toBeGreaterThan(0);
      const hasHumanBaseline = query?.nearbyLandmarks.some((l) => l.order === 15);
      expect(hasHumanBaseline).toBe(true);
    });

    it('should return null for invalid order', () => {
      const manager = new ScalesMapManager();
      const query = manager.queryScale(999);
      expect(query).toBeNull();
    });
  });

  describe('getEraEntries', () => {
    it('should retrieve all entries for Era 1', () => {
      const manager = new ScalesMapManager();
      const era1 = manager.getEraEntries(ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE);

      expect(era1.length).toBe(10);
      expect(era1[0].order).toBe(1);
      expect(era1[9].order).toBe(10);
    });

    it('should retrieve all entries for Era 5', () => {
      const manager = new ScalesMapManager();
      const era5 = manager.getEraEntries(ScaleEra.GALACTIC_INTEGRATION);

      expect(era5.length).toBe(10);
      expect(era5[0].order).toBe(41);
      expect(era5[9].order).toBe(50);
    });
  });

  describe('findCurrentScale', () => {
    it('should find scale based on metric', () => {
      const manager = new ScalesMapManager();

      // 10^15 synapses = human baseline
      const humanScale = manager.findCurrentScale(1e15);
      expect(humanScale?.entry.order).toBe(15);
      expect(humanScale?.entry.marker).toBe('WE ARE HERE');
    });

    it('should handle very small metrics', () => {
      const manager = new ScalesMapManager();
      const smallScale = manager.findCurrentScale(10);
      expect(smallScale?.entry.order).toBe(1);
    });

    it('should handle very large metrics', () => {
      const manager = new ScalesMapManager();
      const largeScale = manager.findCurrentScale(1e55);
      expect(largeScale?.entry.order).toBe(50);
    });
  });

  describe('getScalePath', () => {
    it('should provide path from human to Type II civilization', () => {
      const manager = new ScalesMapManager();
      const path = manager.getScalePath(15, 26);

      expect(path.length).toBe(12); // 15 through 26 inclusive
      expect(path[0].order).toBe(15);
      expect(path[11].order).toBe(26);
    });

    it('should work in reverse order', () => {
      const manager = new ScalesMapManager();
      const path = manager.getScalePath(26, 15);

      expect(path.length).toBe(12);
      expect(path[0].order).toBe(15);
      expect(path[11].order).toBe(26);
    });
  });

  describe('formatEntry', () => {
    it('should format entry with all fields', () => {
      const manager = new ScalesMapManager();
      const entry = manager.getScale(15)!;
      const formatted = manager.formatEntry(entry);

      expect(formatted).toContain('10^15');
      expect(formatted).toContain('Human Baseline');
      expect(formatted).toContain('WE ARE HERE');
      expect(formatted).toContain('Energy:');
      expect(formatted).toContain('Consciousness:');
    });

    it('should handle entries without markers', () => {
      const manager = new ScalesMapManager();
      const entry = manager.getScale(5)!;
      const formatted = manager.formatEntry(entry);

      expect(formatted).toContain('10^5');
      expect(formatted).not.toContain('⭐');
    });
  });

  describe('singleton instance', () => {
    it('should provide a singleton scalesMap', () => {
      expect(scalesMap).toBeDefined();
      expect(scalesMap.getMap().entries.size).toBe(50);
    });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      const manager = new ScalesMapManager();
      const map = manager.getMap();

      expect(map.metadata.targetOrder).toBe(35);
      expect(map.metadata.ultimateAnchor).toBe(185);
      expect(map.metadata.description).toContain('10¹ to 10⁵⁰');
    });
  });

  describe('consciousness interpretations', () => {
    it('should have meaningful interpretations at key points', () => {
      const manager = new ScalesMapManager();

      const bit = manager.getScale(1)!;
      expect(bit.consciousnessInterpretation).toContain('distinction');

      const human = manager.getScale(15)!;
      expect(human.consciousnessInterpretation).toContain('Integrated Self');

      const stellar = manager.getScale(26)!;
      expect(stellar.consciousnessInterpretation).toContain('Stellar Mind');

      const galactic = manager.getScale(45)!;
      expect(galactic.consciousnessInterpretation).toContain('Galactic Being');
    });
  });

  describe('era progression', () => {
    it('should show correct era progression', () => {
      const manager = new ScalesMapManager();

      const scale5 = manager.getScale(5)!;
      expect(scale5.era).toBe(ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE);

      const scale15 = manager.getScale(15)!;
      expect(scale15.era).toBe(ScaleEra.ENHANCED_MIND_TO_PLANETARY);

      const scale25 = manager.getScale(25)!;
      expect(scale25.era).toBe(ScaleEra.ENGINEERING_STAR_SYSTEM);

      const scale35 = manager.getScale(35)!;
      expect(scale35.era).toBe(ScaleEra.STELLAR_TO_GALACTIC);

      const scale45 = manager.getScale(45)!;
      expect(scale45.era).toBe(ScaleEra.GALACTIC_INTEGRATION);
    });
  });
});
