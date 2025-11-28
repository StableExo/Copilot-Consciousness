/**
 * ProfitabilityCalculator - Enhanced profitability calculations for multi-hop arbitrage
 *
 * Accounts for cumulative fees, slippage, and gas costs across all hops.
 * Enhanced version includes flash loan fees, detailed breakdowns, per-token-pair thresholds,
 * and gas cost conversions.
 */

import {
  ArbitragePath,
  ArbitrageHop,
  ProfitabilityResult,
  DetailedProfitBreakdown,
  FlashLoanConfig,
  ProfitThresholds,
  PriceOracle,
  FlashLoanProvider,
} from './types';

/**
 * Default profit thresholds for common token pairs
 * Values are in the borrow token's smallest unit
 * Pairs are alphabetically sorted (e.g., USDC/WETH not WETH/USDC)
 */
const DEFAULT_THRESHOLDS: ProfitThresholds = {
  'USDC/WETH': BigInt('50000000000000000000'), // 50 WETH (18 decimals)
  'USDT/WETH': BigInt('50000000000000000000'), // 50 WETH (18 decimals)
  'USDC/USDT': BigInt('5000000000'), // 5000 USDC (6 decimals)
  'WBTC/WETH': BigInt('100000000'), // 1 WBTC (8 decimals)
  DEFAULT: BigInt('10000000000000000000'), // 10 tokens (18 decimals default)
};

/**
 * Flash loan fee configurations
 */
const FLASH_LOAN_CONFIGS: { [key in FlashLoanProvider]: Omit<FlashLoanConfig, 'poolFee'> } = {
  aave: {
    provider: 'aave',
    feePercentage: 0.0009, // 0.09%
  },
  uniswapv3: {
    provider: 'uniswapv3',
    feePercentage: 0, // Fee comes from pool fee
  },
};

export class ProfitabilityCalculator {
  private gasPrice: bigint;
  private slippageTolerance: number;
  private priceOracle?: PriceOracle;
  private thresholds: ProfitThresholds;

  constructor(
    gasPrice: bigint,
    slippageTolerance: number = 0.01,
    priceOracle?: PriceOracle,
    customThresholds?: ProfitThresholds
  ) {
    this.gasPrice = gasPrice;
    this.slippageTolerance = slippageTolerance;
    this.priceOracle = priceOracle;
    // Merge custom thresholds with defaults
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  }

  /**
   * Calculate detailed profitability for an arbitrage path (backward compatible)
   */
  calculateProfitability(path: ArbitragePath): ProfitabilityResult {
    const totalFees = this.calculateTotalFees(path.hops);
    const totalGas = this.calculateTotalGas(path.hops);
    const slippageImpact = this.calculateSlippageImpact(path.hops);

    // Adjust profit for slippage
    const adjustedProfit = this.adjustForSlippage(path.estimatedProfit, slippageImpact);

    const netProfit = adjustedProfit > totalGas ? adjustedProfit - totalGas : BigInt(0);
    const startAmount = path.hops[0].amountIn;

    // Calculate ROI as percentage
    const roi =
      startAmount > BigInt(0) ? Number((netProfit * BigInt(10000)) / startAmount) / 100 : 0;

    return {
      profitable: netProfit > BigInt(0),
      estimatedProfit: adjustedProfit,
      totalFees,
      totalGas,
      netProfit,
      roi,
      slippageImpact,
    };
  }

