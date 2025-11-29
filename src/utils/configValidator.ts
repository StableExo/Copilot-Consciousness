/**
 * Configuration Validator
 *
 * Validates environment variables and returns a typed configuration object.
 * Throws descriptive errors for missing or invalid values.
 *
 * Migrated to viem for better TypeScript support and smaller bundle size.
 */

import { isAddress, isHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface ValidatedConfig {
  // Network configuration
  rpcUrl: string;
  chainId: number;
  wsUrl?: string;

  // Wallet configuration
  privateKey: string;

  // Contract addresses
  flashSwapV2Address?: string;
  flashSwapV2Owner?: string;

  // Profitability settings
  minProfitThreshold: number;
  minProfitPercent: number;
  minProfitAbsolute: bigint;

  // Slippage configuration
  maxSlippage: number;
  maxSlippagePercent: number;

  // Gas configuration
  maxGasPrice: bigint;
  maxGasCostPercentage: number;

  // Performance settings
  scanInterval: number;
  concurrency: number;
  targetThroughput: number;

  // Liquidity filters
  minLiquidity: bigint;

  // Feature flags
  enableMlPredictions: boolean;
  enableCrossChain: boolean;
  enableLayer2: boolean;
  dryRun: boolean;

  // Environment
  nodeEnv: string;
  debug: boolean;
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate that a required environment variable exists
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new ConfigValidationError(
      `Missing required environment variable: ${name}\n` +
        `Please set ${name} in your .env file or environment.`
    );
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Validate and parse an integer environment variable
 */
function parseIntEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigValidationError(
      `Invalid integer value for ${name}: "${value}"\n` + `Expected a valid integer number.`
    );
  }
  return parsed;
}

/**
 * Validate and parse a float environment variable
 */
function parseFloatEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new ConfigValidationError(
      `Invalid float value for ${name}: "${value}"\n` + `Expected a valid decimal number.`
    );
  }
  return parsed;
}

/**
 * Validate and parse a bigint environment variable
 */
function parseBigIntEnv(name: string, defaultValue: bigint): bigint {
  const value = process.env[name];
  if (!value) return defaultValue;

  try {
    return BigInt(value);
  } catch (_error) {
    throw new ConfigValidationError(
      `Invalid bigint value for ${name}: "${value}"\n` +
        `Expected a valid integer that can be converted to BigInt.`
    );
  }
}

/**
 * Validate and parse a boolean environment variable
 */
function parseBoolEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;

  const normalized = value.toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new ConfigValidationError(
    `Invalid boolean value for ${name}: "${value}"\n` +
      `Expected one of: true, false, 1, 0, yes, no`
  );
}

/**
 * Validate RPC URL format
 */
function validateRpcUrl(url: string): void {
  if (
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('ws://') &&
    !url.startsWith('wss://')
  ) {
    throw new ConfigValidationError(
      `Invalid RPC URL format: "${url}"\n` +
        `RPC URL must start with http://, https://, ws://, or wss://`
    );
  }

  try {
    new URL(url);
  } catch (_error) {
    throw new ConfigValidationError(
      `Invalid RPC URL: "${url}"\n` + `URL is not properly formatted.`
    );
  }
}

/**
 * Validate private key format
 */
