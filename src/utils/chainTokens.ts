/**
 * Chain Token Configuration Utility
 * 
 * Provides token addresses for different blockchain networks
 */

import tokenAddresses from '../../configs/tokens/addresses.json';

export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

export interface ChainTokens {
  WETH?: TokenInfo;
  WMATIC?: TokenInfo;
  USDC?: TokenInfo;
  USDT?: TokenInfo;
  USDbC?: TokenInfo;
  DAI?: TokenInfo;
  ARB?: TokenInfo;
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
    
    case 137: // Polygon mainnet
    case 80001: // Mumbai testnet
      return tokenAddresses.polygon as ChainTokens;
    
    default:
      // Default to Ethereum
      return tokenAddresses.ethereum as ChainTokens;
  }
}

/**
 * Get an array of token addresses for scanning
 * Returns the most liquid tokens for the given chain
 */
export function getScanTokens(chainId: number): string[] {
  const tokens = getTokensByChainId(chainId);
  const addresses: string[] = [];
  
  // Prioritize most liquid tokens
  if (tokens.WETH) addresses.push(tokens.WETH.address);
  if (tokens.WMATIC) addresses.push(tokens.WMATIC.address);
  if (tokens.USDC) addresses.push(tokens.USDC.address);
  if (tokens.USDbC) addresses.push(tokens.USDbC.address);
  if (tokens.USDT) addresses.push(tokens.USDT.address);
  if (tokens.DAI) addresses.push(tokens.DAI.address);
  
  return addresses;
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1: return 'Ethereum Mainnet';
    case 5: return 'Goerli Testnet';
    case 11155111: return 'Sepolia Testnet';
    case 8453: return 'Base';
    case 84532: return 'Base Sepolia';
    case 42161: return 'Arbitrum One';
    case 421613: return 'Arbitrum Goerli';
    case 137: return 'Polygon';
    case 80001: return 'Mumbai Testnet';
    case 10: return 'Optimism';
    case 420: return 'Optimism Goerli';
    default: return `Chain ${chainId}`;
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
