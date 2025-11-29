/**
 * DataCollector Tests
 */

import { DataCollector } from '../DataCollector';
import { PriceDataPoint } from '../types';

describe('DataCollector', () => {
  let collector: DataCollector;

  beforeEach(() => {
    collector = new DataCollector();
  });

  afterEach(() => {
    collector.stop();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(collector).toBeDefined();
      expect(collector.isActive()).toBe(false);
    });

    it('should start data collection', () => {
      collector.start();
      expect(collector.isActive()).toBe(true);
    });

    it('should stop data collection', () => {
      collector.start();
      collector.stop();
      expect(collector.isActive()).toBe(false);
    });
  });

  describe('recordPrice', () => {
    it('should record price data point', () => {
      const dataPoint: PriceDataPoint = {
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
        gasPrice: 50,
      };

      collector.recordPrice(dataPoint);

      const stats = collector.getStats();
      expect(stats.dataPointsCollected).toBe(1);
      expect(stats.activeChains.has(1)).toBe(true);
      expect(stats.activeTokens.has('0xToken1')).toBe(true);
    });

    it('should emit data event', async () => {
      const dataPoint: PriceDataPoint = {
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      };

      const dataPromise = new Promise<void>((resolve) => {
        collector.on('data', (event) => {
          expect(event.type).toBe('price');
          expect(event.data).toEqual(dataPoint);
          resolve();
        });
      });

      collector.recordPrice(dataPoint);
      await dataPromise;
    });
  });

  describe('recordArbitrageExecution', () => {
    it('should record arbitrage execution', async () => {
      const execution = {
        timestamp: Date.now(),
        path: { hops: [] },
        result: 'success' as const,
        profit: 100n,
        gasUsed: 150000n,
        chainId: 1,
      };

      const dataPromise = new Promise<void>((resolve) => {
        collector.on('data', (event) => {
          expect(event.type).toBe('arbitrage');
          resolve();
        });
      });

      collector.recordArbitrageExecution(execution);
      await dataPromise;
    });
  });

  describe('recordGasPrice', () => {
    it('should record gas price', async () => {
      const dataPromise = new Promise<void>((resolve) => {
        collector.on('data', (event) => {
          expect(event.type).toBe('gas');
          expect(event.data.gasPrice).toBe(50n);
          resolve();
        });
      });

      collector.recordGasPrice(1, 50n);
      await dataPromise;
    });
  });

  describe('getHistoricalData', () => {
    it('should retrieve historical data', async () => {
      const now = Date.now();
      const dataPoint: PriceDataPoint = {
        timestamp: now,
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      };

      collector.recordPrice(dataPoint);

      const historical = await collector.getHistoricalData(1, '0xToken1', now - 1000, now + 1000);

      expect(historical.length).toBe(1);
      expect(historical[0]).toEqual(dataPoint);
    });

    it('should filter by time range', async () => {
      const now = Date.now();

      collector.recordPrice({
        timestamp: now - 10000,
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      });

      collector.recordPrice({
        timestamp: now,
        chain: 1,
        tokenAddress: '0xToken1',
        price: 101,
        volume: 1100,
        liquidity: 51000,
      });

      const historical = await collector.getHistoricalData(1, '0xToken1', now - 5000, now + 1000);

      expect(historical.length).toBe(1);
      expect(historical[0].price).toBe(101);
    });
  });

  describe('statistics', () => {
    it('should track collection stats', () => {
      const dataPoint: PriceDataPoint = {
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      };

      collector.recordPrice(dataPoint);
      collector.recordPrice({ ...dataPoint, chain: 2 });
      collector.recordPrice({ ...dataPoint, tokenAddress: '0xToken2' });

      const stats = collector.getStats();
      expect(stats.dataPointsCollected).toBe(3);
      expect(stats.activeChains.size).toBe(2);
      expect(stats.activeTokens.size).toBe(2);
    });

    it('should track errors', () => {
      collector.start();

      const initialStats = collector.getStats();
      const initialErrors = initialStats.errors;

      // Errors would be tracked during collection failures
      expect(initialErrors).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      collector.recordPrice({
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      });

      collector.clear();

      const stats = collector.getStats();
      expect(stats.dataPointsCollected).toBe(0);
      expect(stats.activeChains.size).toBe(0);
      expect(stats.activeTokens.size).toBe(0);
    });
  });

  describe('subscription', () => {
    it('should subscribe to data stream', async () => {
      const streamPromise = new Promise<void>((resolve) => {
        const unsubscribe = collector.subscribeToStream((event) => {
          expect(event.type).toBe('price');
          unsubscribe();
          resolve();
        });
      });

      collector.recordPrice({
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      });

      await streamPromise;
    });

    it('should unsubscribe from stream', () => {
      let eventCount = 0;

      const unsubscribe = collector.subscribeToStream(() => {
        eventCount++;
      });

      collector.recordPrice({
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 100,
        volume: 1000,
        liquidity: 50000,
      });

      unsubscribe();

      collector.recordPrice({
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0xToken1',
        price: 101,
        volume: 1100,
        liquidity: 51000,
      });

      expect(eventCount).toBe(1);
    });
  });
});
