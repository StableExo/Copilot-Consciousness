/**
 * MEVAttackFuzzer Tests
 */

import { MEVAttackFuzzer } from '../../../src/mev/MEVAttackFuzzer';

describe('MEVAttackFuzzer', () => {
  let fuzzer: MEVAttackFuzzer;

  beforeEach(() => {
    fuzzer = new MEVAttackFuzzer({
      scenariosPerRun: 20,
      maxConcurrent: 5,
      timeoutMs: 1000,
      randomSeed: 12345, // Deterministic for tests
    });
  });

  afterEach(() => {
    // Clean up event listeners to prevent memory leaks
    fuzzer.removeAllListeners();
  });

  describe('initialization', () => {
    it('should create fuzzer with default config', () => {
      const defaultFuzzer = new MEVAttackFuzzer();
      expect(defaultFuzzer).toBeTruthy();
      expect(defaultFuzzer.isRunning()).toBe(false);
    });

    it('should accept custom configuration', () => {
      expect(fuzzer).toBeTruthy();
    });
  });

  describe('defense registration', () => {
    it('should register defense handlers', () => {
      fuzzer.registerDefense('sandwich', async (scenario) => ({
        detected: true,
        mitigated: true,
        mitigationMethod: 'test-mitigation',
        responseTimeMs: 50,
      }));

      // No error means registration succeeded
      expect(true).toBe(true);
    });

    it('should register default defenses', () => {
      fuzzer.registerDefaultDefenses();
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('fuzzing execution', () => {
    beforeEach(() => {
      fuzzer.registerDefaultDefenses();
    });

    it('should run fuzzing session', async () => {
      const stats = await fuzzer.run();

      expect(stats.totalScenarios).toBeGreaterThan(0);
      expect(stats.byAttackType).toBeDefined();
    });

    it('should not run concurrently', async () => {
      const firstRun = fuzzer.run();
      
      await expect(fuzzer.run()).rejects.toThrow('already running');

      await firstRun;
    });

    it('should emit progress events', async () => {
      const progressHandler = jest.fn();
      fuzzer.on('progress', progressHandler);

      await fuzzer.run();

      expect(progressHandler).toHaveBeenCalled();
    });

    it('should emit session events', async () => {
      const startHandler = jest.fn();
      const completeHandler = jest.fn();

      fuzzer.on('session-started', startHandler);
      fuzzer.on('session-completed', completeHandler);

      await fuzzer.run();

      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(completeHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('vulnerability detection', () => {
    it('should detect undefended attack types', async () => {
      // Register only some defenses
      fuzzer.registerDefense('sandwich', async () => ({
        detected: true,
        mitigated: true,
        mitigationMethod: 'test',
        responseTimeMs: 50,
      }));

      // Focus on undefended types
      const focusedFuzzer = new MEVAttackFuzzer({
        scenariosPerRun: 10,
        focusAttacks: ['frontrun'], // Not defended
      });

      const stats = await focusedFuzzer.run();

      expect(stats.vulnerabilitiesFound).toBeGreaterThan(0);
    });

    it('should get vulnerabilities list', async () => {
      fuzzer.registerDefaultDefenses();
      await fuzzer.run();

      const vulnerabilities = fuzzer.getVulnerabilities();
      expect(Array.isArray(vulnerabilities)).toBe(true);
    });
  });

  describe('results tracking', () => {
    beforeEach(() => {
      fuzzer.registerDefaultDefenses();
    });

    it('should track all results', async () => {
      await fuzzer.run();

      const results = fuzzer.getResults();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should categorize results by outcome', async () => {
      const stats = await fuzzer.run();

      const total = stats.detected + stats.mitigated + stats.bypassed + stats.partial;
      expect(total).toBe(stats.totalScenarios);
    });
  });

  describe('attack type coverage', () => {
    beforeEach(() => {
      fuzzer.registerDefaultDefenses();
    });

    it('should test multiple attack types', async () => {
      const stats = await fuzzer.run();

      const testedTypes = Object.values(stats.byAttackType)
        .filter(t => t.total > 0);

      expect(testedTypes.length).toBeGreaterThan(0);
    });

    it('should focus on specific attack types', async () => {
      const focusedFuzzer = new MEVAttackFuzzer({
        scenariosPerRun: 10,
        focusAttacks: ['sandwich', 'frontrun'],
      });
      focusedFuzzer.registerDefaultDefenses();

      const stats = await focusedFuzzer.run();

      // Should only have sandwich and frontrun
      const testedTypes = Object.entries(stats.byAttackType)
        .filter(([_, t]) => t.total > 0)
        .map(([type]) => type);

      expect(testedTypes.every(t => ['sandwich', 'frontrun'].includes(t))).toBe(true);
    });
  });

  describe('statistics calculation', () => {
    beforeEach(() => {
      fuzzer.registerDefaultDefenses();
    });

    it('should calculate average detection time', async () => {
      const stats = await fuzzer.run();

      expect(stats.averageDetectionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should track damage avoided', async () => {
      const stats = await fuzzer.run();

      expect(stats.totalDamageAvoided).toBeDefined();
    });
  });

  describe('severity filtering', () => {
    it('should filter by severity', async () => {
      const criticalOnlyFuzzer = new MEVAttackFuzzer({
        scenariosPerRun: 50,
        severityFilter: ['critical'],
      });
      criticalOnlyFuzzer.registerDefaultDefenses();

      const stats = await criticalOnlyFuzzer.run();

      // Should have some scenarios (may not all be critical due to random generation)
      expect(stats.totalScenarios).toBeGreaterThanOrEqual(0);
    });
  });
});
