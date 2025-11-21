/**
 * Alchemy Client Tests
 * 
 * Tests for the Alchemy SDK client wrapper
 */

import { AlchemyClient, getAlchemyClient, resetAlchemyClient } from '../AlchemyClient';
import { Network } from 'alchemy-sdk';

describe('AlchemyClient', () => {
  beforeEach(() => {
    resetAlchemyClient();
  });

  describe('constructor', () => {
    it('should create an instance with default config', () => {
      const client = new AlchemyClient();
      expect(client).toBeDefined();
      expect(client.isConfigured()).toBe(false); // No API key in test env
    });

    it('should create an instance with custom config', () => {
      const client = new AlchemyClient({
        apiKey: 'test-api-key',
        network: Network.ETH_MAINNET,
      });
      expect(client).toBeDefined();
      expect(client.isConfigured()).toBe(true);
      expect(client.getNetwork()).toBe(Network.ETH_MAINNET);
    });

    it('should map network names correctly', () => {
      const testCases = [
        { env: 'arbitrum', expected: Network.ARB_MAINNET },
        { env: 'ethereum', expected: Network.ETH_MAINNET },
        { env: 'polygon', expected: Network.MATIC_MAINNET },
        { env: 'optimism', expected: Network.OPT_MAINNET },
        { env: 'base', expected: Network.BASE_MAINNET },
      ];

      testCases.forEach(({ env, expected }) => {
        process.env.NETWORK = env;
        const client = new AlchemyClient();
        expect(client.getNetwork()).toBe(expected);
      });
    });
  });

  describe('getAlchemyClient', () => {
    it('should return a singleton instance', () => {
      const client1 = getAlchemyClient();
      const client2 = getAlchemyClient();
      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getAlchemyClient();
      resetAlchemyClient();
      const client2 = getAlchemyClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('API access', () => {
    it('should provide access to core API', () => {
      const client = new AlchemyClient({ apiKey: 'test' });
      expect(client.core).toBeDefined();
    });

    it('should provide access to NFT API', () => {
      const client = new AlchemyClient({ apiKey: 'test' });
      expect(client.nft).toBeDefined();
    });

    it('should provide access to WebSocket provider', () => {
      const client = new AlchemyClient({ apiKey: 'test' });
      expect(client.ws).toBeDefined();
    });

    it('should provide access to transact API', () => {
      const client = new AlchemyClient({ apiKey: 'test' });
      expect(client.transact).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return false without API key', () => {
      const client = new AlchemyClient();
      expect(client.isConfigured()).toBe(false);
    });

    it('should return true with API key', () => {
      const client = new AlchemyClient({ apiKey: 'test-key' });
      expect(client.isConfigured()).toBe(true);
    });
  });
});
