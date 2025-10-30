import { ethers } from 'ethers';
import { DEXConfig } from '../types';

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
            chainId: 1,
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
            chainId: 1,
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
            chainId: 1,
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
            chainId: 1,
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
            chainId: 1,
            router: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
            factory: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
            initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
            priority: 5,
            liquidityThreshold: BigInt(ethers.utils.parseEther('30000').toString()),
            gasEstimate: 160000
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

    getDEXesByChain(chainId: number): DEXConfig[] {
        return this.getAllDEXes().filter(dex => dex.chainId === chainId);
    }

    async validateDEXes(): Promise<boolean> {
        for (const dex of this.getAllDEXes()) {
            try {
                const provider = new ethers.providers.JsonRpcProvider();
                
                // Check if contracts exist
                const code = await provider.getCode(dex.router);
                const isValid = code !== '0x';
                
                if (!isValid) {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }
        
        return true;
    }
}

export default DEXRegistry;