import { ProfitabilityCalculator } from '../ProfitabilityCalculator';
import { ArbitragePath, ArbitrageHop } from '../types';

describe('ProfitabilityCalculator', () => {
  let calculator: ProfitabilityCalculator;
  const gasPrice = BigInt(50000000000); // 50 gwei

  beforeEach(() => {
    calculator = new ProfitabilityCalculator(gasPrice, 0.01);
  });

  describe('calculateProfitability', () => {
    it('should calculate profitability for a simple path', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt('1000000000000000000000'), // 1000 tokens
          amountOut: BigInt('2000000000000000000000'), // 2000 tokens
          fee: 0.003,
          gasEstimate: 150000,
        },
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: '0xToken2',
          tokenOut: '0xToken1',
          amountIn: BigInt('2000000000000000000000'),
          amountOut: BigInt('1100000000000000000000'), // 1100 tokens (profit)
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt('100000000000000000000'), // 100 tokens profit
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000000'),
        totalFees: 0.006,
        slippageImpact: 0.002,
      };

      const result = calculator.calculateProfitability(path);

      expect(result.profitable).toBe(true);
      expect(result.estimatedProfit).toBeGreaterThan(BigInt(0));
      expect(result.totalGas).toBeGreaterThan(BigInt(0));
      expect(result.totalFees).toBeGreaterThan(BigInt(0));
      expect(result.roi).toBeGreaterThan(0);
    });

    it('should return unprofitable for high gas costs', () => {
      const highGasCalculator = new ProfitabilityCalculator(BigInt('1000000000000'), 0.01); // Very high gas

      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt('1000000000000000000'), // 1 token
          amountOut: BigInt('1010000000000000000'), // 1.01 tokens
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt('10000000000000000'), // 0.01 tokens profit
        totalGasCost: BigInt(0),
        netProfit: BigInt('10000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const result = highGasCalculator.calculateProfitability(path);

      // With very high gas, it should be unprofitable
      expect(result.profitable).toBe(false);
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const amountIn = BigInt('100000000000000000000'); // 100 tokens
      const reserve0 = BigInt('1000000000000000000000'); // 1000 tokens
      const reserve1 = BigInt('2000000000000000000000'); // 2000 tokens

      const impact = calculator.calculatePriceImpact(amountIn, reserve0, reserve1);

      expect(impact).toBeGreaterThan(0);
      expect(impact).toBeLessThan(1);
    });

    it('should return 100% impact for zero liquidity', () => {
      const amountIn = BigInt('100000000000000000000');
      const reserve0 = BigInt(0);
      const reserve1 = BigInt('2000000000000000000000');

      const impact = calculator.calculatePriceImpact(amountIn, reserve0, reserve1);

      expect(impact).toBe(1.0);
    });
  });

  describe('isProfitable', () => {
    it('should return true for profitable paths', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt('1000000000000000000000'),
          amountOut: BigInt('2000000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt('100000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('100000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const minThreshold = BigInt('1000000000000000000'); // 1 token
      const isProfitable = calculator.isProfitable(path, minThreshold);

      expect(isProfitable).toBe(true);
    });

    it('should return false when below threshold', () => {
      const hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt('1000000000000000000000'),
          amountOut: BigInt('1001000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path: ArbitragePath = {
        hops,
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt('1000000000000000000'), // 1 token
        totalGasCost: BigInt(0),
        netProfit: BigInt('1000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const minThreshold = BigInt('1000000000000000000000'); // 1000 tokens
      const isProfitable = calculator.isProfitable(path, minThreshold);

      expect(isProfitable).toBe(false);
    });
  });

  describe('comparePathProfitability', () => {
    it('should return the more profitable path', () => {
      const path1Hops: ArbitrageHop[] = [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x123',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt('1000000000000000000000'),
          amountOut: BigInt('1050000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path1: ArbitragePath = {
        hops: path1Hops,
        startToken: '0xToken1',
        endToken: '0xToken1',
        estimatedProfit: BigInt('50000000000000000000'),
        totalGasCost: BigInt(0),
        netProfit: BigInt('50000000000000000000'),
        totalFees: 0.003,
        slippageImpact: 0.001,
      };

      const path2Hops: ArbitrageHop[] = [
        {
          dexName: 'SushiSwap',
          poolAddress: '0x456',
          tokenIn: '0xToken1',
          tokenOut: '0xToken2',
          amountIn: BigInt('1000000000000000000000'),
          amountOut: BigInt('1100000000000000000000'),
          fee: 0.003,
          gasEstimate: 150000,
        },
      ];

      const path2: ArbitragePath = {
        hops: path2Hops,
        startToken: '0xToken1',
        endToken: '0xToken1',
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

  describe('updateGasPrice', () => {
    it('should update gas price', () => {
      const newGasPrice = BigInt(100000000000); // 100 gwei
      calculator.updateGasPrice(newGasPrice);

      expect(calculator.getGasPrice()).toBe(newGasPrice);
    });
  });
});
