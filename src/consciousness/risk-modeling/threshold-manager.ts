/**
 * Threshold Manager
 * 
 * Manages dynamic risk thresholds and alert triggers
 */

export interface Threshold {
  id: string;
  name: string;
  metric: string;
  value: number;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'BETWEEN';
  upperBound?: number; // For BETWEEN operator
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  enabled: boolean;
  lastTriggered?: number;
  triggerCount: number;
  cooldownPeriod: number; // milliseconds before can trigger again
  metadata: Record<string, unknown>;
}

export interface ThresholdViolation {
  id: string;
  thresholdId: string;
  timestamp: number;
  metricValue: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

export interface DynamicThresholdConfig {
  metric: string;
  baseValue: number;
  adaptToHistory: boolean;
  historyWindow: number; // milliseconds
  deviationMultiplier: number; // standard deviations for auto-threshold
}

/**
 * Threshold Management System
 * Manages risk thresholds with dynamic adaptation
 */
export class ThresholdManager {
  private thresholds: Map<string, Threshold> = new Map();
  private violations: Map<string, ThresholdViolation> = new Map();
  private dynamicConfigs: Map<string, DynamicThresholdConfig> = new Map();
  private metricHistory: Map<string, Array<{ timestamp: number; value: number }>> = new Map();
  private maxHistorySize = 1000;

  /**
   * Define a static threshold
   */
  defineThreshold(
    name: string,
    metric: string,
    value: number,
    operator: Threshold['operator'] = 'GREATER_THAN',
    severity: Threshold['severity'] = 'WARNING',
    cooldownPeriod: number = 60000 // 1 minute default
  ): Threshold {
    const threshold: Threshold = {
      id: this.generateId('threshold'),
      name,
      metric,
      value,
      operator,
      severity,
      enabled: true,
      triggerCount: 0,
      cooldownPeriod,
      metadata: {}
    };

    this.thresholds.set(threshold.id, threshold);
    return threshold;
  }

  /**
   * Define a dynamic threshold that adapts to historical data
   */
  defineDynamicThreshold(
    name: string,
    metric: string,
    baseValue: number,
    config: Partial<DynamicThresholdConfig> = {}
  ): Threshold {
    const dynamicConfig: DynamicThresholdConfig = {
      metric,
      baseValue,
      adaptToHistory: true,
      historyWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      deviationMultiplier: 2.0, // 2 standard deviations
      ...config
    };

    this.dynamicConfigs.set(metric, dynamicConfig);

    return this.defineThreshold(
      name,
      metric,
      baseValue,
      'GREATER_THAN',
      'WARNING'
    );
  }

  /**
   * Check a metric value against thresholds
   */
  checkThresholds(metric: string, value: number): ThresholdViolation[] {
    // Record metric value
    this.recordMetricValue(metric, value);

    // Update dynamic thresholds
    this.updateDynamicThresholds(metric);

    const violations: ThresholdViolation[] = [];

    // Check all thresholds for this metric
    this.thresholds.forEach(threshold => {
      if (threshold.metric !== metric || !threshold.enabled) return;

      // Check cooldown
      if (threshold.lastTriggered) {
        const timeSinceLast = Date.now() - threshold.lastTriggered;
        if (timeSinceLast < threshold.cooldownPeriod) {
          return;
        }
      }

      // Check if threshold is violated
      const violated = this.evaluateThreshold(threshold, value);

      if (violated) {
        const violation = this.createViolation(threshold, value);
        violations.push(violation);

        // Update threshold
        threshold.lastTriggered = Date.now();
        threshold.triggerCount++;
      }
    });

    return violations;
  }

  /**
   * Get all violations
   */
  getViolations(
    options: {
      acknowledged?: boolean;
      severity?: 'INFO' | 'WARNING' | 'CRITICAL';
      since?: number;
      limit?: number;
    } = {}
  ): ThresholdViolation[] {
    let violations = Array.from(this.violations.values());

    if (options.acknowledged !== undefined) {
      violations = violations.filter(v => v.acknowledged === options.acknowledged);
    }

    if (options.severity) {
      violations = violations.filter(v => v.severity === options.severity);
    }

    if (options.since !== undefined) {
      violations = violations.filter(v => v.timestamp >= (options.since as number));
    }

    violations.sort((a, b) => b.timestamp - a.timestamp);

    if (options.limit) {
      violations = violations.slice(0, options.limit);
    }

    return violations;
  }

  /**
   * Acknowledge a violation
   */
  acknowledgeViolation(violationId: string, acknowledgedBy: string): boolean {
    const violation = this.violations.get(violationId);
    if (!violation) return false;

    violation.acknowledged = true;
    violation.acknowledgedAt = Date.now();
    violation.acknowledgedBy = acknowledgedBy;

    return true;
  }

  /**
   * Update threshold value
   */
  updateThreshold(thresholdId: string, value: number, upperBound?: number): boolean {
    const threshold = this.thresholds.get(thresholdId);
    if (!threshold) return false;

    threshold.value = value;
    if (upperBound !== undefined) {
      threshold.upperBound = upperBound;
    }

    return true;
  }

