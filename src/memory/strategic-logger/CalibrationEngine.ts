/**
 * CalibrationEngine - Continuous Improvement System
 *
 * Integrated from AxionCitadel's calibration systems.
 * Analyzes operational logs to identify patterns and optimize parameters.
 *
 * This engine implements a feedback loop that adjusts system parameters
 * based on historical performance data.
 */

import { BlackBoxLogger, LogQuery } from './BlackBoxLogger';
// OperationalLog reserved for log analysis features
import type { OperationalLog as _OperationalLog } from './BlackBoxLogger';

export interface CalibrationParams {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface CalibrationResult {
  parameter: string;
  oldValue: number;
  newValue: number;
  confidence: number;
  sampleSize: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  successRate: number;
  avgProfit: number;
  avgGasCost: number;
  avgExecutionTime: number;
  totalAttempts: number;
}

export class CalibrationEngine {
  private logger: BlackBoxLogger;
  private params: Map<string, CalibrationParams>;
  private calibrationHistory: CalibrationResult[] = [];

  constructor(logger: BlackBoxLogger) {
    this.logger = logger;
    this.params = new Map();
  }

  /**
   * Register a parameter for calibration
   */
  registerParam(param: CalibrationParams): void {
    this.params.set(param.name, param);
  }

  /**
   * Analyze performance metrics from operational logs
   */
  async analyzePerformance(
    query: LogQuery = {},
    timeWindowMs: number = 3600000 // 1 hour default
  ): Promise<PerformanceMetrics> {
    const endTime = Date.now();
    const startTime = endTime - timeWindowMs;

    const logs = await this.logger.query({
      ...query,
      startTime,
      endTime,
    });

    if (logs.length === 0) {
      return {
        successRate: 0,
        avgProfit: 0,
        avgGasCost: 0,
        avgExecutionTime: 0,
        totalAttempts: 0,
      };
    }

    const successCount = logs.filter((l) => l.outcome === 'success').length;
    const profits: number[] = [];
    const gasCosts: number[] = [];
    const executionTimes: number[] = [];

    logs.forEach((log) => {
      if (log.metrics) {
        if (log.metrics.profit !== undefined) {
          profits.push(log.metrics.profit);
        }
        if (log.metrics.gasCost !== undefined) {
          gasCosts.push(log.metrics.gasCost);
        }
        if (log.metrics.executionTime !== undefined) {
          executionTimes.push(log.metrics.executionTime);
        }
      }
    });

    return {
      successRate: successCount / logs.length,
      avgProfit: profits.length > 0 ? this.average(profits) : 0,
      avgGasCost: gasCosts.length > 0 ? this.average(gasCosts) : 0,
      avgExecutionTime: executionTimes.length > 0 ? this.average(executionTimes) : 0,
      totalAttempts: logs.length,
    };
  }

  /**
   * Calibrate a parameter based on performance
   */
  async calibrate(
    paramName: string,
    targetMetric: 'successRate' | 'profit' | 'gasCost',
    optimizationGoal: 'maximize' | 'minimize' = 'maximize'
  ): Promise<CalibrationResult | null> {
    const param = this.params.get(paramName);
    if (!param) {
      throw new Error(`Parameter ${paramName} not registered`);
    }

    // Analyze current performance
    const currentPerformance = await this.analyzePerformance();

    if (currentPerformance.totalAttempts < 10) {
      // Not enough data to calibrate
      return null;
    }

    // Calculate current metric value (used for future gradient optimization)
    let _currentMetricValue = 0;
    switch (targetMetric) {
      case 'successRate':
        _currentMetricValue = currentPerformance.successRate;
        break;
      case 'profit':
        _currentMetricValue = currentPerformance.avgProfit;
        break;
      case 'gasCost':
        _currentMetricValue = currentPerformance.avgGasCost;
        break;
    }

    // Determine adjustment direction
    let newValue = param.value;
    const adjustment = param.step;

    // Simple gradient descent approach
    if (optimizationGoal === 'maximize') {
      // Try increasing the parameter
      newValue = Math.min(param.value + adjustment, param.max);
    } else {
      // Try decreasing the parameter
      newValue = Math.max(param.value - adjustment, param.min);
    }

    // Update parameter
    const oldValue = param.value;
    param.value = newValue;
    this.params.set(paramName, param);

    // Record calibration
    const result: CalibrationResult = {
      parameter: paramName,
      oldValue,
      newValue,
      confidence: this.calculateConfidence(currentPerformance.totalAttempts),
      sampleSize: currentPerformance.totalAttempts,
      timestamp: Date.now(),
    };

    this.calibrationHistory.push(result);

    return result;
  }

  /**
   * Get current parameter value
   */
  getParam(name: string): number | undefined {
    return this.params.get(name)?.value;
  }

  /**
   * Get all parameters
   */
  getAllParams(): CalibrationParams[] {
    return Array.from(this.params.values());
  }

  /**
   * Get calibration history
   */
  getCalibrationHistory(): CalibrationResult[] {
    return [...this.calibrationHistory];
  }

  /**
   * Calculate confidence score based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    // Simple confidence calculation: more samples = higher confidence
    // Capped at 0.95
    return Math.min(1 - Math.exp(-sampleSize / 100), 0.95);
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Auto-calibrate all registered parameters
   */
  async autoCalibrate(): Promise<CalibrationResult[]> {
    const results: CalibrationResult[] = [];

    for (const [name] of this.params) {
      try {
        const result = await this.calibrate(name, 'successRate', 'maximize');
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error calibrating ${name}:`, error);
      }
    }

    return results;
  }
}
