/**
 * Environment Configuration Schema
 *
 * Runtime validation for .env configuration using Zod.
 * Provides type-safe environment configuration with detailed error messages.
 *
 * @module env-schema
 */

import { z } from 'zod';

/**
 * URL validation patterns
 */
const httpUrl = z.string().url().startsWith('http', { message: 'Must be HTTP/HTTPS URL' });
const wsUrl = z
  .string()
  .regex(/^wss?:\/\//, { message: 'Must be WebSocket URL (ws:// or wss://)' });

/**
 * Ethereum address validation (0x prefixed, 40 hex chars)
 */
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Must be valid Ethereum address (0x + 40 hex chars)' });

/**
 * Private key validation (0x prefixed, 64 hex chars)
 */
const privateKey = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, { message: 'Must be valid private key (0x + 64 hex chars)' });

/**
 * API key validation (non-empty, no placeholder values)
 */
const placeholderPatterns = [
  'your',
  'replace',
  'enter',
  'insert',
  'api-key-here',
  'xxx',
  'placeholder',
];
const apiKey = z
  .string()
  .min(10, { message: 'API key too short' })
  .refine(
    (val) => {
      const lower = val.toLowerCase();
      return !placeholderPatterns.some((pattern) => lower.includes(pattern));
    },
    {
      message: 'Placeholder value detected - replace with real API key',
    }
  );

/**
 * Boolean string validation
 */
const booleanString = z.enum(['true', 'false']).transform((val) => val === 'true');

/**
 * Numeric string validation
 */
const numericString = (options?: { min?: number; max?: number }) =>
  z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .min(options?.min ?? -Infinity)
        .max(options?.max ?? Infinity)
    );

/**
 * RPC Configuration Schema
 */
export const RpcConfigSchema = z.object({
  // Primary RPC URLs
  ETHEREUM_RPC_URL: httpUrl.optional(),
  MAINNET_RPC_URL: httpUrl.optional(),
  POLYGON_RPC_URL: httpUrl.optional(),
  ARBITRUM_RPC_URL: httpUrl.optional(),
  OPTIMISM_RPC_URL: httpUrl.optional(),
  BASE_RPC_URL: httpUrl,
  BSC_RPC_URL: httpUrl.optional(),
  L2_RPC_URL: httpUrl.optional(),
  RPC_URL: httpUrl.optional(),
  SOLANA_RPC_URL: httpUrl.optional(),

  // Backup RPC URLs
  ETHEREUM_RPC_URL_BACKUP: httpUrl.optional(),
  ARBITRUM_RPC_URL_BACKUP: httpUrl.optional(),
  POLYGON_RPC_URL_BACKUP: httpUrl.optional(),
  OPTIMISM_RPC_URL_BACKUP: httpUrl.optional(),
  BASE_RPC_URL_BACKUP: httpUrl.optional(),
  BASE_RPC_URL_BACKUP_2: httpUrl.optional(),
  BASE_RPC_URL_BACKUP_3: httpUrl.optional(),

  // WebSocket URLs
  INFURA_WS_URL: wsUrl.optional(),
  ALCHEMY_WS_URL: wsUrl.optional(),
  SOLANA_WS_URL: wsUrl.optional(),

  // Testnet URLs
  GOERLI_RPC_URL: httpUrl.optional(),
  BASE_SEPOLIA_RPC_URL: httpUrl.optional(),
});

/**
 * Wallet Configuration Schema
 */
export const WalletConfigSchema = z.object({
  WALLET_PRIVATE_KEY: z.union([privateKey, z.literal('ask_operator')]),
});

/**
 * API Keys Configuration Schema
 */
export const ApiKeysSchema = z.object({
  ALCHEMY_API_KEY: apiKey.optional(),
  INFURA_API_KEY: apiKey.optional(),
  ETHERSCAN_API_KEY: apiKey.optional(),
  POLYGONSCAN_API_KEY: apiKey.optional(),
  ARBISCAN_API_KEY: apiKey.optional(),
  OPTIMISTIC_ETHERSCAN_API_KEY: apiKey.optional(),
  BASESCAN_API_KEY: apiKey.optional(),
});

