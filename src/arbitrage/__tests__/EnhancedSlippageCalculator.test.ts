import { EnhancedSlippageCalculator } from '../EnhancedSlippageCalculator';
import { ArbitrageHop } from '../types';

describe('EnhancedSlippageCalculator', () => {
  let calculator: EnhancedSlippageCalculator;

  beforeEach(() => {
    calculator = new EnhancedSlippageCalculator({
      defaultCurveType: 'constant-product',
      warningThreshold: 1.0,
      maxSafeImpact: 3.0
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact for constant product AMM', () => {
      const amountIn = BigInt(100000);
      const reserveIn = BigInt(10000000);
      const reserveOut = BigInt(10000000);
      const fee = 0.003;

      const impact = calculator.calculatePriceImpact(
        amountIn,
        reserveIn,
        reserveOut,
        fee
      );

      expect(impact.percentage).toBeGreaterThan(0);
      expect(impact.amountOut).toBeGreaterThan(BigInt(0));
      expect(impact.effectivePrice).toBeGreaterThan(0);
    });

    it('should handle zero reserves', () => {
      const impact = calculator.calculatePriceImpact(
        BigInt(100000),
        BigInt(0),
        BigInt(10000000),
        0.003
      );

      expect(impact.percentage).toBe(100);
      expect(impact.amountOut).toBe(BigInt(0));
    });

    it('should calculate accurate amountOut using constant product formula', () => {
      const amountIn = BigInt(1000000);
      const reserveIn = BigInt(10000000);
      const reserveOut = BigInt(10000000);
      const fee = 0.003;

      const impact = calculator.calculatePriceImpact(
        amountIn,
        reserveIn,
        reserveOut,
        fee
      );

      // Verify constant product: (reserveIn + amountInWithFee) * (reserveOut - amountOut) ~= k
      const amountInWithFee = (amountIn * BigInt(9970)) / BigInt(10000);
      const k = reserveIn * reserveOut;
      const newK = (reserveIn + amountInWithFee) * (reserveOut - impact.amountOut);
      
      // Allow small rounding difference
      const diff = k > newK ? k - newK : newK - k;
      expect(Number(diff) / Number(k)).toBeLessThan(0.01); // Less than 1% difference
    });

    it('should include fee in calculations', () => {
      const amountIn = BigInt(1000000);
      const reserveIn = BigInt(10000000);
      const reserveOut = BigInt(10000000);

      const noFeeImpact = calculator.calculatePriceImpact(
        amountIn,
        reserveIn,
        reserveOut,
        0
      );

      const withFeeImpact = calculator.calculatePriceImpact(
        amountIn,
        reserveIn,
        reserveOut,
        0.003
      );

      expect(withFeeImpact.amountOut).toBeLessThan(noFeeImpact.amountOut);
    });
  });

  describe('calculatePathSlippage', () => {
    it('should calculate cumulative slippage across multiple hops', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt(1000000),
          amountOut: BigInt(990000),
          fee: 0.003,
          gasEstimate: 150000,
          reserve0: BigInt(10000000),
          reserve1: BigInt(10000000)
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: '0xToken2',
          tokenOut: '0xToken3',
          amountIn: BigInt(990000),
          amountOut: BigInt(980000),
          fee: 0.003,
          gasEstimate: 150000,
          reserve0: BigInt(10000000),
          reserve1: BigInt(10000000)
        }
      ];

      const result = calculator.calculatePathSlippage(hops);

      expect(result.hopImpacts).toHaveLength(2);
      expect(result.cumulativeSlippage).toBeGreaterThan(0);
      expect(result.finalAmount).toBeGreaterThan(BigInt(0));
      expect(result.totalSlippageCost).toBeGreaterThanOrEqual(BigInt(0));
    });

    it('should trigger warning for high price impact', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt(5000000), // Large trade
          amountOut: BigInt(4000000),
          fee: 0.003,
          gasEstimate: 150000,
          reserve0: BigInt(10000000), // Small pool
          reserve1: BigInt(10000000)
        }
      ];

      const result = calculator.calculatePathSlippage(hops);

      expect(result.priceImpactWarning).toBe(true);
    });

    it('should not trigger warning for low price impact', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt(10000), // Small trade
          amountOut: BigInt(9970),
          fee: 0.003,
          gasEstimate: 150000,
          reserve0: BigInt(10000000), // Large pool
          reserve1: BigInt(10000000)
        }
      ];

      const result = calculator.calculatePathSlippage(hops);

      expect(result.priceImpactWarning).toBe(false);
    });
  });

  describe('calculateOptimalTradeSize', () => {
    it('should return optimal trade size for given max impact', () => {
      const reserveIn = BigInt(10000000);
      const reserveOut = BigInt(10000000);
      const fee = 0.003;
      const maxImpact = 1.0; // 1%

      const optimalSize = calculator.calculateOptimalTradeSize(
        reserveIn,
        reserveOut,
        fee,
        maxImpact
      );

      expect(optimalSize).toBeGreaterThan(BigInt(0));
      expect(optimalSize).toBeLessThan(reserveIn);
    });

    it('should scale with reserve size', () => {
      const smallReserve = BigInt(1000000);
      const largeReserve = BigInt(10000000);
      const fee = 0.003;

      const smallOptimal = calculator.calculateOptimalTradeSize(
        smallReserve,
        smallReserve,
        fee,
        1.0
      );

      const largeOptimal = calculator.calculateOptimalTradeSize(
        largeReserve,
        largeReserve,
        fee,
        1.0
      );

      expect(largeOptimal).toBeGreaterThan(smallOptimal);
    });
  });

  describe('isTradeSizeSafe', () => {
    it('should return true for small trades', () => {
      const amountIn = BigInt(100000);
      const reserveIn = BigInt(10000000);

      const isSafe = calculator.isTradeSizeSafe(amountIn, reserveIn);
      expect(isSafe).toBe(true);
    });

    it('should return false for large trades', () => {
      const amountIn = BigInt(500000); // 5% of pool
      const reserveIn = BigInt(10000000);

      const isSafe = calculator.isTradeSizeSafe(amountIn, reserveIn, 3.0);
      expect(isSafe).toBe(false);
    });

    it('should handle zero reserves', () => {
      const isSafe = calculator.isTradeSizeSafe(BigInt(100000), BigInt(0));
      expect(isSafe).toBe(false);
    });
  });

  describe('registerPoolCurveType', () => {
    it('should register and use different AMM curve types', () => {
      calculator.registerPoolCurveType('0x123', 'stable-swap');

      const amountIn = BigInt(1000000);
      const reserveIn = BigInt(10000000);
      const reserveOut = BigInt(10000000);
      const fee = 0.0004;

      const impact = calculator.calculatePriceImpact(
        amountIn,
        reserveIn,
        reserveOut,
        fee,
        '0x123'
      );

      // Stable swap should have lower slippage
      expect(impact.percentage).toBeLessThan(2.0);
    });
  });

  describe('getPathWarnings', () => {
    it('should return warnings for high slippage paths', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt(5000000),
          amountOut: BigInt(4000000),
          fee: 0.003,
          gasEstimate: 150000,
          reserve0: BigInt(10000000),
          reserve1: BigInt(10000000)
        }
      ];

      const result = calculator.calculatePathSlippage(hops);
      const warnings = calculator.getPathWarnings(result);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('price impact'))).toBe(true);
    });

    it('should return no warnings for safe paths', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt(10000),
          amountOut: BigInt(9970),
          fee: 0.003,
          gasEstimate: 150000,
          reserve0: BigInt(10000000),
          reserve1: BigInt(10000000)
        }
      ];

      const result = calculator.calculatePathSlippage(hops);
      const warnings = calculator.getPathWarnings(result);

      expect(warnings.length).toBe(0);
    });
  });

  describe('different AMM curve types', () => {
    it('should calculate differently for concentrated liquidity', () => {
      calculator.registerPoolCurveType('0x123', 'concentrated-liquidity');

      const impact = calculator.calculatePriceImpact(
        BigInt(1000000),
        BigInt(10000000),
        BigInt(10000000),
        0.003,
        '0x123'
      );

      expect(impact.amountOut).toBeGreaterThan(BigInt(0));
    });

    it('should calculate differently for stable swap', () => {
      calculator.registerPoolCurveType('0x456', 'stable-swap');

      const stableImpact = calculator.calculatePriceImpact(
        BigInt(1000000),
        BigInt(10000000),
        BigInt(10000000),
        0.0004,
        '0x456'
      );

      const constantProductImpact = calculator.calculatePriceImpact(
        BigInt(1000000),
        BigInt(10000000),
        BigInt(10000000),
        0.0004,
        '0x789'
      );

      // Stable swap should have lower price impact
      expect(stableImpact.percentage).toBeLessThan(constantProductImpact.percentage);
    });
  });
});
