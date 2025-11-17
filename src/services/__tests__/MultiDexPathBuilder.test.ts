/**
 * MultiDexPathBuilder Tests
 * 
 * Tests for multi-DEX arbitrage path building service
 */

import { MultiDexPathBuilder, PoolInfo } from '../MultiDexPathBuilder';
import { ArbitrageOpportunity, ArbitrageType, OpportunityStatus } from '../../arbitrage/models/ArbitrageOpportunity';
import { ethers } from 'ethers';

describe('MultiDexPathBuilder', () => {
  let pathBuilder: MultiDexPathBuilder;
  let mockProvider: ethers.providers.Provider;

  beforeEach(() => {
    // Create mock provider
    mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 8453, name: 'base' }),
    } as any;

    const config = {
      provider: mockProvider,
      minProfitThresholdEth: 0.001,
      maxSlippageBps: 50,
      supportedDexs: ['uniswap_v3', 'aerodrome'],
    };

    pathBuilder = new MultiDexPathBuilder(config);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(pathBuilder).toBeDefined();
    });
  });

  describe('findOpportunities', () => {
    it('should handle empty pools array', async () => {
      const opportunities = await pathBuilder.findOpportunities([]);
      expect(opportunities).toEqual([]);
    });

    it('should handle single pool', async () => {
      const pools: PoolInfo[] = [
        {
          address: '0x1111111111111111111111111111111111111111',
          token0: '0x4200000000000000000000000000000000000006', // WETH
          token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
          reserve0: '100000000000000000000', // 100 WETH
          reserve1: '200000000000', // 200,000 USDC
          dex: 'uniswap_v3',
          fee: 500,
        },
      ];

      const opportunities = await pathBuilder.findOpportunities(pools);
      expect(Array.isArray(opportunities)).toBe(true);
    });
  });

  describe('buildPath', () => {
    it('should return null for invalid opportunity', () => {
      const opportunity: ArbitrageOpportunity = {
        opportunityId: 'test-1',
        arbType: ArbitrageType.SPATIAL,
        timestamp: new Date(),
        status: OpportunityStatus.IDENTIFIED,
        path: [],
        tokenAddresses: [],
        poolAddresses: [],
        protocols: [],
        inputAmount: 1,
        expectedOutput: 1,
        grossProfit: 0,
        profitBps: 0,
        requiresFlashLoan: false,
        estimatedGas: 300000,
      };

      const poolMap = new Map<string, PoolInfo>();
      const path = pathBuilder.buildPath(opportunity, poolMap);
      expect(path).toBeNull();
    });
  });

  describe('getSpatialStats', () => {
    it('should return spatial engine stats', () => {
      const stats = pathBuilder.getSpatialStats();
      expect(stats).toBeDefined();
      expect(stats.engineType).toBe('spatial');
    });
  });

  describe('getTriangularStats', () => {
    it('should return triangular engine stats', () => {
      const stats = pathBuilder.getTriangularStats();
      expect(stats).toBeDefined();
      expect(stats.engineType).toBe('triangular');
    });
  });
});
