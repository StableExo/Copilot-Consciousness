/**
 * WalletBalanceService - Fetches and caches wallet balances
 * 
 * Provides real-time wallet balance information for native and ERC20 tokens
 */

import { ethers, Provider } from 'ethers';
import { WalletBalance } from '../types';

// Minimal ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
}

export interface WalletBalanceConfig {
  provider: Provider;
  walletAddress: string;
  chainId: number;
  chainName: string;
  tokens: TokenConfig[];
}

export class WalletBalanceService {
  private config: WalletBalanceConfig;
  private cache: WalletBalance | null = null;
  private lastFetch: number = 0;
  private cacheDuration: number = 10000; // 10 seconds

  constructor(config: WalletBalanceConfig) {
    this.config = config;
  }

  /**
   * Get wallet balances (cached)
   */
  async getBalances(forceRefresh: boolean = false): Promise<WalletBalance> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (!forceRefresh && this.cache && (now - this.lastFetch) < this.cacheDuration) {
      return this.cache;
    }

    // Fetch fresh data
    const balance = await this.fetchBalances();
    this.cache = balance;
    this.lastFetch = now;
    
    return balance;
  }

  /**
   * Fetch current wallet balances
   */
  private async fetchBalances(): Promise<WalletBalance> {
    try {
      // Get native balance (ETH)
      const nativeBalance = await this.config.provider.getBalance(this.config.walletAddress);

      // Get token balances
      const tokenBalances = await Promise.all(
        this.config.tokens.map(async (token) => {
          try {
            const contract = new ethers.Contract(
              token.address,
              ERC20_ABI,
              this.config.provider
            );
            const balance = await contract.balanceOf(this.config.walletAddress);
            
            return {
              address: token.address,
              symbol: token.symbol,
              balance: balance.toString(),
              decimals: token.decimals
            };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return {
              address: token.address,
              symbol: token.symbol,
              balance: '0',
              decimals: token.decimals
            };
          }
        })
      );

      return {
        address: this.config.walletAddress,
        chainId: this.config.chainId,
        chainName: this.config.chainName,
        nativeBalance: nativeBalance.toString(),
        tokens: tokenBalances
      };
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      
      // Return empty balances on error
      return {
        address: this.config.walletAddress,
        chainId: this.config.chainId,
        chainName: this.config.chainName,
        nativeBalance: '0',
        tokens: this.config.tokens.map(token => ({
          address: token.address,
          symbol: token.symbol,
          balance: '0',
          decimals: token.decimals
        }))
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WalletBalanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.cache = null; // Invalidate cache
  }
}
