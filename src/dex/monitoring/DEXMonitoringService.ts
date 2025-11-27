import { BalancerValidator } from './BalancerValidator';
import { BaseValidator } from './BaseValidator';
import { CurveValidator } from './CurveValidator';
import { OneInchValidator } from './OneInchValidator';
import { PancakeSwapValidator } from './PancakeSwapValidator';
import { SushiSwapValidator } from './SushiSwapValidator';
import { DEXMemoryHookImpl } from '../core/DEXMemoryHook';
import { MemorySystem } from '../../consciousness/memory';
import { defaultConfig } from '../../config';

export class DEXMonitoringService {
  private validators: BaseValidator[];
  private intervalId?: NodeJS.Timeout;
  private dexMemoryHook: DEXMemoryHookImpl;

  constructor(validators?: BaseValidator[]) {
    const memorySystem = new MemorySystem(defaultConfig.memory);
    this.dexMemoryHook = new DEXMemoryHookImpl(memorySystem);
    if (validators) {
      this.validators = validators;
    } else {
      this.validators = [
        new BalancerValidator(),
        new CurveValidator(),
        new OneInchValidator(),
        new PancakeSwapValidator(this.dexMemoryHook),
        new SushiSwapValidator(),
      ];
    }
  }

  start(interval: number = 60000): void {
    if (this.intervalId) {
      this.stop();
    }

    const run = () => {
      this.runChecks();
      this.intervalId = setTimeout(run, interval);
    };

    this.intervalId = setTimeout(run, interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async runChecks(): Promise<void> {
    for (const validator of this.validators) {
      await validator.checkStatus();
    }
  }
}
