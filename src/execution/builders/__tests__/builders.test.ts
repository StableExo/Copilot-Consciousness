/**
 * Tests for Transaction Parameter Builders
 */

import {
    AavePathBuilder,
    TwoHopV3Builder,
    TriangularBuilder,
    SushiV3Builder,
    V3SushiBuilder,
    ArbitrageOpportunity,
    SimulationResult,
    Config,
    DexType
} from '../index';

describe('Transaction Parameter Builders', () => {
    // Common test data
    const mockConfig: Config = {
        SLIPPAGE_TOLERANCE_BPS: 50 // 0.5%
    };

    const titheRecipient = '0x9999999999999999999999999999999999999999';

    const mockTokenA = '0x1111111111111111111111111111111111111111';
    const mockTokenB = '0x2222222222222222222222222222222222222222';
    const mockTokenC = '0x3333333333333333333333333333333333333333';

    const mockPoolA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const mockPoolB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const mockPoolC = '0xcccccccccccccccccccccccccccccccccccccccc';

    describe('AavePathBuilder', () => {
        it('should build valid Aave path parameters for multi-hop arbitrage', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'sushiswap',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = AavePathBuilder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            expect(result).toBeDefined();
            expect(result.borrowTokenAddress).toBe(mockTokenA);
            expect(result.typeString).toContain('tuple');
            expect(result.params).toHaveProperty('path');
            expect(result.params).toHaveProperty('titheRecipient');
            expect((result.params as any).titheRecipient).toBe(titheRecipient);
            expect((result.params as any).path).toHaveLength(2);
        });

        it('should detect minimal gas estimation simulation', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 0n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500
                    }
                ]
            };

            const gasEstimationSimulation: SimulationResult = {
                initialAmount: 1n,
                hop1AmountOutSimulated: 1n,
                finalAmountSimulated: 1n
            };

            const result = AavePathBuilder.buildParams(
                opportunity,
                gasEstimationSimulation,
                mockConfig,
                titheRecipient
            );

            expect(result).toBeDefined();
            // For gas estimation, minOut should match simulated amounts exactly (0% slippage)
            expect((result.params as any).path[0].minOut).toBe(1n);
        });

        it('should map DEX names to DexType enum correctly', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'sushiswap',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenC,
                        fee: 500
                    },
                    {
                        dexName: 'dodo',
                        poolAddress: mockPoolC,
                        tokenIn: mockTokenC,
                        tokenOut: mockTokenA,
                        fee: 200
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = AavePathBuilder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            const path = (result.params as any).path;
            expect(path[0].dexType).toBe(DexType.UniswapV3);
            expect(path[1].dexType).toBe(DexType.SushiSwap);
            expect(path[2].dexType).toBe(DexType.DODO);
        });

        it('should throw error for invalid tithe recipient address', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                AavePathBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    'invalid-address'
                );
            }).toThrow('Invalid tithe recipient address');
        });

        it('should throw error for invalid fee (> uint24 max)', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 16777216 // uint24 max is 16777215
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                AavePathBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('Fee must be a valid uint24');
        });
    });

    describe('TwoHopV3Builder', () => {
        it('should build valid two-hop V3 parameters', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'spatial',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000,
                        token0: mockTokenA,
                        token1: mockTokenB
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500,
                        token0: mockTokenA,
                        token1: mockTokenB
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = TwoHopV3Builder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            expect(result).toBeDefined();
            expect(result.borrowTokenAddress).toBe(mockTokenA);
            expect(result.params).toHaveProperty('pool');
            expect(result.params).toHaveProperty('amount0');
            expect(result.params).toHaveProperty('amount1');
            expect(result.params).toHaveProperty('callbackParams');
        });

        it('should throw error for non-two-hop opportunity', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                TwoHopV3Builder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('must have exactly 2 hops');
        });

        it('should calculate amount0/amount1 correctly based on token position', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'spatial',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000,
                        token0: mockTokenA,
                        token1: mockTokenB
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500,
                        token0: mockTokenA,
                        token1: mockTokenB
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = TwoHopV3Builder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            // mockTokenA is token0, so amount0 should be borrowAmount
            expect((result.params as any).amount0).toBe(1000000000000000000n);
            expect((result.params as any).amount1).toBe(0n);
        });
    });

    describe('TriangularBuilder', () => {
        it('should build valid triangular arbitrage parameters', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'triangular',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenC,
                        fee: 500
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolC,
                        tokenIn: mockTokenC,
                        tokenOut: mockTokenA,
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = TriangularBuilder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            expect(result).toBeDefined();
            expect(result.borrowTokenAddress).toBe(mockTokenA);
            expect(result.params).toHaveProperty('pool');
            expect(result.params).toHaveProperty('borrowAmount');
            expect(result.params).toHaveProperty('callbackParams');
            expect((result.params as any).callbackParams.callbackType).toBe(1);
        });

        it('should throw error for non-three-hop opportunity', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'triangular',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                TriangularBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('must have exactly 3 hops');
        });

        it('should validate cyclic path (final output matches initial input)', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'triangular',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenC,
                        fee: 500
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolC,
                        tokenIn: mockTokenC,
                        tokenOut: mockTokenB, // Wrong! Should be mockTokenA
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                TriangularBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('final token must match initial token');
        });

        it('should throw error if final amount does not exceed initial amount', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'triangular',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenC,
                        fee: 500
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolC,
                        tokenIn: mockTokenC,
                        tokenOut: mockTokenA,
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 900000000000000000n // Less than initial!
            };

            expect(() => {
                TriangularBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('Final amount must exceed initial amount');
        });
    });

    describe('SushiV3Builder', () => {
        it('should build valid SushiSwap V3 parameters', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'spatial',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'sushiswap',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'sushiswap',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = SushiV3Builder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            expect(result).toBeDefined();
            expect(result.borrowTokenAddress).toBe(mockTokenA);
            expect((result.params as any).dexType).toBe(DexType.SushiSwap);
            expect((result.params as any).pool1).toBe(mockPoolA);
            expect((result.params as any).pool2).toBe(mockPoolB);
        });

        it('should throw error for single-hop opportunity', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'spatial',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'sushiswap',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                SushiV3Builder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('must have at least 2 hops');
        });
    });

    describe('V3SushiBuilder', () => {
        it('should build valid cross-protocol parameters', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'spatial',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'sushiswap',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            const result = V3SushiBuilder.buildParams(
                opportunity,
                simulationResult,
                mockConfig,
                titheRecipient
            );

            expect(result).toBeDefined();
            expect(result.borrowTokenAddress).toBe(mockTokenA);
            expect((result.params as any).dexType1).toBe(DexType.UniswapV3);
            expect((result.params as any).dexType2).toBe(DexType.SushiSwap);
            expect((result.params as any).poolV3).toBe(mockPoolA);
            expect((result.params as any).poolSushi).toBe(mockPoolB);
        });

        it('should throw error for incorrect DEX order', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'spatial',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'sushiswap', // Wrong! Should be UniswapV3 first
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    },
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolB,
                        tokenIn: mockTokenB,
                        tokenOut: mockTokenA,
                        fee: 500
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                V3SushiBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('Expected UniswapV3 → SushiSwap routing');
        });
    });

    describe('Common Validation', () => {
        it('should validate slippage tolerance range', () => {
            const invalidConfig: Config = {
                SLIPPAGE_TOLERANCE_BPS: 10001 // > 10000
            };

            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    }
                ]
            };

            const simulationResult: SimulationResult = {
                initialAmount: 1000000000000000000n,
                hop1AmountOutSimulated: 1100000000000000000n,
                finalAmountSimulated: 1050000000000000000n
            };

            expect(() => {
                AavePathBuilder.buildParams(
                    opportunity,
                    simulationResult,
                    invalidConfig,
                    titheRecipient
                );
            }).toThrow('SLIPPAGE_TOLERANCE_BPS must be between 0 and 10000');
        });

        it('should validate BigInt types in simulation result', () => {
            const opportunity: ArbitrageOpportunity = {
                type: 'multi-hop',
                borrowToken: mockTokenA,
                expectedProfit: 1000000n,
                path: [
                    {
                        dexName: 'uniswapv3',
                        poolAddress: mockPoolA,
                        tokenIn: mockTokenA,
                        tokenOut: mockTokenB,
                        fee: 3000
                    }
                ]
            };

            const invalidSimulation: any = {
                initialAmount: 1000000, // Number instead of BigInt
                hop1AmountOutSimulated: 1100000n,
                finalAmountSimulated: 1050000n
            };

            expect(() => {
                AavePathBuilder.buildParams(
                    opportunity,
                    invalidSimulation,
                    mockConfig,
                    titheRecipient
                );
            }).toThrow('initialAmount must be bigint');
        });
    });
});
