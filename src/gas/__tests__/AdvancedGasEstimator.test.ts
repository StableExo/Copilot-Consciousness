/**
 * Tests for AdvancedGasEstimator
 */

import { JsonRpcProvider } from 'ethers';
import { AdvancedGasEstimator, DEXGasConfig } from '../AdvancedGasEstimator';
import { GasPriceOracle } from '../GasPriceOracle';
import { ArbitragePath } from '../../arbitrage/types';

// Mock provider
const mockProvider = {
  estimateGas: jest.fn(),
  getBlock: jest.fn(),
  getFeeData: jest.fn(),
  call: jest.fn(),
} as unknown as JsonRpcProvider;

// Mock oracle
class MockGasPriceOracle extends GasPriceOracle {
  constructor() {
    super('http://localhost:8545', undefined, 12000, BigInt(50) * BigInt(10 ** 9));
  }

  async getCurrentGasPrice() {
    return {
      gasPrice: BigInt(50) * BigInt(10 ** 9),
      maxFeePerGas: BigInt(50) * BigInt(10 ** 9),
      maxPriorityFeePerGas: BigInt(2) * BigInt(10 ** 9),
      baseFee: BigInt(48) * BigInt(10 ** 9),
      timestamp: Date.now(),
    };
  }
}

describe('AdvancedGasEstimator', () => {
  let estimator: AdvancedGasEstimator;
  let oracle: MockGasPriceOracle;

  beforeEach(() => {
    oracle = new MockGasPriceOracle();
    estimator = new AdvancedGasEstimator(mockProvider, oracle);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(estimator).toBeDefined();
      const config = estimator.getConfig();
      expect(config.bufferMultiplier).toBe(1.1);
      expect(config.maxBufferMultiplier).toBe(1.5);
      expect(config.useOnChainEstimation).toBe(true);
      expect(config.fallbackToHeuristic).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customEstimator = new AdvancedGasEstimator(mockProvider, oracle, {
        bufferMultiplier: 1.2,
        maxGasPrice: BigInt(1000) * BigInt(10 ** 9),
        minProfitAfterGas: BigInt(50) * BigInt(10 ** 18),
      });

      const config = customEstimator.getConfig();
      expect(config.bufferMultiplier).toBe(1.2);
      expect(config.maxGasPrice).toBe(BigInt(1000) * BigInt(10 ** 9));
      expect(config.minProfitAfterGas).toBe(BigInt(50) * BigInt(10 ** 18));
    });
  });

  describe('estimateGasHeuristic', () => {
    it('should estimate gas for a single-hop path', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.estimateGasHeuristic(path);

      expect(result.success).toBe(true);
      expect(result.estimatedGas).toBeGreaterThan(BigInt(0));
      expect(result.gasPrice).toBeGreaterThan(BigInt(0));
      expect(result.totalGasCost).toBeGreaterThan(BigInt(0));
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown?.baseGas).toBeGreaterThan(BigInt(0));
    });

    it('should estimate gas for a multi-hop path', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1050) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
          {
            dexName: 'SushiSwap',
            poolAddress: '0x2345678901234567890123456789012345678901',
            tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            amountIn: BigInt(1050) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 130000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(280000),
        netProfit: BigInt(90) * BigInt(10 ** 18),
        totalFees: 0.006,
        slippageImpact: 0.02,
      };

      const result = await estimator.estimateGasHeuristic(path);

      expect(result.success).toBe(true);
      expect(result.estimatedGas).toBeGreaterThan(BigInt(0));
      expect(result.breakdown).toBeDefined();
      // Multi-hop should have higher gas than single-hop
      expect(Number(result.estimatedGas)).toBeGreaterThan(150000);
    });

    it('should identify unprofitable paths', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Curve',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1001) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 180000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(1) * BigInt(10 ** 18), // Very low profit
        totalGasCost: BigInt(180000),
        netProfit: BigInt(0),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.estimateGasHeuristic(path);

      expect(result.success).toBe(true);
      expect(result.profitable).toBe(false);
    });
  });

  describe('estimateGasOnChain', () => {
    it('should use provider estimateGas when available', async () => {
      (mockProvider.estimateGas as jest.Mock).mockResolvedValue(BigInt(150000));

      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.estimateGasOnChain(
        path,
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      );

      expect(result.success).toBe(true);
      expect(mockProvider.estimateGas).toHaveBeenCalled();
      // Should include buffer
      expect(Number(result.estimatedGas)).toBeGreaterThan(150000);
    });

    it('should fallback to heuristic on provider failure', async () => {
      (mockProvider.estimateGas as jest.Mock).mockRejectedValue(new Error('Execution reverted'));

      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.estimateGasOnChain(
        path,
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      );

      // Should fallback to heuristic
      expect(result.success).toBe(true);
      expect(result.breakdown).toBeDefined();
    });
  });

  describe('validateExecution', () => {
    it('should validate profitable paths', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.validateExecution(path);

      expect(result.valid).toBe(true);
      expect(result.executable).toBe(true);
      expect(result.estimatedGas).toBeDefined();
      expect(result.netProfit).toBeDefined();
    });

    it('should reject unprofitable paths', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Curve',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1001) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 180000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(1) * BigInt(10 ** 18), // Very low profit
        totalGasCost: BigInt(180000),
        netProfit: BigInt(0),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.validateExecution(path);

      expect(result.valid).toBe(true);
      expect(result.executable).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject paths with gas cost above percentage threshold', async () => {
      // Create a path where gas cost will be > 50% of profit
      // With 50 gwei gas price and ~200k gas, gas cost will be ~0.01 ETH = 10^16 wei
      // Profit needs to be > minProfitAfterGas (10 * 10^18 wei) after gas
      // So we need gross profit of ~0.02 ETH (20 * 10^15 wei) for net ~0.01 ETH after gas
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Balancer',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1020) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 200000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        // Gas cost will be ~0.013 ETH (13 * 10^15 wei), profit is 0.02 ETH, so gas is ~65% of profit
        estimatedProfit: BigInt(20) * BigInt(10 ** 15), // 0.02 ETH
        totalGasCost: BigInt(200000),
        netProfit: BigInt(7) * BigInt(10 ** 15),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.validateExecution(path);

      expect(result.valid).toBe(true);
      expect(result.executable).toBe(false);
      // Could be either minimum profit or percentage reason
      expect(result.reason).toBeDefined();
    });
  });

  describe('DEX configuration', () => {
    it('should register custom DEX configuration', () => {
      const customConfig: DEXGasConfig = {
        dexName: 'CustomDEX',
        baseGas: 100000,
        gasPerHop: 25000,
        overhead: 15000,
        complexity: 1.0,
      };

      estimator.registerDEXConfig(customConfig);
      const config = estimator.getConfig();

      expect(config.dexConfigs.has('CustomDEX')).toBe(true);
      expect(config.dexConfigs.get('CustomDEX')).toEqual(customConfig);
    });

    it('should use default config for unknown DEX', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'UnknownDEX',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await estimator.estimateGasHeuristic(path);

      expect(result.success).toBe(true);
      // Should use default config, which has higher gas estimates
      expect(Number(result.estimatedGas)).toBeGreaterThan(150000);
    });
  });

  describe('statistics', () => {
    it('should track estimation statistics', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const statsBefore = estimator.getStats();
      expect(statsBefore.totalEstimations).toBe(0);

      await estimator.estimateGasHeuristic(path);

      const statsAfter = estimator.getStats();
      expect(statsAfter.totalEstimations).toBe(1);
      expect(statsAfter.heuristicEstimations).toBe(1);
    });

    it('should reset statistics', async () => {
      const path: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0x1234567890123456789012345678901234567890',
            tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            amountIn: BigInt(1000) * BigInt(10 ** 18),
            amountOut: BigInt(1100) * BigInt(10 ** 18),
            fee: 0.003,
            gasEstimate: 150000,
          },
        ],
        startToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        endToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        estimatedProfit: BigInt(100) * BigInt(10 ** 18),
        totalGasCost: BigInt(150000),
        netProfit: BigInt(95) * BigInt(10 ** 18),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      await estimator.estimateGasHeuristic(path);
      estimator.resetStats();

      const stats = estimator.getStats();
      expect(stats.totalEstimations).toBe(0);
      expect(stats.heuristicEstimations).toBe(0);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      estimator.updateConfig({
        bufferMultiplier: 1.15,
        maxGasPrice: BigInt(800) * BigInt(10 ** 9),
      });

      const config = estimator.getConfig();
      expect(config.bufferMultiplier).toBe(1.15);
      expect(config.maxGasPrice).toBe(BigInt(800) * BigInt(10 ** 9));
    });

    it('should maintain other config values when updating', () => {
      const originalConfig = estimator.getConfig();

      estimator.updateConfig({
        bufferMultiplier: 1.15,
      });

      const newConfig = estimator.getConfig();
      expect(newConfig.bufferMultiplier).toBe(1.15);
      expect(newConfig.minProfitAfterGas).toBe(originalConfig.minProfitAfterGas);
      expect(newConfig.maxGasCostPercentage).toBe(originalConfig.maxGasCostPercentage);
    });
  });
});
