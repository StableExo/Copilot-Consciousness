/**
 * Tests for encodeFlashSwapCall
 */

import { encodeFlashSwapCall } from '../Encoder';
import { Interface } from 'ethers';

describe('encodeFlashSwapCall', () => {
    describe('encodeFlashSwapCall', () => {
        it('should encode initiateUniswapV3FlashLoan correctly', () => {
            const params = {
                tokenIntermediate: '0x2222222222222222222222222222222222222222',
                feeA: 3000,
                feeB: 500,
                amountOutMinimum1: 1044750000000000000n,
                amountOutMinimum2: 1094500000000000000n,
                titheRecipient: '0x9999999999999999999999999999999999999999'
            };

            const result = encodeFlashSwapCall('initiateUniswapV3FlashLoan', [params]);

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.startsWith('0x')).toBe(true);
            expect(result.length).toBeGreaterThan(10);

            // Verify it can be decoded
            const flashSwapInterface = new Interface([
                "function initiateUniswapV3FlashLoan(tuple(address tokenIntermediate, uint24 feeA, uint24 feeB, uint256 amountOutMinimum1, uint256 amountOutMinimum2, address titheRecipient) params)"
            ]);
            const decoded = flashSwapInterface.decodeFunctionData('initiateUniswapV3FlashLoan', result);
            
            expect(decoded.params.tokenIntermediate.toLowerCase()).toBe(params.tokenIntermediate.toLowerCase());
            // ethers v6 returns bigint for uint24, so compare as numbers
            expect(Number(decoded.params.feeA)).toBe(params.feeA);
            expect(Number(decoded.params.feeB)).toBe(params.feeB);
            expect(decoded.params.amountOutMinimum1.toString()).toBe(params.amountOutMinimum1.toString());
            expect(decoded.params.amountOutMinimum2.toString()).toBe(params.amountOutMinimum2.toString());
            expect(decoded.params.titheRecipient.toLowerCase()).toBe(params.titheRecipient.toLowerCase());
        });

        it('should encode initiateTriangularFlashSwap correctly', () => {
            const params = {
                tokenA: '0x1111111111111111111111111111111111111111',
                tokenB: '0x2222222222222222222222222222222222222222',
                tokenC: '0x3333333333333333333333333333333333333333',
                fee1: 3000,
                fee2: 500,
                fee3: 10000,
                amountOutMinimumFinal: 1094500000000000000n,
                titheRecipient: '0x9999999999999999999999999999999999999999'
            };

            const result = encodeFlashSwapCall('initiateTriangularFlashSwap', [params]);

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.startsWith('0x')).toBe(true);

            // Verify it can be decoded
            const flashSwapInterface = new Interface([
                "function initiateTriangularFlashSwap(tuple(address tokenA, address tokenB, address tokenC, uint24 fee1, uint24 fee2, uint24 fee3, uint256 amountOutMinimumFinal, address titheRecipient) params)"
            ]);
            const decoded = flashSwapInterface.decodeFunctionData('initiateTriangularFlashSwap', result);
            
            expect(decoded.params.tokenA.toLowerCase()).toBe(params.tokenA.toLowerCase());
            expect(decoded.params.tokenB.toLowerCase()).toBe(params.tokenB.toLowerCase());
            expect(decoded.params.tokenC.toLowerCase()).toBe(params.tokenC.toLowerCase());
            // ethers v6 returns bigint for uint24, so compare as numbers
            expect(Number(decoded.params.fee1)).toBe(params.fee1);
            expect(Number(decoded.params.fee2)).toBe(params.fee2);
            expect(Number(decoded.params.fee3)).toBe(params.fee3);
            expect(decoded.params.amountOutMinimumFinal.toString()).toBe(params.amountOutMinimumFinal.toString());
            expect(decoded.params.titheRecipient.toLowerCase()).toBe(params.titheRecipient.toLowerCase());
        });

        it('should encode initiateAaveFlashLoan correctly', () => {
            const params = {
                path: [
                    {
                        pool: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        tokenIn: '0x1111111111111111111111111111111111111111',
                        tokenOut: '0x2222222222222222222222222222222222222222',
                        fee: 3000,
                        minOut: 0n,
                        dexType: 0
                    },
                    {
                        pool: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                        tokenIn: '0x2222222222222222222222222222222222222222',
                        tokenOut: '0x1111111111111111111111111111111111111111',
                        fee: 500,
                        minOut: 1094500000000000000n,
                        dexType: 0
                    }
                ],
                initiator: '0x8888888888888888888888888888888888888888',
                titheRecipient: '0x9999999999999999999999999999999999999999'
            };

            const result = encodeFlashSwapCall('initiateAaveFlashLoan', [params]);

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.startsWith('0x')).toBe(true);

            // Verify it can be decoded
            const flashSwapInterface = new Interface([
                "function initiateAaveFlashLoan(tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator, address titheRecipient) params)"
            ]);
            const decoded = flashSwapInterface.decodeFunctionData('initiateAaveFlashLoan', result);
            
            expect(decoded.params.initiator.toLowerCase()).toBe(params.initiator.toLowerCase());
            expect(decoded.params.titheRecipient.toLowerCase()).toBe(params.titheRecipient.toLowerCase());
            expect(decoded.params.path.length).toBe(2);
            expect(decoded.params.path[0].pool.toLowerCase()).toBe(params.path[0].pool.toLowerCase());
            expect(decoded.params.path[0].tokenIn.toLowerCase()).toBe(params.path[0].tokenIn.toLowerCase());
            expect(decoded.params.path[0].tokenOut.toLowerCase()).toBe(params.path[0].tokenOut.toLowerCase());
            // ethers v6 returns bigint for uint24 and uint8
            expect(Number(decoded.params.path[0].fee)).toBe(params.path[0].fee);
            expect(decoded.params.path[0].minOut.toString()).toBe(params.path[0].minOut.toString());
            expect(Number(decoded.params.path[0].dexType)).toBe(params.path[0].dexType);
            expect(decoded.params.path[1].minOut.toString()).toBe(params.path[1].minOut.toString());
        });

        it('should throw error when functionName is missing', () => {
            expect(() => {
                encodeFlashSwapCall('', [{}]);
            }).toThrow('Missing functionName or invalid functionArgs for encoding.');
        });

        it('should throw error when functionArgs is not an array', () => {
            expect(() => {
                encodeFlashSwapCall('initiateUniswapV3FlashLoan', null as any);
            }).toThrow('Missing functionName or invalid functionArgs for encoding.');
        });

        it('should throw error when function does not exist in ABI', () => {
            expect(() => {
                encodeFlashSwapCall('nonExistentFunction', [{}]);
            }).toThrow('Failed to encode FlashSwap function call for nonExistentFunction');
        });

        it('should throw error when function arguments are invalid', () => {
            expect(() => {
                encodeFlashSwapCall('initiateUniswapV3FlashLoan', [{ invalidParam: 'test' }]);
            }).toThrow('Failed to encode FlashSwap function call for initiateUniswapV3FlashLoan');
        });
    });
});
