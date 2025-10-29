import { DEXRegistry } from '../core/DEXRegistry';
import { ethers } from 'ethers';
import chalk from 'chalk';

class CurveHealthCheck {
    private readonly timestamp: string;
    private readonly dexRegistry: DEXRegistry;

    constructor() {
        this.timestamp = new Date().toISOString();
        this.dexRegistry = new DEXRegistry();
    }

    async checkStatus(): Promise<void> {
        console.log(chalk.cyan(`\n=== Curve Health Check @ ${this.timestamp} ===\n`));

        const curve = this.dexRegistry.getDEX('Curve');
        
        if (!curve) {
            console.error('Curve configuration not found!');
            return;
        }

        // Check Core Components
        console.log(chalk.yellow('Curve Core Status:'));
        const coreStatus = await this.checkCoreComponents(curve);

        // Check Key Pools
        console.log(chalk.yellow('\nCurve Pool Status:'));
        const poolStatus = await this.checkKeyPools(curve);

        const isReady = coreStatus && poolStatus;
        console.log(chalk.cyan('\nOverall Curve Status:'));
        console.log(`├── System Ready: ${isReady ? '✅' : '❌'}`);
        console.log(`├── Core Active: ${coreStatus ? '✅' : '❌'}`);
        console.log(`└── Pools Active: ${poolStatus ? '✅' : '❌'}`);
    }

    private async checkCoreComponents(curve: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check registry contract
            const registry = new ethers.Contract(
                curve.factory,
                [
                    'function pool_count() external view returns (uint256)',
                    'function pool_list(uint256) external view returns (address)'
                ],
                provider
            );

            const poolCount = await registry.pool_count();
            console.log(`├── Registry Contract: ✅`);
            console.log(`├── Total Pools: ${poolCount.toString()}`);

            // Check key pools existence
            const keyPools = [
                {
                    name: '3pool',
                    address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'
                },
                {
                    name: 'stETH',
                    address: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022'
                }
            ];

            console.log('\n├── Key Pools:');
            for (const pool of keyPools) {
                const isActive = await this.checkPoolHealth(pool.address, provider);
                console.log(`│   ├── ${pool.name}: ${isActive ? '✅' : '❌'}`);
            }

            return true;
        } catch (error) {
            console.error('Error checking Curve core:', error);
            return false;
        }
    }

    private async checkKeyPools(curve: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check major stablecoin pools
            const criticalPools = [
                {
                    name: 'USDC/USDT/DAI',
                    address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
                    tokens: ['USDC', 'USDT', 'DAI']
                },
                {
                    name: 'ETH/stETH',
                    address: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
                    tokens: ['ETH', 'stETH']
                }
            ];

            for (const pool of criticalPools) {
                const poolContract = new ethers.Contract(
                    pool.address,
                    [
                        'function get_virtual_price() external view returns (uint256)',
                        'function balances(uint256) external view returns (uint256)'
                    ],
                    provider
                );

                const virtualPrice = await poolContract.get_virtual_price();
                console.log(`├── ${pool.name}:`);
                console.log(`│   ├── Virtual Price: ${ethers.utils.formatUnits(virtualPrice, 18)}`);
                
                // Check balances for each token
                for (let i = 0; i < pool.tokens.length; i++) {
                    const balance = await poolContract.balances(i);
                    console.log(`│   ├── ${pool.tokens[i]} Balance: ${ethers.utils.formatUnits(balance, 18)}`);
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking Curve pools:', error);
            return false;
        }
    }

    private async checkPoolHealth(
        poolAddress: string,
        provider: ethers.providers.Provider
    ): Promise<boolean> {
        try {
            const pool = new ethers.Contract(
                poolAddress,
                ['function get_virtual_price() external view returns (uint256)'],
                provider
            );

            const virtualPrice = await pool.get_virtual_price();
            return virtualPrice.gt(0);
        } catch {
            return false;
        }
    }
}

export default CurveHealthCheck;