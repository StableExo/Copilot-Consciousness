/**
 * V3SushiBuilder
 *
 * Builds parameters for cross-protocol routing (UniswapV3 → SushiSwap).
 * Handles mixed DEX path execution and proper parameter encoding.
 *
 * Based on HAVOC's core/tx/builders/v3SushiBuilder.js
 */

import {
  BuildResult,
  SimulationResult,
  ArbitrageOpportunity,
  Config,
  DexType,
  UINT24_MAX,
} from './types';

/**
 * V3SushiBuilder class for building cross-protocol arbitrage parameters
 */
export class V3SushiBuilder {
  /**
   * Build parameters for cross-protocol arbitrage (UniV3 → SushiSwap)
   *
   * @param opportunity - The cross-protocol arbitrage opportunity to execute
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

    // Ensure we have at least 2 hops for cross-protocol routing
    if (opportunity.path.length < 2) {
      throw new Error('V3SushiBuilder: Opportunity must have at least 2 hops');
    }

    const hop1 = opportunity.path[0];
    const hop2 = opportunity.path[1];

    // Validate cross-protocol routing (UniV3 → Sushi)
    const hop1DexType = this.inferDexType(hop1.dexName);
    const hop2DexType = this.inferDexType(hop2.dexName);

    if (hop1DexType !== DexType.UniswapV3 || hop2DexType !== DexType.SushiSwap) {
      throw new Error('V3SushiBuilder: Expected UniswapV3 → SushiSwap routing');
    }

    // Detect if this is a minimal gas estimation simulation
    const isMinimalGasEstimateSim =
      simulationResult.initialAmount === 1n && simulationResult.hop1AmountOutSimulated === 1n;

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
        throw new Error('V3SushiBuilder: minAmountOutHop1 must be > 0 for real execution');
      }
      if (minAmountOutHop2 <= 0n) {
        throw new Error('V3SushiBuilder: minAmountOutHop2 must be > 0 for real execution');
      }
    }

    // Validate fees are valid uint24
    this.validateFee(hop1.fee);
    this.validateFee(hop2.fee);

    // Build cross-protocol parameters
    const params = {
      poolV3: hop1.poolAddress,
      poolSushi: hop2.poolAddress,
      feeV3: hop1.fee,
      feeSushi: hop2.fee,
      tokenIn: hop1.tokenIn,
      tokenIntermediate: hop1.tokenOut,
      tokenOut: hop2.tokenOut,
      borrowAmount: simulationResult.initialAmount,
      minAmountOutHop1,
      minAmountOutHop2,
      titheRecipient,
      dexType1: DexType.UniswapV3,
      dexType2: DexType.SushiSwap,
    };

    // Define the ABI type string for encoding
    const typeString =
      'tuple(address poolV3, address poolSushi, uint24 feeV3, uint24 feeSushi, address tokenIn, address tokenIntermediate, address tokenOut, uint256 borrowAmount, uint256 minAmountOutHop1, uint256 minAmountOutHop2, address titheRecipient, uint8 dexType1, uint8 dexType2)';

    return {
      params,
      typeString,
      borrowTokenAddress: opportunity.borrowToken,
    };
  }

  /**
   * Infer DEX type from DEX name
   *
   * @private
   */
  private static inferDexType(dexName: string): DexType {
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
      throw new Error('V3SushiBuilder: Invalid opportunity - path is required');
    }

    if (!opportunity.borrowToken || !this.isValidAddress(opportunity.borrowToken)) {
      throw new Error('V3SushiBuilder: Invalid borrow token address');
    }

    // Validate simulation result
    if (!simulationResult) {
      throw new Error('V3SushiBuilder: SimulationResult is required');
    }

    if (typeof simulationResult.initialAmount !== 'bigint') {
      throw new Error('V3SushiBuilder: initialAmount must be bigint');
    }

    if (typeof simulationResult.hop1AmountOutSimulated !== 'bigint') {
      throw new Error('V3SushiBuilder: hop1AmountOutSimulated must be bigint');
    }

    if (typeof simulationResult.finalAmountSimulated !== 'bigint') {
      throw new Error('V3SushiBuilder: finalAmountSimulated must be bigint');
    }

    // Validate config
    if (!config || typeof config.SLIPPAGE_TOLERANCE_BPS !== 'number') {
      throw new Error('V3SushiBuilder: Invalid config - SLIPPAGE_TOLERANCE_BPS is required');
    }

    if (config.SLIPPAGE_TOLERANCE_BPS < 0 || config.SLIPPAGE_TOLERANCE_BPS > 10000) {
      throw new Error('V3SushiBuilder: SLIPPAGE_TOLERANCE_BPS must be between 0 and 10000');
    }

    // Validate tithe recipient
    if (!this.isValidAddress(titheRecipient)) {
      throw new Error('V3SushiBuilder: Invalid tithe recipient address');
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
      throw new Error(`V3SushiBuilder: Fee must be a valid uint24 (0 to ${UINT24_MAX})`);
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
