/**
 * Real-Time Monitoring Configuration
 * 
 * Configuration for WebSocket-based monitoring of DEX liquidity pools
 * and event-driven arbitrage triggers
 */

/**
 * WebSocket endpoint configuration
 */
export interface WebSocketEndpoint {
  url: string;
  description: string;
  priority: number;
}

/**
 * Pool monitoring configuration
 */
export interface PoolMonitorConfig {
  address: string;
  dex: string;
  network: string;
  tokens: [string, string]; // Token pair
  enabled: boolean;
}

/**
 * Event filtering criteria
 */
export interface EventFilterConfig {
  minLiquidity: bigint; // Minimum liquidity to trigger event
  maxPriceImpact: number; // Maximum acceptable price impact (0-1)
  minPriceDelta: number; // Minimum price change to trigger (0-1)
}

/**
 * Profitability thresholds
 */
export interface ProfitabilityConfig {
  minProfitPercent: number; // Minimum profit percentage (0-100)
  maxSlippagePercent: number; // Maximum slippage percentage (0-100)
  minProfitAbsolute: bigint; // Minimum absolute profit in wei
}

/**
 * Connection retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number; // Exponential backoff multiplier
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  enableUniswapV2: boolean;
  enableUniswapV3: boolean;
  enableSushiSwap: boolean;
  enableCurve: boolean;
  enableBalancer: boolean;
  enableBackpressure: boolean;
  enableDebouncing: boolean;
}

/**
 * Real-time monitoring configuration
 */
export interface RealtimeConfig {
  websocketEndpoints: WebSocketEndpoint[];
  poolMonitors: PoolMonitorConfig[];
  eventFilter: EventFilterConfig;
  profitability: ProfitabilityConfig;
  retry: RetryConfig;
  features: FeatureFlags;
  metrics: {
    trackThroughput: boolean;
    trackLatency: boolean;
    trackOpportunities: boolean;
  };
  backpressure: {
    maxQueueSize: number;
    dropStrategy: 'oldest' | 'newest' | 'none';
  };
  debounce: {
    windowMs: number; // Debounce window in milliseconds
  };
}

/**
 * Default real-time monitoring configuration
 */
export const defaultRealtimeConfig: RealtimeConfig = {
  websocketEndpoints: [
    {
      url: process.env.INFURA_WS_URL || 'wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID',
      description: 'Infura WebSocket (Primary)',
      priority: 1,
    },
    {
      url: process.env.ALCHEMY_WS_URL || 'wss://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY',
      description: 'Alchemy WebSocket (Fallback)',
      priority: 2,
    },
  ],
  poolMonitors: [
    // Example pools - should be configured based on actual deployment
    // {
    //   address: '0x...',
    //   dex: 'Uniswap V2',
    //   network: '1',
    //   tokens: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'], // WETH/USDC
    //   enabled: true,
    // },
  ],
  eventFilter: {
    minLiquidity: BigInt('100000000000000000000000'), // 100,000 tokens (18 decimals)
    maxPriceImpact: 0.03, // 3%
    minPriceDelta: 0.001, // 0.1%
  },
  profitability: {
    minProfitPercent: 0.5, // 0.5%
    maxSlippagePercent: 1.0, // 1%
    minProfitAbsolute: BigInt('100000000000000000'), // 0.1 ETH
  },
  retry: {
    maxAttempts: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 60000, // 1 minute
    backoffMultiplier: 2,
  },
  features: {
    enableUniswapV2: true,
    enableUniswapV3: true,
    enableSushiSwap: true,
    enableCurve: true,
    enableBalancer: true,
    enableBackpressure: true,
    enableDebouncing: true,
  },
  metrics: {
    trackThroughput: true,
    trackLatency: true,
    trackOpportunities: true,
  },
  backpressure: {
    maxQueueSize: 1000,
    dropStrategy: 'oldest',
  },
  debounce: {
    windowMs: 100, // 100ms debounce window
  },
};

/**
 * Create a custom real-time configuration by merging with defaults
 */
export function createRealtimeConfig(overrides: Partial<RealtimeConfig> = {}): RealtimeConfig {
  return {
    websocketEndpoints: overrides.websocketEndpoints || defaultRealtimeConfig.websocketEndpoints,
    poolMonitors: overrides.poolMonitors || defaultRealtimeConfig.poolMonitors,
    eventFilter: { ...defaultRealtimeConfig.eventFilter, ...overrides.eventFilter },
    profitability: { ...defaultRealtimeConfig.profitability, ...overrides.profitability },
    retry: { ...defaultRealtimeConfig.retry, ...overrides.retry },
    features: { ...defaultRealtimeConfig.features, ...overrides.features },
    metrics: { ...defaultRealtimeConfig.metrics, ...overrides.metrics },
    backpressure: { ...defaultRealtimeConfig.backpressure, ...overrides.backpressure },
    debounce: { ...defaultRealtimeConfig.debounce, ...overrides.debounce },
  };
}

/**
 * Validate real-time configuration
 */
export function validateRealtimeConfig(config: RealtimeConfig): boolean {
  // Validate websocket endpoints
  if (!config.websocketEndpoints || config.websocketEndpoints.length === 0) {
    return false;
  }

  // Validate event filter
  if (config.eventFilter.minLiquidity < 0n) return false;
  if (config.eventFilter.maxPriceImpact < 0 || config.eventFilter.maxPriceImpact > 1) return false;
  if (config.eventFilter.minPriceDelta < 0 || config.eventFilter.minPriceDelta > 1) return false;

  // Validate profitability
  if (config.profitability.minProfitPercent < 0 || config.profitability.minProfitPercent > 100)
    return false;
  if (
    config.profitability.maxSlippagePercent < 0 ||
    config.profitability.maxSlippagePercent > 100
  )
    return false;
  if (config.profitability.minProfitAbsolute < 0n) return false;

  // Validate retry
  if (config.retry.maxAttempts < 1) return false;
  if (config.retry.baseDelay < 0) return false;
  if (config.retry.maxDelay < config.retry.baseDelay) return false;
  if (config.retry.backoffMultiplier < 1) return false;

  // Validate backpressure
  if (config.backpressure.maxQueueSize < 1) return false;

  // Validate debounce
  if (config.debounce.windowMs < 0) return false;

  return true;
}
