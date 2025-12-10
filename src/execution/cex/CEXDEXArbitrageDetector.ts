/**
 * CEX-DEX Arbitrage Detector
 * 
 * Detects arbitrage opportunities between centralized exchanges (CEX) 
 * and decentralized exchanges (DEX) by comparing prices in real-time.
 * 
 * Strategy:
 * 1. Monitor CEX prices via WebSocket (BTC/USDT, ETH/USDT, etc.)
 * 2. Compare with DEX prices from existing pool data
 * 3. Calculate profit potential after fees (CEX + DEX + gas)
 * 4. Generate ArbitrageOpportunity objects for profitable spreads
 * 
 * Financial Model:
 * - Buy on cheaper venue, sell on expensive venue
 * - Account for: CEX trading fees, DEX swap fees, gas costs, slippage
 * - Minimum profitability threshold to filter noise
 */

import {
  CEXLiquidityMonitor,
  CEXExchange,
  LiquiditySnapshot,
  OrderBook,
  CEXDEXArbitrage,
} from './types.js';
import { ArbitrageOpportunity, ArbitrageType, OpportunityStatus } from '../../arbitrage/models/ArbitrageOpportunity.js';
import { PathStep } from '../../arbitrage/models/PathStep.js';

/**
 * DEX price data (from existing pool monitoring)
 */
export interface DEXPriceData {
  symbol: string;
  dex: string;
  price: string;
  liquidity: string;
  pool: string;
  timestamp: number;
}

/**
 * Configuration for CEX-DEX arbitrage detection
 */
export interface CEXDEXArbitrageConfig {
  // Minimum price difference to consider (percentage)
  minPriceDiffPercent: number;
  
  // Maximum trade size (USD)
  maxTradeSizeUsd: number;
  
  // Exchange-specific trading fees (percentage)
  cexFees: Partial<Record<CEXExchange, number>>;
  
  // DEX swap fee (percentage, default 0.3% for Uniswap)
  dexSwapFeePercent: number;
  
  // Estimated gas cost per transaction (USD)
  gasEstimateUsd: number;
  
  // Slippage tolerance (percentage)
  slippagePercent: number;
  
  // Minimum net profit to execute (USD)
  minNetProfitUsd: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CEXDEXArbitrageConfig = {
  minPriceDiffPercent: 0.5, // 0.5% minimum spread
  maxTradeSizeUsd: 10000, // $10k max trade size
  cexFees: {
    [CEXExchange.BINANCE]: 0.1, // 0.1%
    [CEXExchange.COINBASE]: 0.6, // 0.6%
    [CEXExchange.OKX]: 0.1, // 0.1%
    [CEXExchange.BYBIT]: 0.1, // 0.1%
    [CEXExchange.KRAKEN]: 0.26, // 0.26%
  },
  dexSwapFeePercent: 0.3, // Uniswap standard fee
  gasEstimateUsd: 15, // ~$15 per transaction
  slippagePercent: 0.5, // 0.5% slippage tolerance
  minNetProfitUsd: 10, // $10 minimum profit after all fees
};

/**
 * CEX-DEX Arbitrage Detector
 * 
 * Monitors CEX and DEX prices simultaneously and generates arbitrage opportunities
 */
export class CEXDEXArbitrageDetector {
  private config: CEXDEXArbitrageConfig;
  private cexMonitor: CEXLiquidityMonitor | null = null;
  private dexPrices: Map<string, DEXPriceData> = new Map();
  private opportunities: CEXDEXArbitrage[] = [];
  
  // Callbacks
  private onOpportunityFound?: (opportunity: ArbitrageOpportunity) => void;
  
  constructor(
    config: Partial<CEXDEXArbitrageConfig> = {},
    callbacks?: {
      onOpportunityFound?: (opportunity: ArbitrageOpportunity) => void;
    }
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      cexFees: {
        ...DEFAULT_CONFIG.cexFees,
        ...(config.cexFees || {}),
      },
    };
    
    this.onOpportunityFound = callbacks?.onOpportunityFound;
  }
  
  /**
   * Initialize with CEX monitor
   */
  setCEXMonitor(monitor: CEXLiquidityMonitor): void {
    this.cexMonitor = monitor;
  }
  
  /**
   * Update DEX price data
   */
  updateDEXPrice(priceData: DEXPriceData): void {
    this.dexPrices.set(priceData.symbol, priceData);
  }
  
  /**
   * Update multiple DEX prices
   */
  updateDEXPrices(priceDataList: DEXPriceData[]): void {
    for (const priceData of priceDataList) {
      this.updateDEXPrice(priceData);
    }
  }
  
