import { BaseValidator } from './BaseValidator';
import { ValidatorStatus, ComponentStatus } from '../types';
import { ethers } from 'ethers';

/**
 * Balancer DEX validator
 */
export class BalancerValidator extends BaseValidator {
  constructor() {
    super('Balancer');
  }

  async checkStatus(): Promise<ValidatorStatus> {
    const timestamp = Date.now();
    const components: ComponentStatus[] = [];
    const errors: string[] = [];

    const balancer = this.getDEXConfig();

    if (!balancer) {
      return {
        isHealthy: false,
        timestamp,
        dexName: this.dexName,
        components,
        errors: ['Balancer configuration not found'],
      };
    }

    // Check Core Components
    const coreStatus = await this.checkCoreComponents(balancer, components, errors);

    // Check Weighted Pools
    const poolStatus = await this.checkWeightedPools(balancer, components, errors);

    const isHealthy = coreStatus && poolStatus;

    return {
      isHealthy,
      timestamp,
      dexName: this.dexName,
      components,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async checkCoreComponents(
    balancer: { router: string; factory: string },
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check Vault contract
      const vault = new ethers.Contract(
        balancer.router,
        [
          'function getProtocolFeesCollector() external view returns (address)',
          'function hasApprovedRelayer(address, address) external view returns (bool)',
        ],
        provider
      );

      const feesCollector = await vault.getProtocolFeesCollector();

      components.push({
        name: 'Vault Contract',
        status: 'active',
        details: { feesCollector },
      });

      // Check WETH integration
      try {
        const wethMethod = new ethers.Contract(
          balancer.router,
          ['function WETH() external view returns (address)'],
          provider
        );
        const wethAddress = await wethMethod.WETH();

        components.push({
          name: 'WETH Integration',
          status: 'active',
          details: { wethAddress },
        });
      } catch {
        components.push({
          name: 'WETH Integration',
          status: 'inactive',
        });
      }

      // Check weighted pool factory
      const factoryCode = await provider.getCode(balancer.factory);
      const isFactoryActive = factoryCode !== '0x';

      components.push({
        name: 'Weighted Pool Factory',
        status: isFactoryActive ? 'active' : 'inactive',
      });

      return true;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking Balancer core');
      errors.push(errorMsg);

      components.push({
        name: 'Core Components',
        status: 'error',
      });

      return false;
    }
  }

  private async checkWeightedPools(
    balancer: { router: string },
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check major weighted pools
      const criticalPools = [
        {
          name: '80BAL-20WETH',
          poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        },
        {
          name: 'B-stETH-STABLE',
          poolId: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
        },
      ];

      for (const pool of criticalPools) {
        const vault = new ethers.Contract(
          balancer.router,
          [
            'function getPool(bytes32) external view returns (address, uint8)',
            'function getPoolTokens(bytes32) external view returns (address[] memory, uint256[] memory, uint256)',
          ],
          provider
        );

        try {
          const [poolAddress] = await vault.getPool(pool.poolId);
          const [tokens] = await vault.getPoolTokens(pool.poolId);

          components.push({
            name: `Pool: ${pool.name}`,
            status: 'active',
            details: {
              address: poolAddress,
              tokenCount: tokens.length,
            },
          });
        } catch {
          components.push({
            name: `Pool: ${pool.name}`,
            status: 'inactive',
          });
        }
      }

      return true;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking Balancer pools');
      errors.push(errorMsg);
      return false;
    }
  }
}
