/**
 * TwoHopV3Builder
 * 
 * Builds UniswapV3 two-hop spatial arbitrage parameters (V3 → V3).
 * Handles proper fee tier encoding and token position validation.
 * 
 * Based on HAVOC's core/tx/builders/twoHopV3Builder.js
 */

import {
    BuildResult,
    SimulationResult,
    ArbitrageOpportunity,
    ArbitragePath,
    Config
} from './types';

/**
 * TwoHopV3Builder class for building UniswapV3 two-hop arbitrage parameters
 */
export class TwoHopV3Builder {
    /**
     * Build parameters for UniswapV3 two-hop spatial arbitrage
     * 
     * @param opportunity - The two-hop arbitrage opportunity to execute
     * @param simulationResult - Results from simulation (gas estimation or real execution)
     * @param config - Configuration with slippage tolerance
     * @param titheRecipient - Address to receive profit share
     * @returns BuildResult with encoded parameters and metadata
     * 
     * @throws Error if validation fails
     */
    static buildParams(
        opportunity: ArbitrageOpportunity,
        simulationResult: SimulationResult,
        config: Config,
        titheRecipient: string
    ): BuildResult {
        // Validate inputs
        this.validateInputs(opportunity, simulationResult, config, titheRecipient);

        // Ensure we have exactly 2 hops for two-hop arbitrage
        if (opportunity.path.length !== 2) {
            throw new Error('TwoHopV3Builder: Opportunity must have exactly 2 hops');
        }

        const hop1 = opportunity.path[0];
        const hop2 = opportunity.path[1];

        // Detect if this is a minimal gas estimation simulation
        const isMinimalGasEstimateSim = (
            simulationResult.initialAmount === 1n &&
            simulationResult.hop1AmountOutSimulated === 1n
        );

        // Determine borrow amount and minOut values
        const borrowAmount = simulationResult.initialAmount;
        
        let minAmountOutHop1: bigint;
        let minAmountOutHop2: bigint;

        if (isMinimalGasEstimateSim) {
            // For gas estimation, use 0% slippage (exact simulated amounts)
            minAmountOutHop1 = simulationResult.hop1AmountOutSimulated;
            minAmountOutHop2 = simulationResult.finalAmountSimulated;
        } else {
            // For real execution, apply configured slippage tolerance
            minAmountOutHop1 = this.calculateMinAmountOut(
                simulationResult.hop1AmountOutSimulated,
                config.SLIPPAGE_TOLERANCE_BPS
            );
            minAmountOutHop2 = this.calculateMinAmountOut(
                simulationResult.finalAmountSimulated,
                config.SLIPPAGE_TOLERANCE_BPS
            );
        }

        // Validate minOut > 0 for real execution
        if (!isMinimalGasEstimateSim) {
            if (minAmountOutHop1 <= 0n) {
                throw new Error('TwoHopV3Builder: minAmountOutHop1 must be > 0 for real execution');
            }
            if (minAmountOutHop2 <= 0n) {
                throw new Error('TwoHopV3Builder: minAmountOutHop2 must be > 0 for real execution');
            }
        }

        // Validate borrow token matches one of the pool tokens
        const borrowToken = opportunity.borrowToken;
        const isToken0 = this.isBorrowTokenToken0(hop1, borrowToken);

        // Validate fees are valid uint24
        this.validateFee(hop1.fee);
        this.validateFee(hop2.fee);

        // Calculate amount0 and amount1 based on token position
        const { amount0, amount1 } = this.calculateAmounts(borrowAmount, isToken0);

        // Build callback parameters for V3 flash loan
        const callbackParams = {
            pool1: hop1.poolAddress,
            pool2: hop2.poolAddress,
            fee1: hop1.fee,
            fee2: hop2.fee,
            tokenIn: hop1.tokenIn,
            tokenIntermediate: hop1.tokenOut,
            tokenOut: hop2.tokenOut,
            minAmountOutHop1,
            minAmountOutHop2,
            titheRecipient
        };

        // Construct the main parameters object
        const params = {
            pool: hop1.poolAddress,
            amount0,
            amount1,
            callbackParams
        };

        // Define the ABI type string for encoding
        const typeString = 'tuple(address pool, uint256 amount0, uint256 amount1, tuple(address pool1, address pool2, uint24 fee1, uint24 fee2, address tokenIn, address tokenIntermediate, address tokenOut, uint256 minAmountOutHop1, uint256 minAmountOutHop2, address titheRecipient) callbackParams)';

        return {
            params,
            typeString,
            borrowTokenAddress: borrowToken
        };
    }

