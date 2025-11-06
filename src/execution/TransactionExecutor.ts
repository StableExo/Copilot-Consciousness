/**
 * TransactionExecutor.ts - Unified transaction handler
 * 
 * Integrates all mission components:
 * - Gas Estimator (Mission #1) for cost forecasting
 * - Nonce Manager (Mission #2) for transaction ordering
 * - Parameter Builders (Mission #3) for DEX-specific transactions
 * - Profit Calculator (Mission #4) for opportunity validation
 * 
 * Supports multi-DEX execution: Uniswap V2/V3, SushiSwap, Curve, Aave, Balancer
 */

import { ethers, providers } from 'ethers';
import { logger } from '../utils/logger';
import { NonceManager } from './NonceManager';
import { ParamBuilder } from './ParamBuilder';
import { AdvancedGasEstimator, GasEstimationResult } from '../gas/AdvancedGasEstimator';
import { GasPriceOracle } from '../gas/GasPriceOracle';
import {
  ExecutionContext,
  TransactionExecutionRequest,
  TransactionExecutionResult,
  TransactionStatus,
  TransactionMonitoringInfo,
  MultiDEXTransactionParams,
  ExecutionError
} from '../types/ExecutionTypes';
import { ArbitrageOpportunity, SimulationResult, ArbitrageConfig } from '../types/definitions';

/**
 * Transaction Executor Configuration
 */
export interface TransactionExecutorConfig {
  provider: providers.JsonRpcProvider;
  gasOracle: GasPriceOracle;
  gasEstimator: AdvancedGasEstimator;
  arbitrageConfig: ArbitrageConfig;
  confirmations: number;
  confirmationTimeout: number;
  titheRecipient: string;
}

/**
 * TransactionExecutor - Unified transaction handling with full integration
 */
export class TransactionExecutor {
  private provider: providers.JsonRpcProvider;
  private gasOracle: GasPriceOracle;
  private gasEstimator: AdvancedGasEstimator;
  private arbitrageConfig: ArbitrageConfig;
  private confirmations: number;
  private confirmationTimeout: number;
  private titheRecipient: string;
  
