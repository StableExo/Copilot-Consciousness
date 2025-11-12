/**
 * Risk Calibrator
 * 
 * Adapted from AxionCitadel's mev-risk-calibration.json approach
 * Dynamically calibrates risk parameters based on historical data
 */

export interface CalibrationData {
  timestamp: number;
  actualRisk: number; // 0-1, what actually happened
  predictedRisk: number; // 0-1, what was predicted
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  factors: Record<string, number>;
}

export interface CalibrationResult {
  accuracy: number; // 0-1
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  recommendedAdjustments: Record<string, number>;
  confidence: number;
}

export interface CalibrationConfig {
  minDataPoints: number;
  calibrationInterval: number; // milliseconds
  learningRate: number;
  targetAccuracy: number;
}

/**
 * Risk Calibration System
 * Tunes risk assessment parameters based on historical accuracy
 */
export class RiskCalibrator {
  private calibrationHistory: CalibrationData[] = [];
  private config: CalibrationConfig;
  private lastCalibration: number = 0;
  private parameterAdjustments: Map<string, number> = new Map();

  constructor(config?: Partial<CalibrationConfig>) {
    this.calibrationHistory = [];
    this.config = {
      minDataPoints: 50,
      calibrationInterval: 24 * 60 * 60 * 1000, // 24 hours
      learningRate: 0.1,
      targetAccuracy: 0.85,
      ...config
    };
  }

  /**
   * Record calibration data point
   */
  recordDataPoint(
    actualRisk: number,
    predictedRisk: number,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    factors: Record<string, number>
  ): void {
    const dataPoint: CalibrationData = {
      timestamp: Date.now(),
      actualRisk: Math.max(0, Math.min(1, actualRisk)),
      predictedRisk: Math.max(0, Math.min(1, predictedRisk)),
      outcome,
      factors
    };

    this.calibrationHistory.push(dataPoint);

    // Limit history size
    if (this.calibrationHistory.length > 10000) {
      this.calibrationHistory.shift();
    }

    // Auto-calibrate if needed
    if (this.shouldCalibrate()) {
      this.calibrate();
    }
  }

