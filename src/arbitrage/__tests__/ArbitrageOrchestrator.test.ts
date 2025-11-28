import { ArbitrageOrchestrator } from '../ArbitrageOrchestrator';
import { DEXRegistry } from '../../dex/core/DEXRegistry';
import { PathfindingConfig } from '../types';

// Mock the MultiHopDataFetcher to avoid actual network calls
jest.mock('../MultiHopDataFetcher', () => {
  return {
    MultiHopDataFetcher: jest.fn().mockImplementation(() => ({
      buildGraphEdges: jest.fn().mockResolvedValue([]),
      clearCache: jest.fn(),
      getCachedPoolCount: jest.fn().mockReturnValue(0),
    })),
  };
});

describe('ArbitrageOrchestrator', () => {
  let orchestrator: ArbitrageOrchestrator;
  let registry: DEXRegistry;
  let config: PathfindingConfig;

  beforeEach(() => {
    registry = new DEXRegistry();
    config = {
      maxHops: 3,
      minProfitThreshold: BigInt('1000000000000000000'), // 1 token
      maxSlippage: 0.05,
      gasPrice: BigInt(50000000000), // 50 gwei
    };
    orchestrator = new ArbitrageOrchestrator(registry, config, config.gasPrice);
  });

  describe('constructor', () => {
    it('should initialize with registry and configuration', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getConfig()).toEqual(config);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const currentConfig = orchestrator.getConfig();

      expect(currentConfig.maxHops).toBe(3);
      expect(currentConfig.minProfitThreshold).toBe(BigInt('1000000000000000000'));
      expect(currentConfig.maxSlippage).toBe(0.05);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      orchestrator.updateConfig({
        maxHops: 5,
        minProfitThreshold: BigInt('2000000000000000000'),
      });

      const updatedConfig = orchestrator.getConfig();

      expect(updatedConfig.maxHops).toBe(5);
      expect(updatedConfig.minProfitThreshold).toBe(BigInt('2000000000000000000'));
      expect(updatedConfig.maxSlippage).toBe(0.05); // Unchanged
    });
  });

  describe('updateGasPrice', () => {
    it('should update gas price', () => {
      const newGasPrice = BigInt(100000000000); // 100 gwei
      orchestrator.updateGasPrice(newGasPrice);

      const updatedConfig = orchestrator.getConfig();
      expect(updatedConfig.gasPrice).toBe(newGasPrice);
    });
  });

  describe('getStats', () => {
    it('should return orchestrator statistics', () => {
      const stats = orchestrator.getStats();

      expect(stats).toHaveProperty('tokenCount');
      expect(stats).toHaveProperty('edgeCount');
      expect(stats).toHaveProperty('cachedPools');
      expect(typeof stats.tokenCount).toBe('number');
      expect(typeof stats.edgeCount).toBe('number');
      expect(typeof stats.cachedPools).toBe('number');
    });
  });

  describe('clearCache', () => {
    it('should clear cache without errors', () => {
      expect(() => orchestrator.clearCache()).not.toThrow();
    });
  });
});
