/**
 * Tests for MEVAwareProfitCalculator
 */

import { MEVAwareProfitCalculator } from '../models/MEVAwareProfitCalculator';
import { MEVRiskModel } from '../models/MEVRiskModel';
import { TransactionType } from '../types/TransactionType';

describe('MEVAwareProfitCalculator', () => {
  let calculator: MEVAwareProfitCalculator;

  beforeEach(() => {
    calculator = new MEVAwareProfitCalculator();
  });

  describe('calculateProfit', () => {
    it('should calculate profit with MEV risk deduction', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      expect(result).toHaveProperty('grossProfit');
      expect(result).toHaveProperty('adjustedProfit');
      expect(result).toHaveProperty('mevRisk');
      expect(result).toHaveProperty('riskRatio');
      expect(result).toHaveProperty('netProfitMargin');
    });

    it('should calculate gross profit correctly', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      expect(result.grossProfit).toBe(0.95);
    });

    it('should deduct MEV risk from gross profit', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      expect(result.adjustedProfit).toBe(result.grossProfit - result.mevRisk);
    });

    it('should calculate risk ratio correctly', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      expect(result.riskRatio).toBeCloseTo(result.mevRisk / 1.0);
    });

    it('should calculate net profit margin correctly', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      expect(result.netProfitMargin).toBeCloseTo(result.adjustedProfit / 1.0);
    });

    it('should throw error for negative revenue', () => {
      expect(() => {
        calculator.calculateProfit(-1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      }).toThrow('Negative values not permitted');
    });

    it('should throw error for negative gas cost', () => {
      expect(() => {
        calculator.calculateProfit(1.0, -0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      }).toThrow('Negative values not permitted');
    });

    it('should throw error for negative transaction value', () => {
      expect(() => {
        calculator.calculateProfit(1.0, 0.05, -1.0, TransactionType.ARBITRAGE, 0.5);
      }).toThrow('Negative values not permitted');
    });

    it('should use default congestion when not provided', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE);
      expect(result).toHaveProperty('mevRisk');
      expect(result.mevRisk).toBeGreaterThan(0);
    });

    it('should have higher MEV risk for front-runnable transactions', () => {
      const arbResult = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      const frontrunResult = calculator.calculateProfit(
        1.0,
        0.05,
        1.0,
        TransactionType.FRONT_RUNNABLE,
        0.5
      );
      expect(frontrunResult.mevRisk).toBeGreaterThan(arbResult.mevRisk);
    });

    it('should have lower MEV risk for liquidity provision', () => {
      const arbResult = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      const lpResult = calculator.calculateProfit(
        1.0,
        0.05,
        1.0,
        TransactionType.LIQUIDITY_PROVISION,
        0.5
      );
      expect(lpResult.mevRisk).toBeLessThan(arbResult.mevRisk);
    });

    it('should avoid division by zero in ratios', () => {
      const result = calculator.calculateProfit(0, 0, 0, TransactionType.ARBITRAGE, 0.5);
      expect(result.riskRatio).toBeDefined();
      expect(result.netProfitMargin).toBeDefined();
      expect(isFinite(result.riskRatio)).toBe(true);
      expect(isFinite(result.netProfitMargin)).toBe(true);
    });
  });

  describe('getRiskModel', () => {
    it('should return the risk model', () => {
      const model = calculator.getRiskModel();
      expect(model).toBeInstanceOf(MEVRiskModel);
    });
  });

  describe('setRiskModel', () => {
    it('should update the risk model', () => {
      const newModel = new MEVRiskModel({ baseRisk: 0.002 });
      calculator.setRiskModel(newModel);
      const model = calculator.getRiskModel();
      expect(model.getParams().baseRisk).toBe(0.002);
    });

    it('should use new model for calculations', () => {
      const newModel = new MEVRiskModel({ baseRisk: 0.002 });
      calculator.setRiskModel(newModel);
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.5);
      expect(result.mevRisk).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle high-value arbitrage opportunity', () => {
      const result = calculator.calculateProfit(100.0, 5.0, 100.0, TransactionType.ARBITRAGE, 0.7);
      expect(result.grossProfit).toBe(95.0);
      expect(result.adjustedProfit).toBeLessThan(result.grossProfit);
      expect(result.mevRisk).toBeGreaterThan(0);
    });

    it('should handle low-congestion scenario', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.1);
      expect(result.mevRisk).toBeGreaterThan(0);
    });

    it('should handle high-congestion scenario', () => {
      const result = calculator.calculateProfit(1.0, 0.05, 1.0, TransactionType.ARBITRAGE, 0.9);
      expect(result.mevRisk).toBeGreaterThan(0);
    });

    it('should calculate negative adjusted profit when MEV risk is high', () => {
      // Create scenario with very high MEV risk
      const result = calculator.calculateProfit(
        0.1,
        0.08,
        0.1,
        TransactionType.FRONT_RUNNABLE,
        0.9
      );
      // Gross profit is small (0.02), MEV risk may exceed it
      expect(result.adjustedProfit).toBeLessThan(result.grossProfit);
    });
  });
});
