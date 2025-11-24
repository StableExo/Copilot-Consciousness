import { BaseValidator } from './BaseValidator';
import { ValidatorStatus, ComponentStatus } from '../types';
import { ethers } from 'ethers';

/**
 * SushiSwap DEX validator
 */
export class SushiSwapValidator extends BaseValidator {
  constructor() {
    super('SushiSwap');
  }

  async checkStatus(): Promise<ValidatorStatus> {
    const timestamp = Date.now();
    const components: ComponentStatus[] = [];
    const errors: string[] = [];

    const sushiswap = this.getDEXConfig();
    
    if (!sushiswap) {
      return {
        isHealthy: false,
        timestamp,
        dexName: this.dexName,
        components,
        errors: ['SushiSwap configuration not found'],
      };
    }

    // Check Core Components
    const coreStatus = await this.checkCoreComponents(sushiswap, components, errors);
    
    // Check Key Pairs
    const pairStatus = await this.checkKeyPairs(sushiswap, components, errors);

    const isHealthy = coreStatus && pairStatus;
    
    return {
      isHealthy,
      timestamp,
      dexName: this.dexName,
      components,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async checkCoreComponents(
    sushiswap: { factory: string; router: string },
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check Factory contract
      const factory = new ethers.Contract(
        sushiswap.factory,
        [
          'function allPairsLength() external view returns (uint256)',
          'function feeTo() external view returns (address)',
          'function feeToSetter() external view returns (address)',
        ],
        provider
      );

      const pairCount = await factory.allPairsLength();
      const feeTo = await factory.feeTo();
      const feeToSetter = await factory.feeToSetter();
      
      components.push({
        name: 'Factory Contract',
        status: 'active',
        details: {
          totalPairs: pairCount.toString(),
          feeTo,
          feeToSetter,
        },
      });

      // Check Router contract
      const router = new ethers.Contract(
        sushiswap.router,
        [
          'function factory() external view returns (address)',
          'function WETH() external view returns (address)',
        ],
        provider
      );

      const routerFactory = await router.factory();
      const wethAddress = await router.WETH();
      
      components.push({
        name: 'Router Contract',
        status: 'active',
        details: {
          factory: routerFactory,
          weth: wethAddress,
        },
      });

      // Verify factory addresses match
      const factoryMatch = routerFactory.toLowerCase() === sushiswap.factory.toLowerCase();
      
      components.push({
        name: 'Factory Verification',
        status: factoryMatch ? 'active' : 'error',
      });

      return factoryMatch;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking SushiSwap core');
      errors.push(errorMsg);
      
      components.push({
        name: 'Core Components',
        status: 'error',
      });
      
      return false;
    }
  }

  private async checkKeyPairs(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sushiswap: unknown,
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check major trading pairs
      const criticalPairs = [
        {
          name: 'WETH/USDC',
          address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
        },
        {
          name: 'WETH/USDT',
          address: '0x06da0fd433C1A5d7a4faa01111c044910A184553',
        },
        {
          name: 'WETH/DAI',
          address: '0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f',
        },
      ];

      for (const pair of criticalPairs) {
        const pairContract = new ethers.Contract(
          pair.address,
          [
            'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
            'function kLast() external view returns (uint256)',
          ],
          provider
        );

        try {
          const [reserve0, reserve1, lastUpdate] = await pairContract.getReserves();
          
          const isHealthy = reserve0 > 0n && reserve1 > 0n;
          
          components.push({
            name: `Pair: ${pair.name}`,
            status: isHealthy ? 'active' : 'inactive',
            details: {
              address: pair.address,
              reserve0: formatEther(reserve0),
              lastUpdate: lastUpdate.toString(),
            },
          });
        } catch {
          components.push({
            name: `Pair: ${pair.name}`,
            status: 'error',
          });
        }
      }

      return true;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking SushiSwap pairs');
      errors.push(errorMsg);
      return false;
    }
  }
}
