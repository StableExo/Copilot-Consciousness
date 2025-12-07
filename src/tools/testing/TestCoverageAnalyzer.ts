/**
 * Test Coverage Analyzer
 *
 * MCP tool for analyzing test coverage and identifying gaps
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestCoverageReport {
  totalFiles: number;
  testedFiles: number;
  untestedFiles: string[];
  coveragePercentage: number;
  recommendations: string[];
  criticalGaps: {
    file: string;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

export interface TestFileMapping {
  sourceFile: string;
  testFile: string | null;
  hasTests: boolean;
  isCritical: boolean;
}

/**
 * Test Coverage Analyzer
 */
export class TestCoverageAnalyzer {
  private srcDir: string;
  private testDir: string;
  private criticalPatterns: string[] = [
    'ethics',
    'cognitive',
    'consciousness',
    'identity',
    'memory',
    'execution',
    'gated',
  ];

  constructor(
    srcDir: string = path.join(process.cwd(), 'src'),
    testDir: string = path.join(process.cwd(), 'tests')
  ) {
    this.srcDir = srcDir;
    this.testDir = testDir;
  }

  /**
   * Analyze test coverage for the project
   */
  async analyze(): Promise<TestCoverageReport> {
    const sourceFiles = this.findSourceFiles(this.srcDir);
    const testMappings = await this.mapTestFiles(sourceFiles);

    const testedFiles = testMappings.filter((m) => m.hasTests).length;
    const untestedFiles = testMappings.filter((m) => !m.hasTests).map((m) => m.sourceFile);

    const criticalGaps = this.identifyCriticalGaps(testMappings);
    const recommendations = this.generateRecommendations(testMappings, criticalGaps);

    return {
      totalFiles: sourceFiles.length,
      testedFiles,
      untestedFiles,
      coveragePercentage: (testedFiles / sourceFiles.length) * 100,
      recommendations,
      criticalGaps,
    };
  }

  /**
   * Get detailed coverage for a specific module
   */
  async analyzeModule(modulePath: string): Promise<{
    files: TestFileMapping[];
    coverage: number;
    gaps: string[];
  }> {
    const moduleDir = path.join(this.srcDir, modulePath);
    const sourceFiles = this.findSourceFiles(moduleDir);
    const testMappings = await this.mapTestFiles(sourceFiles);

    const testedCount = testMappings.filter((m) => m.hasTests).length;
    const gaps = testMappings.filter((m) => !m.hasTests).map((m) => m.sourceFile);

    return {
      files: testMappings,
      coverage: (testedCount / sourceFiles.length) * 100,
      gaps,
    };
  }

  /**
   * Find all TypeScript source files
   */
  private findSourceFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentDir: string): void => {
      if (!fs.existsSync(currentDir)) {
        return;
      }

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, dist, and test directories
          if (!entry.name.match(/^(node_modules|dist|__tests__|\..*)/)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Map source files to their test files
   */
  private async mapTestFiles(sourceFiles: string[]): Promise<TestFileMapping[]> {
    return sourceFiles.map((sourceFile) => {
      const testFile = this.findTestFile(sourceFile);
      const isCritical = this.isCriticalFile(sourceFile);

      return {
        sourceFile: path.relative(this.srcDir, sourceFile),
        testFile: testFile ? path.relative(this.testDir, testFile) : null,
        hasTests: testFile !== null,
        isCritical,
      };
    });
  }

  /**
   * Find the test file for a source file
   */
  private findTestFile(sourceFile: string): string | null {
    const relativePath = path.relative(this.srcDir, sourceFile);
    const testFileName = relativePath.replace(/\.ts$/, '.test.ts');

    // Try multiple test locations
    const possibleLocations = [
      path.join(this.testDir, 'unit', testFileName),
      path.join(this.testDir, testFileName),
      path.join(path.dirname(sourceFile), '__tests__', path.basename(testFileName)),
    ];

    for (const location of possibleLocations) {
      if (fs.existsSync(location)) {
        return location;
      }
    }

    return null;
  }

  /**
   * Check if a file is critical (should have tests)
   */
  private isCriticalFile(filePath: string): boolean {
    return this.criticalPatterns.some((pattern) => filePath.includes(pattern));
  }

  /**
   * Identify critical gaps in test coverage
   */
  private identifyCriticalGaps(
    mappings: TestFileMapping[]
  ): TestCoverageReport['criticalGaps'] {
    const gaps: TestCoverageReport['criticalGaps'] = [];

    for (const mapping of mappings) {
      if (!mapping.hasTests && mapping.isCritical) {
        gaps.push({
          file: mapping.sourceFile,
          reason: this.determineGapReason(mapping.sourceFile),
          priority: this.determineGapPriority(mapping.sourceFile),
        });
      }
    }

    return gaps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Determine why a file should have tests
   */
  private determineGapReason(filePath: string): string {
    if (filePath.includes('ethics')) {
      return 'Ethical decision-making requires comprehensive test coverage';
    }
    if (filePath.includes('cognitive')) {
      return 'Cognitive systems need validation to ensure correct reasoning';
    }
    if (filePath.includes('consciousness')) {
      return 'Consciousness modules require careful testing for reliability';
    }
    if (filePath.includes('identity')) {
      return 'Identity systems need verification of correct behavior';
    }
    if (filePath.includes('memory')) {
      return 'Memory operations require validation of data integrity';
    }
    if (filePath.includes('execution')) {
      return 'Execution systems need comprehensive testing for safety';
    }
    return 'Critical system component requires test coverage';
  }

  /**
   * Determine priority of test gap
   */
  private determineGapPriority(
    filePath: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (filePath.includes('ethics') || filePath.includes('gated')) {
      return 'critical';
    }
    if (filePath.includes('cognitive') || filePath.includes('consciousness')) {
      return 'high';
    }
    if (filePath.includes('identity') || filePath.includes('memory')) {
      return 'high';
    }
    if (filePath.includes('execution')) {
      return 'high';
    }
    return 'medium';
  }

  /**
   * Generate recommendations based on coverage analysis
   */
  private generateRecommendations(
    mappings: TestFileMapping[],
    gaps: TestCoverageReport['criticalGaps']
  ): string[] {
    const recommendations: string[] = [];

    const criticalGaps = gaps.filter((g) => g.priority === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Add tests for ${criticalGaps.length} critical system components immediately`
      );
    }

    const highPriorityGaps = gaps.filter((g) => g.priority === 'high');
    if (highPriorityGaps.length > 0) {
      recommendations.push(
        `Prioritize testing for ${highPriorityGaps.length} high-priority modules`
      );
    }

    const coveragePercentage =
      (mappings.filter((m) => m.hasTests).length / mappings.length) * 100;
    if (coveragePercentage < 80) {
      recommendations.push(
        `Overall coverage is ${coveragePercentage.toFixed(1)}%. Target 80%+ for production readiness`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Test coverage is comprehensive. Maintain current standards.');
    }

    return recommendations;
  }
}

/**
 * Create and export a singleton instance
 */
export const testCoverageAnalyzer = new TestCoverageAnalyzer();
