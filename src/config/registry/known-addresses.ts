/**
 * Known Addresses - Chain-specific Address Mappings
 *
 * Centralizes important contract addresses across all supported chains.
 */

export interface ChainAddresses {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  weth: string;
  multicall?: string;
  flashbots?: {
    relay?: string;
    builder?: string;
  };
}

/**
 * Known addresses for each supported chain
 */
export const KNOWN_ADDRESSES: Record<number, ChainAddresses> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    multicall: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
    flashbots: {
      relay: 'https://relay.flashbots.net',
      builder: '0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5',
    },
  },

  // Arbitrum One
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    multicall: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2',
  },

  // Polygon
  137: {
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    multicall: '0x275617327c958bD06b5D6b871E7f491D76113dd8',
  },

  // Base
  8453: {
    chainId: 8453,
    name: 'Base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    weth: '0x4200000000000000000000000000000000000006',
    multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },
};

/**
 * Get addresses for a specific chain
 */
export function getChainAddresses(chainId: number): ChainAddresses | undefined {
  return KNOWN_ADDRESSES[chainId];
}

/**
 * Get WETH address for a chain
 */
export function getWETHAddress(chainId: number): string | undefined {
  return KNOWN_ADDRESSES[chainId]?.weth;
}

/**
 * Get multicall address for a chain
 */
export function getMulticallAddress(chainId: number): string | undefined {
  return KNOWN_ADDRESSES[chainId]?.multicall;
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in KNOWN_ADDRESSES;
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(KNOWN_ADDRESSES).map(Number);
}
