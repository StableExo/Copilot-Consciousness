/**
 * Price Math Utilities
 * 
 * Integrated from AxionCitadel - Production-tested price calculation utilities
 * for Uniswap V2/V3, SushiSwap, and DODO protocols.
 * 
 * Provides utilities for:
 * - Spot price calculations across different DEX types
 * - Token amount conversions
 * - Slippage calculations
 * - Uniswap V3 tick math
 */

import { ethers, formatUnits } from 'ethers';
import { logger } from '../logger';

// Constants for price calculations
export const PRICE_SCALE_DECIMALS = 18;
export const PRICE_SCALE = 10n ** BigInt(PRICE_SCALE_DECIMALS);
export const TEN_THOUSAND = 10000n;
export const Q96 = 2n ** 96n;
export const Q192 = Q96 * Q96;
export const MIN_SQRT_RATIO = 4295128739n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface PoolState {
  address: string;
  token0: TokenInfo;
  token1: TokenInfo;
  sqrtPriceX96?: bigint;
  reserve0?: bigint;
  reserve1?: bigint;
}

/**
 * Calculates the minimum amount out based on slippage tolerance
 */
export function calculateMinAmountOut(
  amountOut: bigint | null | undefined,
  slippageToleranceBps: number
): bigint {
  const logPrefix = '[PriceMath calculateMinAmountOut]';

  if (
    amountOut === null ||
    amountOut === undefined ||
    typeof amountOut !== 'bigint' ||
    amountOut <= 0n
  ) {
    logger.warn(`${logPrefix} Invalid input: amountOut=${amountOut}. Returning 0n.`);
    return 0n;
  }

  if (
    typeof slippageToleranceBps !== 'number' ||
    slippageToleranceBps < 0 ||
    isNaN(slippageToleranceBps)
  ) {
    logger.warn(
      `${logPrefix} Invalid slippageToleranceBps: ${slippageToleranceBps}. Using 0 BPS.`
    );
    slippageToleranceBps = 0;
  }

  const BPS_DIVISOR = 10000n;
  const slippageFactor = BPS_DIVISOR - BigInt(Math.floor(slippageToleranceBps));

  if (slippageFactor < 0n) {
    logger.warn(
      `${logPrefix} Slippage tolerance ${slippageToleranceBps} > 10000 BPS. Returning 0n.`
    );
    return 0n;
  }

  return (amountOut * slippageFactor) / BPS_DIVISOR;
}

/**
 * Calculates price for Uniswap V3 pool
 * Returns "units of token1 per 1 unit of token0" (T1/T0), scaled by PRICE_SCALE
 */
