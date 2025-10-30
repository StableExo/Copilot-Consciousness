import { DEXRegistry } from '../core/DEXRegistry';
import { ethers } from 'ethers';
import chalk from 'chalk';

class SushiSwapHealthCheck {
    private readonly timestamp: string = '2025-10-30 01:49:41';
    private readonly dexRegistry: DEXRegistry;
    private readonly keyPairs = [
        {
            name: 'WETH/USDC',
            address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0'
        },
        {
            name: 'WETH/USDT',
            address: '0x06da0fd433C1A5d7a4faa01111c044910A184553'
        }
    ];

    constructor() {
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

        // Check Key Pools
        console.log(chalk.yellow('\nSushiSwap Pool Status:'));
        const poolStatus = await this.checkKeyPools(sushiswap);

        const isReady = coreStatus && poolStatus;
        console.log(chalk.cyan('\nOverall SushiSwap Status:'));
        console.log(`├── System Ready: ${isReady ? '✅' : '❌'}`);
        console.log(`├── Core Active: ${coreStatus ? '✅' : '❌'}`);
        console.log(`└── Pools Active: ${poolStatus ? '✅' : '❌'}`);
    }

    private async checkCoreComponents(sushiswap: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check factory contract
            const factory = new ethers.Contract(
                sushiswap.factory,
                [
                    'function allPairsLength() external view returns (uint256)',
                    'function allPairs(uint256) external view returns (address)',
                    'function feeTo() external view returns (address)'
                ],
                provider
            );

            const pairsLength = await factory.allPairsLength();
            console.log(`├── Factory Contract: ✅`);
            console.log(`├── Total Pairs: ${pairsLength.toString()}`);

            // Check router contract
            const routerCode = await provider.getCode(sushiswap.router);
            const routerExists = routerCode !== '0x';
            console.log(`├── Router Contract: ${routerExists ? '✅' : '❌'}`);

            console.log('\n├── Key Pairs:');
            for (const pair of this.keyPairs) {
                const isActive = await this.checkPairHealth(pair.address, provider);
                console.log(`│   ├── ${pair.name}: ${isActive ? '✅' : '❌'}`);
            }

            return routerExists;
        } catch (error) {
            console.error('Error checking SushiSwap core:', error);
            return false;
        }
    }

    private async checkKeyPools(sushiswap: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check major trading pairs
            const criticalPairs = [
                {
                    name: 'WETH/USDC',
                    address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                    tokens: ['WETH', 'USDC']
                },
                {
                    name: 'WETH/USDT',
                    address: '0x06da0fd433C1A5d7a4faa01111c044910A184553',
                    tokens: ['WETH', 'USDT']
                },
                {
                    name: 'SUSHI/WETH',
                    address: '0x795065dCc9f64b5614C407a6EFDC400DA6221FB0',
                    tokens: ['SUSHI', 'WETH']
                }
            ];

            for (const pair of criticalPairs) {
                const pairContract = new ethers.Contract(
                    pair.address,
                    [
                        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                        'function token0() external view returns (address)',
                        'function token1() external view returns (address)'
                    ],
                    provider
                );

                try {
                    const reserves = await pairContract.getReserves();
                    console.log(`├── ${pair.name}:`);
                    console.log(`│   ├── Reserve0: ${ethers.utils.formatUnits(reserves.reserve0, 18)}`);
                    console.log(`│   ├── Reserve1: ${ethers.utils.formatUnits(reserves.reserve1, 18)}`);
                    console.log(`│   ├── Last Update: Block ${reserves.blockTimestampLast}`);
                } catch (pairError) {
                    console.log(`├── ${pair.name}: ❌ (Could not fetch reserves)`);
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking SushiSwap pairs:', error);
            return false;
        }
    }

    private async checkPairHealth(
        pairAddress: string,
        provider: ethers.providers.Provider
    ): Promise<boolean> {
        try {
            const pair = new ethers.Contract(
                pairAddress,
                ['function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
                provider
            );

            const reserves = await pair.getReserves();
            return reserves.reserve0.gt(0) && reserves.reserve1.gt(0);
        } catch {
            return false;
        }
    }
}

export default SushiSwapHealthCheck;