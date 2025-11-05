/**
 * Tests for ProfitDetailCalculator
 */

import { calculateMinAmountOut } from '../ProfitDetailCalculator';

describe('calculateMinAmountOut', () => {
    it('should calculate minimum amount out with slippage', () => {
        const amount = 1000000000000000000n; // 1 token
        const slippageBps = 50; // 0.5%
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        // Expected: 1 * (10000 - 50) / 10000 = 0.995
        expect(result).toBe(995000000000000000n);
    });

    it('should handle zero slippage', () => {
        const amount = 1000000000000000000n;
        const slippageBps = 0;
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        expect(result).toBe(1000000000000000000n); // No reduction
    });

    it('should handle large slippage', () => {
        const amount = 1000000000000000000n;
        const slippageBps = 1000; // 10%
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        // Expected: 1 * (10000 - 1000) / 10000 = 0.9
        expect(result).toBe(900000000000000000n);
    });

    it('should return 0 for zero amount', () => {
        const amount = 0n;
        const slippageBps = 50;
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        expect(result).toBe(0n);
    });

    it('should return 0 for negative amount', () => {
        const amount = -1000000000000000000n;
        const slippageBps = 50;
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        expect(result).toBe(0n);
    });

    it('should handle very small amounts', () => {
        const amount = 1n;
        const slippageBps = 50;
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        // Expected: 1 * 9950 / 10000 = 0 (due to integer division)
        expect(result).toBe(0n);
    });

    it('should handle large amounts', () => {
        const amount = 1000000000000000000000000n; // 1 million tokens
        const slippageBps = 100; // 1%
        
        const result = calculateMinAmountOut(amount, slippageBps);
        
        // Expected: 1000000 * (10000 - 100) / 10000 = 990000
        expect(result).toBe(990000000000000000000000n);
    });

    it('should handle different slippage values correctly', () => {
        const amount = 10000n;
        
        expect(calculateMinAmountOut(amount, 1)).toBe(9999n);   // 0.01%
        expect(calculateMinAmountOut(amount, 10)).toBe(9990n);  // 0.1%
        expect(calculateMinAmountOut(amount, 100)).toBe(9900n); // 1%
        expect(calculateMinAmountOut(amount, 500)).toBe(9500n); // 5%
    });
});