  /**
   * Calculate detailed profitability with full breakdown including flash loan fees
   * @param path Arbitrage path
   * @param borrowToken Token being borrowed (address or symbol)
   * @param borrowTokenDecimals Decimals of the borrow token
   * @param flashLoanConfig Flash loan configuration (optional, defaults to Aave)
   * @returns Detailed profitability result with breakdown
   */
  async calculateDetailedProfitability(
    path: ArbitragePath,
    borrowToken: string,
    borrowTokenDecimals: number,
    flashLoanConfig?: FlashLoanConfig
  ): Promise<ProfitabilityResult> {
    const config = flashLoanConfig || {
      ...FLASH_LOAN_CONFIGS.aave,
      poolFee: undefined,
    };

    const breakdown = await this.createDetailedBreakdown(
      path,
      borrowToken,
      borrowTokenDecimals,
      config
    );

    // Get threshold for this token pair
    const threshold = this.getThresholdForPair(borrowToken, path.endToken);
    const meetsThreshold = breakdown.netProfit >= threshold;

    return {
      profitable: breakdown.profitable,
      estimatedProfit: breakdown.grossProfit,
      totalFees: breakdown.totalFees,
      totalGas: breakdown.gasCostInToken,
      netProfit: breakdown.netProfit,
      roi: breakdown.roi,
      slippageImpact: this.calculateSlippageImpact(path.hops),
      breakdown,
      meetsThreshold,
    };
  }

  /**
   * Create detailed profit breakdown with all cost components
   */
  async createDetailedBreakdown(
    path: ArbitragePath,
    borrowToken: string,
    borrowTokenDecimals: number,
    flashLoanConfig: FlashLoanConfig
  ): Promise<DetailedProfitBreakdown> {
    const initialAmount = path.hops[0].amountIn;
    const finalAmount = path.hops[path.hops.length - 1].amountOut;
    const grossProfit = finalAmount > initialAmount ? finalAmount - initialAmount : BigInt(0);

    // Calculate flash loan fee
    const flashLoanFee = this.calculateFlashLoanFee(initialAmount, flashLoanConfig);

    // Calculate swap fees (for informational purposes - already deducted in swap outputs)
    const swapFees = this.calculateSwapFees(path.hops);

    // Total fees (flash loan fee is the only additional fee; swap fees already deducted)
    const totalFees = flashLoanFee + swapFees;

    // Calculate gas costs
    const gasCostWei = this.calculateTotalGas(path.hops);
    const gasCostInETH = gasCostWei;

    // Convert gas cost to borrow token denomination
    let gasCostInToken = BigInt(0);
    if (this.priceOracle) {
      gasCostInToken = await this.priceOracle.convertTokenAmount(
        'ETH',
        borrowToken,
        gasCostWei,
        18, // ETH has 18 decimals
        borrowTokenDecimals
      );
    } else {
      // Fallback: assume 1 ETH = 3000 USD, 1 USDC = 1 USD
      // Convert wei to ETH, then to USD, then to token units
      // This is a simplified fallback when no oracle is available
      // NOTE: The ETH price ($3000) is hardcoded and may need periodic updates
      // for accuracy. Consider providing a price oracle for production use.
      // gasCostInToken = (gasCostWei / 10^18) * 3000 * (10^borrowTokenDecimals)
      // Simplified: gasCostInToken ≈ gasCostWei * 3000 / (10^18)
      // For 6-decimal tokens like USDC: gasCostWei * 3000 / 10^12
      const ethToUsd = BigInt(3000);
      const weiToToken = (gasCostWei * ethToUsd) / BigInt(10 ** (18 - borrowTokenDecimals));
      gasCostInToken = weiToToken;
    }

    // Net profit after all costs
    // Note: swap fees are already reflected in finalAmount, so we only subtract flash loan fee and gas
    const netProfit =
      grossProfit > flashLoanFee + gasCostInToken
        ? grossProfit - flashLoanFee - gasCostInToken
        : BigInt(0);

    // Convert net profit to native currency (ETH)
    let netProfitNative = BigInt(0);
    if (this.priceOracle && netProfit > BigInt(0)) {
      netProfitNative = await this.priceOracle.convertTokenAmount(
        borrowToken,
        'ETH',
        netProfit,
        borrowTokenDecimals,
        18
      );
    }

    // Convert net profit to USD
    let netProfitUSD = BigInt(0);
    if (this.priceOracle && netProfit > BigInt(0)) {
      const tokenPriceUSD = await this.priceOracle.getTokenPriceUSD(borrowToken);
      // netProfitUSD = netProfit * tokenPriceUSD / (10^borrowTokenDecimals)
      netProfitUSD = (netProfit * tokenPriceUSD) / BigInt(10 ** borrowTokenDecimals);
    }

    // Calculate profit percentage and ROI
    // Note: profitPercentage and roi are the same value - both represent
    // the percentage return on the initial investment
    const profitPercentage =
      initialAmount > BigInt(0) ? Number((netProfit * BigInt(10000)) / initialAmount) / 100 : 0;

    const roi = profitPercentage; // ROI and profit percentage are identical

    // Check if meets threshold
    const threshold = this.getThresholdForPair(borrowToken, path.endToken);
    const meetsThreshold = netProfit >= threshold;

    return {
      initialAmount,
      finalAmount,
      grossProfit,
      flashLoanFee,
      swapFees,
      totalFees,
      gasCostWei,
      gasCostInToken,
      gasCostInETH,
      netProfit,
      netProfitNative,
      netProfitUSD,
      profitPercentage,
      roi,
      meetsThreshold,
      profitable: netProfit > BigInt(0),
    };
  }

