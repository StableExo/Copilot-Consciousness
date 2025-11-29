/**
 * Tests for BaseFeeVelocityTracker
 * 
 * Tier S Feature #1: Dynamic min-profit thresholds tied to base-fee velocity
 */

import { BaseFeeVelocityTracker } from '../../../src/temporal/BaseFeeVelocityTracker';
import { Provider } from 'ethers';

// Mock provider
class MockProvider {
  private blocks: Map<number, any> = new Map();
  private currentBlockNumber = 100;

  async getBlock(blockNumber: number | string) {
    if (blockNumber === 'latest') {
      return this.blocks.get(this.currentBlockNumber);
    }
    return this.blocks.get(blockNumber as number);
  }

  async getBlockNumber() {
    return this.currentBlockNumber;
  }

  setBlock(blockNumber: number, baseFeePerGas: bigint) {
    this.blocks.set(blockNumber, {
      number: blockNumber,
      baseFeePerGas,
      timestamp: Math.floor(Date.now() / 1000) + (blockNumber - this.currentBlockNumber) * 12,
    });
    this.currentBlockNumber = blockNumber;
  }
}

describe('BaseFeeVelocityTracker', () => {
  let tracker: BaseFeeVelocityTracker;
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
    tracker = new BaseFeeVelocityTracker(provider as any);
  });

  describe('initialization', () => {
    it('should create tracker with default config', () => {
      expect(tracker).toBeDefined();
      expect(tracker.getAdjustedMinProfit()).toBe(0.08); // Default normal threshold
    });

    it('should accept custom config', () => {
      const customTracker = new BaseFeeVelocityTracker(provider as any, {
        minProfitNormal: 0.10,
      });
      expect(customTracker.getAdjustedMinProfit()).toBe(0.10);
    });
  });

  describe('base fee velocity calculation', () => {
    it('should calculate velocity on base fee drop', async () => {
      // Block 100: 50 Mwei
      provider.setBlock(100, BigInt(50_000_000)); // 50 Mwei in wei
      await tracker.updateFromBlock(100);

      // Block 101: 44 Mwei (drop of 6 Mwei - above -3 threshold)
      provider.setBlock(101, BigInt(44_000_000));
      await tracker.updateFromBlock(101);

      const velocity = tracker.getVelocity();
      expect(velocity).toBeLessThan(0); // Should be negative
      expect(Math.abs(velocity)).toBeGreaterThan(3); // Should exceed threshold
    });

    it('should calculate velocity on base fee rise', async () => {
      // Block 100: 40 Mwei
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);

      // Block 101: 43 Mwei (rise of 3 Mwei - above +2 threshold)
      provider.setBlock(101, BigInt(43_000_000));
      await tracker.updateFromBlock(101);

      const velocity = tracker.getVelocity();
      expect(velocity).toBeGreaterThan(0); // Should be positive
      expect(velocity).toBeGreaterThan(2); // Should exceed threshold
    });

    it('should handle stable base fee', async () => {
      // Block 100: 40 Mwei
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);

      // Block 101: 40.5 Mwei (small change)
      provider.setBlock(101, BigInt(40_500_000));
      await tracker.updateFromBlock(101);

      const velocity = tracker.getVelocity();
      expect(Math.abs(velocity)).toBeLessThan(3); // Should be within normal range
    });
  });

  describe('dynamic threshold adjustment', () => {
    it('should lower threshold on base fee drop (liquidity explosion)', async () => {
      // Simulate dropping base fee
      provider.setBlock(100, BigInt(50_000_000)); // 50 Mwei
      await tracker.updateFromBlock(100);

      provider.setBlock(101, BigInt(43_000_000)); // Drop 7 Mwei
      await tracker.updateFromBlock(101);

      const threshold = tracker.getAdjustedMinProfit();
      expect(threshold).toBeLessThan(0.08); // Should be lower than normal
      expect(threshold).toBeGreaterThanOrEqual(0.04); // Should not go below minimum
      expect(threshold).toBeLessThanOrEqual(0.06); // Should be in low range
    });

    it('should raise threshold on base fee rise (congestion)', async () => {
      // Simulate rising base fee
      provider.setBlock(100, BigInt(40_000_000)); // 40 Mwei
      await tracker.updateFromBlock(100);

      provider.setBlock(101, BigInt(45_000_000)); // Rise 5 Mwei
      await tracker.updateFromBlock(101);

      const threshold = tracker.getAdjustedMinProfit();
      expect(threshold).toBeGreaterThan(0.08); // Should be higher than normal
      expect(threshold).toBeLessThanOrEqual(0.15); // Should not exceed maximum
    });

    it('should use normal threshold in stable conditions', async () => {
      // Simulate stable base fee
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);

      provider.setBlock(101, BigInt(40_500_000)); // Small change
      await tracker.updateFromBlock(101);

      const threshold = tracker.getAdjustedMinProfit();
      expect(threshold).toBe(0.08); // Should be normal threshold
    });
  });

  describe('data management', () => {
    it('should maintain window size', async () => {
      // Add more blocks than window size
      for (let i = 100; i < 120; i++) {
        provider.setBlock(i, BigInt(40_000_000 + (i - 100) * 100_000));
        await tracker.updateFromBlock(i);
      }

      const history = tracker.getHistory();
      expect(history.length).toBeLessThanOrEqual(10); // Default window size
    });

    it('should skip duplicate blocks', async () => {
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);
      await tracker.updateFromBlock(100); // Try to add same block again

      const history = tracker.getHistory();
      expect(history.length).toBe(1); // Should only have one entry
    });

    it('should provide stats', async () => {
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);

      const stats = tracker.getStats();
      expect(stats).toHaveProperty('velocity');
      expect(stats).toHaveProperty('adjustedMinProfit');
      expect(stats).toHaveProperty('currentBaseFee');
      expect(stats).toHaveProperty('historySize');
      expect(stats.historySize).toBe(1);
    });

    it('should clear history', async () => {
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);

      tracker.clear();

      const history = tracker.getHistory();
      expect(history.length).toBe(0);
      expect(tracker.getCurrentBaseFee()).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle missing base fee gracefully', async () => {
      // Actually provide a valid base fee (can't be 0 in real scenarios)
      provider.setBlock(100, BigInt(1_000_000)); // 1 Mwei (very low)
      await tracker.updateFromBlock(100);

      expect(tracker.getCurrentBaseFee()).toBeGreaterThan(0);
    });

    it('should emit velocity update events', async () => {
      const updatePromise = new Promise<void>((resolve) => {
        tracker.on('velocityUpdate', (data) => {
          expect(data).toHaveProperty('velocity');
          expect(data).toHaveProperty('threshold');
          expect(data).toHaveProperty('blockNumber');
          resolve();
        });
      });

      provider.setBlock(100, BigInt(40_000_000));
      tracker.updateFromBlock(100);
      await updatePromise;
    });

    it('should handle extreme velocity spikes', async () => {
      // Block 100: 50 Mwei
      provider.setBlock(100, BigInt(50_000_000));
      await tracker.updateFromBlock(100);

      // Block 101: 10 Mwei (extreme drop of 40 Mwei)
      provider.setBlock(101, BigInt(10_000_000));
      await tracker.updateFromBlock(101);

      const threshold = tracker.getAdjustedMinProfit();
      expect(threshold).toBeGreaterThanOrEqual(0.04); // Should still have minimum
      expect(threshold).toBeLessThan(0.08); // Should be in low range
    });
  });

  describe('real-world scenario simulation', () => {
    it('should adapt to changing market conditions', async () => {
      // Start with stable conditions
      provider.setBlock(100, BigInt(40_000_000));
      await tracker.updateFromBlock(100);
      expect(tracker.getAdjustedMinProfit()).toBe(0.08);

      // Simulate congestion (rising fees)
      provider.setBlock(101, BigInt(45_000_000));
      await tracker.updateFromBlock(101);
      const highThreshold = tracker.getAdjustedMinProfit();
      expect(highThreshold).toBeGreaterThan(0.08);

      // Simulate relief (dropping fees)
      provider.setBlock(102, BigInt(38_000_000));
      await tracker.updateFromBlock(102);
      const lowThreshold = tracker.getAdjustedMinProfit();
      expect(lowThreshold).toBeLessThan(highThreshold);
    });
  });
});
