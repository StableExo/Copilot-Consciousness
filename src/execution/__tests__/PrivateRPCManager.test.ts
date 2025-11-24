/**
 * Tests for PrivateRPCManager
 */

import { ethers, Wallet } from 'ethers';
import {
  PrivateRPCManager,
  createFlashbotsProtectConfig,
  createMEVShareConfig,
} from '../PrivateRPCManager';
import {
  PrivateRelayType,
  PrivacyLevel,
  PrivateRelayConfig,
} from '../types/PrivateRPCTypes';

describe('PrivateRPCManager', () => {
  let provider: JsonRpcProvider;
  let signer: Wallet;
  let manager: PrivateRPCManager;

  beforeEach(() => {
    // Create mock provider and signer
    provider = new JsonRpcProvider('http://localhost:8545');
    signer = Wallet.createRandom().connect(provider);

    manager = new PrivateRPCManager(provider, signer, {
      relays: [],
      defaultPrivacyLevel: PrivacyLevel.BASIC,
      enableFallback: true,
      privateSubmissionTimeout: 30000,
      verboseLogging: false,
    });
  });

  describe('Configuration', () => {
    it('should initialize with empty relays', () => {
      expect(manager.getStats().size).toBe(0);
    });

    it('should add a relay', () => {
      const relay: PrivateRelayConfig = {
        type: PrivateRelayType.FLASHBOTS_PROTECT,
        endpoint: 'https://rpc.flashbots.net',
        enabled: true,
        priority: 100,
        name: 'Flashbots Protect',
      };

      manager.addRelay(relay);
      expect(manager.getStats().size).toBe(1);
      expect(manager.getRelayStats(PrivateRelayType.FLASHBOTS_PROTECT)).toBeDefined();
    });

    it('should remove a relay', () => {
      const relay: PrivateRelayConfig = {
        type: PrivateRelayType.FLASHBOTS_PROTECT,
        endpoint: 'https://rpc.flashbots.net',
        enabled: true,
        priority: 100,
      };

      manager.addRelay(relay);
      expect(manager.getStats().size).toBe(1);

      manager.removeRelay(PrivateRelayType.FLASHBOTS_PROTECT);
      expect(manager.getStats().size).toBe(0);
    });

    it('should initialize relay stats', () => {
      const relay: PrivateRelayConfig = {
        type: PrivateRelayType.MEV_SHARE,
        endpoint: 'https://relay.flashbots.net',
        enabled: true,
        priority: 90,
      };

      manager.addRelay(relay);
      const stats = manager.getRelayStats(PrivateRelayType.MEV_SHARE);

      expect(stats).toBeDefined();
      expect(stats?.totalSubmissions).toBe(0);
      expect(stats?.successfulInclusions).toBe(0);
      expect(stats?.failedSubmissions).toBe(0);
      expect(stats?.avgInclusionTime).toBe(0);
      expect(stats?.isAvailable).toBe(true);
    });
  });

  describe('Flashbots Configuration Helpers', () => {
    it('should create Flashbots Protect config for mainnet', () => {
      const config = createFlashbotsProtectConfig(1);
      
      expect(config.type).toBe(PrivateRelayType.FLASHBOTS_PROTECT);
      expect(config.endpoint).toBe('https://rpc.flashbots.net');
      expect(config.enabled).toBe(true);
      expect(config.priority).toBe(100);
    });

    it('should create Flashbots Protect config for Goerli', () => {
      const config = createFlashbotsProtectConfig(5);
      
      expect(config.endpoint).toBe('https://rpc-goerli.flashbots.net');
    });

    it('should create Flashbots Protect config for Sepolia', () => {
      const config = createFlashbotsProtectConfig(11155111);
      
      expect(config.endpoint).toBe('https://rpc-sepolia.flashbots.net');
    });

    it('should throw for unsupported chain', () => {
      expect(() => createFlashbotsProtectConfig(999)).toThrow();
    });

    it('should create MEV-Share config', () => {
      const config = createMEVShareConfig('test-key');
      
      expect(config.type).toBe(PrivateRelayType.MEV_SHARE);
      expect(config.endpoint).toBe('https://relay.flashbots.net');
      expect(config.authKey).toBe('test-key');
      expect(config.enabled).toBe(true);
      expect(config.priority).toBe(90);
    });
  });

  describe('Transaction Submission', () => {
    it('should fail when no relays are configured and fallback is disabled', async () => {
      const managerNoFallback = new PrivateRPCManager(provider, signer, {
        relays: [],
        defaultPrivacyLevel: PrivacyLevel.BASIC,
        enableFallback: false,
        privateSubmissionTimeout: 30000,
        verboseLogging: false,
      });

      const tx = {
        to: '0x0000000000000000000000000000000000000001',
        value: parseEther('0.1'),
      };

      const result = await managerNoFallback.submitPrivateTransaction(tx, {
        privacyLevel: PrivacyLevel.BASIC,
        allowPublicFallback: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No private relays available');
    });

    it('should handle privacy level NONE', async () => {
      const tx = {
        to: '0x0000000000000000000000000000000000000001',
        value: parseEther('0.1'),
      };

      // With NONE privacy level and fallback disabled, should fail
      const result = await manager.submitPrivateTransaction(tx, {
        privacyLevel: PrivacyLevel.NONE,
        allowPublicFallback: false,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Relay Selection', () => {
    beforeEach(() => {
      // Add multiple relays with different priorities
      manager.addRelay({
        type: PrivateRelayType.FLASHBOTS_PROTECT,
        endpoint: 'https://rpc.flashbots.net',
        enabled: true,
        priority: 100,
      });

      manager.addRelay({
        type: PrivateRelayType.MEV_SHARE,
        endpoint: 'https://relay.flashbots.net',
        enabled: true,
        priority: 90,
      });

      manager.addRelay({
        type: PrivateRelayType.BUILDER_RPC,
        endpoint: 'https://builder.example.com',
        enabled: true,
        priority: 80,
      });
    });

    it('should have all relays configured', () => {
      expect(manager.getStats().size).toBe(3);
    });
  });

  describe('Bundle Creation', () => {
    it('should create a Flashbots bundle', async () => {
      const transactions = [
        {
          to: '0x0000000000000000000000000000000000000001',
          value: parseEther('0.1'),
          gasLimit: 21000,
        },
        {
          to: '0x0000000000000000000000000000000000000002',
          value: parseEther('0.2'),
          gasLimit: 21000,
        },
      ];

      const targetBlock = 1000000;
      const bundle = await manager.createFlashbotsBundle(transactions, targetBlock);

      expect(bundle.signedTransactions).toHaveLength(2);
      expect(bundle.targetBlockNumber).toBe(targetBlock);
      expect(bundle.signedTransactions[0]).toMatch(/^0x/);
    });
  });

  describe('Stats Tracking', () => {
    it('should track relay statistics', () => {
      manager.addRelay({
        type: PrivateRelayType.FLASHBOTS_PROTECT,
        endpoint: 'https://rpc.flashbots.net',
        enabled: true,
        priority: 100,
      });

      const stats = manager.getRelayStats(PrivateRelayType.FLASHBOTS_PROTECT);
      expect(stats).toBeDefined();
      expect(stats?.type).toBe(PrivateRelayType.FLASHBOTS_PROTECT);
    });

    it('should return all stats', () => {
      manager.addRelay({
        type: PrivateRelayType.FLASHBOTS_PROTECT,
        endpoint: 'https://rpc.flashbots.net',
        enabled: true,
        priority: 100,
      });

      manager.addRelay({
        type: PrivateRelayType.MEV_SHARE,
        endpoint: 'https://relay.flashbots.net',
        enabled: true,
        priority: 90,
      });

      const allStats = manager.getStats();
      expect(allStats.size).toBe(2);
    });
  });

  describe('Type Definitions', () => {
    it('should have correct PrivateRelayType enum values', () => {
      expect(PrivateRelayType.FLASHBOTS_PROTECT).toBe('flashbots_protect');
      expect(PrivateRelayType.MEV_SHARE).toBe('mev_share');
      expect(PrivateRelayType.BUILDER_RPC).toBe('builder_rpc');
      expect(PrivateRelayType.PUBLIC_RPC).toBe('public_rpc');
    });

    it('should have correct PrivacyLevel enum values', () => {
      expect(PrivacyLevel.NONE).toBe('none');
      expect(PrivacyLevel.BASIC).toBe('basic');
      expect(PrivacyLevel.ENHANCED).toBe('enhanced');
      expect(PrivacyLevel.MAXIMUM).toBe('maximum');
    });
  });
});
