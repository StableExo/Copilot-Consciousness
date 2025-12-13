/**
 * Price Oracle Validator Tests
 * 
 * Tests defensive security patterns learned from HackerOne Report #3463813
 * (LiquidETHV1 Oracle Manipulation vulnerability)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PriceOracleValidator, PriceUpdate } from '../PriceOracleValidator.js';

describe('PriceOracleValidator', () => {
  let validator: PriceOracleValidator;
  const testSymbol = 'ETH/USDT';
  const basePrice = BigInt('1050000000000000000'); // 1.05 ETH (18 decimals) = ~$3000 at $3000/ETH

  beforeEach(() => {
    validator = new PriceOracleValidator({
      minPrice: BigInt('1000000000000000'), // 0.001 ETH minimum
      maxPrice: BigInt('100000000000000000000'), // 100 ETH maximum
      maxRateChangeBps: 500, // 5% max change
      timelockDelay: 3600, // 1 hour
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 10, // 10%
      maxPriceAge: 300, // 5 minutes
    });
  });

  describe('Bounds Checking (Lesson: LiquidETHV1 had no min/max bounds)', () => {
    it('should accept price within bounds', () => {
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(true);
      expect(result.metadata.withinBounds).toBe(true);
    });

    it('should reject price below minimum', () => {
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: BigInt('1'), // 1 wei - way too low
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('outside allowed range'))).toBe(true);
      expect(result.metadata.withinBounds).toBe(false);
    });

    it('should reject price above maximum', () => {
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: BigInt('1000000000000000000000'), // 1000 ETH - too high
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('outside allowed range'))).toBe(true);
      expect(result.metadata.withinBounds).toBe(false);
    });
  });

  describe('Rate-of-Change Limits (Lesson: LiquidETHV1 had no rate limits)', () => {
    it('should accept price change within rate limit (5%)', () => {
      // Set initial price
      const initialUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };
      validator.proposePriceUpdate(initialUpdate, 'test-proposer');
      
      // Fast-forward time and execute
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000; // Make it executable
        validator.executePendingUpdate(testSymbol);
      }

      // Propose 4% increase (within 5% limit)
      const newPrice = (basePrice * 104n) / 100n; // +4%
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: newPrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(true);
      expect(result.metadata.rateChangeValid).toBe(true);
      expect(result.metadata.changePercent).toBeLessThanOrEqual(5);
    });

    it('should reject price change exceeding rate limit (+10%)', () => {
      // Set initial price
      const initialUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };
      validator.proposePriceUpdate(initialUpdate, 'test-proposer');
      
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000;
        validator.executePendingUpdate(testSymbol);
      }

      // Propose 10% increase (exceeds 5% limit)
      const newPrice = (basePrice * 110n) / 100n;
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: newPrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Rate of change'))).toBe(true);
      expect(result.metadata.rateChangeValid).toBe(false);
    });

    it('should reject sudden price crash (-99%)', () => {
      // Set initial price
      const initialUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };
      validator.proposePriceUpdate(initialUpdate, 'test-proposer');
      
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000;
        validator.executePendingUpdate(testSymbol);
      }

      // Catastrophic crash to 1% of original (like LiquidETHV1 attack)
      const crashedPrice = basePrice / 100n;
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: crashedPrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Timelock Protection (Lesson: LiquidETHV1 had no timelock)', () => {
    it('should create pending update with future execution time', () => {
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.proposePriceUpdate(update, 'test-proposer');
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(Date.now());
      
      const pending = validator.getPendingUpdate(testSymbol);
      expect(pending).toBeDefined();
      expect(pending?.proposer).toBe('test-proposer');
    });

    it('should reject execution before timelock expires', () => {
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      validator.proposePriceUpdate(update, 'test-proposer');
      
      // Try to execute immediately (should fail)
      const result = validator.executePendingUpdate(testSymbol);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Timelock active'))).toBe(true);
    });

    it('should allow execution after timelock expires', () => {
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      validator.proposePriceUpdate(update, 'test-proposer');
      
      // Manually set execution time to past
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000; // 1 second ago
      }
      
      // Execute should now succeed
      const result = validator.executePendingUpdate(testSymbol);
      
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
      
      // Should be in current prices now
      const currentPrice = validator.getCurrentPrice(testSymbol);
      expect(currentPrice).toBeDefined();
      expect(currentPrice?.price).toBe(basePrice);
    });
  });

  describe('Circuit Breaker (Lesson: LiquidETHV1 had no emergency pause)', () => {
    it('should trigger circuit breaker on extreme price movement (>20%)', () => {
      // Set initial price
      const initialUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };
      validator.proposePriceUpdate(initialUpdate, 'test-proposer');
      
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000;
        validator.executePendingUpdate(testSymbol);
      }

      // Attempt 25% increase (2x circuit breaker threshold of 10%)
      const extremePrice = (basePrice * 125n) / 100n;
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: extremePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      
      expect(result.valid).toBe(false);
      expect(validator.isCircuitBreakerActive()).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Circuit breaker auto-triggered'))).toBe(true);
    });

    it('should block all updates when circuit breaker is active', () => {
      // Trigger circuit breaker
      validator.triggerCircuitBreaker('Test trigger');
      
      // Try to update price
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Circuit breaker is active'))).toBe(true);
      expect(result.metadata.circuitBreakerActive).toBe(true);
    });

    it('should allow updates after circuit breaker reset', () => {
      // Trigger and reset circuit breaker
      validator.triggerCircuitBreaker('Test trigger');
      expect(validator.isCircuitBreakerActive()).toBe(true);
      
      validator.resetCircuitBreaker();
      expect(validator.isCircuitBreakerActive()).toBe(false);
      
      // Now updates should work
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };

      const result = validator.validatePriceUpdate(update);
      expect(result.valid).toBe(true);
    });
  });

  describe('Staleness Detection', () => {
    it('should warn about stale price data', () => {
      const oldTimestamp = Date.now() - 600000; // 10 minutes ago
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: oldTimestamp,
      };

      const result = validator.validatePriceUpdate(update);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('stale'))).toBe(true);
    });

    it('should track stale prices in statistics', () => {
      // Set a price
      const update: PriceUpdate = {
        symbol: testSymbol,
        price: basePrice,
        source: 'test',
        timestamp: Date.now(),
      };
      
      validator.proposePriceUpdate(update, 'test-proposer');
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000;
        validator.executePendingUpdate(testSymbol);
      }

      // Check if it becomes stale
      expect(validator.isPriceStale(testSymbol)).toBe(false);
      
      const stats = validator.getStats();
      expect(stats.symbolsTracked).toBe(1);
      expect(stats.circuitBreakerActive).toBe(false);
    });
  });

  describe('Price History', () => {
    it('should maintain price history', () => {
      const prices = [basePrice, basePrice + 1000n, basePrice + 2000n];
      
      for (const price of prices) {
        const update: PriceUpdate = {
          symbol: testSymbol,
          price,
          source: 'test',
          timestamp: Date.now(),
        };
        
        validator.proposePriceUpdate(update, 'test-proposer');
        const pending = validator.getPendingUpdate(testSymbol);
        if (pending) {
          pending.executionTime = Date.now() - 1000;
          validator.executePendingUpdate(testSymbol);
        }
      }

      const history = validator.getPriceHistory(testSymbol);
      expect(history.length).toBe(prices.length);
    });

    it('should limit history to 100 entries', () => {
      // Add 150 price updates
      for (let i = 0; i < 150; i++) {
        const update: PriceUpdate = {
          symbol: testSymbol,
          price: basePrice + BigInt(i * 1000),
          source: 'test',
          timestamp: Date.now(),
        };
        
        validator.proposePriceUpdate(update, 'test-proposer');
        const pending = validator.getPendingUpdate(testSymbol);
        if (pending) {
          pending.executionTime = Date.now() - 1000;
          validator.executePendingUpdate(testSymbol);
        }
      }

      const history = validator.getPriceHistory(testSymbol);
      expect(history.length).toBe(100);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', () => {
      // Add some prices
      const symbols = ['ETH/USDT', 'BTC/USDT', 'SOL/USDT'];
      
      for (const symbol of symbols) {
        const update: PriceUpdate = {
          symbol,
          price: basePrice,
          source: 'test',
          timestamp: Date.now(),
        };
        
        validator.proposePriceUpdate(update, 'test-proposer');
        const pending = validator.getPendingUpdate(symbol);
        if (pending) {
          pending.executionTime = Date.now() - 1000;
          validator.executePendingUpdate(symbol);
        }
      }

      const stats = validator.getStats();
      
      expect(stats.symbolsTracked).toBe(3);
      expect(stats.pendingUpdates).toBe(0);
      expect(stats.circuitBreakerActive).toBe(false);
      expect(Array.isArray(stats.stalePrices)).toBe(true);
    });
  });

  describe('Integration: Complete Attack Prevention', () => {
    it('should prevent LiquidETHV1-style oracle manipulation attack', () => {
      // Simulate malicious oracle attempting the attack from HackerOne #3463813

      // Step 1: Set legitimate initial price
      const legitimatePrice = BigInt('1050000000000000000'); // 1.05 ETH
      const initialUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: legitimatePrice,
        source: 'legitimate-oracle',
        timestamp: Date.now(),
      };
      
      const proposeResult = validator.proposePriceUpdate(initialUpdate, 'legitimate-oracle');
      expect(proposeResult.success).toBe(true);
      
      // Fast-forward and execute
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000;
      }
      validator.executePendingUpdate(testSymbol);

      // Step 2: Compromised oracle tries to crash price to 1 wei (99.99999% drop)
      const attackPrice = BigInt('1'); // 1 wei - catastrophic crash
      const attackUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: attackPrice,
        source: 'compromised-oracle',
        timestamp: Date.now(),
      };

      // DEFENSE: All these protections should prevent the attack
      const result = validator.validatePriceUpdate(attackUpdate);
      
      // Should be blocked by multiple defenses
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Specifically should fail bounds check AND rate-of-change
      expect(result.metadata.withinBounds).toBe(false); // Below minimum
      
      // Price should remain at legitimate value
      const currentPrice = validator.getCurrentPrice(testSymbol);
      expect(currentPrice?.price).toBe(legitimatePrice);
      expect(currentPrice?.price).not.toBe(attackPrice);
    });

    it('should prevent pump-and-dump attack scenario', () => {
      // Set normal price
      const normalPrice = BigInt('1050000000000000000'); // 1.05 ETH
      const initialUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: normalPrice,
        source: 'oracle',
        timestamp: Date.now(),
      };
      
      validator.proposePriceUpdate(initialUpdate, 'oracle');
      const pending = validator.getPendingUpdate(testSymbol);
      if (pending) {
        pending.executionTime = Date.now() - 1000;
        validator.executePendingUpdate(testSymbol);
      }

      // Attacker tries to pump price to maximum
      const pumpedPrice = BigInt('100000000000000000000'); // Max allowed
      const pumpUpdate: PriceUpdate = {
        symbol: testSymbol,
        price: pumpedPrice,
        source: 'oracle',
        timestamp: Date.now(),
      };

      // Should be blocked by rate-of-change limits
      const result = validator.validatePriceUpdate(pumpUpdate);
      
      expect(result.valid).toBe(false);
      expect(result.metadata.rateChangeValid).toBe(false);
      
      // Even if within absolute bounds, rate of change prevents manipulation
      expect(result.metadata.withinBounds).toBe(true); // Within 0.001-100 ETH
      
      // But rate change is way too high
      if (result.metadata.changePercent !== undefined) {
        expect(Math.abs(result.metadata.changePercent)).toBeGreaterThan(5);
      }
    });
  });
});