  /**
   * Calculate flash loan fee based on provider configuration
   * @param borrowAmount Amount being borrowed
   * @param config Flash loan configuration
   * @returns Flash loan fee in same denomination as borrow amount
   */
  calculateFlashLoanFee(borrowAmount: bigint, config: FlashLoanConfig): bigint {
    if (config.provider === 'aave') {
      // Aave charges 0.09% fee
      // fee = borrowAmount * 0.0009 = borrowAmount * 9 / 10000
      return (borrowAmount * BigInt(9)) / BigInt(10000);
    } else if (config.provider === 'uniswapv3') {
      // UniswapV3 uses pool fee
      if (config.poolFee !== undefined) {
        // Convert pool fee to basis points (e.g., 0.003 = 30 basis points)
        const feeBasisPoints = BigInt(Math.floor(config.poolFee * 10000));
        return (borrowAmount * feeBasisPoints) / BigInt(10000);
      }
      return BigInt(0);
    }
    return BigInt(0);
  }

  /**
   * Calculate total swap fees across all hops
   */
  calculateSwapFees(hops: ArbitrageHop[]): bigint {
    let totalFees = BigInt(0);

    for (const hop of hops) {
      // Calculate fee for this hop
      // fee = amountIn * fee percentage
      const feeAmount = (hop.amountIn * BigInt(Math.floor(hop.fee * 10000))) / BigInt(10000);
      totalFees += feeAmount;
    }

    return totalFees;
  }

  /**
   * Get minimum profit threshold for a token pair
   * @param token1 First token (address or symbol)
   * @param token2 Second token (address or symbol)
   * @returns Minimum profit threshold in token1 units
   */
  getThresholdForPair(token1: string, token2: string): bigint {
    // Normalize token addresses/symbols
    const t1 = this.normalizeTokenSymbol(token1);
    const t2 = this.normalizeTokenSymbol(token2);

    // Create pair key (alphabetically sorted)
    const pair = [t1, t2].sort().join('/');

    // Return specific threshold or default
    return this.thresholds[pair] || this.thresholds['DEFAULT'] || BigInt(0);
  }

  /**
   * Update profit thresholds
   */
  updateThresholds(newThresholds: ProfitThresholds): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Normalize token to symbol for threshold lookup
   */
  private normalizeTokenSymbol(token: string): string {
    // Map of known addresses to symbols
    const addressToSymbol: { [key: string]: string } = {
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
      '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
    };

    const normalized = token.toLowerCase();
    return addressToSymbol[normalized] || token.toUpperCase();
  }

  /**
   * Calculate total fees across all hops (backward compatible)
   */
  private calculateTotalFees(hops: ArbitrageHop[]): bigint {
    return this.calculateSwapFees(hops);
  }

