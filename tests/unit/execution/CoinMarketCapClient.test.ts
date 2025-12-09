/**
 * Unit tests for CoinMarketCapClient
 * Tests both CEX and DEX endpoint access with unified API key
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CoinMarketCapClient,
  CMCApiTier,
  RATE_LIMITS,
} from '../../../src/execution/coinmarketcap';

describe('CoinMarketCapClient', () => {
  describe('Constructor', () => {
    it('should create client with valid API key', () => {
      const client = new CoinMarketCapClient({
        apiKey: 'test-api-key-123',
      });

      expect(client).toBeInstanceOf(CoinMarketCapClient);
      expect(client.getStats().totalRequests).toBe(0);
    });

    it('should throw error without API key', () => {
      expect(() => {
        new CoinMarketCapClient({
          apiKey: '',
        });
      }).toThrow('CoinMarketCap API key is required');
    });

    it('should apply default configuration values', () => {
      const client = new CoinMarketCapClient({
        apiKey: 'test-key',
      });

      const stats = client.getStats();
      expect(stats.creditsRemaining).toBe(
        RATE_LIMITS[CMCApiTier.FREE].creditsPerMonth
      );
    });

    it('should accept custom tier configuration', () => {
      const client = new CoinMarketCapClient({
        apiKey: 'test-key',
        tier: CMCApiTier.PROFESSIONAL,
      });

      const stats = client.getStats();
      expect(stats.creditsRemaining).toBe(
        RATE_LIMITS[CMCApiTier.PROFESSIONAL].creditsPerMonth
      );
    });

    it('should accept custom base URL', () => {
      const client = new CoinMarketCapClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom-api.example.com',
      });

      expect(client).toBeInstanceOf(CoinMarketCapClient);
    });

    it('should accept custom retry configuration', () => {
      const client = new CoinMarketCapClient({
        apiKey: 'test-key',
        retryAttempts: 5,
        retryDelay: 2000,
      });

      expect(client).toBeInstanceOf(CoinMarketCapClient);
    });
  });

  describe('Rate Limits by Tier', () => {
    it('should have correct rate limits for FREE tier', () => {
      const limits = RATE_LIMITS[CMCApiTier.FREE];
      expect(limits.creditsPerMonth).toBe(10000);
      expect(limits.requestsPerMinute).toBe(30);
      expect(limits.requestsPerDay).toBe(333);
      expect(limits.historicalMonths).toBe(0);
    });

    it('should have correct rate limits for HOBBYIST tier', () => {
      const limits = RATE_LIMITS[CMCApiTier.HOBBYIST];
      expect(limits.creditsPerMonth).toBe(110000);
      expect(limits.requestsPerMinute).toBe(30);
      expect(limits.historicalMonths).toBe(12);
    });

    it('should have correct rate limits for STARTUP tier', () => {
      const limits = RATE_LIMITS[CMCApiTier.STARTUP];
      expect(limits.creditsPerMonth).toBe(300000);
      expect(limits.requestsPerMinute).toBe(30);
      expect(limits.historicalMonths).toBe(24);
    });

    it('should have correct rate limits for STANDARD tier', () => {
      const limits = RATE_LIMITS[CMCApiTier.STANDARD];
      expect(limits.creditsPerMonth).toBe(1200000);
      expect(limits.requestsPerMinute).toBe(60);
      expect(limits.historicalMonths).toBe(60);
    });

    it('should have correct rate limits for PROFESSIONAL tier', () => {
      const limits = RATE_LIMITS[CMCApiTier.PROFESSIONAL];
      expect(limits.creditsPerMonth).toBe(3000000);
      expect(limits.requestsPerMinute).toBe(90);
      expect(limits.historicalMonths).toBe('all');
    });

    it('should have correct rate limits for ENTERPRISE tier', () => {
      const limits = RATE_LIMITS[CMCApiTier.ENTERPRISE];
      expect(limits.creditsPerMonth).toBe(30000000);
      expect(limits.requestsPerMinute).toBe(120);
      expect(limits.historicalMonths).toBe('all');
    });
  });

  describe('Statistics Tracking', () => {
    it('should initialize stats at zero', () => {
      const client = new CoinMarketCapClient({ apiKey: 'test-key' });
      const stats = client.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.totalCreditsUsed).toBe(0);
      expect(stats.requestsThisMinute).toBe(0);
      expect(stats.requestsToday).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it('should track credits remaining based on tier', () => {
      const freeClient = new CoinMarketCapClient({
        apiKey: 'test-key',
        tier: CMCApiTier.FREE,
      });
      expect(freeClient.getStats().creditsRemaining).toBe(10000);

      const proClient = new CoinMarketCapClient({
        apiKey: 'test-key',
        tier: CMCApiTier.PROFESSIONAL,
      });
      expect(proClient.getStats().creditsRemaining).toBe(3000000);
    });

    it('should return immutable stats copy', () => {
      const client = new CoinMarketCapClient({ apiKey: 'test-key' });
      const stats1 = client.getStats();
      const stats2 = client.getStats();

      expect(stats1).not.toBe(stats2); // Different objects
      expect(stats1).toEqual(stats2); // Same values
    });
  });

  describe('Rate Limit Helpers', () => {
    it('should return rate limits for current tier', () => {
      const client = new CoinMarketCapClient({
        apiKey: 'test-key',
        tier: CMCApiTier.STANDARD,
      });

      const limits = client.getRateLimits();
      expect(limits.creditsPerMonth).toBe(1200000);
      expect(limits.requestsPerMinute).toBe(60);
    });

    it('should detect when approaching rate limits', () => {
      const client = new CoinMarketCapClient({ apiKey: 'test-key' });

      // Initially not approaching limits
      expect(client.isApproachingRateLimit()).toBe(false);
    });

    it('should reset daily statistics', () => {
      const client = new CoinMarketCapClient({ apiKey: 'test-key' });

      client.resetDailyStats();
      const stats = client.getStats();

      expect(stats.requestsToday).toBe(0);
    });
  });

  describe('API Configuration', () => {
    it('should support all tier types', () => {
      const tiers = [
        CMCApiTier.FREE,
        CMCApiTier.HOBBYIST,
        CMCApiTier.STARTUP,
        CMCApiTier.STANDARD,
        CMCApiTier.PROFESSIONAL,
        CMCApiTier.ENTERPRISE,
      ];

      tiers.forEach((tier) => {
        const client = new CoinMarketCapClient({
          apiKey: 'test-key',
          tier,
        });
        expect(client).toBeInstanceOf(CoinMarketCapClient);
      });
    });

    it('should have valid rate limits for all tiers', () => {
      const tiers = Object.values(CMCApiTier);

      tiers.forEach((tier) => {
        const limits = RATE_LIMITS[tier];
        expect(limits.creditsPerMonth).toBeGreaterThan(0);
        expect(limits.requestsPerMinute).toBeGreaterThan(0);
        expect(limits.requestsPerDay).toBeGreaterThan(0);
      });
    });
  });

  describe('Unified CEX + DEX Access', () => {
    it('should provide CEX endpoint access', () => {
      const client = new CoinMarketCapClient({ apiKey: 'test-key' });

      // Verify CEX methods exist
      expect(typeof client.getCEXExchangeList).toBe('function');
      expect(typeof client.getCEXMarketPairs).toBe('function');
      expect(typeof client.getCEXExchangeQuotes).toBe('function');
      expect(typeof client.getGlobalMetrics).toBe('function');
    });

    it('should provide DEX endpoint access', () => {
      const client = new CoinMarketCapClient({ apiKey: 'test-key' });

      // Verify DEX methods exist
      expect(typeof client.getDEXNetworksList).toBe('function');
      expect(typeof client.getDEXListingsInfo).toBe('function');
      expect(typeof client.getDEXListingsQuotes).toBe('function');
      expect(typeof client.getDEXPairsLatest).toBe('function');
      expect(typeof client.getDEXPairsQuotesLatest).toBe('function');
      expect(typeof client.getDEXPairsOhlcvLatest).toBe('function');
      expect(typeof client.getDEXPairsOhlcvHistorical).toBe('function');
      expect(typeof client.getDEXTradesLatest).toBe('function');
    });

    it('should access both CEX and DEX with same API key', () => {
      const apiKey = 'unified-test-key';
      const client = new CoinMarketCapClient({ apiKey });

      // Both CEX and DEX methods should be available
      expect(client.getCEXExchangeList).toBeDefined();
      expect(client.getDEXNetworksList).toBeDefined();

      // Stats should be unified
      const stats = client.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key', () => {
      expect(() => {
        // @ts-expect-error Testing missing apiKey
        new CoinMarketCapClient({});
      }).toThrow();
    });

    it('should handle invalid API key type', () => {
      expect(() => {
        // @ts-expect-error Testing invalid apiKey type
        new CoinMarketCapClient({ apiKey: 123 });
      }).toThrow();
    });
  });
});
