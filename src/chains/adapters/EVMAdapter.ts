/**
 * EVMAdapter - Adapter for EVM-compatible chains
 * 
 * Supports Ethereum, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base
 */

import { ethers } from 'ethers';
import { ChainAdapter, TokenBalance, SwapEstimate, SwapParams, TokenPrice } from './ChainAdapter';

// Minimal ERC20 ABI for balance and approval
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// Minimal Uniswap V2 Router ABI
const UNISWAP_V2_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)'
];

export class EVMAdapter extends ChainAdapter {
  chainId: number;
  readonly chainType = 'EVM';
  private provider: JsonRpcProvider;
  private signer?: ethers.Signer;

  constructor(
    chainId: number,
    provider: JsonRpcProvider,
    signer?: ethers.Signer
  ) {
    super();
    this.chainId = chainId;
    this.provider = provider;
    this.signer = signer;
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string
  ): Promise<TokenBalance> {
    try {
      // Special handling for native token (ETH, BNB, etc.)
      if (tokenAddress === ZeroAddress || 
          tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        const balance = await this.provider.getBalance(walletAddress);
        return {
          token: tokenAddress,
          balance: BigInt(balance.toString()),
          decimals: 18
        };
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
      ]);

      return {
        token: tokenAddress,
        balance: BigInt(balance.toString()),
        decimals
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
      const router = new ethers.Contract(dexAddress, UNISWAP_V2_ROUTER_ABI, this.provider);
      const path = [tokenIn, tokenOut];
      
      // Estimate gas for the swap
      const gasEstimate = await router.estimateGas.swapExactTokensForTokens(
        amountIn.toString(),
        0, // Min amount out (0 for estimation)
        path,
        ZeroAddress, // Recipient
        Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
      ).catch(() => BigInt(150000)); // Default fallback

      return Number(gasEstimate);
    } catch (error) {
      console.warn(`Gas estimation failed, using default: ${error}`);
      return 150000; // Default gas estimate
    }
  }

  /**
   * Execute a swap on this chain
   */
  async executeSwap(
    params: SwapParams,
    dexAddress: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not configured for swap execution');
    }

    try {
      const router = new ethers.Contract(dexAddress, UNISWAP_V2_ROUTER_ABI, this.signer);
      const path = [params.tokenIn, params.tokenOut];

      // Approve token spending if needed (skip for native token)
      if (params.tokenIn !== ZeroAddress) {
        const tokenContract = new ethers.Contract(params.tokenIn, ERC20_ABI, this.signer);
        const approveTx = await tokenContract.approve(dexAddress, params.amountIn.toString());
        await approveTx.wait();
      }

      // Execute swap
      const tx = await router.swapExactTokensForTokens(
        params.amountIn.toString(),
        params.minAmountOut.toString(),
        path,
        params.recipient,
        params.deadline
      );

      return tx.hash;
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
      source: `chain-${this.chainId}`
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
      const router = new ethers.Contract(dexAddress, UNISWAP_V2_ROUTER_ABI, this.provider);
      const path = [tokenIn, tokenOut];

      // Get amounts out
      const amounts = await router.getAmountsOut(amountIn.toString(), path);
      const amountOut = BigInt(amounts[amounts.length - 1].toString());

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
        route: path
      };
    } catch (error) {
      throw new Error(`Swap estimation failed: ${error}`);
    }
  }

  /**
   * Get native currency balance
   */
  async getNativeBalance(walletAddress: string): Promise<bigint> {
    const balance = await this.provider.getBalance(walletAddress);
    return BigInt(balance.toString());
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, timeout: number = 60000): Promise<boolean> {
    try {
      const receipt = await Promise.race([
        this.provider.waitForTransaction(txHash, 1),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        )
      ]);

      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error(`Transaction wait failed: ${error}`);
      return false;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const gasPrice = await this.provider.getGasPrice();
    return BigInt(gasPrice.toString());
  }

  /**
   * Check if token exists
   */
  async isValidToken(tokenAddress: string): Promise<boolean> {
    try {
      // Native token is always valid
      if (tokenAddress === ZeroAddress) {
        return true;
      }

      const code = await this.provider.getCode(tokenAddress);
      return code !== '0x';
    } catch (error) {
      return false;
    }
  }

  /**
   * Set signer for transaction execution
   */
  setSigner(signer: ethers.Signer): void {
    this.signer = signer;
  }
}

export default EVMAdapter;
