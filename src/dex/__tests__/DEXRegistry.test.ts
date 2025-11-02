import DEXRegistry from '../core/DEXRegistry';
import { ethers } from 'ethers';
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
    jest.spyOn(ethers.providers, 'JsonRpcProvider').mockImplementation(() => mockProvider as any);

    (Connection as jest.Mock).mockClear();
    getAccountInfoMock.mockClear();

    registry = new DEXRegistry();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with the correct number of DEXes', () => {
    const allDEXes = registry.getAllDEXes();
    expect(allDEXes.length).toBe(9);
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
    expect(getCodeMock).toHaveBeenCalledTimes(8);
    expect(getAccountInfoMock).toHaveBeenCalledTimes(1);
  });
});
