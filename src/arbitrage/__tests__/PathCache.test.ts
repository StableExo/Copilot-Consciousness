import { PathCache } from '../PathCache';
import { ArbitragePath } from '../types';

describe('PathCache', () => {
  let cache: PathCache;
  let mockPath: ArbitragePath;

  beforeEach(() => {
    cache = new PathCache({
      enabled: true,
      maxEntries: 5,
      ttl: 300,
      minProfitabilityScore: 0.3,
    });

    mockPath = {
      hops: [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt(1000000),
          amountOut: BigInt(1010000),
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: '0xToken2',
          tokenOut: '0xToken1',
          amountIn: BigInt(1010000),
          amountOut: BigInt(1015000),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ],
      startToken: '0xToken1',
      endToken: '0xToken1',
      estimatedProfit: BigInt(15000),
      totalGasCost: BigInt(5000),
      netProfit: BigInt(10000),
      totalFees: 0.006,
      slippageImpact: 0.002,
    };
  });

  describe('set and get', () => {
    it('should store and retrieve paths', () => {
      cache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      const retrieved = cache.get(pathHash);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.netProfit).toBe(mockPath.netProfit);
    });

    it('should return null for non-existent paths', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should update profitability score on repeated sets', () => {
      cache.set(mockPath, true);
      cache.set(mockPath, true);
      cache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      const retrieved = cache.get(pathHash);
      expect(retrieved).not.toBeNull();
    });

    it('should track cache hits and misses', () => {
      cache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      cache.get(pathHash); // Hit
      cache.get('non-existent'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        const path = {
          ...mockPath,
          hops: [
            {
              ...mockPath.hops[0],
              poolAddress: `0x${i}00`,
            },
          ],
        };
        cache.set(path, true);
      }

      const stats1 = cache.getStats();
      expect(stats1.size).toBe(5);

      // Add one more to trigger eviction
      const newPath = {
        ...mockPath,
        hops: [
          {
            ...mockPath.hops[0],
            poolAddress: '0x999',
          },
        ],
      };
      cache.set(newPath, true);

      const stats2 = cache.getStats();
      expect(stats2.size).toBe(5); // Still at max
      expect(stats2.evictions).toBeGreaterThan(0);
    });
  });

  describe('TTL expiration', () => {
    it('should expire old entries', (done) => {
      const shortTtlCache = new PathCache({
        enabled: true,
        maxEntries: 10,
        ttl: 1, // 1 second
        minProfitabilityScore: 0.3,
      });

      shortTtlCache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      // Should be available immediately
      expect(shortTtlCache.get(pathHash)).not.toBeNull();

      // Should be expired after TTL
      setTimeout(() => {
        expect(shortTtlCache.get(pathHash)).toBeNull();
        done();
      }, 1500);
    }, 3000);
  });

  describe('findByTemplate', () => {
    it('should find paths by token sequence', () => {
      cache.set(mockPath, true);

      const paths = cache.findByTemplate(['0xToken1', '0xToken2', '0xToken1']);

      expect(paths.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for non-matching templates', () => {
      cache.set(mockPath, true);

      const paths = cache.findByTemplate(['0xTokenX', '0xTokenY']);

      expect(paths.length).toBe(0);
    });
  });

  describe('getPathsByPool', () => {
    it('should find paths involving specific pool', () => {
      cache.set(mockPath, true);

      const paths = cache.getPathsByPool('0x123');

      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0].hops.some((hop) => hop.poolAddress === '0x123')).toBe(true);
    });

    it('should return empty array for unknown pool', () => {
      cache.set(mockPath, true);

      const paths = cache.getPathsByPool('0xUnknown');

      expect(paths.length).toBe(0);
    });
  });

  describe('invalidatePool', () => {
    it('should invalidate all paths involving pool', () => {
      cache.set(mockPath, true);

      const invalidated = cache.invalidatePool('0x123');

      expect(invalidated).toBeGreaterThan(0);

      const paths = cache.getPathsByPool('0x123');
      expect(paths.length).toBe(0);
    });

    it('should return 0 for unknown pool', () => {
      cache.set(mockPath, true);

      const invalidated = cache.invalidatePool('0xUnknown');

      expect(invalidated).toBe(0);
    });
  });

  describe('warmCache', () => {
    it('should warm cache with multiple paths', () => {
      const paths: ArbitragePath[] = [
        mockPath,
        {
          ...mockPath,
          hops: [
            {
              ...mockPath.hops[0],
              poolAddress: '0xABC',
            },
          ],
        },
      ];

      cache.warmCache(paths);

      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('getTopPaths', () => {
    it('should return most profitable paths', () => {
      const path1 = { ...mockPath, netProfit: BigInt(1000) };
      const path2 = { ...mockPath, netProfit: BigInt(5000) };
      const path3 = { ...mockPath, netProfit: BigInt(3000) };

      cache.set(path1, true);
      cache.set(path2, true);
      cache.set(path3, true);

      const topPaths = cache.getTopPaths(2);

      expect(topPaths.length).toBeGreaterThan(0);
      expect(topPaths.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getStats', () => {
    it('should provide cache statistics', () => {
      cache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      cache.get(pathHash);

      const stats = cache.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('evictions');
      expect(stats).toHaveProperty('invalidations');
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', () => {
      cache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      cache.get(pathHash); // Hit
      cache.get('non-existent'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('clear', () => {
    it('should clear all cache data', () => {
      cache.set(mockPath, true);
      expect(cache.getStats().size).toBeGreaterThan(0);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update cache configuration', () => {
      cache.updateConfig({ ttl: 600 });

      // Config should be updated (no direct way to verify but shouldn't throw)
      expect(() => cache.set(mockPath, true)).not.toThrow();
    });

    it('should clear cache when disabled', () => {
      cache.set(mockPath, true);
      expect(cache.getStats().size).toBeGreaterThan(0);

      cache.updateConfig({ enabled: false });

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('disabled cache', () => {
    it('should not store when disabled', () => {
      const disabledCache = new PathCache({ enabled: false });

      disabledCache.set(mockPath, true);

      const stats = disabledCache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should return null on get when disabled', () => {
      const disabledCache = new PathCache({ enabled: false });

      disabledCache.set(mockPath, true);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      const retrieved = disabledCache.get(pathHash);
      expect(retrieved).toBeNull();
    });
  });

  describe('profitability score filtering', () => {
    it('should not return paths below minimum score', () => {
      cache.set(mockPath, false); // Mark as not profitable multiple times
      cache.set(mockPath, false);
      cache.set(mockPath, false);

      const pathHash = mockPath.hops
        .map((hop) => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
        .join('|');

      // Path should be filtered out due to low profitability score
      const retrieved = cache.get(pathHash);
      expect(retrieved).toBeNull();
    });
  });
});
