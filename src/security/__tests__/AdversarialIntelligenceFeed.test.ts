/**
 * Tests for AdversarialIntelligenceFeed
 *
 * Tests the ability to learn from real-world adversarial attack data
 */

import { AdversarialIntelligenceFeed } from '../AdversarialIntelligenceFeed';
import { ThreatIntelligence, ThreatType } from '../types';

describe('AdversarialIntelligenceFeed', () => {
  let feed: AdversarialIntelligenceFeed;

  beforeEach(() => {
    feed = new AdversarialIntelligenceFeed({
      enableRealTimeIngestion: true,
      minObservationsForPattern: 2,
      logLevel: 'error', // Reduce test output
    });
  });

  afterEach(async () => {
    await feed.stop();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const newFeed = new AdversarialIntelligenceFeed();
      const stats = newFeed.getStatistics();
      expect(stats.sources.total).toBe(0);
      expect(stats.patterns.total).toBe(0);
      expect(stats.isRunning).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customFeed = new AdversarialIntelligenceFeed({
        maxPatternsRetained: 500,
        patternExpiryDays: 7,
      });
      expect(customFeed).toBeDefined();
    });
  });

  describe('source registration', () => {
    it('should register threat intelligence sources', () => {
      feed.registerSource({
        sourceId: 'test-source',
        name: 'Test Source',
        type: 'api',
        url: 'https://api.example.com/threats',
        enabled: true,
        trustLevel: 0.9,
      });

      const stats = feed.getStatistics();
      expect(stats.sources.total).toBe(1);
    });

    it('should emit event on source registration', () => {
      const eventHandler = jest.fn();
      feed.on('sourceRegistered', eventHandler);

      feed.registerSource({
        sourceId: 'test-source',
        name: 'Test Source',
        type: 'stream',
        enabled: true,
        trustLevel: 0.8,
      });

      expect(eventHandler).toHaveBeenCalledWith({
        sourceId: 'test-source',
        name: 'Test Source',
      });
    });
  });

  describe('intelligence ingestion', () => {
    it('should ingest threat intelligence', async () => {
      const intel: ThreatIntelligence = {
        entryId: 'intel-001',
        timestamp: Date.now(),
        threatType: 'flash_loan_attack',
        severity: 'high',
        iocs: {
          ips: ['192.168.1.100'],
          addresses: ['0x1234567890abcdef'],
        },
        suggestedMitigations: ['Add flash loan detection'],
        source: 'test',
        confidence: 0.9,
      };

      await feed.ingestIntelligence(intel);

      const stats = feed.getStatistics();
      expect(stats.intelligence.totalIngested).toBe(1);
    });

    it('should emit events on ingestion', async () => {
      const eventHandler = jest.fn();
      feed.on('intelligenceIngested', eventHandler);

      const intel: ThreatIntelligence = {
        entryId: 'intel-002',
        timestamp: Date.now(),
        threatType: 'sandwich_attack',
        severity: 'medium',
        iocs: {},
        suggestedMitigations: [],
        source: 'test',
        confidence: 0.8,
      };

      await feed.ingestIntelligence(intel);

      expect(eventHandler).toHaveBeenCalledWith({
        entryId: 'intel-002',
        threatType: 'sandwich_attack',
        severity: 'medium',
      });
    });

    it('should handle bulk ingestion', async () => {
      const intelligenceArray: ThreatIntelligence[] = Array.from({ length: 10 }, (_, i) => ({
        entryId: `intel-bulk-${i}`,
        timestamp: Date.now(),
        threatType: 'brute_force' as ThreatType,
        severity: 'medium' as const,
        iocs: { ips: [`192.168.1.${i}`] },
        suggestedMitigations: [],
        source: 'bulk-test',
        confidence: 0.7,
      }));

      const result = await feed.ingestBulk(intelligenceArray);

      expect(result.ingested).toBe(10);
      const stats = feed.getStatistics();
      expect(stats.intelligence.totalIngested).toBe(10);
    });
  });

  describe('pattern learning', () => {
    it('should learn patterns from repeated attacks', async () => {
      // Ingest multiple similar attacks to trigger pattern detection
      for (let i = 0; i < 5; i++) {
        await feed.ingestIntelligence({
          entryId: `intel-pattern-${i}`,
          timestamp: Date.now() + i,
          threatType: 'frontrun_attempt',
          severity: 'high',
          iocs: {
            ips: ['10.0.0.1'],
            addresses: ['0xattacker'],
          },
          suggestedMitigations: ['Use private mempool'],
          source: 'pattern-test',
          confidence: 0.85,
        });
      }

      const patterns = feed.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);

      const frontrunPattern = patterns.find((p) => p.attackType === 'frontrun_attempt');
      expect(frontrunPattern).toBeDefined();
      expect(frontrunPattern!.observationCount).toBeGreaterThanOrEqual(2);
    });

    it('should emit event on new pattern learned', async () => {
      const eventHandler = jest.fn();
      feed.on('newPatternLearned', eventHandler);

      await feed.ingestIntelligence({
        entryId: 'intel-new-pattern',
        timestamp: Date.now(),
        threatType: 'reentrancy_attempt',
        severity: 'critical',
        iocs: {
          addresses: ['0xmalicious'],
        },
        suggestedMitigations: ['Add reentrancy guard'],
        source: 'test',
        confidence: 0.95,
      });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should calculate risk scores for patterns', async () => {
      // Ingest high-severity attacks
      for (let i = 0; i < 5; i++) {
        await feed.ingestIntelligence({
          entryId: `intel-risk-${i}`,
          timestamp: Date.now(),
          threatType: 'flash_loan_attack',
          severity: 'critical',
          iocs: {},
          suggestedMitigations: [],
          source: 'test',
          confidence: 0.9,
        });
      }

      const patterns = feed.getPatterns();
      const flashLoanPattern = patterns.find((p) => p.attackType === 'flash_loan_attack');

      expect(flashLoanPattern).toBeDefined();
      expect(flashLoanPattern!.riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('threat landscape', () => {
    it('should update threat landscape on ingestion', async () => {
      await feed.ingestIntelligence({
        entryId: 'intel-landscape',
        timestamp: Date.now(),
        threatType: 'mev_attack',
        severity: 'high',
        iocs: {},
        suggestedMitigations: [],
        source: 'test',
        confidence: 0.8,
      });

      const landscape = feed.getLandscape();
      expect(landscape.totalObservations).toBe(1);
      expect(landscape.threatsByType.get('mev_attack')).toBe(1);
    });
  });

  describe('malicious entity detection', () => {
    it('should track malicious IPs', async () => {
      await feed.ingestIntelligence({
        entryId: 'intel-ip',
        timestamp: Date.now(),
        threatType: 'brute_force',
        severity: 'high',
        iocs: {
          ips: ['123.45.67.89'],
        },
        suggestedMitigations: ['Block IP'],
        source: 'test',
        confidence: 0.9,
      });

      expect(feed.isKnownMaliciousIP('123.45.67.89')).toBe(true);
      expect(feed.isKnownMaliciousIP('10.0.0.1')).toBe(false);
    });

    it('should track malicious addresses', async () => {
      await feed.ingestIntelligence({
        entryId: 'intel-addr',
        timestamp: Date.now(),
        threatType: 'malicious_contract',
        severity: 'critical',
        iocs: {
          addresses: ['0xDeAdBeEf'],
        },
        suggestedMitigations: [],
        source: 'test',
        confidence: 0.95,
      });

      expect(feed.isKnownMaliciousAddress('0xdeadbeef')).toBe(true);
      expect(feed.isKnownMaliciousAddress('0x1234')).toBe(false);
    });
  });

  describe('security pattern export', () => {
    it('should export patterns for SecurityPatternLearner integration', async () => {
      // Ingest enough data with SAME IOCs to update the same pattern
      for (let i = 0; i < 5; i++) {
        await feed.ingestIntelligence({
          entryId: `intel-export-${i}`,
          timestamp: Date.now() + i,
          threatType: 'price_manipulation',
          severity: 'critical',
          iocs: {
            addresses: ['0xattacker'], // Same address each time to update same pattern
          },
          suggestedMitigations: ['Add oracle protection'],
          source: 'test',
          confidence: 0.95,
        });
      }

      const securityPatterns = feed.exportAsSecurityPatterns();
      expect(securityPatterns.length).toBeGreaterThan(0);

      const priceManipPattern = securityPatterns.find((p) =>
        p.associatedThreats.includes('price_manipulation')
      );
      expect(priceManipPattern).toBeDefined();
      expect(priceManipPattern!.type).toBe('attack_pattern');
    });
  });

  describe('high priority threats', () => {
    it('should identify high priority threats', async () => {
      // Ingest many critical threats with SAME IOCs to build up observation count
      // Need enough observations to push risk score above 0.7 threshold
      for (let i = 0; i < 25; i++) {
        await feed.ingestIntelligence({
          entryId: `intel-priority-${i}`,
          timestamp: Date.now() + i,
          threatType: 'data_exfiltration',
          severity: 'critical',
          iocs: {
            ips: ['10.0.0.1'], // Same IP to update same pattern
            addresses: ['0xmalicious'], // Add address for higher confidence
          },
          suggestedMitigations: ['Block exfiltration'],
          source: 'test',
          confidence: 0.99,
        });
      }

      const highPriority = feed.getHighPriorityThreats();
      expect(highPriority.length).toBeGreaterThan(0);
      expect(highPriority[0].severity).toBe('critical');
    });
  });
});
