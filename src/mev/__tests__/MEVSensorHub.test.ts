/**
 * Tests for MEVSensorHub
 */

import { MEVSensorHub } from '../sensors/MEVSensorHub';
import { ethers } from 'ethers';

// Mock provider for testing
class MockProvider {
  getBlockNumber(): Promise<number> {
    return Promise.resolve(1000);
  }

  getBlock(): Promise<any> {
    return Promise.resolve({
      transactions: [],
      gasUsed: ethers.BigNumber.from(8000000),
      gasLimit: ethers.BigNumber.from(10000000),
      baseFeePerGas: ethers.BigNumber.from(50000000000),
    });
  }

  getBlockWithTransactions(): Promise<any> {
    return Promise.resolve({
      transactions: [
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x68b3465833fb72A70f208F2388Ac69476D97006d',
          gasPrice: ethers.BigNumber.from(100000000000),
        },
      ],
    });
  }
}

describe('MEVSensorHub', () => {
  let sensorHub: MEVSensorHub;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = new MockProvider() as any;
    sensorHub = new MEVSensorHub(mockProvider, 100); // 100ms interval for testing
  });

  afterEach(() => {
    if (sensorHub.isActive()) {
      sensorHub.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const params = sensorHub.getRiskParams();
      expect(params.mempoolCongestion).toBe(0.0);
      expect(params.searcherDensity).toBe(0.0);
      expect(params.timestamp).toBe(0);
    });

    it('should not be running initially', () => {
      expect(sensorHub.isActive()).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start successfully', () => {
      sensorHub.start();
      expect(sensorHub.isActive()).toBe(true);
    });

    it('should stop successfully', () => {
      sensorHub.start();
      sensorHub.stop();
      expect(sensorHub.isActive()).toBe(false);
    });

    it('should warn when starting already running hub', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      sensorHub.start();
      sensorHub.start();
      expect(consoleWarnSpy).toHaveBeenCalledWith('MEVSensorHub is already running');
      consoleWarnSpy.mockRestore();
    });

    it('should warn when stopping already stopped hub', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      sensorHub.stop();
      expect(consoleWarnSpy).toHaveBeenCalledWith('MEVSensorHub is not running');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getRiskParams', () => {
    it('should return risk parameters', () => {
      const params = sensorHub.getRiskParams();
      expect(params).toHaveProperty('mempoolCongestion');
      expect(params).toHaveProperty('searcherDensity');
      expect(params).toHaveProperty('timestamp');
    });

    it('should return a copy of the parameters', () => {
      const params1 = sensorHub.getRiskParams();
      params1.mempoolCongestion = 999;
      const params2 = sensorHub.getRiskParams();
      expect(params2.mempoolCongestion).not.toBe(999);
    });
  });

  describe('getCongestion', () => {
    it('should return current congestion value', () => {
      const congestion = sensorHub.getCongestion();
      expect(typeof congestion).toBe('number');
      expect(congestion).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDensity', () => {
    it('should return current density value', () => {
      const density = sensorHub.getDensity();
      expect(typeof density).toBe('number');
      expect(density).toBeGreaterThanOrEqual(0);
    });
  });

  describe('forceUpdate', () => {
    it('should update sensor readings', async () => {
      const oldTimestamp = sensorHub.getRiskParams().timestamp;
      await sensorHub.forceUpdate();
      const newTimestamp = sensorHub.getRiskParams().timestamp;
      expect(newTimestamp).toBeGreaterThan(oldTimestamp);
    });

    it('should return updated risk params', async () => {
      const params = await sensorHub.forceUpdate();
      expect(params).toHaveProperty('mempoolCongestion');
      expect(params).toHaveProperty('searcherDensity');
      expect(params).toHaveProperty('timestamp');
      expect(params.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getUpdateAge', () => {
    it('should return age of last update', async () => {
      await sensorHub.forceUpdate();
      const age = sensorHub.getUpdateAge();
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should increase over time', async () => {
      await sensorHub.forceUpdate();
      const age1 = sensorHub.getUpdateAge();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const age2 = sensorHub.getUpdateAge();
      expect(age2).toBeGreaterThanOrEqual(age1);
    });
  });

  describe('periodic updates', () => {
    it('should update sensors periodically when running', async () => {
      sensorHub.start();
      const initialTimestamp = sensorHub.getRiskParams().timestamp;

      // Wait for at least one update
      await new Promise((resolve) => setTimeout(resolve, 150));

      const updatedTimestamp = sensorHub.getRiskParams().timestamp;
      expect(updatedTimestamp).toBeGreaterThan(initialTimestamp);
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle sensor errors gracefully', async () => {
      const errorProvider = {
        getBlockNumber: () => Promise.reject(new Error('Network error')),
        getBlock: () => Promise.reject(new Error('Network error')),
        getBlockWithTransactions: () => Promise.reject(new Error('Network error')),
      } as any;

      const errorHub = new MEVSensorHub(errorProvider);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await errorHub.forceUpdate();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