export function calculateV3PriceT0T1Scaled(poolState: PoolState): bigint | null {
  const logPrefix = '[PriceMath calculateV3PriceT0T1Scaled]';

  if (!poolState?.sqrtPriceX96 || BigInt(poolState.sqrtPriceX96) === 0n) {
    logger.warn(`${logPrefix} Invalid V3 state: Missing sqrtPriceX96. Pool: ${poolState?.address}`);
    return null;
  }

  if (
    typeof poolState.token0?.decimals !== 'number' ||
    typeof poolState.token1?.decimals !== 'number' ||
    poolState.token0.decimals < 0 ||
    poolState.token1.decimals < 0
  ) {
    logger.error(
      `${logPrefix} Invalid V3 state: Missing or invalid token decimals. Pool: ${poolState?.address}`
    );
    return null;
  }

  try {
    const sqrtPriceX96 = BigInt(poolState.sqrtPriceX96);
    const decimals0 = BigInt(poolState.token0.decimals);
    const decimals1 = BigInt(poolState.token1.decimals);
    const scale0 = 10n ** decimals0;
    const scale1 = 10n ** decimals1;

    const numerator = sqrtPriceX96 * sqrtPriceX96 * scale0 * PRICE_SCALE;
    const denominator = Q192 * scale1;

    if (denominator === 0n) {
      logger.error(`${logPrefix} Division by zero: V3 price denominator is zero. Pool: ${poolState.address}`);
      return null;
    }

    const priceT1PerT0Scaled = numerator / denominator;
    logger.debug(
      `${logPrefix} V3 Pool ${poolState.address?.substring(0, 6)} | Price (T1/T0 scaled): ${priceT1PerT0Scaled}`
    );
    return priceT1PerT0Scaled;
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error calculating V3 price for ${poolState.address}: ${error.message}`,
      error
    );
    return null;
  }
}

/**
 * Calculates price for Uniswap V2 / SushiSwap pool
 * Returns "units of token1 per 1 unit of token0" (T1/T0), scaled by PRICE_SCALE
 */
export function calculateV2PriceT0T1Scaled(poolState: PoolState): bigint | null {
  const logPrefix = '[PriceMath calculateV2PriceT0T1Scaled]';

  if (!poolState?.reserve0 || !poolState?.reserve1) {
    logger.warn(`${logPrefix} Invalid V2 state: Missing reserves. Pool: ${poolState?.address}`);
    return null;
  }

  if (BigInt(poolState.reserve0) === 0n) {
    logger.debug(`${logPrefix} Invalid V2 state: Zero reserve0. Pool: ${poolState?.address}`);
    return null;
  }

  if (
    typeof poolState.token0?.decimals !== 'number' ||
    typeof poolState.token1?.decimals !== 'number' ||
    poolState.token0.decimals < 0 ||
    poolState.token1.decimals < 0
  ) {
    logger.error(
      `${logPrefix} Invalid V2 state: Missing or invalid token decimals. Pool: ${poolState?.address}`
    );
    return null;
  }

  try {
    const reserve0 = BigInt(poolState.reserve0);
    const reserve1 = BigInt(poolState.reserve1);
    const decimals0 = BigInt(poolState.token0.decimals);
    const decimals1 = BigInt(poolState.token1.decimals);
    const scale0 = 10n ** decimals0;
    const scale1 = 10n ** decimals1;

    const numerator = reserve1 * scale0 * PRICE_SCALE;
    const denominator = reserve0 * scale1;

    if (denominator === 0n) {
      logger.error(`${logPrefix} Division by zero: V2 price denominator is zero. Pool: ${poolState.address}`);
      return null;
    }

    const priceT1PerT0Scaled = numerator / denominator;
    logger.debug(
      `${logPrefix} V2 Pool ${poolState.address?.substring(0, 6)} | Price (T1/T0 scaled): ${priceT1PerT0Scaled}`
    );
    return priceT1PerT0Scaled;
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error calculating V2 price for ${poolState.address}: ${error.message}`
    );
    return null;
  }
}

/**
 * Converts token amount to native currency (ETH/WETH) equivalent
 * Uses mock prices for common tokens
 */
