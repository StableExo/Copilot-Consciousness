/**
 * Tests for FlashSwapExecutorFactory
 * 
 * Validates factory pattern, version selection, rollout percentage,
 * and automatic fallback behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlashSwapExecutorFactory } from '../FlashSwapExecutorFactory';
import type { ArbitrageOpportunity } from '../../types/definitions';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock FlashLoanExecutor
vi.mock('../FlashLoanExecutor', () => ({
  FlashLoanExecutor: vi.fn().mockImplementation(() => ({
    executeFlashLoan: vi.fn().mockResolvedValue({
      success: true,
      txHash: '0xv2tx',
      profit: '1000000000000000000',
      gasUsed: 250000n,
    }),
  })),
}));

// Mock FlashSwapV3Executor
vi.mock('../../execution/FlashSwapV3Executor', () => ({
  FlashSwapV3Executor: vi.fn().mockImplementation(() => ({
    constructSwapPath: vi.fn().mockReturnValue([{
      dexType: 0,
      pool: '0xPool',
      tokenIn: '0xTokenIn',
      tokenOut: '0xTokenOut',
      fee: 3000,
      extraData: '0x',
    }]),
    executeArbitrage: vi.fn().mockResolvedValue({
      success: true,
      txHash: '0xv3tx',
      netProfit: 1100000000000000000n,
      gasUsed: 220000n,
      source: 0, // Balancer
    }),
  })),
  FlashLoanSource: {
    BALANCER: 0,
    DYDX: 1,
    HYBRID_AAVE_V4: 2,
    AAVE: 3,
    UNISWAP_V3: 4,
  },
  DexType: {
    UNISWAP_V3: 0,
    SUSHISWAP: 1,
    DODO: 2,
  },
}));

describe('FlashSwapExecutorFactory', () => {
  const mockProvider = {} as any;
  const mockSigner = {} as any;
  
  const mockOpportunity: ArbitrageOpportunity = {
    id: 'test-opp-1',
    input: {
      token: '0xInputToken',
      amount: '1000000000000000000', // 1 token
    },
    output: {
      token: '0xInputToken',
      amount: '1100000000000000000', // 1.1 tokens
    },
    path: {
      swaps: [{
        pool: '0xPool1',
        tokenIn: '0xTokenA',
        tokenOut: '0xTokenB',
        dex: 'uniswapv3',
        fee: 3000,
      }],
    },
    profitAmount: 0.1,
    profitPercent: 10,
    gasEstimate: 300000,
    timestamp: Date.now(),
    source: 'test',
  } as any;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Configuration', () => {
    it('should initialize with V2 only when V3 disabled', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: false,
      });
      
      const stats = factory.getStats();
      expect(stats.v2Available).toBe(true);
      expect(stats.v3Available).toBe(false);
      expect(stats.v3Enabled).toBe(false);
      expect(stats.currentVersion).toBe('V2');
    });
    
    it('should initialize with both V2 and V3 when V3 enabled', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
      });
      
      const stats = factory.getStats();
      expect(stats.v2Available).toBe(true);
      expect(stats.v3Available).toBe(true);
      expect(stats.v3Enabled).toBe(true);
      expect(stats.currentVersion).toBe('BOTH');
    });
    
    it('should use default rollout percentage when not provided', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
      });
      
      const stats = factory.getStats();
      expect(stats.v3RolloutPercent).toBe(10); // Default
    });
    
    it('should use custom rollout percentage when provided', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 50,
      });
      
      const stats = factory.getStats();
      expect(stats.v3RolloutPercent).toBe(50);
    });
  });
  
  describe('Version Selection', () => {
    it('should always use V2 when V3 disabled', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: false,
      });
      
      const executor = factory.createExecutor(mockOpportunity);
      expect(executor.getVersion()).toBe('V2');
    });
    
    it('should use V3 when rollout random is below threshold', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 50,
      });
      
      // Mock random to always return 25 (below 50% threshold)
      factory.setRolloutRandom(() => 25);
      
      const executor = factory.createExecutor(mockOpportunity);
      expect(executor.getVersion()).toBe('V3');
    });
    
    it('should use V2 when rollout random is above threshold', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 50,
      });
      
      // Mock random to always return 75 (above 50% threshold)
      factory.setRolloutRandom(() => 75);
      
      const executor = factory.createExecutor(mockOpportunity);
      expect(executor.getVersion()).toBe('V2');
    });
    
    it('should respect 0% rollout (always V2)', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 0,
      });
      
      factory.setRolloutRandom(() => 0);
      
      const executor = factory.createExecutor(mockOpportunity);
      expect(executor.getVersion()).toBe('V2');
    });
    
    it('should respect 100% rollout (always V3)', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 100,
      });
      
      factory.setRolloutRandom(() => 99);
      
      const executor = factory.createExecutor(mockOpportunity);
      expect(executor.getVersion()).toBe('V3');
    });
  });
  
  describe('Execution', () => {
    it('should execute with V2 successfully', async () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: false,
      });
      
      const result = await factory.execute(mockOpportunity);
      
      expect(result.success).toBe(true);
      expect(result.version).toBe('V2');
      expect(result.txHash).toBe('0xv2tx');
    });
    
    it('should execute with V3 successfully', async () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 100,
      });
      
      factory.setRolloutRandom(() => 0);
      
      const result = await factory.execute(mockOpportunity);
      
      expect(result.success).toBe(true);
      expect(result.version).toBe('V3');
      expect(result.txHash).toBe('0xv3tx');
      expect(result.source).toBe(0); // Balancer
    });
    
    it('should include gas used in result', async () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 100,
      });
      
      factory.setRolloutRandom(() => 0);
      
      const result = await factory.execute(mockOpportunity);
      
      expect(result.gasUsed).toBeDefined();
      expect(result.gasUsed).toBe(220000n);
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error when no executor available', () => {
      expect(() => {
        new FlashSwapExecutorFactory({
          provider: mockProvider,
          signer: mockSigner,
          chainId: 8453,
        });
      }).not.toThrow(); // Factory can be created without executors
      
      const factory = new FlashSwapExecutorFactory({
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
      });
      
      expect(() => {
        factory.createExecutor(mockOpportunity);
      }).toThrow('No flash swap executor available');
    });
  });
  
  describe('Statistics', () => {
    it('should report correct stats for V2 only', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
      });
      
      const stats = factory.getStats();
      
      expect(stats).toEqual({
        v2Available: true,
        v3Available: false,
        v3Enabled: false,
        v3RolloutPercent: 10,
        currentVersion: 'V2',
      });
    });
    
    it('should report correct stats for both versions', () => {
      const factory = new FlashSwapExecutorFactory({
        flashSwapV2Address: '0xV2Address',
        flashSwapV3Address: '0xV3Address',
        aavePoolAddress: '0xAavePool',
        provider: mockProvider,
        signer: mockSigner,
        chainId: 8453,
        enableV3: true,
        v3RolloutPercent: 75,
      });
      
      const stats = factory.getStats();
      
      expect(stats).toEqual({
        v2Available: true,
        v3Available: true,
        v3Enabled: true,
        v3RolloutPercent: 75,
        currentVersion: 'BOTH',
      });
    });
  });
});
