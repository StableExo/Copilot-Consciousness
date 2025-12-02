/**
 * MultiHopDataFetcher Timeout Tests
 * Tests for timeout functionality in pool data fetching
 */

import { MultiHopDataFetcher } from '../../../src/arbitrage/MultiHopDataFetcher';
import { DEXRegistry } from '../../../src/dex/core/DEXRegistry';
import { JsonRpcProvider } from 'ethers';

describe('MultiHopDataFetcher Timeout Protection', () => {
  let dataFetcher: MultiHopDataFetcher;
  let provider: JsonRpcProvider;
  let dexRegistry: DEXRegistry;

  beforeEach(() => {
    // Mock provider
    provider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 8453n }),
    } as any;

    // Mock DEX registry
    dexRegistry = {
      getDEXes: jest.fn().mockReturnValue([]),
    } as any;

    dataFetcher = new MultiHopDataFetcher(provider, dexRegistry);
  });

  describe('buildGraphEdges timeout protection', () => {
    it('should timeout if pool fetch takes too long', async () => {
      // Set very short timeout for testing
      process.env.POOL_FETCH_TIMEOUT = '100';

      // Mock a slow operation
      jest.spyOn(dataFetcher as any, 'buildGraphEdgesInternal').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 5000); // 5 second delay
          })
      );

      const tokens = ['0x1234', '0x5678'];
      const result = await dataFetcher.buildGraphEdges(tokens);

      // Should return empty array on timeout
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);

      // Cleanup
      delete process.env.POOL_FETCH_TIMEOUT;
    }, 10000);

    it('should use default timeout when env var not set', async () => {
      delete process.env.POOL_FETCH_TIMEOUT;

      // Mock a fast operation
      jest.spyOn(dataFetcher as any, 'buildGraphEdgesInternal').mockResolvedValue([
        { from: '0x1234', to: '0x5678', pool: '0xabcd' },
      ]);

      const tokens = ['0x1234', '0x5678'];
      const result = await dataFetcher.buildGraphEdges(tokens);

      // Should complete normally
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('from');
    });

    it('should handle custom timeout values', async () => {
      process.env.POOL_FETCH_TIMEOUT = '200';

      jest.spyOn(dataFetcher as any, 'buildGraphEdgesInternal').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 150); // Within timeout
          })
      );

      const tokens = ['0x1234'];
      const result = await dataFetcher.buildGraphEdges(tokens);

      // Should complete within custom timeout
      expect(Array.isArray(result)).toBe(true);

      delete process.env.POOL_FETCH_TIMEOUT;
    }, 5000);

    it('should propagate non-timeout errors', async () => {
      jest
        .spyOn(dataFetcher as any, 'buildGraphEdgesInternal')
        .mockRejectedValue(new Error('Network error'));

      const tokens = ['0x1234'];

      await expect(dataFetcher.buildGraphEdges(tokens)).rejects.toThrow('Network error');
    });

    it('should return empty array on timeout without throwing', async () => {
      process.env.POOL_FETCH_TIMEOUT = '50';

      jest.spyOn(dataFetcher as any, 'buildGraphEdgesInternal').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([{ test: 'data' }]), 1000);
          })
      );

      const tokens = ['0x1234'];
      
      // Should not throw, should return empty array
      await expect(dataFetcher.buildGraphEdges(tokens)).resolves.toEqual([]);

      delete process.env.POOL_FETCH_TIMEOUT;
    }, 5000);
  });
});
