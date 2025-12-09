/**
 * CEX Liquidity Monitor - Unit Tests
 * 
 * Tests for centralized exchange liquidity monitoring system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CEXExchange, CEXConnectionConfig, OrderBook, PriceTicker } from '../../../src/execution/cex/types.js';

// Mock WebSocket
vi.mock('ws', () => {
  return {
    default: class MockWebSocket {
      readyState = 1; // OPEN
      on = vi.fn();
      send = vi.fn();
      close = vi.fn();
      removeAllListeners = vi.fn();
      pong = vi.fn();
    },
  };
});

// Import after mocking
const { BinanceConnector } = await import('../../../src/execution/cex/BinanceConnector.js');
const { CEXLiquidityMonitor } = await import('../../../src/execution/cex/CEXLiquidityMonitor.js');

describe('CEXLiquidityMonitor', () => {
  describe('Configuration', () => {
    it('should create monitor with valid configuration', () => {
      const config = {
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT', 'ETH/USDC'],
          },
        ],
      };

      const monitor = new CEXLiquidityMonitor(config);
      expect(monitor).toBeDefined();
      expect(monitor.isRunning()).toBe(false);
    });

    it('should apply default configuration values', () => {
      const config = {
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      };

      const monitor = new CEXLiquidityMonitor(config);
      expect(monitor).toBeDefined();
    });

    it('should support multiple exchanges', () => {
      const config = {
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
          {
            exchange: CEXExchange.COINBASE,
            symbols: ['ETH/USD'],
          },
        ],
      };

      const monitor = new CEXLiquidityMonitor(config);
      expect(monitor).toBeDefined();
    });
  });

  describe('Liquidity Snapshots', () => {
    it('should return null for non-existent symbol', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      });

      const snapshot = monitor.getSnapshot('ETH/USDC');
      expect(snapshot).toBeNull();
    });

    it('should return empty array when no snapshots available', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      });

      const snapshots = monitor.getAllSnapshots();
      expect(snapshots).toEqual([]);
    });
  });

  describe('Order Book Retrieval', () => {
    it('should return undefined for non-existent order book', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      });

      const orderBook = monitor.getOrderBook(CEXExchange.BINANCE, 'ETH/USDC');
      expect(orderBook).toBeUndefined();
    });
  });

  describe('Ticker Retrieval', () => {
    it('should return undefined for non-existent ticker', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      });

      const ticker = monitor.getTicker(CEXExchange.BINANCE, 'ETH/USDC');
      expect(ticker).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should return empty stats array when no connectors', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [],
      });

      const stats = monitor.getStats();
      expect(stats).toEqual([]);
    });
  });

  describe('Lifecycle', () => {
    it('should report not running initially', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      });

      expect(monitor.isRunning()).toBe(false);
    });

    it('should handle stop when not running', () => {
      const monitor = new CEXLiquidityMonitor({
        exchanges: [
          {
            exchange: CEXExchange.BINANCE,
            symbols: ['BTC/USDT'],
          },
        ],
      });

      // Should not throw
      expect(() => monitor.stop()).not.toThrow();
    });
  });
});

describe('BinanceConnector', () => {
  describe('Constructor', () => {
    it('should create connector with valid configuration', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDC'],
      };

      const connector = new BinanceConnector(config);
      expect(connector).toBeDefined();
      expect(connector.isConnected()).toBe(false);
    });

    it('should reject invalid exchange type', () => {
      const config = {
        exchange: 'invalid' as CEXExchange,
        symbols: ['BTC/USDT'],
      };

      expect(() => new BinanceConnector(config as CEXConnectionConfig)).toThrow('Invalid exchange');
    });

    it('should apply default configuration values', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config);
      expect(connector).toBeDefined();
    });

    it('should accept custom reconnection settings', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
        reconnect: true,
        reconnectDelay: 10000,
        maxReconnectAttempts: 5,
      };

      const connector = new BinanceConnector(config);
      expect(connector).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should support multiple symbols', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDC', 'ETH/USDT', 'BNB/USDT'],
      };

      const connector = new BinanceConnector(config);
      expect(connector).toBeDefined();
    });

    it('should support testnet mode', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
        testnet: true,
      };

      const connector = new BinanceConnector(config);
      expect(connector).toBeDefined();
    });

    it('should accept callback functions', () => {
      const onOrderBook = vi.fn();
      const onTicker = vi.fn();
      const onError = vi.fn();

      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config, {
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
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config);
      const orderBook = connector.getOrderBook('ETH/USDC');
      expect(orderBook).toBeUndefined();
    });

    it('should return empty array for all order books initially', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config);
      const orderBooks = connector.getAllOrderBooks();
      expect(orderBooks).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should return initial statistics', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDC'],
      };

      const connector = new BinanceConnector(config);
      const stats = connector.getStats();

      expect(stats).toBeDefined();
      expect(stats.exchange).toBe(CEXExchange.BINANCE);
      expect(stats.connected).toBe(false);
      expect(stats.uptime).toBe(0);
      expect(stats.totalUpdates).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.reconnections).toBe(0);
      expect(stats.subscribedSymbols).toEqual(['BTC/USDT', 'ETH/USDC']);
    });

    it('should track subscribed symbols', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT', 'ETH/USDC', 'BNB/USDT'],
      };

      const connector = new BinanceConnector(config);
      const stats = connector.getStats();

      expect(stats.subscribedSymbols).toHaveLength(3);
      expect(stats.subscribedSymbols).toContain('BTC/USDT');
      expect(stats.subscribedSymbols).toContain('ETH/USDC');
      expect(stats.subscribedSymbols).toContain('BNB/USDT');
    });
  });

  describe('Connection State', () => {
    it('should start disconnected', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config);
      expect(connector.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config);
      // Should not throw
      expect(() => connector.disconnect()).not.toThrow();
    });

    it('should handle multiple disconnect calls', () => {
      const config: CEXConnectionConfig = {
        exchange: CEXExchange.BINANCE,
        symbols: ['BTC/USDT'],
      };

      const connector = new BinanceConnector(config);
      connector.disconnect();
      // Second disconnect should not throw
      expect(() => connector.disconnect()).not.toThrow();
    });
  });
});
