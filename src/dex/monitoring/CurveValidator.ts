import { BaseValidator } from './BaseValidator';
import { ValidatorStatus, ComponentStatus } from '../types';
import { ethers, Provider, formatUnits } from 'ethers';

/**
 * Curve DEX validator
 */
export class CurveValidator extends BaseValidator {
  constructor() {
    super('Curve');
  }

  async checkStatus(): Promise<ValidatorStatus> {
    const timestamp = Date.now();
    const components: ComponentStatus[] = [];
    const errors: string[] = [];

    const curve = this.getDEXConfig();

    if (!curve) {
      return {
        isHealthy: false,
        timestamp,
        dexName: this.dexName,
        components,
        errors: ['Curve configuration not found'],
      };
    }

    // Check Core Components
    const coreStatus = await this.checkCoreComponents(curve, components, errors);

    // Check Key Pools
    const poolStatus = await this.checkKeyPools(curve, components, errors);

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
    curve: { factory: string },
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check registry contract
      const registry = new ethers.Contract(
        curve.factory,
        [
          'function pool_count() external view returns (uint256)',
          'function pool_list(uint256) external view returns (address)',
        ],
        provider
      );

      const poolCount = await registry.pool_count();

      components.push({
        name: 'Registry Contract',
        status: 'active',
        details: { totalPools: poolCount.toString() },
      });

      // Check key pools existence
      const keyPools = [
        {
          name: '3pool',
          address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
        },
        {
          name: 'stETH',
          address: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
        },
      ];

      for (const pool of keyPools) {
        const isActive = await this.checkPoolHealth(pool.address, provider);

        components.push({
          name: `Key Pool: ${pool.name}`,
          status: isActive ? 'active' : 'inactive',
          details: { address: pool.address },
        });
      }

      return true;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking Curve core');
      errors.push(errorMsg);

      components.push({
        name: 'Core Components',
        status: 'error',
      });

      return false;
    }
  }

  private async checkKeyPools(
    curve: unknown,
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check major stablecoin pools
      const criticalPools = [
        {
          name: 'USDC/USDT/DAI',
          address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
        },
        {
          name: 'ETH/stETH',
          address: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
        },
      ];

      for (const pool of criticalPools) {
        const poolContract = new ethers.Contract(
          pool.address,
          [
            'function get_virtual_price() external view returns (uint256)',
            'function balances(uint256) external view returns (uint256)',
          ],
          provider
        );

        try {
          const virtualPrice = await poolContract.get_virtual_price();

          components.push({
            name: `Pool: ${pool.name}`,
            status: 'active',
            details: {
              address: pool.address,
              virtualPrice: formatUnits(virtualPrice, 18),
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
      const errorMsg = this.handleError(error, 'Error checking Curve pools');
      errors.push(errorMsg);
      return false;
    }
  }

  private async checkPoolHealth(poolAddress: string, provider: Provider): Promise<boolean> {
    try {
      const pool = new ethers.Contract(
        poolAddress,
        ['function get_virtual_price() external view returns (uint256)'],
        provider
      );

      const virtualPrice = await pool.get_virtual_price();
      return virtualPrice > 0n;
    } catch {
      return false;
    }
  }
}
