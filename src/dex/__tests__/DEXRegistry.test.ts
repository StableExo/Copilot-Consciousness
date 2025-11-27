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
    expect(allDEXes.length).toBe(95); // Updated: Total DEXes across all chains (10 Solana + 85 EVM)
  });

  it('should include Raydium in the list of DEXes', () => {
    const raydium = registry.getDEX('Raydium');
    expect(raydium).toBeDefined();
    expect(raydium?.protocol).toBe('Raydium');
  });

  it('should return the correct DEXes for the Solana network', () => {
    const solanaDEXes = registry.getDEXesByNetwork('mainnet-beta');
    expect(solanaDEXes.length).toBe(10); // Updated: 10 Solana DEXes
    // First DEX is now Jupiter Exchange (top aggregator by volume)
    expect(solanaDEXes[0].name).toBe('Jupiter Exchange');
  });

  it('should return the correct DEXes for the EVM network', () => {
    const evmDEXes = registry.getDEXesByNetwork('1');
    expect(evmDEXes.length).toBe(11); // Updated: Ethereum mainnet now has 11 DEXes
  });

  it('should validate all DEXes successfully', async () => {
    const isValid = await registry.validateDEXes();
    expect(isValid).toBe(true);
    expect(getCodeMock).toHaveBeenCalledTimes(85); // Updated: 85 EVM DEXes across all chains
    expect(getAccountInfoMock).toHaveBeenCalledTimes(10); // Updated: 10 Solana DEXes
  });

  it('should return the correct DEXes for Base network (8453)', () => {
    const baseDEXes = registry.getDEXesByNetwork('8453');
    expect(baseDEXes.length).toBe(16); // Updated: Base network has 16 DEXes

    const dexNames = baseDEXes.map((d) => d.name);
    expect(dexNames).toContain('Uniswap V3 on Base');
    expect(dexNames).toContain('Aerodrome on Base');
    expect(dexNames).toContain('BaseSwap');
    expect(dexNames).toContain('PancakeSwap V3 on Base');
    expect(dexNames).toContain('Velodrome on Base');
    expect(dexNames).toContain('SushiSwap V3 on Base');
    expect(dexNames).toContain('Curve on Base');
    expect(dexNames).toContain('KyberSwap on Base');
    expect(dexNames).toContain('1inch on Base');

    // Verify high-priority DEXes come first
    expect(baseDEXes[0].name).toBe('Uniswap V3 on Base');
    expect(baseDEXes[0].priority).toBe(1);
    expect(baseDEXes[1].name).toBe('Aerodrome on Base');
    expect(baseDEXes[1].priority).toBe(2);
    expect(baseDEXes[2].name).toBe('BaseSwap');
    expect(baseDEXes[2].priority).toBe(3);
  });

  it('should return the correct DEXes for Optimism network (10)', () => {
    const optimismDEXes = registry.getDEXesByNetwork('10');
    expect(optimismDEXes.length).toBe(10); // Top 10 Optimism DEXes

    const dexNames = optimismDEXes.map((d) => d.name);
    expect(dexNames).toContain('Velodrome V2 on Optimism');
    expect(dexNames).toContain('Uniswap V3 on Optimism');
    expect(dexNames).toContain('Synthetix on Optimism');
    expect(dexNames).toContain('Curve V2 on Optimism');
    expect(dexNames).toContain('Balancer V2 on Optimism');
    expect(dexNames).toContain('PancakeSwap V3 on Optimism');
    expect(dexNames).toContain('SushiSwap V3 on Optimism');
    expect(dexNames).toContain('1inch V5 on Optimism');
    expect(dexNames).toContain('KyberSwap V3 on Optimism');
    expect(dexNames).toContain('DODO V3 on Optimism');

    // Verify high-priority DEXes come first (by volume)
    expect(optimismDEXes[0].name).toBe('Velodrome V2 on Optimism');
    expect(optimismDEXes[0].priority).toBe(1);
    expect(optimismDEXes[1].name).toBe('Uniswap V3 on Optimism');
    expect(optimismDEXes[1].priority).toBe(2);
    expect(optimismDEXes[2].name).toBe('Synthetix on Optimism');
    expect(optimismDEXes[2].priority).toBe(3);
  });
});
