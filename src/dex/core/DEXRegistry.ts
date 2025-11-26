import { ethers, JsonRpcProvider, parseEther } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { DEXConfig, ChainType } from '../types';

// Liquidity threshold constants for Base L2 network
// V3 pools use concentrated liquidity (L = sqrt(x*y)), values are typically 10^15-10^24.
// The thresholds below are intentionally set much lower (10^12-10^11) to maximize pool discovery on Base L2, targeting relatively higher liquidity among small pools.
const V3_MIN_LIQUIDITY_THRESHOLD = BigInt(1000000000000);    // 10^12: relatively higher liquidity among small V3 pools on Base L2 (well below typical V3 pool values)
const V3_LOW_LIQUIDITY_THRESHOLD = BigInt(100000000000);     // 10^11: for even smaller V3 pools on Base L2
const V2_MIN_LIQUIDITY_THRESHOLD = BigInt(1000000000000000); // 10^15 = ~0.001 ETH for V2 pools

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
            gasEstimate: 150000
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
            gasEstimate: 180000
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
            gasEstimate: 130000
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
            gasEstimate: 200000
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
            gasEstimate: 160000
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
            gasEstimate: 170000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 130000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 200000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 130000
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
            gasEstimate: 130000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 180000
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
            gasEstimate: 150000
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
            gasEstimate: 160000
        });

        this.addDEX({
            name: 'Raydium',
            protocol: 'Raydium',
            chainType: 'Solana',
            network: 'mainnet-beta',
            router: 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',
            factory: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
            priority: 7,
            liquidityThreshold: BigInt(10000)
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
            gasEstimate: 150000
        });

        // ═══════════════════════════════════════════════════════════
        // ARBITRUM ONE - TOP 10 DEXES (November 2025)
        // ═══════════════════════════════════════════════════════════
        
        // #1 - Uniswap V3 on Arbitrum (~$380-450M daily volume, ~$1.25B TVL)
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
            gasEstimate: 150000
        });

        // #2 - Camelot V3 on Arbitrum (~$180-250M daily volume, ~$380M TVL)
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
            gasEstimate: 150000
        });

        // #3 - SushiSwap V3 on Arbitrum (~$90-130M daily volume, ~$220M TVL)
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
            gasEstimate: 150000
        });

        // #4 - PancakeSwap V3 on Arbitrum (~$70-110M daily volume, ~$180M TVL)
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
            gasEstimate: 150000
        });

        // #5 - Balancer V2 on Arbitrum (~$60-90M daily volume, ~$160M TVL)
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
            gasEstimate: 200000
        });

        // #6 - Curve on Arbitrum (~$50-80M daily volume, ~$280M TVL)
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
            gasEstimate: 180000
        });

        // #7 - ZyberSwap on Arbitrum (~$30-55M daily volume, ~$85M TVL)
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
            gasEstimate: 150000
        });

        // #8 - Trader Joe V3 on Arbitrum (~$25-45M daily volume, ~$110M TVL)
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
            gasEstimate: 150000
        });

        // #9 - DODO V3 on Arbitrum (~$20-40M daily volume, ~$65M TVL)
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
            gasEstimate: 150000
        });

        // #10 - Ramses Exchange on Arbitrum (~$15-30M daily volume, ~$50M TVL)
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
            gasEstimate: 150000
        });

        // Velodrome V2 on Optimism - The Aerodrome of OP, massive vote-locked liquidity
        this.addDEX({
            name: 'Velodrome V2 on Optimism',
            protocol: 'VelodromeV2',
            chainType: 'EVM',
            network: '10',
            router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
            factory: '0xF1046053aa67B7aB5D7c916F32d2c56705a4D7A1',
            initCodeHash: undefined, // Query factory.getPool() for pool addresses
            priority: 3,
            liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD,
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 130000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
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
            gasEstimate: 150000
        });
    }

    addDEX(dex: DEXConfig): void {
        this.dexes.set(dex.name, dex);
    }

    getDEX(name: string): DEXConfig | undefined {
        return this.dexes.get(name);
    }

    getAllDEXes(): DEXConfig[] {
        return Array.from(this.dexes.values())
            .sort((a, b) => a.priority - b.priority);
    }

    getTopDEXes(count: number = 5): DEXConfig[] {
        return this.getAllDEXes().slice(0, count);
    }

    getDEXesByNetwork(network: string): DEXConfig[] {
        return this.getAllDEXes().filter(dex => dex.network === network);
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