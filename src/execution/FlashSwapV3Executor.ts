/**
 * FlashSwapV3 Executor - TypeScript Integration Layer
 * 
 * Multi-source flash loan arbitrage execution with automatic source optimization.
 * Supports Balancer V2 (0%), dYdX (0%), Aave V3 (0.09%), and hybrid modes.
 * 
 * Features:
 * - Automatic flash loan source selection
 * - Universal swap path construction (1-5 hops)
 * - Gas estimation with multi-source support
 * - Profit calculation with fee accounting
 * - Source availability checking
 */

import { Contract, Provider, Signer, ethers, parseUnits, formatUnits } from 'ethers';
import { logger } from '../utils/logger';
import { ArbitrageOpportunity } from '../arbitrage/models';

/**
 * Flash loan source types
 */
export enum FlashLoanSource {
  BALANCER = 0,        // 0% fee - preferred for standalone
  DYDX = 1,            // 0% fee - ETH/USDC/DAI only, Ethereum only
  HYBRID_AAVE_V4 = 2,  // 0.09% Aave + 0% V4 swaps - best for large arbs
  AAVE = 3,            // 0.09% fee - universal fallback
  UNISWAP_V3 = 4,      // 0.05-1% fee - legacy support
}

/**
 * DEX type constants
 */
export enum DexType {
  UNISWAP_V3 = 0,
  SUSHISWAP = 1,
  DODO = 2,
  AERODROME = 3,
  BALANCER = 4,
  CURVE = 5,
  UNISWAP_V4 = 6,
}

/**
 * Swap step in arbitrage path
 */
export interface SwapStep {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;       // Fee tier (for Uniswap V3)
  minOut: bigint;    // Minimum output amount
  dexType: DexType;
}

/**
 * Universal swap path structure
 */
export interface UniversalSwapPath {
  steps: SwapStep[];
  borrowAmount: bigint;
  minFinalAmount: bigint;
}

/**
 * Flash loan parameters
 */
export interface FlashLoanParams {
  source: FlashLoanSource;
  borrowToken: string;
  borrowAmount: bigint;
  path: UniversalSwapPath;
  initiator: string;
}

/**
 * Source selection result
 */
export interface SourceSelection {
  source: FlashLoanSource;
  fee: number;           // Fee in basis points (0, 9, etc.)
  reason: string;        // Why this source was selected
  estimatedCost: bigint; // Estimated fee cost in borrowed token
}

/**
 * Execution configuration
 */
export interface FlashSwapV3Config {
  contractAddress: string;
  provider: Provider;
  signer?: Signer;
  gasBuffer?: number;      // Gas estimation buffer (default 1.2 = 20%)
  defaultSlippage?: number; // Default slippage tolerance (default 0.01 = 1%)
  chainId?: number;        // Chain ID for source availability
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  receipt?: ethers.TransactionReceipt;
  source: FlashLoanSource;
  gasUsed?: bigint;
  gasPrice?: bigint;
  totalGasCost?: bigint;
  borrowAmount: bigint;
  feePaid: bigint;
  grossProfit: bigint;
  netProfit: bigint;
  titheAmount?: bigint;
  ownerAmount?: bigint;
  error?: string;
}

/**
 * FlashSwapV3 contract interface (partial)
 */
const FLASH_SWAP_V3_ABI = [
  'function executeArbitrage(address borrowToken, uint256 borrowAmount, tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] steps, uint256 borrowAmount, uint256 minFinalAmount) path) external',
  'function selectOptimalSource(address token, uint256 amount) external view returns (uint8)',
  'function isBalancerSupported(address token, uint256 amount) external view returns (bool)',
  'function isDydxSupported(address token, uint256 amount) external view returns (bool)',
  'function owner() external view returns (address)',
  'function titheRecipient() external view returns (address)',
  'function titheBps() external view returns (uint16)',
  'function emergencyWithdraw(address token, uint256 amount) external',
  'event FlashLoanInitiated(uint8 indexed source, address indexed token, uint256 amount, address indexed initiator)',
  'event FlashLoanExecuted(uint8 indexed source, address indexed token, uint256 amountBorrowed, uint256 feePaid, uint256 grossProfit, uint256 netProfit)',
  'event SwapExecuted(uint256 indexed stepIndex, uint8 dexType, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)',
  'event TitheDistributed(address indexed token, address indexed titheRecipient, uint256 titheAmount, address indexed owner, uint256 ownerAmount)',
];

/**
 * Flash loan fee structure
 */
