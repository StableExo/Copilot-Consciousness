/**
 * ML Types and Interfaces
 * 
 * Core type definitions for the machine learning system
 */

import { ArbitragePath } from '../arbitrage/types';

/**
 * Time-series price data point
 */
export interface PriceDataPoint {
  timestamp: number;
  chain: number | string;
  tokenAddress: string;
  price: number;
  volume: number;
  liquidity: number;
  gasPrice?: number;
}

/**
 * Market features for ML models
 */
export interface MarketFeatures {
  // Price momentum features
  priceMomentum5s: number;
  priceMomentum15s: number;
  priceMomentum30s: number;
  priceMomentum1m: number;
  priceMomentum5m: number;
  
  // Volume features
  volumeMA: number;
  volumeRatio: number;
  vwap: number;
  
  // Liquidity features
  liquidityDepth: number;
  liquidityRatio: number;
  bidAskSpread: number;
  spreadTrend: number;
  
  // Gas features
  gasPricePercentile: number;
  gasTrend: number;
  
  // Volatility features
  volatility: number;
  atr: number;
  
  // Time features
  hourOfDay: number;
  dayOfWeek: number;
  
  // Cross-chain features
  priceCorrelation?: number;
}

/**
 * Enhanced arbitrage path with ML predictions
 */
export interface EnhancedArbitragePath extends ArbitragePath {
  mlPredictions?: MLPredictions;
}

/**
 * ML predictions for an opportunity
 */
export interface MLPredictions {
  priceForecasts: PriceForecast[];
  successProbability: number;
  volatilityForecast: VolatilityForecast;
  matchingPatterns: Pattern[];
  confidence: number;
  recommendation: 'EXECUTE' | 'SKIP' | 'QUEUE';
  timestamp: number;
}

/**
 * Price forecast from LSTM model
 */
export interface PriceForecast {
  horizon: number; // seconds
  predictedPrice: number;
  confidence: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Volatility forecast
 */
export interface VolatilityForecast {
  volatility: number;
  horizon: number; // minutes
  confidenceBand: {
    lower: number;
    upper: number;
  };
}

/**
 * Detected pattern
 */
export interface Pattern {
  id: string;
  type: 'time' | 'chain' | 'sequence' | 'cluster';
  description: string;
  confidence: number;
  historicalProfitability: number;
  conditions: PatternConditions;
}

/**
 * Pattern conditions
 */
export interface PatternConditions {
  timeOfDay?: number[];
  dayOfWeek?: number[];
  chains?: (number | string)[];
  tokens?: string[];
  volumeRange?: [number, number];
  liquidityRange?: [number, number];
  volatilityRange?: [number, number];
}

/**
 * Training data record
 */
export interface TrainingRecord {
  timestamp: number;
  features: MarketFeatures;
  path: ArbitragePath;
  outcome: TrainingOutcome;
}

/**
 * Training outcome
 */
export interface TrainingOutcome {
  executed: boolean;
  successful: boolean;
  actualProfit?: bigint;
  gasUsed?: bigint;
  executionTime?: number;
  failureReason?: string;
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  version: string;
  type: 'lstm' | 'random_forest' | 'garch';
  trainedAt: number;
  accuracy: number;
  loss?: number;
  metrics: Record<string, number>;
  hyperparameters: Record<string, any>;
}

/**
 * Model performance metrics
 */
export interface ModelPerformance {
  modelVersion: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  mse?: number;
  mae?: number;
  latencyMs: number;
  predictionCount: number;
  timestamp: number;
}

/**
 * Feature importance
 */
export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

/**
 * Backtesting result
 */
export interface BacktestResult {
  startDate: number;
  endDate: number;
  totalTrades: number;
  profitableTrades: number;
  totalProfit: bigint;
  totalLoss: bigint;
  netProfit: bigint;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageProfitPerTrade: number;
  mlEnhanced: boolean;
  baselineComparison?: {
    netProfit: bigint;
    winRate: number;
    improvement: number;
  };
}

/**
 * Inference request
 */
export interface InferenceRequest {
  path: ArbitragePath;
  features: MarketFeatures;
  timestamp: number;
}

/**
 * Inference response
 */
export interface InferenceResponse {
  predictions: MLPredictions;
  latencyMs: number;
  cached: boolean;
}

/**
 * Data collection event
 */
export interface DataCollectionEvent {
  type: 'price' | 'trade' | 'arbitrage' | 'gas';
  timestamp: number;
  data: any;
}

/**
 * Model alert
 */
export interface ModelAlert {
  severity: 'info' | 'warning' | 'error';
  type: 'accuracy_drop' | 'latency_high' | 'drift_detected' | 'training_failed';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
