/**
 * Tests for ChainProviderManager
 */

import { ChainProviderManager } from '../ChainProviderManager';
import { ChainConfig } from '../../config/cross-chain.config';

describe('ChainProviderManager', () => {
  let manager: ChainProviderManager;
  let testChainConfigs: ChainConfig[];

  beforeEach(() => {
    testChainConfigs = [
      {
        chainId: 1,
        name: 'Ethereum',
        type: 'EVM',
        rpcUrls: ['https://eth.llamarpc.com'],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockTime: 12,
        enabled: true,
      },
      {
        chainId: 56,
        name: 'BSC',
        type: 'EVM',
        rpcUrls: ['https://bsc-dataseed1.binance.org'],
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        blockTime: 3,
        enabled: true,
      },
      {
        chainId: 'mainnet-beta',
        name: 'Solana',
        type: 'Solana',
        rpcUrls: ['https://api.mainnet-beta.solana.com'],
        nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
        blockTime: 0.4,
        enabled: true,
      },
    ];

    manager = new ChainProviderManager(testChainConfigs, 60000, 3);
  });

  afterEach(() => {
    manager.stopHealthMonitoring();
  });

  describe('constructor', () => {
    it('should initialize with chain configurations', () => {
      expect(manager).toBeDefined();
    });

    it('should skip disabled chains', () => {
      const configs = [{ ...testChainConfigs[0], enabled: false }, testChainConfigs[1]];
      const m = new ChainProviderManager(configs);
      const activeChains = m.getAllActiveChains();

      // Should only have BSC (chainId 56)
      expect(activeChains).not.toContain(1);
      m.stopHealthMonitoring();
    });
  });

  describe('getProvider', () => {
    it('should return provider for valid EVM chain', () => {
      const provider = manager.getProvider(1);
      expect(provider).toBeDefined();
    });

    it('should return null for non-existent chain', () => {
      const provider = manager.getProvider(999);
      expect(provider).toBeNull();
    });

    it('should return null for Solana chain when requesting EVM provider', () => {
      const provider = manager.getProvider('mainnet-beta' as any);
      expect(provider).toBeNull();
    });
  });

  describe('getSolanaConnection', () => {
    it('should return Solana connection', () => {
      const connection = manager.getSolanaConnection();
      expect(connection).toBeDefined();
    });
  });

  describe('isChainHealthy', () => {
    it('should return true for initialized chains by default', () => {
      const healthy = manager.isChainHealthy(1);
      expect(healthy).toBe(true);
    });

    it('should return false for non-existent chain', () => {
      const healthy = manager.isChainHealthy(999);
      expect(healthy).toBe(false);
    });
  });

  describe('getAllActiveChains', () => {
    it('should return all enabled chains', () => {
      const activeChains = manager.getAllActiveChains();
      expect(activeChains.length).toBeGreaterThan(0);
      expect(activeChains).toContain(1);
      expect(activeChains).toContain(56);
    });
  });

  describe('getChainHealth', () => {
    it('should return health status for a chain', () => {
      const health = manager.getChainHealth(1);
      expect(health).toBeDefined();
      expect(Array.isArray(health)).toBe(true);
    });

    it('should return empty array for non-existent chain', () => {
      const health = manager.getChainHealth(999);
      expect(health).toEqual([]);
    });
  });

  describe('getChainConfig', () => {
    it('should return config for valid chain', () => {
      const config = manager.getChainConfig(1);
      expect(config).toBeDefined();
      expect(config?.name).toBe('Ethereum');
    });

    it('should return null for non-existent chain', () => {
      const config = manager.getChainConfig(999);
      expect(config).toBeNull();
    });
  });

  describe('getChainsSummary', () => {
    it('should return summary of all chains', () => {
      const summary = manager.getChainsSummary();
      expect(Array.isArray(summary)).toBe(true);
      expect(summary.length).toBeGreaterThan(0);

      const ethSummary = summary.find((s) => s.chainId === 1);
      expect(ethSummary).toBeDefined();
      expect(ethSummary?.name).toBe('Ethereum');
    });
  });

  describe('health monitoring', () => {
    it('should start health monitoring without errors', () => {
      expect(() => manager.startHealthMonitoring()).not.toThrow();
    });

    it('should not start multiple timers', () => {
      manager.startHealthMonitoring();
      manager.startHealthMonitoring(); // Second call should be no-op
      expect(() => manager.stopHealthMonitoring()).not.toThrow();
    });

    it('should stop health monitoring', () => {
      manager.startHealthMonitoring();
      expect(() => manager.stopHealthMonitoring()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await expect(manager.cleanup()).resolves.not.toThrow();
    });

    it('should clear providers after cleanup', async () => {
      await manager.cleanup();
      const activeChains = manager.getAllActiveChains();
      expect(activeChains).toEqual([]);
    });
  });
});
