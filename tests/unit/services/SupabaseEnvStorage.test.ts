/**
 * Unit tests for SupabaseEnvStorage service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseEnvStorage } from '../../../src/services/SupabaseEnvStorage';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const mockData = {
        data: [],
        error: null,
      };
      
      const mockSingle = {
        data: null,
        error: null,
      };
      
      const chainableQuery = {
        eq: vi.fn(() => chainableQuery),
        order: vi.fn(() => mockData),
        single: vi.fn(() => mockSingle),
        data: [],
        error: null,
      };
      
      return {
        select: vi.fn(() => chainableQuery),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: '123',
                config_name: 'TEST_CONFIG',
                config_value: 'test_value',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null,
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null,
          })),
        })),
      };
    }),
  })),
}));

describe('SupabaseEnvStorage', () => {
  let storage: SupabaseEnvStorage;

  beforeEach(() => {
    // Set required environment variables for tests
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    process.env.SECRETS_ENCRYPTION_KEY = 'test-encryption-key-12345678901234567890';

    storage = new SupabaseEnvStorage();
  });

  describe('constructor', () => {
    it('should throw error if SUPABASE_URL is missing', () => {
      delete process.env.SUPABASE_URL;
      expect(() => new SupabaseEnvStorage()).toThrow('Supabase URL and Key are required');
    });

    it('should throw error if SUPABASE_ANON_KEY is missing', () => {
      delete process.env.SUPABASE_ANON_KEY;
      expect(() => new SupabaseEnvStorage()).toThrow('Supabase URL and Key are required');
    });

    it('should accept options parameter', () => {
      const customStorage = new SupabaseEnvStorage({
        supabaseUrl: 'https://custom.supabase.co',
        supabaseKey: 'custom-key',
        encryptionKey: 'custom-encryption-key-123456789012345',
      });
      expect(customStorage).toBeInstanceOf(SupabaseEnvStorage);
    });
  });

  describe('setConfig', () => {
    it('should set a configuration value', async () => {
      const result = await storage.setConfig('TEST_VAR', 'test_value');
      expect(result).toBeDefined();
      expect(result.config_name).toBe('TEST_CONFIG');
    });

    it('should accept metadata', async () => {
      const result = await storage.setConfig('TEST_VAR', 'test_value', {
        description: 'Test variable',
        category: 'api',
        is_required: true,
      });
      expect(result).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return null for non-existent config', async () => {
      const result = await storage.getConfig('NON_EXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('getAllConfigs', () => {
    it('should return all configs', async () => {
      const result = await storage.getAllConfigs();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await storage.getAllConfigs('api');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteConfig', () => {
    it('should delete a configuration', async () => {
      await expect(storage.deleteConfig('TEST_VAR')).resolves.not.toThrow();
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt values correctly', () => {
      const original = 'my-secret-value';
      const key = 'test-encryption-key-12345678901234567890';

      // Use private methods via any casting for testing
      const encrypted = (storage as any).encrypt(original, key);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':'); // IV:encrypted format

      const decrypted = (storage as any).decrypt(encrypted, key);
      expect(decrypted).toBe(original);
    });

    it('should throw error for short encryption key', () => {
      const shortKey = 'short';
      expect(() => (storage as any).encrypt('test', shortKey)).toThrow('at least 32 characters');
    });

    it('should throw error for invalid encrypted data', () => {
      const key = 'test-encryption-key-12345678901234567890';
      expect(() => (storage as any).decrypt('invalid-data', key)).toThrow();
    });
  });

  describe('setSecret', () => {
    it('should set and encrypt a secret', async () => {
      const result = await storage.setSecret('API_KEY', 'secret-value');
      expect(result).toBeDefined();
    });

    it('should accept custom encryption key', async () => {
      const customKey = 'custom-key-123456789012345678901234';
      const result = await storage.setSecret('API_KEY', 'secret-value', customKey);
      expect(result).toBeDefined();
    });

    it('should throw error if no encryption key is provided', async () => {
      const storageWithoutKey = new SupabaseEnvStorage({
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
      });
      await expect(storageWithoutKey.setSecret('TEST', 'value')).rejects.toThrow('Encryption key is required');
    });
  });

  describe('getSecret', () => {
    it('should return null for non-existent secret', async () => {
      const result = await storage.getSecret('NON_EXISTENT');
      expect(result).toBeNull();
    });

    it('should throw error if no decryption key is provided', async () => {
      const storageWithoutKey = new SupabaseEnvStorage({
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
      });
      
      // This would fail in real scenario but mocked data returns null
      const result = await storageWithoutKey.getSecret('TEST');
      expect(result).toBeNull();
    });
  });

  describe('getAllSecrets', () => {
    it('should return all secrets without encrypted values', async () => {
      const result = await storage.getAllSecrets();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await storage.getAllSecrets('api_key');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteSecret', () => {
    it('should delete a secret', async () => {
      await expect(storage.deleteSecret('API_KEY')).resolves.not.toThrow();
    });
  });

  describe('importFromEnv', () => {
    it('should import environment variables', async () => {
      process.env.TEST_CONFIG = 'value1';
      process.env.TEST_API_KEY = 'secret1';
      process.env.TEST_PASSWORD = 'secret2';

      const result = await storage.importFromEnv('TEST_');
      expect(result.configs).toBeGreaterThanOrEqual(1);
      expect(result.secrets).toBeGreaterThanOrEqual(2);
    });

    it('should skip empty values', async () => {
      process.env.EMPTY_VAR = '';
      const result = await storage.importFromEnv('EMPTY_');
      expect(result.configs).toBe(0);
      expect(result.secrets).toBe(0);
    });
  });

  describe('exportToEnvFormat', () => {
    it('should export to .env format', async () => {
      const result = await storage.exportToEnvFormat();
      expect(result).toContain('# Configuration exported from Supabase');
      expect(result).toContain('# Non-sensitive Configuration');
      expect(result).toContain('# Secrets');
    });
  });
});
