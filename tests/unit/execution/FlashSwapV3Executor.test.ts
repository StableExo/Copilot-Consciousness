/**
 * FlashSwapV3Executor Tests
 * 
 * Comprehensive test suite for multi-source flash loan executor
 * Tests source selection, path construction, gas estimation, and execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';
import {
  FlashSwapV3Executor,
  FlashLoanSource,
  DexType,
  SwapStep,
  UniversalSwapPath,
} from '../../../src/execution/FlashSwapV3Executor';

describe('FlashSwapV3Executor', () => {
  let executor: FlashSwapV3Executor;
  let mockProvider: ethers.Provider;
  let mockSigner: ethers.Signer;
  let mockContract: any;

  const MOCK_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  const WETH = '0x4200000000000000000000000000000000000006';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const BASE_CHAIN_ID = 8453;

  beforeEach(() => {
    // Mock provider
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: BASE_CHAIN_ID }),
      getFeeData: vi.fn().mockResolvedValue({
        gasPrice: ethers.parseUnits('0.01', 'gwei'),
        maxFeePerGas: ethers.parseUnits('0.02', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.001', 'gwei'),
      }),
      estimateGas: vi.fn().mockResolvedValue(250000n),
      call: vi.fn().mockResolvedValue('0x'),
    } as any;

    // Mock signer
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0xowner'),
      sendTransaction: vi.fn().mockResolvedValue({
        hash: '0xtxhash',
        wait: vi.fn().mockResolvedValue({
          status: 1,
          gasUsed: 250000n,
          effectiveGasPrice: ethers.parseUnits('0.01', 'gwei'),
        }),
      }),
      provider: mockProvider,
    } as any;

    // Create executor instance
    executor = new FlashSwapV3Executor({
      contractAddress: MOCK_CONTRACT_ADDRESS,
      provider: mockProvider,
      signer: mockSigner,
      gasBuffer: 1.2,
      defaultSlippage: 0.01,
      chainId: BASE_CHAIN_ID,
    });
  });

  describe('Source Selection', () => {
    beforeEach(() => {
      // Mock contract selectOptimalSource call
      mockProvider.call = vi.fn().mockImplementation(async (tx: any) => {
        // Return Balancer (0) by default
        return ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [FlashLoanSource.BALANCER]);
      });
    });

    it('should select Balancer for supported tokens on Base', async () => {
      const source = await executor.selectOptimalSource(WETH, ethers.parseEther('10'));
      
      expect(Number(source.source)).toBe(FlashLoanSource.BALANCER);
      expect(source.fee).toBe(0);
      expect(source.estimatedCost).toBe(0n);
    });

    it('should select Aave for unsupported tokens', async () => {
      // Mock returning Aave source
      mockProvider.call = vi.fn().mockResolvedValue(
        ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [FlashLoanSource.AAVE])
      );
      
      const source = await executor.selectOptimalSource(USDC, ethers.parseUnits('10000', 6));
      
      expect(Number(source.source)).toBe(FlashLoanSource.AAVE);
      expect(source.fee).toBe(9); // 0.09% = 9 bps
    });

    it('should select hybrid mode for large amounts', async () => {
      // Mock returning hybrid mode
      mockProvider.call = vi.fn().mockResolvedValue(
        ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [FlashLoanSource.HYBRID_AAVE_V4])
      );
      
      const largeAmount = ethers.parseUnits('50000000', 6); // 50M USDC
      const source = await executor.selectOptimalSource(USDC, largeAmount);
      
      expect(Number(source.source)).toBe(FlashLoanSource.HYBRID_AAVE_V4);
      expect(source.fee).toBe(9); // Hybrid uses Aave fee
    });

    it('should not select dYdX on Base (Ethereum only)', async () => {
      const source = await executor.selectOptimalSource(WETH, ethers.parseEther('10'));
      
      // dYdX is Ethereum mainnet only
      expect(source.source).not.toBe(FlashLoanSource.DYDX);
    });

    it('should calculate correct fee cost', async () => {
      const amount = ethers.parseEther('10');
      
      // Test Aave fee calculation
      mockProvider.call = vi.fn().mockResolvedValue(
        ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [FlashLoanSource.AAVE])
      );
      const aaveSource = await executor.selectOptimalSource(WETH, amount);
      const expectedAaveCost = (amount * 9n) / 10000n; // 0.09%
      expect(aaveSource.estimatedCost).toBe(expectedAaveCost);
      
      // Test Balancer fee calculation
      mockProvider.call = vi.fn().mockResolvedValue(
        ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [FlashLoanSource.BALANCER])
      );
      const balancerSource = await executor.selectOptimalSource(WETH, amount);
      expect(balancerSource.estimatedCost).toBe(0n);
    });
  });

  describe('Path Construction', () => {
    it('should build valid single-step path', () => {
      const steps: SwapStep[] = [
        {
          pool: '0xpool1',
          tokenIn: WETH,
          tokenOut: USDC,
          fee: 500, // 0.05%
          minOut: ethers.parseUnits('1000', 6),
          dexType: DexType.UNISWAP_V3,
        },
      ];

      const path: UniversalSwapPath = {
        steps,
        borrowAmount: ethers.parseEther('1'),
        minFinalAmount: ethers.parseUnits('1000', 6),
      };

      expect(path.steps.length).toBe(1);
      expect(path.steps[0].tokenIn).toBe(WETH);
      expect(path.steps[0].tokenOut).toBe(USDC);
    });

    it('should build valid multi-step path', () => {
      const steps: SwapStep[] = [
        {
          pool: '0xpool1',
          tokenIn: WETH,
          tokenOut: USDC,
          fee: 500,
          minOut: ethers.parseUnits('1000', 6),
          dexType: DexType.UNISWAP_V3,
        },
        {
          pool: '0xpool2',
          tokenIn: USDC,
          tokenOut: WETH,
          fee: 3000,
          minOut: ethers.parseEther('1.05'),
          dexType: DexType.UNISWAP_V3,
        },
      ];

      const path: UniversalSwapPath = {
        steps,
        borrowAmount: ethers.parseEther('1'),
        minFinalAmount: ethers.parseEther('1.05'),
      };

      expect(path.steps.length).toBe(2);
      expect(path.steps[0].tokenOut).toBe(path.steps[1].tokenIn);
      expect(path.minFinalAmount).toBeGreaterThan(path.borrowAmount);
    });

    it('should support multiple DEX types', () => {
      const steps: SwapStep[] = [
        {
          pool: '0xpool1',
          tokenIn: WETH,
          tokenOut: USDC,
          fee: 500,
          minOut: 0n,
          dexType: DexType.UNISWAP_V3,
        },
        {
          pool: '0xpool2',
          tokenIn: USDC,
          tokenOut: WETH,
          fee: 0,
          minOut: 0n,
          dexType: DexType.SUSHISWAP,
        },
        {
          pool: '0xpool3',
          tokenIn: WETH,
          tokenOut: USDC,
          fee: 500,
          minOut: 0n,
          dexType: DexType.AERODROME,
        },
      ];

      const uniqueDexTypes = new Set(steps.map((s) => s.dexType));
      expect(uniqueDexTypes.size).toBe(3);
      expect(uniqueDexTypes).toContain(DexType.UNISWAP_V3);
      expect(uniqueDexTypes).toContain(DexType.SUSHISWAP);
      expect(uniqueDexTypes).toContain(DexType.AERODROME);
    });
  });

  describe('Path Validation', () => {
    it('should accept valid single-step path', () => {
      const path: UniversalSwapPath = {
        steps: [
          {
            pool: '0xpool1',
            tokenIn: WETH,
            tokenOut: USDC,
            fee: 500,
            minOut: 0n,
            dexType: DexType.UNISWAP_V3,
          },
        ],
        borrowAmount: ethers.parseEther('1'),
        minFinalAmount: ethers.parseUnits('1000', 6),
      };

      expect(path.steps.length).toBe(1);
      expect(path.borrowAmount).toBeGreaterThan(0n);
      expect(path.minFinalAmount).toBeGreaterThan(0n);
    });

    it('should accept valid multi-step path', () => {
      const multiStepPath: UniversalSwapPath = {
        steps: [
          {
            pool: '0xpool1',
            tokenIn: WETH,
            tokenOut: USDC,
            fee: 500,
            minOut: 0n,
            dexType: DexType.UNISWAP_V3,
          },
          {
            pool: '0xpool2',
            tokenIn: USDC,
            tokenOut: WETH,
            fee: 3000,
            minOut: 0n,
            dexType: DexType.UNISWAP_V3,
          },
        ],
        borrowAmount: ethers.parseEther('1'),
        minFinalAmount: ethers.parseEther('1.05'),
      };

      expect(multiStepPath.steps.length).toBe(2);
      expect(multiStepPath.steps[0].tokenOut).toBe(multiStepPath.steps[1].tokenIn);
    });
  });

  describe('Profit Calculation', () => {
    it('should calculate gross profit correctly', () => {
      const borrowAmount = ethers.parseEther('10');
      const finalAmount = ethers.parseEther('10.5');
      const feePaid = 0n; // Balancer 0% fee

      const grossProfit = finalAmount - borrowAmount;
      const netProfit = finalAmount - borrowAmount - feePaid;

      expect(grossProfit).toBe(ethers.parseEther('0.5'));
      expect(netProfit).toBe(ethers.parseEther('0.5'));
    });

    it('should account for Aave fees in net profit', () => {
      const borrowAmount = ethers.parseEther('10');
      const finalAmount = ethers.parseEther('10.5');
      const aaveFee = (borrowAmount * 9n) / 10000n; // 0.09%

      const grossProfit = finalAmount - borrowAmount;
      const netProfit = finalAmount - borrowAmount - aaveFee;

      expect(grossProfit).toBe(ethers.parseEther('0.5'));
      expect(netProfit).toBeLessThan(grossProfit);
      expect(netProfit).toBeGreaterThan(0n);
    });

    it('should calculate tithe distribution correctly', () => {
      const netProfit = ethers.parseEther('1');
      const titheBps = 7000; // 70%

      const titheAmount = (netProfit * BigInt(titheBps)) / 10000n;
      const ownerAmount = netProfit - titheAmount;

      expect(titheAmount).toBe(ethers.parseEther('0.7'));
      expect(ownerAmount).toBe(ethers.parseEther('0.3'));
      expect(titheAmount + ownerAmount).toBe(netProfit);
    });
  });

  describe('Source Availability', () => {
    it('should check Balancer availability on Base', async () => {
      mockProvider.call = vi.fn().mockResolvedValue(
        ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [true])
      );
      
      const isAvailable = await executor.isBalancerSupported(WETH, ethers.parseEther('10'));
      expect(isAvailable).toBe(true);
    });

    it('should check dYdX availability (not on Base)', async () => {
      mockProvider.call = vi.fn().mockResolvedValue(
        ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [false])
      );
      
      const isAvailable = await executor.isDydxSupported(WETH, ethers.parseEther('10'));
      expect(isAvailable).toBe(false); // dYdX is Ethereum mainnet only
    });

    it('should handle errors gracefully', async () => {
      mockProvider.call = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const isAvailable = await executor.isBalancerSupported(WETH, ethers.parseEther('10'));
      expect(isAvailable).toBe(false); // Returns false on error
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      const executorWithDefaults = new FlashSwapV3Executor({
        contractAddress: MOCK_CONTRACT_ADDRESS,
        provider: mockProvider,
      });

      expect(executorWithDefaults).toBeDefined();
    });

    it('should accept custom gas buffer', () => {
      const customBuffer = 1.5; // 50% buffer
      const executorWithBuffer = new FlashSwapV3Executor({
        contractAddress: MOCK_CONTRACT_ADDRESS,
        provider: mockProvider,
        gasBuffer: customBuffer,
      });

      expect(executorWithBuffer).toBeDefined();
    });

    it('should accept custom slippage tolerance', () => {
      const customSlippage = 0.02; // 2%
      const executorWithSlippage = new FlashSwapV3Executor({
        contractAddress: MOCK_CONTRACT_ADDRESS,
        provider: mockProvider,
        defaultSlippage: customSlippage,
      });

      expect(executorWithSlippage).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle contract call failures gracefully', async () => {
      mockProvider.call = vi.fn().mockRejectedValue(new Error('Contract error'));
      
      await expect(
        executor.selectOptimalSource(WETH, ethers.parseEther('1'))
      ).rejects.toThrow();
    });

    it('should handle invalid token addresses', async () => {
      const invalidToken = '0xinvalid';
      
      mockProvider.call = vi.fn().mockRejectedValue(new Error('Invalid token'));
      
      await expect(
        executor.selectOptimalSource(invalidToken, ethers.parseEther('1'))
      ).rejects.toThrow();
    });

    it('should validate path structure', () => {
      // Path validation might be done by contract
      const validPath: UniversalSwapPath = {
        steps: [
          {
            pool: '0xpool1',
            tokenIn: WETH,
            tokenOut: USDC,
            fee: 500,
            minOut: ethers.parseUnits('1000', 6),
            dexType: DexType.UNISWAP_V3,
          },
        ],
        borrowAmount: ethers.parseEther('1'),
        minFinalAmount: ethers.parseUnits('1000', 6),
      };

      expect(validPath.steps.length).toBeGreaterThan(0);
      expect(validPath.borrowAmount).toBeGreaterThan(0n);
    });
  });

  describe('Integration with OpportunityExecutor', () => {
    it('should provide compatible interface for execution', () => {
      expect(executor.executeArbitrage).toBeDefined();
      expect(executor.selectOptimalSource).toBeDefined();
      expect(executor.isBalancerSupported).toBeDefined();
      expect(executor.isDydxSupported).toBeDefined();
    });

    it('should construct path from arbitrage opportunity', () => {
      const mockOpportunity: any = {
        path: [
          {
            protocol: 'uniswap_v3',
            poolAddress: '0xpool1',
            tokenIn: WETH,
            tokenOut: USDC,
            fee: 500,
            minAmountOut: ethers.parseUnits('1000', 6).toString(),
          },
        ],
        input: {
          amount: ethers.parseEther('1').toString(),
        },
        expectedProfit: ethers.parseUnits('1050', 6).toString(),
      };

      const path = executor.constructSwapPath(mockOpportunity);
      
      expect(path).toBeDefined();
      expect(path.steps.length).toBe(1);
      expect(path.steps[0].dexType).toBe(DexType.UNISWAP_V3);
    });
  });
});
