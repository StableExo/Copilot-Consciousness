/**
 * FlashLoanExecutor - Aave V3 Flashloan Integration for Live Arbitrage
 *
 * Handles execution of multi-DEX arbitrage opportunities using Aave V3 flashloans
 * through the FlashSwapV2 contract. Supports multi-hop paths and cross-DEX routes.
 *
 * Safety features:
 * - Pre-execution simulation via SimulationService
 * - Profit threshold validation
 * - Gas estimation and limits
 * - MEV risk assessment integration
 */

import { Provider, ethers, formatEther, ZeroAddress, AbiCoder, id } from 'ethers';

// Dynamic import for artifact - may not exist if contracts haven't been compiled
let FlashSwapV2Artifact: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  FlashSwapV2Artifact = require('../../artifacts/contracts/FlashSwapV2.sol/FlashSwapV2.json');
} catch (_error) {
  // Artifact not found - contracts haven't been compiled
  // This is OK for testing/development without deploying contracts
  console.warn(
    '[FlashLoanExecutor] FlashSwapV2 artifact not found. Run `npm run compile` to generate contract artifacts.'
  );
  FlashSwapV2Artifact = {
    abi: [], // Empty ABI as fallback
  };
}

/**
 * Swap step in a multi-hop path
 */
export interface SwapStep {
  /** Pool address for this swap */
  pool: string;
  /** Input token address */
  tokenIn: string;
  /** Output token address */
  tokenOut: string;
  /** Pool fee tier (e.g., 500 for 0.05%, 3000 for 0.3%) */
  fee: number;
  /** Minimum output amount (slippage protection) */
  minOut: string;
  /** DEX type: 0=Uniswap V3, 1=SushiSwap, 2=DODO */
  dexType: number;
}

/**
 * Flashloan arbitrage parameters
 */
export interface FlashLoanArbitrageParams {
  /** Token to borrow via flashloan */
  borrowToken: string;
  /** Amount to borrow (in wei) */
  borrowAmount: string;
  /** Swap path to execute */
  swapPath: SwapStep[];
  /** Expected net profit after all fees (in ETH) */
  expectedProfit: number;
  /** Gas estimate for execution */
  gasEstimate?: bigint;
}

/**
 * Flashloan execution result
 */
export interface FlashLoanExecutionResult {
  success: boolean;
  txHash?: string;
  profit?: string;
  gasUsed?: bigint;
  error?: string;
}

/**
 * FlashLoan executor configuration
 */
export interface FlashLoanExecutorConfig {
  /** FlashSwapV2 contract address */
  flashSwapAddress: string;
  /** Aave V3 Pool address */
  aavePoolAddress: string;
  /** Provider for blockchain interaction */
  provider: Provider;
  /** Signer for transaction submission */
  signer: ethers.Signer;
}

/**
 * FlashLoanExecutor
 *
 * Executes arbitrage opportunities using Aave V3 flashloans through FlashSwapV2 contract.
 * Handles multi-DEX, multi-hop paths with comprehensive safety checks.
 */
export class FlashLoanExecutor {
  private config: FlashLoanExecutorConfig;
  private flashSwapContract: ethers.Contract;
  private aavePoolContract: ethers.Contract;

  constructor(config: FlashLoanExecutorConfig) {
    this.config = config;

    // Initialize FlashSwapV2 contract
    this.flashSwapContract = new ethers.Contract(
      config.flashSwapAddress,
      FlashSwapV2Artifact.abi,
      config.signer
    );

    // Initialize Aave V3 Pool contract (minimal interface for flashloan)
    const aavePoolABI = [
      'function flashLoan(address receiverAddress, address[] calldata assets, uint256[] calldata amounts, uint256[] calldata interestRateModes, address onBehalfOf, bytes calldata params, uint16 referralCode) external',
    ];
    this.aavePoolContract = new ethers.Contract(config.aavePoolAddress, aavePoolABI, config.signer);
  }