function validatePrivateKey(key: string): void {
  // Ensure the key has the 0x prefix for viem compatibility
  const formattedKey = key.startsWith('0x') ? key : `0x${key}`;

  // Validate hex format using viem's isHex
  if (!isHex(formattedKey)) {
    throw new ConfigValidationError(
      `Invalid private key format: key contains non-hexadecimal characters\n` +
        `Private key must only contain characters 0-9 and a-f`
    );
  }

  // Check length (66 characters with 0x prefix = 64 hex characters)
  if (formattedKey.length !== 66) {
    throw new ConfigValidationError(
      `Invalid private key format: key must be 64 hexadecimal characters (32 bytes)\n` +
        `Current length: ${formattedKey.length - 2} characters\n` +
        `Private key should be in format: 0x followed by 64 hex characters`
    );
  }

  // Validate it's a valid private key by trying to create an account
  try {
    privateKeyToAccount(formattedKey as `0x${string}`);
  } catch (error) {
    throw new ConfigValidationError(
      `Invalid private key: unable to create account\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate Ethereum address format
 */
function validateAddress(address: string, name: string): void {
  if (!isAddress(address)) {
    throw new ConfigValidationError(
      `Invalid Ethereum address for ${name}: "${address}"\n` +
        `Address must be a valid Ethereum address (0x followed by 40 hex characters)`
    );
  }
}

/**
 * Validate and load configuration from environment variables
 */
export function validateConfig(): ValidatedConfig {
  try {
    // Determine which RPC URL to use
    let rpcUrl: string;
    const baseRpcUrl = process.env.BASE_RPC_URL;
    const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL;

    if (baseRpcUrl) {
      rpcUrl = baseRpcUrl;
    } else if (ethereumRpcUrl) {
      rpcUrl = ethereumRpcUrl;
    } else {
      throw new ConfigValidationError(
        'Missing required RPC URL configuration.\n' +
          'Please set one of the following in your .env file:\n' +
          '  - BASE_RPC_URL (for Base network)\n' +
          '  - ETHEREUM_RPC_URL (for Ethereum mainnet)\n' +
          '\n' +
          'Example: BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY'
      );
    }

    // Validate RPC URL
    validateRpcUrl(rpcUrl);

    // Validate private key
    const privateKey = requireEnv('WALLET_PRIVATE_KEY');
    validatePrivateKey(privateKey);

    // Validate optional contract addresses
    const flashSwapV2Address = process.env.FLASHSWAP_V2_ADDRESS;
    if (flashSwapV2Address) {
      validateAddress(flashSwapV2Address, 'FLASHSWAP_V2_ADDRESS');
    }

    const flashSwapV2Owner = process.env.FLASHSWAP_V2_OWNER;
    if (flashSwapV2Owner) {
      validateAddress(flashSwapV2Owner, 'FLASHSWAP_V2_OWNER');
    }

    // Parse numeric configuration with validation
    const minProfitThreshold = parseFloatEnv('MIN_PROFIT_THRESHOLD', 0.01);
    if (minProfitThreshold <= 0 || minProfitThreshold > 1) {
      throw new ConfigValidationError(
        `MIN_PROFIT_THRESHOLD must be between 0 and 1 (got ${minProfitThreshold})`
      );
    }

    const minProfitPercent = parseFloatEnv('MIN_PROFIT_PERCENT', 0.5);
    if (minProfitPercent < 0 || minProfitPercent > 100) {
      throw new ConfigValidationError(
        `MIN_PROFIT_PERCENT must be between 0 and 100 (got ${minProfitPercent})`
      );
    }

    const maxSlippage = parseFloatEnv('MAX_SLIPPAGE', 0.005);
    if (maxSlippage < 0 || maxSlippage > 1) {
      throw new ConfigValidationError(`MAX_SLIPPAGE must be between 0 and 1 (got ${maxSlippage})`);
    }

    const maxSlippagePercent = parseFloatEnv('MAX_SLIPPAGE_PERCENT', 1.0);
    if (maxSlippagePercent < 0 || maxSlippagePercent > 100) {
      throw new ConfigValidationError(
        `MAX_SLIPPAGE_PERCENT must be between 0 and 100 (got ${maxSlippagePercent})`
      );
    }

    const maxGasPriceGwei = parseIntEnv('MAX_GAS_PRICE', 100);
    if (maxGasPriceGwei <= 0) {
      throw new ConfigValidationError(
        `MAX_GAS_PRICE must be greater than 0 (got ${maxGasPriceGwei})`
      );
    }

    const maxGasCostPercentage = parseIntEnv('MAX_GAS_COST_PERCENTAGE', 40);
    if (maxGasCostPercentage < 0 || maxGasCostPercentage > 100) {
      throw new ConfigValidationError(
        `MAX_GAS_COST_PERCENTAGE must be between 0 and 100 (got ${maxGasCostPercentage})`
      );
    }

    const scanInterval = parseIntEnv('SCAN_INTERVAL', 1000);
    if (scanInterval < 100) {
      throw new ConfigValidationError(
        `SCAN_INTERVAL must be at least 100ms (got ${scanInterval}ms)`
      );
    }

    const concurrency = parseIntEnv('CONCURRENCY', 10);
    if (concurrency < 1 || concurrency > 1000) {
      throw new ConfigValidationError(
        `CONCURRENCY must be between 1 and 1000 (got ${concurrency})`
      );
    }

    // Build validated configuration
    const config: ValidatedConfig = {
      // Network
      rpcUrl,
      chainId: parseIntEnv('CHAIN_ID', 1),
      wsUrl: process.env.ALCHEMY_WS_URL || process.env.INFURA_WS_URL,

      // Wallet
      privateKey,

      // Contracts
      flashSwapV2Address,
      flashSwapV2Owner,

      // Profitability
      minProfitThreshold,
      minProfitPercent,
      minProfitAbsolute: parseBigIntEnv(
        'MIN_PROFIT_ABSOLUTE',
        BigInt('100000000000000000') // 0.1 ETH default
      ),

      // Slippage
      maxSlippage,
      maxSlippagePercent,

      // Gas
      maxGasPrice: BigInt(maxGasPriceGwei) * BigInt(1e9), // Convert gwei to wei
      maxGasCostPercentage,

      // Performance
      scanInterval,
      concurrency,
      targetThroughput: parseIntEnv('TARGET_THROUGHPUT', 10000),

      // Liquidity
      minLiquidity: parseBigIntEnv(
        'MIN_LIQUIDITY',
        BigInt('100000000000000000000') // 100 tokens default (Base network has smaller pools)
      ),

      // Feature flags
      enableMlPredictions: parseBoolEnv('ENABLE_ML_PREDICTIONS', false),
      enableCrossChain: parseBoolEnv('ENABLE_CROSS_CHAIN', false),
      enableLayer2: parseBoolEnv('ENABLE_LAYER2', false),
      dryRun: parseBoolEnv('DRY_RUN', process.env.NODE_ENV !== 'production'),

      // Environment
      nodeEnv: getEnv('NODE_ENV', 'development'),
      debug: parseBoolEnv('DEBUG', false),
    };

    return config;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }

    throw new ConfigValidationError(
      `Unexpected error during configuration validation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Validate configuration and log the results
 */
export function validateAndLogConfig(logger: { info: (msg: string) => void }): ValidatedConfig {
  const config = validateConfig();

  logger.info('Configuration validated successfully');
  logger.info(`- Network: Chain ID ${config.chainId}`);
  logger.info(`- RPC URL: ${config.rpcUrl.substring(0, 50)}...`);
  logger.info(`- Dry Run: ${config.dryRun}`);
  logger.info(`- Min Profit: ${config.minProfitPercent}%`);
  logger.info(`- Max Gas Price: ${Number(config.maxGasPrice / BigInt(1e9))} gwei`);
  logger.info(`- Scan Interval: ${config.scanInterval}ms`);
  logger.info(`- Concurrency: ${config.concurrency}`);

  if (config.flashSwapV2Address) {
    logger.info(`- FlashSwap V2: ${config.flashSwapV2Address}`);
  }

  return config;
}