/**
 * Database Configuration Schema
 */
export const DatabaseConfigSchema = z.object({
  TIMESCALEDB_HOST: z.string().optional(),
  TIMESCALEDB_PORT: numericString({ min: 1, max: 65535 }).optional(),
  TIMESCALEDB_DATABASE: z.string().optional(),
  TIMESCALEDB_USER: z.string().optional(),
  TIMESCALEDB_PASSWORD: z.string().optional(),
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

/**
 * Redis Configuration Schema
 */
export const RedisConfigSchema = z.object({
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: numericString({ min: 1, max: 65535 }).optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

/**
 * Performance Configuration Schema
 */
export const PerformanceConfigSchema = z.object({
  SCAN_INTERVAL: numericString({ min: 100, max: 60000 }).optional(),
  CONCURRENCY: numericString({ min: 1, max: 100 }).optional(),
  TARGET_THROUGHPUT: numericString({ min: 1 }).optional(),
  MIN_PROFIT_THRESHOLD: numericString({ min: 0 }).optional(),
  MIN_PROFIT_PERCENT: numericString({ min: 0, max: 100 }).optional(),
  MIN_PROFIT_ABSOLUTE: numericString({ min: 0 }).optional(),
  MAX_SLIPPAGE: numericString({ min: 0, max: 1 }).optional(),
  MAX_SLIPPAGE_PERCENT: numericString({ min: 0, max: 100 }).optional(),
  MAX_GAS_PRICE: numericString({ min: 1 }).optional(),
  MAX_GAS_COST_PERCENTAGE: numericString({ min: 0, max: 100 }).optional(),
});

/**
 * Liquidity Configuration Schema
 */
export const LiquidityConfigSchema = z.object({
  MIN_LIQUIDITY: numericString({ min: 0 }).optional(),
  MIN_LIQUIDITY_V3: numericString({ min: 0 }).optional(),
  MIN_LIQUIDITY_V3_LOW: numericString({ min: 0 }).optional(),
  MIN_LIQUIDITY_V2: numericString({ min: 0 }).optional(),
});

/**
 * Transaction Configuration Schema
 */
export const TransactionConfigSchema = z.object({
  TX_TIMEOUT: numericString({ min: 1000 }).optional(),
  TX_RETRY_COUNT: numericString({ min: 0, max: 10 }).optional(),
  TX_PRIORITY: z.enum(['low', 'medium', 'high', 'instant']).optional(),
  TX_MAX_PENDING: numericString({ min: 1 }).optional(),
  NONCE_MANAGEMENT: z.enum(['auto', 'manual']).optional(),
});

/**
 * Feature Flags Schema
 */
export const FeatureFlagsSchema = z.object({
  ENABLE_ML_PREDICTIONS: booleanString.optional(),
  ENABLE_CROSS_CHAIN: booleanString.optional(),
  ENABLE_LAYER2: booleanString.optional(),
  ENABLE_UNISWAP_V2: booleanString.optional(),
  ENABLE_UNISWAP_V3: booleanString.optional(),
  ENABLE_SUSHISWAP: booleanString.optional(),
  ENABLE_PANCAKESWAP: booleanString.optional(),
  ENABLE_CURVE: booleanString.optional(),
  ENABLE_BALANCER: booleanString.optional(),
  ENABLE_PRIVATE_RPC: booleanString.optional(),
});

/**
 * AI Configuration Schema
 */
export const AiConfigSchema = z.object({
  GEMINI_API_KEY: apiKey.optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_CITADEL_MODE: booleanString.optional(),
  OPENAI_API_KEY: apiKey.optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_ORGANIZATION: z.string().optional(),
  GITHUB_COPILOT_API_KEY: apiKey.optional(),
  GITHUB_COPILOT_MODEL: z.string().optional(),
  AI_PROVIDER_FALLBACK_CHAIN: z.string().optional(),
  AI_CITADEL_MODE_ENABLED: booleanString.optional(),
  AI_CITADEL_TEMPERATURE: numericString({ min: 0, max: 1 }).optional(),
  AI_CITADEL_MAX_TOKENS: numericString({ min: 1 }).optional(),
});

/**
 * MEV Configuration Schema
 */
export const MevConfigSchema = z.object({
  MEV_RISK_BASE: numericString({ min: 0 }).optional(),
  MEV_VALUE_SENSITIVITY: numericString({ min: 0, max: 1 }).optional(),
  MEV_CONGESTION_FACTOR: numericString({ min: 0, max: 1 }).optional(),
  MEV_SEARCHER_DENSITY: numericString({ min: 0, max: 1 }).optional(),
  MEV_PROFIT_ADJUSTMENT: booleanString.optional(),
  MEV_RISK_THRESHOLD: numericString({ min: 0, max: 1 }).optional(),
  SENSOR_UPDATE_INTERVAL: numericString({ min: 100 }).optional(),
  MEMPOOL_MONITORING_ENABLED: booleanString.optional(),
  SEARCHER_DETECTION_ENABLED: booleanString.optional(),
});

/**
 * Private RPC Configuration Schema
 */
export const PrivateRpcConfigSchema = z.object({
  PRIVATE_RPC_PRIVACY_LEVEL: z.enum(['none', 'basic', 'enhanced', 'maximum']).optional(),
  FLASHBOTS_RPC_URL: httpUrl.optional(),
  FLASHBOTS_AUTH_KEY: z.string().optional(),
  MEV_SHARE_RPC_URL: httpUrl.optional(),
  MEV_SHARE_AUTH_KEY: z.string().optional(),
  PRIVATE_RPC_TIMEOUT: numericString({ min: 1000 }).optional(),
  PRIVATE_RPC_FALLBACK: booleanString.optional(),
  PRIVATE_RPC_FAST_MODE: booleanString.optional(),
});

/**
 * Cognitive Configuration Schema
 */
export const CognitiveConfigSchema = z.object({
  COGNITIVE_LEARNING_RATE: numericString({ min: 0, max: 1 }).optional(),
  COGNITIVE_SELF_AWARENESS: numericString({ min: 0, max: 1 }).optional(),
  COGNITIVE_CONSENSUS_THRESHOLD: numericString({ min: 0, max: 1 }).optional(),
  WEIGHT_LEARNING_ENGINE: numericString({ min: 0, max: 1 }).optional(),
  WEIGHT_PATTERN_TRACKER: numericString({ min: 0, max: 1 }).optional(),
  WEIGHT_OPPORTUNITY_SCORER: numericString({ min: 0, max: 1 }).optional(),
  WEIGHT_RISK_ASSESSOR: numericString({ min: 0, max: 1 }).optional(),
  WEIGHT_AUTONOMOUS_GOALS: numericString({ min: 0, max: 1 }).optional(),
});

/**
 * Emergence Detection Configuration Schema
 */
export const EmergenceConfigSchema = z.object({
  EMERGENCE_MIN_MODULES: numericString({ min: 1 }).optional(),
  EMERGENCE_MAX_RISK_SCORE: numericString({ min: 0, max: 1 }).optional(),
  EMERGENCE_MIN_ETHICAL_SCORE: numericString({ min: 0, max: 1 }).optional(),
  EMERGENCE_MIN_GOAL_ALIGNMENT: numericString({ min: 0, max: 1 }).optional(),
  EMERGENCE_MIN_PATTERN_CONFIDENCE: numericString({ min: 0, max: 1 }).optional(),
  EMERGENCE_MIN_HISTORICAL_SUCCESS: numericString({ min: 0, max: 1 }).optional(),
  EMERGENCE_MAX_DISSENT_RATIO: numericString({ min: 0, max: 1 }).optional(),
  EMERGENCE_DETECTION_ENABLED: booleanString.optional(),
  EMERGENCE_AUTO_EXECUTE: booleanString.optional(),
});

/**
 * Memory Configuration Schema
 */
export const MemoryConfigSchema = z.object({
  MEMORY_IMPORTANCE_THRESHOLD: numericString({ min: 0, max: 1 }).optional(),
  MEMORY_ACCESS_COUNT_THRESHOLD: numericString({ min: 1 }).optional(),
  MEMORY_MIN_AGE_MS: numericString({ min: 0 }).optional(),
  MEMORY_CONSOLIDATION_INTERVAL_MS: numericString({ min: 1000 }).optional(),
  MEMORY_SHORT_TERM_CAPACITY: numericString({ min: 1 }).optional(),
  MEMORY_WORKING_CAPACITY: numericString({ min: 1 }).optional(),
  MEMORY_MAX_LONG_TERM: numericString({ min: 1 }).optional(),
  MEMORY_PRUNE_CUTOFF: numericString({ min: 0, max: 1 }).optional(),
  MEMORY_PRUNE_ENABLED: booleanString.optional(),
  MEMORY_PRESERVE_LONG_TERM: booleanString.optional(),
  MEMORY_ASSOCIATION_ENABLED: booleanString.optional(),
  MEMORY_ASSOCIATION_THRESHOLD: numericString({ min: 0, max: 1 }).optional(),
  MEMORY_BACKGROUND_ENABLED: booleanString.optional(),
});

/**
 * Logging Configuration Schema
 */
export const LoggingConfigSchema = z.object({
  ENABLE_LOGGING: booleanString.optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).optional(),
  LOG_FORMAT: z.enum(['json', 'pretty']).optional(),
  LOG_FILE_PATH: z.string().optional(),
  LOG_FILE: booleanString.optional(),
  LOG_DIR: z.string().optional(),
  LOG_COLORS: booleanString.optional(),
  LOG_MAX_FILES: numericString({ min: 1 }).optional(),
  DEBUG: booleanString.optional(),
  PINO_PRETTY_ENABLED: booleanString.optional(),
});

/**
 * Security Configuration Schema
 */
export const SecurityConfigSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(64, { message: 'JWT secret must be at least 64 characters for production security' }),
  SECRETS_ENCRYPTION_KEY: z
    .string()
    .length(64, { message: 'Must be 64 hex characters (32 bytes)' }),
  AUDIT_ENCRYPTION_KEY: z.string().length(64, { message: 'Must be 64 hex characters (32 bytes)' }),
  MULTI_SIG_ADDRESS: ethereumAddress.optional(),
  MULTI_SIG_THRESHOLD: numericString({ min: 1 }).optional(),
  CORS_ORIGIN: z.string().optional(),
});

/**
 * Runtime Configuration Schema
 */
export const RuntimeConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: numericString({ min: 1, max: 65535 }).optional(),
  DRY_RUN: booleanString.optional(),
  CHAIN_ID: numericString({ min: 1 }).optional(),
  SCAN_CHAINS: z.string().optional(),
});

