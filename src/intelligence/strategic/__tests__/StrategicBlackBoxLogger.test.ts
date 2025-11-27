/**
 * Tests for Strategic Black Box Logger
 *
 * Validates decision outcome tracking and analysis capabilities
 */

import { StrategicBlackBoxLogger, DecisionOutcome, TradeOutcome } from '../StrategicBlackBoxLogger';
import * as fs from 'fs';
import * as path from 'path';

describe('StrategicBlackBoxLogger', () => {
  let logger: StrategicBlackBoxLogger;
  const testLogDir = 'logs/strategic-test';

  beforeEach(() => {
    // Create test logger
    logger = new StrategicBlackBoxLogger(testLogDir);

    // Clean up any existing test logs
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testLogDir, file));
      });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testLogDir, file));
      });
      fs.rmdirSync(testLogDir);
    }
  });

  describe('Decision Outcome Logging', () => {
    it('should log decision outcomes correctly', () => {
      const decision: DecisionOutcome = {
        timestamp: new Date().toISOString(),
        decisionId: 'test-001',
        decisionType: 'reasoning',
        strategy: 'cognitive-analysis',
        resourcesAllocated: 100,
        processingTime: 500,
        cognitiveLoad: 0.7,
        confidenceLevel: 0.85,
        predictedQuality: 0.9,
        actualQuality: 0.88,
        contextComplexity: 0.6,
        memoryAccess: 5,
        temporalRelevance: 0.75,
        expectedOutcome: { value: 'high' },
        actualOutcome: { value: 'medium-high' },
        deviationScore: 0.02,
        isNovel: false,
        requiresAdaptation: false,
        status: 'success',
      };

      logger.logDecisionOutcome(decision);

      // Verify log file exists
      const logFile = path.join(testLogDir, 'decision-outcomes.jsonl');
      expect(fs.existsSync(logFile)).toBe(true);

      // Verify log content
      const content = fs.readFileSync(logFile, 'utf8');
      const logEntry = JSON.parse(content.trim());

      expect(logEntry.decision_id).toBe('test-001');
      expect(logEntry.strategy).toBe('cognitive-analysis');
      expect(logEntry.status).toBe('success');
    });
  });

  describe('Decision Analysis', () => {
    it('should analyze recent decisions correctly', () => {
      // Log multiple decisions
      for (let i = 0; i < 5; i++) {
        const decision: DecisionOutcome = {
          timestamp: new Date().toISOString(),
          decisionId: `test-${i}`,
          decisionType: 'test',
          strategy: 'test-strategy',
          resourcesAllocated: 100,
          processingTime: 500,
          cognitiveLoad: 0.5,
          confidenceLevel: 0.8,
          predictedQuality: 0.9,
          actualQuality: 0.85 + i * 0.02,
          contextComplexity: 0.5,
          memoryAccess: 5,
          temporalRelevance: 0.7,
          expectedOutcome: {},
          actualOutcome: {},
          deviationScore: 0.05,
          isNovel: i % 2 === 0,
          requiresAdaptation: i % 3 === 0,
          status: i < 4 ? 'success' : 'partial',
        };

        logger.logDecisionOutcome(decision);
      }

      const analysis = logger.analyzeRecentDecisions(5);

      expect(analysis.totalDecisions).toBe(5);
      expect(analysis.successRate).toBe(80); // 4/5 = 80%
      expect(analysis.novelExperiences).toBe(3); // i=0,2,4
      expect(analysis.adaptationTriggers).toBe(2); // i=0,3
    });

    it('should handle empty log gracefully', () => {
      const analysis = logger.analyzeRecentDecisions(10);

      expect(analysis.totalDecisions).toBe(0);
      expect(analysis.successRate).toBe(0);
      expect(analysis.averageDeviation).toBe(0);
    });
  });
});
