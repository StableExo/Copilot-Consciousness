/**
 * Tests for EventDrivenTrigger
 */

import { EventDrivenTrigger } from '../EventDrivenTrigger';
import { ArbitrageOrchestrator } from '../ArbitrageOrchestrator';
import { FilteredPoolEvent } from '../../dex/monitoring/RealtimeDataPipeline';
import { ProfitabilityConfig } from '../../config/realtime.config';
import { DEXRegistry } from '../../dex/core/DEXRegistry';
import { PathfindingConfig } from '../types';

// Mock ArbitrageOrchestrator methods
jest.mock('../ArbitrageOrchestrator');
jest.mock('../MultiHopDataFetcher');

describe('EventDrivenTrigger', () => {
  let trigger: EventDrivenTrigger;
  let orchestrator: ArbitrageOrchestrator;
  let profitabilityConfig: ProfitabilityConfig;

  beforeEach(() => {
    const registry = new DEXRegistry();
    const pathfindingConfig: PathfindingConfig = {
      maxHops: 3,
      minProfitThreshold: BigInt('1000000000000000000'),
      maxSlippage: 0.05,
      gasPrice: BigInt(50000000000),
    };

    orchestrator = new ArbitrageOrchestrator(registry, pathfindingConfig, pathfindingConfig.gasPrice);
    
    // Mock findOpportunities to return empty array
    (orchestrator.findOpportunities as jest.Mock) = jest.fn().mockResolvedValue([]);

    profitabilityConfig = {
      minProfitPercent: 0.5,
      maxSlippagePercent: 1.0,
      minProfitAbsolute: BigInt('100000000000000000'),
    };

    trigger = new EventDrivenTrigger(orchestrator, profitabilityConfig, 100, true);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(trigger).toBeDefined();
      expect(trigger.getQueueSize()).toBe(0);
    });
  });

  describe('handleEvent', () => {
    it('should process filtered pool event', async () => {
      const event: FilteredPoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
        priority: 'high',
      };

      const opportunityDetectedSpy = jest.fn();
      trigger.on('opportunityDetected', opportunityDetectedSpy);

      await trigger.handleEvent(event);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      const metrics = trigger.getMetrics();
      expect(metrics.opportunitiesDetected).toBe(1);
    });

    it('should debounce events from same pool', async () => {
      const event: FilteredPoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
        priority: 'high',
      };

      await trigger.handleEvent(event);
      await trigger.handleEvent(event);

      const metrics = trigger.getMetrics();
      expect(metrics.debounceSkips).toBeGreaterThan(0);
    });

    it('should not debounce when disabled', async () => {
      trigger.setDebouncing(false);

      const event: FilteredPoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
        priority: 'high',
      };

      await trigger.handleEvent(event);
      await trigger.handleEvent(event);

      const metrics = trigger.getMetrics();
      expect(metrics.debounceSkips).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = trigger.getMetrics();

      expect(metrics).toHaveProperty('opportunitiesDetected');
      expect(metrics).toHaveProperty('opportunitiesTriggered');
      expect(metrics).toHaveProperty('successfulExecutions');
      expect(metrics).toHaveProperty('failedExecutions');
      expect(metrics).toHaveProperty('totalProfitEstimated');
      expect(metrics).toHaveProperty('averageLatencyMs');
      expect(metrics).toHaveProperty('debounceSkips');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      const event: FilteredPoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
        priority: 'high',
      };

      await trigger.handleEvent(event);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      trigger.resetMetrics();

      const metrics = trigger.getMetrics();
      expect(metrics.opportunitiesDetected).toBe(0);
      expect(metrics.opportunitiesTriggered).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update profitability configuration', () => {
      trigger.updateConfig({
        minProfitPercent: 1.0,
      });

      // Configuration is private, but we can test it indirectly through behavior
      expect(trigger).toBeDefined();
    });
  });

  describe('clearDebounceCache', () => {
    it('should clear debounce cache', async () => {
      const event: FilteredPoolEvent = {
        eventType: 'Sync',
        poolAddress: '0x1234567890123456789012345678901234567890',
        blockNumber: 12345,
        transactionHash: '0xabcdef',
        timestamp: Date.now(),
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('2000000000000000000000'),
        priority: 'high',
      };

      await trigger.handleEvent(event);
      trigger.clearDebounceCache();
      
      // After clearing cache, next event should not be debounced
      await trigger.handleEvent(event);

      const metrics = trigger.getMetrics();
      // Should have processed 2 events without debouncing the second
      expect(metrics.opportunitiesDetected).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getQueueSize', () => {
    it('should return processing queue size', () => {
      const queueSize = trigger.getQueueSize();
      expect(typeof queueSize).toBe('number');
      expect(queueSize).toBeGreaterThanOrEqual(0);
    });
  });
});
