/**
 * MLOrchestrator Tests
 */

import { MLOrchestrator } from '../MLOrchestrator';
import { ArbitragePath } from '../../arbitrage/types';

describe('MLOrchestrator', () => {
  let orchestrator: MLOrchestrator;

  beforeEach(() => {
    orchestrator = new MLOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await orchestrator.initialize();
      const stats = orchestrator.getStats();
      expect(stats).toBeDefined();
      expect(stats.predictionsCount).toBe(0);
    });

    it('should load data collector', () => {
      const collector = orchestrator.getDataCollector();
      expect(collector).toBeDefined();
    });

    it('should load pattern detector', () => {
      const detector = orchestrator.getPatternDetector();
      expect(detector).toBeDefined();
    });
  });

  describe('enhanceOpportunity', () => {
    const mockPath: ArbitragePath = {
      hops: [
        {
          dexName: 'Uniswap',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: 1000n,
          amountOut: 1100n,
          fee: 0.003,
          gasEstimate: 150000,
        },
      ],
      startToken: '0xToken1',
      endToken: '0xToken2',
      estimatedProfit: 100n,
      totalGasCost: 300000n,
      netProfit: 80n,
      totalFees: 0.003,
      slippageImpact: 0.01,
    };

    it('should enhance path with ML predictions', async () => {
      await orchestrator.initialize();
      const enhanced = await orchestrator.enhanceOpportunity(mockPath);
      
      expect(enhanced).toBeDefined();
      expect(enhanced.mlPredictions).toBeDefined();
      expect(enhanced.mlPredictions?.successProbability).toBeGreaterThanOrEqual(0);
      expect(enhanced.mlPredictions?.successProbability).toBeLessThanOrEqual(1);
    });

    it('should include price forecasts', async () => {
      await orchestrator.initialize();
      const enhanced = await orchestrator.enhanceOpportunity(mockPath);
      
      expect(enhanced.mlPredictions?.priceForecasts).toBeDefined();
      expect(enhanced.mlPredictions?.priceForecasts.length).toBeGreaterThan(0);
    });

    it('should include volatility forecast', async () => {
      await orchestrator.initialize();
      const enhanced = await orchestrator.enhanceOpportunity(mockPath);
      
      expect(enhanced.mlPredictions?.volatilityForecast).toBeDefined();
      expect(enhanced.mlPredictions?.volatilityForecast.volatility).toBeGreaterThan(0);
    });

    it('should generate recommendation', async () => {
      await orchestrator.initialize();
      const enhanced = await orchestrator.enhanceOpportunity(mockPath);
      
      expect(enhanced.mlPredictions?.recommendation).toBeDefined();
      expect(['EXECUTE', 'SKIP', 'QUEUE']).toContain(enhanced.mlPredictions?.recommendation);
    });

    it('should calculate confidence score', async () => {
      await orchestrator.initialize();
      const enhanced = await orchestrator.enhanceOpportunity(mockPath);
      
      expect(enhanced.mlPredictions?.confidence).toBeGreaterThanOrEqual(0);
      expect(enhanced.mlPredictions?.confidence).toBeLessThanOrEqual(1);
    });

    it('should use cache for repeated requests', async () => {
      await orchestrator.initialize();
      
      await orchestrator.enhanceOpportunity(mockPath);
      await orchestrator.enhanceOpportunity(mockPath);
      
      const stats = orchestrator.getStats();
      expect(stats.predictionsCount).toBe(2);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    it('should track predictions count', async () => {
      await orchestrator.initialize();
      
      const mockPath: ArbitragePath = {
        hops: [],
        startToken: '0x1',
        endToken: '0x2',
        estimatedProfit: 100n,
        totalGasCost: 300000n,
        netProfit: 80n,
        totalFees: 0,
        slippageImpact: 0,
      };

      await orchestrator.enhanceOpportunity(mockPath);
      await orchestrator.enhanceOpportunity(mockPath);

      const stats = orchestrator.getStats();
      expect(stats.predictionsCount).toBe(2);
    });

    it('should track average latency', async () => {
      await orchestrator.initialize();
      
      const mockPath: ArbitragePath = {
        hops: [],
        startToken: '0x1',
        endToken: '0x2',
        estimatedProfit: 100n,
        totalGasCost: 300000n,
        netProfit: 80n,
        totalFees: 0,
        slippageImpact: 0,
      };

      await orchestrator.enhanceOpportunity(mockPath);

      const stats = orchestrator.getStats();
      expect(stats.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await orchestrator.initialize();
      
      const mockPath: ArbitragePath = {
        hops: [],
        startToken: '0x1',
        endToken: '0x2',
        estimatedProfit: 100n,
        totalGasCost: 300000n,
        netProfit: 80n,
        totalFees: 0,
        slippageImpact: 0,
      };

      await orchestrator.enhanceOpportunity(mockPath);
      orchestrator.clearCache();
      await orchestrator.enhanceOpportunity(mockPath);

      const stats = orchestrator.getStats();
      expect(stats.cacheHitRate).toBe(0);
    });
  });
});
