/**
 * TransactionBuilder - Intelligent transaction construction with gas optimization
 * 
 * Automatically selects EIP-1559 vs legacy, estimates gas, and simulates transactions
 * Now integrated with AdvancedGasEstimator for pre-execution validation
 */

import { ethers } from 'ethers';
import { GasPriceOracle, GasPriceTier } from './GasPriceOracle';
import { ArbitragePath } from '../arbitrage/types';
import { AdvancedGasEstimator, ValidationResult } from './AdvancedGasEstimator';

export type GasStrategy = 'aggressive' | 'normal' | 'economical';

export interface Transaction {
  to: string;
  data: string;
  value: bigint;
  gasLimit: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  nonce?: number;
  chainId?: number;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  returnData?: string;
  error?: string;
}

export interface BuildTransactionOptions {
  from?: string;
  value?: bigint;
  nonce?: number;
}

export class TransactionBuilder {
  private provider: ethers.providers.JsonRpcProvider;
  private oracle: GasPriceOracle;
  private gasBuffer: number = 1.1; // 10% buffer on gas estimates
  private advancedEstimator?: AdvancedGasEstimator;

  constructor(
    provider: ethers.providers.JsonRpcProvider, 
    oracle: GasPriceOracle,
    advancedEstimator?: AdvancedGasEstimator
  ) {
    this.provider = provider;
    this.oracle = oracle;
    this.advancedEstimator = advancedEstimator;
  }

  /**
   * Build transaction with optimal gas parameters
   */
  async buildTransaction(
    path: ArbitragePath,
    strategy: GasStrategy = 'normal',
    options: BuildTransactionOptions = {}
  ): Promise<Transaction> {
    // Select gas tier based on strategy
    const gasTier = this.strategyToTier(strategy);
    
    // Get gas price
    const gasPrice = await this.oracle.getCurrentGasPrice(gasTier);
    
    // Check if network supports EIP-1559
    const supportsEIP1559 = await this.checkEIP1559Support();
    
    // Estimate gas limit
    const gasLimit = await this.estimateGasLimit(path, options);
    
    // Build transaction object
    const tx: Transaction = {
      to: path.hops[0].poolAddress, // First hop destination
      data: '0x', // Will be populated with actual swap data
      value: options.value || BigInt(0),
      gasLimit,
      nonce: options.nonce
    };

    // Add gas pricing based on EIP-1559 support
    if (supportsEIP1559) {
      tx.maxFeePerGas = gasPrice.maxFeePerGas;
      tx.maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
    } else {
      tx.gasPrice = gasPrice.gasPrice;
    }

    return tx;
  }

  /**
   * Estimate gas cost for an arbitrage path
   */
  async estimateGasCost(path: ArbitragePath): Promise<bigint> {
    const gasPrice = await this.oracle.getCurrentGasPrice('normal');
    const gasLimit = BigInt(path.totalGasCost);
    
    return gasLimit * gasPrice.maxFeePerGas;
  }

