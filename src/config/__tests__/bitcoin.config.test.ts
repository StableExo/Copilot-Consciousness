/**
 * Tests for Bitcoin Network Configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BitcoinNetworkConfig,
  loadBitcoinNetworkConfig,
  validateBitcoinNetworkConfig,
  getBitcoinNetworkName,
  getDefaultBitcoinConfig,
} from '../bitcoin.config';

describe('Bitcoin Network Configuration', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });

  describe('loadBitcoinNetworkConfig', () => {
    it('should load default configuration when no env vars are set', () => {
      const config = loadBitcoinNetworkConfig();

      expect(config.enabled).toBe(false); // Default is false
      expect(config.mempoolApiKey).toBe('');
      expect(config.network).toBe('mainnet');
      expect(config.enableWebSocket).toBe(true);
      expect(config.pollingInterval).toBe(30);
    });

    it('should enable Bitcoin network when BITCOIN_NETWORK_ENABLED is true', () => {
      process.env.BITCOIN_NETWORK_ENABLED = 'true';
      const config = loadBitcoinNetworkConfig();

      expect(config.enabled).toBe(true);
    });

    it('should load mempool API key from environment', () => {
      const apiKey = '5d063afd314264c4b46da85342fe2555';
      process.env.MEMPOOL_API_KEY = apiKey;
      const config = loadBitcoinNetworkConfig();

      expect(config.mempoolApiKey).toBe(apiKey);
    });

    it('should load custom network type', () => {
      process.env.BITCOIN_NETWORK = 'testnet';
      const config = loadBitcoinNetworkConfig();

      expect(config.network).toBe('testnet');
    });

    it('should disable WebSocket when BITCOIN_WEBSOCKET_ENABLED is false', () => {
      process.env.BITCOIN_WEBSOCKET_ENABLED = 'false';
      const config = loadBitcoinNetworkConfig();

      expect(config.enableWebSocket).toBe(false);
    });

    it('should load custom polling interval', () => {
      process.env.BITCOIN_POLLING_INTERVAL = '60';
      const config = loadBitcoinNetworkConfig();

      expect(config.pollingInterval).toBe(60);
    });

    it('should load custom fee rate thresholds', () => {
      process.env.BITCOIN_MIN_FEE_RATE = '15';
      process.env.BITCOIN_MAX_FEE_RATE = '100';
      process.env.BITCOIN_DEFAULT_FEE_RATE = '20';
      const config = loadBitcoinNetworkConfig();

      expect(config.minFeeRateThreshold).toBe(15);
      expect(config.maxFeeRateThreshold).toBe(100);
      expect(config.defaultFeeRate).toBe(20);
    });

    it('should disable MEV detection when BITCOIN_MEV_DETECTION is false', () => {
      process.env.BITCOIN_MEV_DETECTION = 'false';
      const config = loadBitcoinNetworkConfig();

      expect(config.enableMEVDetection).toBe(false);
    });

    it('should load custom high value threshold', () => {
      process.env.BITCOIN_HIGH_VALUE_THRESHOLD = '50000000'; // 0.5 BTC
      const config = loadBitcoinNetworkConfig();

      expect(config.highValueThreshold).toBe(50000000);
    });

    it('should disable consciousness integration when BITCOIN_CONSCIOUSNESS_ENABLED is false', () => {
      process.env.BITCOIN_CONSCIOUSNESS_ENABLED = 'false';
      const config = loadBitcoinNetworkConfig();

      expect(config.enableConsciousnessIntegration).toBe(false);
    });

    it('should load Bitcoin RPC configuration', () => {
      process.env.BITCOIN_RPC_URL = 'http://localhost:8332';
      process.env.BITCOIN_RPC_USER = 'bitcoin';
      process.env.BITCOIN_RPC_PASSWORD = 'secret';
      const config = loadBitcoinNetworkConfig();

      expect(config.bitcoinRpcUrl).toBe('http://localhost:8332');
      expect(config.bitcoinRpcUser).toBe('bitcoin');
      expect(config.bitcoinRpcPassword).toBe('secret');
    });
  });

  describe('validateBitcoinNetworkConfig', () => {
    it('should validate a valid configuration', () => {
      const config: BitcoinNetworkConfig = {
        enabled: true,
        mempoolApiKey: '5d063afd314264c4b46da85342fe2555',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 30,
        minFeeRateThreshold: 10,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error when enabled but no API key', () => {
      const config: BitcoinNetworkConfig = {
        enabled: true,
        mempoolApiKey: '',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 30,
        minFeeRateThreshold: 10,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MEMPOOL_API_KEY is required when BITCOIN_NETWORK_ENABLED=true');
    });

    it('should warn about invalid API key length', () => {
      const config: BitcoinNetworkConfig = {
        enabled: true,
        mempoolApiKey: 'short-key',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 30,
        minFeeRateThreshold: 10,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('should be 32 characters'))).toBe(true);
    });

    it('should error when min fee rate is invalid', () => {
      const config: BitcoinNetworkConfig = {
        enabled: false,
        mempoolApiKey: '',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 30,
        minFeeRateThreshold: 0,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('BITCOIN_MIN_FEE_RATE must be > 0');
    });

    it('should error when max fee rate is less than min fee rate', () => {
      const config: BitcoinNetworkConfig = {
        enabled: false,
        mempoolApiKey: '',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 30,
        minFeeRateThreshold: 50,
        maxFeeRateThreshold: 10,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('BITCOIN_MAX_FEE_RATE must be >= BITCOIN_MIN_FEE_RATE');
    });

    it('should warn about low polling interval', () => {
      const config: BitcoinNetworkConfig = {
        enabled: false,
        mempoolApiKey: '',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 5,
        minFeeRateThreshold: 10,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.warnings.some((w) => w.includes('may hit rate limits'))).toBe(true);
    });

    it('should warn about high polling interval', () => {
      const config: BitcoinNetworkConfig = {
        enabled: false,
        mempoolApiKey: '',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 400,
        minFeeRateThreshold: 10,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 10,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.warnings.some((w) => w.includes('may miss opportunities'))).toBe(true);
    });
  });

  describe('getBitcoinNetworkName', () => {
    it('should return full name for mainnet', () => {
      expect(getBitcoinNetworkName('mainnet')).toBe('Bitcoin Mainnet');
    });

    it('should return full name for testnet', () => {
      expect(getBitcoinNetworkName('testnet')).toBe('Bitcoin Testnet');
    });

    it('should return full name for signet', () => {
      expect(getBitcoinNetworkName('signet')).toBe('Bitcoin Signet');
    });

    it('should return original string for unknown network', () => {
      expect(getBitcoinNetworkName('custom-network')).toBe('custom-network');
    });
  });

  describe('getDefaultBitcoinConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultBitcoinConfig();

      expect(config.enabled).toBe(true);
      expect(config.network).toBe('mainnet');
      expect(config.enableWebSocket).toBe(true);
      expect(config.pollingInterval).toBe(30);
      expect(config.minFeeRateThreshold).toBe(10);
      expect(config.maxFeeRateThreshold).toBe(50);
      expect(config.defaultFeeRate).toBe(10);
      expect(config.enableMEVDetection).toBe(true);
      expect(config.highValueThreshold).toBe(100000000);
      expect(config.enableConsciousnessIntegration).toBe(true);
    });

    it('should include MEMPOOL_API_KEY from environment if set', () => {
      const apiKey = '5d063afd314264c4b46da85342fe2555';
      process.env.MEMPOOL_API_KEY = apiKey;
      const config = getDefaultBitcoinConfig();

      expect(config.mempoolApiKey).toBe(apiKey);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle invalid numeric values gracefully', () => {
      process.env.BITCOIN_POLLING_INTERVAL = 'invalid';
      process.env.BITCOIN_MIN_FEE_RATE = 'invalid';
      const config = loadBitcoinNetworkConfig();

      // parseInt/parseFloat return NaN for invalid input, which is technically a number type
      // The system relies on validation to catch these
      expect(typeof config.pollingInterval).toBe('number');
      expect(typeof config.minFeeRateThreshold).toBe('number');
      
      // Validation should catch the NaN values
      const result = validateBitcoinNetworkConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should handle negative fee rates', () => {
      process.env.BITCOIN_MIN_FEE_RATE = '-10';
      const config = loadBitcoinNetworkConfig();
      const result = validateBitcoinNetworkConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should allow equal min and max fee rates', () => {
      const config: BitcoinNetworkConfig = {
        enabled: false,
        mempoolApiKey: '',
        network: 'mainnet',
        enableWebSocket: true,
        pollingInterval: 30,
        minFeeRateThreshold: 50,
        maxFeeRateThreshold: 50,
        defaultFeeRate: 50,
        enableMEVDetection: true,
        highValueThreshold: 100000000,
        enableConsciousnessIntegration: true,
      };

      const result = validateBitcoinNetworkConfig(config);

      expect(result.valid).toBe(true);
    });
  });

  describe('Integration with Environment', () => {
    it('should load complete production-like configuration', () => {
      process.env.BITCOIN_NETWORK_ENABLED = 'true';
      process.env.MEMPOOL_API_KEY = '5d063afd314264c4b46da85342fe2555';
      process.env.BITCOIN_NETWORK = 'mainnet';
      process.env.BITCOIN_WEBSOCKET_ENABLED = 'true';
      process.env.BITCOIN_POLLING_INTERVAL = '60';
      process.env.BITCOIN_MIN_FEE_RATE = '10';
      process.env.BITCOIN_MAX_FEE_RATE = '50';
      process.env.BITCOIN_DEFAULT_FEE_RATE = '15';
      process.env.BITCOIN_MEV_DETECTION = 'true';
      process.env.BITCOIN_HIGH_VALUE_THRESHOLD = '100000000';
      process.env.BITCOIN_CONSCIOUSNESS_ENABLED = 'true';

      const config = loadBitcoinNetworkConfig();
      const validation = validateBitcoinNetworkConfig(config);

      expect(config.enabled).toBe(true);
      expect(config.mempoolApiKey).toBe('5d063afd314264c4b46da85342fe2555');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