export async function convertToNativeWei(
  amountWei: bigint,
  tokenObject: TokenInfo,
  nativeCurrencyToken: TokenInfo
): Promise<bigint> {
  const logPrefix = '[PriceMath convertToNativeWei Mock]';

  if (!tokenObject?.address || tokenObject.decimals === undefined) {
    const errorMsg = 'Invalid token object for native conversion mock.';
    logger.error(`${logPrefix} ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const amountWeiBigInt = BigInt(amountWei || 0n);
  if (amountWeiBigInt === 0n) {
    logger.debug(`${logPrefix} Received zero amountWei for ${tokenObject.symbol}, returning 0n.`);
    return 0n;
  }

  if (!nativeCurrencyToken || nativeCurrencyToken.decimals === undefined) {
    const errorMsg = 'Native currency token object is not provided or invalid.';
    logger.error(`${logPrefix} CRITICAL: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (
    nativeCurrencyToken.address &&
    tokenObject.address.toLowerCase() === nativeCurrencyToken.address.toLowerCase()
  ) {
    logger.debug(`${logPrefix} Token ${tokenObject.symbol} is native, returning amount directly.`);
    return amountWeiBigInt;
  }

  let mockPriceStandardRatioTokenNativeScaled = 0n;
  const isNativeWeth =
    nativeCurrencyToken.symbol === 'WETH' ||
    (nativeCurrencyToken.address &&
      nativeCurrencyToken.address.toLowerCase() === '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'.toLowerCase());

  if (!isNativeWeth) {
    logger.warn(
      `${logPrefix} Native currency is ${nativeCurrencyToken.symbol}. Mock price conversion assumes WETH/ETH as base.`
    );
  }

  // Mock price ratios
  if (['USDC', 'USDC.e', 'USDT', 'DAI', 'FRAX'].includes(tokenObject.symbol)) {
    mockPriceStandardRatioTokenNativeScaled = PRICE_SCALE / 1850n; // 1 WETH = 1850 USDC
  } else if (tokenObject.symbol === 'WBTC') {
    mockPriceStandardRatioTokenNativeScaled = 50n * PRICE_SCALE; // 1 WBTC = 50 WETH
  } else {
    mockPriceStandardRatioTokenNativeScaled = 1n * PRICE_SCALE; // Default 1:1
  }

  if (mockPriceStandardRatioTokenNativeScaled <= 0n) {
    const errorMsg = `Mock scaled price for ${tokenObject.symbol}/${nativeCurrencyToken.symbol} is 0 or negative.`;
    logger.warn(`${logPrefix} ${errorMsg}`);
    return 0n;
  }

  const tokenDecimals = BigInt(tokenObject.decimals);
  const nativeDecimals = BigInt(nativeCurrencyToken.decimals);
  const numerator = amountWeiBigInt * mockPriceStandardRatioTokenNativeScaled * 10n ** nativeDecimals;
  const denominator = PRICE_SCALE * 10n ** tokenDecimals;

  if (denominator === 0n) {
    const errorMsg = `Division by zero during conversion math for ${tokenObject.symbol}.`;
    logger.error(`${logPrefix} CRITICAL: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const amountNativeWei = numerator / denominator;
  logger.debug(
    `${logPrefix} Converted ${formatUnits(amountWeiBigInt, tokenObject.decimals)} ${tokenObject.symbol} to ${formatUnits(amountNativeWei, nativeCurrencyToken.decimals)} ${nativeCurrencyToken.symbol}`
  );
  return amountNativeWei;
}

/**
 * Gets sqrt ratio at a specific tick (Uniswap V3)
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error(`TICK_OUT_OF_RANGE: ${tick}`);
  }

  if (tick === 0) {
    return Q96;
  }

  const absTick = Math.abs(tick);
  let ratio = 1n << 256n;

  if ((absTick & 0x1) !== 0) ratio = (ratio * 0xfffcb95727207070n) >> 128n;
  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d4000n) >> 128n;
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932n) >> 128n;
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7efa3f90n) >> 128n;
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6155n) >> 128n;
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081n) >> 128n;
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ec18466efffebn) >> 128n;
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee045a79f282n) >> 128n;
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c75d6d4281n) >> 128n;
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac41313n) >> 128n;
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf30eebe9f9a0adaan) >> 128n;
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a21d0312n) >> 128n;
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022ebn) >> 128n;
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdfn) >> 128n;
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2b38an) >> 128n;
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd6n) >> 128n;
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1en) >> 128n;
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d67f34ff51fa63fn) >> 128n;
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea9n) >> 128n;
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc49n) >> 128n;

  if (tick > 0) {
    ratio = ratio >> 32n;
  } else {
    if (ratio === 0n) throw new Error('RATIO_IS_ZERO_INVERT_FAIL');
    ratio = ((1n << 256n) / ratio) >> 32n;
  }

  if (ratio < MIN_SQRT_RATIO) ratio = MIN_SQRT_RATIO;
  if (ratio > MAX_SQRT_RATIO) ratio = MAX_SQRT_RATIO;
  return ratio;
}