export const FLASH_LOAN_FEES: Record<FlashLoanSource, number> = {
  [FlashLoanSource.BALANCER]: 0,      // 0%
  [FlashLoanSource.DYDX]: 0,          // 0%
  [FlashLoanSource.HYBRID_AAVE_V4]: 9, // 0.09% (9 bps)
  [FlashLoanSource.AAVE]: 9,          // 0.09% (9 bps)
  [FlashLoanSource.UNISWAP_V3]: 50,   // 0.05-1% (varies by pool)
};

/**
 * FlashSwapV3 Executor
 */
export class FlashSwapV3Executor {
  private contract: Contract;
  private config: Required<FlashSwapV3Config>;

  constructor(config: FlashSwapV3Config) {
    this.config = {
      ...config,
      gasBuffer: config.gasBuffer ?? 1.2,
      defaultSlippage: config.defaultSlippage ?? 0.01,
      chainId: config.chainId ?? 8453, // Default to Base
    };

    this.contract = new Contract(
      config.contractAddress,
      FLASH_SWAP_V3_ABI,
      config.signer || config.provider
    );
  }

  /**
   * Select optimal flash loan source for given parameters
   */
  async selectOptimalSource(
    borrowToken: string,
    borrowAmount: bigint
  ): Promise<SourceSelection> {
    try {
      // Call contract to get optimal source
      const sourceId = await this.contract.selectOptimalSource(borrowToken, borrowAmount);
      const source = sourceId as FlashLoanSource;

      // Calculate estimated cost
      const fee = FLASH_LOAN_FEES[source];
      const estimatedCost = (borrowAmount * BigInt(fee)) / 10000n;

      // Determine reason
      let reason = '';
      if (source === FlashLoanSource.BALANCER) {
        reason = 'Balancer V2 selected: 0% fee, universal support';
      } else if (source === FlashLoanSource.DYDX) {
        reason = 'dYdX selected: 0% fee, ETH/USDC/DAI on Ethereum';
      } else if (source === FlashLoanSource.HYBRID_AAVE_V4) {
        reason = 'Hybrid mode: Large opportunity ($50M+), Aave + V4 optimal';
      } else if (source === FlashLoanSource.AAVE) {
        reason = 'Aave V3 fallback: 0.09% fee, universal support';
      }

      return {
        source,
        fee,
        reason,
        estimatedCost,
      };
    } catch (error) {
      logger.error('Failed to select optimal source', { error, borrowToken, borrowAmount });
      throw error;
    }
  }

  /**
   * Check if Balancer supports the token/amount
   */
  async isBalancerSupported(token: string, amount: bigint): Promise<boolean> {
    try {
      return await this.contract.isBalancerSupported(token, amount);
    } catch (error) {
      logger.error('Failed to check Balancer support', { error, token, amount });
      return false;
    }
  }

  /**
   * Check if dYdX supports the token/amount
   */
  async isDydxSupported(token: string, amount: bigint): Promise<boolean> {
    try {
      return await this.contract.isDydxSupported(token, amount);
    } catch (error) {
      logger.error('Failed to check dYdX support', { error, token, amount });
      return false;
    }
  }

  /**
   * Construct universal swap path from arbitrage opportunity
   */
  constructSwapPath(opportunity: ArbitrageOpportunity): UniversalSwapPath {
    const steps: SwapStep[] = [];

    // Convert opportunity swap steps to universal format
    for (const swap of opportunity.path) {
      // Map protocol to DexType
      let dexType: DexType;
      if (swap.protocol === 'uniswap_v3') {
        dexType = DexType.UNISWAP_V3;
      } else if (swap.protocol === 'sushiswap') {
        dexType = DexType.SUSHISWAP;
      } else if (swap.protocol === 'aerodrome') {
        dexType = DexType.AERODROME;
      } else {
        dexType = DexType.UNISWAP_V3; // Default
      }

      // Calculate minOut with slippage
      const slippage = this.config.defaultSlippage;
      const minOut = (BigInt(swap.minAmountOut) * BigInt(Math.floor((1 - slippage) * 10000))) / 10000n;

      steps.push({
        pool: swap.poolAddress,
        tokenIn: swap.tokenIn,
        tokenOut: swap.tokenOut,
        fee: swap.fee || 3000, // Default 0.3%
        minOut,
        dexType,
      });
    }

    return {
      steps,
      borrowAmount: BigInt(opportunity.input.amount),
      minFinalAmount: BigInt(opportunity.expectedProfit),
    };
  }

