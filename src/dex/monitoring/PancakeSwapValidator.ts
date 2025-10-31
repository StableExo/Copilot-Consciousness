import { BaseValidator } from './BaseValidator';
import { ValidatorStatus, ComponentStatus, DEXMemoryHook, DEXEventType } from '../types';

/**
 * PancakeSwap V3 DEX validator
 */
export class PancakeSwapValidator extends BaseValidator {
  private dexMemoryHook?: DEXMemoryHook;

  constructor(dexMemoryHook?: DEXMemoryHook) {
    super('PancakeSwap V3');
    this.dexMemoryHook = dexMemoryHook;
  }

  async checkStatus(): Promise<ValidatorStatus> {
    const timestamp = Date.now();
    const components: ComponentStatus[] = [];
    const errors: string[] = [];

    const pancakeSwap = this.getDEXConfig();

    if (!pancakeSwap) {
      const status: ValidatorStatus = {
        isHealthy: false,
        timestamp,
        dexName: this.dexName,
        components,
        errors: ['PancakeSwap V3 configuration not found'],
      };
      this.recordValidationEvent(status);
      return status;
    }

    // Check router contract
    const routerStatus = await this.checkRouter(pancakeSwap, components, errors);

    const status: ValidatorStatus = {
      isHealthy: routerStatus,
      timestamp,
      dexName: this.dexName,
      components,
      errors: errors.length > 0 ? errors : undefined,
    };
    this.recordValidationEvent(status);
    return status;
  }

  private recordValidationEvent(status: ValidatorStatus): void {
    if (!this.dexMemoryHook) {
      return;
    }

    this.dexMemoryHook.recordEvent({
      id: `${this.dexName}-${status.timestamp}`,
      type: status.isHealthy ? DEXEventType.VALIDATOR_SUCCESS : DEXEventType.VALIDATOR_FAILURE,
      dexName: this.dexName,
      timestamp: status.timestamp,
      data: {
        components: status.components,
        errors: status.errors,
      },
    });
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
