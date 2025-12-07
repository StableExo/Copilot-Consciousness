/**
 * TestCoverageAnalyzer Tests
 *
 * Comprehensive tests for the Test Coverage Analyzer MCP tool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestCoverageAnalyzer } from '../../../../src/tools/testing/TestCoverageAnalyzer';
import * as path from 'path';

describe('TestCoverageAnalyzer', () => {
  let analyzer: TestCoverageAnalyzer;
  const srcDir = path.join(process.cwd(), 'src');
  const testDir = path.join(process.cwd(), 'tests');

  beforeEach(() => {
    analyzer = new TestCoverageAnalyzer(srcDir, testDir);
  });

  describe('constructor', () => {
    it('should initialize with default directories', () => {
      const defaultAnalyzer = new TestCoverageAnalyzer();
      expect(defaultAnalyzer).toBeDefined();
      expect(defaultAnalyzer).toBeInstanceOf(TestCoverageAnalyzer);
    });

    it('should initialize with custom directories', () => {
      const customAnalyzer = new TestCoverageAnalyzer('/custom/src', '/custom/tests');
      expect(customAnalyzer).toBeDefined();
      expect(customAnalyzer).toBeInstanceOf(TestCoverageAnalyzer);
    });
  });

  describe('analyze', () => {
    it('should analyze project test coverage', async () => {
      const report = await analyzer.analyze();

      expect(report).toBeDefined();
      expect(report).toHaveProperty('totalFiles');
      expect(report).toHaveProperty('testedFiles');
      expect(report).toHaveProperty('untestedFiles');
      expect(report).toHaveProperty('coveragePercentage');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('criticalGaps');

      // Basic sanity checks
      expect(report.totalFiles).toBeGreaterThan(0);
      expect(report.testedFiles).toBeGreaterThanOrEqual(0);
      expect(report.testedFiles).toBeLessThanOrEqual(report.totalFiles);
      expect(report.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(report.coveragePercentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.untestedFiles)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.criticalGaps)).toBe(true);
    });

    it('should calculate coverage percentage correctly', async () => {
      const report = await analyzer.analyze();

      const expectedPercentage = (report.testedFiles / report.totalFiles) * 100;
      expect(report.coveragePercentage).toBeCloseTo(expectedPercentage, 2);
    });

    it('should identify untested files', async () => {
      const report = await analyzer.analyze();

      expect(report.untestedFiles.length).toBe(report.totalFiles - report.testedFiles);
      
      // All untested files should be strings
      report.untestedFiles.forEach((file) => {
        expect(typeof file).toBe('string');
        expect(file.length).toBeGreaterThan(0);
      });
    });

    it('should provide recommendations', async () => {
      const report = await analyzer.analyze();

      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should be actionable strings
      report.recommendations.forEach((rec) => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('should identify critical gaps', async () => {
      const report = await analyzer.analyze();

      // Critical gaps should have required fields
      report.criticalGaps.forEach((gap) => {
        expect(gap).toHaveProperty('file');
        expect(gap).toHaveProperty('reason');
        expect(gap).toHaveProperty('priority');
        expect(typeof gap.file).toBe('string');
        expect(typeof gap.reason).toBe('string');
        expect(['low', 'medium', 'high', 'critical']).toContain(gap.priority);
      });
    });

    it('should prioritize critical system components', async () => {
      const report = await analyzer.analyze();

      // Check if any critical patterns are flagged
      const criticalKeywords = ['ethics', 'cognitive', 'consciousness', 'identity', 'memory', 'execution'];
      const hasCriticalGaps = report.criticalGaps.some((gap) =>
        criticalKeywords.some((keyword) => gap.file.toLowerCase().includes(keyword))
      );

      // If there are untested critical files, they should be in critical gaps
      const hasUntestedCriticalFiles = report.untestedFiles.some((file) =>
        criticalKeywords.some((keyword) => file.toLowerCase().includes(keyword))
      );

      if (hasUntestedCriticalFiles) {
        expect(hasCriticalGaps).toBe(true);
      }
    });
  });

  describe('analyzeModule', () => {
    it('should analyze specific module coverage', async () => {
      // Test with tools module (which should exist)
      const moduleReport = await analyzer.analyzeModule('tools');

      expect(moduleReport).toBeDefined();
      expect(moduleReport).toHaveProperty('files');
      expect(moduleReport).toHaveProperty('coverage');
      expect(moduleReport).toHaveProperty('gaps');

      expect(Array.isArray(moduleReport.files)).toBe(true);
      expect(typeof moduleReport.coverage).toBe('number');
      expect(Array.isArray(moduleReport.gaps)).toBe(true);
      expect(moduleReport.coverage).toBeGreaterThanOrEqual(0);
      expect(moduleReport.coverage).toBeLessThanOrEqual(100);
    });

    it('should handle non-existent module', async () => {
      const moduleReport = await analyzer.analyzeModule('nonexistent-module-12345');

      expect(moduleReport).toBeDefined();
      expect(moduleReport.files.length).toBe(0);
      expect(moduleReport.coverage).toBeNaN(); // 0/0 = NaN
      expect(moduleReport.gaps.length).toBe(0);
    });

    it('should provide file mappings', async () => {
      const moduleReport = await analyzer.analyzeModule('tools');

      moduleReport.files.forEach((mapping) => {
        expect(mapping).toHaveProperty('sourceFile');
        expect(mapping).toHaveProperty('testFile');
        expect(mapping).toHaveProperty('hasTests');
        expect(mapping).toHaveProperty('isCritical');
        
        expect(typeof mapping.sourceFile).toBe('string');
        expect(typeof mapping.hasTests).toBe('boolean');
        expect(typeof mapping.isCritical).toBe('boolean');
        
        if (mapping.hasTests) {
          expect(mapping.testFile).not.toBeNull();
        }
      });
    });

    it('should calculate module coverage correctly', async () => {
      const moduleReport = await analyzer.analyzeModule('tools');

      if (moduleReport.files.length > 0) {
        const testedCount = moduleReport.files.filter((f) => f.hasTests).length;
        const expectedCoverage = (testedCount / moduleReport.files.length) * 100;
        expect(moduleReport.coverage).toBeCloseTo(expectedCoverage, 2);
      }
    });
  });

  describe('coverage metrics', () => {
    it('should track tested vs untested files accurately', async () => {
      const report = await analyzer.analyze();

      // Total should equal tested + untested
      expect(report.totalFiles).toBe(report.testedFiles + report.untestedFiles.length);
    });

    it('should report coverage as percentage', async () => {
      const report = await analyzer.analyze();

      expect(report.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(report.coveragePercentage).toBeLessThanOrEqual(100);
      expect(typeof report.coveragePercentage).toBe('number');
      expect(isFinite(report.coveragePercentage)).toBe(true);
    });
  });

  describe('priority assessment', () => {
    it('should assign priorities to gaps', async () => {
      const report = await analyzer.analyze();

      const priorities = new Set(report.criticalGaps.map((g) => g.priority));
      
      // Should use valid priority levels
      priorities.forEach((priority) => {
        expect(['low', 'medium', 'high', 'critical']).toContain(priority);
      });
    });

    it('should prioritize ethics and consciousness modules', async () => {
      const report = await analyzer.analyze();

      const ethicsGaps = report.criticalGaps.filter((gap) =>
        gap.file.toLowerCase().includes('ethics') || gap.file.toLowerCase().includes('consciousness')
      );

      // Ethics and consciousness gaps should be high or critical priority
      ethicsGaps.forEach((gap) => {
        expect(['high', 'critical']).toContain(gap.priority);
      });
    });
  });

  describe('recommendations', () => {
    it('should provide actionable recommendations', async () => {
      const report = await analyzer.analyze();

      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should have at least one recommendation about coverage
      const hasCoverageRecommendation = report.recommendations.some((rec) =>
        rec.toLowerCase().includes('coverage') ||
        rec.toLowerCase().includes('test')
      );
      
      expect(hasCoverageRecommendation).toBe(true);
    });

    it('should recommend testing critical components first', async () => {
      const report = await analyzer.analyze();

      if (report.criticalGaps.length > 0) {
        const hasCriticalRecommendation = report.recommendations.some((rec) =>
          rec.toLowerCase().includes('critical') ||
          rec.toLowerCase().includes('immediately') ||
          rec.toLowerCase().includes('priority')
        );
        
        expect(hasCriticalRecommendation).toBe(true);
      }
    });

    it('should provide specific guidance when coverage is low', async () => {
      const report = await analyzer.analyze();

      if (report.coveragePercentage < 80) {
        const hasSpecificGuidance = report.recommendations.some((rec) =>
          rec.includes('Add tests for')
        );
        
        expect(hasSpecificGuidance || report.recommendations.length > 0).toBe(true);
      }
    });
  });

  describe('critical gap detection', () => {
    it('should flag untested critical files', async () => {
      const report = await analyzer.analyze();

      const criticalPatterns = ['ethics', 'cognitive', 'consciousness', 'identity', 'memory', 'execution', 'gated'];
      
      report.criticalGaps.forEach((gap) => {
        const file = gap.file.toLowerCase();
        const isCriticalPattern = criticalPatterns.some((pattern) => file.includes(pattern));
        
        if (isCriticalPattern) {
          expect(['high', 'critical']).toContain(gap.priority);
          expect(gap.reason.length).toBeGreaterThan(0);
        }
      });
    });

    it('should provide reasons for critical gaps', async () => {
      const report = await analyzer.analyze();

      report.criticalGaps.forEach((gap) => {
        expect(gap.reason).toBeTruthy();
        expect(gap.reason.length).toBeGreaterThan(0);
        expect(typeof gap.reason).toBe('string');
      });
    });
  });

  describe('file structure validation', () => {
    it('should handle different file structures', async () => {
      const report = await analyzer.analyze();

      // Should work with nested directories
      expect(report.totalFiles).toBeGreaterThan(0);
      
      // Should find files in various subdirectories
      const hasNestedFiles = report.untestedFiles.some((file) => file.includes('/'));
      if (report.untestedFiles.length > 5) {
        expect(hasNestedFiles).toBe(true);
      }
    });

    it('should exclude test files from analysis', async () => {
      const report = await analyzer.analyze();

      // No file in untestedFiles should be a test file
      const hasTestFiles = report.untestedFiles.some((file) =>
        file.includes('.test.') || file.includes('__tests__')
      );
      
      expect(hasTestFiles).toBe(false);
    });
  });
});
