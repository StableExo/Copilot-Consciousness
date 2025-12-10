/**
 * Profitable Infrastructure Configuration
 * 
 * Centralized configuration for:
 * - CEX-DEX arbitrage monitoring (Rank #5 priority - $10k-$25k/month)
 * - bloXroute mempool streaming (Rank #1/#2 priority - $15k-$30k/month)
 * 
 * These systems enable TheWarden to operate profitably without external funding.
 */

import { CEXExchange } from '../execution/cex/types.js';

/**
 * CEX Monitoring Configuration
 */
export interface CEXMonitoringConfig {
  enabled: boolean;
  exchanges: {
    exchange: CEXExchange;
    symbols: string[];
    testnet?: boolean;
  }[];
  updateInterval: number; // milliseconds
  minSpreadBps: number; // basis points (10 bps = 0.1%)
  
  // Arbitrage detection settings
  minPriceDiffPercent: number;
  maxTradeSizeUsd: number;
  minNetProfitUsd: number;
  
  // Fee configuration (percentages)
  fees: {
    binance: number;
    coinbase: number;
    okx: number;
    bybit: number;
    kraken: number;
    dex: number; // Default DEX fee (Uniswap V3 = 0.3%)
  };
}

/**
 * bloXroute Configuration
 */
export interface BloXrouteConfig {
  enabled: boolean;
  apiKey?: string;
  authHeader?: string;
  
  // Mempool streaming
  enableMempoolStream: boolean;
  streamType: 'newTxs' | 'pendingTxs' | 'onBlock';
  batchSize: number;
  batchTimeout: number; // milliseconds
  
  // Network and region
  chains: string[]; // e.g., ['ethereum', 'base', 'arbitrum']
  region: 'virginia' | 'singapore' | 'frankfurt' | 'london';
  
  // Filtering
  enableDexSwapDetection: boolean;
  enableLargeTransferDetection: boolean;
  largeTransferThresholdEth: number;
  
  // Performance
  verbose: boolean;
}

/**
 * Profitable Infrastructure Configuration
 */
export interface ProfitableInfrastructureConfig {
  cex: CEXMonitoringConfig;
  bloxroute: BloXrouteConfig;
}

/**
 * Load CEX configuration from environment variables
 */
export function loadCEXConfig(): CEXMonitoringConfig {
  const enabled = process.env.ENABLE_CEX_MONITOR === 'true';
  
  // Parse exchanges from env (comma-separated: binance,coinbase,okx)
  const exchangeList = (process.env.CEX_EXCHANGES || 'binance')
    .split(',')
    .map(e => e.trim().toLowerCase());
  
  // Parse symbols from env (comma-separated: BTC/USDT,ETH/USDC)
  const symbols = (process.env.CEX_SYMBOLS || 'BTC/USDT,ETH/USDC,ETH/USDT')
    .split(',')
    .map(s => s.trim());
  
  // Map exchange names to CEXExchange enum
  const exchanges = exchangeList.map(name => {
    let exchange: CEXExchange;
    switch (name) {
      case 'binance':
        exchange = CEXExchange.BINANCE;
        break;
      case 'coinbase':
        exchange = CEXExchange.COINBASE;
        break;
      case 'okx':
        exchange = CEXExchange.OKX;
        break;
      case 'bybit':
        exchange = CEXExchange.BYBIT;
        break;
      case 'kraken':
        exchange = CEXExchange.KRAKEN;
        break;
      default:
        throw new Error(`Unknown CEX exchange: ${name}`);
    }
    
    return {
      exchange,
      symbols,
      testnet: process.env.CEX_TESTNET === 'true',
    };
  });
  
  return {
    enabled,
    exchanges,
    updateInterval: parseInt(process.env.CEX_UPDATE_INTERVAL || '1000'),
    minSpreadBps: parseInt(process.env.CEX_MIN_SPREAD_BPS || '10'),
    
    // Arbitrage detection
    minPriceDiffPercent: parseFloat(process.env.CEX_DEX_MIN_PRICE_DIFF_PERCENT || '0.5'),
    maxTradeSizeUsd: parseFloat(process.env.CEX_DEX_MAX_TRADE_SIZE || '10000'),
    minNetProfitUsd: parseFloat(process.env.CEX_DEX_MIN_NET_PROFIT || '10'),
    
    // Fees
    fees: {
      binance: parseFloat(process.env.BINANCE_FEE_PERCENT || '0.1'),
      coinbase: parseFloat(process.env.COINBASE_FEE_PERCENT || '0.6'),
      okx: parseFloat(process.env.OKX_FEE_PERCENT || '0.1'),
      bybit: parseFloat(process.env.BYBIT_FEE_PERCENT || '0.1'),
      kraken: parseFloat(process.env.KRAKEN_FEE_PERCENT || '0.26'),
      dex: parseFloat(process.env.DEX_FEE_PERCENT || '0.3'),
    },
  };
}

/**
 * Load bloXroute configuration from environment variables
 */
