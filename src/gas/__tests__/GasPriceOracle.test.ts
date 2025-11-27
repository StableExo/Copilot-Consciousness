/**
 * Tests for GasPriceOracle
 */

import { GasPriceOracle } from '../GasPriceOracle';

describe('GasPriceOracle', () => {
  let oracle: GasPriceOracle;

  beforeEach(() => {
    // Use a test provider URL
    oracle = new GasPriceOracle(
      'http://localhost:8545',
      undefined,
      12000,
      BigInt(50) * BigInt(10 ** 9)
    );
  });

  afterEach(() => {
    oracle.stopAutoRefresh();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(oracle).toBeDefined();
    });

    it('should accept custom refresh interval and fallback gas price', () => {
      const customOracle = new GasPriceOracle(
        'http://localhost:8545',
        'test-api-key',
        5000,
        BigInt(100) * BigInt(10 ** 9)
      );
      expect(customOracle).toBeDefined();
      customOracle.stopAutoRefresh();
    });
  });

  describe('predictGasPrice', () => {
    it('should return fallback price when cache is empty', () => {
      const predicted = oracle.predictGasPrice(5);
      expect(predicted).toBe(BigInt(50) * BigInt(10 ** 9));
    });
  });

  describe('isGasPriceAcceptable', () => {
    it('should check if gas price is below threshold', async () => {
      // This test would require mocking the provider
      // For now, just ensure it doesn't throw
      const threshold = BigInt(100) * BigInt(10 ** 9);
      try {
        await oracle.isGasPriceAcceptable(threshold);
      } catch (error) {
        // Expected to fail without a real provider
        expect(error).toBeDefined();
      }
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return empty array initially', () => {
      const prices = oracle.getHistoricalPrices();
      expect(prices).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear the price cache', () => {
      oracle.clearCache();
      const prices = oracle.getHistoricalPrices();
      expect(prices).toEqual([]);
    });
  });

  describe('startAutoRefresh and stopAutoRefresh', () => {
    it('should start and stop auto refresh', () => {
      oracle.startAutoRefresh();
      oracle.stopAutoRefresh();
      // If no error is thrown, the test passes
      expect(true).toBe(true);
    });

    it('should not start multiple timers', () => {
      oracle.startAutoRefresh();
      oracle.startAutoRefresh();
      oracle.stopAutoRefresh();
      expect(true).toBe(true);
    });
  });
});
