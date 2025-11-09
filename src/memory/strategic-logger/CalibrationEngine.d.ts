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
export declare class CalibrationEngine {
    private logger;
    private params;
    private calibrationHistory;
    constructor(logger: BlackBoxLogger);
    /**
     * Register a parameter for calibration
     */
    registerParam(param: CalibrationParams): void;
    /**
     * Analyze performance metrics from operational logs
     */
    analyzePerformance(query?: LogQuery, timeWindowMs?: number): Promise<PerformanceMetrics>;
    /**
     * Calibrate a parameter based on performance
     */
    calibrate(paramName: string, targetMetric: 'successRate' | 'profit' | 'gasCost', optimizationGoal?: 'maximize' | 'minimize'): Promise<CalibrationResult | null>;
    /**
     * Get current parameter value
     */
    getParam(name: string): number | undefined;
    /**
     * Get all parameters
     */
    getAllParams(): CalibrationParams[];
    /**
     * Get calibration history
     */
    getCalibrationHistory(): CalibrationResult[];
    /**
     * Calculate confidence score based on sample size
     */
    private calculateConfidence;
    /**
     * Calculate average of numbers
     */
    private average;
    /**
     * Auto-calibrate all registered parameters
     */
    autoCalibrate(): Promise<CalibrationResult[]>;
}
//# sourceMappingURL=CalibrationEngine.d.ts.map