  /**
   * Enable/disable a threshold
   */
  setThresholdEnabled(thresholdId: string, enabled: boolean): boolean {
    const threshold = this.thresholds.get(thresholdId);
    if (!threshold) return false;

    threshold.enabled = enabled;
    return true;
  }

  /**
   * Get threshold by metric
   */
  getThresholdsByMetric(metric: string): Threshold[] {
    return Array.from(this.thresholds.values())
      .filter(t => t.metric === metric);
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    unacknowledged: number;
    bySeverity: Record<string, number>;
    byMetric: Record<string, number>;
    recentTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  } {
    const violations = Array.from(this.violations.values());

    const bySeverity = {
      INFO: violations.filter(v => v.severity === 'INFO').length,
      WARNING: violations.filter(v => v.severity === 'WARNING').length,
      CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length
    };

    const byMetric: Record<string, number> = {};
    violations.forEach(v => {
      const threshold = this.thresholds.get(v.thresholdId);
      if (threshold) {
        byMetric[threshold.metric] = (byMetric[threshold.metric] || 0) + 1;
      }
    });

    // Calculate trend
    const now = Date.now();
    const lastWeek = violations.filter(v => now - v.timestamp < 7 * 24 * 60 * 60 * 1000).length;
    const previousWeek = violations.filter(v => {
      const age = now - v.timestamp;
      return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
    }).length;

    let recentTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    if (Math.abs(lastWeek - previousWeek) < 3) {
      recentTrend = 'STABLE';
    } else if (lastWeek > previousWeek) {
      recentTrend = 'INCREASING';
    } else {
      recentTrend = 'DECREASING';
    }

    return {
      total: violations.length,
      unacknowledged: violations.filter(v => !v.acknowledged).length,
      bySeverity,
      byMetric,
      recentTrend
    };
  }

  /**
   * Export threshold data
   */
  export(): {
    thresholds: Threshold[];
    violations: ThresholdViolation[];
    dynamicConfigs: Array<{ metric: string; config: DynamicThresholdConfig }>;
  } {
    return {
      thresholds: Array.from(this.thresholds.values()),
      violations: Array.from(this.violations.values()),
      dynamicConfigs: Array.from(this.dynamicConfigs.entries()).map(([metric, config]) => ({
        metric,
        config
      }))
    };
  }

  /**
   * Import threshold data
   */
  import(data: {
    thresholds: Threshold[];
    violations: ThresholdViolation[];
    dynamicConfigs: Array<{ metric: string; config: DynamicThresholdConfig }>;
  }): void {
    this.thresholds.clear();
    this.violations.clear();
    this.dynamicConfigs.clear();

    data.thresholds.forEach(t => this.thresholds.set(t.id, t));
    data.violations.forEach(v => this.violations.set(v.id, v));
    data.dynamicConfigs.forEach(({ metric, config }) => {
      this.dynamicConfigs.set(metric, config);
    });
  }

  private recordMetricValue(metric: string, value: number): void {
    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, []);
    }

    const history = this.metricHistory.get(metric)!;
    history.push({ timestamp: Date.now(), value });

    // Maintain size limit
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private updateDynamicThresholds(metric: string): void {
    const config = this.dynamicConfigs.get(metric);
    if (!config || !config.adaptToHistory) return;

    const history = this.metricHistory.get(metric);
    if (!history || history.length < 10) return;

    // Filter to history window
    const now = Date.now();
    const windowHistory = history.filter(
      h => now - h.timestamp <= config.historyWindow
    );

    if (windowHistory.length < 10) return;

    // Calculate statistics
    const values = windowHistory.map(h => h.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Update threshold to mean + N standard deviations
    const newThreshold = mean + (stdDev * config.deviationMultiplier);

    // Update all thresholds for this metric
    this.thresholds.forEach(threshold => {
      if (threshold.metric === metric) {
        threshold.value = newThreshold;
      }
    });
  }

  private evaluateThreshold(threshold: Threshold, value: number): boolean {
    switch (threshold.operator) {
      case 'GREATER_THAN':
        return value > threshold.value;
      
      case 'LESS_THAN':
        return value < threshold.value;
      
      case 'EQUALS':
        return Math.abs(value - threshold.value) < 0.001;
      
      case 'BETWEEN':
        if (threshold.upperBound === undefined) return false;
        return value >= threshold.value && value <= threshold.upperBound;
      
      default:
        return false;
    }
  }

  private createViolation(threshold: Threshold, value: number): ThresholdViolation {
    const violation: ThresholdViolation = {
      id: this.generateId('violation'),
      thresholdId: threshold.id,
      timestamp: Date.now(),
      metricValue: value,
      severity: threshold.severity,
      message: `${threshold.name}: ${threshold.metric} is ${value.toFixed(3)} (threshold: ${threshold.value.toFixed(3)})`,
      acknowledged: false
    };

    this.violations.set(violation.id, violation);
    return violation;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
