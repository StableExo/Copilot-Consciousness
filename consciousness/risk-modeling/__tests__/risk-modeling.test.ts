/**
 * Tests for Risk Modeling modules
 */

import { RiskAssessor, RiskCategory, RiskLevel } from '../risk-assessor';
import { RiskCalibrator } from '../risk-calibrator';
import { ThresholdManager } from '../threshold-manager';

describe('Risk Modeling', () => {
  describe('RiskAssessor', () => {
    it('should register risk factors', () => {
      const assessor = new RiskAssessor();
      
      const factor = assessor.registerFactor(
        'System Load',
        RiskCategory.OPERATIONAL,
        0.8,
        0.7
      );

      expect(factor.name).toBe('System Load');
      expect(factor.category).toBe(RiskCategory.OPERATIONAL);
      expect(factor.weight).toBe(0.8);
      expect(factor.threshold).toBe(0.7);
    });

    it('should update factor values', () => {
      const assessor = new RiskAssessor();
      const factor = assessor.registerFactor('Test', RiskCategory.TECHNICAL, 0.5);

      const updated = assessor.updateFactor(factor.id, 0.6);
      expect(updated).toBe(true);
    });

    it('should perform risk assessment', () => {
      const assessor = new RiskAssessor();
      
      const loadFactor = assessor.registerFactor('Load', RiskCategory.OPERATIONAL, 0.8);
      const errorsFactor = assessor.registerFactor('Errors', RiskCategory.TECHNICAL, 0.9);

      const assessment = assessor.assess('system-1', 'system', {
        [loadFactor.id]: 0.6,
        [errorsFactor.id]: 0.3
      });

      expect(assessment.targetId).toBe('system-1');
      expect(assessment.overallRiskScore).toBeGreaterThan(0);
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.factors.length).toBeGreaterThan(0);
    });

    it('should determine correct risk levels', () => {
      const assessor = new RiskAssessor();
      const factor = assessor.registerFactor('Critical', RiskCategory.COMPLIANCE, 1.0);

      // Low risk
      let assessment = assessor.assess('t1', 'test', { [factor.id]: 0.1 });
      expect(assessment.riskLevel).toBe(RiskLevel.MINIMAL);

      // High risk
      assessment = assessor.assess('t2', 'test', { [factor.id]: 0.9 });
      expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(assessment.riskLevel);
    });
  });

  describe('RiskCalibrator', () => {
    it('should record calibration data', () => {
      const calibrator = new RiskCalibrator({ minDataPoints: 5 });
      
      calibrator.recordDataPoint(0.7, 0.6, 'SUCCESS', {});
      calibrator.recordDataPoint(0.8, 0.75, 'SUCCESS', {});

      const metrics = calibrator.getMetrics();
      expect(metrics.dataPoints).toBe(2);
    });

    it('should calculate calibration metrics', () => {
      const calibrator = new RiskCalibrator({ minDataPoints: 3 });
      
      // Add sufficient data points
      for (let i = 0; i < 5; i++) {
        calibrator.recordDataPoint(0.5, 0.48, 'SUCCESS', {});
      }

      const result = calibrator.calibrate();
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
    });

    it('should track bias in predictions', () => {
      const calibrator = new RiskCalibrator({ minDataPoints: 3 });
      
      // Consistent over-prediction
      calibrator.recordDataPoint(0.3, 0.6, 'PARTIAL', {});
      calibrator.recordDataPoint(0.4, 0.7, 'PARTIAL', {});
      calibrator.recordDataPoint(0.35, 0.65, 'PARTIAL', {});

      const metrics = calibrator.getMetrics();
      expect(metrics.bias).toBeGreaterThan(0); // Over-predicting
    });
  });

  describe('ThresholdManager', () => {
    it('should define thresholds', () => {
      const manager = new ThresholdManager();
      
      const threshold = manager.defineThreshold(
        'High Load',
        'system.load',
        0.8,
        'GREATER_THAN',
        'WARNING'
      );

      expect(threshold.name).toBe('High Load');
      expect(threshold.metric).toBe('system.load');
      expect(threshold.value).toBe(0.8);
    });

    it('should detect threshold violations', () => {
      const manager = new ThresholdManager();
      
      manager.defineThreshold('Test', 'metric1', 0.5, 'GREATER_THAN');

      const violations = manager.checkThresholds('metric1', 0.7);
      expect(violations.length).toBe(1);
      expect(violations[0].metricValue).toBe(0.7);
    });

    it('should not trigger during cooldown', () => {
      const manager = new ThresholdManager();
      
      const threshold = manager.defineThreshold(
        'Test',
        'metric1',
        0.5,
        'GREATER_THAN',
        'WARNING',
        5000 // 5 second cooldown
      );

      // First violation
      let violations = manager.checkThresholds('metric1', 0.7);
      expect(violations.length).toBe(1);

      // Second check immediately - should not trigger
      violations = manager.checkThresholds('metric1', 0.8);
      expect(violations.length).toBe(0);
    });

    it('should acknowledge violations', () => {
      const manager = new ThresholdManager();
      
      manager.defineThreshold('Test', 'metric1', 0.5);
      const violations = manager.checkThresholds('metric1', 0.7);
      
      const acknowledged = manager.acknowledgeViolation(violations[0].id, 'admin');
      expect(acknowledged).toBe(true);

      const allViolations = manager.getViolations();
      expect(allViolations[0].acknowledged).toBe(true);
    });
  });
});