  /**
   * Detect arbitrage opportunities for a specific symbol
   */
  detectOpportunities(symbol: string): CEXDEXArbitrage[] {
    if (!this.cexMonitor) {
      console.warn('CEX monitor not initialized');
      return [];
    }
    
    const dexPrice = this.dexPrices.get(symbol);
    if (!dexPrice) {
      // No DEX price available for this symbol
      return [];
    }
    
    // Get CEX liquidity snapshot
    const snapshot = this.cexMonitor.getSnapshot(symbol);
    if (!snapshot) {
      // No CEX data available
      return [];
    }
    
    const opportunities: CEXDEXArbitrage[] = [];
    
    // Compare each CEX exchange with DEX
    for (const [exchangeKey, venueData] of Object.entries(snapshot.venues)) {
      const cexBid = parseFloat(venueData.bid); // Best CEX buy price
      const cexAsk = parseFloat(venueData.ask); // Best CEX sell price
      const dexPriceFloat = parseFloat(dexPrice.price);
      
      // Opportunity 1: Buy on DEX, sell on CEX (if CEX bid > DEX price)
      if (cexBid > dexPriceFloat) {
        const priceDiffPercent = ((cexBid - dexPriceFloat) / dexPriceFloat) * 100;
        
        if (priceDiffPercent >= this.config.minPriceDiffPercent) {
          const opportunity = this.calculateArbitrage(
            symbol,
            exchangeKey as CEXExchange,
            dexPrice.dex,
            dexPriceFloat,
            cexBid,
            'BUY_DEX_SELL_CEX',
            dexPrice.pool,
          );
          
          if (opportunity) {
            opportunities.push(opportunity);
            
            // Convert to ArbitrageOpportunity format and emit
            const arbOpp = this.convertToArbitrageOpportunity(opportunity);
            if (arbOpp && this.onOpportunityFound) {
              this.onOpportunityFound(arbOpp);
            }
          }
        }
      }
      
      // Opportunity 2: Buy on CEX, sell on DEX (if DEX price > CEX ask)
      if (dexPriceFloat > cexAsk) {
        const priceDiffPercent = ((dexPriceFloat - cexAsk) / cexAsk) * 100;
        
        if (priceDiffPercent >= this.config.minPriceDiffPercent) {
          const opportunity = this.calculateArbitrage(
            symbol,
            exchangeKey as CEXExchange,
            dexPrice.dex,
            cexAsk,
            dexPriceFloat,
            'BUY_CEX_SELL_DEX',
            dexPrice.pool,
          );
          
          if (opportunity) {
            opportunities.push(opportunity);
            
            // Convert and emit
            const arbOpp = this.convertToArbitrageOpportunity(opportunity);
            if (arbOpp && this.onOpportunityFound) {
              this.onOpportunityFound(arbOpp);
            }
          }
        }
      }
    }
    
    // Store opportunities
    this.opportunities = opportunities;
    
    return opportunities;
  }
  
  /**
   * Calculate detailed arbitrage opportunity with fees and profit
   */
  private calculateArbitrage(
    symbol: string,
    cexExchange: CEXExchange,
    dexName: string,
    buyPrice: number,
    sellPrice: number,
    direction: 'BUY_DEX_SELL_CEX' | 'BUY_CEX_SELL_DEX',
    dexPool: string,
  ): CEXDEXArbitrage | null {
    // Calculate trade size (limited by config and liquidity)
    const tradeSize = Math.min(
      this.config.maxTradeSizeUsd,
      // Add liquidity constraints here if needed
      this.config.maxTradeSizeUsd
    );
    
    // Calculate gross profit (before fees)
    const grossProfit = tradeSize * ((sellPrice - buyPrice) / buyPrice);
    const grossProfitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
    
    // Calculate fees
    const cexFee = (this.config.cexFees[cexExchange] || 0.1) / 100 * tradeSize;
    const dexFee = this.config.dexSwapFeePercent / 100 * tradeSize;
    const gasCost = this.config.gasEstimateUsd;
    const slippageCost = this.config.slippagePercent / 100 * tradeSize;
    
    const totalFees = cexFee + dexFee + gasCost + slippageCost;
    
    // Calculate net profit
    const netProfit = grossProfit - totalFees;
    const netProfitPercent = (netProfit / tradeSize) * 100;
    
    // Filter by minimum profit threshold
    if (netProfit < this.config.minNetProfitUsd) {
      return null;
    }
    
    // Create opportunity object
    const opportunity: CEXDEXArbitrage = {
      symbol,
      cexExchange,
      dexName,
      dexPool,
      direction,
      cexPrice: direction === 'BUY_DEX_SELL_CEX' ? sellPrice : buyPrice,
      dexPrice: direction === 'BUY_DEX_SELL_CEX' ? buyPrice : sellPrice,
      priceDiffPercent: Math.abs(grossProfitPercent),
      tradeSize,
      grossProfit,
      fees: {
        cexTradingFee: cexFee,
        dexSwapFee: dexFee,
        gasCost,
        slippage: slippageCost,
        total: totalFees,
      },
      netProfit,
      netProfitPercent,
      timestamp: Date.now(),
    };
    
    return opportunity;
  }
  
