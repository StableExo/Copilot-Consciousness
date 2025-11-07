/**
 * ProfitCalculator - MEV-aware profit calculator with game-theoretic risk modeling
 * Ported from AxionCitadel's mev_profit_calculator/profit_calculator.py
 * 
 * Calculates adjusted profit after accounting for MEV leakage risk
 */

import { MEVRiskModel } from './MEVRiskModel';
import { TransactionType, ProfitWithMEVRisk } from '../types/TransactionType';

export class MEVAwareProfitCalculator {
  private riskModel: MEVRiskModel;

  constructor(riskModel?: MEVRiskModel) {
    this.riskModel = riskModel || new MEVRiskModel();
  }

  /**
   * Calculate adjusted profit with MEV risk
   * 
   * @param revenue - Expected revenue in ETH
   * @param gasCost - Gas cost in ETH
   * @param txValue - Transaction value in ETH
   * @param txType - Type of transaction
   * @param mempoolCongestion - Mempool congestion score (0-1), defaults to 0.5
   * @returns Profit metrics including MEV risk adjustments
   */
  calculateProfit(
    revenue: number,
    gasCost: number,
    txValue: number,
    txType: TransactionType,
    mempoolCongestion: number = 0.5
  ): ProfitWithMEVRisk {
    // Validate inputs
    if (revenue < 0 || gasCost < 0 || txValue < 0) {
      throw new Error('Negative values not permitted');
    }

    // Calculate MEV leakage risk
    const mevRisk = this.riskModel.calculateRisk(
      txValue,
      gasCost, // Using gas_cost as proxy for gas_price
      txType,
      mempoolCongestion
    );

    // Core profit calculation
    const grossProfit = revenue - gasCost;
    const adjustedProfit = grossProfit - mevRisk;

    return {
      grossProfit,
      adjustedProfit,
      mevRisk,
      riskRatio: mevRisk / (revenue + 1e-9), // Avoid division by zero
      netProfitMargin: adjustedProfit / (revenue + 1e-9),
    };
  }

  /**
   * Get the underlying MEV risk model
   */
  getRiskModel(): MEVRiskModel {
    return this.riskModel;
  }

  /**
   * Update the MEV risk model
   */
  setRiskModel(riskModel: MEVRiskModel): void {
    this.riskModel = riskModel;
  }
}