  // Statistics
  private stats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalGasUsed: BigInt(0),
    totalProfit: BigInt(0)
  };

  constructor(config: TransactionExecutorConfig) {
    this.provider = config.provider;
    this.gasOracle = config.gasOracle;
    this.gasEstimator = config.gasEstimator;
    this.arbitrageConfig = config.arbitrageConfig;
    this.confirmations = config.confirmations || 1;
    this.confirmationTimeout = config.confirmationTimeout || 120000; // 2 minutes
    this.titheRecipient = config.titheRecipient;
  }

  /**
   * Execute an arbitrage transaction with full integration
   */
  async executeTransaction(
    request: TransactionExecutionRequest,
    nonceManager: NonceManager
  ): Promise<TransactionExecutionResult> {
    this.stats.totalTransactions++;
    const startTime = Date.now();

    try {
      logger.info(`[TransactionExecutor] Starting execution for context ${request.context.id}`);

      // Step 1: Validate execution request
      const validation = await this.validateRequest(request);
      if (!validation.valid) {
        return this.createFailedResult(
          TransactionStatus.FAILED,
          'VALIDATION_FAILED',
          validation.reason || 'Request validation failed'
        );
      }

      // Step 2: Build transaction parameters using ParamBuilder (Mission #3)
      const txParams = await this.buildTransactionParams(request);
      if (!txParams) {
        return this.createFailedResult(
          TransactionStatus.FAILED,
          'PARAM_BUILD_FAILED',
          'Failed to build transaction parameters'
        );
      }

      // Step 3: Estimate gas using AdvancedGasEstimator (Mission #1)
      const gasEstimation = await this.estimateGas(request, txParams);
      if (!gasEstimation.success || !gasEstimation.profitable) {
        return this.createFailedResult(
          TransactionStatus.FAILED,
          'GAS_VALIDATION_FAILED',
          gasEstimation.reason || 'Transaction not profitable after gas costs'
        );
      }

      // Step 4: Get optimal gas price from oracle
      const gasPrice = await this.getOptimalGasPrice(request.maxGasPrice);

      // Step 5: Build the actual transaction
      const transaction = await this.buildTransaction(
        request,
        txParams,
        gasEstimation,
        gasPrice
      );

      // Step 6: Submit transaction using NonceManager (Mission #2)
      logger.info(`[TransactionExecutor] Submitting transaction for ${request.context.id}`);
      const txResponse = await nonceManager.sendTransaction(transaction);

      logger.info(`[TransactionExecutor] Transaction submitted: ${txResponse.hash}`);

      // Step 7: Monitor transaction confirmation
      const monitoringResult = await this.monitorTransaction(txResponse);

      // Step 8: Calculate actual results
      const actualProfit = await this.calculateActualProfit(
        monitoringResult,
        request.context
      );

      // Update statistics
      if (monitoringResult.status === TransactionStatus.CONFIRMED) {
        this.stats.successfulTransactions++;
        this.stats.totalProfit += actualProfit;
        this.stats.totalGasUsed += monitoringResult.gasUsed || BigInt(0);
      } else {
        this.stats.failedTransactions++;
      }

      return {
        success: monitoringResult.status === TransactionStatus.CONFIRMED,
        transactionHash: txResponse.hash,
        blockNumber: monitoringResult.blockNumber,
        gasUsed: monitoringResult.gasUsed,
        effectiveGasPrice: monitoringResult.effectiveGasPrice,
        actualProfit,
        status: monitoringResult.status,
        timestamp: Date.now()
      };

    } catch (error) {
      this.stats.failedTransactions++;
      logger.error(`[TransactionExecutor] Execution failed: ${error instanceof Error ? error.message : String(error)}`);

      return this.createFailedResult(
        TransactionStatus.FAILED,
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        error
      );
    }
  }

  /**
   * Validate the execution request
   */
  private async validateRequest(
    request: TransactionExecutionRequest
  ): Promise<{ valid: boolean; reason?: string }> {
    // Validate addresses
    if (!ethers.utils.isAddress(request.from)) {
      return { valid: false, reason: 'Invalid from address' };
    }

    if (!ethers.utils.isAddress(request.executorAddress)) {
      return { valid: false, reason: 'Invalid executor address' };
    }

    // Validate context
    if (!request.context.opportunity || !request.context.path) {
      return { valid: false, reason: 'Invalid execution context' };
    }

    // Validate deadline if provided
    if (request.deadline && request.deadline < Date.now()) {
      return { valid: false, reason: 'Execution deadline has passed' };
    }

    return { valid: true };
  }

  /**
   * Build transaction parameters using ParamBuilder
   */
  private async buildTransactionParams(
    request: TransactionExecutionRequest
  ): Promise<MultiDEXTransactionParams | null> {
    try {
      const { opportunity, path } = request.context;

      // Create simulation result from path data
      const simulationResult: SimulationResult = {
        initialAmount: path.hops[0]?.amountIn || BigInt(0),
        amountOutHop1: path.hops[0]?.amountOut || BigInt(0),
        finalAmount: path.hops[path.hops.length - 1]?.amountOut || BigInt(0)
      };

      // Determine opportunity type and build appropriate parameters
      let paramResult: any;

      if (opportunity.type === 'spatial' && opportunity.path && opportunity.path.length === 2) {
        // Two-hop Uniswap V3 arbitrage
        paramResult = ParamBuilder.buildTwoHopParams(
          opportunity,
          simulationResult,
          this.arbitrageConfig,
          this.titheRecipient
        );

        return {
          dexType: 'UniswapV3',
          contractAddress: request.executorAddress,
          functionName: paramResult.contractFunctionName,
          params: paramResult.params,
          borrowTokenAddress: paramResult.borrowTokenAddress,
          borrowAmount: paramResult.borrowAmount,
          minAmountOut: paramResult.params.amountOutMinimum2
        };

      } else if (opportunity.type === 'triangular') {
        // Triangular arbitrage
        paramResult = ParamBuilder.buildTriangularParams(
          opportunity,
          simulationResult,
          this.arbitrageConfig,
          this.titheRecipient
        );

        return {
          dexType: 'UniswapV3',
          contractAddress: request.executorAddress,
          functionName: paramResult.contractFunctionName,
          params: paramResult.params,
          borrowTokenAddress: paramResult.borrowTokenAddress,
          borrowAmount: paramResult.borrowAmount,
          minAmountOut: paramResult.params.amountOutMinimumFinal
        };

      } else if (opportunity.path && opportunity.path.length > 0) {
        // Multi-hop with Aave flash loan
        paramResult = ParamBuilder.buildAavePathParams(
          opportunity,
          simulationResult,
          this.arbitrageConfig,
          request.from,
          this.titheRecipient
        );

        return {
          dexType: 'Aave',
          contractAddress: request.executorAddress,
          functionName: paramResult.contractFunctionName,
          params: paramResult.params,
          borrowTokenAddress: paramResult.borrowTokenAddress,
          borrowAmount: paramResult.borrowAmount,
          minAmountOut: BigInt(0) // Calculated in params.path
        };
      }

      logger.error('[TransactionExecutor] Unsupported opportunity structure');
      return null;

    } catch (error) {
      logger.error(`[TransactionExecutor] Failed to build transaction params: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Estimate gas for the transaction
   */
  private async estimateGas(
    request: TransactionExecutionRequest,
    txParams: MultiDEXTransactionParams
  ): Promise<GasEstimationResult> {
    try {
      // Use AdvancedGasEstimator to validate and estimate
      const validation = await this.gasEstimator.validateExecution(
        request.context.path,
        request.from,
        request.executorAddress
      );

      if (!validation.valid || !validation.executable) {
        return {
          success: false,
          estimatedGas: BigInt(0),
          gasPrice: BigInt(0),
          totalGasCost: BigInt(0),
          netProfit: BigInt(0),
          profitable: false,
          reason: validation.reason
        };
      }

      return {
        success: true,
        estimatedGas: validation.estimatedGas || BigInt(0),
        gasPrice: validation.gasPrice || BigInt(0),
        totalGasCost: (validation.estimatedGas || BigInt(0)) * (validation.gasPrice || BigInt(0)),
        netProfit: validation.netProfit || BigInt(0),
        profitable: true
      };

    } catch (error) {
      logger.error(`[TransactionExecutor] Gas estimation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        estimatedGas: BigInt(0),
        gasPrice: BigInt(0),
        totalGasCost: BigInt(0),
        netProfit: BigInt(0),
        profitable: false,
        reason: error instanceof Error ? error.message : 'Gas estimation error'
      };
    }
  }

  /**
   * Get optimal gas price from oracle
   */
  private async getOptimalGasPrice(maxGasPrice?: bigint): Promise<bigint> {
    try {
      const gasPrice = await this.gasOracle.getCurrentGasPrice('fast');
      const price = gasPrice.maxFeePerGas;

      // Clamp to max if provided
      if (maxGasPrice && price > maxGasPrice) {
        logger.warn(`[TransactionExecutor] Gas price ${price} exceeds max ${maxGasPrice}, using max`);
        return maxGasPrice;
      }

      return price;

    } catch (error) {
      logger.error(`[TransactionExecutor] Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`);
      // Fallback to a safe default
      return BigInt(50) * BigInt(10 ** 9); // 50 gwei
    }
  }

  /**
   * Build the final transaction object
   */
  private async buildTransaction(
    request: TransactionExecutionRequest,
    txParams: MultiDEXTransactionParams,
    gasEstimation: GasEstimationResult,
    gasPrice: bigint
  ): Promise<providers.TransactionRequest> {
    // Encode function call
    const iface = new ethers.utils.Interface([
      this.getFunctionSignature(txParams.functionName, txParams.dexType)
    ]);

    const data = this.encodeTransaction(iface, txParams);

    return {
      from: request.from,
      to: request.executorAddress,
      data,
      gasLimit: gasEstimation.estimatedGas,
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: gasPrice / BigInt(10), // 10% of base fee as priority
      value: 0,
      type: 2 // EIP-1559 transaction
    };
  }

  /**
   * Get function signature for DEX type
   */
  private getFunctionSignature(functionName: string, dexType: string): string {
    const signatures: Record<string, string> = {
      initiateUniswapV3FlashLoan: 'function initiateUniswapV3FlashLoan(address tokenBorrowed, uint256 amountBorrowed, bytes calldata params)',
      initiateTriangularFlashSwap: 'function initiateTriangularFlashSwap(address tokenBorrowed, uint256 amountBorrowed, bytes calldata params)',
      initiateAaveFlashLoan: 'function initiateAaveFlashLoan(address[] calldata assets, uint256[] calldata amounts, bytes calldata params)'
    };

    return signatures[functionName] || signatures.initiateUniswapV3FlashLoan;
  }

  /**
   * Encode transaction data
   */
  private encodeTransaction(
    iface: ethers.utils.Interface,
    txParams: MultiDEXTransactionParams
  ): string {
    const functionName = txParams.functionName;

    // Encode params based on function
    if (functionName === 'initiateAaveFlashLoan') {
      return iface.encodeFunctionData(functionName, [
        [txParams.borrowTokenAddress],
        [txParams.borrowAmount],
        ethers.utils.defaultAbiCoder.encode(
          ['tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator, address titheRecipient)'],
          [txParams.params]
        )
      ]);
    } else {
      // Uniswap V3 or triangular
      const encodedParams = this.encodeParams(txParams);
      return iface.encodeFunctionData(functionName, [
        txParams.borrowTokenAddress,
        txParams.borrowAmount,
        encodedParams
      ]);
    }
  }

  /**
   * Encode parameters for transaction
   */
  private encodeParams(txParams: MultiDEXTransactionParams): string {
    if (txParams.functionName === 'initiateUniswapV3FlashLoan') {
      return ethers.utils.defaultAbiCoder.encode(
        ['tuple(address tokenIntermediate, uint24 feeA, uint24 feeB, uint256 amountOutMinimum1, uint256 amountOutMinimum2, address titheRecipient)'],
        [txParams.params]
      );
    } else if (txParams.functionName === 'initiateTriangularFlashSwap') {
      return ethers.utils.defaultAbiCoder.encode(
        ['tuple(address tokenA, address tokenB, address tokenC, uint24 fee1, uint24 fee2, uint24 fee3, uint256 amountOutMinimumFinal, address titheRecipient)'],
        [txParams.params]
      );
    }

    return '0x';
  }

  /**
   * Monitor transaction until confirmation
   */
  private async monitorTransaction(
    txResponse: providers.TransactionResponse
  ): Promise<TransactionMonitoringInfo> {
    const startTime = Date.now();
    const info: TransactionMonitoringInfo = {
      transactionHash: txResponse.hash,
      submittedAt: startTime,
      confirmations: 0,
      requiredConfirmations: this.confirmations,
      status: TransactionStatus.SUBMITTED
    };

    try {
      logger.info(`[TransactionExecutor] Monitoring transaction ${txResponse.hash}`);

      // Wait for confirmation with timeout
      const receipt = await Promise.race<providers.TransactionReceipt>([
        txResponse.wait(this.confirmations) as Promise<providers.TransactionReceipt>,
        new Promise<providers.TransactionReceipt>((_, reject) =>
          setTimeout(() => reject(new Error('Confirmation timeout')), this.confirmationTimeout)
        )
      ]);

      info.confirmedAt = Date.now();
      info.blockNumber = receipt.blockNumber;
      info.confirmations = receipt.confirmations;
      info.gasUsed = BigInt(receipt.gasUsed.toString());
      info.effectiveGasPrice = BigInt(receipt.effectiveGasPrice?.toString() || '0');

      if (receipt.status === 1) {
        info.status = TransactionStatus.CONFIRMED;
        logger.info(`[TransactionExecutor] Transaction confirmed: ${txResponse.hash}`);
      } else {
        info.status = TransactionStatus.REVERTED;
        logger.error(`[TransactionExecutor] Transaction reverted: ${txResponse.hash}`);
      }

    } catch (error) {
      logger.error(`[TransactionExecutor] Transaction monitoring failed: ${error instanceof Error ? error.message : String(error)}`);
      info.status = TransactionStatus.FAILED;
    }

    return info;
  }

  /**
   * Calculate actual profit from transaction receipt
   */
  private async calculateActualProfit(
    monitoring: TransactionMonitoringInfo,
    context: ExecutionContext
  ): Promise<bigint> {
    if (monitoring.status !== TransactionStatus.CONFIRMED) {
      return BigInt(0);
    }

    // Calculate gas cost
    const gasCost = (monitoring.gasUsed || BigInt(0)) * (monitoring.effectiveGasPrice || BigInt(0));

    // Use estimated profit from context (in production, this should parse logs)
    const estimatedProfit = context.estimatedProfit || BigInt(0);

    // Actual profit = estimated profit - actual gas cost
    return estimatedProfit > gasCost ? estimatedProfit - gasCost : BigInt(0);
  }

  /**
   * Create a failed result
   */
  private createFailedResult(
    status: TransactionStatus,
    errorType: string,
    message: string,
    details?: any
  ): TransactionExecutionResult {
    return {
      success: false,
      status,
      timestamp: Date.now(),
      error: {
        timestamp: Date.now(),
        stage: 'EXECUTING' as any,
        errorType,
        message,
        recoverable: false,
        details
      }
    };
  }

  /**
   * Get executor statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalGasUsed: BigInt(0),
      totalProfit: BigInt(0)
    };
  }
}
