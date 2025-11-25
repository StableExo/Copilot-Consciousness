/**
 * FlashLoanExecutor Tests
 * 
 * Tests for Aave V3 flashloan execution service
 */

import { FlashLoanExecutor, FlashLoanArbitrageParams, SwapStep } from '../FlashLoanExecutor';

describe('FlashLoanExecutor', () => {
  let executor: FlashLoanExecutor;
  let mockProvider: any;
  let mockSigner: any;

  beforeEach(() => {
    // Create proper mock provider with all required methods - ethers v6 uses bigint
    mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(8453), name: 'base' }),
      getBlockNumber: jest.fn().mockResolvedValue(1000),
      call: jest.fn().mockResolvedValue('0x'),
      estimateGas: jest.fn().mockResolvedValue(BigInt(500000)),
    };

    // Create proper mock signer with provider
    mockSigner = {
      provider: mockProvider,
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      sendTransaction: jest.fn().mockResolvedValue({
        hash: '0xabcdef',
        wait: jest.fn().mockResolvedValue({
          status: 1,
          transactionHash: '0xabcdef',
          gasUsed: BigInt(300000),
          logs: [],
        }),
      }),
      signTransaction: jest.fn(),
      connect: jest.fn(),
      _isSigner: true,
    };

    const config = {
      flashSwapAddress: '0x1111111111111111111111111111111111111111',
      aavePoolAddress: '0x2222222222222222222222222222222222222222',
      provider: mockProvider,
      signer: mockSigner,
    };

    executor = new FlashLoanExecutor(config);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(executor).toBeDefined();
      expect(executor.getContract()).toBeDefined();
    });
  });

  describe('encodeSwapPath', () => {
    it('should encode swap path correctly', () => {
      const swapSteps: SwapStep[] = [
        {
          pool: '0x3333333333333333333333333333333333333333',
          tokenIn: '0x4200000000000000000000000000000000000006', // WETH
          tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
          fee: 500,
          minOut: '1000000', // 1 USDC
          dexType: 0, // Uniswap V3
        },
      ];

      // Access private method via any type
      const encoded = (executor as any).encodeSwapPath(swapSteps);
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');
      expect(encoded.startsWith('0x')).toBe(true);
    });
  });

  describe('estimateGas', () => {
    it('should return gas estimate', async () => {
      const params: FlashLoanArbitrageParams = {
        borrowToken: '0x4200000000000000000000000000000000000006',
        borrowAmount: '1000000000000000000', // 1 ETH
        swapPath: [
          {
            pool: '0x3333333333333333333333333333333333333333',
            tokenIn: '0x4200000000000000000000000000000000000006',
            tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            fee: 500,
            minOut: '1000000',
            dexType: 0,
          },
        ],
        expectedProfit: 0.01,
      };

      const gasEstimate = await executor.estimateGas(params);
      expect(gasEstimate).toBeDefined();
      expect(typeof gasEstimate).toBe('bigint');
      expect(gasEstimate > BigInt(0)).toBe(true);
    });

    it('should return default gas on error', async () => {
      // Create mock provider that throws error
      const badMockProvider = {
        ...mockProvider,
        call: jest.fn().mockRejectedValue(new Error('RPC error')),
        estimateGas: jest.fn().mockRejectedValue(new Error('Gas estimation failed')),
      };
      
      const badMockSigner = {
        ...mockSigner,
        provider: badMockProvider,
      };

      const badExecutor = new FlashLoanExecutor({
        flashSwapAddress: '0x0000000000000000000000000000000000000000',
        aavePoolAddress: '0x0000000000000000000000000000000000000000',
        provider: badMockProvider,
        signer: badMockSigner,
      });

      const params: FlashLoanArbitrageParams = {
        borrowToken: '0x4200000000000000000000000000000000000006',
        borrowAmount: '1000000000000000000',
        swapPath: [],
        expectedProfit: 0,
      };

      const gasEstimate = await badExecutor.estimateGas(params);
      expect(gasEstimate).toBe(BigInt(1000000)); // Default value
    });
  });

  describe('getContract', () => {
    it('should return FlashSwapV2 contract instance', () => {
      const contract = executor.getContract();
      expect(contract).toBeDefined();
      expect(contract.address).toBe('0x1111111111111111111111111111111111111111');
    });
  });
});
