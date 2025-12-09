/**
 * CoinMarketCap API Integration
 * 
 * Unified API client for both CEX and DEX market data
 * 
 * @example
 * ```typescript
 * import { CoinMarketCapClient, CMCApiTier } from './execution/coinmarketcap';
 * 
 * const client = new CoinMarketCapClient({
 *   apiKey: process.env.COINMARKETCAP_API_KEY!,
 *   tier: CMCApiTier.FREE,
 * });
 * 
 * // Get CEX data
 * const binanceQuotes = await client.getCEXExchangeQuotes({
 *   slug: ['binance', 'coinbase', 'kraken'],
 *   convert: 'USD',
 * });
 * 
 * // Get DEX data
 * const dexQuotes = await client.getDEXPairsLatest({
 *   pairs: ['uniswap-v3:eth-usdt', 'pancakeswap-v3:bnb-usdt'],
 *   convert: 'USD',
 * });
 * ```
 */

export { CoinMarketCapClient } from './CoinMarketCapClient';
export * from './types';
