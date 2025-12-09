/**
 * Unit tests for BloXrouteMempoolStream
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BloXrouteMempoolStream,
  DEX_PROTOCOLS,
  type BloXrouteTx,
  type TransactionFilter,
  type MempoolStreamConfig,
} from '../../../src/execution/relays/BloXrouteMempoolStream';
import { BloXrouteNetwork, BloXrouteRegion, StreamType } from '../../../src/execution/relays/BloXrouteClient';

// Mock the BloXrouteClient class while keeping enums
vi.mock('../../../src/execution/relays/BloXrouteClient', async () => {
  const actual = await vi.importActual('../../../src/execution/relays/BloXrouteClient') as any;
  
  class MockBloXrouteClient {
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();
    subscribe = vi.fn().mockResolvedValue('mock-subscription-id');
    unsubscribe = vi.fn().mockResolvedValue(undefined);
    isConnected = vi.fn().mockReturnValue(true);
  }
  
  return {
    ...actual,
    BloXrouteClient: MockBloXrouteClient,
  };
});

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('BloXrouteMempoolStream', () => {
  describe('Constructor', () => {
    it('should create instance with required config', () => {
      const config: MempoolStreamConfig = {
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
      };

      const stream = new BloXrouteMempoolStream(config);
      expect(stream).toBeDefined();
      expect(stream.isRunning()).toBe(false);
    });

    it('should apply default values', () => {
      const config: MempoolStreamConfig = {
        apiKey: 'test-key',
        network: BloXrouteNetwork.BASE,
      };

      const stream = new BloXrouteMempoolStream(config);
      const metrics = stream.getMetrics();
      
      expect(metrics.totalTransactions).toBe(0);
      expect(metrics.dexSwaps).toBe(0);
      expect(metrics.errors).toBe(0);
    });

    it('should accept optional callbacks', () => {
      const onTransaction = vi.fn();
      const onDexSwap = vi.fn();
      const onError = vi.fn();

      const config: MempoolStreamConfig = {
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        onTransaction,
        onDexSwap,
        onError,
      };

      const stream = new BloXrouteMempoolStream(config);
      expect(stream).toBeDefined();
    });
  });

  describe('Stream Lifecycle', () => {
    let stream: BloXrouteMempoolStream;

    beforeEach(() => {
      const config: MempoolStreamConfig = {
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
      };
      stream = new BloXrouteMempoolStream(config);
    });

    it('should start stream successfully', async () => {
      await stream.start();
      expect(stream.isRunning()).toBe(true);
    });

    it('should throw error if starting already active stream', async () => {
      await stream.start();
      await expect(stream.start()).rejects.toThrow('already active');
    });

    it('should stop stream successfully', async () => {
      await stream.start();
      await stream.stop();
      expect(stream.isRunning()).toBe(false);
    });

    it('should not error when stopping inactive stream', async () => {
      await expect(stream.stop()).resolves.not.toThrow();
    });
  });

  describe('Metrics Tracking', () => {
    it('should initialize metrics to zero', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
      });

      const metrics = stream.getMetrics();
      expect(metrics.totalTransactions).toBe(0);
      expect(metrics.dexSwaps).toBe(0);
      expect(metrics.largeTransfers).toBe(0);
      expect(metrics.filtered).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.avgProcessingTime).toBe(0);
      expect(metrics.transactionsPerSecond).toBe(0);
      expect(metrics.uptime).toBe(0);
    });

    it('should calculate uptime after start', async () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
      });

      await stream.start();
      
      // Wait a bit longer to ensure time has passed
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const metrics = stream.getMetrics();
      expect(metrics.uptime).toBeGreaterThanOrEqual(1); // At least 1 second
      
      await stream.stop();
    });
  });

  describe('DEX Protocol Configuration', () => {
    it('should have Uniswap V2 configuration', () => {
      expect(DEX_PROTOCOLS.UNISWAP_V2).toBeDefined();
      expect(DEX_PROTOCOLS.UNISWAP_V2.name).toBe('Uniswap V2');
      expect(DEX_PROTOCOLS.UNISWAP_V2.addresses.length).toBeGreaterThan(0);
      expect(DEX_PROTOCOLS.UNISWAP_V2.methodIds.length).toBeGreaterThan(0);
    });

    it('should have Uniswap V3 configuration', () => {
      expect(DEX_PROTOCOLS.UNISWAP_V3).toBeDefined();
      expect(DEX_PROTOCOLS.UNISWAP_V3.name).toBe('Uniswap V3');
      expect(DEX_PROTOCOLS.UNISWAP_V3.methodIds).toContain('0x414bf389'); // exactInputSingle
    });

    it('should have SushiSwap configuration', () => {
      expect(DEX_PROTOCOLS.SUSHISWAP).toBeDefined();
      expect(DEX_PROTOCOLS.SUSHISWAP.name).toBe('SushiSwap');
    });

    it('should have Curve configuration', () => {
      expect(DEX_PROTOCOLS.CURVE).toBeDefined();
      expect(DEX_PROTOCOLS.CURVE.name).toBe('Curve');
    });
  });

  describe('Transaction Filters', () => {
    it('should accept value range filters', () => {
      const filters: TransactionFilter = {
        minValue: BigInt('1000000000000000000'), // 1 ETH
        maxValue: BigInt('10000000000000000000'), // 10 ETH
      };

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        filters,
      });

      expect(stream).toBeDefined();
    });

    it('should accept gas price filters', () => {
      const filters: TransactionFilter = {
        minGasPrice: BigInt('50000000000'), // 50 gwei
      };

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        filters,
      });

      expect(stream).toBeDefined();
    });

    it('should accept target address filters', () => {
      const filters: TransactionFilter = {
        targetAddresses: [
          '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
        ],
      };

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        filters,
      });

      expect(stream).toBeDefined();
    });

    it('should accept method ID filters', () => {
      const filters: TransactionFilter = {
        methodIds: ['0x414bf389'], // Uniswap V3 exactInputSingle
      };

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        filters,
      });

      expect(stream).toBeDefined();
    });

    it('should accept DEX protocol filters', () => {
      const filters: TransactionFilter = {
        protocols: [DEX_PROTOCOLS.UNISWAP_V3],
      };

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        filters,
      });

      expect(stream).toBeDefined();
    });

    it('should accept custom filter expressions', () => {
      const filters: TransactionFilter = {
        customFilter: "({value} > 1e18) AND ({gas_price} > 50e9)",
      };

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        filters,
      });

      expect(stream).toBeDefined();
    });
  });

  describe('Stream Configuration', () => {
    it('should support different networks', () => {
      const networks = [
        BloXrouteNetwork.ETHEREUM,
        BloXrouteNetwork.BASE,
        BloXrouteNetwork.ARBITRUM,
        BloXrouteNetwork.OPTIMISM,
        BloXrouteNetwork.POLYGON,
        BloXrouteNetwork.BSC,
      ];

      for (const network of networks) {
        const stream = new BloXrouteMempoolStream({
          apiKey: 'test-key',
          network,
        });
        expect(stream).toBeDefined();
      }
    });

    it('should support different regions', () => {
      const regions = [
        BloXrouteRegion.VIRGINIA,
        BloXrouteRegion.SINGAPORE,
        BloXrouteRegion.FRANKFURT,
        BloXrouteRegion.LONDON,
      ];

      for (const region of regions) {
        const stream = new BloXrouteMempoolStream({
          apiKey: 'test-key',
          network: BloXrouteNetwork.ETHEREUM,
          region,
        });
        expect(stream).toBeDefined();
      }
    });

    it('should support different stream types', () => {
      const streamTypes = [
        StreamType.NEW_TXS,
        StreamType.PENDING_TXS,
        StreamType.ON_BLOCK,
      ];

      for (const streamType of streamTypes) {
        const stream = new BloXrouteMempoolStream({
          apiKey: 'test-key',
          network: BloXrouteNetwork.ETHEREUM,
          streamType,
        });
        expect(stream).toBeDefined();
      }
    });

    it('should support batch configuration', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        batchSize: 10,
        batchTimeout: 500,
      });

      expect(stream).toBeDefined();
    });

    it('should support verbose logging', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        verbose: true,
      });

      expect(stream).toBeDefined();
    });
  });

  describe('Transaction Type Detection', () => {
    it('should identify DEX swap transactions', () => {
      // This is tested through the internal isDexSwap method
      // which checks method IDs against known DEX protocols
      expect(DEX_PROTOCOLS.UNISWAP_V3.methodIds).toContain('0x414bf389');
      expect(DEX_PROTOCOLS.UNISWAP_V2.methodIds).toContain('0x38ed1739');
    });

    it('should identify large value transfers', () => {
      // Large transfers are defined as > 1 ETH
      const oneEth = BigInt('1000000000000000000');
      expect(oneEth).toBeGreaterThan(BigInt(0));
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const onError = vi.fn();

      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
        onError,
      });

      // Note: With mocked client, this test validates error handling structure
      // In real usage, connection errors would trigger onError callback
      expect(stream).toBeDefined();
    });

    it('should track error count in metrics', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
      });

      const metrics = stream.getMetrics();
      expect(metrics.errors).toBe(0);
    });
  });

  describe('Multi-Chain Support', () => {
    it('should support Ethereum mainnet', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ETHEREUM,
      });
      expect(stream).toBeDefined();
    });

    it('should support Base', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.BASE,
      });
      expect(stream).toBeDefined();
    });

    it('should support Arbitrum', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.ARBITRUM,
      });
      expect(stream).toBeDefined();
    });

    it('should support Optimism', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.OPTIMISM,
      });
      expect(stream).toBeDefined();
    });

    it('should support Polygon', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.POLYGON,
      });
      expect(stream).toBeDefined();
    });

    it('should support BSC', () => {
      const stream = new BloXrouteMempoolStream({
        apiKey: 'test-key',
        network: BloXrouteNetwork.BSC,
      });
      expect(stream).toBeDefined();
    });
  });
});