/**
 * Circuit Breaker Configuration Schema
 */
export const CircuitBreakerConfigSchema = z.object({
  CIRCUIT_BREAKER_ENABLED: booleanString.optional(),
  CIRCUIT_BREAKER_MAX_LOSS: numericString({ min: 0 }).optional(),
  CIRCUIT_BREAKER_MAX_CONSECUTIVE_FAILURES: numericString({ min: 1 }).optional(),
  CIRCUIT_BREAKER_COOLDOWN_PERIOD: numericString({ min: 0 }).optional(),
  EMERGENCY_STOP_ENABLED: booleanString.optional(),
  EMERGENCY_STOP_MAX_SLIPPAGE: numericString({ min: 0, max: 100 }).optional(),
  EMERGENCY_STOP_MIN_BALANCE: numericString({ min: 0 }).optional(),
  MAX_POSITION_SIZE: numericString({ min: 0 }).optional(),
  POSITION_SIZE_PERCENT: numericString({ min: 0, max: 100 }).optional(),
  MIN_POSITION_SIZE: numericString({ min: 0 }).optional(),
  MAX_TRADES_PER_HOUR: numericString({ min: 1 }).optional(),
  MAX_DAILY_LOSS: numericString({ min: 0 }).optional(),
});

/**
 * Complete Environment Configuration Schema
 *
 * Uses passthrough to allow additional fields while validating known fields.
 * This avoids TypeScript depth limits from merging many schemas.
 */
