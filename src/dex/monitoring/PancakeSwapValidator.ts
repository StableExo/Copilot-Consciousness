import { BaseValidator } from './BaseValidator';
import { ValidatorStatus, ComponentStatus } from '../types';

/**
 * PancakeSwap V3 DEX validator
 */
export class PancakeSwapValidator extends BaseValidator {
  constructor() {
    super('PancakeSwap V3');
  }

  async checkStatus(): Promise<ValidatorStatus> {
    const timestamp = Date.now();
    const components: ComponentStatus[] = [];
    const errors: string[] = [];

    const pancakeSwap = this.getDEXConfig();

    if (!pancakeSwap) {
      return {
        isHealthy: false,
        timestamp,
        dexName: this.dexName,
        components,
        errors: ['PancakeSwap V3 configuration not found'],
      };
    }

    // Check router contract
    const routerStatus = await this.checkRouter(pancakeSwap, components, errors);

    return {
      isHealthy: routerStatus,
      timestamp,
      dexName: this.dexName,
      components,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async checkRouter(
    pancakeSwap: { router: string },
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check router contract exists
      const code = await provider.getCode(pancakeSwap.router);
      const isActive = code !== '0x';

      components.push({
        name: 'Swap Router',
        status: isActive ? 'active' : 'inactive',
        details: { address: pancakeSwap.router },
      });

      return isActive;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking PancakeSwap V3 router');
      errors.push(errorMsg);

      components.push({
        name: 'Swap Router',
        status: 'error',
      });

      return false;
    }
  }
}