  /**
   * Perform calibration
   */
  calibrate(): CalibrationResult {
    if (this.calibrationHistory.length < this.config.minDataPoints) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        recommendedAdjustments: {},
        confidence: 0
      };
    }

    const threshold = 0.5; // Risk threshold for classification

    // Calculate confusion matrix
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    this.calibrationHistory.forEach(data => {
      const predictedHigh = data.predictedRisk >= threshold;
      const actualHigh = data.actualRisk >= threshold;

      if (predictedHigh && actualHigh) truePositives++;
      else if (!predictedHigh && !actualHigh) trueNegatives++;
      else if (predictedHigh && !actualHigh) falsePositives++;
      else if (!predictedHigh && actualHigh) falseNegatives++;
    });

    const total = this.calibrationHistory.length;
    const accuracy = (truePositives + trueNegatives) / total;
    const precision = truePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
    const recall = truePositives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
    const falsePositiveRate = falsePositives > 0
      ? falsePositives / (falsePositives + trueNegatives)
      : 0;
    const falseNegativeRate = falseNegatives > 0
      ? falseNegatives / (falseNegatives + truePositives)
      : 0;

    // Calculate recommended adjustments
    const recommendedAdjustments = this.calculateAdjustments();

    // Apply adjustments to parameter map
    Object.entries(recommendedAdjustments).forEach(([param, adjustment]) => {
      this.parameterAdjustments.set(param, adjustment);
    });

    this.lastCalibration = Date.now();

    const confidence = this.calculateCalibrationConfidence(accuracy, total);

    return {
      accuracy,
      precision,
      recall,
      falsePositiveRate,
      falseNegativeRate,
      recommendedAdjustments,
      confidence
    };
  }

  /**
   * Get current parameter adjustments
   */
  getAdjustments(): Record<string, number> {
    const adjustments: Record<string, number> = {};
    this.parameterAdjustments.forEach((value, key) => {
      adjustments[key] = value;
    });
    return adjustments;
  }

  /**
   * Get calibration metrics
   */
  getMetrics(): {
    dataPoints: number;
    lastCalibration: number | null;
    averageError: number;
    bias: number; // Positive = over-prediction, Negative = under-prediction
  } {
    if (this.calibrationHistory.length === 0) {
      return {
        dataPoints: 0,
        lastCalibration: null,
        averageError: 0,
        bias: 0
      };
    }

    const errors = this.calibrationHistory.map(
      d => d.predictedRisk - d.actualRisk
    );

    const averageError = errors.reduce(
      (sum, e) => sum + Math.abs(e),
      0
    ) / errors.length;

    const bias = errors.reduce((sum, e) => sum + e, 0) / errors.length;

    return {
      dataPoints: this.calibrationHistory.length,
      lastCalibration: this.lastCalibration || null,
      averageError,
      bias
    };
  }

  /**
   * Get factor importance analysis
   */
  analyzeFactorImportance(): Record<string, {
    correlation: number;
    predictivePower: number;
  }> {
    const factorNames = new Set<string>();
    this.calibrationHistory.forEach(data => {
      Object.keys(data.factors).forEach(name => factorNames.add(name));
    });

    const analysis: Record<string, { correlation: number; predictivePower: number }> = {};

    factorNames.forEach(factorName => {
      const correlation = this.calculateFactorCorrelation(factorName);
      const predictivePower = this.calculatePredictivePower(factorName);
      
      analysis[factorName] = { correlation, predictivePower };
    });

    return analysis;
  }

  /**
   * Export calibration data
   */
  export(): {
    history: CalibrationData[];
    adjustments: Record<string, number>;
    config: CalibrationConfig;
  } {
    return {
      history: [...this.calibrationHistory],
      adjustments: this.getAdjustments(),
      config: { ...this.config }
    };
  }

  /**
   * Import calibration data
   */
  import(data: {
    history: CalibrationData[];
    adjustments: Record<string, number>;
    config?: CalibrationConfig;
  }): void {
    this.calibrationHistory = [...data.history];
    
    this.parameterAdjustments.clear();
    Object.entries(data.adjustments).forEach(([key, value]) => {
      this.parameterAdjustments.set(key, value);
    });

    if (data.config) {
      this.config = data.config;
    }
  }

  private shouldCalibrate(): boolean {
    if (this.calibrationHistory.length < this.config.minDataPoints) {
      return false;
    }

    if (this.lastCalibration === 0) {
      return true;
    }

    return Date.now() - this.lastCalibration >= this.config.calibrationInterval;
  }

  private calculateAdjustments(): Record<string, number> {
    const adjustments: Record<string, number> = {};

    // Analyze prediction errors
    const metrics = this.getMetrics();
    
    // If we're consistently over-predicting, reduce base risk
    if (metrics.bias > 0.1) {
      adjustments.baseRiskLevel = -this.config.learningRate * metrics.bias;
    } else if (metrics.bias < -0.1) {
      adjustments.baseRiskLevel = -this.config.learningRate * metrics.bias;
    }

    // Adjust sensitivity based on error magnitude
    if (metrics.averageError > 0.2) {
      adjustments.sensitivityFactor = this.config.learningRate * (0.2 - metrics.averageError);
    }

    // Factor-specific adjustments
    const factorImportance = this.analyzeFactorImportance();
    Object.entries(factorImportance).forEach(([factor, analysis]) => {
      if (analysis.predictivePower < 0.3) {
        adjustments[`${factor}_weight`] = -this.config.learningRate * 0.5;
      } else if (analysis.predictivePower > 0.8) {
        adjustments[`${factor}_weight`] = this.config.learningRate * 0.3;
      }
    });

    return adjustments;
  }

  private calculateFactorCorrelation(factorName: string): number {
    const dataWithFactor = this.calibrationHistory.filter(
      d => d.factors[factorName] !== undefined
    );

    if (dataWithFactor.length < 10) return 0;

    const xValues = dataWithFactor.map(d => d.factors[factorName]);
    const yValues = dataWithFactor.map(d => d.actualRisk);

    return this.pearsonCorrelation(xValues, yValues);
  }

  private calculatePredictivePower(factorName: string): number {
    const dataWithFactor = this.calibrationHistory.filter(
      d => d.factors[factorName] !== undefined
    );

    if (dataWithFactor.length < 10) return 0;

    // Simple predictive power: how well does this factor predict high risk?
    const threshold = 0.5;
    const highRiskData = dataWithFactor.filter(d => d.actualRisk >= threshold);
    const lowRiskData = dataWithFactor.filter(d => d.actualRisk < threshold);

    if (highRiskData.length === 0 || lowRiskData.length === 0) return 0;

    const highRiskAvg = highRiskData.reduce((sum, d) => sum + d.factors[factorName], 0) / highRiskData.length;
    const lowRiskAvg = lowRiskData.reduce((sum, d) => sum + d.factors[factorName], 0) / lowRiskData.length;

    // Larger difference = better predictive power
    return Math.min(1, Math.abs(highRiskAvg - lowRiskAvg));
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0 || n !== y.length) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private calculateCalibrationConfidence(accuracy: number, dataPoints: number): number {
    // Confidence based on accuracy and sample size
    const accuracyScore = accuracy;
    const sampleScore = Math.min(1, dataPoints / 1000); // Full confidence at 1000+ samples
    
    return (accuracyScore * 0.7 + sampleScore * 0.3);
  }
}
