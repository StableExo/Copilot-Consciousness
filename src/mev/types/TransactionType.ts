/**
 * Transaction types for MEV risk classification
 * Ported from AxionCitadel's mev_profit_calculator/transaction_type.py
 */

export enum TransactionType {
  ARBITRAGE = 'ARBITRAGE',
  LIQUIDITY_PROVISION = 'LIQUIDITY_PROVISION',
  FLASH_LOAN = 'FLASH_LOAN',
  FRONT_RUNNABLE = 'FRONT_RUNNABLE',
}

/**
 * MEV Risk Parameters from sensor data
 */
export interface MEVRiskParams {
  mempoolCongestion: number;
  searcherDensity: number;
  timestamp: number;
}

/**
 * MEV Risk Calculation Result
 */
export interface MEVRiskResult {
  riskEth: number;
  riskRatio: number;
  frontrunProbability: number;
  competitionFactor: number;
}

/**
 * Profit Calculation with MEV Risk
 */
export interface ProfitWithMEVRisk {
  grossProfit: number;
  adjustedProfit: number;
  mevRisk: number;
  riskRatio: number;
  netProfitMargin: number;
}

/**
 * MEV Sensor Reading
 */
export interface SensorReading {
  value: number;
  timestamp: number;
  source: string;
}
