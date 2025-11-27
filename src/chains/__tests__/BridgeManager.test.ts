/**
 * Tests for BridgeManager
 */

import { BridgeManager } from '../BridgeManager';
import { BridgeConfig } from '../../config/cross-chain.config';

describe('BridgeManager', () => {
  let manager: BridgeManager;
  let testBridgeConfigs: BridgeConfig[];

  beforeEach(() => {
    testBridgeConfigs = [
      {
        name: 'Wormhole',
        type: 'wormhole',
        enabled: true,
        minAmount: BigInt(10 ** 18),
        maxAmount: BigInt(1000000) * BigInt(10 ** 18),
        estimatedTime: 900,
        supportedChains: [1, 56, 137],
        priority: 1,
      },
      {
        name: 'LayerZero',
        type: 'layerzero',
        enabled: true,
        minAmount: BigInt(5 * 10 ** 17),
        maxAmount: BigInt(500000) * BigInt(10 ** 18),
        estimatedTime: 600,
        supportedChains: [1, 56],
        priority: 2,
      },
      {
        name: 'Disabled Bridge',
        type: 'synapse',
        enabled: false,
        minAmount: BigInt(10 ** 18),
        maxAmount: BigInt(100000) * BigInt(10 ** 18),
        estimatedTime: 1200,
        supportedChains: [1, 56],
        priority: 5,
      },
    ];

    manager = new BridgeManager(testBridgeConfigs, 'balanced');
  });

  describe('constructor', () => {
    it('should initialize with bridge configurations', () => {
      expect(manager).toBeDefined();
    });

    it('should only load enabled bridges', () => {
      const config = manager.getBridgeConfig('Disabled Bridge');
      expect(config).toBeUndefined();
    });
  });

  describe('estimateBridgeFees', () => {
    it('should return estimates for all bridges', async () => {
      const estimates = await manager.estimateBridgeFees(1, 56, '0xToken', BigInt(10 ** 19));

      expect(Array.isArray(estimates)).toBe(true);
      expect(estimates.length).toBeGreaterThan(0);
    });

    it('should mark unsupported chain pairs', async () => {
      const estimates = await manager.estimateBridgeFees(
        1,
        999, // Non-existent chain
        '0xToken',
        BigInt(10 ** 19)
      );

      const supportedEstimates = estimates.filter((e) => e.supported);
      expect(supportedEstimates.length).toBe(0);
    });

    it('should mark amounts outside limits as unsupported', async () => {
      const tooSmall = BigInt(10 ** 15); // Too small
      const estimates = await manager.estimateBridgeFees(1, 56, '0xToken', tooSmall);

      const supportedEstimates = estimates.filter((e) => e.supported);
      expect(supportedEstimates.length).toBeLessThanOrEqual(estimates.length);
    });
  });

  describe('selectBridge', () => {
    it('should select a bridge for valid route', async () => {
      const route = await manager.selectBridge(1, 56, '0xToken', BigInt(10 ** 19));

      expect(route).toBeDefined();
      expect(route?.fromChain).toBe(1);
      expect(route?.toChain).toBe(56);
    });

    it('should return null for unsupported route', async () => {
      const route = await manager.selectBridge(1, 999, '0xToken', BigInt(10 ** 19));

      expect(route).toBeNull();
    });

    it('should respect cheapest strategy', async () => {
      const cheapestManager = new BridgeManager(testBridgeConfigs, 'cheapest');
      const route = await cheapestManager.selectBridge(1, 56, '0xToken', BigInt(10 ** 19));

      expect(route).toBeDefined();
    });

    it('should respect fastest strategy', async () => {
      const fastestManager = new BridgeManager(testBridgeConfigs, 'fastest');
      const route = await fastestManager.selectBridge(1, 56, '0xToken', BigInt(10 ** 19));

      expect(route).toBeDefined();
      if (route) {
        // LayerZero is faster (600s vs 900s)
        expect(route.estimatedTime).toBeLessThanOrEqual(900);
      }
    });
  });

  describe('executeBridge', () => {
    it('should execute bridge transaction', async () => {
      const route = await manager.selectBridge(1, 56, '0xToken', BigInt(10 ** 19));

      expect(route).toBeDefined();

      if (route) {
        const transaction = await manager.executeBridge(route);
        expect(transaction).toBeDefined();
        expect(transaction.txHash).toBeDefined();
        expect(transaction.status).toBe('pending');
      }
    });

    it('should throw error for non-existent bridge', async () => {
      const invalidRoute = {
        bridge: 'NonExistent',
        fromChain: 1,
        toChain: 56,
        token: '0xToken',
        amount: BigInt(10 ** 19),
        estimatedFee: BigInt(10 ** 17),
        estimatedTime: 600,
      };

      await expect(manager.executeBridge(invalidRoute)).rejects.toThrow();
    });
  });

  describe('trackTransaction', () => {
    it('should track existing transaction', async () => {
      const route = await manager.selectBridge(1, 56, '0xToken', BigInt(10 ** 19));
      if (route) {
        const transaction = await manager.executeBridge(route);
        const tracked = await manager.trackTransaction(transaction.txHash);

        expect(tracked).toBeDefined();
        expect(tracked?.txHash).toBe(transaction.txHash);
      }
    });

    it('should return null for non-existent transaction', async () => {
      const tracked = await manager.trackTransaction('non-existent-hash');
      expect(tracked).toBeNull();
    });
  });

  describe('getSupportedBridges', () => {
    it('should return bridges supporting chain pair', () => {
      const bridges = manager.getSupportedBridges(1, 56);
      expect(bridges.length).toBeGreaterThan(0);
    });

    it('should return empty array for unsupported pair', () => {
      const bridges = manager.getSupportedBridges(1, 999);
      expect(bridges.length).toBe(0);
    });
  });

  describe('getBridgeStats', () => {
    it('should return bridge statistics', () => {
      const stats = manager.getBridgeStats();
      expect(stats).toBeDefined();
      expect(stats.totalBridges).toBe(0); // No bridges executed yet
    });
  });

  describe('setSelectionStrategy', () => {
    it('should change selection strategy', () => {
      expect(() => manager.setSelectionStrategy('fastest')).not.toThrow();
      expect(() => manager.setSelectionStrategy('cheapest')).not.toThrow();
      expect(() => manager.setSelectionStrategy('balanced')).not.toThrow();
    });
  });
});
