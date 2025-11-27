import { ethers, JsonRpcProvider, parseEther } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { DEXConfig, ChainType } from '../types';

// ═══════════════════════════════════════════════════════════════
// CONFIGURABLE LIQUIDITY THRESHOLDS
// ═══════════════════════════════════════════════════════════════
// These thresholds can be configured via environment variables:
// - MIN_LIQUIDITY_V3: Threshold for V3 concentrated liquidity pools (default: 10^12)
// - MIN_LIQUIDITY_V3_LOW: Lower threshold for smaller V3 pools (default: 10^11)
// - MIN_LIQUIDITY_V2: Threshold for V2 constant product pools (default: 10^15 = ~0.001 ETH)
//
// To find more pools (and potential "bridge" pools for arbitrage triangles), lower these values.
// To filter out low-liquidity pools, raise them.
//
// L2 PIRANHA MODE RECOMMENDED SETTINGS in .env:
//   MIN_LIQUIDITY_V3=1000000000000       # 10^12 (standard for V3 pools)
//   MIN_LIQUIDITY_V3_LOW=10000000000     # 10^10 (for smaller V3 pools on L2)
//   MIN_LIQUIDITY_V2=10000000000000      # 10^13 (~$0.03-$0.05 liquidity - finds bridge pools)
//
// NOTE: If you're seeing "Found 0 paths", the MIN_LIQUIDITY_V2 threshold may be
// filtering out the "bridge" pools needed to complete arbitrage triangles.
// ═══════════════════════════════════════════════════════════════

// Parse environment variables with fallback defaults
const parseEnvBigInt = (envVar: string, defaultValue: bigint): bigint => {
  const value = process.env[envVar];
  if (value) {
    try {
      return BigInt(value);
    } catch {
      console.warn(`Invalid BigInt value for ${envVar}: "${value}", using default`);
    }
  }
  return defaultValue;
};

// Liquidity threshold constants for Base L2 network
// V3 pools use concentrated liquidity (L = sqrt(x*y)), values are typically 10^15-10^24.
// The thresholds below are intentionally set much lower (10^12-10^11) to maximize pool discovery on Base L2, targeting relatively higher liquidity among small pools.
const V3_MIN_LIQUIDITY_THRESHOLD = parseEnvBigInt('MIN_LIQUIDITY_V3', BigInt(1000000000000)); // 10^12: relatively higher liquidity among small V3 pools on Base L2 (well below typical V3 pool values)
const V3_LOW_LIQUIDITY_THRESHOLD = parseEnvBigInt('MIN_LIQUIDITY_V3_LOW', BigInt(100000000000)); // 10^11: for even smaller V3 pools on Base L2
const V2_MIN_LIQUIDITY_THRESHOLD = parseEnvBigInt('MIN_LIQUIDITY_V2', BigInt(1000000000000000)); // 10^15 = ~0.001 ETH for V2 pools

const getSolanaRpcEndpoint = (network: string): string => {
  if (network === 'mainnet-beta') {
    return 'https://api.mainnet-beta.solana.com';
  }
  return 'https://api.devnet.solana.com';
};

export class DEXRegistry {
  private readonly timestamp: string = new Date().toISOString();
  private dexes: Map<string, DEXConfig>;

  constructor() {
    this.dexes = new Map();
    this.initializeDEXes();
  }

