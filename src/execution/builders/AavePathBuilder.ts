/**
 * AavePathBuilder
 *
 * Builds Aave flash loan parameters for multi-hop arbitrage paths.
 * Supports UniswapV3, SushiSwap, and DODO routing with optimized gas estimation.
 *
 * Based on HAVOC's core/tx/builders/aavePathBuilder.js
 */

import {
  BuildResult,
  SimulationResult,
  SwapStep,
  DexType,
  ArbitrageOpportunity,
  Config,
  UINT24_MAX,
} from './types';

/**
 * AavePathBuilder class for building Aave flash loan transaction parameters
 */
export class AavePathBuilder {
  /**
   * Build parameters for Aave flash loan multi-hop arbitrage
   *
   * @param opportunity - The arbitrage opportunity to execute
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

    // Detect if this is a minimal gas estimation simulation
    const isMinimalGasEstimateSim =
      simulationResult.initialAmount === 1n && simulationResult.hop1AmountOutSimulated === 1n;

    // Build swap steps array
    const swapSteps = this.buildSwapSteps(
      opportunity,
      simulationResult,
      config,
      isMinimalGasEstimateSim
    );

    // Construct the parameters object
    const params = {
      path: swapSteps,
      titheRecipient: titheRecipient,
    };

    // Define the ABI type string for encoding
    const typeString =
      'tuple(tuple(uint8 dexType, address pool, address tokenIn, address tokenOut, uint256 minOut, uint24 fee)[] path, address titheRecipient)';

    return {
      params,
      typeString,
      borrowTokenAddress: opportunity.borrowToken,
    };
  }

  /**
   * Build array of swap steps from arbitrage path
   *
   * @private
   */
  private static buildSwapSteps(
    opportunity: ArbitrageOpportunity,
    simulationResult: SimulationResult,
    config: Config,
    isMinimalGasEstimateSim: boolean
  ): SwapStep[] {
    const swapSteps: SwapStep[] = [];

    for (let i = 0; i < opportunity.path.length; i++) {
      const hop = opportunity.path[i];

      // Map DEX name to DexType enum
      const dexType = this.mapDexNameToType(hop.dexName);

      // Calculate minOut based on simulation type
      let minOut: bigint;

      if (isMinimalGasEstimateSim) {
        // For gas estimation, use 0% slippage (exact simulated amount)
        if (i === 0) {
          minOut = simulationResult.hop1AmountOutSimulated;
        } else if (i === opportunity.path.length - 1) {
          minOut = simulationResult.finalAmountSimulated;
        } else {
          // For intermediate hops, use 1n as placeholder
          minOut = 1n;
        }
      } else {
        // For real execution, apply configured slippage tolerance
        const expectedOut =
          i === 0 ? simulationResult.hop1AmountOutSimulated : simulationResult.finalAmountSimulated;

        minOut = this.calculateMinAmountOut(expectedOut, config.SLIPPAGE_TOLERANCE_BPS);
      }

      // DODO requires minOut > 0 due to contract validation
      // DODO's V2 pools revert on zero minOut, so we ensure at least 1 wei
      if (dexType === DexType.DODO && minOut === 0n) {
        minOut = 1n;
      }

      // Ensure minOut > 0 for real execution
      if (!isMinimalGasEstimateSim && minOut <= 0n) {
        throw new Error(`AavePathBuilder: minOut must be > 0 for real execution at hop ${i}`);
      }

      // Validate fee is valid uint24
      this.validateFee(hop.fee);

      swapSteps.push({
        dexType,
        pool: hop.poolAddress,
        tokenIn: hop.tokenIn,
        tokenOut: hop.tokenOut,
        minOut,
        fee: hop.fee,
      });
    }

    return swapSteps;
  }

  /**
   * Map DEX name string to DexType enum
   *
   * @private
   */
  private static mapDexNameToType(dexName: string): number {
    const normalizedName = dexName.toLowerCase();

    if (normalizedName.includes('uniswap') || normalizedName.includes('univ3')) {
      return DexType.UniswapV3;
    } else if (normalizedName.includes('sushi')) {
      return DexType.SushiSwap;
    } else if (normalizedName.includes('dodo')) {
      return DexType.DODO;
    }

    // Default to UniswapV3 if unknown
    return DexType.UniswapV3;
  }

  /**
   * Calculate minimum amount out with slippage protection
   *
   * @private
   * @param expectedAmount - The expected amount from simulation
   * @param slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%)
   * @returns Minimum acceptable amount
   */
  private static calculateMinAmountOut(expectedAmount: bigint, slippageBps: number): bigint {
    // minOut = expectedAmount * (10000 - slippageBps) / 10000
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
      throw new Error('AavePathBuilder: Invalid opportunity - path is required');
    }

    if (!opportunity.borrowToken || !this.isValidAddress(opportunity.borrowToken)) {
      throw new Error('AavePathBuilder: Invalid borrow token address');
    }

    // Validate simulation result
    if (!simulationResult) {
      throw new Error('AavePathBuilder: SimulationResult is required');
    }

    if (typeof simulationResult.initialAmount !== 'bigint') {
      throw new Error('AavePathBuilder: initialAmount must be bigint');
    }

    if (typeof simulationResult.hop1AmountOutSimulated !== 'bigint') {
      throw new Error('AavePathBuilder: hop1AmountOutSimulated must be bigint');
    }

    if (typeof simulationResult.finalAmountSimulated !== 'bigint') {
      throw new Error('AavePathBuilder: finalAmountSimulated must be bigint');
    }

    // Validate config
    if (!config || typeof config.SLIPPAGE_TOLERANCE_BPS !== 'number') {
      throw new Error('AavePathBuilder: Invalid config - SLIPPAGE_TOLERANCE_BPS is required');
    }

    if (config.SLIPPAGE_TOLERANCE_BPS < 0 || config.SLIPPAGE_TOLERANCE_BPS > 10000) {
      throw new Error('AavePathBuilder: SLIPPAGE_TOLERANCE_BPS must be between 0 and 10000');
    }

    // Validate tithe recipient
    if (!this.isValidAddress(titheRecipient)) {
      throw new Error('AavePathBuilder: Invalid tithe recipient address');
    }
  }

  /**
   * Validate fee value is valid uint24
   *
   * @private
   * @throws Error if fee is invalid
   */
  private static validateFee(fee: number): void {
    if (typeof fee !== 'number' || fee < 0 || fee > UINT24_MAX) {
      throw new Error(`AavePathBuilder: Fee must be a valid uint24 (0 to ${UINT24_MAX})`);
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
