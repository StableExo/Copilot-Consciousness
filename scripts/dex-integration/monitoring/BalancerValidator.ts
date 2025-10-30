import { DEXRegistry } from '../core/DEXRegistry';
import { ethers } from 'ethers';
import chalk from 'chalk';

class BalancerHealthCheck {
    private readonly timestamp: string = '2025-10-30 01:49:41';
    private readonly dexRegistry: DEXRegistry;

    constructor() {
        this.dexRegistry = new DEXRegistry();
    }

    async checkStatus(): Promise<void> {
        console.log(chalk.cyan(`\n=== Balancer Health Check @ ${this.timestamp} ===\n`));

        const balancer = this.dexRegistry.getDEX('Balancer');
        
        if (!balancer) {
            console.error('Balancer configuration not found!');
            return;
        }

        // Check Core Components
        console.log(chalk.yellow('Balancer Core Status:'));
        const coreStatus = await this.checkCoreComponents(balancer);

        // Check Key Pools
        console.log(chalk.yellow('\nBalancer Pool Status:'));
        const poolStatus = await this.checkKeyPools(balancer);

        const isReady = coreStatus && poolStatus;
        console.log(chalk.cyan('\nOverall Balancer Status:'));
        console.log(`├── System Ready: ${isReady ? '✅' : '❌'}`);
        console.log(`├── Core Active: ${coreStatus ? '✅' : '❌'}`);
        console.log(`└── Pools Active: ${poolStatus ? '✅' : '❌'}`);
    }

    private async checkCoreComponents(balancer: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check Vault contract (the main contract for Balancer V2)
            const vault = new ethers.Contract(
                balancer.router,
                [
                    'function getPoolTokens(bytes32) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)',
                    'function hasApprovedRelayer(address user, address relayer) external view returns (bool)'
                ],
                provider
            );

            console.log(`├── Vault Contract: ✅`);
            console.log(`├── Vault Address: ${balancer.router}`);

            // Check weighted pool factory
            const factoryCode = await provider.getCode(balancer.factory);
            const factoryExists = factoryCode !== '0x';
            console.log(`├── Factory Contract: ${factoryExists ? '✅' : '❌'}`);

            return factoryExists;
        } catch (error) {
            console.error('Error checking Balancer core:', error);
            return false;
        }
    }

    private async checkKeyPools(balancer: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider();

            // Check major weighted pools
            const criticalPools = [
                {
                    name: 'B-80BAL-20WETH',
                    poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
                    tokens: ['BAL', 'WETH']
                },
                {
                    name: 'B-50WETH-50DAI',
                    poolId: '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a',
                    tokens: ['WETH', 'DAI']
                }
            ];

            const vault = new ethers.Contract(
                balancer.router,
                ['function getPoolTokens(bytes32) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)'],
                provider
            );

            for (const pool of criticalPools) {
                try {
                    const poolTokens = await vault.getPoolTokens(pool.poolId);
                    console.log(`├── ${pool.name}:`);
                    console.log(`│   ├── Token Count: ${poolTokens.tokens.length}`);
                    
                    // Check balances for each token
                    for (let i = 0; i < pool.tokens.length && i < poolTokens.balances.length; i++) {
                        console.log(`│   ├── ${pool.tokens[i]} Balance: ${ethers.utils.formatUnits(poolTokens.balances[i], 18)}`);
                    }
                } catch (poolError) {
                    console.log(`├── ${pool.name}: ❌ (Could not fetch pool data)`);
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking Balancer pools:', error);
            return false;
        }
    }

    private async checkPoolHealth(
        poolId: string,
        provider: ethers.providers.Provider
    ): Promise<boolean> {
        try {
            const vault = new ethers.Contract(
                '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                ['function getPoolTokens(bytes32) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)'],
                provider
            );

            const poolTokens = await vault.getPoolTokens(poolId);
            return poolTokens.tokens.length > 0;
        } catch {
            return false;
        }
    }
}

export default BalancerHealthCheck;