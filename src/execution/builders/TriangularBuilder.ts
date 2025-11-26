/**
 * TriangularBuilder
 *
 * Builds parameters for three-token cyclic arbitrage (A → B → C → A).
 * Handles three-hop UniswapV3 paths with callback type encoding.
 *
 * Based on HAVOC's core/tx/builders/triangularBuilder.js
 */

import { BuildResult, SimulationResult, ArbitrageOpportunity, Config, UINT24_MAX } from './types';

/**
 * TriangularBuilder class for building triangular arbitrage parameters
 */
export class TriangularBuilder {
  /**
   * Build parameters for three-token cyclic arbitrage
   *
   * @param opportunity - The triangular arbitrage opportunity to execute
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

    // Ensure we have exactly 3 hops for triangular arbitrage
    if (opportunity.path.length !== 3) {
      throw new Error(
        'TriangularBuilder: Opportunity must have exactly 3 hops for triangular arbitrage'
      );
    }

    const hop1 = opportunity.path[0];
    const hop2 = opportunity.path[1];
    const hop3 = opportunity.path[2];

    // Validate cyclic path (final output returns to initial input)
    if (hop3.tokenOut.toLowerCase() !== hop1.tokenIn.toLowerCase()) {
      throw new Error(
        'TriangularBuilder: Invalid triangular path - final token must match initial token'
      );
    }

    // Detect if this is a minimal gas estimation simulation
    const isMinimalGasEstimateSim =
      simulationResult.initialAmount === 1n && simulationResult.hop1AmountOutSimulated === 1n;

    // Validate profit for real execution
    if (
      !isMinimalGasEstimateSim &&
      simulationResult.finalAmountSimulated <= simulationResult.initialAmount
    ) {
      throw new Error(
        'TriangularBuilder: Final amount must exceed initial amount for profitable arbitrage'
      );
    }

    // Calculate minOut values for each hop
    let minAmountOutHop1: bigint;
    let minAmountOutHop2: bigint;
    let minAmountOutHop3: bigint;

    if (isMinimalGasEstimateSim) {
      // For gas estimation, use 0% slippage
      minAmountOutHop1 = simulationResult.hop1AmountOutSimulated;
      minAmountOutHop2 = 1n; // Intermediate hop
      minAmountOutHop3 = simulationResult.finalAmountSimulated;
    } else {
      // For real execution, apply configured slippage tolerance
      minAmountOutHop1 = this.calculateMinAmountOut(
        simulationResult.hop1AmountOutSimulated,
        config.SLIPPAGE_TOLERANCE_BPS
      );
      // Intermediate hop - estimate based on first hop output with slippage
      // This is a conservative estimate; actual amount may vary based on pool state
      minAmountOutHop2 = this.calculateMinAmountOut(
        simulationResult.hop1AmountOutSimulated,
        config.SLIPPAGE_TOLERANCE_BPS
      );
      minAmountOutHop3 = this.calculateMinAmountOut(
        simulationResult.finalAmountSimulated,
        config.SLIPPAGE_TOLERANCE_BPS
      );
    }

    // Validate minOut > 0 for real execution
    if (!isMinimalGasEstimateSim) {
      if (minAmountOutHop1 <= 0n) {
        throw new Error('TriangularBuilder: minAmountOutHop1 must be > 0 for real execution');
      }
      if (minAmountOutHop2 <= 0n) {
        throw new Error('TriangularBuilder: minAmountOutHop2 must be > 0 for real execution');
      }
      if (minAmountOutHop3 <= 0n) {
        throw new Error('TriangularBuilder: minAmountOutHop3 must be > 0 for real execution');
      }
    }

    // Validate fees are valid uint24
    this.validateFee(hop1.fee);
    this.validateFee(hop2.fee);
    this.validateFee(hop3.fee);

    // Build callback parameters for triangular arbitrage
    const callbackParams = {
      pool1: hop1.poolAddress,
      pool2: hop2.poolAddress,
      pool3: hop3.poolAddress,
      fee1: hop1.fee,
      fee2: hop2.fee,
      fee3: hop3.fee,
      tokenA: hop1.tokenIn,
      tokenB: hop1.tokenOut,
      tokenC: hop2.tokenOut,
      minAmountOutHop1,
      minAmountOutHop2,
      minAmountOutHop3,
      titheRecipient,
      callbackType: 1, // Triangular arbitrage callback type
    };

    // Construct the main parameters object
    const params = {
      pool: hop1.poolAddress,
      borrowAmount: simulationResult.initialAmount,
      callbackParams,
    };

    // Define the ABI type string for encoding
    const typeString =
      'tuple(address pool, uint256 borrowAmount, tuple(address pool1, address pool2, address pool3, uint24 fee1, uint24 fee2, uint24 fee3, address tokenA, address tokenB, address tokenC, uint256 minAmountOutHop1, uint256 minAmountOutHop2, uint256 minAmountOutHop3, address titheRecipient, uint8 callbackType) callbackParams)';

    return {
      params,
      typeString,
      borrowTokenAddress: opportunity.borrowToken,
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
      throw new Error('TriangularBuilder: Invalid opportunity - path is required');
    }

    if (!opportunity.borrowToken || !this.isValidAddress(opportunity.borrowToken)) {
      throw new Error('TriangularBuilder: Invalid borrow token address');
    }

    // Validate simulation result
    if (!simulationResult) {
      throw new Error('TriangularBuilder: SimulationResult is required');
    }

    if (typeof simulationResult.initialAmount !== 'bigint') {
      throw new Error('TriangularBuilder: initialAmount must be bigint');
    }

    if (typeof simulationResult.hop1AmountOutSimulated !== 'bigint') {
      throw new Error('TriangularBuilder: hop1AmountOutSimulated must be bigint');
    }

    if (typeof simulationResult.finalAmountSimulated !== 'bigint') {
      throw new Error('TriangularBuilder: finalAmountSimulated must be bigint');
    }

    // Validate config
    if (!config || typeof config.SLIPPAGE_TOLERANCE_BPS !== 'number') {
      throw new Error('TriangularBuilder: Invalid config - SLIPPAGE_TOLERANCE_BPS is required');
    }

    if (config.SLIPPAGE_TOLERANCE_BPS < 0 || config.SLIPPAGE_TOLERANCE_BPS > 10000) {
      throw new Error('TriangularBuilder: SLIPPAGE_TOLERANCE_BPS must be between 0 and 10000');
    }

    // Validate tithe recipient
    if (!this.isValidAddress(titheRecipient)) {
      throw new Error('TriangularBuilder: Invalid tithe recipient address');
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
      throw new Error(`TriangularBuilder: Fee must be a valid uint24 (0 to ${UINT24_MAX})`);
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