    /**
     * Determine if borrow token is token0 of the pool
     * 
     * @private
     */
    private static isBorrowTokenToken0(hop: ArbitragePath, borrowToken: string): boolean {
        const normalizedBorrow = borrowToken.toLowerCase();
        
        // If token0/token1 are explicitly provided in the hop
        if (hop.token0 && hop.token1) {
            return hop.token0.toLowerCase() === normalizedBorrow;
        }
        
        // Otherwise, assume tokenIn is the borrow token and compare addresses
        // In UniswapV3, token0 < token1 (address comparison)
        const tokenIn = hop.tokenIn.toLowerCase();
        const tokenOut = hop.tokenOut.toLowerCase();
        
        if (tokenIn === normalizedBorrow) {
            return tokenIn < tokenOut;
        } else if (tokenOut === normalizedBorrow) {
            return tokenOut < tokenIn;
        }
        
        throw new Error('TwoHopV3Builder: Borrow token does not match pool tokens');
    }

    /**
     * Calculate amount0 and amount1 based on token position
     * 
     * @private
     */
    private static calculateAmounts(borrowAmount: bigint, isToken0: boolean): { amount0: bigint; amount1: bigint } {
        if (isToken0) {
            return {
                amount0: borrowAmount,
                amount1: 0n
            };
        } else {
            return {
                amount0: 0n,
                amount1: borrowAmount
            };
        }
    }

    /**
     * Calculate minimum amount out with slippage protection
     * 
     * @private
     */
    private static calculateMinAmountOut(expectedAmount: bigint, slippageBps: number): bigint {
        const slippageMultiplier = BigInt(10000 - slippageBps);
        return (expectedAmount * slippageMultiplier) / 10000n;
    }

    /**
     * Validate all inputs
     * 
     * @private
     * @throws Error if validation fails
     */
    private static validateInputs(
        opportunity: ArbitrageOpportunity,
        simulationResult: SimulationResult,
        config: Config,
        titheRecipient: string
    ): void {
        // Validate opportunity
        if (!opportunity || !opportunity.path || opportunity.path.length === 0) {
            throw new Error('TwoHopV3Builder: Invalid opportunity - path is required');
        }

        if (!opportunity.borrowToken || !this.isValidAddress(opportunity.borrowToken)) {
            throw new Error('TwoHopV3Builder: Invalid borrow token address');
        }

        // Validate simulation result
        if (!simulationResult) {
            throw new Error('TwoHopV3Builder: SimulationResult is required');
        }

        if (typeof simulationResult.initialAmount !== 'bigint') {
            throw new Error('TwoHopV3Builder: initialAmount must be bigint');
        }

        if (typeof simulationResult.hop1AmountOutSimulated !== 'bigint') {
            throw new Error('TwoHopV3Builder: hop1AmountOutSimulated must be bigint');
        }

        if (typeof simulationResult.finalAmountSimulated !== 'bigint') {
            throw new Error('TwoHopV3Builder: finalAmountSimulated must be bigint');
        }

        // Validate config
        if (!config || typeof config.SLIPPAGE_TOLERANCE_BPS !== 'number') {
            throw new Error('TwoHopV3Builder: Invalid config - SLIPPAGE_TOLERANCE_BPS is required');
        }

        if (config.SLIPPAGE_TOLERANCE_BPS < 0 || config.SLIPPAGE_TOLERANCE_BPS > 10000) {
            throw new Error('TwoHopV3Builder: SLIPPAGE_TOLERANCE_BPS must be between 0 and 10000');
        }

        // Validate tithe recipient
        if (!this.isValidAddress(titheRecipient)) {
            throw new Error('TwoHopV3Builder: Invalid tithe recipient address');
        }
    }

    /**
     * Validate fee value is valid uint24
     * 
     * @private
     * @throws Error if fee is invalid
     */
    private static validateFee(fee: number): void {
        if (typeof fee !== 'number' || fee < 0 || fee > 16777215) {
            throw new Error('TwoHopV3Builder: Fee must be a valid uint24 (0 to 16777215)');
        }
    }

    /**
     * Check if address is valid Ethereum address
     * 
     * @private
     */
    private static isValidAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
}
