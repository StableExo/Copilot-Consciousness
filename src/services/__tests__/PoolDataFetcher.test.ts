/**
 * PoolDataFetcher Tests
 *
 * Tests for on-chain pool data fetching service
 */

import { PoolDataFetcher, PoolConfig } from '../PoolDataFetcher';
import { ethers } from 'ethers';

describe('PoolDataFetcher', () => {
  let fetcher: PoolDataFetcher;
  let mockProvider: Provider;

  beforeEach(() => {
    // Create mock provider
    mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 8453, name: 'base' }),
    } as any;

    const config = {
      provider: mockProvider,
      cacheDurationMs: 12000,
    };

    fetcher = new PoolDataFetcher(config);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(fetcher).toBeDefined();
    });

    it('should use default cache duration if not provided', () => {
      const defaultFetcher = new PoolDataFetcher({
        provider: mockProvider,
      });
      expect(defaultFetcher).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      fetcher.clearCache();
      const stats = fetcher.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = fetcher.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBeDefined();
      expect(stats.validEntries).toBeDefined();
      expect(stats.expiredEntries).toBeDefined();
      expect(stats.cacheDurationMs).toBe(12000);
    });
  });

  describe('fetchPools', () => {
    it('should handle empty pool config array', async () => {
      const pools = await fetcher.fetchPools([]);
      expect(pools).toEqual([]);
    });

    it('should return empty array on all failed fetches', async () => {
      const poolConfigs: PoolConfig[] = [
        {
          address: '0x0000000000000000000000000000000000000000',
          dex: 'uniswap_v3',
          fee: 500,
        },
      ];

      const pools = await fetcher.fetchPools(poolConfigs);
      expect(pools).toEqual([]);
    });
  });
});