  /**
   * Convert CEXDEXArbitrage to ArbitrageOpportunity format
   */
  private convertToArbitrageOpportunity(
    cexdex: CEXDEXArbitrage
  ): ArbitrageOpportunity | null {
    // Generate unique opportunity ID
    const opportunityId = `cexdex-${cexdex.symbol}-${cexdex.cexExchange}-${cexdex.timestamp}`;
    
    // Create path steps
    const steps: PathStep[] = [];
    
    if (cexdex.direction === 'BUY_DEX_SELL_CEX') {
      // Step 1: Buy on DEX
      steps.push({
        type: 'swap',
        protocol: cexdex.dexName,
        tokenIn: 'USDT', // Assuming USDT as base
        tokenOut: cexdex.symbol.split('/')[0], // e.g., BTC from BTC/USDT
        amountIn: cexdex.tradeSize.toString(),
        pool: cexdex.dexPool,
        fee: cexdex.fees.dexSwapFee,
      } as PathStep);
      
      // Step 2: Sell on CEX (simulated as swap)
      steps.push({
        type: 'swap',
        protocol: `CEX-${cexdex.cexExchange}`,
        tokenIn: cexdex.symbol.split('/')[0],
        tokenOut: 'USDT',
        amountIn: cexdex.tradeSize.toString(),
        pool: `${cexdex.cexExchange}-${cexdex.symbol}`,
        fee: cexdex.fees.cexTradingFee,
      } as PathStep);
    } else {
      // Step 1: Buy on CEX
      steps.push({
        type: 'swap',
        protocol: `CEX-${cexdex.cexExchange}`,
        tokenIn: 'USDT',
        tokenOut: cexdex.symbol.split('/')[0],
        amountIn: cexdex.tradeSize.toString(),
        pool: `${cexdex.cexExchange}-${cexdex.symbol}`,
        fee: cexdex.fees.cexTradingFee,
      } as PathStep);
      
      // Step 2: Sell on DEX
      steps.push({
        type: 'swap',
        protocol: cexdex.dexName,
        tokenIn: cexdex.symbol.split('/')[0],
        tokenOut: 'USDT',
        amountIn: cexdex.tradeSize.toString(),
        pool: cexdex.dexPool,
        fee: cexdex.fees.dexSwapFee,
      } as PathStep);
    }
    
    // Create ArbitrageOpportunity
    const opportunity: ArbitrageOpportunity = {
      opportunityId,
      arbType: ArbitrageType.SPATIAL, // CEX-DEX is spatial arbitrage
      timestamp: new Date(cexdex.timestamp),
      status: OpportunityStatus.IDENTIFIED,
      
      path: steps,
      tokenAddresses: [], // Will be populated during execution
      poolAddresses: [cexdex.dexPool],
      protocols: [cexdex.dexName, `CEX-${cexdex.cexExchange}`],
      
      inputAmount: cexdex.tradeSize,
      expectedOutput: cexdex.tradeSize + cexdex.grossProfit,
      grossProfit: cexdex.grossProfit,
      profitBps: Math.round(cexdex.netProfitPercent * 100), // Convert to basis points
      
      requiresFlashLoan: false, // CEX-DEX typically doesn't need flash loans
      
      estimatedGas: Math.round(this.config.gasEstimateUsd / 0.00000001), // Estimate gas units
      gasPriceGwei: 20, // Placeholder
      gasCostUsd: this.config.gasEstimateUsd,
      
      netProfit: cexdex.netProfit,
      netProfitMargin: cexdex.netProfitPercent / 100,
      
      metadata: {
        cexExchange: cexdex.cexExchange,
        dexName: cexdex.dexName,
        direction: cexdex.direction,
        cexPrice: cexdex.cexPrice,
        dexPrice: cexdex.dexPrice,
        fees: cexdex.fees,
      },
    };
    
    return opportunity;
  }
  
  /**
   * Get all detected opportunities
   */
  getOpportunities(): CEXDEXArbitrage[] {
    return this.opportunities;
  }
  
  /**
   * Get configuration
   */
  getConfig(): CEXDEXArbitrageConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<CEXDEXArbitrageConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      cexFees: {
        ...this.config.cexFees,
        ...(config.cexFees || {}),
      },
    };
  }
  
  /**
   * Clear stored opportunities
   */
  clearOpportunities(): void {
    this.opportunities = [];
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalOpportunities: number;
    totalPotentialProfit: number;
    avgNetProfitPercent: number;
    symbols: string[];
  } {
    const total = this.opportunities.length;
    const totalProfit = this.opportunities.reduce((sum, opp) => sum + opp.netProfit, 0);
    const avgProfitPercent = total > 0
      ? this.opportunities.reduce((sum, opp) => sum + opp.netProfitPercent, 0) / total
      : 0;
    const symbols = [...new Set(this.opportunities.map(opp => opp.symbol))];
    
    return {
      totalOpportunities: total,
      totalPotentialProfit: totalProfit,
      avgNetProfitPercent: avgProfitPercent,
      symbols,
    };
  }
}

/**
 * Export types
 */
export type { CEXDEXArbitrageConfig, DEXPriceData };
