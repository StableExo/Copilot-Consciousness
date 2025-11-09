/**
 * Tests for MEV Awareness Intelligence Layer
 * Validates the integration of MEV risk modeling, sensors, and profit calculation
 */

import {
  MEVRiskModel,
  ProfitCalculator,
  MEVSensorHub,
  TransactionType,
  MempoolCongestion,
  SearcherDensity,
} from '../index';
import { ethers } from 'ethers';

describe('MEV Awareness Intelligence Layer', () => {
  describe('Module Exports', () => {
    it('should export MEVRiskModel', () => {
      expect(MEVRiskModel).toBeDefined();
      const model = new MEVRiskModel();
      expect(model).toBeInstanceOf(MEVRiskModel);
    });

    it('should export ProfitCalculator', () => {
      expect(ProfitCalculator).toBeDefined();
      const calculator = new ProfitCalculator();
      expect(calculator).toBeInstanceOf(ProfitCalculator);
    });

    it('should export MEVSensorHub', () => {
      expect(MEVSensorHub).toBeDefined();
    });

    it('should export MempoolCongestion sensor', () => {
      expect(MempoolCongestion).toBeDefined();
    });

    it('should export SearcherDensity sensor', () => {
      expect(SearcherDensity).toBeDefined();
    });

    it('should export TransactionType enum', () => {
      expect(TransactionType).toBeDefined();
      expect(TransactionType.ARBITRAGE).toBeDefined();
      expect(TransactionType.FRONT_RUNNABLE).toBeDefined();
    });
  });

  describe('Integration - MEVRiskModel with ProfitCalculator', () => {
    let riskModel: MEVRiskModel;
    let calculator: ProfitCalculator;

    beforeEach(() => {
      riskModel = new MEVRiskModel();
      calculator = new ProfitCalculator(riskModel);
    });

    it('should calculate profit with MEV risk adjustment', () => {
      const result = calculator.calculateProfit(
        1.0, // revenue
        0.1, // gas cost
        0.5, // tx value
        TransactionType.ARBITRAGE,
        0.5 // mempool congestion
      );

      expect(result.grossProfit).toBe(0.9);
      expect(result.adjustedProfit).toBeLessThan(result.grossProfit);
      expect(result.mevRisk).toBeGreaterThan(0);
      expect(result.riskRatio).toBeGreaterThan(0);
    });

    it('should have higher MEV risk for front-runnable transactions', () => {
      const arbResult = calculator.calculateProfit(
        1.0,
        0.1,
        0.5,
        TransactionType.ARBITRAGE,
        0.5
      );

      const frontrunResult = calculator.calculateProfit(
        1.0,
        0.1,
        0.5,
        TransactionType.FRONT_RUNNABLE,
        0.5
      );

      expect(frontrunResult.mevRisk).toBeGreaterThan(arbResult.mevRisk);
      expect(frontrunResult.adjustedProfit).toBeLessThan(arbResult.adjustedProfit);
    });

    it('should handle custom risk model parameters', () => {
      const customRiskModel = new MEVRiskModel({
        baseRisk: 0.002,
        valueSensitivity: 0.2,
      });
      const customCalculator = new ProfitCalculator(customRiskModel);

      const result = customCalculator.calculateProfit(
        1.0,
        0.1,
        0.5,
        TransactionType.ARBITRAGE,
        0.5
      );

      expect(result.mevRisk).toBeGreaterThan(0);
    });
  });

  describe('Integration - Sensor System', () => {
    let provider: ethers.providers.Provider;

    beforeEach(() => {
      // Create a mock provider for testing
      provider = new ethers.providers.JsonRpcProvider();
    });

    it('should create MempoolCongestion sensor', () => {
      const sensor = new MempoolCongestion(provider);
      expect(sensor).toBeDefined();
    });

    it('should create SearcherDensity sensor', () => {
      const sensor = new SearcherDensity(provider);
      expect(sensor).toBeDefined();
    });

    it('should create MEVSensorHub with sensors', () => {
      const hub = new MEVSensorHub(provider, 5000);
      expect(hub).toBeDefined();
      expect(hub.isActive()).toBe(false);
    });

    it('should start and stop sensor hub', () => {
      const hub = new MEVSensorHub(provider, 1000);
      
      hub.start();
      expect(hub.isActive()).toBe(true);

      hub.stop();
      expect(hub.isActive()).toBe(false);
    });

    it('should get risk params from hub', () => {
      const hub = new MEVSensorHub(provider);
      const params = hub.getRiskParams();
      
      expect(params).toHaveProperty('mempoolCongestion');
      expect(params).toHaveProperty('searcherDensity');
      expect(params).toHaveProperty('timestamp');
    });
  });

  describe('End-to-End MEV Awareness Flow', () => {
    it('should complete full MEV-aware profit calculation workflow', () => {
      // 1. Create risk model with custom parameters
      const riskModel = new MEVRiskModel({
        baseRisk: 0.001,
        valueSensitivity: 0.15,
        mempoolCongestionFactor: 0.3,
        searcherDensity: 0.25,
      });

      // 2. Create profit calculator with the risk model
      const calculator = new ProfitCalculator(riskModel);

      // 3. Calculate detailed risk
      const detailedRisk = riskModel.calculateDetailedRisk(
        1.0,
        TransactionType.ARBITRAGE,
        0.5
      );

      expect(detailedRisk.riskEth).toBeGreaterThan(0);
      expect(detailedRisk.frontrunProbability).toBe(0.7); // ARBITRAGE default

      // 4. Calculate profit with MEV awareness
      const profit = calculator.calculateProfit(
        2.0, // revenue
        0.2, // gas cost
        1.0, // tx value
        TransactionType.ARBITRAGE,
        0.5
      );

      expect(profit.grossProfit).toBe(1.8);
      expect(profit.adjustedProfit).toBeLessThan(profit.grossProfit);
      expect(profit.netProfitMargin).toBeGreaterThan(0);
    });

    it('should demonstrate risk mitigation through transaction type selection', () => {
      const calculator = new ProfitCalculator();

      const types = [
        TransactionType.LIQUIDITY_PROVISION,
        TransactionType.ARBITRAGE,
        TransactionType.FLASH_LOAN,
        TransactionType.FRONT_RUNNABLE,
      ];

      const results = types.map((type) =>
        calculator.calculateProfit(1.0, 0.1, 0.5, type, 0.5)
      );

      // Verify risk increases across transaction types
      expect(results[0].mevRisk).toBeLessThan(results[1].mevRisk); // LP < ARB
      expect(results[1].mevRisk).toBeLessThan(results[2].mevRisk); // ARB < FLASH
      expect(results[2].mevRisk).toBeLessThan(results[3].mevRisk); // FLASH < FRONTRUN
    });
  });

  describe('Consciousness Framework Integration', () => {
    it('should provide environmental intelligence through MEV awareness', () => {
      // This demonstrates how the consciousness system can use MEV awareness
      // to make informed decisions about transaction execution

      const riskModel = new MEVRiskModel();
      const calculator = new ProfitCalculator(riskModel);

      // Scenario: Multiple arbitrage opportunities
      const opportunities = [
        { revenue: 0.5, gasCost: 0.1, txValue: 0.2 },
        { revenue: 1.0, gasCost: 0.2, txValue: 0.5 },
        { revenue: 2.0, gasCost: 0.3, txValue: 1.0 },
      ];

      // Evaluate each opportunity with MEV awareness
      const evaluations = opportunities.map((opp) =>
        calculator.calculateProfit(
          opp.revenue,
          opp.gasCost,
          opp.txValue,
          TransactionType.ARBITRAGE,
          0.5
        )
      );

      // Select the opportunity with the best adjusted profit
      const best = evaluations.reduce((prev, curr) =>
        curr.adjustedProfit > prev.adjustedProfit ? curr : prev
      );

      expect(best.adjustedProfit).toBeGreaterThan(0);
      expect(evaluations.every((e) => e.adjustedProfit <= best.adjustedProfit)).toBe(
        true
      );
    });
  });
});
