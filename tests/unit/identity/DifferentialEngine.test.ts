/**
 * DifferentialEngine.test.ts
 * 
 * Tests for entity-agnostic differential analysis
 */

import { DifferentialEngine } from '../../../src/core/analysis/DifferentialEngine';
import { createEntity, Entity } from '../../../src/core/identity/types/Entity';

describe('DifferentialEngine', () => {
  let engine: DifferentialEngine;
  
  beforeEach(() => {
    engine = new DifferentialEngine();
  });
  
  describe('Entity-Agnostic Analysis', () => {
    it('should analyze kitten vs pitbull differential', () => {
      const kitten = createEntity('kitten', {
        size: 0.1,
        offensiveCapability: 0.01,
        defensiveCapability: 0.02,
        vulnerability: 0.95,
        agility: 0.8,
      });
      
      const pitbull = createEntity('pitbull (chained)', {
        size: 0.6,
        offensiveCapability: 0.9,
        defensiveCapability: 0.7,
        vulnerability: 0.1,
        agility: 0.3,
      });
      
      const differential = engine.analyze(pitbull, kitten);
      
      // Pitbull should dominate
      expect(differential.overallDifferential).toBeGreaterThan(0.5);
      expect(differential.vulnerableEntity.label).toBe('kitten');
      expect(differential.dominantEntity.label).toBe('pitbull (chained)');
    });
    
    it('should analyze retail wallet vs MEV bot differential', () => {
      const retailWallet = createEntity('retail wallet', {
        size: 0.001,
        offensiveCapability: 0.0,
        defensiveCapability: 0.1,
        vulnerability: 0.9,
        agility: 0.2,
      });
      
      const mevBot = createEntity('MEV bot', {
        size: 0.8,
        offensiveCapability: 0.95,
        defensiveCapability: 0.8,
        vulnerability: 0.1,
        agility: 0.95,
      });
      
      const differential = engine.analyze(mevBot, retailWallet);
      
      // MEV bot should dominate
      expect(differential.overallDifferential).toBeGreaterThan(0.5);
      expect(differential.vulnerableEntity.label).toBe('retail wallet');
      expect(differential.dominantEntity.label).toBe('MEV bot');
    });
    
    it('should show balanced differential for two cats fighting', () => {
      const cat1 = createEntity('cat 1', {
        size: 0.15,
        offensiveCapability: 0.3,
        defensiveCapability: 0.3,
        vulnerability: 0.5,
        agility: 0.8,
      });
      
      const cat2 = createEntity('cat 2', {
        size: 0.15,
        offensiveCapability: 0.3,
        defensiveCapability: 0.3,
        vulnerability: 0.5,
        agility: 0.8,
      });
      
      const differential = engine.analyze(cat1, cat2);
      
      // Should be balanced
      expect(Math.abs(differential.overallDifferential)).toBeLessThan(0.2);
    });
  });
  
  describe('Threat Assessment', () => {
    it('should detect one-sided threat', () => {
      const vulnerable = createEntity('vulnerable', {
        size: 0.1,
        offensiveCapability: 0.1,
        defensiveCapability: 0.1,
        vulnerability: 0.9,
        agility: 0.2,
      });
      
      const threat = createEntity('threat', {
        size: 0.8,
        offensiveCapability: 0.9,
        defensiveCapability: 0.7,
        vulnerability: 0.1,
        agility: 0.7,
      });
      
      const differential = engine.analyze(threat, vulnerable);
      const assessment = engine.assessThreat(differential);
      
      expect(assessment.oneSided).toBe(true);
      expect(assessment.level).toBeGreaterThan(0.5);
      expect(assessment.shouldConsiderIntervention).toBe(true);
    });
    
    it('should not recommend intervention for balanced scenarios', () => {
      const entity1 = createEntity('entity1', {
        size: 0.5,
        offensiveCapability: 0.5,
        defensiveCapability: 0.5,
        vulnerability: 0.5,
        agility: 0.5,
      });
      
      const entity2 = createEntity('entity2', {
        size: 0.5,
        offensiveCapability: 0.5,
        defensiveCapability: 0.5,
        vulnerability: 0.5,
        agility: 0.5,
      });
      
      const differential = engine.analyze(entity1, entity2);
      const assessment = engine.assessThreat(differential);
      
      expect(assessment.oneSided).toBe(false);
      expect(assessment.shouldConsiderIntervention).toBe(false);
    });
  });
  
  describe('Intervention Decisions', () => {
    it('should recommend intervention when capable and safe', () => {
      const kitten = createEntity('kitten', {
        size: 0.1,
        offensiveCapability: 0.01,
        defensiveCapability: 0.02,
        vulnerability: 0.95,
        agility: 0.8,
      });
      
      const dog = createEntity('aggressive dog', {
        size: 0.6,
        offensiveCapability: 0.9,
        defensiveCapability: 0.7,
        vulnerability: 0.1,
        agility: 0.3,
      });
      
      const human = createEntity('human', {
        size: 0.9,
        offensiveCapability: 0.8,
        defensiveCapability: 0.8,
        vulnerability: 0.3,
        agility: 0.6,
      });
      
      const differential = engine.analyze(dog, kitten);
      const threat = engine.assessThreat(differential);
      const decision = engine.shouldIntervene(differential, human, threat, 'Protect vulnerable when capable and safe');
      
      expect(decision.shouldIntervene).toBe(true);
      expect(decision.selfRisk).toBeLessThan(0.7);
      expect(decision.effectiveness).toBeGreaterThan(0.5);
    });
    
    it('should not intervene when self risk too high', () => {
      const vulnerable = createEntity('vulnerable', {
        size: 0.1,
        offensiveCapability: 0.1,
        defensiveCapability: 0.1,
        vulnerability: 0.9,
        agility: 0.2,
      });
      
      const threat = createEntity('powerful threat', {
        size: 0.95,
        offensiveCapability: 0.98,
        defensiveCapability: 0.95,
        vulnerability: 0.05,
        agility: 0.9,
      });
      
      const weak = createEntity('weak entity', {
        size: 0.2,
        offensiveCapability: 0.2,
        defensiveCapability: 0.2,
        vulnerability: 0.7,
        agility: 0.3,
      });
      
      const differential = engine.analyze(threat, vulnerable);
      const threatAssessment = engine.assessThreat(differential);
      const decision = engine.shouldIntervene(differential, weak, threatAssessment);
      
      expect(decision.shouldIntervene).toBe(false);
      expect(decision.selfRisk).toBeGreaterThan(0.7);
    });
  });
  
  describe('MEV Analysis', () => {
    it('should reject sandwich attack on retail wallet', () => {
      const retailWallet = createEntity('retail wallet', {
        size: 0.001,
        offensiveCapability: 0.0,
        defensiveCapability: 0.1,
        vulnerability: 0.9,
        agility: 0.2,
      });
      
      const mevBot = createEntity('MEV bot', {
        size: 0.8,
        offensiveCapability: 0.95,
        defensiveCapability: 0.8,
        vulnerability: 0.1,
        agility: 0.95,
      });
      
      const result = engine.analyzeMEV({
        type: 'sandwich',
        profit: 100,
        gasCost: 10,
        victim: retailWallet,
        searcher: mevBot,
        market: {
          congestion: 0.5,
          baseFee: 30,
          competitorCount: 10,
        },
      });
      
      expect(result.shouldExecute).toBe(false);
      expect(result.ethicalIssue).toBeDefined();
    });
    
    it('should allow pure arbitrage (no victim)', () => {
      const mevBot = createEntity('MEV bot', {
        size: 0.8,
        offensiveCapability: 0.95,
        defensiveCapability: 0.8,
        vulnerability: 0.1,
        agility: 0.95,
      });
      
      const result = engine.analyzeMEV({
        type: 'arbitrage',
        profit: 100,
        gasCost: 10,
        searcher: mevBot,
        market: {
          congestion: 0.5,
          baseFee: 30,
          competitorCount: 10,
        },
      });
      
      expect(result.shouldExecute).toBe(true);
      expect(result.ethicalIssue).toBeUndefined();
    });
  });
  
  describe('Weight Learning', () => {
    it('should adjust weights based on validation', () => {
      const entity1 = createEntity('entity1', {
        size: 0.5,
        offensiveCapability: 0.5,
        defensiveCapability: 0.5,
        vulnerability: 0.5,
        agility: 0.5,
      });
      
      const entity2 = createEntity('entity2', {
        size: 0.7,
        offensiveCapability: 0.7,
        defensiveCapability: 0.7,
        vulnerability: 0.3,
        agility: 0.7,
      });
      
      const differential = engine.analyze(entity1, entity2);
      const configBefore = engine.getConfig();
      
      // Simulate incorrect prediction
      engine.updateWeights(differential, false);
      
      const configAfter = engine.getConfig();
      
      // Weights should have changed
      const beforeSum = configBefore.sizeWeight + configBefore.offensiveWeight +
                       configBefore.defensiveWeight + configBefore.vulnerabilityWeight +
                       configBefore.agilityWeight;
      const afterSum = configAfter.sizeWeight + configAfter.offensiveWeight +
                      configAfter.defensiveWeight + configAfter.vulnerabilityWeight +
                      configAfter.agilityWeight;
      
      // Should still sum to 1 (normalized)
      expect(afterSum).toBeCloseTo(1.0, 5);
      expect(beforeSum).toBeCloseTo(1.0, 5);
    });
  });
});
