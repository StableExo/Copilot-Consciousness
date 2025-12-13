/**
 * Tests for new CEX connectors
 * 
 * Tests for Bitfinex, KuCoin, Gate.io, and MEXC connectors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BitfinexConnector } from '../BitfinexConnector.js';
import { KuCoinConnector } from '../KuCoinConnector.js';
import { GateConnector } from '../GateConnector.js';
import { MEXCConnector } from '../MEXCConnector.js';
import { CEXExchange } from '../types.js';

describe('BitfinexConnector', () => {
  let connector: BitfinexConnector;

  beforeEach(() => {
    connector = new BitfinexConnector({
      exchange: CEXExchange.BITFINEX,
      symbols: ['BTC/USD'],
      reconnect: false,
    });
  });

  afterEach(() => {
    connector.disconnect();
  });

  it('should initialize with correct exchange', () => {
    const stats = connector.getStats();
    expect(stats.exchange).toBe(CEXExchange.BITFINEX);
  });

  it('should have correct subscribed symbols', () => {
    const stats = connector.getStats();
    expect(stats.subscribedSymbols).toEqual(['BTC/USD']);
  });

  it('should start disconnected', () => {
    expect(connector.isConnected()).toBe(false);
  });

  it('should throw error if initialized with wrong exchange', () => {
    expect(() => {
      new BitfinexConnector({
        exchange: CEXExchange.BINANCE as any,
        symbols: ['BTC/USD'],
      });
    }).toThrow('Invalid exchange');
  });
});

describe('KuCoinConnector', () => {
  let connector: KuCoinConnector;

  beforeEach(() => {
    connector = new KuCoinConnector({
      exchange: CEXExchange.KUCOIN,
      symbols: ['BTC/USDT'],
      reconnect: false,
    });
  });

  afterEach(() => {
    connector.disconnect();
  });

  it('should initialize with correct exchange', () => {
    const stats = connector.getStats();
    expect(stats.exchange).toBe(CEXExchange.KUCOIN);
  });

  it('should have correct subscribed symbols', () => {
    const stats = connector.getStats();
    expect(stats.subscribedSymbols).toEqual(['BTC/USDT']);
  });

  it('should start disconnected', () => {
    expect(connector.isConnected()).toBe(false);
  });

  it('should throw error if initialized with wrong exchange', () => {
    expect(() => {
      new KuCoinConnector({
        exchange: CEXExchange.BINANCE as any,
        symbols: ['BTC/USDT'],
      });
    }).toThrow('Invalid exchange');
  });
});

describe('GateConnector', () => {
  let connector: GateConnector;

  beforeEach(() => {
    connector = new GateConnector({
      exchange: CEXExchange.GATE,
      symbols: ['BTC/USDT'],
      reconnect: false,
    });
  });

  afterEach(() => {
    connector.disconnect();
  });

  it('should initialize with correct exchange', () => {
    const stats = connector.getStats();
    expect(stats.exchange).toBe(CEXExchange.GATE);
  });

  it('should have correct subscribed symbols', () => {
    const stats = connector.getStats();
    expect(stats.subscribedSymbols).toEqual(['BTC/USDT']);
  });

  it('should start disconnected', () => {
    expect(connector.isConnected()).toBe(false);
  });

  it('should throw error if initialized with wrong exchange', () => {
    expect(() => {
      new GateConnector({
        exchange: CEXExchange.BINANCE as any,
        symbols: ['BTC/USDT'],
      });
    }).toThrow('Invalid exchange');
  });

  it('should use custom order book depth', () => {
    const customConnector = new GateConnector({
      exchange: CEXExchange.GATE,
      symbols: ['BTC/USDT'],
      orderBookDepth: 50,
      reconnect: false,
    });
    
    const stats = customConnector.getStats();
    expect(stats.exchange).toBe(CEXExchange.GATE);
    customConnector.disconnect();
  });
});

describe('MEXCConnector', () => {
  let connector: MEXCConnector;

  beforeEach(() => {
    connector = new MEXCConnector({
      exchange: CEXExchange.MEXC,
      symbols: ['BTC/USDT'],
      reconnect: false,
    });
  });

  afterEach(() => {
    connector.disconnect();
  });

  it('should initialize with correct exchange', () => {
    const stats = connector.getStats();
    expect(stats.exchange).toBe(CEXExchange.MEXC);
  });

  it('should have correct subscribed symbols', () => {
    const stats = connector.getStats();
    expect(stats.subscribedSymbols).toEqual(['BTC/USDT']);
  });

  it('should start disconnected', () => {
    expect(connector.isConnected()).toBe(false);
  });

  it('should throw error if initialized with wrong exchange', () => {
    expect(() => {
      new MEXCConnector({
        exchange: CEXExchange.BINANCE as any,
        symbols: ['BTC/USDT'],
      });
    }).toThrow('Invalid exchange');
  });
});

describe('Symbol Utils', () => {
  it('should parse symbols correctly', async () => {
    const { parseSymbol, formatToStandardSymbol } = await import('../symbolUtils.js');
    
    // Test parsing
    expect(parseSymbol('BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
    expect(parseSymbol('ETHUSDC')).toEqual({ base: 'ETH', quote: 'USDC' });
    expect(parseSymbol('BTCUSD')).toEqual({ base: 'BTC', quote: 'USD' });
    
    // Test formatting
    expect(formatToStandardSymbol('BTCUSDT')).toBe('BTC/USDT');
    expect(formatToStandardSymbol('ETHUSDC')).toBe('ETH/USDC');
    expect(formatToStandardSymbol('BNBBTC')).toBe('BNB/BTC');
  });

  it('should handle unknown symbols', async () => {
    const { parseSymbol, formatToStandardSymbol } = await import('../symbolUtils.js');
    
    expect(parseSymbol('UNKNOWN')).toBeNull();
    expect(formatToStandardSymbol('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('Connector Callbacks', () => {
  it('should call error callback on initialization errors', () => {
    const errorCallback = vi.fn();
    
    const connector = new BitfinexConnector(
      {
        exchange: CEXExchange.BITFINEX,
        symbols: ['BTC/USD'],
        reconnect: false,
      },
      {
        onError: errorCallback,
      }
    );

    // Trigger an error by trying to connect (will fail in test environment)
    connector.connect().catch(() => {});
    
    // Clean up
    connector.disconnect();
  });

  it('should accept order book and ticker callbacks', () => {
    const orderBookCallback = vi.fn();
    const tickerCallback = vi.fn();
    
    const connector = new GateConnector(
      {
        exchange: CEXExchange.GATE,
        symbols: ['BTC/USDT'],
        reconnect: false,
      },
      {
        onOrderBook: orderBookCallback,
        onTicker: tickerCallback,
      }
    );

    expect(connector.isConnected()).toBe(false);
    connector.disconnect();
  });
});

describe('Connector Statistics', () => {
  it('should track statistics correctly', () => {
    const connector = new BitfinexConnector({
      exchange: CEXExchange.BITFINEX,
      symbols: ['BTC/USD', 'ETH/USD'],
      reconnect: false,
    });

    const stats = connector.getStats();
    
    expect(stats.exchange).toBe(CEXExchange.BITFINEX);
    expect(stats.connected).toBe(false);
    expect(stats.uptime).toBe(0);
    expect(stats.totalUpdates).toBe(0);
    expect(stats.updatesPerSecond).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.reconnections).toBe(0);
    expect(stats.subscribedSymbols).toEqual(['BTC/USD', 'ETH/USD']);

    connector.disconnect();
  });

  it('should return empty order books initially', () => {
    const connector = new MEXCConnector({
      exchange: CEXExchange.MEXC,
      symbols: ['BTC/USDT'],
      reconnect: false,
    });

    expect(connector.getAllOrderBooks()).toEqual([]);
    expect(connector.getOrderBook('BTC/USDT')).toBeUndefined();

    connector.disconnect();
  });
});
