/**
 * ModelMonitor - Production ML system monitoring
 * 
 * Tracks prediction accuracy, model drift, latency, error rates,
 * and triggers alerts when performance degrades.
 */

import { EventEmitter } from 'events';
import { ModelPerformance, ModelAlert, MLPredictions } from '../types';
import { ArbitragePath } from '../../arbitrage/types';

export interface MonitoringConfig {
  accuracyThreshold: number;
  latencyThreshold: number;
  errorRateThreshold: number;
  driftThreshold: number;
  windowSize: number; // Number of predictions to track
}

interface PredictionRecord {
  timestamp: number;
  prediction: MLPredictions;
  actual?: {
    successful: boolean;
    profit: bigint;
  };
  latencyMs: number;
  error?: string;
}

/**
 * ModelMonitor - Monitor ML system health and performance
 */
export class ModelMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private predictions: PredictionRecord[] = [];
  private alerts: ModelAlert[] = [];
  private performanceHistory: ModelPerformance[] = [];
  private isMonitoring: boolean = false;
  private checkInterval?: NodeJS.Timeout;

  // Feature distribution tracking (for drift detection)
  private featureStats: Map<string, { mean: number; std: number; history: number[] }> = new Map();

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = {
      accuracyThreshold: 0.7,
      latencyThreshold: 100, // ms
      errorRateThreshold: 0.05, // 5%
      driftThreshold: 0.3, // 30% change
      windowSize: 1000,
      ...config,
    };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('[ModelMonitor] Starting model monitoring');

    // Run health checks every minute
    this.checkInterval = setInterval(() => {
      this.runHealthChecks();
    }, 60000);

    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    console.log('[ModelMonitor] Monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Record a prediction
   */
  recordPrediction(
    prediction: MLPredictions,
    path: ArbitragePath,
    latencyMs: number
  ): void {
    const record: PredictionRecord = {
      timestamp: Date.now(),
      prediction,
      latencyMs,
    };

    this.predictions.push(record);

    // Keep only recent predictions
    if (this.predictions.length > this.config.windowSize) {
      this.predictions.shift();
    }

    this.emit('prediction_recorded', record);
  }

  /**
   * Record actual outcome for a prediction
   */
  recordOutcome(
    predictionTimestamp: number,
    successful: boolean,
    profit: bigint
  ): void {
    // Find matching prediction
    const prediction = this.predictions.find(
      p => Math.abs(p.timestamp - predictionTimestamp) < 10000 // Within 10 seconds
    );

    if (prediction) {
      prediction.actual = { successful, profit };
      this.emit('outcome_recorded', prediction);
    }
  }

  /**
   * Record prediction error
   */
  recordError(error: string, latencyMs: number = 0): void {
    const record: PredictionRecord = {
      timestamp: Date.now(),
      prediction: {
        priceForecasts: [],
        successProbability: 0,
        volatilityForecast: {
          volatility: 0,
          horizon: 0,
          confidenceBand: { lower: 0, upper: 0 },
        },
        matchingPatterns: [],
        confidence: 0,
        recommendation: 'SKIP',
        timestamp: Date.now(),
      },
      latencyMs,
      error,
    };

    this.predictions.push(record);

    if (this.predictions.length > this.config.windowSize) {
      this.predictions.shift();
    }

    this.emit('error_recorded', record);
  }

  /**
   * Track feature distribution for drift detection
   */
  trackFeature(featureName: string, value: number): void {
    if (!this.featureStats.has(featureName)) {
      this.featureStats.set(featureName, {
        mean: value,
        std: 0,
        history: [value],
      });
      return;
    }

    const stats = this.featureStats.get(featureName)!;
    stats.history.push(value);

    // Keep only recent values
    if (stats.history.length > this.config.windowSize) {
      stats.history.shift();
    }

    // Update mean and std
    stats.mean = stats.history.reduce((a, b) => a + b, 0) / stats.history.length;
    stats.std = Math.sqrt(
      stats.history.reduce((sum, v) => sum + Math.pow(v - stats.mean, 2), 0) / stats.history.length
    );
  }

  /**
   * Run health checks
   */
  private runHealthChecks(): void {
    console.log('[ModelMonitor] Running health checks...');

    // Check prediction accuracy
    this.checkAccuracy();

    // Check latency
    this.checkLatency();

    // Check error rate
    this.checkErrorRate();

    // Check for model drift
    this.checkDrift();

    // Record performance metrics
    this.recordPerformanceMetrics();
  }

  /**
   * Check prediction accuracy
   */
  private checkAccuracy(): void {
    const predictionsWithActual = this.predictions.filter(p => p.actual !== undefined);

    if (predictionsWithActual.length < 10) {
      return; // Not enough data
    }

    // Calculate accuracy (correct direction predictions)
    let correct = 0;
    for (const pred of predictionsWithActual) {
      const predictedSuccess = pred.prediction.successProbability > 0.5;
      const actualSuccess = pred.actual!.successful;
      
      if (predictedSuccess === actualSuccess) {
        correct++;
      }
    }

    const accuracy = correct / predictionsWithActual.length;

    if (accuracy < this.config.accuracyThreshold) {
      this.createAlert(
        'warning',
        'accuracy_drop',
        `Model accuracy (${(accuracy * 100).toFixed(1)}%) below threshold (${(this.config.accuracyThreshold * 100).toFixed(1)}%)`,
        { accuracy, threshold: this.config.accuracyThreshold }
      );
    }
  }

  /**
   * Check prediction latency
   */
  private checkLatency(): void {
    if (this.predictions.length < 10) {
      return;
    }

    const recentPredictions = this.predictions.slice(-100);
    const avgLatency = recentPredictions.reduce((sum, p) => sum + p.latencyMs, 0) / recentPredictions.length;
    const p95Latency = recentPredictions
      .map(p => p.latencyMs)
      .sort((a, b) => a - b)[Math.floor(recentPredictions.length * 0.95)];

    if (avgLatency > this.config.latencyThreshold) {
      this.createAlert(
        'warning',
        'latency_high',
        `Average latency (${avgLatency.toFixed(1)}ms) exceeds threshold (${this.config.latencyThreshold}ms)`,
        { avgLatency, p95Latency, threshold: this.config.latencyThreshold }
      );
    }
  }

  /**
   * Check error rate
   */
  private checkErrorRate(): void {
    if (this.predictions.length < 10) {
      return;
    }

    const errorCount = this.predictions.filter(p => p.error !== undefined).length;
    const errorRate = errorCount / this.predictions.length;

    if (errorRate > this.config.errorRateThreshold) {
      this.createAlert(
        'error',
        'latency_high',
        `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(this.config.errorRateThreshold * 100).toFixed(1)}%)`,
        { errorRate, errorCount, totalPredictions: this.predictions.length }
      );
    }
  }

  /**
   * Check for model drift
   */
  private checkDrift(): void {
    for (const [featureName, stats] of this.featureStats.entries()) {
      if (stats.history.length < 100) {
        continue; // Not enough data
      }

      // Compare recent distribution to overall distribution
      const recentValues = stats.history.slice(-50);
      const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

      // Calculate drift as percentage change
      const drift = Math.abs((recentMean - stats.mean) / (stats.mean || 1));

      if (drift > this.config.driftThreshold) {
        this.createAlert(
          'warning',
          'drift_detected',
          `Feature drift detected for ${featureName}: ${(drift * 100).toFixed(1)}% change`,
          { featureName, drift, recentMean, overallMean: stats.mean }
        );
      }
    }
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetrics(): void {
    const predictionsWithActual = this.predictions.filter(p => p.actual !== undefined);

    if (predictionsWithActual.length < 10) {
      return;
    }

    // Calculate metrics
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (const pred of predictionsWithActual) {
      const predictedSuccess = pred.prediction.successProbability > 0.5;
      const actualSuccess = pred.actual!.successful;

      if (predictedSuccess && actualSuccess) truePositives++;
      else if (!predictedSuccess && !actualSuccess) trueNegatives++;
      else if (predictedSuccess && !actualSuccess) falsePositives++;
      else if (!predictedSuccess && actualSuccess) falseNegatives++;
    }

    const accuracy = (truePositives + trueNegatives) / predictionsWithActual.length;
    const precision = truePositives + falsePositives > 0 
      ? truePositives / (truePositives + falsePositives)
      : 0;
    const recall = truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
    const f1Score = precision + recall > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    const avgLatency = this.predictions.slice(-100).reduce((sum, p) => sum + p.latencyMs, 0) / 
      Math.min(100, this.predictions.length);

    const performance: ModelPerformance = {
      modelVersion: 'v1', // Would be actual version
      accuracy,
      precision,
      recall,
      f1Score,
      latencyMs: avgLatency,
      predictionCount: predictionsWithActual.length,
      timestamp: Date.now(),
    };

    this.performanceHistory.push(performance);

    // Keep only recent history
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }

    this.emit('metrics_recorded', performance);
  }

  /**
   * Create alert
   */
  private createAlert(
    severity: 'info' | 'warning' | 'error',
    type: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: ModelAlert = {
      severity,
      type: type as any,
      message,
      timestamp: Date.now(),
      metadata,
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    console.log(`[ModelMonitor] Alert: [${severity.toUpperCase()}] ${message}`);
    this.emit('alert', alert);
  }

  /**
   * Get recent performance metrics
   */
  getPerformanceMetrics(limit: number = 100): ModelPerformance[] {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ModelAlert[] {
    return this.alerts;
  }

  /**
   * Get statistics
   */
  getStats() {
    const recentPredictions = this.predictions.slice(-100);
    const errorCount = recentPredictions.filter(p => p.error !== undefined).length;
    const avgLatency = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, p) => sum + p.latencyMs, 0) / recentPredictions.length
      : 0;

    return {
      isMonitoring: this.isMonitoring,
      totalPredictions: this.predictions.length,
      recentPredictions: recentPredictions.length,
      errorRate: recentPredictions.length > 0 ? errorCount / recentPredictions.length : 0,
      avgLatency,
      activeAlerts: this.alerts.length,
      featuresTracked: this.featureStats.size,
    };
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.emit('alerts_cleared');
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check recent alerts
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 3600000); // Last hour
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'error');

    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} critical alerts in the last hour`);
    }

    // Check error rate
    const stats = this.getStats();
    if (stats.errorRate > this.config.errorRateThreshold) {
      issues.push(`Error rate (${(stats.errorRate * 100).toFixed(1)}%) above threshold`);
    }

    // Check latency
    if (stats.avgLatency > this.config.latencyThreshold) {
      issues.push(`Latency (${stats.avgLatency.toFixed(1)}ms) above threshold`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}
