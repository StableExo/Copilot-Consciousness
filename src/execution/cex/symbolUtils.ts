/**
 * CEX Symbol Utilities
 * 
 * Common utilities for symbol format conversion across exchanges.
 */

/**
 * Common quote currencies used across exchanges
 */
export const COMMON_QUOTE_CURRENCIES = [
  'USDT',
  'USDC',
  'USD',
  'BUSD',
  'DAI',
  'BTC',
  'ETH',
  'BNB',
  'EUR',
  'GBP',
  'JPY',
  'KRW',
] as const;

/**
 * Parse a symbol to extract base and quote currencies
 * Works for symbols without separators (e.g., "BTCUSDT")
 */
export function parseSymbol(symbol: string): { base: string; quote: string } | null {
  for (const quote of COMMON_QUOTE_CURRENCIES) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      if (base.length > 0) {
        return { base, quote };
      }
    }
  }
  return null;
}

/**
 * Format a symbol to standard format (BASE/QUOTE)
 */
export function formatToStandardSymbol(symbol: string): string {
  const parsed = parseSymbol(symbol);
  if (parsed) {
    return `${parsed.base}/${parsed.quote}`;
  }
  return symbol;
}

/**
 * Remove common separators from symbol
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.replace(/[\/\-_]/g, '');
}
