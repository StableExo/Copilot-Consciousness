/**
 * Centralized Network Address Configuration
 * 
 * This file serves as the single source of truth for all network-specific addresses
 * used throughout the repository. It includes tokens, DEX routers, Aave pools, and
 * other protocol addresses across different networks.
 * 
 * Usage:
 *   import { ADDRESSES } from "../config/addresses";
 *   const network = network.name as NetworkKey;
 *   const wethAddress = ADDRESSES[network].weth;
 */

export type DexType = "uniswapV2" | "uniswapV3" | "sushi" | "other";

/**
 * Supported network names matching Hardhat network configuration
 */
export type NetworkKey = "base" | "baseSepolia" | "arbitrum" | "polygon" | "mainnet" | "goerli" | "optimism" | "linea" | "zkSync" | "scroll" | "manta" | "mode";

/**
 * Example pool configuration for demo/test purposes
 */
export interface ExamplePool {
  name: string;
  dexType: DexType;
  address: string;
  tokenIn?: string;
  tokenOut?: string;
  notes?: string;
}

/**
 * Network-specific address configuration
 */
export interface KnownAddresses {
  // Core tokens
  weth?: string;
  usdc?: string;
  dai?: string;

  // DEX routers
  uniswapV2Router?: string;
  uniswapV3Router?: string;
  sushiRouter?: string;

  // Aave V3 Protocol
  aavePool?: string;
  aaveAddressesProvider?: string;

  // Example pools for testing and demos
  examplePools?: ExamplePool[];
}

/**
 * Centralized address registry for all supported networks
 * 
 * Addresses are populated from existing usage in:
 * - scripts/deployFlashSwapV2.ts
 * - scripts/runArbitrage.ts
 * - scripts/runMultiHopArbitrage.ts
 */
export const ADDRESSES: Record<NetworkKey, KnownAddresses> = {
  /**
   * Base Mainnet (Chain ID: 8453)
   * Production addresses for Base network
   */
  base: {
    // Core Tokens
    weth: "0x4200000000000000000000000000000000000006", // Canonical Base WETH
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base

    // DEX Routers
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter
    sushiRouter: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891", // SushiSwap Router

    // Aave V3
    aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", // Aave V3 Pool
    aaveAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D", // Aave V3 PoolAddressesProvider
  },

  /**
   * Base Sepolia Testnet (Chain ID: 84532)
   * Testnet addresses for development and testing
   * Note: Not all tokens may be active on Aave testnet
   */
  baseSepolia: {
    // Core Tokens
    weth: "0x4200000000000000000000000000000000000006", // Canonical Base WETH (most reliable on testnet)
    dai: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI (may not be active on Aave testnet)
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (may not be active on Aave testnet)

    // DEX Routers
    uniswapV3Router: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4", // Uniswap V3 Router
    sushiRouter: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891", // SushiSwap Router

    // Aave V3
    aavePool: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b", // Aave V3 Pool (Base Sepolia)
    aaveAddressesProvider: "0x9957E7F97f4C5357C2c93Fb0D618a0B87e0C97a1", // Aave V3 PoolAddressesProvider

    // Example pools for testing
    examplePools: [
      // Note: These are example/demo pools for testnet development
      // Actual pool addresses should be verified on-chain before use
    ],
  },

  /**
   * Ethereum Mainnet (Chain ID: 1)
   * Placeholder for future mainnet deployment
   */
  mainnet: {
    // TODO: Add Ethereum mainnet addresses when needed
  },

  /**
   * Arbitrum One (Chain ID: 42161)
   * Placeholder for future Arbitrum deployment
   */
  arbitrum: {
    // TODO: Add Arbitrum addresses when needed
  },

  /**
   * Polygon (Chain ID: 137)
   * Placeholder for future Polygon deployment
   */
  polygon: {
    // TODO: Add Polygon addresses when needed
  },

  /**
   * Goerli Testnet (Chain ID: 5)
   * Deprecated testnet - keeping for backward compatibility
   */
  goerli: {
    // TODO: Add Goerli addresses if needed (testnet is deprecated)
  },

  /**
   * Optimism Mainnet (Chain ID: 10)
   * Home of Velodrome V2
   */
  optimism: {
    // TODO: Add Optimism addresses when needed
  },

  /**
   * Linea Mainnet (Chain ID: 59144)
   * High-volume chain with Lynex
   */
  linea: {
    // TODO: Add Linea addresses when needed
  },

  /**
   * zkSync Era (Chain ID: 324)
   * zkRollup with PancakeSwap V3 and SyncSwap
   */
  zkSync: {
    // TODO: Add zkSync Era addresses when needed
  },

  /**
   * Scroll Mainnet (Chain ID: 534352)
   * zkEVM with Skydrome and Ambient Finance
   */
  scroll: {
    // TODO: Add Scroll addresses when needed
  },

  /**
   * Manta Pacific (Chain ID: 169)
   * Privacy-focused chain with Aperture and QuickSwap V3
   */
  manta: {
    // TODO: Add Manta Pacific addresses when needed
  },

  /**
   * Mode Network (Chain ID: 34443)
   * New L2 with Kim V4 pools
   */
  mode: {
    // TODO: Add Mode Network addresses when needed
  },
};

/**
 * Helper function to get addresses for a specific network
 * Throws if network is not found
 */
export function getAddressesForNetwork(networkName: string): KnownAddresses {
  const addresses = ADDRESSES[networkName as NetworkKey];
  if (!addresses) {
    throw new Error(`No address configuration found for network: ${networkName}`);
  }
  return addresses;
}

/**
 * Helper function to validate that a required address exists for a network
 */
export function requireAddress(
  networkName: string,
  addressKey: keyof KnownAddresses,
  customError?: string
): string {
  const addresses = getAddressesForNetwork(networkName);
  const address = addresses[addressKey];
  
  if (!address || (typeof address === 'object')) {
    throw new Error(
      customError || 
      `${addressKey} is not configured for network: ${networkName}`
    );
  }
  
  return address as string;
}
