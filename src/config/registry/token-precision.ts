/**
 * Token Precision Handler
 *
 * Manages token decimal handling across different chains and tokens.
 * Prevents precision loss and overflow issues in calculations.
 */

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
}

/**
 * TokenPrecisionManager handles decimal conversions for tokens
 */
export class TokenPrecisionManager {
  private tokens: Map<string, TokenInfo>;

  constructor() {
    this.tokens = new Map();
  }

  /**
   * Register token information
   */
  register(token: TokenInfo): void {
    const key = this.getKey(token.address, token.chainId);
    this.tokens.set(key, token);
  }

  /**
   * Get token info
   */
  get(address: string, chainId: number): TokenInfo | undefined {
    const key = this.getKey(address, chainId);
    return this.tokens.get(key);
  }

  /**
   * Get token decimals
   */
  getDecimals(address: string, chainId: number): number {
    const token = this.get(address, chainId);
    return token ? token.decimals : 18; // Default to 18 if not found
  }

  /**
   * Convert human-readable amount to token units
   */
  toTokenUnits(amount: string, address: string, chainId: number): bigint {
    const decimals = this.getDecimals(address, chainId);
    const [integer, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integer + paddedFraction);
  }

  /**
   * Convert token units to human-readable amount
   */
  fromTokenUnits(units: bigint, address: string, chainId: number): string {
    const decimals = this.getDecimals(address, chainId);
    const unitsStr = units.toString().padStart(decimals + 1, '0');
    const integerPart = unitsStr.slice(0, -decimals) || '0';
    const fractionalPart = unitsStr.slice(-decimals);
    return `${integerPart}.${fractionalPart}`.replace(/\.?0+$/, '');
  }

  private getKey(address: string, chainId: number): string {
    return `${chainId}-${address.toLowerCase()}`;
  }

  /**
   * Load tokens from configuration
   */
  loadFromConfig(tokens: TokenInfo[]): void {
    for (const token of tokens) {
      this.register(token);
    }
  }
}

// Create and export singleton instance
export const tokenPrecision = new TokenPrecisionManager();

// Register common tokens
tokenPrecision.loadFromConfig([
  // Ethereum Mainnet
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    chainId: 1,
  },
  {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: 1,
  },
  {
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    chainId: 1,
  },
  {
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    chainId: 1,
  },
  {
    symbol: 'WBTC',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    chainId: 1,
  },

  // Arbitrum
  {
    symbol: 'WETH',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    chainId: 42161,
  },
  {
    symbol: 'USDC',
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    decimals: 6,
    chainId: 42161,
  },
  {
    symbol: 'USDT',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    chainId: 42161,
  },
  {
    symbol: 'DAI',
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    chainId: 42161,
  },
  {
    symbol: 'WBTC',
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    chainId: 42161,
  },
  {
    symbol: 'ARB',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    chainId: 42161,
  },

  // Polygon
  {
    symbol: 'WMATIC',
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    decimals: 18,
    chainId: 137,
  },
  {
    symbol: 'WETH',
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    decimals: 18,
    chainId: 137,
  },
  {
    symbol: 'USDC',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
    chainId: 137,
  },
  {
    symbol: 'USDT',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    chainId: 137,
  },
  {
    symbol: 'DAI',
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    decimals: 18,
    chainId: 137,
  },

  // Base
  {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: 8453,
  },
  {
    symbol: 'USDbC',
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    decimals: 6,
    chainId: 8453,
  },
  {
    symbol: 'DAI',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    chainId: 8453,
  },
]);
