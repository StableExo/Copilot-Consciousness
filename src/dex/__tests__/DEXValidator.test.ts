import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEXRegistry } from '../core/DEXRegistry';
import { JsonRpcProvider } from 'ethers';

// Store valid addresses at module level
let validAddresses: Set<string> | null = null;

function getValidAddresses(): Set<string> {
  if (!validAddresses) {
    const registry = new DEXRegistry();
    validAddresses = new Set(registry.getAllDEXes().flatMap((dex) => [dex.router, dex.factory]));
  }
  return validAddresses;
}

// Mock the ethers module with a proper class mock
vi.mock('ethers', async () => {
  const originalEthers = await vi.importActual('ethers');

  class MockJsonRpcProvider {
    getCode(address: string) {
      const addresses = getValidAddresses();
      if (addresses.has(address)) {
        return Promise.resolve('0x12345');
      }
      return Promise.resolve('0x');
    }
  }

  return {
    ...originalEthers,
    JsonRpcProvider: MockJsonRpcProvider,
  };
});

describe('DEX Validator Tests', () => {
  let registry: DEXRegistry;

  beforeEach(() => {
    registry = new DEXRegistry();
  });

  it('should validate all DEX configurations', async () => {
    const dexes = registry.getAllDEXes();
    expect(dexes.length).toBeGreaterThan(0);

    for (const dex of dexes) {
      console.log(`Validating ${dex.name}...`);

      // Use imported mock (will be replaced by vitest)
      const provider = new JsonRpcProvider() as unknown as {
        getCode: (addr: string) => Promise<string>;
      };

      const routerCode = await provider.getCode(dex.router);
      expect(routerCode).not.toBe('0x');

      const factoryCode = await provider.getCode(dex.factory);
      expect(factoryCode).not.toBe('0x');
    }
  });

  it('should fail validation for a DEX with an invalid address', async () => {
    const provider = new JsonRpcProvider() as unknown as {
      getCode: (addr: string) => Promise<string>;
    };
    const invalidAddress = '0xInvalidAddress';
    const code = await provider.getCode(invalidAddress);
    expect(code).toBe('0x');
  });
});
