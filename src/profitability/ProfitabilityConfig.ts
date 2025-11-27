/**
 * ProfitabilityConfig - Configurable profitability thresholds and slippage models
 *
 * Implements Phase 2.2 and 2.3 from PROFITABLE_EXECUTION_PLAN.md:
 * - Realistic slippage calculation using liquidity depth
 * - Environment-configurable min profit thresholds
 * - Chain-specific gas estimation
 */

import { parseEther } from 'ethers';

/**
 * Minimum profit configuration
 */
export interface MinProfitConfig {
  absoluteMin: bigint; // Absolute minimum profit in wei (e.g., 0.001 ETH)
  percentageMin: number; // Minimum ROI percentage (e.g., 0.1%)
  gasMultiplier: number; // Gas cost multiplier as profit floor (e.g., 1.5x)
}

/**
 * Chain-specific gas estimates for different operation types
 */
export interface ChainGasEstimates {
  simpleSwap: number;
  multiHopSwap: number;
  flashSwap: number;
  flashLoan: number;
}

/**
 * Slippage configuration
 */
export interface SlippageConfig {
  mevBuffer: number; // MEV buffer percentage (e.g., 0.003 = 0.3%)
  baseSlippage: number; // Base slippage for all trades
  maxSlippage: number; // Maximum allowed slippage
  priceImpactMultiplier: number; // Multiplier for price impact calculation
}

/**
 * Complete profitability configuration
 */
export interface ProfitabilityConfig {
  minProfit: MinProfitConfig;
  slippage: SlippageConfig;
  gasEstimates: Record<number, ChainGasEstimates>;
}

/**
 * Default gas estimates per chain
 */
