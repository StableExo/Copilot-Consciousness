/**
 * Cross-Chain Arbitrage Configuration
 *
 * Comprehensive configuration for cross-chain arbitrage system
 */

export interface ChainConfig {
  chainId: number | string;
  name: string;
  type: 'EVM' | 'Solana';
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockTime: number; // Average block time in seconds
  enabled: boolean;
  wsUrl?: string;
}

export interface BridgeConfig {
  name: string;
  type: 'wormhole' | 'layerzero' | 'synapse' | 'hop' | 'stargate';
  enabled: boolean;
  minAmount: bigint; // Minimum amount to bridge
  maxAmount: bigint; // Maximum amount to bridge
  estimatedTime: number; // Estimated bridge time in seconds
  supportedChains: (number | string)[]; // Chain IDs supported
  priority: number; // Lower is higher priority
}

export interface ScannerConfig {
  scanIntervalMs: number;
  priceDiscrepancyThreshold: number; // Minimum % difference to consider
  parallelChainScans: boolean;
  maxConcurrentScans: number;
  enableWebSocket: boolean;
}

export interface PathfindingConfig {
  maxHops: number;
  maxBridgeHops: number; // Maximum number of bridge crossings
  minBridgeFeeRatio: number; // Don't bridge if amount < fee * this ratio
  maxPathExplorationTime: number; // Max time to spend finding paths (ms)
  pruneUnprofitablePaths: boolean;
}

export interface ExecutionConfig {
  maxConcurrentPaths: number;
  bridgeTimeoutMs: number;
  retryAttempts: number;
  slippageTolerance: number;
  enableEmergencyRecovery: boolean;
}

export interface CrossChainConfig {
  chains: ChainConfig[];
  bridges: BridgeConfig[];
  scanner: ScannerConfig;
  pathfinding: PathfindingConfig;
  execution: ExecutionConfig;
}

// Default configuration
export const DEFAULT_CROSS_CHAIN_CONFIG: CrossChainConfig = {
  chains: [
    {
      chainId: 1,
      name: 'Ethereum',
      type: 'EVM',
      rpcUrls: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com',
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockTime: 12,
      enabled: true,
    },
    {
      chainId: 56,
      name: 'BSC',
      type: 'EVM',
      rpcUrls: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://rpc.ankr.com/bsc',
      ],
      nativeCurrency: {
        name: 'Binance Coin',
        symbol: 'BNB',
        decimals: 18,
      },
      blockTime: 3,
      enabled: true,
    },
    {
      chainId: 137,
      name: 'Polygon',
      type: 'EVM',
      rpcUrls: [
        'https://polygon-rpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon.llamarpc.com',
      ],
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18,
      },
      blockTime: 2,
      enabled: true,
    },
    {
      chainId: 43114,
      name: 'Avalanche',
      type: 'EVM',
      rpcUrls: [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche',
        'https://avalanche.public-rpc.com',
      ],
      nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
      },
      blockTime: 2,
      enabled: true,
    },
    {
      chainId: 42161,
      name: 'Arbitrum',
      type: 'EVM',
      rpcUrls: [
        'https://arb1.arbitrum.io/rpc',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum.llamarpc.com',
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockTime: 0.25,
      enabled: true,
    },
    {
      chainId: 10,
      name: 'Optimism',
      type: 'EVM',
      rpcUrls: [
        'https://mainnet.optimism.io',
        'https://rpc.ankr.com/optimism',
        'https://optimism.llamarpc.com',
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockTime: 2,
      enabled: true,
    },
    {
      chainId: 8453,
      name: 'Base',
      type: 'EVM',
      rpcUrls: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base.meowrpc.com',
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockTime: 2,
      enabled: true,
    },
    {
      chainId: 'mainnet-beta',
      name: 'Solana',
      type: 'Solana',
      rpcUrls: ['https://api.mainnet-beta.solana.com', 'https://solana-api.projectserum.com'],
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      },
      blockTime: 0.4,
      enabled: true,
    },
  ],
  bridges: [
    {
      name: 'Wormhole',
      type: 'wormhole',
      enabled: true,
      minAmount: BigInt(10) * BigInt(10 ** 18), // 10 tokens
      maxAmount: BigInt(1000000) * BigInt(10 ** 18), // 1M tokens
      estimatedTime: 900, // 15 minutes
      supportedChains: [1, 56, 137, 43114, 42161, 10, 8453, 'mainnet-beta'],
      priority: 1,
    },
    {
      name: 'LayerZero',
      type: 'layerzero',
      enabled: true,
      minAmount: BigInt(5) * BigInt(10 ** 18),
      maxAmount: BigInt(500000) * BigInt(10 ** 18),
      estimatedTime: 600, // 10 minutes
      supportedChains: [1, 56, 137, 43114, 42161, 10, 8453],
      priority: 2,
    },
    {
      name: 'Stargate',
      type: 'stargate',
      enabled: true,
      minAmount: BigInt(10) * BigInt(10 ** 18),
      maxAmount: BigInt(1000000) * BigInt(10 ** 18),
      estimatedTime: 300, // 5 minutes
      supportedChains: [1, 56, 137, 43114, 42161, 10],
      priority: 3,
    },
    {
      name: 'Hop',
      type: 'hop',
      enabled: true,
      minAmount: BigInt(1) * BigInt(10 ** 18),
      maxAmount: BigInt(100000) * BigInt(10 ** 18),
      estimatedTime: 1200, // 20 minutes
      supportedChains: [1, 137, 42161, 10],
      priority: 4,
    },
    {
      name: 'Synapse',
      type: 'synapse',
      enabled: true,
      minAmount: BigInt(5) * BigInt(10 ** 18),
      maxAmount: BigInt(500000) * BigInt(10 ** 18),
      estimatedTime: 900, // 15 minutes
      supportedChains: [1, 56, 137, 43114, 42161, 10, 8453],
      priority: 5,
    },
  ],
  scanner: {
    scanIntervalMs: 5000, // 5 seconds
    priceDiscrepancyThreshold: 2.0, // 2% minimum difference
    parallelChainScans: true,
    maxConcurrentScans: 10,
    enableWebSocket: true,
  },
  pathfinding: {
    maxHops: 5,
    maxBridgeHops: 2,
    minBridgeFeeRatio: 10, // Amount must be 10x the fee
    maxPathExplorationTime: 5000, // 5 seconds
    pruneUnprofitablePaths: true,
  },
  execution: {
    maxConcurrentPaths: 10,
    bridgeTimeoutMs: 1800000, // 30 minutes
    retryAttempts: 3,
    slippageTolerance: 1.0, // 1%
    enableEmergencyRecovery: true,
  },
};

export default DEFAULT_CROSS_CHAIN_CONFIG;