export const EnvConfigSchema = z
  .object({
    // RPC Configuration
    ETHEREUM_RPC_URL: httpUrl.optional(),
    MAINNET_RPC_URL: httpUrl.optional(),
    POLYGON_RPC_URL: httpUrl.optional(),
    ARBITRUM_RPC_URL: httpUrl.optional(),
    OPTIMISM_RPC_URL: httpUrl.optional(),
    BASE_RPC_URL: httpUrl,
    BSC_RPC_URL: httpUrl.optional(),
    L2_RPC_URL: httpUrl.optional(),
    RPC_URL: httpUrl.optional(),
    SOLANA_RPC_URL: httpUrl.optional(),
    ETHEREUM_RPC_URL_BACKUP: httpUrl.optional(),
    ARBITRUM_RPC_URL_BACKUP: httpUrl.optional(),
    POLYGON_RPC_URL_BACKUP: httpUrl.optional(),
    OPTIMISM_RPC_URL_BACKUP: httpUrl.optional(),
    BASE_RPC_URL_BACKUP: httpUrl.optional(),
    BASE_RPC_URL_BACKUP_2: httpUrl.optional(),
    BASE_RPC_URL_BACKUP_3: httpUrl.optional(),
    INFURA_WS_URL: wsUrl.optional(),
    ALCHEMY_WS_URL: wsUrl.optional(),
    SOLANA_WS_URL: wsUrl.optional(),
    GOERLI_RPC_URL: httpUrl.optional(),
    BASE_SEPOLIA_RPC_URL: httpUrl.optional(),

    // Wallet Configuration
    WALLET_PRIVATE_KEY: z.union([privateKey, z.literal('ask_operator')]),

    // API Keys
    ALCHEMY_API_KEY: apiKey.optional(),
    INFURA_API_KEY: apiKey.optional(),
    ETHERSCAN_API_KEY: apiKey.optional(),
    POLYGONSCAN_API_KEY: apiKey.optional(),
    ARBISCAN_API_KEY: apiKey.optional(),
    OPTIMISTIC_ETHERSCAN_API_KEY: apiKey.optional(),
    BASESCAN_API_KEY: apiKey.optional(),

    // Runtime Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: numericString({ min: 1, max: 65535 }).optional(),
    DRY_RUN: booleanString.optional(),
    CHAIN_ID: numericString({ min: 1 }).optional(),
    SCAN_CHAINS: z.string().optional(),

    // Security Configuration
    JWT_SECRET: z
      .string()
      .min(64, { message: 'JWT secret must be at least 64 characters for production security' }),
    SECRETS_ENCRYPTION_KEY: z
      .string()
      .length(64, { message: 'Must be 64 hex characters (32 bytes)' }),
    AUDIT_ENCRYPTION_KEY: z
      .string()
      .length(64, { message: 'Must be 64 hex characters (32 bytes)' }),
    MULTI_SIG_ADDRESS: ethereumAddress.optional(),
    MULTI_SIG_THRESHOLD: numericString({ min: 1 }).optional(),
    CORS_ORIGIN: z.string().optional(),

    // Performance Configuration
    SCAN_INTERVAL: numericString({ min: 100, max: 60000 }).optional(),
    CONCURRENCY: numericString({ min: 1, max: 100 }).optional(),
    TARGET_THROUGHPUT: numericString({ min: 1 }).optional(),
    MIN_PROFIT_THRESHOLD: numericString({ min: 0 }).optional(),
    MIN_PROFIT_PERCENT: numericString({ min: 0, max: 100 }).optional(),
    MIN_PROFIT_ABSOLUTE: numericString({ min: 0 }).optional(),
    MAX_SLIPPAGE: numericString({ min: 0, max: 1 }).optional(),
    MAX_SLIPPAGE_PERCENT: numericString({ min: 0, max: 100 }).optional(),
    MAX_GAS_PRICE: numericString({ min: 1 }).optional(),
    MAX_GAS_COST_PERCENTAGE: numericString({ min: 0, max: 100 }).optional(),

    // Feature Flags
    ENABLE_ML_PREDICTIONS: booleanString.optional(),
    ENABLE_CROSS_CHAIN: booleanString.optional(),
    ENABLE_LAYER2: booleanString.optional(),
    ENABLE_UNISWAP_V2: booleanString.optional(),
    ENABLE_UNISWAP_V3: booleanString.optional(),
    ENABLE_SUSHISWAP: booleanString.optional(),
    ENABLE_PANCAKESWAP: booleanString.optional(),
    ENABLE_CURVE: booleanString.optional(),
    ENABLE_BALANCER: booleanString.optional(),
    ENABLE_PRIVATE_RPC: booleanString.optional(),

    // Logging Configuration
    ENABLE_LOGGING: booleanString.optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).optional(),
    LOG_FORMAT: z.enum(['json', 'pretty']).optional(),
    LOG_FILE_PATH: z.string().optional(),
    LOG_FILE: booleanString.optional(),
    LOG_DIR: z.string().optional(),
    LOG_COLORS: booleanString.optional(),
    LOG_MAX_FILES: numericString({ min: 1 }).optional(),
    DEBUG: booleanString.optional(),
    PINO_PRETTY_ENABLED: booleanString.optional(),

    // AI Configuration
    GEMINI_API_KEY: apiKey.optional(),
    GEMINI_MODEL: z.string().optional(),
    GEMINI_CITADEL_MODE: booleanString.optional(),
    OPENAI_API_KEY: apiKey.optional(),
    OPENAI_MODEL: z.string().optional(),
    AI_CITADEL_MODE_ENABLED: booleanString.optional(),
  })
  .passthrough(); // Allow additional fields from process.env