const DEFAULT_GAS_ESTIMATES: Record<number, ChainGasEstimates> = {
  // Ethereum Mainnet (Chain ID: 1)
  1: {
    simpleSwap: 200000,
    multiHopSwap: 400000,
    flashSwap: 500000,
    flashLoan: 600000,
  },
  // Base (Chain ID: 8453) - Lower gas due to L2
  8453: {
    simpleSwap: 150000,
    multiHopSwap: 250000,
    flashSwap: 300000,
    flashLoan: 350000,
  },
  // Arbitrum (Chain ID: 42161)
  42161: {
    simpleSwap: 150000,
    multiHopSwap: 300000,
    flashSwap: 400000,
    flashLoan: 450000,
  },
  // Optimism (Chain ID: 10)
  10: {
    simpleSwap: 150000,
    multiHopSwap: 250000,
    flashSwap: 300000,
    flashLoan: 350000,
  },
  // Polygon (Chain ID: 137)
  137: {
    simpleSwap: 180000,
    multiHopSwap: 350000,
    flashSwap: 450000,
    flashLoan: 500000,
  },
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ProfitabilityConfig = {
  minProfit: {
    absoluteMin: parseEther('0.001'), // 0.001 ETH absolute minimum
    percentageMin: 0.1, // 0.1% minimum ROI
    gasMultiplier: 1.5, // 1.5x gas cost as profit floor
  },
  slippage: {
    mevBuffer: 0.003, // 0.3% MEV buffer
    baseSlippage: 0.001, // 0.1% base slippage
    maxSlippage: 0.05, // 5% maximum slippage
    priceImpactMultiplier: 1.0, // Standard price impact
  },
  gasEstimates: DEFAULT_GAS_ESTIMATES,
};

/**
 * Safely parse a float from environment variable with validation
 */
function safeParseFloat(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return defaultValue;
  if (max !== undefined && parsed > max) return defaultValue;
  return parsed;
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): ProfitabilityConfig {
  const config = { ...DEFAULT_CONFIG };

  // Min profit configuration
  if (process.env.MIN_PROFIT_ABSOLUTE) {
    try {
      config.minProfit.absoluteMin = parseEther(process.env.MIN_PROFIT_ABSOLUTE);
    } catch {
      // Keep default if parsing fails
    }
  }

  // Parse with validation: percentage (0-100), multiplier (0.1-10)
  config.minProfit.percentageMin = safeParseFloat(
    process.env.MIN_PROFIT_PERCENT,
    DEFAULT_CONFIG.minProfit.percentageMin,
    0,
    100
  );
  config.minProfit.gasMultiplier = safeParseFloat(
    process.env.GAS_MULTIPLIER,
    DEFAULT_CONFIG.minProfit.gasMultiplier,
    0.1,
    10
  );

  // Slippage configuration with validation (0-1 range for percentages)
  config.slippage.mevBuffer = safeParseFloat(
    process.env.MEV_BUFFER,
    DEFAULT_CONFIG.slippage.mevBuffer,
    0,
    0.5
  );
  config.slippage.baseSlippage = safeParseFloat(
    process.env.BASE_SLIPPAGE,
    DEFAULT_CONFIG.slippage.baseSlippage,
    0,
    0.5
  );
  config.slippage.maxSlippage = safeParseFloat(
    process.env.MAX_SLIPPAGE,
    DEFAULT_CONFIG.slippage.maxSlippage,
    0,
    1
  );

  return config;
}

/**
 * Calculate realistic slippage based on liquidity depth
 *
 * Implements the improved slippage model from Phase 2.2:
 * - Uses actual liquidity depth for price impact calculation
 * - Adds MEV buffer for timing and frontrunning risk
 */
export function calculateRealisticSlippage(
  amountIn: bigint,
  poolLiquidity: bigint,
  config: SlippageConfig = DEFAULT_CONFIG.slippage
): number {
  // Prevent division by zero
  if (poolLiquidity === BigInt(0)) {
    return config.maxSlippage;
  }

  // Price impact = amountIn / poolLiquidity
  // Using BigInt math and converting to number at the end
  const priceImpact = Number((amountIn * BigInt(10000)) / poolLiquidity) / 10000;

  // Apply price impact multiplier
  const adjustedPriceImpact = priceImpact * config.priceImpactMultiplier;

  // Add MEV and timing buffer
  const totalSlippage = adjustedPriceImpact + config.mevBuffer + config.baseSlippage;

  // Cap at maximum slippage
  return Math.min(totalSlippage, config.maxSlippage);
}

/**
 * Estimate gas for an arbitrage path
 *
 * Implements dynamic gas estimation from Phase 2.1:
 * - Chain-specific base gas costs
 * - Per-hop gas additions
 * - Support for different execution types
 */
export function estimateGas(
  hopsCount: number,
  chainId: number,
  executionType: 'simple' | 'multiHop' | 'flashSwap' | 'flashLoan' = 'multiHop',
  config: ProfitabilityConfig = DEFAULT_CONFIG
): bigint {
  const chainEstimates = config.gasEstimates[chainId] || DEFAULT_GAS_ESTIMATES[8453]; // Default to Base

  let baseGas: number;
  switch (executionType) {
    case 'simple':
      baseGas = chainEstimates.simpleSwap;
      break;
    case 'multiHop':
      baseGas = chainEstimates.multiHopSwap;
      break;
    case 'flashSwap':
      baseGas = chainEstimates.flashSwap;
      break;
    case 'flashLoan':
      baseGas = chainEstimates.flashLoan;
      break;
    default:
      baseGas = chainEstimates.multiHopSwap;
  }

  // Add per-hop gas for multi-hop trades
  const perHopGas = hopsCount > 1 ? (hopsCount - 1) * 50000 : 0;

  return BigInt(baseGas + perHopGas);
}

/**
 * Check if an opportunity meets minimum profit requirements
 */
export function meetsProfitRequirements(
  estimatedProfit: bigint,
  estimatedGasCost: bigint,
  inputAmount: bigint,
  config: MinProfitConfig = DEFAULT_CONFIG.minProfit
): { meets: boolean; reason?: string } {
  // Check absolute minimum
  const netProfit = estimatedProfit - estimatedGasCost;
  if (netProfit < config.absoluteMin) {
    return {
      meets: false,
      reason: `Net profit ${netProfit} below absolute minimum ${config.absoluteMin}`,
    };
  }

  // Check percentage minimum
  if (inputAmount > BigInt(0)) {
    const percentageProfit = Number((netProfit * BigInt(10000)) / inputAmount) / 100;
    if (percentageProfit < config.percentageMin) {
      return {
        meets: false,
        reason: `Profit percentage ${percentageProfit.toFixed(3)}% below minimum ${
          config.percentageMin
        }%`,
      };
    }
  }

  // Check gas multiplier (profit must be at least gasMultiplier * gasCost)
  const minProfitFromGas =
    (estimatedGasCost * BigInt(Math.floor(config.gasMultiplier * 100))) / BigInt(100);
  if (netProfit < minProfitFromGas) {
    return {
      meets: false,
      reason: `Net profit ${netProfit} below ${config.gasMultiplier}x gas cost ${minProfitFromGas}`,
    };
  }

  return { meets: true };
}

/**
 * Calculate expected profit after slippage
 */
export function calculateProfitAfterSlippage(grossProfit: bigint, slippage: number): bigint {
  // Reduce profit by slippage percentage
  const slippageBps = BigInt(Math.floor(slippage * 10000));
  return (grossProfit * (BigInt(10000) - slippageBps)) / BigInt(10000);
}

/**
 * Get chain-specific gas estimates
 */
export function getChainGasEstimates(chainId: number): ChainGasEstimates {
  return DEFAULT_GAS_ESTIMATES[chainId] || DEFAULT_GAS_ESTIMATES[8453];
}

/**
 * Singleton configuration instance
 */
let configInstance: ProfitabilityConfig | null = null;

/**
 * Get the profitability configuration (loads from env on first call)
 */
export function getProfitabilityConfig(): ProfitabilityConfig {
  if (!configInstance) {
    configInstance = loadConfigFromEnv();
  }
  return configInstance;
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

export { DEFAULT_CONFIG, DEFAULT_GAS_ESTIMATES };