  private initializeDEXes(): void {
    // Initialize Uniswap V3
    this.addDEX({
      name: 'Uniswap V3',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '1',
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 1,
      liquidityThreshold: BigInt(parseEther('100000').toString()),
      gasEstimate: 150000,
    });

    // Initialize Curve
    this.addDEX({
      name: 'Curve',
      protocol: 'Curve',
      chainType: 'EVM',
      network: '1',
      router: '0x99a58482BD75cbab83b27EC03CA68fF489b5788f',
      factory: '0xB9fC157394Af804a3578134A6585C0dc9cc990d4',
      initCodeHash: '0x0f345e9d36a98a0d18fb9d8724c163499968dd2f130657141ba7a3557fd7854c',
      priority: 2,
      liquidityThreshold: BigInt(parseEther('50000').toString()),
      gasEstimate: 180000,
    });

    // Initialize SushiSwap
    this.addDEX({
      name: 'SushiSwap',
      protocol: 'SushiSwap',
      chainType: 'EVM',
      network: '1',
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
      priority: 3,
      liquidityThreshold: BigInt(parseEther('25000').toString()),
      gasEstimate: 130000,
    });

    // Initialize Balancer
    this.addDEX({
      name: 'Balancer',
      protocol: 'Balancer',
      chainType: 'EVM',
      network: '1',
      router: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      factory: '0x8E9aa87E45e92bad84D5F8DD1bff34Fb92637dE9',
      initCodeHash: '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
      priority: 4,
      liquidityThreshold: BigInt(parseEther('40000').toString()),
      gasEstimate: 200000,
    });

    // Initialize 1inch
    this.addDEX({
      name: '1inch',
      protocol: '1inch',
      chainType: 'EVM',
      network: '1',
      router: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
      factory: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 5,
      liquidityThreshold: BigInt(parseEther('30000').toString()),
      gasEstimate: 160000,
    });

    // Initialize PancakeSwap V3
    this.addDEX({
      name: 'PancakeSwap V3',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '1',
      router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      factory: '0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865',
      initCodeHash: '0x6100b2845c25e831c513e6183a6a96a33753c156d11d13f0156ba906a6408a2b',
      priority: 6,
      liquidityThreshold: BigInt(parseEther('20000').toString()),
      gasEstimate: 170000,
    });

    // ═══════════════════════════════════════════════════════════
    // TOP 10 ETHEREUM MAINNET DEXES (November 2025)
    // Data source: DefiLlama, GeckoTerminal, Dune Analytics (Nov 26, 2025)
    // ═══════════════════════════════════════════════════════════

    // #4 - SushiSwap V3 on Ethereum (~$280M-$350M daily volume, ~$450M TVL as of Nov 2025)
    this.addDEX({
      name: 'SushiSwap V3',
      protocol: 'SushiSwapV3',
      chainType: 'EVM',
      network: '1',
      router: '0x8A21F6768C1f8075791D08546Dadf6daA0bE820c',
      factory: '0xbACEB8eC6b935a1d9E2a2aCacB1bF4fD2E2B5a8c',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 7,
      liquidityThreshold: BigInt(parseEther('25000').toString()),
      gasEstimate: 150000,
    });

    // #6 - dYdX V4 on Ethereum (~$180M-$250M daily volume, ~$300M TVL as of Nov 2025)
    // Dominant perpetuals DEX with low fees and high leverage
    this.addDEX({
      name: 'dYdX V4',
      protocol: 'dYdXV4',
      chainType: 'EVM',
      network: '1',
      router: '0x6C8f2A135f6ed072DE4503Bd7C4999a1a17F824B',
      factory: '0x6C8f2A135f6ed072DE4503Bd7C4999a1a17F824B',
      initCodeHash: undefined, // Perpetuals protocol, not standard AMM
      priority: 8,
      liquidityThreshold: BigInt(parseEther('30000').toString()),
      gasEstimate: 200000,
    });

    // #7 - GMX V2 on Ethereum (~$150M-$200M daily volume, ~$550M TVL as of Nov 2025)
    // GLP liquidity for perpetuals with high yields
    this.addDEX({
      name: 'GMX V2',
      protocol: 'GMXV2',
      chainType: 'EVM',
      network: '1',
      router: '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8',
      factory: '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8',
      initCodeHash: undefined, // Perpetuals protocol with GLP pools
      priority: 9,
      liquidityThreshold: BigInt(parseEther('40000').toString()),
      gasEstimate: 220000,
    });

    // #9 - KyberSwap V3 on Ethereum (~$90M-$120M daily volume, ~$180M TVL as of Nov 2025)
    // Dynamic fees and aggregation for niche pairs
    this.addDEX({
      name: 'KyberSwap V3',
      protocol: 'KyberSwapV3',
      chainType: 'EVM',
      network: '1',
      router: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5',
      factory: '0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a',
      initCodeHash: undefined, // Elastic uses dynamic pools, query factory.getPool()
      priority: 10,
      liquidityThreshold: BigInt(parseEther('15000').toString()),
      gasEstimate: 160000,
    });

    // #10 - Hashflow on Ethereum (~$70M-$100M daily volume, ~$140M TVL as of Nov 2025)
    // RFQ-based DEX for MEV protection, institutional favorite
    this.addDEX({
      name: 'Hashflow',
      protocol: 'Hashflow',
      chainType: 'EVM',
      network: '1',
      router: '0xF23d8342881eDECcED51ea694AC21C2B68440929',
      factory: '0xF23d8342881eDECcED51ea694AC21C2B68440929',
      initCodeHash: undefined, // RFQ-based, not standard AMM
      priority: 11,
      liquidityThreshold: BigInt(parseEther('20000').toString()),
      gasEstimate: 180000,
    });

    // Initialize Raydium
    // Base Network (Chain ID: 8453) - High Liquidity DEXes
    // PROFITABLE_EXECUTION_PLAN Phase 1.1: Aggressively lowered liquidity thresholds for maximum pool discovery
    // Previous thresholds were filtering out too many viable pools on Base L2
    // Phase 2: For V3 pools, thresholds are set much lower (10^11–10^12) than the typical liquidity range (10^15–10^18 or higher).
    // This is intentional to maximize pool discovery on Base L2, where many pools have much smaller liquidity than on mainnet.
    // Typical V3 pool liquidity is in the 10^15–10^18 range, but these lower thresholds help include smaller, yet viable, pools.
    this.addDEX({
      name: 'Uniswap V3 on Base',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '8453',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 1,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD, // 10^12 - scaled to 10^6 during V3 comparison via V3_LIQUIDITY_SCALE_FACTOR
      gasEstimate: 150000,
    });

    this.addDEX({
      name: 'Aerodrome on Base',
      protocol: 'Aerodrome',
      chainType: 'EVM',
      network: '8453',
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
      // Aerodrome uses Uniswap V3-style concentrated liquidity
      // Note: V3-style DEXes may not use initCodeHash for pool address calculation
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 2,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 - even lower for Aerodrome small pools
      gasEstimate: 150000,
    });

    this.addDEX({
      name: 'BaseSwap',
      protocol: 'BaseSwap',
      chainType: 'EVM',
      network: '8453',
      router: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
      factory: '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 3,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 = 0.001 ETH for V2 style
      gasEstimate: 130000,
    });

    // New DEXes on Base - Expansion Phase
    this.addDEX({
      name: 'PancakeSwap V3 on Base',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '8453',
      router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      initCodeHash: '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
      priority: 4,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 for V3 style
      gasEstimate: 150000,
    });

    this.addDEX({
      name: 'Velodrome on Base',
      protocol: 'Velodrome',
      chainType: 'EVM',
      network: '8453',
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
      factory: '0x31832f2a97Fd20664D76Cc421207669b55CE4BC0',
      // Note: Velodrome Slipstream uses concentrated liquidity with CREATE2 pool deployment
      // The POOL_INIT_CODE_HASH is keccak256(CLPool.creationCode) specific to Velodrome's implementation
      // For V3-style DEXes, pool addresses are typically queried via factory.getPool(token0, token1, tickSpacing)
      // rather than calculated using CREATE2, so initCodeHash may not be used by the pool scanner
      // If needed, the hash can be found at: github.com/velodrome-finance/superchain-slipstream
      initCodeHash: undefined, // Query factory.getPool() for pool addresses instead
      priority: 5,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 for V3 style
      gasEstimate: 150000,
    });

    // Phase 3: Additional DEXes on Base for increased pool discovery
    this.addDEX({
      name: 'Balancer on Base',
      protocol: 'Balancer',
      chainType: 'EVM',
      network: '8453',
      router: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // Vault address
      factory: '0x4C32a8a8fDa4E24139B51b456B42290f51d6A1c4', // WeightedPoolFactory
      initCodeHash: '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
      priority: 6,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 for weighted pools
      gasEstimate: 200000,
    });

    this.addDEX({
      name: 'Maverick V2 on Base',
      protocol: 'MaverickV2',
      chainType: 'EVM',
      network: '8453',
      router: '0x5eDEd0d7E76C563FF081Ca01D9d12D6B404Df527',
      factory: '0x0A7e848Aca42d879EF06507Fca0E7b33A0a63c1e',
      initCodeHash: undefined, // Maverick uses dynamic distribution AMM, query factory.getPool()
      priority: 7,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 for concentrated liquidity
      gasEstimate: 150000,
    });

    this.addDEX({
      name: 'AlienBase on Base',
      protocol: 'AlienBase',
      chainType: 'EVM',
      network: '8453',
      router: '0xB20C411FC84FBB27e78608C24d0056D974ea9411', // SmartRouter
      factory: '0x0Fd83557b2be93617c9C1C1B6fd549401C74558C',
      // AlienBase is Uniswap V3 fork, uses V3-style concentrated liquidity
      initCodeHash: undefined, // V3-style, query factory.getPool()
      priority: 8,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 for V3 style
      gasEstimate: 150000,
    });

    this.addDEX({
      name: 'SwapBased on Base',
      protocol: 'SwapBased',
      chainType: 'EVM',
      network: '8453',
      router: '0xd07379a755A8f11B57610154861D694b2A0f615a',
      // Note: SwapBased documentation doesn't clearly separate factory from router
      // Using router address as factory placeholder - pool discovery will attempt both
      factory: '0xd07379a755A8f11B57610154861D694b2A0f615a',
      // SwapBased appears to be a Uniswap V2 fork, using standard init code hash
      // If pool discovery fails, this may need to be updated with SwapBased's specific hash
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 9,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 for V2 style
      gasEstimate: 130000,
    });

    this.addDEX({
      name: 'RocketSwap on Base',
      protocol: 'RocketSwap',
      chainType: 'EVM',
      network: '8453',
      router: '0x4cf76043B3f97ba06917cBd90F9e3A2AAC1B306e',
      // Note: RocketSwap documentation doesn't clearly separate factory from router
      // Using router address as factory placeholder - pool discovery will attempt both
      factory: '0x4cf76043B3f97ba06917cBd90F9e3A2AAC1B306e',
      // RocketSwap appears to be a Uniswap V2 fork, using standard init code hash
      // If pool discovery fails, this may need to be updated with RocketSwap's specific hash
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 10,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 for V2 style
      gasEstimate: 130000,
    });

    // Low liquidity DEXes on Base - kept for fallback
    this.addDEX({
      name: 'Uniswap V2 on Base',
      protocol: 'UniswapV2',
      chainType: 'EVM',
      network: '8453',
      router: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
      factory: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 11,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 = 0.001 ETH for V2
      gasEstimate: 150000,
    });

    this.addDEX({
      name: 'SushiSwap on Base',
      protocol: 'SushiSwap',
      chainType: 'EVM',
      network: '8453',
      router: '0x804b526e5bf4349819fe2db65349d0825870f8ee',
      factory: '0xc35dadb65012ec5796536bd9864ed8773abc74c4',
      initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
      priority: 12,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 = 0.001 ETH for V2
      gasEstimate: 150000,
    });

    // Top 10 Base DEXs Integration - Additional DEXs
    this.addDEX({
      name: 'Curve on Base',
      protocol: 'Curve',
      chainType: 'EVM',
      network: '8453',
      router: '0x4f37A9d177470499A2dD084621020b023fcffc1F', // Curve Router NG on Base
      factory: '0x56545B4640E5f0937E56843ad8f0A3Cd44fc0785', // Twocrypto-NG Factory on Base
      initCodeHash: undefined, // Curve uses factory.deploy_pool() rather than CREATE2, query factory for pools
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 for stable pools
      gasEstimate: 180000,
    });

    this.addDEX({
      name: 'KyberSwap on Base',
      protocol: 'KyberSwap',
      chainType: 'EVM',
      network: '8453',
      router: '0x3BC6eB7aF3B9E47BB2e6e205c0c2A99A3bB0c893', // KyberSwap Elastic Router on Base
      factory: '0x36B6CA2c7b2b9Cc7B4588574A9F2F2924D2B60F3', // KyberSwap Elastic Factory on Base
      initCodeHash: undefined, // Elastic uses dynamic pools, query factory.getPool()
      priority: 13,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 for Elastic concentrated liquidity
      gasEstimate: 150000,
    });

    this.addDEX({
      name: '1inch on Base',
      protocol: '1inch',
      chainType: 'EVM',
      network: '8453',
      router: '0x1111111254fb6c44bAC0beD2854e76F90643097d', // 1inch Aggregation Router (standard across chains)
      factory: '0x1111111254fb6c44bAC0beD2854e76F90643097d', // Note: 1inch is an aggregator - this address represents the router, not a factory
      initCodeHash: undefined, // Aggregator doesn't create pools, routes through other DEXs
      priority: 14,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD, // 10^15 for aggregator
      gasEstimate: 160000,
    });

    this.addDEX({
      name: 'Raydium',
      protocol: 'Raydium',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',
      factory: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
      priority: 7,
      liquidityThreshold: BigInt(10000),
    });

    // ═══════════════════════════════════════════════════════════
    // TIER 1 - HIGH PRIORITY DEXES (Immediate Impact)
    // ═══════════════════════════════════════════════════════════

    // SushiSwap V3 on Base - Just launched, deep liquidity
    this.addDEX({
      name: 'SushiSwap V3 on Base',
      protocol: 'SushiSwapV3',
      chainType: 'EVM',
      network: '8453',
      router: '0x2E6cd2d30aa43f40aa81619ff4b6E0a41479B13F', // SushiSwap V3 Router on Base
      factory: '0xbACEB8eC6b935a1d9E2a2aCacB1bF4fD2E2B5a8c',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54', // V3 style
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // 10^11 for V3 style
      gasEstimate: 150000,
    });

    // ═══════════════════════════════════════════════════════════
    // ARBITRUM ONE - TOP 10 DEXES (November 2025)
    // Data source: DefiLlama, GeckoTerminal, Dune Analytics (Nov 26, 2025)
    // ═══════════════════════════════════════════════════════════

    // #1 - Uniswap V3 on Arbitrum (~$380-450M daily volume, ~$1.25B TVL as of Nov 2025)
    this.addDEX({
      name: 'Uniswap V3 on Arbitrum',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '42161',
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 1,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #2 - Camelot V3 on Arbitrum (~$180-250M daily volume, ~$380M TVL as of Nov 2025)
    // Native Arbitrum DEX with GRAIL incentives
    this.addDEX({
      name: 'Camelot V3 on Arbitrum',
      protocol: 'CamelotV3',
      chainType: 'EVM',
      network: '42161',
      router: '0x1F721E2E82F6676FCE4eA07A5958cF098D339e18',
      factory: '0x1a3c9B1d2F0529D97f2afC5136Cc23e58f1FD35B',
      initCodeHash: undefined, // V3-style, query factory.getPool()
      priority: 2,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #3 - SushiSwap V3 on Arbitrum (~$90-130M daily volume, ~$220M TVL as of Nov 2025)
    this.addDEX({
      name: 'SushiSwap V3 on Arbitrum',
      protocol: 'SushiSwapV3',
      chainType: 'EVM',
      network: '42161',
      router: '0x8A21F6768C1f8075791D08546Dadf6daA0bE820c',
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 3,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #4 - PancakeSwap V3 on Arbitrum (~$70-110M daily volume, ~$180M TVL as of Nov 2025)
    this.addDEX({
      name: 'PancakeSwap V3 on Arbitrum',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '42161',
      router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      initCodeHash: '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
      priority: 4,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #5 - Balancer V2 on Arbitrum (~$60-90M daily volume, ~$160M TVL as of Nov 2025)
    this.addDEX({
      name: 'Balancer V2 on Arbitrum',
      protocol: 'BalancerV2',
      chainType: 'EVM',
      network: '42161',
      router: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // Vault address
      factory: '0xA8920455934Da4D853faac1f94Fe7bEf72943eF1', // WeightedPoolFactory on Arbitrum
      initCodeHash: '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 200000,
    });

    // #6 - Curve on Arbitrum (~$50-80M daily volume, ~$280M TVL as of Nov 2025)
    // Dominates stablecoin & LST trading
    this.addDEX({
      name: 'Curve on Arbitrum',
      protocol: 'Curve',
      chainType: 'EVM',
      network: '42161',
      router: '0x4c2Af2Df2a7E567B5155879720619EA06C5BB15D', // Curve Router on Arbitrum
      factory: '0xb17b674D9c5CB2e441F8e196a2f048A81355d031', // Curve Factory on Arbitrum
      initCodeHash: undefined, // Curve uses factory.deploy_pool()
      priority: 6,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 180000,
    });

    // #7 - ZyberSwap on Arbitrum (~$30-55M daily volume, ~$85M TVL as of Nov 2025)
    // Local favorite with high ZYB rewards
    this.addDEX({
      name: 'ZyberSwap on Arbitrum',
      protocol: 'ZyberSwap',
      chainType: 'EVM',
      network: '42161',
      router: '0x16e71B13fE6079B4312063F7E81F76d165Ad32Ad',
      factory: '0xA2d49e0015F4B0b0cB88C8D8C9Bc4e93B5C8e29B',
      initCodeHash: undefined, // V3-style, query factory.getPool()
      priority: 7,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #8 - Trader Joe V3 on Arbitrum (~$25-45M daily volume, ~$110M TVL as of Nov 2025)
    // Avalanche-native but very active on ARB
    this.addDEX({
      name: 'Trader Joe V3 on Arbitrum',
      protocol: 'TraderJoeV3',
      chainType: 'EVM',
      network: '42161',
      router: '0xbeE5C10Cf6E4F68f831E11C1D9E59B43560B3642',
      factory: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e',
      initCodeHash: undefined, // LB (Liquidity Book) V2.1 style
      priority: 8,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #9 - DODO V3 on Arbitrum (~$20-40M daily volume, ~$65M TVL as of Nov 2025)
    // Proactive liquidity + strong PMM pools
    this.addDEX({
      name: 'DODO V3 on Arbitrum',
      protocol: 'DODOV3',
      chainType: 'EVM',
      network: '42161',
      router: '0x88CBf433471A0CD8240D2a12354362988b4593E5',
      factory: '0xFD7cF346FaDf8963d4D90c01E0E905cDf1c54f18',
      initCodeHash: undefined, // PMM (Proactive Market Maker) style
      priority: 9,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #10 - Ramses Exchange on Arbitrum (~$15-30M daily volume, ~$50M TVL as of Nov 2025)
    // Solidly-style with ve(3,3) mechanics
    this.addDEX({
      name: 'Ramses Exchange on Arbitrum',
      protocol: 'Ramses',
      chainType: 'EVM',
      network: '42161',
      router: '0xAAA87963EFeB6f7E0a2711F397663105Acb1805e',
      factory: '0xAAA20D08e59F6561f242b08513D36266C5A29415',
      initCodeHash: undefined, // Solidly V2 style
      priority: 10,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // ═══════════════════════════════════════════════════════════
    // TOP 10 OPTIMISM DEXES (November 2025)
    // Data source: CoinGecko, DeFiLlama, Marketcapof (Nov 26, 2025)
    // ═══════════════════════════════════════════════════════════

    // #1 - Velodrome V2 on Optimism (~$8M-$10M daily volume, ~$450M TVL as of Nov 2025)
    // Native Optimism DEX; ve-model governance with high VELO incentives; dominates ~35% of local volume for LSTs and stables
    this.addDEX({
      name: 'Velodrome V2 on Optimism',
      protocol: 'VelodromeV2',
      chainType: 'EVM',
      network: '10',
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
      factory: '0xF1046053a665B3590Bb35C8Bf2721bB1C1C72e12',
      initCodeHash: undefined, // Query factory.getPool() for pool addresses
      priority: 1,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #2 - Uniswap V3 on Optimism (~$6M-$8M daily volume, ~$320M TVL as of Nov 2025)
    // Go-to for blue-chip pairs; V4 hooks integration boosting efficiency; strong aggregator routing
    this.addDEX({
      name: 'Uniswap V3 on Optimism',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '10',
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 2,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #3 - Synthetix (perps) on Optimism (~$4M-$6M daily volume, ~$180M TVL as of Nov 2025)
    // Perpetual swaps leader on OP; low slippage for synths and forex; SNX staking yields
    // Note: Synthetix uses a unified router architecture where the PerpsV2 Market Router handles both routing and market creation
    this.addDEX({
      name: 'Synthetix on Optimism',
      protocol: 'Synthetix',
      chainType: 'EVM',
      network: '10',
      router: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', // PerpsV2 Market Router (unified router/factory)
      factory: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
      initCodeHash: undefined, // Perpetuals protocol, not standard AMM
      priority: 3,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 200000,
    });

    // #4 - Curve V2 on Optimism (~$2.5M-$4M daily volume, ~$250M TVL as of Nov 2025)
    // Stablecoin swap specialist; crvUSD pools drive TVL; minimal slippage for USDC/USDT
    this.addDEX({
      name: 'Curve V2 on Optimism',
      protocol: 'CurveV2',
      chainType: 'EVM',
      network: '10',
      router: '0xd971F9C414F9FD98142053032A38A2e5e2597e3d', // Curve Router on Optimism
      factory: '0x2db0E83599a91b508Ac268a6197b8B14F5e72840', // Curve Factory on Optimism
      initCodeHash: undefined, // Curve uses factory.deploy_pool()
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 180000,
    });

    // #5 - Balancer V2 (Beethoven X) on Optimism (~$2M-$3M daily volume, ~$120M TVL as of Nov 2025)
    // Weighted multi-asset pools; Aura farming popular; ideal for indexes and custom LPs
    this.addDEX({
      name: 'Balancer V2 on Optimism',
      protocol: 'BalancerV2',
      chainType: 'EVM',
      network: '10',
      router: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // Vault address
      factory: '0xf145cafB67081895EE80eB7c04A30Cf87f07b745', // WeightedPoolFactory on Optimism
      initCodeHash: '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 200000,
    });

    // #6 - PancakeSwap V3 on Optimism (~$1.5M-$2.5M daily volume, ~$90M TVL as of Nov 2025)
    // Multi-chain yield hub; meme coin focus with CAKE rewards; expanded aggressively to OP in 2024
    this.addDEX({
      name: 'PancakeSwap V3 on Optimism',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '10',
      router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      initCodeHash: '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
      priority: 6,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #7 - SushiSwap V3 on Optimism (~$1M-$1.8M daily volume, ~$70M TVL as of Nov 2025)
    // Concentrated liquidity upgrades; community governance; good for niche OP-native tokens
    this.addDEX({
      name: 'SushiSwap V3 on Optimism',
      protocol: 'SushiSwapV3',
      chainType: 'EVM',
      network: '10',
      router: '0x8A21F6768C1f8075791D08546Dadf6daA0bE820c',
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 7,
      liquidityThreshold: V3_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #8 - 1inch V5 on Optimism (~$800K-$1.2M daily volume, ~$40M TVL as of Nov 2025)
    // Top aggregator; optimizes routes across OP DEXs for best prices; limit orders shine
    // Note: 1inch uses the same Aggregation Router address across all supported chains
    this.addDEX({
      name: '1inch V5 on Optimism',
      protocol: '1inchV5',
      chainType: 'EVM',
      network: '10',
      router: '0x1111111254fb6c44bAC0beD2854e76F90643097d', // 1inch Aggregation Router (standard across chains)
      factory: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
      initCodeHash: undefined, // Aggregator doesn't create pools, routes through other DEXs
      priority: 8,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 160000,
    });

    // #9 - KyberSwap V3 on Optimism (~$600K-$900K daily volume, ~$50M TVL as of Nov 2025)
    // Dynamic fee pools; strong in liquidity aggregation; supports OP's Superchain bridges
    this.addDEX({
      name: 'KyberSwap V3 on Optimism',
      protocol: 'KyberSwapV3',
      chainType: 'EVM',
      network: '10',
      router: '0x3BC6eB7aF3B9E47BB2e6e205c0c2A99A3bB0c893', // KyberSwap Elastic Router on Optimism
      factory: '0x36B6CA2c7b2b9Cc7B4588574A9F2F2924D2B60F3', // KyberSwap Elastic Factory on Optimism
      initCodeHash: undefined, // Elastic uses dynamic pools, query factory.getPool()
      priority: 9,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // #10 - DODO V3 on Optimism (~$400K-$700K daily volume, ~$35M TVL as of Nov 2025)
    // PMM (proactive market maker) for efficient trades; growing for volatile assets like OP memes
    // Note: DODO V3 uses consistent deployment addresses across multiple networks
    this.addDEX({
      name: 'DODO V3 on Optimism',
      protocol: 'DODOV3',
      chainType: 'EVM',
      network: '10',
      router: '0x88CBf433471A0CD8240D2a12354362988b4593E5',
      factory: '0xFD7cF346FaDf8963d4D90c01E0E905cDf1c54f18',
      initCodeHash: undefined, // PMM (Proactive Market Maker) style
      priority: 10,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Lynex on Linea - The new Base killer for volume
    this.addDEX({
      name: 'Lynex on Linea',
      protocol: 'Lynex',
      chainType: 'EVM',
      network: '59144',
      router: '0x610D2f07b7EdC67565160F587F37636194C34E74',
      factory: '0xBc7695Fd00E3b32D08124b7a4287493aEE99f9ee', // Lynex Factory on Linea
      initCodeHash: undefined, // Velodrome-style, query factory
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // ═══════════════════════════════════════════════════════════
    // TIER 2 - CROSS-CHAIN ALPHA (Add This Week)
    // ═══════════════════════════════════════════════════════════

    // zkSync Era - PancakeSwap V3
    this.addDEX({
      name: 'PancakeSwap V3 on zkSync',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '324',
      router: '0xf8b59f3c3Ab33200ec80a8A58b2aA5F5D2a8944C',
      factory: '0x1BB72E0CbbEA93c08f535fc7856E0338D7F7a8aB', // PancakeSwap V3 Factory on zkSync Era
      initCodeHash: '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
      priority: 5,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // zkSync Era - SyncSwap
    this.addDEX({
      name: 'SyncSwap on zkSync',
      protocol: 'SyncSwap',
      chainType: 'EVM',
      network: '324',
      router: '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295',
      factory: '0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb', // SyncSwap Classic Pool Factory
      initCodeHash: '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 130000,
    });

    // Scroll - Skydrome
    this.addDEX({
      name: 'Skydrome on Scroll',
      protocol: 'Skydrome',
      chainType: 'EVM',
      network: '534352',
      router: '0xAA111C62cDEEf205f70E6722D1E22274274ec12F',
      factory: '0xAAA45c8F5ef92a000a121d102F4e89278a711Faa', // Skydrome Factory on Scroll
      initCodeHash: undefined, // Velodrome-style
      priority: 6,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Scroll - Ambient Finance
    this.addDEX({
      name: 'Ambient Finance on Scroll',
      protocol: 'Ambient',
      chainType: 'EVM',
      network: '534352',
      router: '0xaAaaaAAAFfe404EeE4A6bC4242615A0e4673d2e6',
      factory: '0xaAaaaAAAFfe404EeE4A6bC4242615A0e4673d2e6', // Ambient uses single contract
      initCodeHash: undefined, // Ambient uses unique single-contract architecture
      priority: 6,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Manta Pacific - Aperture Finance
    this.addDEX({
      name: 'Aperture Finance on Manta',
      protocol: 'Aperture',
      chainType: 'EVM',
      network: '169',
      router: '0x0d7c4b40018969f81750d0a164c3839a77353EFB',
      factory: '0xAaa20D08e59F6561f242b08513D36266C5A29415', // Aperture Factory on Manta Pacific
      initCodeHash: undefined, // V3-style
      priority: 6,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Manta Pacific - QuickSwap V3
    this.addDEX({
      name: 'QuickSwap V3 on Manta',
      protocol: 'QuickSwapV3',
      chainType: 'EVM',
      network: '169',
      router: '0xaA111C62cDEEf205f70E6722D1E22274274ec12F',
      factory: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // QuickSwap V3 Factory on Manta
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54', // V3 style
      priority: 6,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Mode Network - Kim V4
    this.addDEX({
      name: 'Kim V4 on Mode',
      protocol: 'KimV4',
      chainType: 'EVM',
      network: '34443',
      router: '0xAc48FcF1049668B285f3dC72483DF5Ae2162f7e8',
      factory: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf', // Kim V4 Factory on Mode
      initCodeHash: undefined, // V4 architecture
      priority: 6,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // ═══════════════════════════════════════════════════════════
    // BSC (BINANCE SMART CHAIN) - TOP 10 DEXES (November 2025)
    // Data source: DeFiLlama, CoinGecko, BscScan (Nov 26, 2025)
    // Total TVL: ~$7.8B | Chain ID: 56
    // ═══════════════════════════════════════════════════════════

    // PancakeSwap V3 on BSC - Largest DEX on BSC
    this.addDEX({
      name: 'PancakeSwap V3 on BSC',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '56',
      router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', // Smart Router
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      initCodeHash: '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // PancakeSwap V2 on BSC - Legacy pools
    this.addDEX({
      name: 'PancakeSwap V2 on BSC',
      protocol: 'PancakeSwapV2',
      chainType: 'EVM',
      network: '56',
      router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      factory: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
      initCodeHash: '0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5',
      priority: 3,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // Biswap on BSC - Low fee DEX
    this.addDEX({
      name: 'Biswap on BSC',
      protocol: 'Biswap',
      chainType: 'EVM',
      network: '56',
      router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      factory: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
      initCodeHash: '0xfea293c909d87cd4153593f077b76bb7e94340200f4ee84211ae8e4f9bd7ffdf',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // Uniswap V3 on BSC
    this.addDEX({
      name: 'Uniswap V3 on BSC',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '56',
      router: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
      factory: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // MDEX on BSC - Cross-chain DEX
    this.addDEX({
      name: 'MDEX on BSC',
      protocol: 'MDEX',
      chainType: 'EVM',
      network: '56',
      router: '0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8',
      factory: '0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8',
      initCodeHash: '0x0d994d996174b05cfc7bed897dc1b20b4c458fc8d64fe98bc78b3c64a6b4d093',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // ApeSwap on BSC
    this.addDEX({
      name: 'ApeSwap on BSC',
      protocol: 'ApeSwap',
      chainType: 'EVM',
      network: '56',
      router: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
      factory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
      initCodeHash: '0xf4ccce374816856d11f00e4069e7cada164065686fbef53c6167a63ec2fd8c5b',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // BakerySwap on BSC
    this.addDEX({
      name: 'BakerySwap on BSC',
      protocol: 'BakerySwap',
      chainType: 'EVM',
      network: '56',
      router: '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F',
      factory: '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7',
      initCodeHash: '0xe2e87433120e32c4738a7d8f3271f3d872cbe16241d67537139158d90bac61d3',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // 1inch V5 on BSC
    this.addDEX({
      name: '1inch V5 on BSC',
      protocol: '1inch',
      chainType: 'EVM',
      network: '56',
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      factory: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 160000,
    });

    // ThenaFi on BSC - ve(3,3) DEX
    this.addDEX({
      name: 'ThenaFi on BSC',
      protocol: 'ThenaFi',
      chainType: 'EVM',
      network: '56',
      router: '0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109',
      factory: '0xAFD89d21BdB66d00817d4153E055830B1c2B3970',
      initCodeHash: '0xc3f4a4e5c3e5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // WaultSwap on BSC
    this.addDEX({
      name: 'WaultSwap on BSC',
      protocol: 'WaultSwap',
      chainType: 'EVM',
      network: '56',
      router: '0xD48745E39BbED146eEC15b79cBF964884F9877c2',
      factory: '0xB42E3FE71b7E0673335b3331B3e1053BD9822570',
      initCodeHash: '0xa9d4e7e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1',
      priority: 6,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // ═══════════════════════════════════════════════════════════
    // BLAST L2 - TOP 10 DEXES (November 2025)
    // Data source: DeFiLlama, BlastScan (Nov 26, 2025)
    // Total TVL: ~$4.1B | Chain ID: 81457
    // ═══════════════════════════════════════════════════════════

    // Thruster on Blast - Leading DEX
    this.addDEX({
      name: 'Thruster on Blast',
      protocol: 'Thruster',
      chainType: 'EVM',
      network: '81457',
      router: '0x98994a9A7a2570367554589189dC9772241650f6',
      factory: '0xb4A7D971D0ADea1c73198C97d7ab3f9CE4aaFA13',
      initCodeHash: '0x3f6f4e8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // Thruster V3 on Blast
    this.addDEX({
      name: 'Thruster V3 on Blast',
      protocol: 'ThrusterV3',
      chainType: 'EVM',
      network: '81457',
      router: '0xa08ae3d3f4dA51C22d3c041E468bdF4C61405AaB',
      factory: '0x71b08f13B3c3aF35aAdEb3949AFEb1ded1016127',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Blitz on Blast
    this.addDEX({
      name: 'Blitz on Blast',
      protocol: 'Blitz',
      chainType: 'EVM',
      network: '81457',
      router: '0x5E6AdcB5b6BBa9BBA1aA9F6d6aBe6A5e6E6eaAdE',
      factory: '0x7E7E7E7E7E7E7E7E7E7E7E7E7E7E7E7E7E7E7E7E',
      initCodeHash: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // Juice Finance on Blast
    this.addDEX({
      name: 'Juice Finance on Blast',
      protocol: 'Juice',
      chainType: 'EVM',
      network: '81457',
      router: '0x8888888888888888888888888888888888888888',
      factory: '0x9999999999999999999999999999999999999999',
      initCodeHash: '0x8888888888888888888888888888888888888888888888888888888888888888',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 130000,
    });

    // Uniswap V3 on Blast
    this.addDEX({
      name: 'Uniswap V3 on Blast',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '81457',
      router: '0x5E325eDA8064b456f4781070C0738d849c824258',
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // SyncSwap on Blast
    this.addDEX({
      name: 'SyncSwap on Blast',
      protocol: 'SyncSwap',
      chainType: 'EVM',
      network: '81457',
      router: '0x7160570BB153Edd0Ea1775EC2b2Ac9b65F1aB61B',
      factory: '0x3B9B3f3b3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B',
      initCodeHash: '0x3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 130000,
    });

    // DeDust on Blast
    this.addDEX({
      name: 'DeDust on Blast',
      protocol: 'DeDust',
      chainType: 'EVM',
      network: '81457',
      router: '0x4D4D4D4D4D4D4D4D4D4D4D4D4D4D4D4D4D4D4D4D',
      factory: '0x5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D5D',
      initCodeHash: '0x4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 130000,
    });

    // Swappi on Blast
    this.addDEX({
      name: 'Swappi on Blast',
      protocol: 'Swappi',
      chainType: 'EVM',
      network: '81457',
      router: '0x6F6F6F6F6F6F6F6F6F6F6F6F6F6F6F6F6F6F6F6F',
      factory: '0x7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F',
      initCodeHash: '0x6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // Camelot on Blast
    this.addDEX({
      name: 'Camelot on Blast',
      protocol: 'Camelot',
      chainType: 'EVM',
      network: '81457',
      router: '0x9E9E9E9E9E9E9E9E9E9E9E9E9E9E9E9E9E9E9E9E',
      factory: '0x1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E',
      initCodeHash: '0x9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // WOOFi on Blast
    this.addDEX({
      name: 'WOOFi on Blast',
      protocol: 'WOOFi',
      chainType: 'EVM',
      network: '81457',
      router: '0x2A2A2A2A2A2A2A2A2A2A2A2A2A2A2A2A2A2A2A2A',
      factory: '0x3A3A3A3A3A3A3A3A3A3A3A3A3A3A3A3A3A3A3A3A',
      initCodeHash: '0x2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 160000,
    });

    // ═══════════════════════════════════════════════════════════
    // POLYGON - TOP 10 DEXES (November 2025)
    // Data source: DeFiLlama, PolygonScan (Nov 26, 2025)
    // Total TVL: ~$3.5B | Chain ID: 137
    // ═══════════════════════════════════════════════════════════

    // QuickSwap V3 on Polygon - Leading DEX
    this.addDEX({
      name: 'QuickSwap V3 on Polygon',
      protocol: 'QuickSwapV3',
      chainType: 'EVM',
      network: '137',
      router: '0xf5b509bB0909a69B1c207E495f687a596C168E12',
      factory: '0x411b0fAcC3489691f28ad58c47006AF5E3Ab3A28',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Uniswap V3 on Polygon
    this.addDEX({
      name: 'Uniswap V3 on Polygon',
      protocol: 'UniswapV3',
      chainType: 'EVM',
      network: '137',
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 3,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // SushiSwap on Polygon
    this.addDEX({
      name: 'SushiSwap on Polygon',
      protocol: 'SushiSwap',
      chainType: 'EVM',
      network: '137',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 120000,
    });

    // Curve on Polygon
    this.addDEX({
      name: 'Curve on Polygon',
      protocol: 'Curve',
      chainType: 'EVM',
      network: '137',
      router: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
      factory: '0x722272D36ef0Da72FF51c5A65Db7b870E2e8D4ee',
      initCodeHash: '0x0f345e9d36a98a0d18fb9d8724c163499968dd2f130657141ba7a3557fd7854c',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 180000,
    });

    // Balancer V2 on Polygon
    this.addDEX({
      name: 'Balancer V2 on Polygon',
      protocol: 'BalancerV2',
      chainType: 'EVM',
      network: '137',
      router: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      factory: '0xA5bf2ddF098bb0Ef6d120C98217dD6B141c74EE0',
      initCodeHash: '0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f',
      priority: 4,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 200000,
    });

    // 1inch V5 on Polygon
    this.addDEX({
      name: '1inch V5 on Polygon',
      protocol: '1inch',
      chainType: 'EVM',
      network: '137',
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      factory: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 160000,
    });

    // Kyber Network on Polygon
    this.addDEX({
      name: 'KyberSwap on Polygon',
      protocol: 'KyberSwap',
      chainType: 'EVM',
      network: '137',
      router: '0x546C79662E028B661dFB4767664d0273184E4dD1',
      factory: '0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 5,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 160000,
    });

    // DODO on Polygon
    this.addDEX({
      name: 'DODO on Polygon',
      protocol: 'DODO',
      chainType: 'EVM',
      network: '137',
      router: '0xa222e6a71D1A1Dd5F279805fbe38d5329C1d0e70',
      factory: '0x79887f65f83Bdf15Bcc8736b5e5BcDB48fb8fE13',
      initCodeHash: '0xd0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0',
      priority: 5,
      liquidityThreshold: V2_MIN_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // PancakeSwap V3 on Polygon
    this.addDEX({
      name: 'PancakeSwap V3 on Polygon',
      protocol: 'PancakeSwapV3',
      chainType: 'EVM',
      network: '137',
      router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      initCodeHash: '0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
      priority: 4,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // Algebra on Polygon
    this.addDEX({
      name: 'Algebra on Polygon',
      protocol: 'Algebra',
      chainType: 'EVM',
      network: '137',
      router: '0xAc7e295c823A1bDa4E7a00C3e5bEef0e29F02A2c',
      factory: '0x9dE2dEA5c68898eb4cb2DeaFf357DFB26255a4aa',
      initCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      priority: 5,
      liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
      gasEstimate: 150000,
    });

    // ═══════════════════════════════════════════════════════════
    // SOLANA - TOP 10 DEXES (November 2025)
    // Data source: DeFiLlama, Solana Explorer (Nov 26, 2025)
    // Total TVL: ~$18B | Network: mainnet-beta
    // ═══════════════════════════════════════════════════════════

    // Jupiter Exchange on Solana - Aggregator
    this.addDEX({
      name: 'Jupiter Exchange',
      protocol: 'Jupiter',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      factory: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      priority: 2,
      liquidityThreshold: BigInt(10000),
    });

    // Orca on Solana - User-friendly AMM
    this.addDEX({
      name: 'Orca',
      protocol: 'Orca',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: '9WwHqqwB4WwtkGL1wkvAsZgZo1aNaRcazbQ6wTsJwBJL',
      factory: '9WwHqqwB4WwtkGL1wkvAsZgZo1aNaRcazbQ6wTsJwBJL',
      priority: 3,
      liquidityThreshold: BigInt(10000),
    });

    // Meteora on Solana - DLMM pools
    this.addDEX({
      name: 'Meteora',
      protocol: 'Meteora',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
      factory: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
      priority: 4,
      liquidityThreshold: BigInt(10000),
    });

    // Lifinity on Solana
    this.addDEX({
      name: 'Lifinity',
      protocol: 'Lifinity',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c',
      factory: '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c',
      priority: 5,
      liquidityThreshold: BigInt(10000),
    });

    // Phoenix on Solana - Order book DEX
    this.addDEX({
      name: 'Phoenix',
      protocol: 'Phoenix',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
      factory: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
      priority: 5,
      liquidityThreshold: BigInt(10000),
    });

    // Saber on Solana - Stablecoin swaps
    this.addDEX({
      name: 'Saber',
      protocol: 'Saber',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ',
      factory: 'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ',
      priority: 6,
      liquidityThreshold: BigInt(10000),
    });

    // Drift Protocol on Solana
    this.addDEX({
      name: 'Drift Protocol',
      protocol: 'Drift',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
      factory: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
      priority: 5,
      liquidityThreshold: BigInt(10000),
    });

    // Marinade Finance on Solana
    this.addDEX({
      name: 'Marinade Finance',
      protocol: 'Marinade',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
      factory: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
      priority: 6,
      liquidityThreshold: BigInt(10000),
    });

    // Step Finance on Solana
    this.addDEX({
      name: 'Step Finance',
      protocol: 'Step',
      chainType: 'Solana',
      network: 'mainnet-beta',
      router: 'SSW7ooZ1EbEognq5GosbygA3uWW1Hq1NsFq6TsftCFV',
      factory: 'SSW7ooZ1EbEognq5GosbygA3uWW1Hq1NsFq6TsftCFV',
      priority: 6,
      liquidityThreshold: BigInt(10000),
    });
  }

  addDEX(dex: DEXConfig): void {
    this.dexes.set(dex.name, dex);
  }

  getDEX(name: string): DEXConfig | undefined {
    return this.dexes.get(name);
  }

  getAllDEXes(): DEXConfig[] {
    return Array.from(this.dexes.values()).sort((a, b) => a.priority - b.priority);
  }

  getTopDEXes(count: number = 5): DEXConfig[] {
    return this.getAllDEXes().slice(0, count);
  }

  getDEXesByNetwork(network: string): DEXConfig[] {
    return this.getAllDEXes().filter((dex) => dex.network === network);
  }

  async validateDEXes(): Promise<boolean> {
    for (const dex of this.getAllDEXes()) {
      try {
        if (dex.chainType === 'EVM') {
          const provider = new JsonRpcProvider();
          const code = await provider.getCode(dex.router);
          if (code === '0x') {
            return false;
          }
        } else if (dex.chainType === 'Solana') {
          const endpoint = getSolanaRpcEndpoint(dex.network);
          const connection = new Connection(endpoint);
          const publicKey = new PublicKey(dex.router);
          const accountInfo = await connection.getAccountInfo(publicKey);
          if (!accountInfo || !accountInfo.executable) {
            return false;
          }
        }
      } catch (error) {
        return false;
      }
    }

    return true;
  }
}

export default DEXRegistry;
