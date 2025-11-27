/**
 * FeatureExtractor - Transform raw market data into ML-ready features
 *
 * Extracts features including price momentum, volume metrics, liquidity ratios,
 * gas trends, volatility measures, time-based patterns, and MEV risk indicators.
 */

import { PriceDataPoint, MarketFeatures, FeatureImportance } from './types';
import { ArbitragePath } from '../arbitrage/types';
import { MEVRiskParams } from '../mev/types/TransactionType';

export interface FeatureExtractionOptions {
  windows: {
    momentum: number[];
    volatility: number;
    vwap: number;
  };
  normalization: boolean;
  handleMissing: 'zero' | 'forward_fill' | 'interpolate';
}

const DEFAULT_OPTIONS: FeatureExtractionOptions = {
  windows: {
    momentum: [5000, 15000, 30000, 60000, 300000], // 5s, 15s, 30s, 1m, 5m
    volatility: 300000, // 5 minutes
    vwap: 60000, // 1 minute
  },
  normalization: true,
  handleMissing: 'forward_fill',
};

/**
 * FeatureExtractor - Extracts ML features from raw market data
 */
export class FeatureExtractor {
  private options: FeatureExtractionOptions;
  private featureImportance: Map<string, number> = new Map();

  constructor(options?: Partial<FeatureExtractionOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract features from price history
   */
  async extractFeatures(
    priceHistory: PriceDataPoint[],
    currentTime: number,
    mevRiskParams?: MEVRiskParams
  ): Promise<MarketFeatures> {
    if (priceHistory.length === 0) {
      throw new Error('Price history is empty');
    }

    // Sort by timestamp
    const sortedHistory = [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
    const latestPoint = sortedHistory[sortedHistory.length - 1];

    // Extract different feature types
    const momentumFeatures = this.extractMomentumFeatures(sortedHistory, currentTime);
    const volumeFeatures = this.extractVolumeFeatures(sortedHistory);
    const liquidityFeatures = this.extractLiquidityFeatures(sortedHistory);
    const gasFeatures = this.extractGasFeatures(sortedHistory);
    const volatilityFeatures = this.extractVolatilityFeatures(sortedHistory);
    const timeFeatures = this.extractTimeFeatures(currentTime);
    const mevFeatures = this.extractMEVFeatures(mevRiskParams);

    const features: MarketFeatures = {
      ...momentumFeatures,
      ...volumeFeatures,
      ...liquidityFeatures,
      ...gasFeatures,
      ...volatilityFeatures,
      ...timeFeatures,
      ...mevFeatures,
    };

    // Normalize if enabled
    if (this.options.normalization) {
      return this.normalizeFeatures(features);
    }

    return features;
  }

  /**
   * Extract features from arbitrage path
   */
  extractPathFeatures(path: ArbitragePath): Record<string, number> {
    return {
      numHops: path.hops.length,
      totalFees: path.totalFees,
      estimatedProfit: Number(path.estimatedProfit) / 1e18,
      gasEstimate: Number(path.totalGasCost) / 1e9,
      slippageImpact: path.slippageImpact,
      avgLiquidity: this.calculateAverageLiquidity(path),
      minLiquidity: this.calculateMinLiquidity(path),
      pathComplexity: this.calculatePathComplexity(path),
    };
  }

  /**
   * Extract price momentum features
   */
  private extractMomentumFeatures(
    history: PriceDataPoint[],
    currentTime: number
  ): Pick<
    MarketFeatures,
    | 'priceMomentum5s'
    | 'priceMomentum15s'
    | 'priceMomentum30s'
    | 'priceMomentum1m'
    | 'priceMomentum5m'
  > {
    const currentPrice = history[history.length - 1].price;

    const momentum5s = this.calculateMomentum(history, currentTime, 5000, currentPrice);
    const momentum15s = this.calculateMomentum(history, currentTime, 15000, currentPrice);
    const momentum30s = this.calculateMomentum(history, currentTime, 30000, currentPrice);
    const momentum1m = this.calculateMomentum(history, currentTime, 60000, currentPrice);
    const momentum5m = this.calculateMomentum(history, currentTime, 300000, currentPrice);

    return {
      priceMomentum5s: momentum5s,
      priceMomentum15s: momentum15s,
      priceMomentum30s: momentum30s,
      priceMomentum1m: momentum1m,
      priceMomentum5m: momentum5m,
    };
  }

  /**
   * Calculate momentum for a specific window
   */
  private calculateMomentum(
    history: PriceDataPoint[],
    currentTime: number,
    windowMs: number,
    currentPrice: number
  ): number {
    const startTime = currentTime - windowMs;
    const windowData = history.filter((p) => p.timestamp >= startTime);

    if (windowData.length === 0) {
      return 0;
    }

    const oldPrice = windowData[0].price;
    return oldPrice > 0 ? (currentPrice - oldPrice) / oldPrice : 0;
  }

  /**
   * Extract volume features
   */
  private extractVolumeFeatures(
    history: PriceDataPoint[]
  ): Pick<MarketFeatures, 'volumeMA' | 'volumeRatio' | 'vwap'> {
    const recentHistory = history.slice(-12); // Last minute (5s intervals)

    const volumeMA = recentHistory.reduce((sum, p) => sum + p.volume, 0) / recentHistory.length;
    const currentVolume = history[history.length - 1].volume;
    const volumeRatio = volumeMA > 0 ? currentVolume / volumeMA : 1;

    const vwap = this.calculateVWAP(recentHistory);

    return {
      volumeMA,
      volumeRatio,
      vwap,
    };
  }

  /**
   * Calculate Volume-Weighted Average Price
   */
  private calculateVWAP(history: PriceDataPoint[]): number {
    let totalVolumePrice = 0;
    let totalVolume = 0;

    for (const point of history) {
      totalVolumePrice += point.price * point.volume;
      totalVolume += point.volume;
    }

    return totalVolume > 0
      ? totalVolumePrice / totalVolume
      : history[history.length - 1]?.price || 0;
  }

  /**
   * Extract liquidity features
   */
  private extractLiquidityFeatures(
    history: PriceDataPoint[]
  ): Pick<MarketFeatures, 'liquidityDepth' | 'liquidityRatio' | 'bidAskSpread' | 'spreadTrend'> {
    const currentPoint = history[history.length - 1];
    const previousPoint = history[history.length - 2];

    const liquidityDepth = currentPoint.liquidity;
    const liquidityRatio = previousPoint
      ? currentPoint.liquidity / (previousPoint.liquidity || 1)
      : 1;

    // Estimate bid-ask spread from price volatility
    const recentPrices = history.slice(-10).map((p) => p.price);
    const priceStd = this.calculateStandardDeviation(recentPrices);
    const bidAskSpread = priceStd / currentPoint.price;

    // Spread trend
    const olderPrices = history.slice(-20, -10).map((p) => p.price);
    const olderPriceStd = this.calculateStandardDeviation(olderPrices);
    const spreadTrend = olderPriceStd > 0 ? (priceStd - olderPriceStd) / olderPriceStd : 0;

    return {
      liquidityDepth,
      liquidityRatio,
      bidAskSpread,
      spreadTrend,
    };
  }

  /**
   * Extract gas price features
   */
  private extractGasFeatures(
    history: PriceDataPoint[]
  ): Pick<MarketFeatures, 'gasPricePercentile' | 'gasTrend'> {
    const gasPrices = history.filter((p) => p.gasPrice !== undefined).map((p) => p.gasPrice!);

    if (gasPrices.length === 0) {
      return { gasPricePercentile: 0.5, gasTrend: 0 };
    }

    const currentGas = gasPrices[gasPrices.length - 1];
    const sortedGas = [...gasPrices].sort((a, b) => a - b);
    const percentile = sortedGas.indexOf(currentGas) / sortedGas.length;

    // Gas trend: compare recent avg to older avg
    const recentGas = gasPrices.slice(-10);
    const olderGas = gasPrices.slice(-20, -10);
    const recentAvg = recentGas.reduce((a, b) => a + b, 0) / recentGas.length;
    const olderAvg =
      olderGas.length > 0 ? olderGas.reduce((a, b) => a + b, 0) / olderGas.length : recentAvg;
    const gasTrend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

    return {
      gasPricePercentile: percentile,
      gasTrend,
    };
  }

  /**
   * Extract volatility features
   */
  private extractVolatilityFeatures(
    history: PriceDataPoint[]
  ): Pick<MarketFeatures, 'volatility' | 'atr'> {
    const prices = history.map((p) => p.price);
    const volatility = this.calculateVolatility(prices);
    const atr = this.calculateATR(history);

    return {
      volatility,
      atr,
    };
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = Math.log(prices[i] / prices[i - 1]);
      returns.push(ret);
    }

    return this.calculateStandardDeviation(returns);
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(history: PriceDataPoint[], period: number = 14): number {
    if (history.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < history.length; i++) {
      const high = history[i].price;
      const low = history[i].price * 0.99; // Simplified, would use actual high/low
      const prevClose = history[i - 1].price;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
  }

  /**
   * Extract time-based features
   */
  private extractTimeFeatures(timestamp: number): Pick<MarketFeatures, 'hourOfDay' | 'dayOfWeek'> {
    const date = new Date(timestamp);
    return {
      hourOfDay: date.getUTCHours(),
      dayOfWeek: date.getUTCDay(),
    };
  }

  /**
   * Extract MEV-related features
   */
  private extractMEVFeatures(
    mevRiskParams?: MEVRiskParams
  ): Pick<MarketFeatures, 'mempoolCongestion' | 'searcherDensity' | 'mevRiskScore'> {
    if (!mevRiskParams) {
      return {
        mempoolCongestion: undefined,
        searcherDensity: undefined,
        mevRiskScore: undefined,
      };
    }

    // Calculate composite MEV risk score
    const mevRiskScore =
      mevRiskParams.mempoolCongestion * 0.4 + mevRiskParams.searcherDensity * 0.6;

    return {
      mempoolCongestion: mevRiskParams.mempoolCongestion,
      searcherDensity: mevRiskParams.searcherDensity,
      mevRiskScore,
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Normalize features to [0, 1] range
   */
  private normalizeFeatures(features: MarketFeatures): MarketFeatures {
    return {
      ...features,
      priceMomentum5s: this.normalizeValue(features.priceMomentum5s, -0.1, 0.1),
      priceMomentum15s: this.normalizeValue(features.priceMomentum15s, -0.1, 0.1),
      priceMomentum30s: this.normalizeValue(features.priceMomentum30s, -0.1, 0.1),
      priceMomentum1m: this.normalizeValue(features.priceMomentum1m, -0.1, 0.1),
      priceMomentum5m: this.normalizeValue(features.priceMomentum5m, -0.2, 0.2),
      volumeRatio: this.normalizeValue(features.volumeRatio, 0.5, 2.0),
      liquidityRatio: this.normalizeValue(features.liquidityRatio, 0.8, 1.2),
      bidAskSpread: this.normalizeValue(features.bidAskSpread, 0, 0.01),
      spreadTrend: this.normalizeValue(features.spreadTrend, -0.5, 0.5),
      gasTrend: this.normalizeValue(features.gasTrend, -0.5, 0.5),
      volatility: this.normalizeValue(features.volatility, 0, 0.1),
      atr: this.normalizeValue(features.atr, 0, 100),
      hourOfDay: features.hourOfDay / 24,
      dayOfWeek: features.dayOfWeek / 7,
      // MEV features are already 0-1 normalized from sensors
      mempoolCongestion: features.mempoolCongestion,
      searcherDensity: features.searcherDensity,
      mevRiskScore: features.mevRiskScore,
    };
  }

  /**
   * Normalize a value to [0, 1] range
   */
  private normalizeValue(value: number, min: number, max: number): number {
    if (value <= min) return 0;
    if (value >= max) return 1;
    return (value - min) / (max - min);
  }

  /**
   * Calculate average liquidity across path
   */
  private calculateAverageLiquidity(path: ArbitragePath): number {
    const liquidities = path.hops
      .map((hop) => {
        const r0 = Number(hop.reserve0 || 0n);
        const r1 = Number(hop.reserve1 || 0n);
        return Math.sqrt(r0 * r1);
      })
      .filter((l) => l > 0);

    return liquidities.length > 0 ? liquidities.reduce((a, b) => a + b, 0) / liquidities.length : 0;
  }

  /**
   * Calculate minimum liquidity in path
   */
  private calculateMinLiquidity(path: ArbitragePath): number {
    const liquidities = path.hops
      .map((hop) => {
        const r0 = Number(hop.reserve0 || 0n);
        const r1 = Number(hop.reserve1 || 0n);
        return Math.sqrt(r0 * r1);
      })
      .filter((l) => l > 0);

    return liquidities.length > 0 ? Math.min(...liquidities) : 0;
  }

  /**
   * Calculate path complexity score
   */
  private calculatePathComplexity(path: ArbitragePath): number {
    // Higher complexity for more hops and higher fees
    const hopComplexity = path.hops.length / 5; // Normalized to max 5 hops
    const feeComplexity = path.totalFees / 0.05; // Normalized to max 5% fees
    return (hopComplexity + feeComplexity) / 2;
  }

  /**
   * Set feature importance scores
   */
  setFeatureImportance(importance: FeatureImportance[]): void {
    this.featureImportance.clear();
    importance.forEach((fi) => {
      this.featureImportance.set(fi.feature, fi.importance);
    });
  }

  /**
   * Get feature importance scores
   */
  getFeatureImportance(): FeatureImportance[] {
    return Array.from(this.featureImportance.entries())
      .map(([feature, importance], index) => ({
        feature,
        importance,
        rank: index + 1,
      }))
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Handle missing data
   */
  handleMissingData(features: Partial<MarketFeatures>): MarketFeatures {
    const defaultFeatures: MarketFeatures = {
      priceMomentum5s: 0,
      priceMomentum15s: 0,
      priceMomentum30s: 0,
      priceMomentum1m: 0,
      priceMomentum5m: 0,
      volumeMA: 0,
      volumeRatio: 1,
      vwap: 0,
      liquidityDepth: 0,
      liquidityRatio: 1,
      bidAskSpread: 0,
      spreadTrend: 0,
      gasPricePercentile: 0.5,
      gasTrend: 0,
      volatility: 0,
      atr: 0,
      hourOfDay: 0,
      dayOfWeek: 0,
      mempoolCongestion: undefined,
      searcherDensity: undefined,
      mevRiskScore: undefined,
    };

    return { ...defaultFeatures, ...features };
  }
}
