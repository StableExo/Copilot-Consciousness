/**
 * Historical Analyzer
 *
 * Analyzes historical data to extract insights and trends
 */

export interface HistoricalRecord {
  id: string;
  timestamp: number;
  eventType: string;
  data: Record<string, unknown>;
  outcome?: unknown;
  metadata: Record<string, unknown>;
}

export interface TimeSeriesData {
  metric: string;
  dataPoints: Array<{ timestamp: number; value: number }>;
  unit?: string;
}

export interface Trend {
  metric: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  rate: number; // Rate of change
  confidence: number; // 0-1
  startTime: number;
  endTime: number;
  dataPoints: number;
}

export interface Insight {
  id: string;
  type: 'TREND' | 'ANOMALY' | 'PATTERN' | 'CORRELATION';
  description: string;
  significance: number; // 0-1
  evidence: string[];
  timestamp: number;
  metadata: Record<string, unknown>;
}

/**
 * Historical Analysis System
 * Analyzes past data to identify trends, anomalies, and insights
 */
export class HistoricalAnalyzer {
  private records: HistoricalRecord[] = [];
  private insights: Map<string, Insight> = new Map();
  private maxRecords: number = 50000;

  /**
   * Add a historical record
   */
  addRecord(eventType: string, data: Record<string, unknown>, outcome?: unknown): HistoricalRecord {
    const record: HistoricalRecord = {
      id: this.generateId('record'),
      timestamp: Date.now(),
      eventType,
      data,
      outcome,
      metadata: {},
    };

    this.records.push(record);

    // Maintain record limit
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    return record;
  }

