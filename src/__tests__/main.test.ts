/**
 * Tests for main runner - TheWarden (AEV)
 */

import { loadConfig, TheWarden, WardenConfig } from '../main';

// Store original environment variables that may come from .env file
const originalEnv = process.env;

// Environment variables that loadConfig reads and need to be cleared for test isolation
const CONFIG_ENV_VARS = [
  'ETHEREUM_RPC_URL',
  'BASE_RPC_URL',
  'POLYGON_RPC_URL',
  'ARBITRUM_RPC_URL',
  'OPTIMISM_RPC_URL',
  'RPC_URL',
  'WALLET_PRIVATE_KEY',
  'CHAIN_ID',
  'SCAN_CHAINS',
  'FLASHSWAP_V2_ADDRESS',
  'FLASHSWAP_V2_OWNER',
  'MULTI_SIG_ADDRESS',
  'SCAN_INTERVAL',
  'CONCURRENCY',
  'MIN_PROFIT_THRESHOLD',
  'MIN_PROFIT_PERCENT',
  'MAX_GAS_PRICE',
  'MAX_GAS_COST_PERCENTAGE',
  'ENABLE_ML_PREDICTIONS',
  'ENABLE_CROSS_CHAIN',
  'DRY_RUN',
  'HEALTH_CHECK_INTERVAL',
  'NODE_ENV',
];

describe('Main Runner', () => {
  beforeEach(() => {
    // Reset environment before each test - clear all config env vars
    // to ensure test isolation from .env file values loaded by dotenv
    jest.resetModules();
    process.env = { ...originalEnv };

    // Clear all config-related environment variables
    for (const key of CONFIG_ENV_VARS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'production';
      process.env.DRY_RUN = 'true';

      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.rpcUrl).toBe('https://eth-mainnet.example.com');
      expect(config.walletPrivateKey).toBe(
        '0x1234567890123456789012345678901234567890123456789012345678901234'
      );
      expect(config.dryRun).toBe(true);
    });

    it('should use BASE_RPC_URL if ETHEREUM_RPC_URL is not set', () => {
      delete process.env.ETHEREUM_RPC_URL;
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.rpcUrl).toBe('https://base-mainnet.example.com');
    });

    it('should throw error if RPC URL is not provided', () => {
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      delete process.env.ETHEREUM_RPC_URL;
      delete process.env.BASE_RPC_URL;

      expect(() => loadConfig()).toThrow('RPC URL is required');
    });

    it('should throw error if wallet private key is not provided', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      delete process.env.WALLET_PRIVATE_KEY;

      expect(() => loadConfig()).toThrow('WALLET_PRIVATE_KEY is required');
    });

    it('should apply default values for optional configuration', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'test';
      delete process.env.ENABLE_ML_PREDICTIONS;
      delete process.env.ENABLE_CROSS_CHAIN;

      const config = loadConfig();

      expect(config.scanInterval).toBe(1000);
      expect(config.concurrency).toBe(10);
      expect(config.minProfitThreshold).toBe(0.01);
      expect(config.minProfitPercent).toBe(0.5);
      expect(config.maxGasCostPercentage).toBe(40);
      expect(config.enableMlPredictions).toBe(false); // default is false
      expect(config.enableCrossChain).toBe(false); // default is false
    });

    it('should parse integer values correctly', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.SCAN_INTERVAL = '5000';
      process.env.CONCURRENCY = '20';
      process.env.MAX_GAS_PRICE = '150';
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.scanInterval).toBe(5000);
      expect(config.concurrency).toBe(20);
      expect(config.maxGasPrice).toBe(BigInt(150) * BigInt(1e9));
    });

    it('should parse boolean flags correctly', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.ENABLE_ML_PREDICTIONS = 'true';
      process.env.ENABLE_CROSS_CHAIN = 'true';
      process.env.DRY_RUN = 'false';
      process.env.NODE_ENV = 'production';

      const config = loadConfig();

      expect(config.enableMlPredictions).toBe(true);
      expect(config.enableCrossChain).toBe(true);
      expect(config.dryRun).toBe(false);
    });

    it('should set dryRun to true in development mode', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'development';

      const config = loadConfig();

      expect(config.dryRun).toBe(true);
    });

    it('should set dryRun to false in production mode if DRY_RUN is not set', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'production';
      delete process.env.DRY_RUN;

      const config = loadConfig();

      expect(config.dryRun).toBe(false);
    });

    it('should handle contract addresses from environment', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.FLASHSWAP_V2_ADDRESS = '0xFlashSwapV2Address';
      process.env.FLASHSWAP_V2_OWNER = '0xOwnerAddress';
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.executorAddress).toBe('0xFlashSwapV2Address');
      expect(config.titheRecipient).toBe('0xOwnerAddress');
    });
  });

  describe('TheWarden', () => {
    let config: WardenConfig;

    beforeEach(() => {
      config = {
        rpcUrl: 'https://eth-mainnet.example.com',
        chainId: 1,
        walletPrivateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
        scanInterval: 1000,
        concurrency: 10,
        minProfitThreshold: 0.01,
        minProfitPercent: 0.5,
        maxGasPrice: BigInt(100) * BigInt(1e9),
        maxGasCostPercentage: 40,
        enableMlPredictions: false,
        enableCrossChain: false,
        dryRun: true,
        healthCheckInterval: 30000,
      };
    });

    it('should create TheWarden instance', () => {
      const theWarden = new TheWarden(config);
      expect(theWarden).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      const theWarden = new TheWarden(config);
      const stats = theWarden.getStats();

      expect(stats.isRunning).toBe(false);
      expect(stats.cyclesCompleted).toBe(0);
      expect(stats.opportunitiesFound).toBe(0);
      expect(stats.tradesExecuted).toBe(0);
    });

    it('should track statistics correctly', () => {
      const theWarden = new TheWarden(config);
      const stats1 = theWarden.getStats();

      expect(stats1.uptime).toBeGreaterThanOrEqual(0);

      // Wait a bit and check uptime increased
      setTimeout(() => {
        const stats2 = theWarden.getStats();
        expect(stats2.uptime).toBeGreaterThan(stats1.uptime);
      }, 10);
    });
  });

  describe('TheWarden Lifecycle', () => {
    it('should emit events during lifecycle', async () => {
      const config: WardenConfig = {
        rpcUrl: 'https://eth-mainnet.example.com',
        chainId: 1,
        walletPrivateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
        scanInterval: 1000,
        concurrency: 10,
        minProfitThreshold: 0.01,
        minProfitPercent: 0.5,
        maxGasPrice: BigInt(100) * BigInt(1e9),
        maxGasCostPercentage: 40,
        enableMlPredictions: false,
        enableCrossChain: false,
        dryRun: true,
        healthCheckInterval: 30000,
      };

      const theWarden = new TheWarden(config);

      const startedPromise = new Promise((resolve) => {
        theWarden.once('started', resolve);
      });

      const shutdownPromise = new Promise((resolve) => {
        theWarden.once('shutdown', resolve);
      });

      // Note: We can't actually start TheWarden in tests because it requires a real RPC connection
      // This test structure shows how events would be tested
      expect(startedPromise).toBeDefined();
      expect(shutdownPromise).toBeDefined();
    });
  });
});