/**
 * Type inference for environment configuration
 */
export type EnvConfig = z.infer<typeof EnvConfigSchema>;

/**
 * Validation result interface
 */
export interface EnvValidationResult {
  success: boolean;
  data?: EnvConfig;
  errors?: z.ZodError;
  errorMessages?: string[];
}

/**
 * Validate environment configuration
 *
 * @param env - Environment variables object (defaults to process.env)
 * @returns Validation result with parsed data or error messages
 *
 * @example
 * ```typescript
 * import { validateEnv } from './env-schema';
 *
 * const result = validateEnv();
 * if (!result.success) {
 *   console.error('Environment validation failed:', result.errorMessages);
 *   process.exit(1);
 * }
 *
 * // result.data is now type-safe
 * console.log('Base RPC:', result.data.BASE_RPC_URL);
 * ```
 */
export function validateEnv(
  env: Record<string, string | undefined> = process.env
): EnvValidationResult {
  const result = EnvConfigSchema.safeParse(env);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errorMessages = result.error.issues.map((err: z.ZodIssue) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return {
    success: false,
    errors: result.error,
    errorMessages,
  };
}

/**
 * Validate and throw on error
 *
 * @param env - Environment variables object
 * @throws Error if validation fails
 * @returns Validated and parsed environment configuration
 *
 * @example
 * ```typescript
 * import { validateEnvOrThrow } from './env-schema';
 *
 * // Will throw if validation fails
 * const config = validateEnvOrThrow();
 * ```
 */
export function validateEnvOrThrow(
  env: Record<string, string | undefined> = process.env
): EnvConfig {
  const result = validateEnv(env);

  if (!result.success) {
    const errorList = result.errorMessages?.join('\n  - ') || 'Unknown validation error';
    throw new Error(`Environment validation failed:\n  - ${errorList}`);
  }

  return result.data!;
}

/**
 * Get a specific section of the environment configuration
 *
 * @param section - The configuration section to validate
 * @param env - Environment variables object
 * @returns Validation result for the specific section
 */
export function validateEnvSection<T extends z.ZodTypeAny>(
  section: T,
  env: Record<string, string | undefined> = process.env
): { success: boolean; data?: z.infer<T>; errorMessages?: string[] } {
  const result = section.safeParse(env);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages = result.error.issues.map((err: z.ZodIssue) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return { success: false, errorMessages };
}
