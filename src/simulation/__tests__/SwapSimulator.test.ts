/**
 * Tests for SwapSimulator
 */
import { Provider, ZeroAddress } from 'ethers';
import { SwapSimulator } from '../SwapSimulator';
import { PoolState, Token } from '../../types/definitions';

// Create a proper mock provider for ethers v6
const mockProvider = {
    getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1), name: 'mainnet' }),
    call: jest.fn(),
} as unknown as Provider;

// Sample tokens
const token0: Token = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    decimals: 6,
    symbol: 'USDC',
};

const token1: Token = {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    decimals: 18,
    symbol: 'WETH',
};

const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

describe('SwapSimulator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with valid config', () => {
            const simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });
            expect(simulator).toBeDefined();
        });

        it('should throw error with invalid QUOTER_ADDRESS', () => {
            expect(() => {
                new SwapSimulator(mockProvider, {
                    QUOTER_ADDRESS: 'invalid-address',
                });
            }).toThrow('Valid QUOTER_ADDRESS missing from config');
        });

        it('should throw error with missing QUOTER_ADDRESS', () => {
            expect(() => {
                new SwapSimulator(mockProvider, {
                    QUOTER_ADDRESS: '',
                });
            }).toThrow('Valid QUOTER_ADDRESS missing from config');
        });
    });

    describe('simulateSwap', () => {
        let simulator: SwapSimulator;

        beforeEach(() => {
            simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });
        });

        it('should return error for invalid poolState', async () => {
            const result = await simulator.simulateSwap(null as any, token0, 1000n);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid poolState');
        });

        it('should return error for invalid tokenIn', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'UniswapV3',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
            };
            const result = await simulator.simulateSwap(poolState, null as any, 1000n);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid poolState');
        });

        it('should return error for zero amountIn', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'UniswapV3',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
            };
            const result = await simulator.simulateSwap(poolState, token0, 0n);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid poolState');
        });

        it('should return error for negative amountIn', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'UniswapV3',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
            };
            const result = await simulator.simulateSwap(poolState, token0, -100n);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid poolState');
        });

        it('should return error for unsupported DEX', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'UnknownDEX',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
            };
            const result = await simulator.simulateSwap(poolState, token0, 1000n);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported dex');
        });
    });

    describe('simulateV2Swap (SushiSwap)', () => {
        let simulator: SwapSimulator;

        beforeEach(() => {
            simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });
        });

        it('should calculate V2 swap correctly', async () => {
            const poolState: PoolState = {
                address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                dexName: 'SushiSwap',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000000000n, // 1M USDC (6 decimals)
                reserve1: 500000000000000000000n, // 500 WETH (18 decimals)
            };

            const amountIn = 1000000000n; // 1000 USDC
            const result = await simulator.simulateSwap(poolState, token0, amountIn);

            expect(result.success).toBe(true);
            expect(result.amountOut).not.toBeNull();
            expect(result.amountOut).toBeGreaterThan(0n);
            expect(result.error).toBeNull();
        });

        it('should handle swapping token1 for token0', async () => {
            const poolState: PoolState = {
                address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                dexName: 'SushiSwap',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000000000n,
                reserve1: 500000000000000000000n,
            };

            const amountIn = 1000000000000000000n; // 1 WETH
            const result = await simulator.simulateSwap(poolState, token1, amountIn);

            expect(result.success).toBe(true);
            expect(result.amountOut).not.toBeNull();
            expect(result.amountOut).toBeGreaterThan(0n);
        });

        it('should return error for zero reserves', async () => {
            const poolState: PoolState = {
                address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                dexName: 'SushiSwap',
                token0,
                token1,
                fee: 3000,
                reserve0: 0n,
                reserve1: 500000000000000000000n,
            };

            const result = await simulator.simulateSwap(poolState, token0, 1000n);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Zero reserves');
        });

        it('should apply correct fee (0.3%)', async () => {
            const poolState: PoolState = {
                address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                dexName: 'SushiSwap',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 1000000n,
            };

            const amountIn = 1000n;
            const result = await simulator.simulateSwap(poolState, token0, amountIn);

            // With equal reserves, output should be less than input due to 0.3% fee
            expect(result.success).toBe(true);
            expect(result.amountOut).not.toBeNull();
            if (result.amountOut !== null) {
                expect(result.amountOut).toBeLessThan(amountIn);
            }
        });
    });

    describe('simulateV3Swap (UniswapV3)', () => {
        let simulator: SwapSimulator;

        beforeEach(() => {
            simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });
        });

        it('should call quoter contract for V3 swap', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'UniswapV3',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
            };

            // Mock the quoter response - ethers v6 returns bigint
            const mockQuoterContract = {
                quoteExactInputSingle: {
                    staticCall: jest.fn().mockResolvedValue([
                        BigInt('500000000000000000'), // 0.5 WETH
                        BigInt('0'),
                        0,
                        BigInt('0'),
                    ]),
                },
            };

            // Replace the quoter contract
            (simulator as any).quoterContract = mockQuoterContract;

            const amountIn = 1000000000n; // 1000 USDC
            const result = await simulator.simulateSwap(poolState, token0, amountIn);

            expect(result.success).toBe(true);
            expect(result.amountOut).toBe(500000000000000000n);
            expect(result.error).toBeNull();
            expect(mockQuoterContract.quoteExactInputSingle.staticCall).toHaveBeenCalledWith({
                tokenIn: token0.address,
                tokenOut: token1.address,
                fee: 3000,
                amountIn: amountIn,
                sqrtPriceLimitX96: 0n,
            });
        });

        it('should handle quoter errors gracefully', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'UniswapV3',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
            };

            // Mock the quoter to throw error - ethers v6 uses staticCall
            const mockQuoterContract = {
                quoteExactInputSingle: {
                    staticCall: jest.fn().mockRejectedValue(new Error('Insufficient liquidity')),
                },
            };

            (simulator as any).quoterContract = mockQuoterContract;

            const result = await simulator.simulateSwap(poolState, token0, 1000n);

            expect(result.success).toBe(false);
            expect(result.amountOut).toBeNull();
            expect(result.error).toContain('Quoter fail');
        });
    });

    describe('simulateDodoSwap', () => {
        let simulator: SwapSimulator;

        beforeEach(() => {
            simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });
        });

        it('should simulate DODO swap selling base token', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'DODO',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
                baseTokenAddress: token0.address,
            };

            // Mock DODO pool contract - ethers v6 uses staticCall
            const mockDodoContract = {
                querySellBase: {
                    staticCall: jest.fn().mockResolvedValue([
                        BigInt('900000'),
                        BigInt('100'),
                    ]),
                },
                querySellQuote: {
                    staticCall: jest.fn(),
                },
            };

            (simulator as any)._getDodoPoolContract = jest.fn().mockReturnValue(mockDodoContract);

            const result = await simulator.simulateSwap(poolState, token0, 1000000n);

            expect(result.success).toBe(true);
            expect(result.amountOut).toBe(900000n);
            expect(result.error).toBeNull();
            expect(mockDodoContract.querySellBase.staticCall).toHaveBeenCalledWith(
                ZeroAddress,
                1000000n
            );
        });

        it('should simulate DODO swap selling quote token', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'DODO',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
                baseTokenAddress: token0.address,
            };

            const mockDodoContract = {
                querySellBase: {
                    staticCall: jest.fn(),
                },
                querySellQuote: {
                    staticCall: jest.fn().mockResolvedValue([
                        BigInt('1100000'),
                        BigInt('100'),
                    ]),
                },
            };

            (simulator as any)._getDodoPoolContract = jest.fn().mockReturnValue(mockDodoContract);

            const result = await simulator.simulateSwap(poolState, token1, 1000000n);

            expect(result.success).toBe(true);
            expect(result.amountOut).toBe(1100000n);
            expect(mockDodoContract.querySellQuote.staticCall).toHaveBeenCalledWith(
                ZeroAddress,
                1000000n
            );
        });

        it('should return error for missing baseTokenAddress', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'DODO',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
                // No baseTokenAddress
            };

            const mockDodoContract = {
                querySellBase: {
                    staticCall: jest.fn(),
                },
                querySellQuote: {
                    staticCall: jest.fn(),
                },
            };

            (simulator as any)._getDodoPoolContract = jest.fn().mockReturnValue(mockDodoContract);

            const result = await simulator.simulateSwap(poolState, token0, 1000n);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing baseTokenAddress');
        });

        it('should handle BALANCE_NOT_ENOUGH error', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'DODO',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
                baseTokenAddress: token0.address,
            };

            const mockDodoContract = {
                querySellBase: {
                    staticCall: jest.fn().mockRejectedValue({
                        reason: 'BALANCE_NOT_ENOUGH',
                        message: 'BALANCE_NOT_ENOUGH',
                    }),
                },
            };

            (simulator as any)._getDodoPoolContract = jest.fn().mockReturnValue(mockDodoContract);

            const result = await simulator.simulateSwap(poolState, token0, 1000000n);

            expect(result.success).toBe(false);
            expect(result.amountOut).toBeNull();
            expect(result.error).toContain('BALANCE_NOT_ENOUGH');
        });

        it('should return error when pool contract is not initialized', async () => {
            const poolState: PoolState = {
                address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
                dexName: 'DODO',
                token0,
                token1,
                fee: 3000,
                reserve0: 1000000n,
                reserve1: 2000000n,
                baseTokenAddress: token0.address,
            };

            (simulator as any)._getDodoPoolContract = jest.fn().mockReturnValue(null);

            const result = await simulator.simulateSwap(poolState, token0, 1000n);

            expect(result.success).toBe(false);
            expect(result.error).toContain('DODO pool contract not initialized');
        });
    });

    describe('Contract caching', () => {
        it('should cache DODO pool contracts', () => {
            const simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });

            const poolAddress = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8';
            
            const contract1 = (simulator as any)._getDodoPoolContract(poolAddress);
            const contract2 = (simulator as any)._getDodoPoolContract(poolAddress);

            expect(contract1).toBe(contract2);
        });

        it('should cache contracts with case-insensitive addresses', () => {
            const simulator = new SwapSimulator(mockProvider, {
                QUOTER_ADDRESS: quoterAddress,
            });

            const poolAddress1 = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8';
            const poolAddress2 = '0x8AD599C3A0FF1DE082011EFDDC58F1908EB6E6D8';
            
            const contract1 = (simulator as any)._getDodoPoolContract(poolAddress1);
            const contract2 = (simulator as any)._getDodoPoolContract(poolAddress2);

            expect(contract1).toBe(contract2);
        });
    });
});
