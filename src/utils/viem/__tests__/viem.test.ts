/**
 * Tests for Viem Client Utilities
 */

import {
  getChain,
  getRpcUrl,
  createViemPublicClient,
  clearClientCache,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  getAddress,
  isAddress,
  CHAIN_MAP,
  mainnet,
  base,
  arbitrum,
} from '../index';

describe('Viem Client Utilities', () => {
  beforeEach(() => {
    clearClientCache();
  });

  describe('getChain', () => {
    it('should return correct chain for Ethereum mainnet', () => {
      const chain = getChain(1);
      expect(chain.id).toBe(1);
      expect(chain.name).toBe('Ethereum');
    });

    it('should return correct chain for Base', () => {
      const chain = getChain(8453);
      expect(chain.id).toBe(8453);
      expect(chain.name).toBe('Base');
    });

    it('should return correct chain for Arbitrum', () => {
      const chain = getChain(42161);
      expect(chain.id).toBe(42161);
      expect(chain.name).toBe('Arbitrum One');
    });

    it('should throw for unsupported chain', () => {
      expect(() => getChain(999999)).toThrow('Unsupported chain ID: 999999');
    });
  });

  describe('CHAIN_MAP', () => {
    it('should contain all major chains', () => {
      expect(CHAIN_MAP[1]).toBeDefined();
      expect(CHAIN_MAP[8453]).toBeDefined();
      expect(CHAIN_MAP[42161]).toBeDefined();
      expect(CHAIN_MAP[10]).toBeDefined();
      expect(CHAIN_MAP[137]).toBeDefined();
    });
  });

  describe('getRpcUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return RPC URL from environment for Base', () => {
      process.env.BASE_RPC_URL = 'https://base.example.com';
      expect(getRpcUrl(8453)).toBe('https://base.example.com');
    });

    it('should return RPC URL from environment for Arbitrum', () => {
      process.env.ARBITRUM_RPC_URL = 'https://arbitrum.example.com';
      expect(getRpcUrl(42161)).toBe('https://arbitrum.example.com');
    });

    it('should throw when no RPC URL is configured', () => {
      delete process.env.BASE_RPC_URL;
      expect(() => getRpcUrl(8453)).toThrow('No RPC URL configured');
    });
  });

  describe('createViemPublicClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      clearClientCache();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create a public client with custom RPC URL', () => {
      const client = createViemPublicClient(1, 'https://eth.example.com');
      expect(client).toBeDefined();
      expect(client.chain?.id).toBe(1);
    });

    it('should cache clients for same chain', () => {
      process.env.ETHEREUM_RPC_URL = 'https://eth.example.com';
      const client1 = createViemPublicClient(1);
      const client2 = createViemPublicClient(1);
      expect(client1).toBe(client2);
    });

    it('should not cache clients with custom RPC URL', () => {
      const client1 = createViemPublicClient(1, 'https://eth1.example.com');
      const client2 = createViemPublicClient(1, 'https://eth2.example.com');
      expect(client1).not.toBe(client2);
    });
  });

  describe('Format and Parse utilities', () => {
    it('formatEther should convert wei to ether', () => {
      expect(formatEther(1000000000000000000n)).toBe('1');
      expect(formatEther(1500000000000000000n)).toBe('1.5');
    });

    it('parseEther should convert ether to wei', () => {
      expect(parseEther('1')).toBe(1000000000000000000n);
      expect(parseEther('1.5')).toBe(1500000000000000000n);
    });

    it('formatUnits should handle various decimals', () => {
      expect(formatUnits(1000000n, 6)).toBe('1');
      expect(formatUnits(1500000n, 6)).toBe('1.5');
    });

    it('parseUnits should handle various decimals', () => {
      expect(parseUnits('1', 6)).toBe(1000000n);
      expect(parseUnits('1.5', 6)).toBe(1500000n);
    });
  });

  describe('Address utilities', () => {
    it('getAddress should checksum addresses', () => {
      const lower = '0x742d35cc6634c0532925a3b844bc9e7595f8e3f1';
      const checksummed = getAddress(lower);
      // viem's checksum is EIP-55 compliant
      expect(checksummed).toBe('0x742d35cc6634c0532925a3b844Bc9e7595F8E3f1');
    });

    it('isAddress should validate addresses', () => {
      // Use lowercase addresses - isAddress in viem validates format, not checksum
      expect(isAddress('0x742d35cc6634c0532925a3b844bc9e7595f8e3f1')).toBe(true);
      expect(isAddress('0x123')).toBe(false);
      expect(isAddress('invalid')).toBe(false);
    });
  });

  describe('Chain exports', () => {
    it('should export mainnet chain', () => {
      expect(mainnet.id).toBe(1);
      expect(mainnet.name).toBe('Ethereum');
    });

    it('should export base chain', () => {
      expect(base.id).toBe(8453);
      expect(base.name).toBe('Base');
    });

    it('should export arbitrum chain', () => {
      expect(arbitrum.id).toBe(42161);
      expect(arbitrum.name).toBe('Arbitrum One');
    });
  });
});
