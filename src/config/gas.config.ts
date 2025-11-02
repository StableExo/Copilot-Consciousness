/**
 * Gas Configuration
 * 
 * Comprehensive gas optimization configuration
 */

export interface GasOracleConfig {
  sources: string[];
  refreshInterval: number;
  fallbackGasPrice: bigint;
  etherscanApiKey?: string;
}

export interface GasStrategyConfig {
  tier: 'instant' | 'fast' | 'normal' | 'slow';
  maxWaitBlocks: number;
}

export interface GasFilterConfig {
  maxGasCostPercentage: number;
  minProfitThreshold: bigint;
  queueThreshold: number;
}

export interface Layer2Config {
  enabled: boolean;
  preferredChains: string[];
  bridgeCostThreshold: bigint;
}

export interface ContractConfig {
  useV2Executor: boolean;
  batchingEnabled: boolean;
  mevProtection: boolean;
}

export interface AnalyticsConfig {
  trackingEnabled: boolean;
  reportInterval: number;
}

export interface GasConfig {
  oracle: GasOracleConfig;
  strategies: {
    aggressive: GasStrategyConfig;
    normal: GasStrategyConfig;
    economical: GasStrategyConfig;
  };
  filters: GasFilterConfig;
  layer2: Layer2Config;
  contract: ContractConfig;
  analytics: AnalyticsConfig;
}

/**
 * Default gas configuration
 */
export const gasConfig: GasConfig = {
  oracle: {
    sources: ['node', 'etherscan'],
    refreshInterval: 12000, // 12 seconds (Ethereum block time)
    fallbackGasPrice: BigInt(50) * BigInt(10 ** 9), // 50 gwei default
    etherscanApiKey: process.env.ETHERSCAN_API_KEY
  },
  strategies: {
    aggressive: {
      tier: 'instant',
      maxWaitBlocks: 1
    },
    normal: {
      tier: 'fast',
      maxWaitBlocks: 3
    },
    economical: {
      tier: 'normal',
      maxWaitBlocks: 10
    }
  },
  filters: {
    maxGasCostPercentage: 50, // Gas can't exceed 50% of profit
    minProfitThreshold: BigInt(100) * BigInt(10 ** 18), // 100 tokens minimum
    queueThreshold: 30 // Queue if gas is 30-50% of profit
  },
  layer2: {
    enabled: true,
    preferredChains: ['arbitrum', 'optimism'],
    bridgeCostThreshold: BigInt(50) * BigInt(10 ** 18) // Don't bridge if cost > threshold
  },
  contract: {
    useV2Executor: true, // Use gas-optimized contract
    batchingEnabled: true,
    mevProtection: true
  },
  analytics: {
    trackingEnabled: true,
    reportInterval: 86400000 // Daily reports (24 hours in ms)
  }
};

/**
 * Create custom gas configuration
 */
export function createGasConfig(overrides: Partial<GasConfig> = {}): GasConfig {
  return {
    oracle: { ...gasConfig.oracle, ...overrides.oracle },
    strategies: {
      aggressive: { ...gasConfig.strategies.aggressive, ...overrides.strategies?.aggressive },
      normal: { ...gasConfig.strategies.normal, ...overrides.strategies?.normal },
      economical: { ...gasConfig.strategies.economical, ...overrides.strategies?.economical }
    },
    filters: { ...gasConfig.filters, ...overrides.filters },
    layer2: { ...gasConfig.layer2, ...overrides.layer2 },
    contract: { ...gasConfig.contract, ...overrides.contract },
    analytics: { ...gasConfig.analytics, ...overrides.analytics }
  };
}

/**
 * Validate gas configuration
 */
export function validateGasConfig(config: GasConfig): boolean {
  // Oracle validation
  if (config.oracle.refreshInterval < 1000) return false;
  if (config.oracle.fallbackGasPrice <= BigInt(0)) return false;

  // Strategy validation
  if (config.strategies.aggressive.maxWaitBlocks < 1) return false;
  if (config.strategies.normal.maxWaitBlocks < 1) return false;
  if (config.strategies.economical.maxWaitBlocks < 1) return false;

  // Filter validation
  if (config.filters.maxGasCostPercentage <= 0 || config.filters.maxGasCostPercentage > 100) {
    return false;
  }
  if (config.filters.queueThreshold <= 0 || config.filters.queueThreshold > 100) {
    return false;
  }
  if (config.filters.minProfitThreshold < BigInt(0)) return false;

  // Layer2 validation
  if (config.layer2.bridgeCostThreshold < BigInt(0)) return false;

  // Analytics validation
  if (config.analytics.reportInterval < 1000) return false;

  return true;
}
