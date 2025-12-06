/**
 * DEXScreener Client Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DexScreenerClient } from '../DexScreenerClient';

describe('DexScreenerClient', () => {
  let client: DexScreenerClient;

  beforeEach(() => {
    client = new DexScreenerClient({
      baseUrl: 'https://api.dexscreener.com',
      timeout: 5000,
      retryAttempts: 2,
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultClient = new DexScreenerClient();
      expect(defaultClient).toBeInstanceOf(DexScreenerClient);
    });

    it('should initialize with custom config', () => {
      const customClient = new DexScreenerClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api',
        timeout: 15000,
      });
      expect(customClient).toBeInstanceOf(DexScreenerClient);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return null initially', () => {
      const rateLimit = client.getRateLimitInfo();
      expect(rateLimit).toBeNull();
    });
  });

  describe('analyzePairSafety', () => {
    it('should analyze a safe pair correctly', async () => {
      const mockPair = {
        chainId: 'ethereum',
        dexId: 'uniswap',
        url: 'https://dexscreener.com/ethereum/0x123',
        pairAddress: '0x123',
        baseToken: { address: '0xabc', name: 'Token A', symbol: 'TKA' },
        quoteToken: { address: '0xdef', name: 'Token B', symbol: 'TKB' },
        priceNative: '1.5',
        priceUsd: '1500',
        txns: {
          m5: { buys: 10, sells: 8 },
          h1: { buys: 100, sells: 80 },
          h6: { buys: 500, sells: 400 },
          h24: { buys: 2000, sells: 1800 },
        },
        volume: {
          m5: 5000,
          h1: 50000,
          h6: 250000,
          h24: 1000000,
        },
        priceChange: {
          m5: 1,
          h1: 2,
          h6: 5,
          h24: 10,
        },
        liquidity: {
          usd: 500000,
          base: 300,
          quote: 200,
        },
        pairCreatedAt: Date.now() - 86400000, // 1 day ago
        info: {
          websites: [{ url: 'https://example.com' }],
          socials: [{ type: 'twitter', url: 'https://twitter.com/example' }],
        },
      };

      const analysis = await client.analyzePairSafety(mockPair);
      
      expect(analysis).toHaveProperty('isSuspicious');
      expect(analysis).toHaveProperty('warnings');
      expect(analysis).toHaveProperty('score');
      expect(analysis.score).toBeGreaterThan(50);
      expect(analysis.isSuspicious).toBe(false);
    });

    it('should detect suspicious pair with low liquidity', async () => {
      const mockPair = {
        chainId: 'ethereum',
        dexId: 'uniswap',
        url: 'https://dexscreener.com/ethereum/0x456',
        pairAddress: '0x456',
        baseToken: { address: '0xabc', name: 'Token A', symbol: 'TKA' },
        quoteToken: { address: '0xdef', name: 'Token B', symbol: 'TKB' },
        priceNative: '1.5',
        txns: {
          m5: { buys: 1, sells: 10 },
          h1: { buys: 5, sells: 50 },
          h6: { buys: 10, sells: 100 },
          h24: { buys: 20, sells: 200 },
        },
        volume: {
          m5: 100,
          h1: 500,
          h6: 1000,
          h24: 5000,
        },
        priceChange: {
          m5: -20,
          h1: -30,
          h6: -50,
          h24: -70,
        },
        liquidity: {
          usd: 5000, // Very low
          base: 3,
          quote: 2,
        },
        pairCreatedAt: Date.now() - 1800000, // 30 minutes ago
      };

      const analysis = await client.analyzePairSafety(mockPair);
      
      expect(analysis.warnings.length).toBeGreaterThan(0);
      expect(analysis.score).toBeLessThan(50);
      expect(analysis.isSuspicious).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return boolean', async () => {
      const health = await client.healthCheck();
      expect(typeof health).toBe('boolean');
    });
  });
});