  /**
   * Simulate transaction execution without sending
   */
  async simulateExecution(tx: Transaction, from?: string): Promise<SimulationResult> {
    try {
      // Use eth_call to simulate
      const result = await this.provider.call({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        from: from || ethers.constants.AddressZero,
        gasLimit: tx.gasLimit
      });

      // If we got here, the call succeeded
      return {
        success: true,
        gasUsed: tx.gasLimit, // Actual gas would be measured on-chain
        returnData: result
      };
    } catch (error: any) {
      // Parse revert reason if available
      let errorMessage = 'Unknown error';
      
      if (error.data) {
        try {
          errorMessage = ethers.utils.toUtf8String(error.data);
        } catch {
          errorMessage = error.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        gasUsed: BigInt(0),
        error: errorMessage
      };
    }
  }

  /**
   * Batch multiple transactions using multicall pattern
   */
  async batchTransactions(txs: Transaction[]): Promise<Transaction> {
    // This is a simplified version - real implementation would use Multicall contract
    if (txs.length === 0) {
      throw new Error('No transactions to batch');
    }

    if (txs.length === 1) {
      return txs[0];
    }

    // Calculate total gas limit
    const totalGasLimit = txs.reduce((sum, tx) => sum + tx.gasLimit, BigInt(0));

    // Use highest gas price from all transactions
    const maxFeePerGas = txs.reduce(
      (max, tx) => (tx.maxFeePerGas && tx.maxFeePerGas > max ? tx.maxFeePerGas : max),
      BigInt(0)
    );

    const maxPriorityFeePerGas = txs.reduce(
      (max, tx) => (tx.maxPriorityFeePerGas && tx.maxPriorityFeePerGas > max ? tx.maxPriorityFeePerGas : max),
      BigInt(0)
    );

    // Create batched transaction
    return {
      to: txs[0].to, // Would be multicall contract in production
      data: '0x', // Would encode all calls
      value: txs.reduce((sum, tx) => sum + tx.value, BigInt(0)),
      gasLimit: totalGasLimit,
      maxFeePerGas: maxFeePerGas > BigInt(0) ? maxFeePerGas : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas > BigInt(0) ? maxPriorityFeePerGas : undefined,
      gasPrice: txs[0].gasPrice
    };
  }

  /**
   * Build transaction with retry logic (increasing gas price)
   */
  async buildTransactionWithRetry(
    path: ArbitragePath,
    strategy: GasStrategy = 'normal',
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<Transaction> {
    const tx = await this.buildTransaction(path, strategy);

    if (attempt > 1) {
      // Increase gas price by 10% for each retry
      const multiplier = BigInt(100 + (10 * (attempt - 1))) * BigInt(100) / BigInt(10000);
      
      if (tx.maxFeePerGas) {
        tx.maxFeePerGas = (tx.maxFeePerGas * multiplier) / BigInt(100);
      }
      if (tx.maxPriorityFeePerGas) {
        tx.maxPriorityFeePerGas = (tx.maxPriorityFeePerGas * multiplier) / BigInt(100);
      }
      if (tx.gasPrice) {
        tx.gasPrice = (tx.gasPrice * multiplier) / BigInt(100);
      }
    }

    return tx;
  }

  /**
   * Estimate gas limit for arbitrage path
   */
  private async estimateGasLimit(
    path: ArbitragePath,
    options: BuildTransactionOptions
  ): Promise<bigint> {
    try {
      // Use totalGasCost from path as baseline
      const baseGas = BigInt(path.totalGasCost);
      
      // Apply buffer
      const gasWithBuffer = (baseGas * BigInt(Math.floor(this.gasBuffer * 1000))) / BigInt(1000);
      
      return gasWithBuffer;
    } catch (error) {
      console.error('Error estimating gas:', error);
      // Fallback to default gas limit
      return BigInt(500000); // 500k gas default for arbitrage
    }
  }

  /**
   * Check if network supports EIP-1559
   */
  private async checkEIP1559Support(): Promise<boolean> {
    try {
      const block = await this.provider.getBlock('latest');
      return block?.baseFeePerGas !== null && block?.baseFeePerGas !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Map strategy to gas price tier
   */
  private strategyToTier(strategy: GasStrategy): GasPriceTier {
    const mapping: Record<GasStrategy, GasPriceTier> = {
      aggressive: 'instant',
      normal: 'fast',
      economical: 'normal'
    };
    return mapping[strategy];
  }

  /**
   * Set gas buffer percentage
   */
  setGasBuffer(buffer: number): void {
    if (buffer < 1.0 || buffer > 2.0) {
      throw new Error('Gas buffer must be between 1.0 and 2.0');
    }
    this.gasBuffer = buffer;
  }

  /**
   * Get current gas buffer
   */
  getGasBuffer(): number {
    return this.gasBuffer;
  }

  /**
   * Validate path execution with advanced gas estimation
   * Uses AdvancedGasEstimator if available, otherwise performs basic checks
   */
  async validatePathExecution(
    path: ArbitragePath,
    executorAddress?: string,
    from?: string
  ): Promise<ValidationResult> {
    if (this.advancedEstimator) {
      return this.advancedEstimator.validateExecution(path, from, executorAddress);
    }

    // Fallback to basic validation
    const gasPrice = await this.oracle.getCurrentGasPrice('normal');
    const gasCost = BigInt(path.totalGasCost) * gasPrice.maxFeePerGas;
    const netProfit = path.estimatedProfit - gasCost;

    return {
      valid: true,
      executable: netProfit > BigInt(0),
      reason: netProfit > BigInt(0) ? undefined : 'Unprofitable after gas costs',
      estimatedGas: BigInt(path.totalGasCost),
      gasPrice: gasPrice.maxFeePerGas,
      netProfit,
      warnings: []
    };
  }

  /**
   * Build and validate transaction in one call
   * Returns null if validation fails
   */
  async buildValidatedTransaction(
    path: ArbitragePath,
    strategy: GasStrategy = 'normal',
    options: BuildTransactionOptions = {},
    executorAddress?: string
  ): Promise<{ tx: Transaction; validation: ValidationResult } | null> {
    // First validate
    const validation = await this.validatePathExecution(path, executorAddress, options.from);

    if (!validation.executable) {
      return null;
    }

    // Build transaction
    const tx = await this.buildTransaction(path, strategy, options);

    return { tx, validation };
  }
}
