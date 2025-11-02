/**
 * Tests for RealtimeDataPipeline
 */

import { RealtimeDataPipeline } from '../RealtimeDataPipeline';
import { PoolEvent } from '../WebSocketStreamManager';
import { EventFilterConfig } from '../../../config/realtime.config';

describe('RealtimeDataPipeline', () => {
  let pipeline: RealtimeDataPipeline;
  let filterConfig: EventFilterConfig;

  beforeEach(() => {
    filterConfig = {
      minLiquidity: BigInt('100000000000000000000'), // 100 tokens
      maxPriceImpact: 0.03,
      minPriceDelta: 0.001,
    };

    pipeline = new RealtimeDataPipeline(filterConfig, 1000, 'oldest', 60000);
  });

  afterEach(() => {
    if (pipeline) {
      pipeline.destroy();
    }
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(pipeline).toBeDefined();
      expect(pipeline.getQueueSize()).toBe(0);
    });
  });

  describe('processEvent', () => {
    it('should process valid Sync event', async () => {
      const event: PoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'), // 1000 tokens
        reserve1: BigInt('2000000000000000000000'), // 2000 tokens
      };

      const filteredEventSpy = jest.fn();
      pipeline.on('filteredEvent', filteredEventSpy);

      await pipeline.processEvent(event);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      const metrics = pipeline.getMetrics();
      expect(metrics.eventsReceived).toBe(1);
    });

    it('should filter out events below liquidity threshold', async () => {
      const event: PoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('10000000000000000'), // 0.01 tokens (below threshold)
        reserve1: BigInt('20000000000000000'), // 0.02 tokens
      };

      const filteredEventSpy = jest.fn();
      pipeline.on('filteredEvent', filteredEventSpy);

      await pipeline.processEvent(event);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      const metrics = pipeline.getMetrics();
      expect(metrics.eventsReceived).toBe(1);
      expect(metrics.eventsFiltered).toBe(1);
      expect(filteredEventSpy).not.toHaveBeenCalled();
    });

    it('should update metrics correctly', async () => {
      const event: PoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
      };

      await pipeline.processEvent(event);
      await pipeline.processEvent(event);

      const metrics = pipeline.getMetrics();
      expect(metrics.eventsReceived).toBe(2);
      expect(metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('backpressure handling', () => {
    it('should track queue size and metrics', async () => {
      const smallPipeline = new RealtimeDataPipeline(filterConfig, 2, 'oldest', 60000);

      // Process events - they may or may not trigger backpressure depending on filtering
      for (let i = 0; i < 5; i++) {
        const event: PoolEvent = {
          eventType: 'Sync',
          poolAddress: '0x1234567890123456789012345678901234567890',
          blockNumber: 12345 + i,
          transactionHash: `0xabcdef${i}`,
          timestamp: Date.now(),
          // High reserves to pass liquidity check
          reserve0: BigInt('1000000000000000000000'),
          reserve1: BigInt('2000000000000000000000'),
        };
        await smallPipeline.processEvent(event);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = smallPipeline.getMetrics();
      // Verify metrics are being tracked
      expect(metrics.eventsReceived).toBeGreaterThan(0);
      expect(metrics.queueSize).toBeGreaterThanOrEqual(0);
      
      smallPipeline.destroy();
    });

    it('should handle multiple events from different pools', async () => {
      const smallPipeline = new RealtimeDataPipeline(filterConfig, 10, 'oldest', 60000);

      const poolAddresses = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];

      // Process events from multiple pools
      for (const poolAddress of poolAddresses) {
        const event: PoolEvent = {
          eventType: 'Sync',
          poolAddress,
          blockNumber: 12345,
          transactionHash: '0xabcdef',
          timestamp: Date.now(),
          reserve0: BigInt('1000000000000000000000'),
          reserve1: BigInt('2000000000000000000000'),
        };
        await smallPipeline.processEvent(event);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = smallPipeline.getMetrics();
      expect(metrics.eventsReceived).toBe(3);
      
      smallPipeline.destroy();
    });
  });

  describe('getPriceTrend', () => {
    it('should return price history for pool', async () => {
      const poolAddress = '0x1234567890123456789012345678901234567890';
      
      const event: PoolEvent = {
        eventType: 'Sync',
        poolAddress,
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
      };

      await pipeline.processEvent(event);

      const trend = pipeline.getPriceTrend(poolAddress);
      expect(trend.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown pool', () => {
      const trend = pipeline.getPriceTrend('0x9999999999999999999999999999999999999999');
      expect(trend).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = pipeline.getMetrics();
      
      expect(metrics).toHaveProperty('eventsReceived');
      expect(metrics).toHaveProperty('eventsFiltered');
      expect(metrics).toHaveProperty('eventsEmitted');
      expect(metrics).toHaveProperty('eventsDropped');
      expect(metrics).toHaveProperty('averageLatencyMs');
      expect(metrics).toHaveProperty('throughputPerSecond');
      expect(metrics).toHaveProperty('queueSize');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      const event: PoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
      };

      await pipeline.processEvent(event);
      pipeline.resetMetrics();

      const metrics = pipeline.getMetrics();
      expect(metrics.eventsReceived).toBe(0);
      expect(metrics.eventsFiltered).toBe(0);
    });
  });

  describe('clearPriceHistory', () => {
    it('should clear price history', async () => {
      const poolAddress = '0x1234567890123456789012345678901234567890';
      
      const event: PoolEvent = {
        eventType: 'Sync',
        poolAddress,
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
      };

      await pipeline.processEvent(event);
      pipeline.clearPriceHistory();

      const trend = pipeline.getPriceTrend(poolAddress);
      expect(trend).toEqual([]);
    });
  });
});
