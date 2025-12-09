/**
 * Unit tests for KrakenConnector
 * 
 * Tests the Coinbase WebSocket connector for orderbook and ticker streaming.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KrakenConnector } from '../../../src/execution/cex/KrakenConnector.js';
import { CEXExchange, CEXConnectionConfig } from '../../../src/execution/cex/types.js';
import WebSocket from 'ws';

// Mock WebSocket
vi.mock('ws');

describe('KrakenConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create connector with valid configuration', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD', 'ETH/USD'],
      };

      const connector = new KrakenConnector(config);
      expect(connector).toBeDefined();
      expect(connector.isConnected()).toBe(false);
    });

    it('should reject invalid exchange type', () => {
      const config = {
        exchange: 'invalid' as CEXExchange,
        symbols: ['BTC/USD'],
      };

      expect(() => new KrakenConnector(config as CEXConnectionConfig)).toThrow('Invalid exchange');
    });

    it('should apply default configuration values', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      expect(connector).toBeDefined();
    });

    it('should accept custom reconnection settings', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
        reconnect: true,
        reconnectDelay: 10000,
        maxReconnectAttempts: 5,
      };

      const connector = new KrakenConnector(config);
      expect(connector).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should support multiple symbols', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
      };

      const connector = new KrakenConnector(config);
      expect(connector).toBeDefined();
    });

    it('should support testnet mode', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
        testnet: true,
      };

      const connector = new KrakenConnector(config);
      expect(connector).toBeDefined();
    });

    it('should accept callback functions', () => {
      const onOrderBook = vi.fn();
      const onTicker = vi.fn();
      const onError = vi.fn();

      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config, {
        onOrderBook,
        onTicker,
        onError,
      });

      expect(connector).toBeDefined();
    });
  });

  describe('Order Book Retrieval', () => {
    it('should return undefined for non-existent order book', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      const orderBook = connector.getOrderBook('ETH/USD');
      expect(orderBook).toBeUndefined();
    });

    it('should return empty array for all order books initially', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      const allOrderBooks = connector.getAllOrderBooks();
      expect(allOrderBooks).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should return initial statistics', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      const stats = connector.getStats();
      
      expect(stats.exchange).toBe(CEXExchange.KRAKEN);
      expect(stats.connected).toBe(false);
      expect(stats.uptime).toBe(0);
      expect(stats.totalUpdates).toBe(0);
      expect(stats.updatesPerSecond).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.reconnections).toBe(0);
    });
  });

  describe('Connection State', () => {
    it('should start disconnected', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      expect(connector.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      expect(() => connector.disconnect()).not.toThrow();
    });

    it('should handle multiple disconnect calls', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.KRAKEN,
        symbols: ['BTC/USD'],
      };

      const connector = new KrakenConnector(config);
      connector.disconnect();
      expect(() => connector.disconnect()).not.toThrow();
    });
  });
});
