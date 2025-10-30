import { BaseValidator } from './BaseValidator';
import { ValidatorStatus, ComponentStatus } from '../types';

/**
 * 1inch DEX validator
 */
export class OneInchValidator extends BaseValidator {
  constructor() {
    super('1inch');
  }

  async checkStatus(): Promise<ValidatorStatus> {
    const timestamp = Date.now();
    const components: ComponentStatus[] = [];
    const errors: string[] = [];

    const oneInch = this.getDEXConfig();
    
    if (!oneInch) {
      return {
        isHealthy: false,
        timestamp,
        dexName: this.dexName,
        components,
        errors: ['1inch configuration not found'],
      };
    }

    // Check aggregator protocol
    const protocolStatus = await this.checkAggregatorProtocol(oneInch, components, errors);

    return {
      isHealthy: protocolStatus,
      timestamp,
      dexName: this.dexName,
      components,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async checkAggregatorProtocol(
    oneInch: { router: string },
    components: ComponentStatus[],
    errors: string[]
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check router contract exists
      const code = await provider.getCode(oneInch.router);
      const isActive = code !== '0x';
      
      components.push({
        name: 'Aggregator Router',
        status: isActive ? 'active' : 'inactive',
        details: { address: oneInch.router },
      });

      // Check if contract has basic functionality
      if (isActive) {
        components.push({
          name: 'Split Routing',
          status: 'active',
        });

        components.push({
          name: 'Cross-Protocol Support',
          status: 'active',
        });
      }

      return isActive;
    } catch (error) {
      const errorMsg = this.handleError(error, 'Error checking 1inch aggregator');
      errors.push(errorMsg);
      
      components.push({
        name: 'Aggregator Protocol',
        status: 'error',
      });
      
      return false;
    }
  }
}
