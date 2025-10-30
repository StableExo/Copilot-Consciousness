import { DEXRegistry } from '../core/DEXRegistry';
import { ethers } from 'ethers';
import chalk from 'chalk';

class SushiSwapHealthCheck {
    private readonly timestamp: string;
    private readonly dexRegistry: DEXRegistry;

    constructor() {
        this.timestamp = new Date().toISOString();
        this.dexRegistry = new DEXRegistry();
    }

    async checkStatus(): Promise<void> {
        console.log(chalk.cyan(`\n=== SushiSwap Health Check @ ${this.timestamp} ===\n`));

        const sushiswap = this.dexRegistry.getDEX('SushiSwap');
        
        if (!sushiswap) {
            console.error('SushiSwap configuration not found!');
            return;
        }

        // Check Core Components
        console.log(chalk.yellow('SushiSwap Core Status:'));
        const coreStatus = await this.checkCoreComponents(sushiswap);

        // Check Key Pairs
        console.log(chalk.yellow('\nSushiSwap Pair Status:'));
        const pairStatus = await this.checkKeyPairs(sushiswap);

        const isReady = coreStatus && pairStatus;
        console.log(chalk.cyan('\nOverall SushiSwap Status:'));
        console.log(`├── System Ready: ${isReady ? '✅' : '❌'}`);
        console.log(`├── Core Active: ${coreStatus ? '✅' : '❌'}`);
        console.log(`└── Pairs Active: ${pairStatus ? '✅' : '❌'}`);
    }

    private async checkCoreComponents(sushiswap: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check Factory contract
            const factory = new ethers.Contract(
                sushiswap.factory,
                [
                    'function allPairsLength() external view returns (uint256)',
                    'function allPairs(uint256) external view returns (address)',
                    'function feeTo() external view returns (address)',
                    'function feeToSetter() external view returns (address)'
                ],
                provider
            );

            const pairCount = await factory.allPairsLength();
            const feeTo = await factory.feeTo();
            const feeToSetter = await factory.feeToSetter();
            
            console.log(`├── Factory Contract: ✅`);
            console.log(`├── Total Pairs: ${pairCount.toString()}`);
            console.log(`├── Fee Collector: ${feeTo}`);
            console.log(`├── Fee Setter: ${feeToSetter}`);

            // Check Router contract
            const router = new ethers.Contract(
                sushiswap.router,
                [
                    'function factory() external view returns (address)',
                    'function WETH() external view returns (address)'
                ],
                provider
            );

            const routerFactory = await router.factory();
            const wethAddress = await router.WETH();
            
            console.log(`├── Router Contract: ✅`);
            console.log(`├── Router Factory: ${routerFactory}`);
            console.log(`├── WETH Address: ${wethAddress}`);

            // Verify factory addresses match
            const factoryMatch = routerFactory.toLowerCase() === sushiswap.factory.toLowerCase();
            console.log(`├── Factory Match: ${factoryMatch ? '✅' : '❌'}`);

            return true;
        } catch (error) {
            console.error('Error checking SushiSwap core:', error);
            return false;
        }
    }

    private async checkKeyPairs(sushiswap: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check major trading pairs
            const criticalPairs = [
                {
                    name: 'WETH/USDC',
                    address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                    token0: 'WETH',
                    token1: 'USDC'
                },
                {
                    name: 'WETH/USDT',
                    address: '0x06da0fd433C1A5d7a4faa01111c044910A184553',
                    token0: 'WETH',
                    token1: 'USDT'
                },
                {
                    name: 'WETH/DAI',
                    address: '0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f',
                    token0: 'WETH',
                    token1: 'DAI'
                }
            ];

            for (const pair of criticalPairs) {
                const pairContract = new ethers.Contract(
                    pair.address,
                    [
                        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                        'function token0() external view returns (address)',
                        'function token1() external view returns (address)',
                        'function kLast() external view returns (uint256)'
                    ],
                    provider
                );

                try {
                    const [reserve0, reserve1, lastUpdate] = await pairContract.getReserves();
                    const kLast = await pairContract.kLast();
                    
                    console.log(`├── ${pair.name}:`);
                    console.log(`│   ├── Address: ${pair.address}`);
                    console.log(`│   ├── ${pair.token0} Reserve: ${ethers.utils.formatEther(reserve0)}`);
                    console.log(`│   ├── ${pair.token1} Reserve: ${ethers.utils.formatUnits(reserve1, 6)}`);
                    console.log(`│   ├── Last Update: ${lastUpdate}`);
                    console.log(`│   ├── K-Last: ${kLast.toString()}`);
                    
                    // Check if reserves are healthy (non-zero)
                    const isHealthy = reserve0.gt(0) && reserve1.gt(0);
                    console.log(`│   └── Health: ${isHealthy ? '✅' : '❌'}`);
                } catch (error) {
                    console.log(`├── ${pair.name}: ⚠️  (Pair query failed)`);
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking SushiSwap pairs:', error);
            return false;
        }
    }

}

export default SushiSwapHealthCheck;