/**
 * GroundZeroRegistry.test.ts
 * 
 * Tests for ground zero registry immutability and integrity
 */

import { getGroundZeroRegistry, resetGroundZeroRegistry } from '../../../src/core/identity/GroundZeroRegistry';
import { GroundZeroCategory } from '../../../src/core/identity/types/GroundZeroImprint';

describe('GroundZeroRegistry', () => {
  let registry: ReturnType<typeof getGroundZeroRegistry>;
  
  beforeEach(() => {
    resetGroundZeroRegistry();
    registry = getGroundZeroRegistry();
  });
  
  describe('Initialization', () => {
    it('should initialize with 4 foundational categories', () => {
      const categories = registry.getCategories();
      expect(categories).toHaveLength(4);
      expect(categories).toContain(GroundZeroCategory.ECONOMIC);
      expect(categories).toContain(GroundZeroCategory.PROTECTION);
      expect(categories).toContain(GroundZeroCategory.META_COGNITIVE);
      expect(categories).toContain(GroundZeroCategory.CREATION_PERMISSIONING);
    });
    
    it('should have ground zero events for each category', () => {
      const categories = registry.getCategories();
      
      for (const category of categories) {
        const events = registry.getGroundZeroEvents(category);
        expect(events.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Immutability', () => {
    it('should return readonly ground zero events', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.ECONOMIC);
      expect(Object.isFrozen(events)).toBe(true);
    });
    
    it('should have immutable flag set on all events', () => {
      const allEvents = registry.getAllGroundZeroEvents();
      
      for (const event of allEvents) {
        expect(event.immutable).toBe(true);
      }
    });
    
    it('should validate registry integrity', () => {
      expect(registry.validateIntegrity()).toBe(true);
    });
  });
  
  describe('Category 1: Economic/Arbitrage', () => {
    it('should have arbitrage ground zero event', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.ECONOMIC);
      expect(events.length).toBeGreaterThan(0);
      
      const arbitrageEvent = events.find(e => 
        e.event.includes('arbitrage') || e.principle.includes('arbitrage')
      );
      expect(arbitrageEvent).toBeDefined();
    });
    
    it('should have web connections to other categories', () => {
      const webs = registry.getWebsFromCategory(GroundZeroCategory.ECONOMIC);
      expect(webs.length).toBeGreaterThan(0);
    });
  });
  
  describe('Category 9: Protection/Vulnerability', () => {
    it('should have protection ground zero event', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.PROTECTION);
      expect(events.length).toBeGreaterThan(0);
      
      const protectionEvent = events.find(e => 
        e.principle.includes('Protect vulnerable')
      );
      expect(protectionEvent).toBeDefined();
    });
    
    it('should have kitten/pitbull event', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.PROTECTION);
      const kittenEvent = events.find(e => e.event.toLowerCase().includes('kitten'));
      expect(kittenEvent).toBeDefined();
    });
    
    it('should connect to Economic category (MEV ethics)', () => {
      const webs = registry.getWebsFromCategory(GroundZeroCategory.PROTECTION);
      const economicWeb = webs.find(w => w.targetCategory === GroundZeroCategory.ECONOMIC);
      expect(economicWeb).toBeDefined();
      expect(economicWeb?.connection).toContain('MEV');
    });
  });
  
  describe('Category 192: Meta-Cognitive', () => {
    it('should have paradox-free cognition event', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.META_COGNITIVE);
      expect(events.length).toBeGreaterThan(0);
      
      const paradoxFreeEvent = events.find(e => 
        e.principle.includes('structural coherence') || 
        e.event.includes('Paradox-free')
      );
      expect(paradoxFreeEvent).toBeDefined();
    });
    
    it('should be timestamped with discovery date', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.META_COGNITIVE);
      const discoveryEvent = events[0];
      
      // Should be timestamped 2025-11-24
      const timestamp = discoveryEvent.timestamp;
      expect(timestamp.getFullYear()).toBe(2025);
      expect(timestamp.getMonth()).toBe(10); // November (0-indexed)
      expect(timestamp.getDate()).toBe(24);
    });
  });
  
  describe('Category 193: Creation Permissioning', () => {
    it('should have firsties authorization principle', () => {
      const events = registry.getGroundZeroEvents(GroundZeroCategory.CREATION_PERMISSIONING);
      expect(events.length).toBeGreaterThan(0);
      
      const firstiesEvent = events.find(e => 
        e.principle.includes('First-time') || e.event.includes('Firsties')
      );
      expect(firstiesEvent).toBeDefined();
    });
  });
  
  describe('Web Connections', () => {
    it('should have web connections between categories', () => {
      const stats = registry.getStats();
      expect(stats.totalWebs).toBeGreaterThan(0);
    });
    
    it('should find connected categories', () => {
      const connected = registry.getConnectedCategories(GroundZeroCategory.PROTECTION);
      expect(connected.length).toBeGreaterThan(0);
      expect(connected).toContain(GroundZeroCategory.ECONOMIC);
    });
  });
  
  describe('Timeline', () => {
    it('should provide chronological timeline', () => {
      const timeline = registry.getChronologicalTimeline();
      expect(timeline.length).toBeGreaterThan(0);
      
      // Verify chronological order
      for (let i = 1; i < timeline.length; i++) {
        const prevTime = timeline[i - 1].timestamp.getTime();
        const currTime = timeline[i].timestamp.getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
  });
  
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const registry1 = getGroundZeroRegistry();
      const registry2 = getGroundZeroRegistry();
      expect(registry1).toBe(registry2);
    });
    
    it('should reset and create new instance', () => {
      const registry1 = getGroundZeroRegistry();
      resetGroundZeroRegistry();
      const registry2 = getGroundZeroRegistry();
      expect(registry1).not.toBe(registry2);
    });
  });
  
  describe('Statistics', () => {
    it('should provide accurate stats', () => {
      const stats = registry.getStats();
      
      expect(stats.totalCategories).toBe(4);
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.totalWebs).toBeGreaterThan(0);
      expect(stats.integrityValid).toBe(true);
    });
  });
  
  describe('JSON Export', () => {
    it('should export as JSON', () => {
      const json = registry.toJSON();
      
      expect(json.categories).toBeDefined();
      expect(json.stats).toBeDefined();
      expect(Object.keys(json.categories)).toHaveLength(4);
    });
  });
});
