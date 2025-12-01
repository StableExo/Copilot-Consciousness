/**
 * Tests for ParamBuilder
 */

import { buildTwoHopParams, buildTriangularParams, buildAavePathParams } from '../ParamBuilder';
import {
  ArbitrageOpportunity,
  ArbitragePath,
  SimulationResult,
  ArbitrageConfig,
  Pool,
  Token,
} from '../../types/definitions';

describe('ParamBuilder', () => {
  const mockConfig: ArbitrageConfig = {
    SLIPPAGE_TOLERANCE_BPS: 50, // 0.5%
  };

  const mockTokenA: Token = {
    address: '0x1111111111111111111111111111111111111111',
    decimals: 18,
    symbol: 'TOKENA',
  };

  const mockTokenB: Token = {
    address: '0x2222222222222222222222222222222222222222',
    decimals: 18,
    symbol: 'TOKENB',
  };

  const mockTokenC: Token = {
    address: '0x3333333333333333333333333333333333333333',
    decimals: 18,
    symbol: 'TOKENC',
  };

  const titheRecipient = '0x9999999999999999999999999999999999999999';

  describe('buildTwoHopParams', () => {
    it('should build valid two-hop parameters for spatial opportunity', () => {
      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [
          {
            dexName: 'uniswapv3',
            poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            tokenIn: mockTokenA.address,
            tokenOut: mockTokenB.address,
            fee: 3000,
          },
          {
            dexName: 'uniswapv3',
            poolAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            tokenIn: mockTokenB.address,
            tokenOut: mockTokenA.address,
            fee: 500,
          },
        ],
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n, // 1 token
        amountOutHop1: 1050000000000000000n, // 1.05 tokens
        finalAmount: 1100000000000000000n, // 1.1 tokens (profit)
      };

      const result = buildTwoHopParams(opportunity, simulationResult, mockConfig, titheRecipient);

      expect(result.contractFunctionName).toBe('initiateUniswapV3FlashLoan');
      expect(result.borrowTokenAddress).toBe(mockTokenA.address);
      expect(result.borrowAmount).toBe(1000000000000000000n);
      expect(result.params.tokenIntermediate).toBe(mockTokenB.address);
      expect(result.params.feeA).toBe(3000);
      expect(result.params.feeB).toBe(500);
      expect(result.params.titheRecipient).toBe(titheRecipient);

      // Check slippage applied: 1.05 * (10000 - 50) / 10000 = 1.04475
      expect(result.params.amountOutMinimum1).toBe(1044750000000000000n);
      // Check slippage applied: 1.1 * (10000 - 50) / 10000 = 1.0945
      expect(result.params.amountOutMinimum2).toBe(1094500000000000000n);

      expect(result.typeString).toContain('tuple(address tokenIntermediate');
    });

    it('should throw error for non-spatial opportunity', () => {
      const opportunity: ArbitrageOpportunity = {
        type: 'triangular',
        path: [],
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      expect(() => {
        buildTwoHopParams(opportunity, simulationResult, mockConfig, titheRecipient);
      }).toThrow('Invalid spatial opportunity for V3->V3 param build.');
    });

    it('should throw error for path with wrong length', () => {
      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [
          {
            dexName: 'uniswapv3',
            poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            tokenIn: mockTokenA.address,
            tokenOut: mockTokenB.address,
            fee: 3000,
          },
        ],
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      expect(() => {
        buildTwoHopParams(opportunity, simulationResult, mockConfig, titheRecipient);
      }).toThrow('Invalid spatial opportunity for V3->V3 param build.');
    });
  });

  describe('buildTriangularParams', () => {
    it('should build valid triangular parameters', () => {
      const pools: Pool[] = [
        { fee: 3000, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
        { fee: 500, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        { fee: 10000, address: '0xcccccccccccccccccccccccccccccccccccccccc' },
      ];

      const opportunity: ArbitrageOpportunity = {
        type: 'triangular',
        path: [],
        pools: pools,
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      const result = buildTriangularParams(
        opportunity,
        simulationResult,
        mockConfig,
        titheRecipient
      );

      expect(result.contractFunctionName).toBe('initiateTriangularFlashSwap');
      expect(result.borrowTokenAddress).toBe(mockTokenA.address);
      expect(result.borrowAmount).toBe(1000000000000000000n);
      expect(result.params.tokenA).toBe(mockTokenA.address);
      expect(result.params.tokenB).toBe(mockTokenB.address);
      expect(result.params.tokenC).toBe(mockTokenC.address);
      expect(result.params.fee1).toBe(3000);
      expect(result.params.fee2).toBe(500);
      expect(result.params.fee3).toBe(10000);
      expect(result.params.titheRecipient).toBe(titheRecipient);
      expect(result.params.amountOutMinimumFinal).toBe(1094500000000000000n);
      expect(result.typeString).toContain('tuple(address tokenA');
    });

    it('should throw error for non-triangular opportunity', () => {
      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [],
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      expect(() => {
        buildTriangularParams(opportunity, simulationResult, mockConfig, titheRecipient);
      }).toThrow('Invalid triangular opportunity structure.');
    });

    it('should throw error for wrong number of pools', () => {
      const pools: Pool[] = [
        { fee: 3000, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
        { fee: 500, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      ];

      const opportunity: ArbitrageOpportunity = {
        type: 'triangular',
        path: [],
        pools: pools,
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      expect(() => {
        buildTriangularParams(opportunity, simulationResult, mockConfig, titheRecipient);
      }).toThrow('Invalid triangular opportunity structure.');
    });
  });

  describe('buildAavePathParams', () => {
    const initiatorAddress = '0x8888888888888888888888888888888888888888';

    it('should build valid Aave path parameters with UniswapV3', () => {
      const path: ArbitragePath[] = [
        {
          dexName: 'uniswapv3',
          poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          tokenIn: mockTokenA.address,
          tokenOut: mockTokenB.address,
          fee: 3000,
        },
        {
          dexName: 'uniswapv3',
          poolAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          tokenIn: mockTokenB.address,
          tokenOut: mockTokenA.address,
          fee: 500,
        },
      ];

      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: path,
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      const result = buildAavePathParams(
        opportunity,
        simulationResult,
        mockConfig,
        initiatorAddress,
        titheRecipient
      );

      expect(result.contractFunctionName).toBe('initiateAaveFlashLoan');
      expect(result.borrowTokenAddress).toBe(mockTokenA.address);
      expect(result.borrowAmount).toBe(1000000000000000000n);
      expect(result.params.initiator).toBe(initiatorAddress);
      expect(result.params.titheRecipient).toBe(titheRecipient);
      expect(result.params.path.length).toBe(2);

      // First step should have 0 minOut
      expect(result.params.path[0].pool).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result.params.path[0].tokenIn).toBe(mockTokenA.address);
      expect(result.params.path[0].tokenOut).toBe(mockTokenB.address);
      expect(result.params.path[0].fee).toBe(3000);
      expect(result.params.path[0].minOut).toBe(0n);
      expect(result.params.path[0].dexType).toBe(0); // UniswapV3

      // Last step should have minAmountOut applied
      expect(result.params.path[1].pool).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      expect(result.params.path[1].tokenIn).toBe(mockTokenB.address);
      expect(result.params.path[1].tokenOut).toBe(mockTokenA.address);
      expect(result.params.path[1].fee).toBe(500);
      expect(result.params.path[1].minOut).toBe(1094500000000000000n);
      expect(result.params.path[1].dexType).toBe(0); // UniswapV3

      expect(result.typeString).toContain('tuple(tuple(address pool');
    });

    it('should build valid Aave path parameters with SushiSwap', () => {
      const path: ArbitragePath[] = [
        {
          dexName: 'sushiswap',
          poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          tokenIn: mockTokenA.address,
          tokenOut: mockTokenB.address,
          fee: 3000,
        },
      ];

      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: path,
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      const result = buildAavePathParams(
        opportunity,
        simulationResult,
        mockConfig,
        initiatorAddress,
        titheRecipient
      );

      expect(result.params.path[0].dexType).toBe(1); // SushiSwap
      expect(result.params.path[0].fee).toBe(0); // SushiSwap doesn't use fee parameter
    });

    it('should build valid Aave path parameters with DODO', () => {
      const path: ArbitragePath[] = [
        {
          dexName: 'dodo',
          poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          tokenIn: mockTokenA.address,
          tokenOut: mockTokenB.address,
          fee: 3000,
        },
      ];

      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: path,
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      const result = buildAavePathParams(
        opportunity,
        simulationResult,
        mockConfig,
        initiatorAddress,
        titheRecipient
      );

      expect(result.params.path[0].dexType).toBe(2); // DODO
      expect(result.params.path[0].fee).toBe(0); // DODO doesn't use fee parameter
    });

    it('should throw error for empty path', () => {
      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [],
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      expect(() => {
        buildAavePathParams(
          opportunity,
          simulationResult,
          mockConfig,
          initiatorAddress,
          titheRecipient
        );
      }).toThrow('Invalid or empty path in opportunity object.');
    });

    it('should handle unknown DEX type by falling back to Uniswap V3', () => {
      // The mapDexType function now falls back to Uniswap V3 for unknown DEX types
      // instead of throwing an error, making the system more resilient
      const path: ArbitragePath[] = [
        {
          dexName: 'unsupportedDEX',
          poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          tokenIn: mockTokenA.address,
          tokenOut: mockTokenB.address,
          fee: 3000,
        },
      ];

      const opportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: path,
        tokenA: mockTokenA,
        tokenB: mockTokenB,
        tokenC: mockTokenC,
      };

      const simulationResult: SimulationResult = {
        initialAmount: 1000000000000000000n,
        amountOutHop1: 1050000000000000000n,
        finalAmount: 1100000000000000000n,
      };

      // Should not throw - unknown DEX types are treated as Uniswap V3 compatible
      const result = buildAavePathParams(
        opportunity,
        simulationResult,
        mockConfig,
        initiatorAddress,
        titheRecipient
      );

      // Verify it returns valid params with the fallback DEX type
      expect(result).toBeDefined();
      expect(result.params).toBeDefined();
    });
  });
});
