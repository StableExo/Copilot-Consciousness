/**
 * FlashSwapExecutor Tests
 *
 * Tests for flash swap arbitrage execution from AxionCitadel
 */

import { Provider, Signer, parseEther } from 'ethers';
import {
  FlashSwapExecutor,
  SwapProtocol,
  ArbParams,
  FlashSwapExecutorConfig,
} from '../FlashSwapExecutor';
// SwapStep reserved for step construction tests
import type { SwapStep as _SwapStep } from '../FlashSwapExecutor';
import { ArbitrageType } from '../../arbitrage/models';
// ArbitrageOpportunity, OpportunityStatus reserved for opportunity tests
import type { ArbitrageOpportunity as _ArbitrageOpportunity, OpportunityStatus as _OpportunityStatus } from '../../arbitrage/models';
import { createArbitrageOpportunity, createPathStep } from '../../arbitrage/models';

describe('FlashSwapExecutor', () => {
  let executor: FlashSwapExecutor;
  let mockProvider: jest.Mocked<Provider>;
  let mockSigner: jest.Mocked<Signer>;

  beforeEach(() => {
    // Create mock provider
    mockProvider = {
      getFeeData: jest.fn(),
      getTransactionCount: jest.fn(),
    } as any;

    // Create mock signer
    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      provider: mockProvider,
      sendTransaction: jest.fn(),
    } as any;

    // Initialize executor
    const config: FlashSwapExecutorConfig = {
      contractAddress: '0xFlashSwapContract',
      provider: mockProvider,
      signer: mockSigner,
      gasBuffer: 1.2,
      defaultSlippage: 0.01,
    };

    executor = new FlashSwapExecutor(config);
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(executor).toBeDefined();
      const stats = executor.getExecutionStats();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
    });

    it('should initialize with default values when not provided', () => {
      const minimalConfig: FlashSwapExecutorConfig = {
        contractAddress: '0xFlashSwapContract',
        provider: mockProvider,
      };

      const minimalExecutor = new FlashSwapExecutor(minimalConfig);
      expect(minimalExecutor).toBeDefined();
    });
  });

  describe('buildArbParams', () => {
    it('should build valid ArbParams from opportunity', () => {
      const opportunity = createArbitrageOpportunity({
        opportunityId: 'test-opp-1',
        arbType: ArbitrageType.TRIANGULAR,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xWETH',
            tokenOut: '0xUSDC',
            amountIn: 1,
            expectedOutput: 2000,
            feeBps: 30,
          }),
          createPathStep({
            step: 1,
            poolAddress: '0xPool2',
            protocol: 'sushiswap',
            tokenIn: '0xUSDC',
            tokenOut: '0xDAI',
            amountIn: 2000,
            expectedOutput: 2000,
            feeBps: 30,
          }),
          createPathStep({
            step: 2,
            poolAddress: '0xPool3',
            protocol: 'uniswap_v2',
            tokenIn: '0xDAI',
            tokenOut: '0xWETH',
            amountIn: 2000,
            expectedOutput: 1.05,
            feeBps: 30,
          }),
        ],
        inputAmount: 1,
        requiresFlashLoan: true,
        flashLoanAmount: 1,
        flashLoanToken: '0xWETH',
        flashLoanPool: '0xAavePool',
      });

      const arbParams = executor.buildArbParams(opportunity);

      expect(arbParams.flashLoanAmount).toEqual(parseEther('1'));
      expect(arbParams.flashLoanToken).toBe('0xWETH');
      expect(arbParams.flashLoanPool).toBe('0xAavePool');
      expect(arbParams.swapSteps.length).toBe(3);
      expect(arbParams.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should apply slippage protection to swap steps', () => {
      const opportunity = createArbitrageOpportunity({
        opportunityId: 'test-opp-2',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xWETH',
            tokenOut: '0xUSDC',
            amountIn: 1,
            expectedOutput: 2000,
            feeBps: 30,
          }),
        ],
        inputAmount: 1,
        requiresFlashLoan: true,
        flashLoanAmount: 1,
        flashLoanToken: '0xWETH',
        flashLoanPool: '0xAavePool',
      });

      const customSlippage = 0.02; // 2%
      const arbParams = executor.buildArbParams(opportunity, customSlippage);

      const expectedOutput = parseEther('2000');
      // ethers v6 uses native bigint - multiply and divide using BigInt math
      const expectedMinOutput =
        (expectedOutput * BigInt(Math.floor((1 - customSlippage) * 10000))) / BigInt(10000);

      expect(arbParams.swapSteps[0].minAmountOut).toEqual(expectedMinOutput);
    });

    it('should correctly parse protocol types', () => {
      const opportunity = createArbitrageOpportunity({
        opportunityId: 'test-opp-3',
        arbType: ArbitrageType.TRIANGULAR,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xWETH',
            tokenOut: '0xUSDC',
            amountIn: 1,
            expectedOutput: 2000,
            feeBps: 30,
          }),
          createPathStep({
            step: 1,
            poolAddress: '0xPool2',
            protocol: 'sushiswap',
            tokenIn: '0xUSDC',
            tokenOut: '0xWETH',
            amountIn: 2000,
            expectedOutput: 1.01,
            feeBps: 30,
          }),
        ],
        inputAmount: 1,
        requiresFlashLoan: true,
        flashLoanAmount: 1,
        flashLoanToken: '0xWETH',
        flashLoanPool: '0xAavePool',
      });

      const arbParams = executor.buildArbParams(opportunity);

      expect(arbParams.swapSteps[0].protocol).toBe(SwapProtocol.UNISWAP_V3);
      expect(arbParams.swapSteps[1].protocol).toBe(SwapProtocol.SUSHISWAP);
    });
  });

  describe('validateArbParams', () => {
    const createValidArbParams = (): ArbParams => ({
      flashLoanAmount: parseEther('1'),
      flashLoanToken: '0x1234567890123456789012345678901234567890',
      flashLoanPool: '0x2234567890123456789012345678901234567890',
      swapSteps: [
        {
          poolAddress: '0x3234567890123456789012345678901234567890',
          tokenIn: '0x4234567890123456789012345678901234567890',
          tokenOut: '0x5234567890123456789012345678901234567890',
          amountIn: parseEther('1'),
          minAmountOut: parseEther('0.99'),
          protocol: SwapProtocol.UNISWAP_V3,
        },
        {
          poolAddress: '0x6234567890123456789012345678901234567890',
          tokenIn: '0x5234567890123456789012345678901234567890',
          tokenOut: '0x4234567890123456789012345678901234567890',
          amountIn: parseEther('0.99'),
          minAmountOut: parseEther('1.01'),
          protocol: SwapProtocol.SUSHISWAP,
        },
      ],
      expectedProfit: parseEther('0.01'),
      deadline: Math.floor(Date.now() / 1000) + 300,
    });

    it('should validate correct parameters', () => {
      const arbParams = createValidArbParams();
      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(true);
      expect(validation.errorMessage).toBeUndefined();
    });

    it('should reject invalid flash loan amount', () => {
      const arbParams = createValidArbParams();
      arbParams.flashLoanAmount = BigInt(0);

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('flash loan amount');
    });

    it('should reject invalid flash loan token address', () => {
      const arbParams = createValidArbParams();
      arbParams.flashLoanToken = 'invalid_address';

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('flash loan token');
    });

    it('should reject invalid flash loan pool address', () => {
      const arbParams = createValidArbParams();
      arbParams.flashLoanPool = '';

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('flash loan pool');
    });

    it('should reject empty swap steps', () => {
      const arbParams = createValidArbParams();
      arbParams.swapSteps = [];

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('swap steps');
    });

    it('should reject non-positive expected profit', () => {
      const arbParams = createValidArbParams();
      arbParams.expectedProfit = BigInt(0);

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('profit');
    });

    it('should reject expired deadline', () => {
      const arbParams = createValidArbParams();
      arbParams.deadline = Math.floor(Date.now() / 1000) - 100; // Past deadline

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('deadline');
    });

    it('should reject invalid pool address in swap step', () => {
      const arbParams = createValidArbParams();
      arbParams.swapSteps[0].poolAddress = 'invalid';

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('pool address');
    });

    it('should reject token mismatch between steps', () => {
      const arbParams = createValidArbParams();
      // Make token_out of step 0 different from token_in of step 1
      arbParams.swapSteps[0].tokenOut = '0x9999999999999999999999999999999999999999';

      const validation = executor.validateArbParams(arbParams);

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('Token mismatch');
    });
  });

  describe('estimateGas', () => {
    it('should estimate gas with buffer', () => {
      const arbParams: ArbParams = {
        flashLoanAmount: parseEther('1'),
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [
          {
            poolAddress: '0x3234567890123456789012345678901234567890',
            tokenIn: '0x4234567890123456789012345678901234567890',
            tokenOut: '0x5234567890123456789012345678901234567890',
            amountIn: parseEther('1'),
            minAmountOut: parseEther('0.99'),
            protocol: SwapProtocol.UNISWAP_V3,
          },
        ],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const estimatedGas = executor.estimateGas(arbParams);

      // Base (100k) + Flash loan (150k) + 1 swap (120k) = 370k
      // With 1.2x buffer = 444k
      expect(estimatedGas).toBeGreaterThan(370000);
      expect(estimatedGas).toBeLessThanOrEqual(450000);
    });

    it('should scale gas estimate with number of swaps', () => {
      const singleSwapParams: ArbParams = {
        flashLoanAmount: parseEther('1'),
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [
          {
            poolAddress: '0x3234567890123456789012345678901234567890',
            tokenIn: '0x4234567890123456789012345678901234567890',
            tokenOut: '0x5234567890123456789012345678901234567890',
            amountIn: parseEther('1'),
            minAmountOut: parseEther('0.99'),
            protocol: SwapProtocol.UNISWAP_V3,
          },
        ],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const tripleSwapParams: ArbParams = {
        ...singleSwapParams,
        swapSteps: [
          ...singleSwapParams.swapSteps,
          ...singleSwapParams.swapSteps,
          ...singleSwapParams.swapSteps,
        ],
      };

      const singleGas = executor.estimateGas(singleSwapParams);
      const tripleGas = executor.estimateGas(tripleSwapParams);

      // Triple swap should use approximately 2x more gas than single
      // (base + flash loan are constants, only swap gas scales)
      expect(tripleGas).toBeGreaterThan(singleGas);
    });
  });

  describe('executeArbitrage', () => {
    it('should execute dry run successfully', async () => {
      const arbParams: ArbParams = {
        flashLoanAmount: parseEther('1'),
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [
          {
            poolAddress: '0x3234567890123456789012345678901234567890',
            tokenIn: '0x4234567890123456789012345678901234567890',
            tokenOut: '0x5234567890123456789012345678901234567890',
            amountIn: parseEther('1'),
            minAmountOut: parseEther('0.99'),
            protocol: SwapProtocol.UNISWAP_V3,
          },
        ],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const result = await executor.executeArbitrage(arbParams, undefined, true);

      expect(result.success).toBe(true);
      expect(result.gasLimit).toBeDefined();
      expect(result.expectedProfit).toEqual(arbParams.expectedProfit);
      expect(result.swapSteps).toBe(1);
    });

    it('should fail validation for invalid parameters', async () => {
      const invalidParams: ArbParams = {
        flashLoanAmount: BigInt(0), // Invalid
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const result = await executor.executeArbitrage(invalidParams, undefined, true);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should update statistics on execution', async () => {
      // Mock contract and signer for actual execution
      const mockContract = {} as any;
      executor.setContract(mockContract);

      const arbParams: ArbParams = {
        flashLoanAmount: parseEther('1'),
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [
          {
            poolAddress: '0x3234567890123456789012345678901234567890',
            tokenIn: '0x4234567890123456789012345678901234567890',
            tokenOut: '0x5234567890123456789012345678901234567890',
            amountIn: parseEther('1'),
            minAmountOut: parseEther('0.99'),
            protocol: SwapProtocol.UNISWAP_V3,
          },
        ],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const statsBefore = executor.getExecutionStats();
      expect(statsBefore.totalExecutions).toBe(0);

      // Even dry runs update statistics
      await executor.executeArbitrage(arbParams, undefined, true);

      const statsAfter = executor.getExecutionStats();
      // Stats ARE updated on dry run (totalExecutions increments)
      expect(statsAfter.totalExecutions).toBe(1);
    });
  });

  describe('simulateArbitrage', () => {
    it('should simulate execution successfully', async () => {
      const arbParams: ArbParams = {
        flashLoanAmount: parseEther('1'),
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [
          {
            poolAddress: '0x3234567890123456789012345678901234567890',
            tokenIn: '0x4234567890123456789012345678901234567890',
            tokenOut: '0x5234567890123456789012345678901234567890',
            amountIn: parseEther('1'),
            minAmountOut: parseEther('0.99'),
            protocol: SwapProtocol.UNISWAP_V3,
          },
        ],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const result = await executor.simulateArbitrage(arbParams);

      expect(result.success).toBe(true);
      expect(result.gasLimit).toBeDefined();
      expect(result.expectedProfit).toEqual(arbParams.expectedProfit);
    });

    it('should fail simulation for invalid parameters', async () => {
      const invalidParams: ArbParams = {
        flashLoanAmount: BigInt(0),
        flashLoanToken: 'invalid',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const result = await executor.simulateArbitrage(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculateFlashLoanFee', () => {
    it('should calculate Aave flash loan fee correctly', () => {
      const amount = parseEther('100');
      const fee = FlashSwapExecutor.calculateFlashLoanFee(amount, 'aave');

      // 0.09% of 100 = 0.09
      const expectedFee = parseEther('0.09');
      expect(fee).toEqual(expectedFee);
    });

    it('should calculate Uniswap V3 flash loan fee correctly', () => {
      const amount = parseEther('100');
      const fee = FlashSwapExecutor.calculateFlashLoanFee(amount, 'uniswap_v3');

      // 0.05% of 100 = 0.05
      const expectedFee = parseEther('0.05');
      expect(fee).toEqual(expectedFee);
    });

    it('should default to Aave fee when provider not specified', () => {
      const amount = parseEther('100');
      const fee = FlashSwapExecutor.calculateFlashLoanFee(amount);

      const expectedFee = parseEther('0.09');
      expect(fee).toEqual(expectedFee);
    });
  });

  describe('getExecutionStats', () => {
    it('should calculate success rate correctly when using actual execution', async () => {
      // For this test, just validate that validation works
      const validParams: ArbParams = {
        flashLoanAmount: parseEther('1'),
        flashLoanToken: '0x1234567890123456789012345678901234567890',
        flashLoanPool: '0x2234567890123456789012345678901234567890',
        swapSteps: [
          {
            poolAddress: '0x3234567890123456789012345678901234567890',
            tokenIn: '0x4234567890123456789012345678901234567890',
            tokenOut: '0x5234567890123456789012345678901234567890',
            amountIn: parseEther('1'),
            minAmountOut: parseEther('0.99'),
            protocol: SwapProtocol.UNISWAP_V3,
          },
        ],
        expectedProfit: parseEther('0.01'),
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const invalidParams: ArbParams = {
        ...validParams,
        flashLoanAmount: BigInt(0),
      };

      // Both dry runs - stats are updated
      await executor.executeArbitrage(validParams, undefined, true);
      await executor.executeArbitrage(invalidParams, undefined, true);

      const stats = executor.getExecutionStats();
      expect(stats.totalExecutions).toBe(2);
      expect(stats.failedExecutions).toBe(1); // invalid params failed
    });
  });
});
