import DEXRegistry from '../core/DEXRegistry';
import { JsonRpcProvider } from 'ethers';
import { Connection } from '@solana/web3.js';

const getAccountInfoMock = jest.fn().mockResolvedValue({
    executable: true,
});

jest.mock('@solana/web3.js', () => {
    const originalWeb3 = jest.requireActual('@solana/web3.js');
    return {
        ...originalWeb3,
        Connection: jest.fn().mockImplementation(() => ({
            getAccountInfo: getAccountInfoMock,
        })),
    };
});

describe('DEXRegistry', () => {
  let registry: DEXRegistry;
  let getCodeMock: jest.Mock;

  beforeEach(() => {
    getCodeMock = jest.fn().mockResolvedValue('0x123');
    const mockProvider = {
        getCode: getCodeMock,
    };
    // In ethers v6, JsonRpcProvider is exported directly, so we mock the whole module
    jest.spyOn(JsonRpcProvider.prototype, 'getCode').mockImplementation(getCodeMock);

    (Connection as jest.Mock).mockClear();
    getAccountInfoMock.mockClear();

    registry = new DEXRegistry();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with the correct number of DEXes', () => {
    const allDEXes = registry.getAllDEXes();
    expect(allDEXes.length).toBe(14); // Updated: Added PancakeSwap V3 and Velodrome on Base
  });

  it('should include Raydium in the list of DEXes', () => {
    const raydium = registry.getDEX('Raydium');
    expect(raydium).toBeDefined();
    expect(raydium?.protocol).toBe('Raydium');
  });

  it('should return the correct DEXes for the Solana network', () => {
    const solanaDEXes = registry.getDEXesByNetwork('mainnet-beta');
    expect(solanaDEXes.length).toBe(1);
    expect(solanaDEXes[0].name).toBe('Raydium');
  });

  it('should return the correct DEXes for the EVM network', () => {
    const evmDEXes = registry.getDEXesByNetwork('1');
    expect(evmDEXes.length).toBe(6);
  });

  it('should validate all DEXes successfully', async () => {
    const isValid = await registry.validateDEXes();
    expect(isValid).toBe(true);
    expect(getCodeMock).toHaveBeenCalledTimes(13); // Updated: Now 13 EVM DEXes (added 2 more on Base)
    expect(getAccountInfoMock).toHaveBeenCalledTimes(1);
  });

  it('should return the correct DEXes for Base network (8453)', () => {
    const baseDEXes = registry.getDEXesByNetwork('8453');
    expect(baseDEXes.length).toBe(7); // Updated: Added PancakeSwap V3 and Velodrome
    
    const dexNames = baseDEXes.map(d => d.name);
    expect(dexNames).toContain('Uniswap V3 on Base');
    expect(dexNames).toContain('Aerodrome on Base');
    expect(dexNames).toContain('BaseSwap');
    expect(dexNames).toContain('PancakeSwap V3 on Base');
    expect(dexNames).toContain('Velodrome on Base');
    
    // Verify high-priority DEXes come first
    expect(baseDEXes[0].name).toBe('Uniswap V3 on Base');
    expect(baseDEXes[0].priority).toBe(1);
    expect(baseDEXes[1].name).toBe('Aerodrome on Base');
    expect(baseDEXes[1].priority).toBe(2);
    expect(baseDEXes[2].name).toBe('BaseSwap');
    expect(baseDEXes[2].priority).toBe(3);
  });
});
