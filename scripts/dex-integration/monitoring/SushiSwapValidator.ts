import { DEXRegistry } from '../core/DEXRegistry';
import { ethers } from 'ethers';
import chalk from 'chalk';

class SushiSwapHealthCheck {
    private readonly timestamp: string = '2025-10-30 01:49:41';
    private readonly dexRegistry: DEXRegistry;

    constructor() {
        this.dexRegistry = new DEXRegistry();
    }

    async checkStatus(): Promise<void> {
        console.log(chalk.cyan(`\n=== SushiSwap Health Check @ ${this.timestamp} ===\n`));

        const sushiSwap = this.dexRegistry.getDEX('SushiSwap');
        
        if (!sushiSwap) {
            console.error('SushiSwap configuration not found!');
            return;
        }

        // Check Core Components
        console.log(chalk.yellow('SushiSwap Core Status:'));
        const coreStatus = await this.checkCoreComponents(sushiSwap);

        // Check Key Pools
        console.log(chalk.yellow('\nSushiSwap Pool Status:'));
        const poolStatus = await this.checkKeyPools(sushiSwap);

        const isReady = coreStatus && poolStatus;
        console.log(chalk.cyan('\nOverall SushiSwap Status:'));
        console.log(`├── System Ready: ${isReady ? '✅' : '❌'}`);
        console.log(`├── Core Active: ${coreStatus ? '✅' : '❌'}`);
        console.log(`└── Pools Active: ${poolStatus ? '✅' : '❌'}`);
    }

    private async checkCoreComponents(sushiSwap: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check factory contract
            const factory = new ethers.Contract(
                sushiSwap.factory,
                [
                    'function allPairsLength() external view returns (uint256)',
                    'function getPair(address, address) external view returns (address)',
                    'function feeTo() external view returns (address)'
                ],
                provider
            );

            const pairsLength = await factory.allPairsLength();
            console.log(`├── Factory Contract: ✅`);
            console.log(`├── Total Pairs: ${pairsLength.toString()}`);

            // Check router contract
            const router = new ethers.Contract(
                sushiSwap.router,
                [
                    'function factory() external view returns (address)',
                    'function WETH() external view returns (address)'
                ],
                provider
            );

            const factoryAddress = await router.factory();
            const wethAddress = await router.WETH();
            console.log(`├── Router Contract: ✅`);
            console.log(`├── WETH Address: ${wethAddress}`);

            // Check key pairs existence
            const keyPairs = [
                {
                    name: 'SUSHI/WETH',
                    token0: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
                    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
                },
                {
                    name: 'USDC/WETH',
                    token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                    token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
                }
            ];

            console.log('\n├── Key Pairs:');
            for (const pair of keyPairs) {
                const pairAddress = await factory.getPair(pair.token0, pair.token1);
                const isActive = pairAddress !== ethers.constants.AddressZero;
                console.log(`│   ├── ${pair.name}: ${isActive ? '✅' : '❌'}`);
            }

            return true;
        } catch (error) {
            console.error('Error checking SushiSwap core:', error);
            return false;
        }
    }

    private async checkKeyPools(sushiSwap: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check major trading pairs
            const criticalPairs = [
                {
                    name: 'SUSHI/WETH',
                    address: '0x795065dCc9f64b5614C407a6EFDC400DA6221FB0',
                    tokens: ['SUSHI', 'WETH']
                },
                {
                    name: 'USDC/WETH',
                    address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
                    tokens: ['USDC', 'WETH']
                },
                {
                    name: 'DAI/WETH',
                    address: '0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f',
                    tokens: ['DAI', 'WETH']
                }
            ];

            for (const pair of criticalPairs) {
                const pairContract = new ethers.Contract(
                    pair.address,
                    [
                        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                        'function token0() external view returns (address)',
                        'function token1() external view returns (address)',
                        'function totalSupply() external view returns (uint256)'
                    ],
                    provider
                );

                const reserves = await pairContract.getReserves();
                const totalSupply = await pairContract.totalSupply();
                
                console.log(`├── ${pair.name}:`);
                console.log(`│   ├── Reserve0: ${ethers.utils.formatUnits(reserves.reserve0, 18)}`);
                console.log(`│   ├── Reserve1: ${ethers.utils.formatUnits(reserves.reserve1, 18)}`);
                console.log(`│   ├── Total LP Supply: ${ethers.utils.formatUnits(totalSupply, 18)}`);
                console.log(`│   └── Last Update Block: ${reserves.blockTimestampLast}`);
            }

            return true;
        } catch (error) {
            console.error('Error checking SushiSwap pools:', error);
            return false;
        }
    }
}

export default SushiSwapHealthCheck;