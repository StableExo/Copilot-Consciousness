/**
 * Chain Token Configuration Utility
 *
 * Provides token addresses for different blockchain networks
 */

import tokenAddresses from '../config/tokens/addresses.json';

export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

export interface ChainTokens {
  WETH?: TokenInfo;
  USDC?: TokenInfo;
  USDT?: TokenInfo;
  USDbC?: TokenInfo;
  DAI?: TokenInfo;
  ARB?: TokenInfo;
  OP?: TokenInfo;
  cbETH?: TokenInfo;
  AERO?: TokenInfo;
  cbBTC?: TokenInfo;
  WSTETH?: TokenInfo;
  [key: string]: TokenInfo | undefined; // Allow additional token symbols beyond the predefined ones
}

/**
 * Get token addresses for a specific chain ID
 */
export function getTokensByChainId(chainId: number): ChainTokens {
  switch (chainId) {
    case 1: // Ethereum mainnet
    case 5: // Goerli testnet
    case 11155111: // Sepolia testnet
      return tokenAddresses.ethereum as ChainTokens;

    case 8453: // Base mainnet
    case 84532: // Base testnet
      return tokenAddresses.base as ChainTokens;

    case 42161: // Arbitrum mainnet
    case 421613: // Arbitrum testnet
      return tokenAddresses.arbitrum as ChainTokens;

    case 10: // Optimism mainnet
    case 420: // Optimism testnet (Goerli)
      return tokenAddresses.optimism as ChainTokens;

    default:
      // Default to Ethereum for unknown chains
      return tokenAddresses.ethereum as ChainTokens;
  }
}

/**
 * Get an array of token addresses for scanning
 * Returns all available tokens for the given chain
 */
export function getScanTokens(chainId: number): string[] {
  const tokens = getTokensByChainId(chainId);
  const addresses: string[] = [];

  // Dynamically include all available tokens for the chain
  // This ensures we don't miss any configured tokens
  for (const [symbol, tokenInfo] of Object.entries(tokens)) {
    if (tokenInfo && tokenInfo.address) {
      addresses.push(tokenInfo.address);
    }
  }

  return addresses;
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum Mainnet';
    case 5:
      return 'Goerli Testnet';
    case 11155111:
      return 'Sepolia Testnet';
    case 8453:
      return 'Base';
    case 84532:
      return 'Base Sepolia';
    case 42161:
      return 'Arbitrum One';
    case 421613:
      return 'Arbitrum Goerli';
    case 10:
      return 'Optimism';
    case 420:
      return 'Optimism Goerli';
    default:
      return `Chain ${chainId}`;
  }
}

/**
 * Format token list for logging
 */
export function formatTokenList(tokens: ChainTokens): string {
  const entries = Object.entries(tokens)
    .filter(([_, token]) => token && token.address)
    .map(([symbol, token]) => `${symbol}: ${token!.address}`);

  return entries.join('\n  ');
}
