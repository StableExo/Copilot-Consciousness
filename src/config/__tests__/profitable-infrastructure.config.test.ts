/**
 * Tests for Profitable Infrastructure Configuration
 * 
 * Validates configuration loading, validation, and revenue calculations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadCEXConfig,
  loadBloXrouteConfig,
  loadProfitableInfrastructureConfig,
  validateProfitableInfrastructureConfig,
  getExpectedMonthlyRevenue,
  getInfrastructureCosts,
} from '../profitable-infrastructure.config.js';
import { CEXExchange } from '../../execution/cex/types.js';

describe('Profitable Infrastructure Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadCEXConfig', () => {
    it('should load default CEX configuration', () => {
      process.env.ENABLE_CEX_MONITOR = 'false';
      
      const config = loadCEXConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.exchanges).toHaveLength(1); // Default: binance
      expect(config.exchanges[0].exchange).toBe(CEXExchange.BINANCE);
      expect(config.exchanges[0].symbols).toContain('BTC/USDT');
      expect(config.updateInterval).toBe(1000);
      expect(config.minSpreadBps).toBe(10);
    });

    it('should parse multiple exchanges from environment', () => {
      process.env.ENABLE_CEX_MONITOR = 'true';
      process.env.CEX_EXCHANGES = 'binance,coinbase,okx';
      process.env.CEX_SYMBOLS = 'BTC/USDT,ETH/USDC';
      
      const config = loadCEXConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.exchanges).toHaveLength(3);
      expect(config.exchanges[0].exchange).toBe(CEXExchange.BINANCE);
      expect(config.exchanges[1].exchange).toBe(CEXExchange.COINBASE);
      expect(config.exchanges[2].exchange).toBe(CEXExchange.OKX);
      
      config.exchanges.forEach(ex => {
        expect(ex.symbols).toEqual(['BTC/USDT', 'ETH/USDC']);
      });
    });

    it('should parse arbitrage detection settings', () => {
      process.env.CEX_DEX_MIN_PRICE_DIFF_PERCENT = '1.0';
      process.env.CEX_DEX_MAX_TRADE_SIZE = '50000';
      process.env.CEX_DEX_MIN_NET_PROFIT = '25';
      
      const config = loadCEXConfig();
      
      expect(config.minPriceDiffPercent).toBe(1.0);
      expect(config.maxTradeSizeUsd).toBe(50000);
      expect(config.minNetProfitUsd).toBe(25);
    });

    it('should parse fee configuration', () => {
      process.env.BINANCE_FEE_PERCENT = '0.08';
      process.env.COINBASE_FEE_PERCENT = '0.5';
      process.env.OKX_FEE_PERCENT = '0.075';
      
      const config = loadCEXConfig();
      
      expect(config.fees.binance).toBe(0.08);
      expect(config.fees.coinbase).toBe(0.5);
      expect(config.fees.okx).toBe(0.075);
    });

    it('should support all exchange types', () => {
      process.env.CEX_EXCHANGES = 'binance,coinbase,okx,bybit,kraken';
      
      const config = loadCEXConfig();
      
      expect(config.exchanges).toHaveLength(5);
      expect(config.exchanges[0].exchange).toBe(CEXExchange.BINANCE);
      expect(config.exchanges[1].exchange).toBe(CEXExchange.COINBASE);
      expect(config.exchanges[2].exchange).toBe(CEXExchange.OKX);
      expect(config.exchanges[3].exchange).toBe(CEXExchange.BYBIT);
      expect(config.exchanges[4].exchange).toBe(CEXExchange.KRAKEN);
    });

    it('should throw error for unknown exchange', () => {
      process.env.CEX_EXCHANGES = 'unknown';
      
      expect(() => loadCEXConfig()).toThrow('Unknown CEX exchange: unknown');
    });

    it('should support testnet mode', () => {
      process.env.CEX_TESTNET = 'true';
      
      const config = loadCEXConfig();
      
      expect(config.exchanges[0].testnet).toBe(true);
    });
  });

  describe('loadBloXrouteConfig', () => {
    it('should load default bloXroute configuration', () => {
      process.env.ENABLE_BLOXROUTE = 'false';
      
      const config = loadBloXrouteConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.enableMempoolStream).toBe(false);
      expect(config.chains).toEqual(['base']);
      expect(config.streamType).toBe('pendingTxs');
      expect(config.region).toBe('virginia');
    });

    it('should parse bloXroute credentials', () => {
      process.env.ENABLE_BLOXROUTE = 'true';
      process.env.BLOXROUTE_API_KEY = 'test-key';
      process.env.BLOXROUTE_AUTH_HEADER = 'test-auth';
      
      const config = loadBloXrouteConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.apiKey).toBe('test-key');
      expect(config.authHeader).toBe('test-auth');
    });

    it('should parse mempool streaming settings', () => {
      process.env.BLOXROUTE_ENABLE_MEMPOOL_STREAM = 'true';
      process.env.BLOXROUTE_STREAM_TYPE = 'newTxs';
      process.env.BLOXROUTE_STREAM_BATCH_SIZE = '10';
      process.env.BLOXROUTE_STREAM_BATCH_TIMEOUT = '500';
      
      const config = loadBloXrouteConfig();
      
      expect(config.enableMempoolStream).toBe(true);
      expect(config.streamType).toBe('newTxs');
      expect(config.batchSize).toBe(10);
      expect(config.batchTimeout).toBe(500);
    });

    it('should parse multi-chain configuration', () => {
      process.env.BLOXROUTE_CHAINS = 'ethereum,base,arbitrum,optimism';
      
      const config = loadBloXrouteConfig();
      
      expect(config.chains).toEqual(['ethereum', 'base', 'arbitrum', 'optimism']);
    });

    it('should parse regional endpoints', () => {
      process.env.BLOXROUTE_REGION = 'singapore';
      
      const config = loadBloXrouteConfig();
      
      expect(config.region).toBe('singapore');
    });

    it('should parse detection settings', () => {
      process.env.BLOXROUTE_ENABLE_DEX_SWAP_DETECTION = 'true';
      process.env.BLOXROUTE_ENABLE_LARGE_TRANSFER_DETECTION = 'true';
      process.env.BLOXROUTE_LARGE_TRANSFER_THRESHOLD_ETH = '5.0';
      
      const config = loadBloXrouteConfig();
      
      expect(config.enableDexSwapDetection).toBe(true);
      expect(config.enableLargeTransferDetection).toBe(true);
      expect(config.largeTransferThresholdEth).toBe(5.0);
    });
  });

  describe('loadProfitableInfrastructureConfig', () => {
    it('should load complete configuration', () => {
      process.env.ENABLE_CEX_MONITOR = 'true';
      process.env.ENABLE_BLOXROUTE = 'true';
      
      const config = loadProfitableInfrastructureConfig();
      
      expect(config.cex).toBeDefined();
      expect(config.bloxroute).toBeDefined();
      expect(config.cex.enabled).toBe(true);
      expect(config.bloxroute.enabled).toBe(true);
    });
  });

  describe('validateProfitableInfrastructureConfig', () => {
    it('should validate enabled CEX with no exchanges as error', () => {
      const config = {
        cex: {
          enabled: true,
          exchanges: [],
          updateInterval: 1000,
          minSpreadBps: 10,
          minPriceDiffPercent: 0.5,
          maxTradeSizeUsd: 10000,
          minNetProfitUsd: 10,
          fees: {
            binance: 0.1,
            coinbase: 0.6,
            okx: 0.1,
            bybit: 0.1,
            kraken: 0.26,
            dex: 0.3,
          },
        },
        bloxroute: {
          enabled: false,
          enableMempoolStream: false,
          streamType: 'pendingTxs' as const,
          batchSize: 1,
          batchTimeout: 100,
          chains: ['base'],
          region: 'virginia' as const,
          enableDexSwapDetection: true,
          enableLargeTransferDetection: true,
          largeTransferThresholdEth: 1.0,
          verbose: false,
        },
      };
      
      const result = validateProfitableInfrastructureConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CEX monitoring enabled but no exchanges configured');
    });

    it('should warn about low price diff threshold', () => {
      const config = loadProfitableInfrastructureConfig();
      process.env.ENABLE_CEX_MONITOR = 'true';
      process.env.CEX_DEX_MIN_PRICE_DIFF_PERCENT = '0.05';
      const testConfig = loadCEXConfig();
      config.cex = testConfig;
      
      const result = validateProfitableInfrastructureConfig(config);
      
      expect(result.warnings.some(w => w.includes('price diff'))).toBe(true);
    });

    it('should warn about missing bloXroute credentials', () => {
      process.env.ENABLE_BLOXROUTE = 'true';
      const config = loadProfitableInfrastructureConfig();
      
      const result = validateProfitableInfrastructureConfig(config);
      
      expect(result.warnings.some(w => w.includes('API key'))).toBe(true);
    });

    it('should error on mempool stream with no chains', () => {
      const config = loadProfitableInfrastructureConfig();
      config.bloxroute.enabled = true;
      config.bloxroute.enableMempoolStream = true;
      config.bloxroute.chains = [];
      
      const result = validateProfitableInfrastructureConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no chains configured'))).toBe(true);
    });

    it('should warn about high batch size', () => {
      const config = loadProfitableInfrastructureConfig();
      config.bloxroute.enabled = true;
      config.bloxroute.batchSize = 150;
      
      const result = validateProfitableInfrastructureConfig(config);
      
      expect(result.warnings.some(w => w.includes('batch size'))).toBe(true);
    });

    it('should warn when nothing is enabled', () => {
      process.env.ENABLE_CEX_MONITOR = 'false';
      process.env.ENABLE_BLOXROUTE = 'false';
      const config = loadProfitableInfrastructureConfig();
      
      const result = validateProfitableInfrastructureConfig(config);
      
      expect(result.warnings.some(w => w.includes('No profitable infrastructure enabled'))).toBe(true);
    });
  });

  describe('getExpectedMonthlyRevenue', () => {
    it('should calculate revenue when both systems enabled', () => {
      const config = loadProfitableInfrastructureConfig();
      config.cex.enabled = true;
      config.bloxroute.enabled = true;
      config.bloxroute.enableMempoolStream = true;
      
      const revenue = getExpectedMonthlyRevenue(config);
      
      expect(revenue.cexMin).toBe(10000);
      expect(revenue.cexMax).toBe(25000);
      expect(revenue.bloxrouteMin).toBe(15000);
      expect(revenue.bloxrouteMax).toBe(30000);
      expect(revenue.totalMin).toBe(25000);
      expect(revenue.totalMax).toBe(55000);
    });

    it('should calculate revenue with only CEX enabled', () => {
      const config = loadProfitableInfrastructureConfig();
      config.cex.enabled = true;
      config.bloxroute.enabled = false;
      
      const revenue = getExpectedMonthlyRevenue(config);
      
      expect(revenue.cexMin).toBe(10000);
      expect(revenue.cexMax).toBe(25000);
      expect(revenue.bloxrouteMin).toBe(0);
      expect(revenue.bloxrouteMax).toBe(0);
      expect(revenue.totalMin).toBe(10000);
      expect(revenue.totalMax).toBe(25000);
    });

    it('should calculate revenue with only bloXroute enabled', () => {
      const config = loadProfitableInfrastructureConfig();
      config.cex.enabled = false;
      config.bloxroute.enabled = true;
      config.bloxroute.enableMempoolStream = true;
      
      const revenue = getExpectedMonthlyRevenue(config);
      
      expect(revenue.cexMin).toBe(0);
      expect(revenue.cexMax).toBe(0);
      expect(revenue.bloxrouteMin).toBe(15000);
      expect(revenue.bloxrouteMax).toBe(30000);
      expect(revenue.totalMin).toBe(15000);
      expect(revenue.totalMax).toBe(30000);
    });

    it('should return zero revenue when nothing enabled', () => {
      const config = loadProfitableInfrastructureConfig();
      config.cex.enabled = false;
      config.bloxroute.enabled = false;
      
      const revenue = getExpectedMonthlyRevenue(config);
      
      expect(revenue.totalMin).toBe(0);
      expect(revenue.totalMax).toBe(0);
    });
  });

  describe('getInfrastructureCosts', () => {
    it('should return zero costs for free tier', () => {
      const config = loadProfitableInfrastructureConfig();
      
      const costs = getInfrastructureCosts(config);
      
      expect(costs.cex).toBe(0);
      expect(costs.bloxroute).toBe(0);
      expect(costs.total).toBe(0);
    });

    it('should calculate costs consistently', () => {
      const config = loadProfitableInfrastructureConfig();
      config.cex.enabled = true;
      config.bloxroute.enabled = true;
      
      const costs = getInfrastructureCosts(config);
      
      expect(costs.total).toBe(costs.cex + costs.bloxroute);
    });
  });

  describe('Integration - Revenue Projections', () => {
    it('should show profitable business model with both systems', () => {
      process.env.ENABLE_CEX_MONITOR = 'true';
      process.env.ENABLE_BLOXROUTE = 'true';
      process.env.BLOXROUTE_ENABLE_MEMPOOL_STREAM = 'true';
      
      const config = loadProfitableInfrastructureConfig();
      const revenue = getExpectedMonthlyRevenue(config);
      const costs = getInfrastructureCosts(config);
      
      const netMin = revenue.totalMin - costs.total;
      const netMax = revenue.totalMax - costs.total;
      
      expect(netMin).toBeGreaterThan(20000); // At least $20k net
      expect(netMax).toBeGreaterThan(50000); // Up to $55k net
      expect(costs.total).toBeLessThan(1000); // Less than $1k cost
    });

    it('should validate configuration for production', () => {
      process.env.ENABLE_CEX_MONITOR = 'true';
      process.env.CEX_EXCHANGES = 'binance,coinbase,okx';
      process.env.CEX_DEX_MIN_PRICE_DIFF_PERCENT = '0.5';
      process.env.CEX_DEX_MIN_NET_PROFIT = '10';
      process.env.ENABLE_BLOXROUTE = 'true';
      process.env.BLOXROUTE_ENABLE_MEMPOOL_STREAM = 'true';
      process.env.BLOXROUTE_CHAINS = 'base,ethereum';
      
      const config = loadProfitableInfrastructureConfig();
      const validation = validateProfitableInfrastructureConfig(config);
      
      expect(validation.valid).toBe(true);
      expect(config.cex.exchanges.length).toBeGreaterThan(0);
      expect(config.bloxroute.chains.length).toBeGreaterThan(0);
    });
  });
});
