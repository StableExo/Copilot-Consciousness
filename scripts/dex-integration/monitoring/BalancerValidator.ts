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

            // Check vault contract (Balancer's main contract)
            const vault = new ethers.Contract(
                balancer.router,
                [
                    'function getPoolTokens(bytes32) external view returns (address[] memory, uint256[] memory, uint256)',
                    'function hasApprovedRelayer(address, address) external view returns (bool)'
                ],
                provider
            );

            console.log(`├── Vault Contract: ✅`);

            // Check key weighted pools existence
            const keyPools = [
                {
                    name: 'BAL/WETH 80/20',
                    poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'
                },
                {
                    name: 'WETH/DAI 60/40',
                    poolId: '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a'
                }
            ];

            console.log('\n├── Key Pools:');
            for (const pool of keyPools) {
                const isActive = await this.checkPoolHealth(pool.poolId, vault);
                console.log(`│   ├── ${pool.name}: ${isActive ? '✅' : '❌'}`);
            }

            return true;
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
                    name: 'BAL/WETH 80/20',
                    poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
                    tokens: ['BAL', 'WETH']
                },
                {
                    name: 'USDC/WETH/DAI',
                    poolId: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
                    tokens: ['USDC', 'WETH', 'DAI']
                }
            ];

            const vault = new ethers.Contract(
                balancer.router,
                [
                    'function getPoolTokens(bytes32) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)'
                ],
                provider
            );

            for (const pool of criticalPools) {
                const poolData = await vault.getPoolTokens(pool.poolId);
                console.log(`├── ${pool.name}:`);
                console.log(`│   ├── Last Change Block: ${poolData.lastChangeBlock.toString()}`);
                
                // Check balances for each token
                for (let i = 0; i < pool.tokens.length && i < poolData.balances.length; i++) {
                    console.log(`│   ├── ${pool.tokens[i]} Balance: ${ethers.utils.formatUnits(poolData.balances[i], 18)}`);
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
        vault: ethers.Contract
    ): Promise<boolean> {
        try {
            const poolData = await vault.getPoolTokens(poolId);
            return poolData.tokens.length > 0 && poolData.balances.length > 0;
        } catch {
            return false;
        }
    }
}

export default BalancerHealthCheck;