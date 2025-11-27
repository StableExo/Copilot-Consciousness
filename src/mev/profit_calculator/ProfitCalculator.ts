/**
 * ProfitCalculator - MEV-aware profit calculation for arbitrage opportunities
 *
 * TypeScript port with Base L2 optimizations
 */

export enum TransactionType {
  ARBITRAGE = 'ARBITRAGE',
  FLASH_LOAN = 'FLASH_LOAN',
  LIQUIDITY_PROVISION = 'LIQUIDITY_PROVISION',
}

export interface ProfitResult {
  grossProfit: number;
  gasCost: number;
  mevRisk: number;
  mevLeakage: number;
  netProfit: number;
  adjustedProfit: number;
  isProfitable: boolean;
}

export interface MEVRiskParams {
  baseRisk: number;
  valueSensitivity: number;
  congestionFactor: number;
  searcherDensityFactor: number;
}

export class ProfitCalculator {
  private mevRiskParams: MEVRiskParams;

  constructor(customParams?: Partial<MEVRiskParams>) {
    this.mevRiskParams = {
      baseRisk: customParams?.baseRisk ?? 0.001,
      valueSensitivity: customParams?.valueSensitivity ?? 0.15,
      congestionFactor: customParams?.congestionFactor ?? 0.3,
      searcherDensityFactor: customParams?.searcherDensityFactor ?? 0.25,
    };
  }

  /**
   * Calculate MEV-adjusted profit for an arbitrage opportunity
   */
  calculateProfit(
    revenue: number,
    gasCost: number,
    txValue: number,
    txType: TransactionType = TransactionType.ARBITRAGE,
    mempoolCongestion: number = 0.5,
    searcherDensity: number = 0.1
  ): ProfitResult {
    // Calculate gross profit
    const grossProfit = revenue - gasCost;

    // Calculate MEV risk
    const mevRisk = this.calculateMEVRisk(txValue, txType, mempoolCongestion, searcherDensity);

    // Calculate MEV leakage (expected value lost to frontrunning)
    const mevLeakage = grossProfit * mevRisk;

    // Calculate net and adjusted profit
    const netProfit = grossProfit;
    const adjustedProfit = grossProfit - mevLeakage;

    return {
      grossProfit,
      gasCost,
      mevRisk,
      mevLeakage,
      netProfit,
      adjustedProfit,
      isProfitable: adjustedProfit > 0,
    };
  }

  /**
   * Calculate MEV risk score using game-theoretic model
   */
  private calculateMEVRisk(
    txValue: number,
    txType: TransactionType,
    mempoolCongestion: number,
    searcherDensity: number
  ): number {
    const { baseRisk, valueSensitivity, congestionFactor, searcherDensityFactor } =
      this.mevRiskParams;

    // Get transaction type multiplier
    const typeMultiplier = this.getTransactionTypeMultiplier(txType);

    // Calculate composite risk
    const valueTerm = valueSensitivity * Math.log(1 + txValue);
    const congestionTerm = congestionFactor * mempoolCongestion;
    const searcherTerm = searcherDensityFactor * searcherDensity;

    const risk = baseRisk + typeMultiplier * (valueTerm + congestionTerm + searcherTerm);

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, risk));
  }

  /**
   * Get multiplier based on transaction type
   */
  private getTransactionTypeMultiplier(txType: TransactionType): number {
    switch (txType) {
      case TransactionType.ARBITRAGE:
        return 1.0;
      case TransactionType.FLASH_LOAN:
        return 1.3; // Higher risk due to larger value
      case TransactionType.LIQUIDITY_PROVISION:
        return 0.7; // Lower risk, less attractive to frontrun
      default:
        return 1.0;
    }
  }

  /**
   * Calculate breakeven gas price for an opportunity
   */
  calculateBreakevenGasPrice(
    revenue: number,
    gasEstimate: number,
    txValue: number,
    txType: TransactionType = TransactionType.ARBITRAGE,
    mempoolCongestion: number = 0.5,
    searcherDensity: number = 0.1
  ): number {
    const mevRisk = this.calculateMEVRisk(txValue, txType, mempoolCongestion, searcherDensity);
    const adjustedRevenue = revenue * (1 - mevRisk);

    // breakeven = adjustedRevenue / gasEstimate
    return gasEstimate > 0 ? adjustedRevenue / gasEstimate : 0;
  }

  /**
   * Simulate profit under different congestion scenarios
   */
  simulateCongestionScenarios(
    revenue: number,
    gasCost: number,
    txValue: number,
    txType: TransactionType = TransactionType.ARBITRAGE
  ): Array<{ congestion: number; profit: ProfitResult }> {
    const scenarios: Array<{ congestion: number; profit: ProfitResult }> = [];

    // Test low, medium, high congestion
    for (const congestion of [0.2, 0.5, 0.8]) {
      const profit = this.calculateProfit(
        revenue,
        gasCost,
        txValue,
        txType,
        congestion,
        0.1 // Fixed searcher density
      );

      scenarios.push({ congestion, profit });
    }

    return scenarios;
  }

  /**
   * Update MEV risk parameters (for calibration)
   */
  updateRiskParams(params: Partial<MEVRiskParams>): void {
    this.mevRiskParams = {
      ...this.mevRiskParams,
      ...params,
    };
  }

  /**
   * Get current risk parameters
   */
  getRiskParams(): MEVRiskParams {
    return { ...this.mevRiskParams };
  }
}
