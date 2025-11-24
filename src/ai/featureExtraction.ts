/**
 * Phase 3 Feature Extraction Utilities
 * 
 * Extracts features from arbitrage opportunities for AI model consumption
 * Specifically for OpportunityNNScorer neural network input
 */

import { ethers } from 'ethers';
import { ArbitragePath } from '../arbitrage/types';

/**
 * Features expected by OpportunityNNScorer (18 features total)
 * 
 * Based on PHASE3_ROADMAP.md specification:
 * - Profit metrics (4): gross profit, net profit, profit margin, ROI
 * - Liquidity metrics (3): total liquidity, liquidity ratio, pool depth
 * - MEV risk factors (3): MEV risk, competition level, block congestion
 * - Path characteristics (3): hop count, path complexity, gas estimate
 * - Market conditions (2): volatility, price impact
 * - Historical performance (2): similar path success rate, avg historical profit
 * - Timing (1): time of day
 */
export interface OpportunityFeatures {
  // Profit metrics (4)
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  
  // Liquidity metrics (3)
  totalLiquidity: number;
  liquidityRatio: number;
  poolDepth: number;
  
  // MEV risk factors (3)
  mevRisk: number;
  competitionLevel: number;
  blockCongestion: number;
  
  // Path characteristics (3)
  hopCount: number;
  pathComplexity: number;
  gasEstimate: number;
  
  // Market conditions (2)
  volatility: number;
  priceImpact: number;
  
  // Historical performance (2)
  similarPathSuccessRate: number;
  avgHistoricalProfit: number;
  
  // Timing (1)
  timeOfDay: number;
}

/**
 * Extract features from an arbitrage opportunity
 * 
 * @param opportunity - The arbitrage path to extract features from
 * @param marketState - Current market state (congestion, MEV risk, etc.)
 * @param historicalData - Historical execution data for similar paths
 * @returns Normalized features ready for NN input
 */
export function extractOpportunityFeatures(
  opportunity: ArbitragePath,
  marketState?: {
    congestion?: number;
    mevRisk?: number;
    competitionLevel?: number;
    volatility?: number;
  },
  historicalData?: {
    successRate?: number;
    avgProfit?: number;
  }
): OpportunityFeatures {
  // Profit metrics
  const grossProfit = Number(formatEther(opportunity.estimatedProfit || 0));
  const netProfit = Number(formatEther(opportunity.netProfit || 0));
  const profitMargin = grossProfit > 0 ? netProfit / grossProfit : 0;
  const roi = grossProfit > 0 ? netProfit / Number(formatEther(opportunity.totalGasCost || 1)) : 0;
  
  // Liquidity metrics (approximate from hop data)
  const hopLiquidities = opportunity.hops?.map((hop: any) => hop.liquidity || 0) || [];
  const totalLiquidity = hopLiquidities.reduce((sum: number, liq: number) => sum + liq, 0);
  const avgLiquidity = hopLiquidities.length > 0 ? totalLiquidity / hopLiquidities.length : 0;
  const minLiquidity = hopLiquidities.length > 0 ? Math.min(...hopLiquidities) : 0;
  const liquidityRatio = avgLiquidity > 0 ? minLiquidity / avgLiquidity : 1;
  const poolDepth = minLiquidity;
  
  // MEV risk factors
  const mevRisk = marketState?.mevRisk || 0.5;
  const competitionLevel = marketState?.competitionLevel || 0.5;
  const blockCongestion = marketState?.congestion || 0.5;
  
  // Path characteristics
  const hopCount = opportunity.hops?.length || 2;
  const pathComplexity = calculatePathComplexity(opportunity);
  const gasEstimate = Number(formatUnits(opportunity.totalGasCost || 200000, 0));
  
  // Market conditions
  const volatility = marketState?.volatility || 0.5;
  const priceImpact = opportunity.slippageImpact || 0.01;
  
  // Historical performance
  const similarPathSuccessRate = historicalData?.successRate || 0.5;
  const avgHistoricalProfit = historicalData?.avgProfit || 0;
  
  // Timing
  const hour = new Date().getHours();
  const timeOfDay = hour / 24; // Normalize to 0-1
  
  return {
    // Normalize all features to roughly 0-1 range for neural network
    grossProfit: normalizeProfit(grossProfit),
    netProfit: normalizeProfit(netProfit),
    profitMargin: Math.max(0, Math.min(1, profitMargin)),
    roi: normalizeRoi(roi),
    
    totalLiquidity: normalizeLiquidity(totalLiquidity),
    liquidityRatio: Math.max(0, Math.min(1, liquidityRatio)),
    poolDepth: normalizeLiquidity(poolDepth),
    
    mevRisk: Math.max(0, Math.min(1, mevRisk)),
    competitionLevel: Math.max(0, Math.min(1, competitionLevel)),
    blockCongestion: Math.max(0, Math.min(1, blockCongestion)),
    
    hopCount: normalizeHopCount(hopCount),
    pathComplexity: Math.max(0, Math.min(1, pathComplexity)),
    gasEstimate: normalizeGas(gasEstimate),
    
    volatility: Math.max(0, Math.min(1, volatility)),
    priceImpact: normalizePriceImpact(priceImpact),
    
    similarPathSuccessRate: Math.max(0, Math.min(1, similarPathSuccessRate)),
    avgHistoricalProfit: normalizeProfit(avgHistoricalProfit),
    
    timeOfDay,
  };
}

