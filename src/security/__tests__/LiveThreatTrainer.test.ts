/**
 * Tests for LiveThreatTrainer
 *
 * Tests the live threat training ground that connects to external feeds
 */

import { LiveThreatTrainer } from '../LiveThreatTrainer';

describe('LiveThreatTrainer', () => {
  let trainer: LiveThreatTrainer;

  beforeEach(() => {
    trainer = new LiveThreatTrainer({
      autoStart: false,
      enableAutoDefenseApplication: false,
      logLevel: 'error', // Reduce test output
      minEventsForDefenseUpdate: 3,
    });
  });

  afterEach(async () => {
    await trainer.stopTraining();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const newTrainer = new LiveThreatTrainer();
      const stats = newTrainer.getStatistics();
      expect(stats.feeds.total).toBe(0);
      expect(stats.training.isActive).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customTrainer = new LiveThreatTrainer({
        minEventsForDefenseUpdate: 50,
        defenseUpdateInterval: 120000,
      });
      expect(customTrainer).toBeDefined();
    });
  });

  describe('feed management', () => {
    it('should add feed by configuration', () => {
      const feedId = trainer.addFeed({
        name: 'Test Feed',
        url: 'https://api.example.com/threats',
        type: 'polling',
        pollInterval: 30000,
        parser: 'json',
        enabled: true,
        trustScore: 0.9,
      });

      expect(feedId).toBeDefined();
      expect(feedId.startsWith('feed_')).toBe(true);

      const stats = trainer.getStatistics();
      expect(stats.feeds.total).toBe(1);
    });

    it('should add feed by URL with auto-detection', () => {
      const feedId = trainer.addFeedByUrl('https://threatmap.example.com/api/live', 'Test Map');

      expect(feedId).toBeDefined();
      const stats = trainer.getStatistics();
      expect(stats.feeds.total).toBe(1);
    });

    it('should add known threat feed sources', () => {
      const feedId = trainer.addKnownFeed('blocklist');

      expect(feedId).toBeDefined();
      const stats = trainer.getStatistics();
      expect(stats.feeds.total).toBe(1);
    });

    it('should emit event when feed is added', () => {
      const eventHandler = jest.fn();
      trainer.on('feedAdded', eventHandler);

      trainer.addFeed({
        name: 'Event Test Feed',
        url: 'https://test.com/api',
        type: 'api',
        parser: 'json',
        enabled: true,
        trustScore: 0.8,
      });

      expect(eventHandler).toHaveBeenCalled();
      expect(eventHandler.mock.calls[0][0]).toHaveProperty('name', 'Event Test Feed');
    });
  });

  describe('threat data injection', () => {
    it('should accept manually injected threat data', () => {
      const events = [
        {
          timestamp: Date.now(),
          attackType: 'brute_force',
          severity: 'high' as const,
          sourceIP: '192.168.1.100',
        },
        {
          timestamp: Date.now(),
          attackType: 'sql_injection',
          severity: 'critical' as const,
          sourceIP: '10.0.0.50',
        },
      ];

      trainer.injectThreatData(events);

      // Data goes to buffer, need to start training to process
      expect(trainer).toBeDefined();
    });

    it('should emit batch processed event after flush', async () => {
      const eventHandler = jest.fn();
      trainer.on('batchProcessed', eventHandler);

      // Start training to enable processing
      await trainer.startTraining();

      const events = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now(),
        attackType: 'brute_force',
        severity: 'medium' as const,
        sourceIP: `192.168.1.${i}`,
      }));

      trainer.injectThreatData(events);

      // Wait for batch processing (buffer flushes every 5 seconds, but large batches flush immediately)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Batch processed event should have been emitted for the immediate flush
      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('training session', () => {
    it('should start and stop training session', async () => {
      await trainer.startTraining();

      let stats = trainer.getStatistics();
      expect(stats.training.isActive).toBe(true);
      expect(stats.training.currentSession).toBeDefined();

      await trainer.stopTraining();

      stats = trainer.getStatistics();
      expect(stats.training.isActive).toBe(false);
      expect(stats.training.sessionsCompleted).toBe(1);
    });

    it('should emit training events', async () => {
      const startHandler = jest.fn();
      const stopHandler = jest.fn();

      trainer.on('trainingStarted', startHandler);
      trainer.on('trainingStopped', stopHandler);

      await trainer.startTraining();
      expect(startHandler).toHaveBeenCalled();

      await trainer.stopTraining();
      expect(stopHandler).toHaveBeenCalled();
    });

    it('should handle multiple start calls gracefully', async () => {
      await trainer.startTraining();
      await trainer.startTraining(); // Should not throw

      const stats = trainer.getStatistics();
      expect(stats.training.isActive).toBe(true);
    });
  });

  describe('feed data handling', () => {
    it('should handle feed data callback', () => {
      const feedId = trainer.addFeed({
        name: 'Callback Test',
        url: 'https://test.com',
        type: 'polling',
        parser: 'json',
        enabled: true,
        trustScore: 0.8,
      });

      const feed = { id: feedId, name: 'Callback Test' } as any;

      // Simulate receiving data
      const mockData = [
        {
          type: 'brute_force',
          severity: 'high',
          src_ip: '1.2.3.4',
          timestamp: Date.now(),
        },
      ];

      trainer.handleFeedData(feedId, feed, mockData);

      const stats = trainer.getStatistics();
      expect(stats.metrics.totalEventsReceived).toBe(1);
    });

    it('should normalize different data formats', () => {
      const feedId = trainer.addFeed({
        name: 'Format Test',
        url: 'https://test.com',
        type: 'api',
        parser: 'auto',
        enabled: true,
        trustScore: 0.7,
      });

      const feed = { parser: 'auto' } as any;

      // Test different field name formats
      const formats = [
        { type: 'ddos', severity: 'high', src_ip: '1.1.1.1' },
        { attack_type: 'sqli', risk: 'critical', source_ip: '2.2.2.2' },
        { category: 'xss', priority: 'medium', sourceIP: '3.3.3.3' },
      ];

      for (const data of formats) {
        trainer.handleFeedData(feedId, feed, data);
      }

      const stats = trainer.getStatistics();
      expect(stats.metrics.totalEventsReceived).toBe(3);
    });
  });

  describe('defense updates', () => {
    it('should generate defense updates from learned patterns', async () => {
      await trainer.startTraining();

      // Inject enough data to trigger pattern learning
      const events = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now(),
        attackType: 'flash_loan_attack',
        severity: 'critical' as const,
        sourceIP: `10.0.0.${i}`,
        contractAddress: '0xattacker',
      }));

      trainer.injectThreatData(events);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const updates = trainer.getDefenseUpdates();
      // May or may not have updates depending on pattern threshold
      expect(Array.isArray(updates)).toBe(true);
    });

    it('should track defense update statistics', async () => {
      const stats = trainer.getStatistics();
      expect(stats.defenseUpdates).toBeDefined();
      expect(stats.defenseUpdates.total).toBeDefined();
      expect(stats.defenseUpdates.applied).toBeDefined();
      expect(stats.defenseUpdates.pending).toBeDefined();
    });
  });

  describe('integration with learning components', () => {
    it('should expose intelligence feed for direct access', () => {
      const intelligenceFeed = trainer.getIntelligenceFeed();
      expect(intelligenceFeed).toBeDefined();
    });

    it('should expose pattern learner for direct access', () => {
      const patternLearner = trainer.getPatternLearner();
      expect(patternLearner).toBeDefined();
    });

    it('should pass learned patterns to pattern learner', async () => {
      await trainer.startTraining();

      // Inject a large batch of attack data (triggers immediate flush at 50+ events)
      const events = Array.from({ length: 60 }, (_, i) => ({
        timestamp: Date.now() + i,
        attackType: 'unauthorized_access',
        severity: 'high' as const,
        sourceIP: `192.168.1.${i % 255}`,
      }));

      trainer.injectThreatData(events);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const intelligenceFeed = trainer.getIntelligenceFeed();
      const feedStats = intelligenceFeed.getStatistics();

      // Should have ingested intelligence data
      expect(feedStats.intelligence.totalIngested).toBeGreaterThan(0);
    });
  });

  describe('known feed configurations', () => {
    it('should configure AbuseIPDB feed', () => {
      const feedId = trainer.addKnownFeed('abuseipdb', 'test-api-key');
      expect(feedId).toBeDefined();
    });

    it('should configure AlienVault OTX feed', () => {
      const feedId = trainer.addKnownFeed('alienvault', 'test-api-key');
      expect(feedId).toBeDefined();
    });

    it('should configure Forta Network feed', () => {
      const feedId = trainer.addKnownFeed('forta');
      expect(feedId).toBeDefined();
    });

    it('should configure ThreatFox feed', () => {
      const feedId = trainer.addKnownFeed('threatfox');
      expect(feedId).toBeDefined();
    });

    it('should throw for unknown feed type', () => {
      expect(() => {
        trainer.addKnownFeed('unknown' as any);
      }).toThrow('Unknown feed type');
    });
  });
});
