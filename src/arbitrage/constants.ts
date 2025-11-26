/**
 * Arbitrage system constants
 *
 * Shared constants for liquidity calculations, fee tiers, and protocol handling
 */

/**
 * Uniswap V3 standard fee tiers in basis points
 * Order: Sorted by typical liquidity (highest to lowest)
 *
 * - 3000 (0.3%): Most liquid tier, default for most pairs (ETH/USDC, etc.)
 * - 500 (0.05%): Common for correlated assets (ETH/stETH, WBTC/renBTC)
 * - 10000 (1%): Exotic or volatile pairs
 * - 100 (0.01%): Best for stablecoin pairs (USDC/DAI, USDT/USDC)
 */
export const UNISWAP_V3_FEE_TIERS = [3000, 500, 10000, 100] as const;

/**
 * Scale factor for V3 liquidity threshold comparison
 *
 * V3 liquidity (L) represents sqrt(x * y) where x and y are token reserves.
 * V2 reserves represent actual token amounts directly.
 *
 * Mathematical basis:
 * - V2: Reserve values are in wei (e.g., 1000 ETH = 1000 * 10^18)
 * - V3: L = sqrt(x * y), where x and y are token amounts in wei
 *
 * Example calculation:
 * - Pool with 1000 ETH (10^21 wei) and 3M USDC (3 * 10^24 wei assuming 18 decimals)
 * - V2 reserves: x = 10^21, y = 3 * 10^24
 * - V3 liquidity: L = sqrt(10^21 * 3*10^24) = sqrt(3 * 10^45) ≈ 1.7 * 10^22.5 ≈ 5.5 * 10^22
 *
 * Empirical validation from Base network WETH/USDC pools:
 * - V3 liquidity values: 6.2 * 10^15 to 4.6 * 10^18
 * - Equivalent V2 reserves: 10^20 to 10^26 range
 * - Observed ratio: ~10^6 difference on average
 *
 * Usage:
 * ```typescript
 * const v3Threshold = v2Threshold / BigInt(V3_LIQUIDITY_SCALE_FACTOR);
 * ```
 */
export const V3_LIQUIDITY_SCALE_FACTOR = 1000000;

/**
 * Protocols that use V3-style concentrated liquidity (L = sqrt(x*y))
 * Includes both naming conventions for compatibility
 */
export const V3_STYLE_PROTOCOLS = [
  'UniswapV3', // DEXRegistry naming
  'uniswap_v3', // Legacy test naming
  'Aerodrome', // DEXRegistry naming
  'aerodrome', // Legacy naming
  'PancakeSwapV3', // PancakeSwap V3 concentrated liquidity
  'pancakeswapv3', // Legacy naming
  'Velodrome', // Velodrome Slipstream concentrated liquidity
  'velodrome', // Legacy naming
  'VelodromeV2', // Velodrome V2 on Optimism - concentrated liquidity
  'velodromev2', // Legacy naming
  'MaverickV2', // Maverick V2 dynamic distribution AMM
  'maverickv2', // Legacy naming
  'AlienBase', // AlienBase (Uniswap V3 fork)
  'alienbase', // Legacy naming
  'SushiSwapV3', // SushiSwap V3 concentrated liquidity
  'sushiswapv3', // Legacy naming
  'KyberSwapV3', // KyberSwap Elastic (V3-style)
  'kyberswapv3', // Legacy naming
  'DODOV3', // DODO V3 Proactive Market Maker
  'dodov3', // Legacy naming
  'CamelotV3', // Camelot V3 on Arbitrum
  'camelotv3', // Legacy naming
  'TraderJoeV3', // Trader Joe V3 Liquidity Book
  'traderjoeV3', // Legacy naming
  'ZyberSwap', // ZyberSwap on Arbitrum (V3-style)
  'zyberswap', // Legacy naming
  'Ramses', // Ramses Exchange (Solidly V2 with concentrated liquidity)
  'ramses', // Legacy naming
] as const;

/**
 * Type representing V3-style protocol names
 */
export type V3StyleProtocol = (typeof V3_STYLE_PROTOCOLS)[number];

/**
 * Check if a protocol uses V3-style concentrated liquidity
 * Handles both 'UniswapV3' and 'uniswap_v3' naming conventions
 * @param protocol The protocol identifier string
 * @returns true if protocol uses V3-style liquidity (L = sqrt(x*y))
 */
export function isV3StyleProtocol(protocol: string): protocol is V3StyleProtocol {
  // Normalize comparison by converting to lowercase
  const normalized = protocol.toLowerCase().replace('_', '');
  return V3_STYLE_PROTOCOLS.some((p) => p.toLowerCase().replace('_', '') === normalized);
}
