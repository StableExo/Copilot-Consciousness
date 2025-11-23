/**
 * Tests for MulticallBatcher
 */

import { ethers } from 'ethers';
import { MulticallBatcher, batchCheckPoolsExist, batchFetchPoolData, MULTICALL3_ADDRESS } from '../MulticallBatcher';

describe('MulticallBatcher', () => {
  let provider: ethers.providers.Provider;
  let batcher: MulticallBatcher;

  beforeEach(() => {
    // Use a mock provider for testing
    provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    batcher = new MulticallBatcher(provider);
  });

  describe('initialization', () => {
    it('should initialize with default parameters', () => {
      expect(batcher).toBeDefined();
    });

    it('should initialize with custom multicall address', () => {
      const customAddress = '0x1234567890123456789012345678901234567890';
      const customBatcher = new MulticallBatcher(provider, customAddress);
      expect(customBatcher).toBeDefined();
    });

    it('should initialize with custom batch size', () => {
      const customBatcher = new MulticallBatcher(provider, MULTICALL3_ADDRESS, 50);
      expect(customBatcher).toBeDefined();
    });
  });

  describe('executeBatch', () => {
    it('should return empty array for empty calls', async () => {
      const results = await batcher.executeBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('encoding and decoding', () => {
    it('should encode function call correctly', () => {
      const iface = new ethers.utils.Interface([
        'function balanceOf(address owner) view returns (uint256)',
      ]);

      const callData = MulticallBatcher.encodeCall(
        iface,
        'balanceOf',
        ['0x1234567890123456789012345678901234567890']
      );

      expect(callData).toBeDefined();
      expect(typeof callData).toBe('string');
      expect(callData.startsWith('0x')).toBe(true);
    });

    it('should decode function result correctly', () => {
      const iface = new ethers.utils.Interface([
        'function balanceOf(address owner) view returns (uint256)',
      ]);

      // Encoded result for uint256(1000)
      const encodedResult = '0x00000000000000000000000000000000000000000000000000000000000003e8';
      
      const decoded = MulticallBatcher.decodeResult(iface, 'balanceOf', encodedResult);
      expect(decoded[0].toString()).toBe('1000');
    });
  });
});

describe('batchCheckPoolsExist', () => {
  let provider: ethers.providers.Provider;

  beforeEach(() => {
    provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  });

  it('should return empty map for empty addresses', async () => {
    const results = await batchCheckPoolsExist(provider, []);
    expect(results.size).toBe(0);
  });
});

describe('batchFetchPoolData', () => {
  let provider: ethers.providers.Provider;

  beforeEach(() => {
    provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  });

  it('should return empty map for empty addresses', async () => {
    const results = await batchFetchPoolData(provider, [], false);
    expect(results.size).toBe(0);
  });
});
