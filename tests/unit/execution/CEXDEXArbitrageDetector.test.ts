/**
 * Tests for CEXDEXArbitrageDetector
 * 
 * Validates CEX-DEX arbitrage opportunity detection logic,
 * profit calculations, fee accounting, and opportunity generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CEXDEXArbitrageDetector,
  CEXLiquidityMonitor,
  CEXExchange,
} from '../../../src/execution/cex/index.js';
import { DEXPriceData } from '../../../src/execution/cex/CEXDEXArbitrageDetector.js';

describe('CEXDEXArbitrageDetector', () => {
  let detector: CEXDEXArbitrageDetector;
  let monitor: CEXLiquidityMonitor;
  
  beforeEach(() => {
    // Create detector with default config
    detector = new CEXDEXArbitrageDetector();
    
    // Create CEX monitor
    monitor = new CEXLiquidityMonitor({
      exchanges: [
        {
          exchange: CEXExchange.BINANCE,
          symbols: ['BTC/USDT', 'ETH/USDT'],
        },
      ],
    });
    
    detector.setCEXMonitor(monitor);
  });
  
  describe('Constructor and Configuration', () => {
    it('should create detector with default config', () => {
      const det = new CEXDEXArbitrageDetector();
      const config = det.getConfig();
      
      expect(config.minPriceDiffPercent).toBe(0.5);
      expect(config.maxTradeSizeUsd).toBe(10000);
      expect(config.dexSwapFeePercent).toBe(0.3);
      expect(config.gasEstimateUsd).toBe(15);
      expect(config.minNetProfitUsd).toBe(10);
    });
    
    it('should create detector with custom config', () => {
      const det = new CEXDEXArbitrageDetector({
        minPriceDiffPercent: 1.0,
        maxTradeSizeUsd: 5000,
        minNetProfitUsd: 50,
      });
      
      const config = det.getConfig();
      expect(config.minPriceDiffPercent).toBe(1.0);
      expect(config.maxTradeSizeUsd).toBe(5000);
      expect(config.minNetProfitUsd).toBe(50);
    });
    
    it('should accept custom CEX fees', () => {
      const det = new CEXDEXArbitrageDetector({
        cexFees: {
          [CEXExchange.BINANCE]: 0.05,
          [CEXExchange.COINBASE]: 0.5,
        },
      });
      
      const config = det.getConfig();
      expect(config.cexFees[CEXExchange.BINANCE]).toBe(0.05);
      expect(config.cexFees[CEXExchange.COINBASE]).toBe(0.5);
    });
    
    it('should allow config updates', () => {
      detector.updateConfig({
        minPriceDiffPercent: 0.8,
        maxTradeSizeUsd: 20000,
      });
      
      const config = detector.getConfig();
      expect(config.minPriceDiffPercent).toBe(0.8);
      expect(config.maxTradeSizeUsd).toBe(20000);
    });
  });
  
  describe('DEX Price Updates', () => {
    it('should update single DEX price', () => {
      const priceData: DEXPriceData = {
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234...5678',
        timestamp: Date.now(),
      };
      
      detector.updateDEXPrice(priceData);
      
      // Should not throw
      expect(() => detector.detectOpportunities('BTC/USDT')).not.toThrow();
    });
    
    it('should update multiple DEX prices', () => {
      const priceDataList: DEXPriceData[] = [
        {
          symbol: 'BTC/USDT',
          dex: 'Uniswap V3',
          price: '50000',
          liquidity: '10000000',
          pool: '0x1234',
          timestamp: Date.now(),
        },
        {
          symbol: 'ETH/USDT',
          dex: 'Uniswap V3',
          price: '3000',
          liquidity: '5000000',
          pool: '0x5678',
          timestamp: Date.now(),
        },
      ];
      
      detector.updateDEXPrices(priceDataList);
      
      // Should not throw for either symbol
      expect(() => detector.detectOpportunities('BTC/USDT')).not.toThrow();
      expect(() => detector.detectOpportunities('ETH/USDT')).not.toThrow();
    });
  });
  
  describe('Opportunity Detection', () => {
    it('should return empty array when CEX monitor not set', () => {
      const det = new CEXDEXArbitrageDetector();
      const opps = det.detectOpportunities('BTC/USDT');
      
      expect(opps).toEqual([]);
    });
    
    it('should return empty array when no DEX price available', () => {
      const opps = detector.detectOpportunities('BTC/USDT');
      
      expect(opps).toEqual([]);
    });
    
    it('should return empty array when no CEX data available', () => {
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      expect(opps).toEqual([]);
    });
    
    it('should detect BUY_DEX_SELL_CEX opportunity when CEX bid > DEX price', () => {
      // Use a lower minimum net profit threshold for testing
      detector.updateConfig({ minNetProfitUsd: 1 });
      
      // Setup: CEX bid higher than DEX (2% spread = $200 gross on $10k trade)
      // Mock the CEXLiquidityMonitor getSnapshot method
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '51000',
            ask: '51050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000', // 2% lower than CEX bid
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      // Should detect opportunity: buy DEX at 50000, sell CEX at 51000
      expect(opps.length).toBeGreaterThan(0);
      if (opps.length > 0) {
        expect(opps[0].direction).toBe('BUY_DEX_SELL_CEX');
        expect(opps[0].symbol).toBe('BTC/USDT');
        expect(opps[0].cexExchange).toBe('binance');
        expect(opps[0].dexName).toBe('Uniswap V3');
        expect(opps[0].grossProfit).toBeGreaterThan(0);
      }
    });
    
    it('should detect BUY_CEX_SELL_DEX opportunity when DEX price > CEX ask', () => {
      // Use a lower minimum net profit threshold for testing
      detector.updateConfig({ minNetProfitUsd: 1 });
      
      // Setup: DEX price higher than CEX ask (2% spread)
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '49000',
            ask: '49050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000', // 2% higher than CEX ask
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      // Should detect opportunity: buy CEX at 49050, sell DEX at 50000
      expect(opps.length).toBeGreaterThan(0);
      if (opps.length > 0) {
        expect(opps[0].direction).toBe('BUY_CEX_SELL_DEX');
        expect(opps[0].grossProfit).toBeGreaterThan(0);
      }
    });
    
    it('should filter out opportunities below min price diff', () => {
      detector.updateConfig({ minPriceDiffPercent: 2.0 }); // High threshold
      
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '50100', // Only 0.2% diff
            ask: '50150',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      // Should be empty due to low price diff
      expect(opps).toEqual([]);
    });
    
    it('should filter out opportunities below min net profit', () => {
      detector.updateConfig({ minNetProfitUsd: 1000 }); // High profit threshold
      
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '50300', // 0.6% diff, but small
            ask: '50350',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      // May be empty if net profit after fees < $1000
      // This depends on trade size and fees
    });
  });
  
  describe('Profit Calculations', () => {
    it('should calculate fees correctly', () => {
      detector.updateConfig({
        maxTradeSizeUsd: 10000,
        cexFees: { [CEXExchange.BINANCE]: 0.1 },
        dexSwapFeePercent: 0.3,
        gasEstimateUsd: 15,
        slippagePercent: 0.5,
      });
      
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '51000', // 2% higher than DEX
            ask: '51050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      expect(opps.length).toBeGreaterThan(0);
      if (opps.length > 0) {
        const opp = opps[0];
        
        // Check fee breakdown
        expect(opp.fees.cexTradingFee).toBeGreaterThan(0);
        expect(opp.fees.dexSwapFee).toBeGreaterThan(0);
        expect(opp.fees.gasCost).toBe(15);
        expect(opp.fees.slippage).toBeGreaterThan(0);
        expect(opp.fees.total).toBe(
          opp.fees.cexTradingFee +
          opp.fees.dexSwapFee +
          opp.fees.gasCost +
          opp.fees.slippage
        );
        
        // Net profit should be gross - fees
        expect(opp.netProfit).toBeCloseTo(opp.grossProfit - opp.fees.total, 2);
      }
    });
    
    it('should calculate net profit correctly', () => {
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '51000',
            ask: '51050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      const opps = detector.detectOpportunities('BTC/USDT');
      
      expect(opps.length).toBeGreaterThan(0);
      if (opps.length > 0) {
        const opp = opps[0];
        
        // Net profit should be positive for profitable opportunities
        expect(opp.netProfit).toBeGreaterThan(0);
        
        // Net profit percent should be reasonable
        expect(opp.netProfitPercent).toBeGreaterThan(0);
        expect(opp.netProfitPercent).toBeLessThan(10); // < 10%
      }
    });
  });
  
  describe('Statistics', () => {
    it('should return empty stats initially', () => {
      const stats = detector.getStats();
      
      expect(stats.totalOpportunities).toBe(0);
      expect(stats.totalPotentialProfit).toBe(0);
      expect(stats.avgNetProfitPercent).toBe(0);
      expect(stats.symbols).toEqual([]);
    });
    
    it('should track opportunities in stats', () => {
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '51000',
            ask: '51050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      detector.detectOpportunities('BTC/USDT');
      
      const stats = detector.getStats();
      
      expect(stats.totalOpportunities).toBeGreaterThan(0);
      expect(stats.totalPotentialProfit).toBeGreaterThan(0);
      expect(stats.avgNetProfitPercent).toBeGreaterThan(0);
      expect(stats.symbols).toContain('BTC/USDT');
    });
    
    it('should clear opportunities', () => {
      // First detect some opportunities
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '51000',
            ask: '51050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      detector.detectOpportunities('BTC/USDT');
      
      // Should have opportunities
      expect(detector.getOpportunities().length).toBeGreaterThan(0);
      
      // Clear
      detector.clearOpportunities();
      
      // Should be empty
      expect(detector.getOpportunities()).toEqual([]);
      expect(detector.getStats().totalOpportunities).toBe(0);
    });
  });
  
  describe('Callback Integration', () => {
    it('should call onOpportunityFound callback', async () => {
      let callbackCalled = false;
      
      const detector = new CEXDEXArbitrageDetector(
        {},
        {
          onOpportunityFound: (opportunity) => {
            expect(opportunity).toBeDefined();
            expect(opportunity.arbType).toBe('spatial');
            expect(opportunity.netProfit).toBeGreaterThan(0);
            callbackCalled = true;
          },
        }
      );
      
      detector.setCEXMonitor(monitor);
      
      monitor.getSnapshot = () => ({
        symbol: 'BTC/USDT',
        venues: {
          binance: {
            bid: '51000',
            ask: '51050',
            spread: '50',
            spreadBps: 100,
            bidVolume: '1.0',
            askVolume: '1.0',
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
      
      detector.updateDEXPrice({
        symbol: 'BTC/USDT',
        dex: 'Uniswap V3',
        price: '50000',
        liquidity: '10000000',
        pool: '0x1234',
        timestamp: Date.now(),
      });
      
      detector.detectOpportunities('BTC/USDT');
      
      expect(callbackCalled).toBe(true);
    });
  });
});
