import { DEXRegistry } from '../core/DEXRegistry';
import { ethers, JsonRpcProvider, formatEther } from 'ethers';
import chalk from 'chalk';

class BalancerHealthCheck {
    private readonly timestamp: string;
    private readonly dexRegistry: DEXRegistry;

    constructor() {
        this.timestamp = new Date().toISOString();
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

        // Check Weighted Pools
        console.log(chalk.yellow('\nBalancer Pool Status:'));
        const poolStatus = await this.checkWeightedPools(balancer);

        const isReady = coreStatus && poolStatus;
        console.log(chalk.cyan('\nOverall Balancer Status:'));
        console.log(`├── System Ready: ${isReady ? '✅' : '❌'}`);
        console.log(`├── Core Active: ${coreStatus ? '✅' : '❌'}`);
        console.log(`└── Pools Active: ${poolStatus ? '✅' : '❌'}`);
    }

    private async checkCoreComponents(balancer: any): Promise<boolean> {
        try {
            const provider = new JsonRpcProvider();

            // Check Vault contract (main contract for Balancer V2)
            const vault = new ethers.Contract(
                balancer.router, // Vault address is used as router in registry
                [
                    'function getProtocolFeesCollector() external view returns (address)',
                    'function WETH() external view returns (address)',
                    'function hasApprovedRelayer(address, address) external view returns (bool)'
                ],
                provider
            );

            const feesCollector = await vault.getProtocolFeesCollector();
            console.log(`├── Vault Contract: ✅`);
            console.log(`├── Protocol Fees Collector: ${feesCollector}`);

            // Check WETH integration
            try {
                const wethAddress = await vault.WETH();
                console.log(`├── WETH Integration: ✅`);
                console.log(`├── WETH Address: ${wethAddress}`);
            } catch {
                console.log(`├── WETH Integration: ⚠️  (Not directly exposed)`);
            }

            // Check weighted pool factory
            const poolFactory = new ethers.Contract(
                balancer.factory,
                [
                    'function isPoolFromFactory(address) external view returns (bool)',
                    'function getCreationCode() external view returns (bytes memory)'
                ],
                provider
            );

            const factoryCode = await provider.getCode(balancer.factory);
            const isFactoryActive = factoryCode !== '0x';
            console.log(`├── Weighted Pool Factory: ${isFactoryActive ? '✅' : '❌'}`);

            return true;
        } catch (error) {
            console.error('Error checking Balancer core:', error);
            return false;
        }
    }

    private async checkWeightedPools(balancer: any): Promise<boolean> {
        try {
            const provider = new JsonRpcProvider();

            // Check major weighted pools
            const criticalPools = [
                {
                    name: '80BAL-20WETH',
                    poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
                    tokens: ['BAL', 'WETH']
                },
                {
                    name: 'B-stETH-STABLE',
                    poolId: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
                    tokens: ['wstETH', 'WETH']
                }
            ];

            for (const pool of criticalPools) {
                const vault = new ethers.Contract(
                    balancer.router,
                    [
                        'function getPool(bytes32) external view returns (address, uint8)',
                        'function getPoolTokens(bytes32) external view returns (address[] memory, uint256[] memory, uint256)'
                    ],
                    provider
                );

                try {
                    const [poolAddress, ] = await vault.getPool(pool.poolId);
                    console.log(`├── ${pool.name}:`);
                    console.log(`│   ├── Address: ${poolAddress}`);
                    
                    // Get pool tokens and balances
                    const [tokens, balances, ] = await vault.getPoolTokens(pool.poolId);
                    console.log(`│   ├── Token Count: ${tokens.length}`);
                    
                    for (let i = 0; i < Math.min(tokens.length, pool.tokens.length); i++) {
                        console.log(`│   ├── ${pool.tokens[i]} Balance: ${formatEther(balances[i])}`);
                    }
                } catch (error) {
                    console.log(`├── ${pool.name}: ⚠️  (Pool query failed)`);
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking Balancer pools:', error);
            return false;
        }
    }

}

export default BalancerHealthCheck;