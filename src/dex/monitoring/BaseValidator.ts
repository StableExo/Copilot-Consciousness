import { DEXRegistry } from '../core/DEXRegistry';
import { DEXValidator, DEXEvent, ValidatorStatus, DEXConfig } from '../types';
import { ethers } ,Provider } from 'ethers';

/**
 * Base validator class providing common functionality for all DEX validators
 */
export abstract class BaseValidator implements DEXValidator {
  protected readonly dexRegistry: DEXRegistry;
  protected readonly dexName: string;
  protected eventCallbacks: Array<(event: DEXEvent) => void> = [];

  constructor(dexName: string) {
    this.dexName = dexName;
    this.dexRegistry = new DEXRegistry();
  }

  /**
   * Get the DEX configuration
   */
  protected getDEXConfig(): DEXConfig | undefined {
    return this.dexRegistry.getDEX(this.dexName);
  }

  /**
   * Get an ethers provider
   */
  protected getProvider(): Provider {
    return new JsonRpcProvider();
  }

  /**
   * Emit an event to all registered callbacks
   */
  protected emitEvent(event: DEXEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        // Silently catch errors in callbacks to prevent cascading failures
      }
    });
  }

  /**
   * Handle errors consistently
   */
  protected handleError(error: unknown, context: string): string {
    const message = error instanceof Error ? error.message : String(error);
    return `${context}: ${message}`;
  }

  /**
   * Get the DEX name
   */
  getDEXName(): string {
    return this.dexName;
  }

  /**
   * Register a callback for DEX events
   */
  onEvent(callback: (event: DEXEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Abstract method to be implemented by specific validators
   */
  abstract checkStatus(): Promise<ValidatorStatus>;
}
