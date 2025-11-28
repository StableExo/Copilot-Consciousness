/**
 * Viem Client Utilities
 *
 * Provides viem client setup and configuration for blockchain interactions.
 * Part of the ethers.js to viem migration (Phase 2).
 *
 * @module utils/viem
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
  type Address,
  formatEther as viemFormatEther,
  formatUnits as viemFormatUnits,
  parseEther as viemParseEther,
  parseUnits as viemParseUnits,
  getAddress as viemGetAddress,
  isAddress as viemIsAddress,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  avalanche,
  linea,
  zkSync,
  scroll,
  manta,
  mode,
} from 'viem/chains';

/**
 * Chain configuration map from chainId to viem Chain object
 */
export const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  56: bsc,
  43114: avalanche,
  59144: linea,
  324: zkSync,
  534352: scroll,
  169: manta,
  34443: mode,
};

/**
 * Get viem chain configuration by chainId
 */
export function getChain(chainId: number): Chain {
  const chain = CHAIN_MAP[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}. Add chain to CHAIN_MAP in viem/index.ts`);
  }
  return chain;
}

/**
 * Cached public clients by chain ID
 */
const publicClients: Map<number, PublicClient> = new Map();

/**
 * Cached wallet clients by chain ID
 */
const walletClients: Map<number, WalletClient> = new Map();

/**
 * Get RPC URL for a specific chain
 */
export function getRpcUrl(chainId: number): string {
  // Check for chain-specific RPC URLs first
  const chainEnvMap: Record<number, string> = {
    1: 'ETHEREUM_RPC_URL',
    8453: 'BASE_RPC_URL',
    42161: 'ARBITRUM_RPC_URL',
    10: 'OPTIMISM_RPC_URL',
    137: 'POLYGON_RPC_URL',
    56: 'BSC_RPC_URL',
    43114: 'AVALANCHE_RPC_URL',
    59144: 'LINEA_RPC_URL',
    324: 'ZKSYNC_RPC_URL',
    534352: 'SCROLL_RPC_URL',
    169: 'MANTA_RPC_URL',
    34443: 'MODE_RPC_URL',
  };

  const envKey = chainEnvMap[chainId];
  if (envKey && process.env[envKey]) {
    return process.env[envKey]!;
  }

  throw new Error(
    `No RPC URL configured for chain ${chainId}. Set ${envKey || `an RPC URL for chain ${chainId}`} in your .env file`
  );
}

/**
 * Create a public client for reading blockchain state
 */
export function createViemPublicClient(chainId: number, rpcUrl?: string): PublicClient {
  // Check cache first
  if (!rpcUrl && publicClients.has(chainId)) {
    return publicClients.get(chainId)!;
  }

  const chain = getChain(chainId);
  const url = rpcUrl || getRpcUrl(chainId);

  const client = createPublicClient({
    chain,
    transport: http(url),
  });

  // Cache if using default RPC
  if (!rpcUrl) {
    publicClients.set(chainId, client);
  }

  return client;
}

/**
 * Create a wallet client for signing and sending transactions
 */
export function createViemWalletClient(
  chainId: number,
  privateKey?: string,
  rpcUrl?: string
): WalletClient {
  // Check cache first (only if using default config)
  if (!privateKey && !rpcUrl && walletClients.has(chainId)) {
    return walletClients.get(chainId)!;
  }

  const chain = getChain(chainId);
  const url = rpcUrl || getRpcUrl(chainId);

  // Get private key from parameter or environment
  const key = privateKey || process.env.PRIVATE_KEY;
  if (!key) {
    throw new Error('Private key not provided. Set PRIVATE_KEY in your .env file');
  }

  // Ensure private key has 0x prefix
  const formattedKey = key.startsWith('0x') ? (key as Hex) : (`0x${key}` as Hex);
  const account = privateKeyToAccount(formattedKey);

  const client = createWalletClient({
    chain,
    transport: http(url),
    account,
  });

  // Cache if using default config
  if (!privateKey && !rpcUrl) {
    walletClients.set(chainId, client);
  }

  return client;
}

/**
 * Get account from private key
 */
export function getAccount(privateKey?: string): Account {
  const key = privateKey || process.env.PRIVATE_KEY;
  if (!key) {
    throw new Error('Private key not provided. Set PRIVATE_KEY in your .env file');
  }

  const formattedKey = key.startsWith('0x') ? (key as Hex) : (`0x${key}` as Hex);
  return privateKeyToAccount(formattedKey);
}

/**
 * Clear cached clients (useful for testing or reconfiguration)
 */
export function clearClientCache(): void {
  publicClients.clear();
  walletClients.clear();
}

// Re-export commonly used viem utilities for convenience
export {
  viemFormatEther as formatEther,
  viemFormatUnits as formatUnits,
  viemParseEther as parseEther,
  viemParseUnits as parseUnits,
  viemGetAddress as getAddress,
  viemIsAddress as isAddress,
};

// Re-export viem types for convenience
export type {
  PublicClient,
  WalletClient,
  Chain,
  Transport,
  Account,
  Address,
  Hex,
};

// Re-export chain definitions
export {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  avalanche,
  linea,
  zkSync,
  scroll,
  manta,
  mode,
};
