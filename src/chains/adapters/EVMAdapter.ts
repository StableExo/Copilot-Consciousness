/**
 * EVMAdapter - Adapter for EVM-compatible chains
 *
 * Supports Ethereum, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base
 *
 * Migrated to viem as part of Phase 2.2 module migration
 */

import {
  type PublicClient,
  type WalletClient,
  type Address,
  zeroAddress,
} from 'viem';
import { ChainAdapter, TokenBalance, SwapEstimate, SwapParams, TokenPrice } from './ChainAdapter';
import { ERC20_ABI } from '../../utils/viem/contracts';

// Minimal Uniswap V2 Router ABI
const UNISWAP_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export class EVMAdapter extends ChainAdapter {
  chainId: number;
  readonly chainType = 'EVM';
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(chainId: number, publicClient: PublicClient, walletClient?: WalletClient) {
    super();
    this.chainId = chainId;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<TokenBalance> {
    try {
      // Special handling for native token (ETH, BNB, etc.)
      if (
        tokenAddress === zeroAddress ||
        tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ) {
        const balance = await this.publicClient.getBalance({ address: walletAddress as Address });
        return {
          token: tokenAddress,
          balance,
          decimals: 18,
        };
      }

      // Use viem multicall for efficient data fetching
      const [balance, decimals] = await Promise.all([
        this.publicClient.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as Address],
        }),
        this.publicClient.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      return {
        token: tokenAddress,
        balance: balance as bigint,
        decimals: decimals as number,
      };
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error}`);
    }
  }

  /**
   * Estimate gas cost for a swap
   */
  async estimateSwapGas(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    dexAddress: string
  ): Promise<number> {
    try {
      const path = [tokenIn, tokenOut] as readonly Address[];

      // Use viem to estimate gas for swap
      const gasEstimate = await this.publicClient.estimateContractGas({
        address: dexAddress as Address,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          0n, // Min amount out (0 for estimation)
          path,
          zeroAddress, // Recipient
          BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
        ],
      }).catch(() => 150000n); // Default fallback

      return Number(gasEstimate);
    } catch (error) {
      console.warn(`Gas estimation failed, using default: ${error}`);
      return 150000; // Default gas estimate
    }
  }

  /**
   * Execute a swap on this chain
   */
  async executeSwap(params: SwapParams, dexAddress: string): Promise<string> {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('WalletClient not configured for swap execution');
    }

    try {
      const path = [params.tokenIn, params.tokenOut] as readonly Address[];
      const chain = this.walletClient.chain;
      if (!chain) {
        throw new Error('WalletClient must have a chain configured');
      }

      // Approve token spending if needed (skip for native token)
      if (params.tokenIn !== zeroAddress) {
        // Simulate approval first
        await this.publicClient.simulateContract({
          address: params.tokenIn as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [dexAddress as Address, params.amountIn],
          account: this.walletClient.account,
        });

        // Execute approval
        const approveHash = await this.walletClient.writeContract({
          address: params.tokenIn as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [dexAddress as Address, params.amountIn],
          account: this.walletClient.account,
          chain,
        });
        // Wait for approval to be mined
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Execute swap
      const txHash = await this.walletClient.writeContract({
        address: dexAddress as Address,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          params.amountIn,
          params.minAmountOut,
          path,
          params.recipient as Address,
          BigInt(params.deadline),
        ],
        account: this.walletClient.account,
        chain,
      });

      return txHash;
    } catch (error) {
      throw new Error(`Swap execution failed: ${error}`);
    }
  }

  /**
   * Get current token price (mock implementation)
   */
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    // This is a simplified implementation
    // In production, you would query price oracles or DEX reserves
    return {
      token: tokenAddress,
      priceUSD: 0,
      timestamp: Date.now(),
      source: `chain-${this.chainId}`,
    };
  }

  /**
   * Estimate swap output and costs
   */
  async estimateSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    dexAddress: string
  ): Promise<SwapEstimate> {
    try {
      const path = [tokenIn, tokenOut] as readonly Address[];

      // Get amounts out using viem readContract
      const amounts = await this.publicClient.readContract({
        address: dexAddress as Address,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      }) as readonly bigint[];
      const amountOut = amounts[amounts.length - 1];

      // Estimate gas
      const gasEstimate = await this.estimateSwapGas(tokenIn, tokenOut, amountIn, dexAddress);
      const gasPrice = await this.getGasPrice();
      const gasCost = BigInt(gasEstimate) * gasPrice;

      // Calculate price impact (simplified)
      const priceImpact = 0.5; // Default 0.5% - would need pool reserves for accurate calculation

      return {
        amountOut,
        gasEstimate,
        gasCost,
        priceImpact,
        route: path as unknown as string[],
      };
    } catch (error) {
      throw new Error(`Swap estimation failed: ${error}`);
    }
  }

  /**
   * Get native currency balance
   */
  async getNativeBalance(walletAddress: string): Promise<bigint> {
    const balance = await this.publicClient.getBalance({ address: walletAddress as Address });
    return balance;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, timeout: number = 60000): Promise<boolean> {
    try {
      const receipt = await Promise.race([
        this.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        ),
      ]);

      return receipt !== null && receipt.status === 'success';
    } catch (error) {
      console.error(`Transaction wait failed: ${error}`);
      return false;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const gasPrice = await this.publicClient.getGasPrice();
    return gasPrice;
  }

  /**
   * Check if token exists
   */
  async isValidToken(tokenAddress: string): Promise<boolean> {
    try {
      // Native token is always valid
      if (tokenAddress === zeroAddress) {
        return true;
      }

      const bytecode = await this.publicClient.getCode({ address: tokenAddress as Address });
      return bytecode !== undefined && bytecode !== '0x';
    } catch (_error) {
      return false;
    }
  }

  /**
   * Set wallet client for transaction execution
   */
  setWalletClient(walletClient: WalletClient): void {
    this.walletClient = walletClient;
  }

  /**
   * Get the public client
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }
}
export default EVMAdapter;