  /**
   * Analyze trends in a specific metric
   */
  analyzeTrend(metric: string, timeRange?: { start: number; end: number }): Trend | null {
    const timeSeries = this.getTimeSeries(metric, timeRange);

    if (timeSeries.dataPoints.length < 2) {
      return null;
    }

    const values = timeSeries.dataPoints.map((dp) => dp.value);
    const timestamps = timeSeries.dataPoints.map((dp) => dp.timestamp);

    // Calculate linear regression
    const { slope, confidence } = this.linearRegression(timestamps, values);

    // Determine direction
    let direction: Trend['direction'];
    if (Math.abs(slope) < 0.001) {
      direction = 'STABLE';
    } else if (this.calculateVolatility(values) > 0.5) {
      direction = 'VOLATILE';
    } else if (slope > 0) {
      direction = 'INCREASING';
    } else {
      direction = 'DECREASING';
    }

    return {
      metric,
      direction,
      rate: slope,
      confidence,
      startTime: timestamps[0],
      endTime: timestamps[timestamps.length - 1],
      dataPoints: timeSeries.dataPoints.length,
    };
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(metric: string, timeRange?: { start: number; end: number }): TimeSeriesData {
    let filteredRecords = this.records;

    if (timeRange) {
      filteredRecords = this.records.filter(
        (r) => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      );
    }

    const dataPoints = filteredRecords
      .filter((r) => typeof r.data[metric] === 'number')
      .map((r) => ({
        timestamp: r.timestamp,
        value: r.data[metric] as number,
      }));

    return {
      metric,
      dataPoints,
    };
  }

  /**
   * Detect anomalies in historical data
   */
  detectAnomalies(metric: string, sensitivity: number = 2.0): Insight[] {
    const timeSeries = this.getTimeSeries(metric);
    const values = timeSeries.dataPoints.map((dp) => dp.value);

    if (values.length < 10) return [];

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    const anomalies: Insight[] = [];
    const threshold = sensitivity * stdDev;

    timeSeries.dataPoints.forEach((dp, index) => {
      const deviation = Math.abs(dp.value - mean);

      if (deviation > threshold) {
        const insight: Insight = {
          id: this.generateId('insight'),
          type: 'ANOMALY',
          description: `Anomaly detected in ${metric}: value ${
            dp.value
          } deviates by ${deviation.toFixed(2)} from mean ${mean.toFixed(2)}`,
          significance: Math.min(1, deviation / (threshold * 2)),
          evidence: [
            `Value: ${dp.value}`,
            `Mean: ${mean.toFixed(2)}`,
            `Std Dev: ${stdDev.toFixed(2)}`,
            `Deviation: ${deviation.toFixed(2)} (${(deviation / stdDev).toFixed(2)}σ)`,
          ],
          timestamp: dp.timestamp,
          metadata: { metric, value: dp.value, mean, stdDev },
        };

        anomalies.push(insight);
        this.insights.set(insight.id, insight);
      }
    });

    return anomalies;
  }

  /**
   * Compare two time periods
   */
  comparePeriods(
    metric: string,
    period1: { start: number; end: number },
    period2: { start: number; end: number }
  ): {
    period1Stats: { mean: number; median: number; stdDev: number; count: number };
    period2Stats: { mean: number; median: number; stdDev: number; count: number };
    percentChange: number;
    significant: boolean;
  } {
    const data1 = this.getTimeSeries(metric, period1).dataPoints.map((dp) => dp.value);
    const data2 = this.getTimeSeries(metric, period2).dataPoints.map((dp) => dp.value);

    const stats1 = this.calculateStats(data1);
    const stats2 = this.calculateStats(data2);

    const percentChange = stats1.mean !== 0 ? ((stats2.mean - stats1.mean) / stats1.mean) * 100 : 0;

    // Simple significance test (t-test approximation)
    const pooledStdDev = Math.sqrt((stats1.stdDev ** 2 + stats2.stdDev ** 2) / 2);
    const tStat = Math.abs(stats2.mean - stats1.mean) / pooledStdDev;
    const significant = tStat > 2.0; // Rough threshold

    return {
      period1Stats: stats1,
      period2Stats: stats2,
      percentChange,
      significant,
    };
  }

  /**
   * Get records by event type
   */
  getRecordsByType(
    eventType: string,
    timeRange?: { start: number; end: number }
  ): HistoricalRecord[] {
    let records = this.records.filter((r) => r.eventType === eventType);

    if (timeRange) {
      records = records.filter(
        (r) => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      );
    }

    return records;
  }

  /**
   * Get all insights
   */
  getInsights(type?: Insight['type'], limit: number = 50): Insight[] {
    let insights = Array.from(this.insights.values());

    if (type) {
      insights = insights.filter((i) => i.type === type);
    }

    return insights.sort((a, b) => b.significance - a.significance).slice(0, limit);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalRecords: number;
    eventTypes: string[];
    timeRange: { start: number; end: number } | null;
    totalInsights: number;
    insightsByType: Record<string, number>;
  } {
    const eventTypes = Array.from(new Set(this.records.map((r) => r.eventType)));

    const timeRange =
      this.records.length > 0
        ? {
            start: this.records[0].timestamp,
            end: this.records[this.records.length - 1].timestamp,
          }
        : null;

    const insightsByType: Record<string, number> = {
      TREND: 0,
      ANOMALY: 0,
      PATTERN: 0,
      CORRELATION: 0,
    };

    this.insights.forEach((insight) => {
      insightsByType[insight.type]++;
    });

    return {
      totalRecords: this.records.length,
      eventTypes,
      timeRange,
      totalInsights: this.insights.size,
      insightsByType,
    };
  }

  /**
   * Export historical data
   */
  export(): {
    records: HistoricalRecord[];
    insights: Insight[];
  } {
    return {
      records: [...this.records],
      insights: Array.from(this.insights.values()),
    };
  }

  /**
   * Import historical data
   */
  import(data: { records: HistoricalRecord[]; insights: Insight[] }): void {
    this.records = [...data.records];
    this.insights.clear();
    data.insights.forEach((insight) => {
      this.insights.set(insight.id, insight);
    });
  }

  private calculateStats(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    count: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, count: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    return { mean, median, stdDev, count: values.length };
  }

  private linearRegression(
    x: number[],
    y: number[]
  ): {
    slope: number;
    intercept: number;
    confidence: number;
  } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce(
      (sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2),
      0
    );
    const rSquared = 1 - ssResidual / ssTotal;

    return {
      slope,
      intercept,
      confidence: Math.max(0, Math.min(1, rSquared)),
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    return mean !== 0 ? stdDev / Math.abs(mean) : 0;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
