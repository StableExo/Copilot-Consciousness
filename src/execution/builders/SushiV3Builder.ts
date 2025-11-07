/**
 * SushiV3Builder
 * 
 * Builds SushiSwap V3 specific parameters for arbitrage execution.
 * Handles Sushi V3 fee structures and pool interactions.
 * 
 * Based on HAVOC's core/tx/builders/sushiV3Builder.js
 */

import {
    BuildResult,
    SimulationResult,
    ArbitrageOpportunity,
    Config,
    DexType
} from './types';

/**
 * SushiV3Builder class for building SushiSwap V3 arbitrage parameters
 */
export class SushiV3Builder {
    /**
     * Build parameters for SushiSwap V3 arbitrage
     * 
     * @param opportunity - The SushiSwap V3 arbitrage opportunity to execute
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

        // Ensure we have at least 2 hops
        if (opportunity.path.length < 2) {
            throw new Error('SushiV3Builder: Opportunity must have at least 2 hops');
        }

        const hop1 = opportunity.path[0];
        const hop2 = opportunity.path[1];

        // Detect if this is a minimal gas estimation simulation
        const isMinimalGasEstimateSim = (
            simulationResult.initialAmount === 1n &&
            simulationResult.hop1AmountOutSimulated === 1n
        );

        // Calculate minOut values
        let minAmountOutHop1: bigint;
        let minAmountOutHop2: bigint;

        if (isMinimalGasEstimateSim) {
            // For gas estimation, use 0% slippage
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
                throw new Error('SushiV3Builder: minAmountOutHop1 must be > 0 for real execution');
            }
            if (minAmountOutHop2 <= 0n) {
                throw new Error('SushiV3Builder: minAmountOutHop2 must be > 0 for real execution');
            }
        }

        // Validate fees are valid uint24 (SushiSwap V3 uses same fee structure as Uniswap V3)
        this.validateFee(hop1.fee);
        this.validateFee(hop2.fee);

        // Build SushiSwap V3 specific parameters
        const params = {
            pool1: hop1.poolAddress,
            pool2: hop2.poolAddress,
            fee1: hop1.fee,
            fee2: hop2.fee,
            tokenIn: hop1.tokenIn,
            tokenIntermediate: hop1.tokenOut,
            tokenOut: hop2.tokenOut,
            borrowAmount: simulationResult.initialAmount,
            minAmountOutHop1,
            minAmountOutHop2,
            titheRecipient,
            dexType: DexType.SushiSwap
        };

        // Define the ABI type string for encoding
        const typeString = 'tuple(address pool1, address pool2, uint24 fee1, uint24 fee2, address tokenIn, address tokenIntermediate, address tokenOut, uint256 borrowAmount, uint256 minAmountOutHop1, uint256 minAmountOutHop2, address titheRecipient, uint8 dexType)';

        return {
            params,
            typeString,
            borrowTokenAddress: opportunity.borrowToken
        };
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
            throw new Error('SushiV3Builder: Invalid opportunity - path is required');
        }

        if (!opportunity.borrowToken || !this.isValidAddress(opportunity.borrowToken)) {
            throw new Error('SushiV3Builder: Invalid borrow token address');
        }

        // Validate simulation result
        if (!simulationResult) {
            throw new Error('SushiV3Builder: SimulationResult is required');
        }

        if (typeof simulationResult.initialAmount !== 'bigint') {
            throw new Error('SushiV3Builder: initialAmount must be bigint');
        }

        if (typeof simulationResult.hop1AmountOutSimulated !== 'bigint') {
            throw new Error('SushiV3Builder: hop1AmountOutSimulated must be bigint');
        }

        if (typeof simulationResult.finalAmountSimulated !== 'bigint') {
            throw new Error('SushiV3Builder: finalAmountSimulated must be bigint');
        }

        // Validate config
        if (!config || typeof config.SLIPPAGE_TOLERANCE_BPS !== 'number') {
            throw new Error('SushiV3Builder: Invalid config - SLIPPAGE_TOLERANCE_BPS is required');
        }

        if (config.SLIPPAGE_TOLERANCE_BPS < 0 || config.SLIPPAGE_TOLERANCE_BPS > 10000) {
            throw new Error('SushiV3Builder: SLIPPAGE_TOLERANCE_BPS must be between 0 and 10000');
        }

        // Validate tithe recipient
        if (!this.isValidAddress(titheRecipient)) {
            throw new Error('SushiV3Builder: Invalid tithe recipient address');
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
            throw new Error('SushiV3Builder: Fee must be a valid uint24 (0 to 16777215)');
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
