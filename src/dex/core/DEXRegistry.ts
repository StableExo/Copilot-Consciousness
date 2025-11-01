import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { DEXConfig, ChainType } from '../types';

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
            liquidityThreshold: BigInt(ethers.utils.parseEther('100000').toString()),
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
            liquidityThreshold: BigInt(ethers.utils.parseEther('50000').toString()),
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
            liquidityThreshold: BigInt(ethers.utils.parseEther('25000').toString()),
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
            liquidityThreshold: BigInt(ethers.utils.parseEther('40000').toString()),
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
            liquidityThreshold: BigInt(ethers.utils.parseEther('30000').toString()),
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
            liquidityThreshold: BigInt(ethers.utils.parseEther('20000').toString()),
            gasEstimate: 170000
        });

        // Initialize Raydium
        this.addDEX({
            name: 'Uniswap V2 on Base',
            protocol: 'UniswapV2',
            chainType: 'EVM',
            network: '8453',
            router: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
            factory: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
            initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f', // This is the generic Uniswap V2 init code hash, may need to be updated for Base
            priority: 8,
            liquidityThreshold: BigInt(ethers.utils.parseEther('10000').toString()),
            gasEstimate: 150000
        });

        this.addDEX({
            name: 'SushiSwap on Base',
            protocol: 'SushiSwap',
            chainType: 'EVM',
            network: '8453',
            router: '0x804b526e5bf4349819fe2db65349d0825870f8ee',
            factory: '0xc35dadb65012ec5796536bd9864ed8773abc74c4',
            initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303', // This is the generic SushiSwap init code hash, may need to be updated for Base
            priority: 9,
            liquidityThreshold: BigInt(ethers.utils.parseEther('10000').toString()),
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
                    const provider = new ethers.providers.JsonRpcProvider();
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