/**
 * Tests for Chain Token Configuration Utility
 */

import { getScanTokens, getTokensByChainId, getNetworkName } from '../../../src/utils/chainTokens';

describe('chainTokens', () => {
  describe('getScanTokens', () => {
    it('should return all Base tokens including cbETH, AERO, cbBTC, and WSTETH', () => {
      const tokens = getScanTokens(8453); // Base mainnet
      
      // Base should have 9 tokens
      expect(tokens.length).toBe(9);
      
      // Verify all expected token addresses are included
      const baseTokens = getTokensByChainId(8453);
      expect(tokens).toContain(baseTokens.WETH?.address);
      expect(tokens).toContain(baseTokens.USDC?.address);
      expect(tokens).toContain(baseTokens.USDbC?.address);
      expect(tokens).toContain(baseTokens.DAI?.address);
      expect(tokens).toContain(baseTokens.cbETH?.address);
      expect(tokens).toContain(baseTokens.AERO?.address);
      expect(tokens).toContain(baseTokens.cbBTC?.address);
      expect(tokens).toContain(baseTokens.USDT?.address);
      expect(tokens).toContain(baseTokens.WSTETH?.address);
    });

    it('should return all Ethereum tokens', () => {
      const tokens = getScanTokens(1); // Ethereum mainnet
      
      // Ethereum should have 4 tokens
      expect(tokens.length).toBe(4);
      
      const ethTokens = getTokensByChainId(1);
      expect(tokens).toContain(ethTokens.WETH?.address);
      expect(tokens).toContain(ethTokens.USDC?.address);
      expect(tokens).toContain(ethTokens.USDT?.address);
      expect(tokens).toContain(ethTokens.DAI?.address);
    });

    it('should return all Arbitrum tokens', () => {
      const tokens = getScanTokens(42161); // Arbitrum mainnet
      
      // Arbitrum should have 5 tokens
      expect(tokens.length).toBe(5);
      
      const arbTokens = getTokensByChainId(42161);
      expect(tokens).toContain(arbTokens.WETH?.address);
      expect(tokens).toContain(arbTokens.USDC?.address);
      expect(tokens).toContain(arbTokens.USDT?.address);
      expect(tokens).toContain(arbTokens.DAI?.address);
      expect(tokens).toContain(arbTokens.ARB?.address);
    });

    it('should return unique token addresses (no duplicates)', () => {
      const tokens = getScanTokens(8453);
      const uniqueTokens = new Set(tokens);
      expect(tokens.length).toBe(uniqueTokens.size);
    });

    it('should only return valid addresses', () => {
      const tokens = getScanTokens(8453);
      tokens.forEach(address => {
        expect(address).toBeDefined();
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });
  });

  describe('getNetworkName', () => {
    it('should return correct network names', () => {
      expect(getNetworkName(1)).toBe('Ethereum Mainnet');
      expect(getNetworkName(8453)).toBe('Base');
      expect(getNetworkName(42161)).toBe('Arbitrum One');
      expect(getNetworkName(10)).toBe('Optimism');
      expect(getNetworkName(137)).toBe('Polygon');
    });
  });

  describe('getTokensByChainId', () => {
    it('should return Base tokens with all 9 tokens', () => {
      const tokens = getTokensByChainId(8453);
      
      expect(tokens.WETH).toBeDefined();
      expect(tokens.USDC).toBeDefined();
      expect(tokens.USDbC).toBeDefined();
      expect(tokens.DAI).toBeDefined();
      expect(tokens.cbETH).toBeDefined();
      expect(tokens.AERO).toBeDefined();
      expect(tokens.cbBTC).toBeDefined();
      expect(tokens.USDT).toBeDefined();
      expect(tokens.WSTETH).toBeDefined();
    });
  });
});
