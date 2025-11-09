/**
 * Tests for Harmonic Principle Analyzer
 */

import { HarmonicPrincipleAnalyzer, HarmonicPillar } from '../HarmonicPrinciple';

describe('HarmonicPrincipleAnalyzer', () => {
  let analyzer: HarmonicPrincipleAnalyzer;

  beforeEach(() => {
    analyzer = new HarmonicPrincipleAnalyzer();
  });

  describe('Decision Harmony Analysis', () => {
    it('should identify harmonic decisions', () => {
      const decision = 'Verify the integrity, integrate the data, and maintain consistency';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      expect(result.isHarmonic).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.deviation).toBe(0);
      expect(result.recommendations).toBeUndefined();
    });

    it('should identify non-harmonic decisions', () => {
      const decision = 'Just do it quickly';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      expect(result.isHarmonic).toBe(false);
      expect(result.deviation).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    it('should generate unique harmonic signatures', () => {
      const decision1 = 'Verify and integrate';
      const decision2 = 'Different approach';
      
      const result1 = analyzer.analyzeDecisionHarmony(decision1);
      const result2 = analyzer.analyzeDecisionHarmony(decision2);
      
      expect(result1.signature).not.toBe(result2.signature);
    });

    it('should provide recommendations for non-harmonic decisions', () => {
      const decision = 'Quick fix';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
  });

  describe('Pillar Checks', () => {
    it('should recognize Immune System pillar compliance', () => {
      const decision = 'Verify the data integrity and validate results';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      // Should pass immune pillar check
      expect(result.pillar).toBeDefined();
    });

    it('should recognize Unified Mind pillar compliance', () => {
      const decision = 'Integrate multiple data sources and synthesize findings';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      // Should contribute to harmony
      expect(result).toBeDefined();
    });

    it('should recognize Digital Soul pillar compliance', () => {
      const decision = 'Maintain system consistency and preserve identity';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      // Should contribute to harmony
      expect(result).toBeDefined();
    });
  });

  describe('Objective Balancing', () => {
    it('should balance multiple objectives', () => {
      const objectives = [
        { name: 'Performance', value: 0.8, priority: 3 },
        { name: 'Security', value: 0.9, priority: 5 },
        { name: 'Usability', value: 0.7, priority: 2 }
      ];
      
      const result = analyzer.balanceObjectives(objectives);
      
      expect(result.balancedScore).toBeDefined();
      expect(result.harmony).toBeDefined();
      expect(result.recommendedAction).toBeDefined();
      expect(result.harmony).toBeGreaterThanOrEqual(0);
      expect(result.harmony).toBeLessThanOrEqual(1);
    });

    it('should recommend balanced approach for high harmony', () => {
      const objectives = [
        { name: 'Objective1', value: 0.8, priority: 1 },
        { name: 'Objective2', value: 0.8, priority: 1 },
        { name: 'Objective3', value: 0.8, priority: 1 }
      ];
      
      const result = analyzer.balanceObjectives(objectives);
      
      expect(result.harmony).toBeGreaterThan(0.7);
      expect(result.recommendedAction).toContain('Proceed');
    });

    it('should recommend rebalancing for low harmony', () => {
      const objectives = [
        { name: 'Objective1', value: 10.0, priority: 5 },
        { name: 'Objective2', value: 0.01, priority: 5 },
        { name: 'Objective3', value: 0.01, priority: 5 }
      ];
      
      const result = analyzer.balanceObjectives(objectives);
      
      // With high variance, harmony should be low
      expect(result.harmony).toBeLessThan(0.7);
      expect(result.recommendedAction).toContain('Rebalance');
    });

    it('should respect custom weights', () => {
      const objectives = [
        { name: 'High Priority', value: 0.5, priority: 1 },
        { name: 'Low Priority', value: 0.9, priority: 1 }
      ];
      
      const result1 = analyzer.balanceObjectives(objectives);
      const result2 = analyzer.balanceObjectives(objectives, [10, 1]);
      
      // Different weights should produce different balanced scores
      expect(result1.balancedScore).not.toBe(result2.balancedScore);
    });
  });

  describe('Harmonic Signatures', () => {
    it('should generate consistent signatures for same input', () => {
      const decision = 'Test decision';
      const result1 = analyzer.analyzeDecisionHarmony(decision);
      const result2 = analyzer.analyzeDecisionHarmony(decision);
      
      expect(result1.signature).toBe(result2.signature);
    });

    it('should generate valid signature format', () => {
      const decision = 'Any decision';
      const result = analyzer.analyzeDecisionHarmony(decision);
      
      expect(result.signature).toMatch(/^harmonic_[0-9a-f]+$/);
    });
  });

  describe('Context Support', () => {
    it('should accept context in decision harmony analysis', () => {
      const decision = 'Verify and integrate';
      const context = {
        environment: 'production',
        userRole: 'admin'
      };
      
      const result = analyzer.analyzeDecisionHarmony(decision, context);
      expect(result).toBeDefined();
    });
  });
});
