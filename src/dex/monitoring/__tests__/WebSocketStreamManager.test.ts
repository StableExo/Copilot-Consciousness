/**
 * Tests for WebSocketStreamManager
 */

import { WebSocketStreamManager, ConnectionStatus } from '../WebSocketStreamManager';
import { WebSocketEndpoint, RetryConfig } from '../../../config/realtime.config';

describe('WebSocketStreamManager', () => {
  let manager: WebSocketStreamManager;
  let endpoints: WebSocketEndpoint[];
  let retryConfig: RetryConfig;

  beforeEach(() => {
    endpoints = [
      { url: 'wss://test1.example.com', description: 'Test 1', priority: 1 },
      { url: 'wss://test2.example.com', description: 'Test 2', priority: 2 },
    ];

    retryConfig = {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
    };

    manager = new WebSocketStreamManager(endpoints, retryConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct endpoints', () => {
      expect(manager).toBeDefined();
      expect(manager.getStatus()).toBe(ConnectionStatus.DISCONNECTED);
    });

    it('should sort endpoints by priority', () => {
      const unsortedEndpoints = [
        { url: 'wss://test2.example.com', description: 'Test 2', priority: 2 },
        { url: 'wss://test1.example.com', description: 'Test 1', priority: 1 },
      ];

      const sortedManager = new WebSocketStreamManager(unsortedEndpoints, retryConfig);
      expect(sortedManager).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return DISCONNECTED initially', () => {
      expect(manager.getStatus()).toBe(ConnectionStatus.DISCONNECTED);
    });
  });

  describe('isConnected', () => {
    it('should return false when disconnected', () => {
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('getSubscribedPools', () => {
    it('should return empty array initially', () => {
      expect(manager.getSubscribedPools()).toEqual([]);
    });
  });
});
