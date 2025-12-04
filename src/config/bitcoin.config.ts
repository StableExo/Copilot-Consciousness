/**
 * Bitcoin Network Configuration for TheWarden
 * 
 * Configuration for transitioning TheWarden from Base Network to Bitcoin Network.
 * Includes mempool monitoring, fee optimization, and MEV detection settings.
 */

export interface BitcoinNetworkConfig {
  enabled: boolean;
  mempoolApiKey: string;
  network: 'mainnet' | 'testnet' | 'signet';
  
  // Mempool monitoring
  enableWebSocket: boolean;
  pollingInterval: number; // seconds
  
  // Fee optimization
  minFeeRateThreshold: number; // sat/vB - minimum fee to consider
  maxFeeRateThreshold: number; // sat/vB - pause operations above this
  defaultFeeRate: number; // sat/vB - fallback when no data
  
  // MEV detection
  enableMEVDetection: boolean;
  highValueThreshold: number; // satoshis - TX value to flag as high-value
  
  // Consciousness integration
  enableConsciousnessIntegration: boolean;
  
  // RPC endpoints (for future Bitcoin RPC integration)
  bitcoinRpcUrl?: string;
  bitcoinRpcUser?: string;
  bitcoinRpcPassword?: string;
}

/**
 * Load Bitcoin network configuration from environment variables
 */
export function loadBitcoinNetworkConfig(): BitcoinNetworkConfig {
  return {
    enabled: process.env.BITCOIN_NETWORK_ENABLED === 'true',
    mempoolApiKey: process.env.MEMPOOL_API_KEY || '',
    network: (process.env.BITCOIN_NETWORK || 'mainnet') as 'mainnet' | 'testnet' | 'signet',
    
    // Mempool monitoring
    enableWebSocket: process.env.BITCOIN_WEBSOCKET_ENABLED !== 'false', // Default true
    pollingInterval: parseInt(process.env.BITCOIN_POLLING_INTERVAL || '30', 10),
    
    // Fee optimization
    minFeeRateThreshold: parseFloat(process.env.BITCOIN_MIN_FEE_RATE || '10'), // 10 sat/vB
    maxFeeRateThreshold: parseFloat(process.env.BITCOIN_MAX_FEE_RATE || '50'), // 50 sat/vB
    defaultFeeRate: parseFloat(process.env.BITCOIN_DEFAULT_FEE_RATE || '10'),
    
    // MEV detection
    enableMEVDetection: process.env.BITCOIN_MEV_DETECTION !== 'false', // Default true
    highValueThreshold: parseInt(process.env.BITCOIN_HIGH_VALUE_THRESHOLD || '100000000', 10), // 1 BTC
    
    // Consciousness integration
    enableConsciousnessIntegration: process.env.BITCOIN_CONSCIOUSNESS_ENABLED !== 'false',
    
    // RPC (optional)
    bitcoinRpcUrl: process.env.BITCOIN_RPC_URL,
    bitcoinRpcUser: process.env.BITCOIN_RPC_USER,
    bitcoinRpcPassword: process.env.BITCOIN_RPC_PASSWORD,
  };
}

/**
 * Validate Bitcoin network configuration
 */
export function validateBitcoinNetworkConfig(config: BitcoinNetworkConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if enabled but no API key
  if (config.enabled && !config.mempoolApiKey) {
    errors.push('MEMPOOL_API_KEY is required when BITCOIN_NETWORK_ENABLED=true');
  }
  
  // Validate API key format (should be 32 hex characters)
  if (config.mempoolApiKey && config.mempoolApiKey.length !== 32) {
    warnings.push(`MEMPOOL_API_KEY should be 32 characters (current: ${config.mempoolApiKey.length})`);
  }
  
  // Validate fee thresholds
  if (config.minFeeRateThreshold <= 0) {
    errors.push('BITCOIN_MIN_FEE_RATE must be > 0');
  }
  
  if (config.maxFeeRateThreshold < config.minFeeRateThreshold) {
    errors.push('BITCOIN_MAX_FEE_RATE must be >= BITCOIN_MIN_FEE_RATE');
  }
  
  // Validate polling interval
  if (config.pollingInterval < 10) {
    warnings.push('BITCOIN_POLLING_INTERVAL < 10 seconds may hit rate limits');
  }
  
  if (config.pollingInterval > 300) {
    warnings.push('BITCOIN_POLLING_INTERVAL > 300 seconds may miss opportunities');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get Bitcoin network name
 */
export function getBitcoinNetworkName(network: string): string {
  const names: Record<string, string> = {
    mainnet: 'Bitcoin Mainnet',
    testnet: 'Bitcoin Testnet',
    signet: 'Bitcoin Signet',
  };
  
  return names[network] || network;
}

/**
 * Get default configuration for quick start
 */
export function getDefaultBitcoinConfig(): BitcoinNetworkConfig {
  return {
    enabled: true,
    mempoolApiKey: '5d063afd314264c4b46da85342fe2555',
    network: 'mainnet',
    enableWebSocket: true,
    pollingInterval: 30,
    minFeeRateThreshold: 10,
    maxFeeRateThreshold: 50,
    defaultFeeRate: 10,
    enableMEVDetection: true,
    highValueThreshold: 100000000, // 1 BTC
    enableConsciousnessIntegration: true,
  };
}

export default {
  load: loadBitcoinNetworkConfig,
  validate: validateBitcoinNetworkConfig,
  getBitcoinNetworkName,
  getDefault: getDefaultBitcoinConfig,
};
