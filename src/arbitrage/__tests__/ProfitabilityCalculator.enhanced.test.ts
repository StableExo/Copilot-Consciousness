/**
 * Enhanced ProfitabilityCalculator Tests
 *
 * Comprehensive test suite for enhanced profitability calculations including:
 * - Flash loan fee calculations (Aave and UniswapV3)
 * - Detailed profit breakdowns
 * - Per-token-pair threshold checking
 * - Gas cost conversions
 * - Native currency conversions
 */

import { ProfitabilityCalculator } from '../ProfitabilityCalculator';
import { SimplePriceOracle } from '../SimplePriceOracle';
import { ArbitragePath, ArbitrageHop, FlashLoanConfig } from '../types';

describe('Enhanced ProfitabilityCalculator', () => {
  let calculator: ProfitabilityCalculator;
  let priceOracle: SimplePriceOracle;
  const gasPrice = BigInt(50000000000); // 50 gwei

  // Common token addresses
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';

  beforeEach(() => {
    priceOracle = new SimplePriceOracle(60000); // 1 minute cache
    calculator = new ProfitabilityCalculator(gasPrice, 0.01, priceOracle);
  });

  describe('Flash Loan Fee Calculation', () => {
    describe('Aave Flash Loans', () => {
      it('should calculate 0.09% fee for Aave', () => {
        const borrowAmount = BigInt('1000000000000000000000'); // 1000 tokens
        const config: FlashLoanConfig = {
          provider: 'aave',
          feePercentage: 0.0009,
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);

        // 0.09% of 1000 = 0.9 tokens
        const expectedFee = BigInt('900000000000000000'); // 0.9 tokens
        expect(fee).toBe(expectedFee);
      });

      it('should calculate correct fee for large borrow amounts', () => {
        const borrowAmount = BigInt('100000000000000000000000'); // 100,000 tokens
        const config: FlashLoanConfig = {
          provider: 'aave',
          feePercentage: 0.0009,
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);

        // 0.09% of 100,000 = 90 tokens
        const expectedFee = BigInt('90000000000000000000'); // 90 tokens
        expect(fee).toBe(expectedFee);
      });

      it('should calculate correct fee for small borrow amounts', () => {
        const borrowAmount = BigInt('1000000'); // 1 USDC (6 decimals)
        const config: FlashLoanConfig = {
          provider: 'aave',
          feePercentage: 0.0009,
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);

        // 0.09% of 1 USDC = 0.0009 USDC = 900 (in smallest units)
        const expectedFee = BigInt('900');
        expect(fee).toBe(expectedFee);
      });
    });

    describe('UniswapV3 Flash Loans', () => {
      it('should calculate fee based on pool fee (0.05%)', () => {
        const borrowAmount = BigInt('1000000000000000000000'); // 1000 tokens
        const config: FlashLoanConfig = {
          provider: 'uniswapv3',
          feePercentage: 0,
          poolFee: 0.0005, // 0.05%
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);

        // 0.05% of 1000 = 0.5 tokens
        const expectedFee = BigInt('500000000000000000'); // 0.5 tokens
        expect(fee).toBe(expectedFee);
      });

      it('should calculate fee based on pool fee (0.3%)', () => {
        const borrowAmount = BigInt('1000000000000000000000'); // 1000 tokens
        const config: FlashLoanConfig = {
          provider: 'uniswapv3',
          feePercentage: 0,
          poolFee: 0.003, // 0.3%
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);

        // 0.3% of 1000 = 3 tokens
        const expectedFee = BigInt('3000000000000000000'); // 3 tokens
        expect(fee).toBe(expectedFee);
      });

      it('should calculate fee based on pool fee (1%)', () => {
        const borrowAmount = BigInt('1000000000000000000000'); // 1000 tokens
        const config: FlashLoanConfig = {
          provider: 'uniswapv3',
          feePercentage: 0,
          poolFee: 0.01, // 1%
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);

        // 1% of 1000 = 10 tokens
        const expectedFee = BigInt('10000000000000000000'); // 10 tokens
        expect(fee).toBe(expectedFee);
      });

      it('should return 0 fee when poolFee is not provided', () => {
        const borrowAmount = BigInt('1000000000000000000000');
        const config: FlashLoanConfig = {
          provider: 'uniswapv3',
          feePercentage: 0,
        };

        const fee = calculator.calculateFlashLoanFee(borrowAmount, config);
        expect(fee).toBe(BigInt(0));
      });
    });
  });

  describe('Detailed Profit Breakdown', () => {
    it('should create detailed breakdown for profitable path', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'), // 10 WETH
          amountOut: BigInt('30000000000'), // 30,000 USDC
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('30000000000'), // 30,000 USDC
          amountOut: BigInt('10500000000000000000'), // 10.5 WETH
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('500000000000000000'), // 0.5 WETH
        totalGasCost: BigInt(0),
        netProfit: BigInt('500000000000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, WETH, 18, flashLoanConfig);

      expect(breakdown.initialAmount).toBe(BigInt('10000000000000000000'));
      expect(breakdown.finalAmount).toBe(BigInt('10500000000000000000'));
      expect(breakdown.grossProfit).toBe(BigInt('500000000000000000'));
      expect(breakdown.flashLoanFee).toBeGreaterThan(BigInt(0));
      expect(breakdown.swapFees).toBeGreaterThan(BigInt(0));
      expect(breakdown.totalFees).toBe(breakdown.flashLoanFee + breakdown.swapFees);
      expect(breakdown.gasCostWei).toBeGreaterThan(BigInt(0));
      expect(breakdown.profitable).toBe(true);
    });

    it('should mark unprofitable when costs exceed profit', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('1000000000000000000'), // 1 WETH
          amountOut: BigInt('3001000000'), // 3,001 USDC (small profit)
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('3001000000'),
          amountOut: BigInt('1000100000000000000'), // 1.0001 WETH
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('100000000000000'), // 0.0001 WETH
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, WETH, 18, flashLoanConfig);

      // With fees and gas costs, this should not be profitable
      expect(breakdown.profitable).toBe(false);
      expect(breakdown.netProfit).toBe(BigInt(0));
    });

    it('should calculate profit percentage and ROI correctly', async () => {
      const initialAmount = BigInt('1000000000000000000000'); // 1000 tokens
      const finalAmount = BigInt('1100000000000000000000'); // 1100 tokens (10% gross profit)

      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: initialAmount,
          amountOut: BigInt('3000000000000'), // Intermediate
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('3000000000000'),
          amountOut: finalAmount,
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('100000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, WETH, 18, flashLoanConfig);

      expect(breakdown.roi).toBeGreaterThan(0);
      expect(breakdown.profitPercentage).toBeGreaterThan(0);
    });
  });

  describe('Per-Token-Pair Thresholds', () => {
    it('should use correct threshold for WETH/USDC pair', () => {
      const threshold = calculator.getThresholdForPair(WETH, USDC);
      expect(threshold).toBe(BigInt('50000000000000000000')); // 50 WETH
    });

    it('should use correct threshold for WETH/USDT pair', () => {
      const threshold = calculator.getThresholdForPair(WETH, USDT);
      expect(threshold).toBe(BigInt('50000000000000000000')); // 50 WETH
    });

    it('should use correct threshold for USDC/USDT pair', () => {
      const threshold = calculator.getThresholdForPair(USDC, USDT);
      expect(threshold).toBe(BigInt('5000000000')); // 5000 USDC
    });

    it('should use correct threshold for WBTC/WETH pair', () => {
      const threshold = calculator.getThresholdForPair(WBTC, WETH);
      expect(threshold).toBe(BigInt('100000000')); // 1 WBTC
    });

    it('should use default threshold for unknown pairs', () => {
      const threshold = calculator.getThresholdForPair('0xUnknown1', '0xUnknown2');
      expect(threshold).toBe(BigInt('10000000000000000000')); // 10 tokens (default)
    });

    it('should work with symbols instead of addresses', () => {
      const threshold = calculator.getThresholdForPair('WETH', 'USDC');
      expect(threshold).toBe(BigInt('50000000000000000000')); // 50 WETH
    });

    it('should be order-independent (alphabetically sorted)', () => {
      const threshold1 = calculator.getThresholdForPair(WETH, USDC);
      const threshold2 = calculator.getThresholdForPair(USDC, WETH);
      expect(threshold1).toBe(threshold2);
    });

    it('should allow updating thresholds', () => {
      const newThresholds = {
        'USDC/WETH': BigInt('100000000000000000000'), // 100 WETH (alphabetically sorted)
      };

      calculator.updateThresholds(newThresholds);

      const threshold = calculator.getThresholdForPair(WETH, USDC);
      expect(threshold).toBe(BigInt('100000000000000000000'));
    });
  });

  describe('Gas Cost Conversions', () => {
    it('should convert gas cost to token denomination with oracle', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'),
          amountOut: BigInt('30000000000'),
          fee: 0.003,
          gasEstimate: 200000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: USDC,
        estimatedProfit: BigInt('100000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, USDC, 6, flashLoanConfig);

      expect(breakdown.gasCostWei).toBeGreaterThan(BigInt(0));
      expect(breakdown.gasCostInToken).toBeGreaterThan(BigInt(0));
      expect(breakdown.gasCostInETH).toBe(breakdown.gasCostWei);
    });

    it('should handle gas cost conversion without oracle (fallback)', async () => {
      const calcWithoutOracle = new ProfitabilityCalculator(gasPrice, 0.01);

      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'),
          amountOut: BigInt('30000000000'),
          fee: 0.003,
          gasEstimate: 200000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: USDC,
        estimatedProfit: BigInt('100000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calcWithoutOracle.createDetailedBreakdown(
        path,
        USDC,
        6,
        flashLoanConfig
      );

      // Should still calculate, using fallback
      expect(breakdown.gasCostWei).toBeGreaterThan(BigInt(0));
      expect(breakdown.gasCostInToken).toBeGreaterThan(BigInt(0));
    });
  });

  describe('Native Currency Conversion', () => {
    it('should convert profit to ETH and USD', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('30000000000'), // 30,000 USDC
          amountOut: BigInt('10000000000000000000'), // 10 WETH
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'),
          amountOut: BigInt('31000000000'), // 31,000 USDC (1000 profit)
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: USDC,
        endToken: USDC,
        estimatedProfit: BigInt('1000000000'), // 1000 USDC
        totalGasCost: BigInt(0),
        netProfit: BigInt('1000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, USDC, 6, flashLoanConfig);

      expect(breakdown.netProfitNative).toBeGreaterThan(BigInt(0));
      expect(breakdown.netProfitUSD).toBeGreaterThan(BigInt(0));
    });
  });

  describe('Detailed Profitability with Threshold Check', () => {
    it('should mark as meeting threshold for profitable trade', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('100000000000000000000'), // 100 WETH
          amountOut: BigInt('300000000000'), // 300,000 USDC
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('300000000000'),
          amountOut: BigInt('160000000000000000000'), // 160 WETH (60 profit)
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('60000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('60000000000000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const result = await calculator.calculateDetailedProfitability(path, WETH, 18);

      expect(result.meetsThreshold).toBe(true);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown!.meetsThreshold).toBe(true);
    });

    it('should mark as not meeting threshold for small profit', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'), // 10 WETH
          amountOut: BigInt('30000000000'), // 30,000 USDC
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('30000000000'),
          amountOut: BigInt('10100000000000000000'), // 10.1 WETH (0.1 profit)
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('100000000000000000'), // 0.1 WETH
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const result = await calculator.calculateDetailedProfitability(path, WETH, 18);

      // Threshold is 50 WETH, so 0.1 WETH should not meet it
      expect(result.meetsThreshold).toBe(false);
      expect(result.breakdown!.meetsThreshold).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero profit', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'),
          amountOut: BigInt('30000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('30000000000'),
          amountOut: BigInt('10000000000000000000'), // Same as input
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt(0),
        totalGasCost: BigInt(0),
        netProfit: BigInt(0),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, WETH, 18, flashLoanConfig);

      expect(breakdown.profitable).toBe(false);
      expect(breakdown.netProfit).toBe(BigInt(0));
      expect(breakdown.roi).toBe(0);
    });

    it('should handle loss scenario', async () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'),
          amountOut: BigInt('30000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: USDC,
          tokenOut: WETH,
          amountIn: BigInt('30000000000'),
          amountOut: BigInt('9000000000000000000'), // Less than input (loss)
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt(0),
        totalGasCost: BigInt(0),
        netProfit: BigInt(0),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await calculator.createDetailedBreakdown(path, WETH, 18, flashLoanConfig);

      expect(breakdown.profitable).toBe(false);
      expect(breakdown.grossProfit).toBe(BigInt(0));
      expect(breakdown.netProfit).toBe(BigInt(0));
    });

    it('should handle very high gas costs', async () => {
      const highGasCalculator = new ProfitabilityCalculator(
        BigInt('1000000000000'), // Very high gas price
        0.01,
        priceOracle
      );

      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('10000000000000000000'),
          amountOut: BigInt('30000000000'),
          fee: 0.003,
          gasEstimate: 300000, // High gas estimate
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: USDC,
        estimatedProfit: BigInt('100000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const flashLoanConfig: FlashLoanConfig = {
        provider: 'aave',
        feePercentage: 0.0009,
      };

      const breakdown = await highGasCalculator.createDetailedBreakdown(
        path,
        USDC,
        6,
        flashLoanConfig
      );

      // High gas costs should make it unprofitable
      expect(breakdown.gasCostWei).toBeGreaterThan(BigInt(0));
      expect(breakdown.profitable).toBe(false);
    });
  });

  describe('Calculator Configuration', () => {
    it('should allow setting price oracle', () => {
      const newOracle = new SimplePriceOracle(120000);
      calculator.setPriceOracle(newOracle);

      expect(calculator.getPriceOracle()).toBe(newOracle);
    });

    it('should work without price oracle', () => {
      const calcWithoutOracle = new ProfitabilityCalculator(gasPrice, 0.01);
      expect(calcWithoutOracle.getPriceOracle()).toBeUndefined();
    });

    it('should allow updating gas price dynamically', () => {
      const newGasPrice = BigInt('100000000000'); // 100 gwei
      calculator.updateGasPrice(newGasPrice);

      expect(calculator.getGasPrice()).toBe(newGasPrice);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with calculateProfitability', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('1000000000000000000000'),
          amountOut: BigInt('2000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('100000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.002,
      };

      const result = calculator.calculateProfitability(path);

      expect(result.profitable).toBeDefined();
      expect(result.netProfit).toBeDefined();
      expect(result.roi).toBeDefined();
      expect(result.breakdown).toBeUndefined(); // Old method doesn't return breakdown
    });

    it('should maintain backward compatibility with isProfitable', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: WETH,
          tokenOut: USDC,
          amountIn: BigInt('1000000000000000000000'),
          amountOut: BigInt('1100000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('100000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const isProfitable = calculator.isProfitable(path, BigInt('1000000000000000000'));
      expect(typeof isProfitable).toBe('boolean');
    });

    it('should maintain backward compatibility with comparePathProfitability', () => {
      const path1: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x123',
            tokenIn: WETH,
            tokenOut: USDC,
            amountIn: BigInt('1000000000000000000000'),
            amountOut: BigInt('1050000000000000000000'),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('50000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('50000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const path2: ArbitragePath = {
        hops: [
          {
            dexName: 'SushiSwap',
            poolAddress: '0x456',
            tokenIn: WETH,
            tokenOut: USDC,
            amountIn: BigInt('1000000000000000000000'),
            amountOut: BigInt('1100000000000000000000'),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: WETH,
        endToken: WETH,
        estimatedProfit: BigInt('100000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const betterPath = calculator.comparePathProfitability(path1, path2);
      expect(betterPath).toBe(path2);
    });
  });
});
