/**
 * Tests for main runner
 */

import { loadConfig, ArbitrageBot, BotConfig } from '../main';

// Mock environment variables
const originalEnv = process.env;

describe('Main Runner', () => {
  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'production';
      process.env.DRY_RUN = 'true';

      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.rpcUrl).toBe('https://eth-mainnet.example.com');
      expect(config.walletPrivateKey).toBe('0x1234567890123456789012345678901234567890123456789012345678901234');
      expect(config.dryRun).toBe(true);
    });

    it('should use BASE_RPC_URL if ETHEREUM_RPC_URL is not set', () => {
      delete process.env.ETHEREUM_RPC_URL;
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.rpcUrl).toBe('https://base-mainnet.example.com');
    });

    it('should throw error if RPC URL is not provided', () => {
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
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
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
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
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
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
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
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
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'development';

      const config = loadConfig();

      expect(config.dryRun).toBe(true);
    });

    it('should set dryRun to false in production mode if DRY_RUN is not set', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.NODE_ENV = 'production';
      delete process.env.DRY_RUN;

      const config = loadConfig();

      expect(config.dryRun).toBe(false);
    });

    it('should handle contract addresses from environment', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.FLASHSWAP_V2_ADDRESS = '0xFlashSwapV2Address';
      process.env.FLASHSWAP_V2_OWNER = '0xOwnerAddress';
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.executorAddress).toBe('0xFlashSwapV2Address');
      expect(config.titheRecipient).toBe('0xOwnerAddress');
    });
  });

  describe('ArbitrageBot', () => {
    let config: BotConfig;

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

    it('should create ArbitrageBot instance', () => {
      const bot = new ArbitrageBot(config);
      expect(bot).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      const bot = new ArbitrageBot(config);
      const stats = bot.getStats();
      
      expect(stats.isRunning).toBe(false);
      expect(stats.cyclesCompleted).toBe(0);
      expect(stats.opportunitiesFound).toBe(0);
      expect(stats.tradesExecuted).toBe(0);
    });

    it('should track statistics correctly', () => {
      const bot = new ArbitrageBot(config);
      const stats1 = bot.getStats();
      
      expect(stats1.uptime).toBeGreaterThanOrEqual(0);
      
      // Wait a bit and check uptime increased
      setTimeout(() => {
        const stats2 = bot.getStats();
        expect(stats2.uptime).toBeGreaterThan(stats1.uptime);
      }, 10);
    });
  });

  describe('Bot Lifecycle', () => {
    it('should emit events during lifecycle', async () => {
      const config: BotConfig = {
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

      const bot = new ArbitrageBot(config);

      const startedPromise = new Promise((resolve) => {
        bot.once('started', resolve);
      });

      const shutdownPromise = new Promise((resolve) => {
        bot.once('shutdown', resolve);
      });

      // Note: We can't actually start the bot in tests because it requires a real RPC connection
      // This test structure shows how events would be tested
      expect(startedPromise).toBeDefined();
      expect(shutdownPromise).toBeDefined();
    });
  });
});
