/**
 * Tests for configValidator
 */

import { validateConfig, ConfigValidationError } from '../utils/configValidator';

// Mock environment variables
const originalEnv = process.env;

describe('Config Validator', () => {
  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateConfig', () => {
    it('should validate and return config with valid environment variables', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/test-key';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const config = validateConfig();

      expect(config).toBeDefined();
      expect(config.rpcUrl).toBe('https://base-mainnet.g.alchemy.com/v2/test-key');
      expect(config.privateKey).toBe('0x1234567890123456789012345678901234567890123456789012345678901234');
    });

    it('should throw ConfigValidationError if no RPC URL is provided', () => {
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      delete process.env.BASE_RPC_URL;
      delete process.env.ETHEREUM_RPC_URL;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/Missing required RPC URL/);
    });

    it('should throw ConfigValidationError if private key is missing', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      delete process.env.WALLET_PRIVATE_KEY;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/WALLET_PRIVATE_KEY/);
    });

    it('should throw ConfigValidationError for invalid RPC URL format', () => {
      process.env.BASE_RPC_URL = 'invalid-url';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/Invalid RPC URL/);
    });

    it('should throw ConfigValidationError for invalid private key length', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234'; // Too short

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/64 hexadecimal characters/);
    });

    it('should throw ConfigValidationError for non-hex private key', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0xGGGG567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/non-hexadecimal characters/);
    });

    it('should validate and set default values for numeric configuration', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const config = validateConfig();

      expect(config.minProfitThreshold).toBe(0.01);
      expect(config.minProfitPercent).toBe(0.5);
      expect(config.maxSlippage).toBe(0.005);
      expect(config.scanInterval).toBe(1000);
      expect(config.concurrency).toBe(10);
      expect(config.maxGasPrice).toBe(BigInt(100) * BigInt(1e9));
    });

    it('should parse custom numeric values correctly', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.MIN_PROFIT_THRESHOLD = '0.05';
      process.env.MIN_PROFIT_PERCENT = '2.0';
      process.env.MAX_GAS_PRICE = '200';
      process.env.SCAN_INTERVAL = '2000';

      const config = validateConfig();

      expect(config.minProfitThreshold).toBe(0.05);
      expect(config.minProfitPercent).toBe(2.0);
      expect(config.maxGasPrice).toBe(BigInt(200) * BigInt(1e9));
      expect(config.scanInterval).toBe(2000);
    });

    it('should throw ConfigValidationError for invalid MIN_PROFIT_THRESHOLD', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.MIN_PROFIT_THRESHOLD = '1.5'; // > 1

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/MIN_PROFIT_THRESHOLD must be between 0 and 1/);
    });

    it('should throw ConfigValidationError for invalid SCAN_INTERVAL', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.SCAN_INTERVAL = '50'; // < 100

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/SCAN_INTERVAL must be at least 100ms/);
    });

    it('should parse boolean flags correctly', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.ENABLE_ML_PREDICTIONS = 'true';
      process.env.ENABLE_CROSS_CHAIN = '1';
      process.env.ENABLE_LAYER2 = 'yes';

      const config = validateConfig();

      expect(config.enableMlPredictions).toBe(true);
      expect(config.enableCrossChain).toBe(true);
      expect(config.enableLayer2).toBe(true);
    });

    it('should validate Ethereum addresses when provided', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.FLASHSWAP_V2_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Valid address

      const config = validateConfig();

      expect(config.flashSwapV2Address).toBe('0x5FbDB2315678afecb367f032d93F642f64180aa3');
    });

    it('should throw ConfigValidationError for invalid Ethereum address', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.FLASHSWAP_V2_ADDRESS = 'invalid-address';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/Invalid Ethereum address/);
    });

    it('should set dryRun based on NODE_ENV', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      // Development mode
      process.env.NODE_ENV = 'development';
      const devConfig = validateConfig();
      expect(devConfig.dryRun).toBe(true);

      // Production mode
      process.env.NODE_ENV = 'production';
      const prodConfig = validateConfig();
      expect(prodConfig.dryRun).toBe(false);

      // Explicit override
      process.env.DRY_RUN = 'true';
      const overrideConfig = validateConfig();
      expect(overrideConfig.dryRun).toBe(true);
    });

    it('should prefer BASE_RPC_URL over ETHEREUM_RPC_URL', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const config = validateConfig();

      expect(config.rpcUrl).toBe('https://base-mainnet.example.com');
    });

    it('should parse BigInt values correctly', () => {
      process.env.BASE_RPC_URL = 'https://base-mainnet.example.com';
      process.env.WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.MIN_LIQUIDITY = '500000000000000000000000'; // 500k tokens

      const config = validateConfig();

      expect(config.minLiquidity).toBe(BigInt('500000000000000000000000'));
    });
  });
});