/**
 * Calculate path complexity score (0-1)
 * 
 * Based on:
 * - Number of hops (more hops = more complex)
 * - Token diversity (more unique tokens = more complex)
 * - DEX diversity (more DEXes = more complex)
 */
function calculatePathComplexity(opportunity: ArbitragePath): number {
  const hopCount = opportunity.hops?.length || 2;
  const hopComplexity = Math.min(hopCount / 5, 1); // 5+ hops = max complexity
  
  // Token diversity
  const tokens = new Set<string>();
  opportunity.hops?.forEach((hop: any) => {
    if (hop.tokenIn) tokens.add(hop.tokenIn);
    if (hop.tokenOut) tokens.add(hop.tokenOut);
  });
  const tokenComplexity = Math.min(tokens.size / 5, 1);
  
  // DEX diversity
  const dexes = new Set<string>();
  opportunity.hops?.forEach((hop: any) => {
    if (hop.dex) dexes.add(hop.dex);
  });
  const dexComplexity = Math.min(dexes.size / 3, 1);
  
  // Weighted average
  return hopComplexity * 0.5 + tokenComplexity * 0.3 + dexComplexity * 0.2;
}

/**
 * Normalize profit to 0-1 range
 * Uses logarithmic scaling for better distribution
 */
function normalizeProfit(profit: number): number {
  if (profit <= 0) return 0;
  // Log scale: 0.001 ETH = 0.1, 0.01 ETH = 0.3, 0.1 ETH = 0.5, 1 ETH = 0.8
  return Math.min(1, Math.max(0, (Math.log10(profit * 1000) + 3) / 6));
}

/**
 * Normalize ROI to 0-1 range
 */
function normalizeRoi(roi: number): number {
  // ROI of 0.5 (50%) = 0.5, 1.0 (100%) = 0.75, 2.0 (200%) = 0.9
  return Math.min(1, Math.max(0, roi / (1 + roi)));
}

/**
 * Normalize liquidity to 0-1 range
 * Uses logarithmic scaling
 */
function normalizeLiquidity(liquidity: number): number {
  if (liquidity <= 0) return 0;
  // Log scale: $10k = 0.2, $100k = 0.4, $1M = 0.6, $10M = 0.8
  return Math.min(1, Math.max(0, (Math.log10(liquidity) - 4) / 4));
}

/**
 * Normalize hop count to 0-1 range
 */
function normalizeHopCount(hops: number): number {
  // 2 hops = 0.2, 3 hops = 0.4, 4 hops = 0.6, 5+ hops = 0.8+
  return Math.min(1, hops / 6);
}

/**
 * Normalize gas estimate to 0-1 range
 */
function normalizeGas(gas: number): number {
  // 100k gas = 0.2, 200k = 0.4, 300k = 0.6, 500k+ = 0.8+
  return Math.min(1, gas / 600000);
}

/**
 * Normalize price impact to 0-1 range
 */
function normalizePriceImpact(impact: number): number {
  // 0.1% = 0.1, 0.5% = 0.25, 1% = 0.4, 5%+ = 0.8+
  return Math.min(1, impact * 100 / 6);
}

/**
 * Convert features object to array for neural network input
 */
export function featuresToArray(features: OpportunityFeatures): number[] {
  return [
    features.grossProfit,
    features.netProfit,
    features.profitMargin,
    features.roi,
    features.totalLiquidity,
    features.liquidityRatio,
    features.poolDepth,
    features.mevRisk,
    features.competitionLevel,
    features.blockCongestion,
    features.hopCount,
    features.pathComplexity,
    features.gasEstimate,
    features.volatility,
    features.priceImpact,
    features.similarPathSuccessRate,
    features.avgHistoricalProfit,
    features.timeOfDay,
  ];
}

/**
 * Get feature names for debugging and explanation
 */
export function getFeatureNames(): string[] {
  return [
    'grossProfit',
    'netProfit',
    'profitMargin',
    'roi',
    'totalLiquidity',
    'liquidityRatio',
    'poolDepth',
    'mevRisk',
    'competitionLevel',
    'blockCongestion',
    'hopCount',
    'pathComplexity',
    'gasEstimate',
    'volatility',
    'priceImpact',
    'similarPathSuccessRate',
    'avgHistoricalProfit',
    'timeOfDay',
  ];
}
