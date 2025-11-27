/**
 * MEV Risk Model Types
 *
 * TypeScript type definitions for MEV risk intelligence
 * Matches Python MEV models from AxionCitadel
 */

/**
 * Transaction types with different MEV risk profiles
 */
export enum TransactionType {
  ARBITRAGE = 'ARBITRAGE',
  LIQUIDITY_PROVISION = 'LIQUIDITY_PROVISION',
  FLASH_LOAN = 'FLASH_LOAN',
  FRONT_RUNNABLE = 'FRONT_RUNNABLE',
}

/**
 * MEV risk model parameters (calibratable)
 */
export interface MEVRiskParams {
  base_risk: number;
  value_sensitivity: number;
  mempool_congestion_factor: number;
  searcher_density: number;
  frontrun_probability: {
    [key in TransactionType]: number;
  };
}

/**
 * Profit calculation result
 */
export interface ProfitMetrics {
  gross_profit: number;
  adjusted_profit: number;
  mev_risk: number;
  risk_ratio: number;
  net_profit_margin: number;
}

/**
 * Input parameters for profit calculation
 */
export interface ProfitCalculationInput {
  revenue: number;
  gas_cost: number;
  tx_value: number;
  tx_type: TransactionType;
  mempool_congestion?: number;
}

/**
 * MEV risk calculation input
 */
export interface MEVRiskInput {
  tx_value: number;
  gas_price: number;
  tx_type: TransactionType;
  mempool_congestion: number;
}