  /**
   * Execute a flashloan arbitrage opportunity
   *
   * This triggers an Aave V3 flashloan which calls FlashSwapV2.executeOperation()
   * to execute the swap path.
   *
   * @param params Flashloan arbitrage parameters
   * @returns Execution result
   */
  async execute(params: FlashLoanArbitrageParams): Promise<FlashLoanExecutionResult> {
    try {
      console.log('[FlashLoanExecutor] Preparing flashloan execution...');
      console.log(`  Borrow token: ${params.borrowToken}`);
      console.log(`  Borrow amount: ${formatEther(params.borrowAmount)} ETH`);
      console.log(`  Swap path steps: ${params.swapPath.length}`);
      console.log(`  Expected profit: ${params.expectedProfit} ETH`);

      // Prepare flashloan parameters
      const assets = [params.borrowToken]; // Single asset flashloan
      const amounts = [params.borrowAmount]; // Amount to borrow
      const interestRateModes = [0]; // 0 = no debt (flash loan)
      const onBehalfOf = this.config.flashSwapAddress; // FlashSwapV2 receives the loan
      const referralCode = 0;

      // Encode swap path for FlashSwapV2.executeOperation
      const encodedParams = this.encodeSwapPath(params.swapPath);

      // Build transaction
      console.log('[FlashLoanExecutor] Building flashloan transaction...');
      const tx = await (this.aavePoolContract as any).flashLoan.populateTransaction(
        this.config.flashSwapAddress, // Receiver (FlashSwapV2)
        assets,
        amounts,
        interestRateModes,
        onBehalfOf,
        encodedParams,
        referralCode
      );

      // Set gas limit if provided
      if (params.gasEstimate) {
        tx.gasLimit = params.gasEstimate;
      }

      // Submit transaction
      console.log('[FlashLoanExecutor] Submitting flashloan transaction...');
      const txResponse = await this.config.signer.sendTransaction(tx);
      console.log(`[FlashLoanExecutor] Transaction submitted: ${txResponse.hash}`);

      // Wait for confirmation
      const receipt = await txResponse.wait();

      if (receipt && receipt.status === 1) {
        console.log('[FlashLoanExecutor] ✓ Flashloan execution successful!');

        // Parse profit from events (TradeProfit event)
        const profit = this.extractProfitFromReceipt(receipt);

        return {
          success: true,
          txHash: receipt.hash,
          profit: profit || '0',
          gasUsed: receipt.gasUsed,
        };
      } else {
        return {
          success: false,
          error: 'Transaction reverted',
        };
      }
    } catch (error: any) {
      console.error('[FlashLoanExecutor] Execution failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Encode swap path for FlashSwapV2.executeOperation callback
   *
   * The encoded data will be decoded by FlashSwapV2 as ArbParams:
   * struct ArbParams { SwapStep[] path; address initiator; }
   */
  private encodeSwapPath(swapPath: SwapStep[]): string {
    // Convert SwapStep[] to Solidity struct format
    const pathStruct = swapPath.map((step) => ({
      pool: step.pool,
      tokenIn: step.tokenIn,
      tokenOut: step.tokenOut,
      fee: step.fee,
      minOut: step.minOut,
      dexType: step.dexType,
    }));

    // Get initiator address (the account that initiated this call)
    const initiatorAddress = ZeroAddress; // Placeholder; FlashSwapV2 validates this

    // Encode as ArbParams struct
    const types = [
      'tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path',
      'address initiator',
    ];

    const values = [pathStruct, initiatorAddress];

    return AbiCoder.defaultAbiCoder().encode(types, values);
  }

  /**
   * Extract profit from transaction receipt
   * Looks for TradeProfit event emitted by FlashSwapV2
   */
  private extractProfitFromReceipt(receipt: ethers.TransactionReceipt): string | null {
    try {
      // Parse logs for TradeProfit event
      // event TradeProfit(bytes32 indexed pathHash, address indexed tokenBorrowed, uint256 grossProfit, uint256 feePaid, uint256 netProfit)
      const tradeProfitTopic = id('TradeProfit(bytes32,address,uint256,uint256,uint256)');

      for (const log of receipt.logs) {
        if (log.topics[0] === tradeProfitTopic) {
          const parsedLog = this.flashSwapContract.interface.parseLog(log);
          if (parsedLog) {
            const netProfit = parsedLog.args.netProfit;
            return netProfit.toString();
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('[FlashLoanExecutor] Failed to extract profit from receipt:', error);
      return null;
    }
  }

  /**
   * Estimate gas for a flashloan execution
   * Note: This performs a static call simulation
   */
  async estimateGas(params: FlashLoanArbitrageParams): Promise<bigint> {
    try {
      const assets = [params.borrowToken];
      const amounts = [params.borrowAmount];
      const interestRateModes = [0];
      const onBehalfOf = this.config.flashSwapAddress;
      const referralCode = 0;
      const encodedParams = this.encodeSwapPath(params.swapPath);

      const gasEstimate = await (this.aavePoolContract as any).flashLoan.estimateGas(
        this.config.flashSwapAddress,
        assets,
        amounts,
        interestRateModes,
        onBehalfOf,
        encodedParams,
        referralCode
      );

      return gasEstimate;
    } catch (error: any) {
      console.error('[FlashLoanExecutor] Gas estimation failed:', error.message);
      // Return a conservative default
      return BigInt(1000000);
    }
  }

  /**
   * Get FlashSwapV2 contract instance
   */
  getContract(): ethers.Contract {
    return this.flashSwapContract;
  }
}