  /**
   * Calculate total gas cost
   */
  private calculateTotalGas(hops: ArbitrageHop[]): bigint {
    const totalGasUnits = hops.reduce((sum, hop) => sum + BigInt(hop.gasEstimate), BigInt(0));
    return totalGasUnits * this.gasPrice;
  }

  // Slippage calculation constants
  // These caps prevent unrealistic slippage values from filtering out all paths
  // Particularly important for V3 pools where reserve0 is liquidity (L), not actual reserves
  private static readonly MAX_SLIPPAGE_PER_HOP = 0.1; // 10% max per hop
  private static readonly MAX_TOTAL_SLIPPAGE = 0.2; // 20% max total
  private static readonly DEFAULT_HOP_SLIPPAGE = 0.001; // 0.1% fallback

  /**
   * Calculate cumulative slippage impact across hops
   */
  private calculateSlippageImpact(hops: ArbitrageHop[]): number {
    // Slippage compounds across hops
    let cumulativeSlippage = 0;

    for (const hop of hops) {
      let hopSlippage: number;

      // Calculate slippage based on reserves if available
      if (hop.reserve0 && hop.reserve0 > BigInt(0)) {
        // Price impact = amountIn / reserve0
        // This is a simplified model; more sophisticated models exist
        const impact = Number((hop.amountIn * BigInt(10000)) / hop.reserve0) / 10000;
        // Cap individual hop slippage to prevent unrealistic values
        // This is especially important for V3 pools where reserve0 is liquidity (L),
        // not actual token reserves, which can produce exaggerated impact values
        hopSlippage = Math.min(impact, ProfitabilityCalculator.MAX_SLIPPAGE_PER_HOP);
      } else {
        // Fallback to base slippage if reserves not available
        hopSlippage = ProfitabilityCalculator.DEFAULT_HOP_SLIPPAGE;
      }

      // Compound slippage across hops
      cumulativeSlippage = cumulativeSlippage + hopSlippage + cumulativeSlippage * hopSlippage;
    }

    // Cap total slippage to ensure reasonable profit calculations
    return Math.min(cumulativeSlippage, ProfitabilityCalculator.MAX_TOTAL_SLIPPAGE);
  }

  /**
   * Adjust profit estimate for slippage
   */
  private adjustForSlippage(profit: bigint, slippageImpact: number): bigint {
    const slippageMultiplier = BigInt(Math.floor((1 - slippageImpact) * 10000));
    return (profit * slippageMultiplier) / BigInt(10000);
  }

  /**
   * Calculate price impact for a specific hop
   */
  calculatePriceImpact(amountIn: bigint, reserve0: bigint, _reserve1: bigint): number {
    if (reserve0 === BigInt(0)) {
      return 1.0; // 100% impact if no liquidity
    }

    const impact = Number((amountIn * BigInt(10000)) / reserve0) / 10000;
    return Math.min(impact, 1.0);
  }

  /**
   * Check if path meets minimum profitability criteria
   */
  isProfitable(path: ArbitragePath, minProfitThreshold: bigint): boolean {
    const result = this.calculateProfitability(path);
    return result.profitable && result.netProfit >= minProfitThreshold;
  }

  /**
   * Compare two paths and return the more profitable one
   */
  comparePathProfitability(path1: ArbitragePath, path2: ArbitragePath): ArbitragePath {
    const profit1 = this.calculateProfitability(path1);
    const profit2 = this.calculateProfitability(path2);

    return profit1.netProfit > profit2.netProfit ? path1 : path2;
  }

  /**
   * Update gas price for calculations
   */
  updateGasPrice(newGasPrice: bigint): void {
    this.gasPrice = newGasPrice;
  }

  /**
   * Get current gas price
   */
  getGasPrice(): bigint {
    return this.gasPrice;
  }

  /**
   * Set price oracle
   */
  setPriceOracle(oracle: PriceOracle): void {
    this.priceOracle = oracle;
  }

  /**
   * Get price oracle
   */
  getPriceOracle(): PriceOracle | undefined {
    return this.priceOracle;
  }
}