  /**
   * Execute arbitrage with automatic source selection
   */
  async executeArbitrage(
    borrowToken: string,
    borrowAmount: bigint,
    path: UniversalSwapPath
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Select optimal source
      const selection = await this.selectOptimalSource(borrowToken, borrowAmount);
      
      logger.info('Executing arbitrage with FlashSwapV3', {
        borrowToken,
        borrowAmount: formatUnits(borrowAmount, 6),
        source: FlashLoanSource[selection.source],
        fee: `${selection.fee} bps`,
        estimatedFeeCost: formatUnits(selection.estimatedCost, 6),
        steps: path.steps.length,
      });

      // Estimate gas
      const estimatedGas = await this.contract.executeArbitrage.estimateGas(
        borrowToken,
        borrowAmount,
        path
      );

      const gasLimit = (estimatedGas * BigInt(Math.floor(this.config.gasBuffer * 100))) / 100n;

      // Execute transaction
      const tx = await this.contract.executeArbitrage(
        borrowToken,
        borrowAmount,
        path,
        { gasLimit }
      );

      logger.info('Transaction submitted', {
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Parse events
      const events = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter((e: any) => e !== null);

      // Extract execution details from events
      const executedEvent = events.find((e: any) => e?.name === 'FlashLoanExecuted');
      const titheEvent = events.find((e: any) => e?.name === 'TitheDistributed');

      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || 0n;
      const totalGasCost = gasUsed * gasPrice;

      const result: ExecutionResult = {
        success: true,
        txHash: tx.hash,
        receipt,
        source: selection.source,
        gasUsed,
        gasPrice,
        totalGasCost,
        borrowAmount,
        feePaid: executedEvent?.args?.feePaid || 0n,
        grossProfit: executedEvent?.args?.grossProfit || 0n,
        netProfit: executedEvent?.args?.netProfit || 0n,
        titheAmount: titheEvent?.args?.titheAmount,
        ownerAmount: titheEvent?.args?.ownerAmount,
      };

      const executionTime = Date.now() - startTime;

      logger.info('Arbitrage executed successfully', {
        txHash: tx.hash,
        source: FlashLoanSource[selection.source],
        borrowAmount: formatUnits(borrowAmount, 6),
        feePaid: formatUnits(result.feePaid, 6),
        grossProfit: formatUnits(result.grossProfit, 6),
        netProfit: formatUnits(result.netProfit, 6),
        gasUsed: gasUsed.toString(),
        gasCost: formatUnits(totalGasCost, 18),
        executionTime: `${executionTime}ms`,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to execute arbitrage', {
        error: error.message,
        borrowToken,
        borrowAmount: formatUnits(borrowAmount, 6),
      });

      return {
        success: false,
        source: FlashLoanSource.AAVE,
        borrowAmount,
        feePaid: 0n,
        grossProfit: 0n,
        netProfit: 0n,
        error: error.message,
      };
    }
  }

  /**
   * Estimate profit for given opportunity
   */
  async estimateProfit(opportunity: ArbitrageOpportunity): Promise<{
    source: FlashLoanSource;
    grossProfit: bigint;
    flashLoanFee: bigint;
    estimatedGasCost: bigint;
    netProfit: bigint;
  }> {
    const borrowAmount = BigInt(opportunity.input.amount);
    const borrowToken = opportunity.input.token;

    // Select source
    const selection = await this.selectOptimalSource(borrowToken, borrowAmount);

    // Calculate flash loan fee
    const flashLoanFee = selection.estimatedCost;

    // Estimate gas
    const path = this.constructSwapPath(opportunity);
    const estimatedGas = await this.contract.executeArbitrage.estimateGas(
      borrowToken,
      borrowAmount,
      path
    ).catch(() => 500000n); // Fallback if estimation fails

    const gasPrice = await this.config.provider.getFeeData().then(d => d.gasPrice || 0n);
    const estimatedGasCost = estimatedGas * gasPrice;

    // Calculate profit
    const grossProfit = BigInt(opportunity.expectedProfit);
    const netProfit = grossProfit - flashLoanFee - estimatedGasCost;

    return {
      source: selection.source,
      grossProfit,
      flashLoanFee,
      estimatedGasCost,
      netProfit,
    };
  }

  /**
   * Emergency withdraw tokens from contract
   */
  async emergencyWithdraw(token: string, amount: bigint): Promise<string> {
    try {
      const tx = await this.contract.emergencyWithdraw(token, amount);
      await tx.wait();
      logger.info('Emergency withdrawal successful', { token, amount: amount.toString(), txHash: tx.hash });
      return tx.hash;
    } catch (error) {
      logger.error('Emergency withdrawal failed', { error, token, amount: amount.toString() });
      throw error;
    }
  }

  /**
   * Get contract owner address
   */
  async getOwner(): Promise<string> {
    return await this.contract.owner();
  }

  /**
   * Get tithe recipient and basis points
   */
  async getTitheInfo(): Promise<{ recipient: string; bps: number }> {
    const recipient = await this.contract.titheRecipient();
    const bps = await this.contract.titheBps();
    return { recipient, bps };
  }
}
