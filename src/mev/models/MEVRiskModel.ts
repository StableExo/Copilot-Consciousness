/**
 * MEVRiskModel - Quantifies MEV leakage risk based on game-theoretic parameters
 * Ported from AxionCitadel's mev_profit_calculator/mev_risk_model.py
 * 
 * This model calculates the expected MEV leakage (value extracted by searchers)
 * for different transaction types under varying mempool conditions.
 */

import { TransactionType, MEVRiskResult } from '../types/TransactionType';

export interface MEVRiskModelParams {
  baseRisk: number;
  valueSensitivity: number;
  mempoolCongestionFactor: number;
  searcherDensity: number;
  frontrunProbability: Record<TransactionType, number>;
}

const DEFAULT_PARAMS: MEVRiskModelParams = {
  baseRisk: 0.001, // ETH
  valueSensitivity: 0.15,
  mempoolCongestionFactor: 0.3,
  searcherDensity: 0.25,
  frontrunProbability: {
    [TransactionType.ARBITRAGE]: 0.7,
    [TransactionType.LIQUIDITY_PROVISION]: 0.2,
    [TransactionType.FLASH_LOAN]: 0.8,
    [TransactionType.FRONT_RUNNABLE]: 0.9,
  },
};

export class MEVRiskModel {
  private params: MEVRiskModelParams;

  constructor(params?: Partial<MEVRiskModelParams>) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  /**
   * Calculate MEV leakage risk using game-theoretic model
   * 
   * @param txValue - Transaction value in ETH
   * @param gasPrice - Gas price (not used in current formula, kept for API compatibility)
   * @param txType - Type of transaction
   * @param mempoolCongestion - Mempool congestion score (0-1 scale)
   * @returns MEV risk in ETH
   */
  calculateRisk(
    txValue: number,
    gasPrice: number,
    txType: TransactionType,
    mempoolCongestion: number
  ): number {
    // Base probability of exploitation
    const pExploit = this.params.frontrunProbability[txType];

    // Strategic adjustment factors
    const valueFactor = this.params.valueSensitivity * Math.log1p(txValue);
    const congestionFactor = this.params.mempoolCongestionFactor * mempoolCongestion;

    // Searcher competition effect (more searchers → higher risk)
    const competitionFactor = 1 + Math.tanh(this.params.searcherDensity * 3);

    // Final risk calculation
    const risk =
      this.params.baseRisk +
      (pExploit * valueFactor * competitionFactor) / (1 + congestionFactor);

    // Cap risk at 95% of tx value, but ensure base_risk is respected if tx_value is 0
    return txValue === 0 ? risk : Math.min(risk, txValue * 0.95);
  }

  /**
   * Calculate detailed MEV risk metrics
   */
  calculateDetailedRisk(
    txValue: number,
    gasPrice: number,
    txType: TransactionType,
    mempoolCongestion: number
  ): MEVRiskResult {
    const pExploit = this.params.frontrunProbability[txType];
    const valueFactor = this.params.valueSensitivity * Math.log1p(txValue);
    const congestionFactor = this.params.mempoolCongestionFactor * mempoolCongestion;
    const competitionFactor = 1 + Math.tanh(this.params.searcherDensity * 3);

    const risk =
      this.params.baseRisk +
      (pExploit * valueFactor * competitionFactor) / (1 + congestionFactor);

    const cappedRisk = txValue === 0 ? risk : Math.min(risk, txValue * 0.95);

    return {
      riskEth: cappedRisk,
      riskRatio: txValue > 0 ? cappedRisk / txValue : 0,
      frontrunProbability: pExploit,
      competitionFactor,
    };
  }

  /**
   * Update risk model parameters
   */
  updateParams(params: Partial<MEVRiskModelParams>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * Get current risk model parameters
   */
  getParams(): MEVRiskModelParams {
    return { ...this.params };
  }
}
