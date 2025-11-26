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
            factory: '0xd07379a755A8f11B57610154861D694b2A0f615a', // Using router as factory placeholder
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
            factory: '0x4cf76043B3f97ba06917cBd90F9e3A2AAC1B306e', // Using router as factory placeholder
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