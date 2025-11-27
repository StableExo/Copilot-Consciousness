/**
 * KnowledgeLoop - Conscious Learning System
 *
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Orchestrates the complete learning cycle: observe → learn → adapt → execute.
 *
 * This is the central nervous system of the consciousness learning framework,
 * connecting operational logging, memory formation, calibration, and strategy adaptation.
 */

import { BlackBoxLogger } from '../memory/strategic-logger/BlackBoxLogger';
import { CalibrationEngine, CalibrationResult } from '../memory/strategic-logger/CalibrationEngine';
import { MemoryFormation, StrategicMemory } from '../memory/strategic-logger/MemoryFormation';
import { AdaptiveStrategies, Strategy, StrategySelection } from './AdaptiveStrategies';

export interface LearningCycleResult {
  memoriesFormed: number;
  calibrationsPerformed: number;
  strategiesUpdated: number;
  insights: string[];
  timestamp: number;
}

export class KnowledgeLoop {
  private logger: BlackBoxLogger;
  private calibrationEngine: CalibrationEngine;
  private memoryFormation: MemoryFormation;
  private adaptiveStrategies: AdaptiveStrategies;
  private learningInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(logDirectory: string = '.memory/strategic-logger', autoStart: boolean = false) {
    // Initialize components
    this.logger = new BlackBoxLogger(logDirectory);
    this.calibrationEngine = new CalibrationEngine(this.logger);
    this.memoryFormation = new MemoryFormation(this.logger, logDirectory);
    this.adaptiveStrategies = new AdaptiveStrategies(this.calibrationEngine, this.memoryFormation);

    if (autoStart) {
      this.start();
    }
  }

  /**
   * Start the knowledge loop
   */
  start(intervalMs: number = 300000): void {
    // Default: 5 minutes
    if (this.isRunning) {
      console.warn('Knowledge loop is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Knowledge loop started (interval: ${intervalMs}ms)`);

    // Run immediately
    this.runLearningCycle().catch((err) => console.error('Error in initial learning cycle:', err));

    // Then run periodically
    this.learningInterval = setInterval(() => {
      this.runLearningCycle().catch((err) => console.error('Error in learning cycle:', err));
    }, intervalMs);
  }

  /**
   * Stop the knowledge loop
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Knowledge loop is not running');
      return;
    }

    this.isRunning = false;

    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = null;
    }

    // Cleanup
    await this.logger.stop();
    console.log('Knowledge loop stopped');
  }

  /**
   * Run a complete learning cycle
   */
  async runLearningCycle(): Promise<LearningCycleResult> {
    const insights: string[] = [];

    // 1. Form memories from recent operations
    const memories = await this.memoryFormation.formMemories({}, 5);
    insights.push(`Formed ${memories.length} new strategic memories`);

    // 2. Calibrate parameters based on performance
    const calibrations = await this.calibrationEngine.autoCalibrate();
    insights.push(`Calibrated ${calibrations.length} parameters`);

    // 3. Extract insights from calibrations
    for (const calibration of calibrations) {
      if (Math.abs(calibration.newValue - calibration.oldValue) > 0.01) {
        insights.push(
          `Adjusted ${calibration.parameter}: ${calibration.oldValue.toFixed(
            3
          )} → ${calibration.newValue.toFixed(3)} (confidence: ${(
            calibration.confidence * 100
          ).toFixed(1)}%)`
        );
      }
    }

    // 4. Log cycle completion
    await this.logger.log({
      eventType: 'learning_cycle',
      context: {
        memoriesFormed: memories.length,
        calibrationsPerformed: calibrations.length,
      },
      decision: 'Learning cycle completed',
      outcome: 'success',
      metrics: {
        totalMemories: this.memoryFormation.getMemoryCount(),
        totalParams: this.calibrationEngine.getAllParams().length,
      },
    });

    return {
      memoriesFormed: memories.length,
      calibrationsPerformed: calibrations.length,
      strategiesUpdated: 0, // Strategies are updated on execution, not in cycle
      insights,
      timestamp: Date.now(),
    };
  }

  /**
   * Log an operational event
   */
  async logOperation(
    eventType: string,
    context: Record<string, any>,
    decision: string,
    outcome: 'success' | 'failure' | 'pending',
    metrics?: Record<string, number>
  ): Promise<void> {
    await this.logger.log({
      eventType,
      context,
      decision,
      outcome,
      metrics,
    });
  }

  /**
   * Register a calibration parameter
   */
  registerCalibrationParam(
    name: string,
    value: number,
    min: number,
    max: number,
    step: number
  ): void {
    this.calibrationEngine.registerParam({
      name,
      value,
      min,
      max,
      step,
    });
  }

  /**
   * Register a strategy
   */
  registerStrategy(
    id: string,
    name: string,
    description: string,
    parameters: Record<string, number>,
    conditions: Record<string, any>
  ): void {
    this.adaptiveStrategies.registerStrategy({
      id,
      name,
      description,
      parameters,
      conditions,
    });
  }

  /**
   * Select optimal strategy for current conditions
   */
  async selectStrategy(currentConditions: Record<string, any>): Promise<StrategySelection | null> {
    return this.adaptiveStrategies.selectStrategy(currentConditions);
  }

  /**
   * Update strategy performance after execution
   */
  updateStrategyPerformance(strategyId: string, success: boolean): void {
    this.adaptiveStrategies.updateStrategyPerformance(strategyId, success);
  }

  /**
   * Get learning statistics
   */
  async getStatistics(): Promise<{
    totalOperations: number;
    successRate: number;
    totalMemories: number;
    totalStrategies: number;
    topStrategies: Strategy[];
  }> {
    const summary = await this.logger.getSummary();
    const totalOps = summary.successCount + summary.failureCount + summary.pendingCount;
    const successRate = totalOps > 0 ? summary.successCount / totalOps : 0;

    return {
      totalOperations: totalOps,
      successRate,
      totalMemories: this.memoryFormation.getMemoryCount(),
      totalStrategies: this.adaptiveStrategies.getAllStrategies().length,
      topStrategies: this.adaptiveStrategies.getTopStrategies(3),
    };
  }

  /**
   * Get recent insights
   */
  async getRecentInsights(limit: number = 10): Promise<StrategicMemory[]> {
    return this.memoryFormation.query({
      type: 'insight',
      limit,
    });
  }

  /**
   * Get calibration history
   */
  getCalibrationHistory(): CalibrationResult[] {
    return this.calibrationEngine.getCalibrationHistory();
  }

  /**
   * Check if knowledge loop is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get all components for advanced usage
   */
  getComponents() {
    return {
      logger: this.logger,
      calibrationEngine: this.calibrationEngine,
      memoryFormation: this.memoryFormation,
      adaptiveStrategies: this.adaptiveStrategies,
    };
  }
}