export function loadBloXrouteConfig(): BloXrouteConfig {
  const enabled = process.env.ENABLE_BLOXROUTE === 'true';
  const enableMempoolStream = process.env.BLOXROUTE_ENABLE_MEMPOOL_STREAM === 'true';
  
  // Parse chains (comma-separated: ethereum,base,arbitrum)
  const chains = (process.env.BLOXROUTE_CHAINS || 'base')
    .split(',')
    .map(c => c.trim().toLowerCase());
  
  // Stream type
  const streamType = (process.env.BLOXROUTE_STREAM_TYPE || 'pendingTxs') as 'newTxs' | 'pendingTxs' | 'onBlock';
  
  return {
    enabled,
    apiKey: process.env.BLOXROUTE_API_KEY,
    authHeader: process.env.BLOXROUTE_AUTH_HEADER,
    
    enableMempoolStream,
    streamType,
    batchSize: parseInt(process.env.BLOXROUTE_STREAM_BATCH_SIZE || '1'),
    batchTimeout: parseInt(process.env.BLOXROUTE_STREAM_BATCH_TIMEOUT || '100'),
    
    chains,
    region: (process.env.BLOXROUTE_REGION || 'virginia') as 'virginia' | 'singapore' | 'frankfurt' | 'london',
    
    enableDexSwapDetection: process.env.BLOXROUTE_ENABLE_DEX_SWAP_DETECTION !== 'false', // Default true
    enableLargeTransferDetection: process.env.BLOXROUTE_ENABLE_LARGE_TRANSFER_DETECTION !== 'false', // Default true
    largeTransferThresholdEth: parseFloat(process.env.BLOXROUTE_LARGE_TRANSFER_THRESHOLD_ETH || '1.0'),
    
    verbose: process.env.BLOXROUTE_VERBOSE === 'true',
  };
}

/**
 * Load complete profitable infrastructure configuration
 */
export function loadProfitableInfrastructureConfig(): ProfitableInfrastructureConfig {
  return {
    cex: loadCEXConfig(),
    bloxroute: loadBloXrouteConfig(),
  };
}

/**
 * Validate profitable infrastructure configuration
 */
export function validateProfitableInfrastructureConfig(config: ProfitableInfrastructureConfig): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Validate CEX config
  if (config.cex.enabled) {
    if (config.cex.exchanges.length === 0) {
      errors.push('CEX monitoring enabled but no exchanges configured');
    }
    
    if (config.cex.minPriceDiffPercent < 0.1) {
      warnings.push(`CEX min price diff ${config.cex.minPriceDiffPercent}% may be too low (recommended: 0.5%+)`);
    }
    
    if (config.cex.minNetProfitUsd < 5) {
      warnings.push(`CEX min net profit $${config.cex.minNetProfitUsd} may be too low (recommended: $10+)`);
    }
  }
  
  // Validate bloXroute config
  if (config.bloxroute.enabled) {
    if (!config.bloxroute.apiKey && !config.bloxroute.authHeader) {
      warnings.push('bloXroute enabled but no API key or auth header configured (may use free tier)');
    }
    
    if (config.bloxroute.enableMempoolStream && config.bloxroute.chains.length === 0) {
      errors.push('bloXroute mempool stream enabled but no chains configured');
    }
    
    if (config.bloxroute.batchSize > 100) {
      warnings.push(`bloXroute batch size ${config.bloxroute.batchSize} may cause high latency (recommended: 1-10)`);
    }
  }
  
  // Cross-validation
  if (!config.cex.enabled && !config.bloxroute.enabled) {
    warnings.push('No profitable infrastructure enabled - consider enabling CEX and/or bloXroute');
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get expected monthly revenue from profitable infrastructure
 */
export function getExpectedMonthlyRevenue(config: ProfitableInfrastructureConfig): {
  cexMin: number;
  cexMax: number;
  bloxrouteMin: number;
  bloxrouteMax: number;
  totalMin: number;
  totalMax: number;
} {
  // CEX-DEX arbitrage: $10k-$25k/month (conservative estimates)
  const cexMin = config.cex.enabled ? 10000 : 0;
  const cexMax = config.cex.enabled ? 25000 : 0;
  
  // bloXroute advantage: $15k-$30k/month (conservative estimates)
  const bloxrouteMin = config.bloxroute.enabled && config.bloxroute.enableMempoolStream ? 15000 : 0;
  const bloxrouteMax = config.bloxroute.enabled && config.bloxroute.enableMempoolStream ? 30000 : 0;
  
  return {
    cexMin,
    cexMax,
    bloxrouteMin,
    bloxrouteMax,
    totalMin: cexMin + bloxrouteMin,
    totalMax: cexMax + bloxrouteMax,
  };
}

/**
 * Get infrastructure costs (monthly)
 */
export function getInfrastructureCosts(config: ProfitableInfrastructureConfig): {
  cex: number;
  bloxroute: number;
  total: number;
} {
  // CEX: Free (all WebSocket APIs are free)
  const cexCost = 0;
  
  // bloXroute: Free tier ($0) or Professional ($300/month)
  // Assume free tier for now, upgrade when revenue > $25k/month
  const bloxrouteCost = 0; // Can be upgraded to 300 when needed
  
  return {
    cex: cexCost,
    bloxroute: bloxrouteCost,
    total: cexCost + bloxrouteCost,
  };
}
