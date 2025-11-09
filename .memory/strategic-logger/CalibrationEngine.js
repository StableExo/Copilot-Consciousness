"use strict";
/**
 * CalibrationEngine - Continuous Improvement System
 *
 * Integrated from AxionCitadel's calibration systems.
 * Analyzes operational logs to identify patterns and optimize parameters.
 *
 * This engine implements a feedback loop that adjusts system parameters
 * based on historical performance data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationEngine = void 0;
class CalibrationEngine {
    constructor(logger) {
        this.calibrationHistory = [];
        this.logger = logger;
        this.params = new Map();
    }
    /**
     * Register a parameter for calibration
     */
    registerParam(param) {
        this.params.set(param.name, param);
    }
    /**
     * Analyze performance metrics from operational logs
     */
    async analyzePerformance(query = {}, timeWindowMs = 3600000 // 1 hour default
    ) {
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
        const profits = [];
        const gasCosts = [];
        const executionTimes = [];
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
    async calibrate(paramName, targetMetric, optimizationGoal = 'maximize') {
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
        // Calculate current metric value
        let currentMetricValue = 0;
        switch (targetMetric) {
            case 'successRate':
                currentMetricValue = currentPerformance.successRate;
                break;
            case 'profit':
                currentMetricValue = currentPerformance.avgProfit;
                break;
            case 'gasCost':
                currentMetricValue = currentPerformance.avgGasCost;
                break;
        }
        // Determine adjustment direction
        let newValue = param.value;
        const adjustment = param.step;
        // Simple gradient descent approach
        if (optimizationGoal === 'maximize') {
            // Try increasing the parameter
            newValue = Math.min(param.value + adjustment, param.max);
        }
        else {
            // Try decreasing the parameter
            newValue = Math.max(param.value - adjustment, param.min);
        }
        // Update parameter
        const oldValue = param.value;
        param.value = newValue;
        this.params.set(paramName, param);
        // Record calibration
        const result = {
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
    getParam(name) {
        return this.params.get(name)?.value;
    }
    /**
     * Get all parameters
     */
    getAllParams() {
        return Array.from(this.params.values());
    }
    /**
     * Get calibration history
     */
    getCalibrationHistory() {
        return [...this.calibrationHistory];
    }
    /**
     * Calculate confidence score based on sample size
     */
    calculateConfidence(sampleSize) {
        // Simple confidence calculation: more samples = higher confidence
        // Capped at 0.95
        return Math.min(1 - Math.exp(-sampleSize / 100), 0.95);
    }
    /**
     * Calculate average of numbers
     */
    average(numbers) {
        if (numbers.length === 0)
            return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
    /**
     * Auto-calibrate all registered parameters
     */
    async autoCalibrate() {
        const results = [];
        for (const [name] of this.params) {
            try {
                const result = await this.calibrate(name, 'successRate', 'maximize');
                if (result) {
                    results.push(result);
                }
            }
            catch (error) {
                console.error(`Error calibrating ${name}:`, error);
            }
        }
        return results;
    }
}
exports.CalibrationEngine = CalibrationEngine;
//# sourceMappingURL=CalibrationEngine.js.map