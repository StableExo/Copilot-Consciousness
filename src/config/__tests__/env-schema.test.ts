/**
 * Tests for Zod-based Environment Schema Validation
 */

import {
  validateEnv,
  validateEnvOrThrow,
  validateEnvSection,
  RpcConfigSchema,
  WalletConfigSchema,
  SecurityConfigSchema,
  PerformanceConfigSchema,
  ApiKeysSchema,
} from '../env-schema';

describe('EnvSchema', () => {
  describe('validateEnv', () => {
    it('should validate a minimal valid configuration', () => {
      const env = {
        BASE_RPC_URL: 'https://mainnet.base.org',
        WALLET_PRIVATE_KEY: '0x' + 'a'.repeat(64),
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
      };

      const result = validateEnv(env);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.BASE_RPC_URL).toBe('https://mainnet.base.org');
    });

    it('should accept "ask_operator" as a valid WALLET_PRIVATE_KEY', () => {
      const env = {
        BASE_RPC_URL: 'https://mainnet.base.org',
        WALLET_PRIVATE_KEY: 'ask_operator',
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
      };

      const result = validateEnv(env);
      expect(result.success).toBe(true);
    });

    it('should fail validation for invalid RPC URL', () => {
      const env = {
        BASE_RPC_URL: 'not-a-valid-url',
        WALLET_PRIVATE_KEY: 'ask_operator',
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
      };

      const result = validateEnv(env);
      expect(result.success).toBe(false);
      expect(result.errorMessages?.some((msg) => msg.includes('BASE_RPC_URL'))).toBe(true);
    });

    it('should fail validation for missing required fields', () => {
      const env = {
        NODE_ENV: 'production',
      };

      const result = validateEnv(env);
      expect(result.success).toBe(false);
      expect(result.errorMessages).toBeDefined();
    });

    it('should transform boolean strings correctly', () => {
      const env = {
        BASE_RPC_URL: 'https://mainnet.base.org',
        WALLET_PRIVATE_KEY: 'ask_operator',
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        ENABLE_ML_PREDICTIONS: 'true',
        DRY_RUN: 'false',
      };

      const result = validateEnv(env);
      expect(result.success).toBe(true);
      expect(result.data?.ENABLE_ML_PREDICTIONS).toBe(true);
      expect(result.data?.DRY_RUN).toBe(false);
    });

    it('should transform numeric strings correctly', () => {
      const env = {
        BASE_RPC_URL: 'https://mainnet.base.org',
        WALLET_PRIVATE_KEY: 'ask_operator',
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        SCAN_INTERVAL: '1000',
        CONCURRENCY: '10',
        MAX_SLIPPAGE: '0.005',
      };

      const result = validateEnv(env);
      expect(result.success).toBe(true);
      expect(result.data?.SCAN_INTERVAL).toBe(1000);
      expect(result.data?.CONCURRENCY).toBe(10);
      expect(result.data?.MAX_SLIPPAGE).toBe(0.005);
    });

    it('should reject placeholder API keys', () => {
      const env = {
        ALCHEMY_API_KEY: 'your-api-key-here',
      };

      // Use the specific section schema for API keys
      const result = validateEnvSection(ApiKeysSchema, env);
      expect(result.success).toBe(false);
      expect(result.errorMessages?.some((msg) => msg.toLowerCase().includes('placeholder'))).toBe(
        true
      );
    });
  });

  describe('validateEnvOrThrow', () => {
    it('should return config on valid environment', () => {
      const env = {
        BASE_RPC_URL: 'https://mainnet.base.org',
        WALLET_PRIVATE_KEY: 'ask_operator',
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
      };

      expect(() => validateEnvOrThrow(env)).not.toThrow();
      const config = validateEnvOrThrow(env);
      expect(config.BASE_RPC_URL).toBe('https://mainnet.base.org');
    });

    it('should throw on invalid environment', () => {
      const env = {
        NODE_ENV: 'production',
      };

      expect(() => validateEnvOrThrow(env)).toThrow('Environment validation failed');
    });
  });

  describe('validateEnvSection', () => {
    describe('RpcConfigSchema', () => {
      it('should validate valid RPC URLs', () => {
        const env = {
          BASE_RPC_URL: 'https://mainnet.base.org',
          ETHEREUM_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/key',
          INFURA_WS_URL: 'wss://mainnet.infura.io/ws/v3/key',
        };

        const result = validateEnvSection(RpcConfigSchema, env);
        expect(result.success).toBe(true);
      });

      it('should reject invalid WebSocket URL', () => {
        const env = {
          BASE_RPC_URL: 'https://mainnet.base.org',
          INFURA_WS_URL: 'https://mainnet.infura.io', // Should be wss://
        };

        const result = validateEnvSection(RpcConfigSchema, env);
        expect(result.success).toBe(false);
        expect(result.errorMessages?.some((msg) => msg.includes('WebSocket'))).toBe(true);
      });
    });

    describe('WalletConfigSchema', () => {
      it('should validate valid private key', () => {
        const env = {
          WALLET_PRIVATE_KEY: '0x' + 'a'.repeat(64),
        };

        const result = validateEnvSection(WalletConfigSchema, env);
        expect(result.success).toBe(true);
      });

      it('should reject private key without 0x prefix', () => {
        const env = {
          WALLET_PRIVATE_KEY: 'a'.repeat(64),
        };

        const result = validateEnvSection(WalletConfigSchema, env);
        expect(result.success).toBe(false);
      });

      it('should reject private key with wrong length', () => {
        const env = {
          WALLET_PRIVATE_KEY: '0x' + 'a'.repeat(32), // Too short
        };

        const result = validateEnvSection(WalletConfigSchema, env);
        expect(result.success).toBe(false);
      });
    });

    describe('SecurityConfigSchema', () => {
      it('should validate valid security configuration', () => {
        const env = {
          JWT_SECRET: 'a'.repeat(128),
          SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
          AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        };

        const result = validateEnvSection(SecurityConfigSchema, env);
        expect(result.success).toBe(true);
      });

      it('should reject short JWT secret', () => {
        const env = {
          JWT_SECRET: 'short',
          SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
          AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        };

        const result = validateEnvSection(SecurityConfigSchema, env);
        expect(result.success).toBe(false);
        expect(result.errorMessages?.some((msg) => msg.includes('64 characters'))).toBe(true);
      });

      it('should reject wrong length encryption keys', () => {
        const env = {
          JWT_SECRET: 'a'.repeat(128),
          SECRETS_ENCRYPTION_KEY: 'a'.repeat(32), // Should be 64
          AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        };

        const result = validateEnvSection(SecurityConfigSchema, env);
        expect(result.success).toBe(false);
      });

      it('should validate optional multi-sig address', () => {
        const env = {
          JWT_SECRET: 'a'.repeat(128),
          SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
          AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
          MULTI_SIG_ADDRESS: '0x' + 'a'.repeat(40),
        };

        const result = validateEnvSection(SecurityConfigSchema, env);
        expect(result.success).toBe(true);
      });
    });

    describe('PerformanceConfigSchema', () => {
      it('should validate valid performance configuration', () => {
        const env = {
          SCAN_INTERVAL: '1000',
          CONCURRENCY: '10',
          MAX_SLIPPAGE: '0.005',
          MAX_GAS_PRICE: '100',
        };

        const result = validateEnvSection(PerformanceConfigSchema, env);
        expect(result.success).toBe(true);
        expect(result.data?.SCAN_INTERVAL).toBe(1000);
      });

      it('should reject out of range values', () => {
        const env = {
          SCAN_INTERVAL: '10', // Min is 100
        };

        const result = validateEnvSection(PerformanceConfigSchema, env);
        expect(result.success).toBe(false);
      });

      it('should reject slippage over 1', () => {
        const env = {
          MAX_SLIPPAGE: '1.5', // Max is 1
        };

        const result = validateEnvSection(PerformanceConfigSchema, env);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('NODE_ENV validation', () => {
    it('should accept valid NODE_ENV values', () => {
      for (const nodeEnv of ['development', 'production', 'test']) {
        const env = {
          BASE_RPC_URL: 'https://mainnet.base.org',
          WALLET_PRIVATE_KEY: 'ask_operator',
          NODE_ENV: nodeEnv,
          JWT_SECRET: 'a'.repeat(64),
          SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
          AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        };

        const result = validateEnv(env);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid NODE_ENV value', () => {
      const env = {
        BASE_RPC_URL: 'https://mainnet.base.org',
        WALLET_PRIVATE_KEY: 'ask_operator',
        NODE_ENV: 'staging', // Not a valid value
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
      };

      const result = validateEnv(env);
      expect(result.success).toBe(false);
    });
  });

  describe('LOG_LEVEL validation', () => {
    it('should accept valid log levels', () => {
      for (const level of ['error', 'warn', 'info', 'debug', 'trace']) {
        const env = {
          BASE_RPC_URL: 'https://mainnet.base.org',
          WALLET_PRIVATE_KEY: 'ask_operator',
          NODE_ENV: 'production',
          JWT_SECRET: 'a'.repeat(64),
          SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
          AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
          LOG_LEVEL: level,
        };

        const result = validateEnv(env);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Ethereum address validation', () => {
    it('should validate correct Ethereum addresses', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        MULTI_SIG_ADDRESS: '0x742d35Cc6634C0532925a3b844Bc9e7595f8DaE0',
      };

      const result = validateEnvSection(SecurityConfigSchema, env);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Ethereum addresses', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(64),
        SECRETS_ENCRYPTION_KEY: 'a'.repeat(64),
        AUDIT_ENCRYPTION_KEY: 'a'.repeat(64),
        MULTI_SIG_ADDRESS: '0x123', // Too short
      };

      const result = validateEnvSection(SecurityConfigSchema, env);
      expect(result.success).toBe(false);
    });
  });
});
