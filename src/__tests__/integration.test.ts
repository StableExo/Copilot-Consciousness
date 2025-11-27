/**
 * Integration tests for the reorganized codebase
 */

import { ConsciousnessSystem } from '../consciousness';
import { MemorySystem } from '../consciousness/memory';
import { ConsciousnessCore } from '../consciousness/core';
import { DEXRegistry, BalancerValidator, DEXMemoryHookImpl, DEXEventType } from '../dex';
import { PancakeSwapValidator } from '../dex/monitoring/PancakeSwapValidator';
import { EmotionalContext } from '../consciousness/types/memory';
import { defaultConfig } from '../config';
import { Priority } from '../types';

describe('Integration Tests', () => {
  describe('Memory System Integration', () => {
    it('should create memory system with emotional context support', () => {
      const memorySystem = new MemorySystem(defaultConfig.memory);
      expect(memorySystem).toBeDefined();
      expect(memorySystem.getStats().total).toBe(0);
    });

    it('should add memories with emotional context', () => {
      const memorySystem = new MemorySystem(defaultConfig.memory);

      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'curious',
        intensity: 0.8,
        valence: 0.6,
        arousal: 0.7,
        timestamp: new Date(),
      };

      const memoryId = memorySystem.addShortTermMemory(
        { test: 'data' },
        Priority.MEDIUM,
        {},
        emotionalContext
      );

      expect(memoryId).toBeDefined();

      const memory = memorySystem.getMemory(memoryId);
      expect(memory).toBeDefined();
      expect(memory?.emotionalContext).toBeDefined();
      expect(memory?.emotionalContext?.primaryEmotion).toBe('curious');
    });

    it('should add DEX event memories', () => {
      const memorySystem = new MemorySystem(defaultConfig.memory);

      const memoryId = memorySystem.addDEXEventMemory('swap', { amount: 100 }, Priority.HIGH);

      expect(memoryId).toBeDefined();

      const memory = memorySystem.getMemory(memoryId);
      expect(memory).toBeDefined();
      expect(memory?.metadata.category).toBe('dex_event');
    });
  });

  describe('Consciousness Core Integration', () => {
    it('should create consciousness core', () => {
      const core = new ConsciousnessCore(defaultConfig.memory);
      expect(core).toBeDefined();
    });

    it('should integrate memory with emotional context', () => {
      const core = new ConsciousnessCore(defaultConfig.memory);

      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'excited',
        intensity: 0.9,
        valence: 0.8,
        arousal: 0.8,
        timestamp: new Date(),
      };

      const memoryId = core.integrateMemory({ event: 'test' }, emotionalContext);
      expect(memoryId).toBeDefined();

      const memorySystem = core.getMemorySystem();
      const memory = memorySystem.getMemory(memoryId);
      expect(memory?.emotionalContext?.primaryEmotion).toBe('excited');
    });
  });

  describe('DEX Integration', () => {
    it('should create DEX registry', () => {
      const registry = new DEXRegistry();
      expect(registry).toBeDefined();

      const allDexes = registry.getAllDEXes();
      expect(allDexes.length).toBeGreaterThan(0);
    });

    it('should get specific DEX configuration', () => {
      const registry = new DEXRegistry();

      const balancer = registry.getDEX('Balancer');
      expect(balancer).toBeDefined();
      expect(balancer?.name).toBe('Balancer');
    });

    it('should create validators', () => {
      const validator = new BalancerValidator();
      expect(validator).toBeDefined();
      expect(validator.getDEXName()).toBe('Balancer');
    });

    it('should create PancakeSwap validator', () => {
      const validator = new PancakeSwapValidator();
      expect(validator).toBeDefined();
      expect(validator.getDEXName()).toBe('PancakeSwap V3');
    });

    it('should integrate DEX events with memory system', () => {
      const memorySystem = new MemorySystem(defaultConfig.memory);
      const memoryHook = new DEXMemoryHookImpl(memorySystem);

      const event = {
        id: 'test-event',
        type: DEXEventType.SWAP,
        dexName: 'Balancer',
        timestamp: Date.now(),
        data: { amount: 100 },
      };

      const memoryId = memoryHook.recordEvent(event);
      expect(memoryId).toBeDefined();

      const events = memoryHook.searchEvents({ dexName: 'Balancer' });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Full System Integration', () => {
    it('should create and start consciousness system', () => {
      const system = new ConsciousnessSystem(defaultConfig);
      expect(system).toBeDefined();

      system.start();
      const status = system.getStatus();
      expect(status).toBeDefined();
      expect(status.isRunning).toBe(true);

      system.stop();
    });

    it('should access memory system from consciousness system', () => {
      const system = new ConsciousnessSystem(defaultConfig);
      system.start();

      const memorySystem = system.getMemorySystem();
      expect(memorySystem).toBeDefined();
      expect(memorySystem).toBeInstanceOf(MemorySystem);

      system.stop();
    });
  });
});
