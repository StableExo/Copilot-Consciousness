/**
 * CrossChainScanner Tests
 * 
 * Tests for multi-chain scanning functionality including:
 * - Event emission API consistency
 * - Provider network validation
 * - Configuration validation
 * - Experimental feature warnings
 */

import { EventEmitter } from 'events';
import { CrossChainScanner } from '../../../src/chains/CrossChainScanner';
import { ChainProviderManager } from '../../../src/chains/ChainProviderManager';
import { ScannerConfig } from '../../../src/config/cross-chain.config';

// Mock dependencies
jest.mock('../../../src/chains/ChainProviderManager');

describe('CrossChainScanner', () => {
  let mockProviderManager: jest.Mocked<ChainProviderManager>;
  let scannerConfig: ScannerConfig;
  
  beforeEach(() => {
    // Create mock provider manager
    mockProviderManager = {
      getAllActiveChains: jest.fn().mockReturnValue([1, 8453, 42161]),
      getProvider: jest.fn(),
      getSolanaConnection: jest.fn(),
      isChainHealthy: jest.fn().mockReturnValue(true),
    } as any;
    
    // Default scanner config - matching actual ScannerConfig interface
    scannerConfig = {
      scanIntervalMs: 5000,
      priceDiscrepancyThreshold: 0.01,
      parallelChainScans: true,
      maxConcurrentScans: 3,
      enableWebSocket: false,
    };
  });
  
  describe('Constructor and Initialization', () => {
    it('should extend EventEmitter for API consistency', () => {
      const scanner = new CrossChainScanner(mockProviderManager, scannerConfig, []);
      expect(scanner).toBeInstanceOf(EventEmitter);
    });
    
    it('should validate configuration on initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      new CrossChainScanner(mockProviderManager, scannerConfig, []);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EXPERIMENTAL feature')
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should warn when scan interval is too short', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      const shortIntervalConfig = { ...scannerConfig, scanIntervalMs: 500 };
      
      new CrossChainScanner(mockProviderManager, shortIntervalConfig, []);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scan interval is very short')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should warn when concurrent scans limit is too high', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      const highConcurrencyConfig = { ...scannerConfig, maxConcurrentScans: 15 };
      
      new CrossChainScanner(mockProviderManager, highConcurrencyConfig, []);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High concurrent scan limit')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should throw error if configuration is missing', () => {
      expect(() => {
        new CrossChainScanner(mockProviderManager, null as any, []);
      }).toThrow('Scanner configuration is required');
    });
  });
  
  describe('Event Emission API', () => {
    it('should emit "stopped" event when scanning stops', () => {
      const mockProvider = {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
      };
      mockProviderManager.getProvider.mockReturnValue(mockProvider as any);
      
      const scanner = new CrossChainScanner(mockProviderManager, scannerConfig, []);
      const eventListener = jest.fn();
      scanner.on('stopped', eventListener);
      
      scanner.stopScanning();
      
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });
  });
});
