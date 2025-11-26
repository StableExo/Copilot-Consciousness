/**
 * Alchemy Token API Service
 *
 * Provides enhanced token data access including balances, metadata,
 * and allowances using Alchemy's Enhanced APIs.
 */

import { getAlchemyClient } from './AlchemyClient';
import { AssetTransfersCategory } from 'alchemy-sdk';

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

export interface TokenMetadata {
  name?: string;
  symbol?: string;
  decimals?: number;
  logo?: string;
}

export interface TransferFilter {
  fromAddress?: string;
  toAddress?: string;
  contractAddresses?: string[];
  category?: AssetTransfersCategory[];
  fromBlock?: string;
  toBlock?: string;
  maxCount?: number;
  excludeZeroValue?: boolean;
  order?: 'asc' | 'desc';
}

/**
 * Service for interacting with Alchemy's Token API
 */
export class AlchemyTokenService {
  private client = getAlchemyClient();

  /**
   * Get token balances for an address
   */
  async getTokenBalances(address: string, contractAddresses?: string[]): Promise<TokenBalance[]> {
    try {
      const balances = await this.client.core.getTokenBalances(address, contractAddresses);

      return balances.tokenBalances.map((balance) => ({
        contractAddress: balance.contractAddress,
        tokenBalance: balance.tokenBalance || '0',
        error: balance.error || undefined,
      }));
    } catch (error) {
      console.error('Error fetching token balances:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a token
   */
  async getTokenMetadata(contractAddress: string): Promise<TokenMetadata> {
    try {
      const metadata = await this.client.core.getTokenMetadata(contractAddress);

      return {
        name: metadata.name || undefined,
        symbol: metadata.symbol || undefined,
        decimals: metadata.decimals || undefined,
        logo: metadata.logo || undefined,
      };
    } catch (error) {
      console.error(`Error fetching token metadata for ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get historical asset transfers
   */
  async getAssetTransfers(filter: TransferFilter): Promise<any> {
    try {
      const params: any = {
        fromBlock: filter.fromBlock || '0x0',
        toBlock: filter.toBlock || 'latest',
        category: filter.category || [
          AssetTransfersCategory.ERC20,
          AssetTransfersCategory.EXTERNAL,
        ],
        withMetadata: true,
        excludeZeroValue: filter.excludeZeroValue !== false,
        maxCount: filter.maxCount || 1000,
        order: filter.order || 'desc',
      };

      if (filter.fromAddress) {
        params.fromAddress = filter.fromAddress;
      }

      if (filter.toAddress) {
        params.toAddress = filter.toAddress;
      }

      if (filter.contractAddresses && filter.contractAddresses.length > 0) {
        params.contractAddresses = filter.contractAddresses;
      }

      const transfers = await this.client.core.getAssetTransfers(params);
      return transfers;
    } catch (error) {
      console.error('Error fetching asset transfers:', error);
      throw error;
    }
  }

  /**
   * Get first transfer event for a contract (useful for finding deployment)
   */
  async getFirstTransfer(contractAddress: string): Promise<any> {
    try {
      const transfers = await this.getAssetTransfers({
        contractAddresses: [contractAddress],
        fromBlock: '0x0',
        maxCount: 1,
        order: 'asc',
      });

      return transfers.transfers[0] || null;
    } catch (error) {
      console.error(`Error fetching first transfer for ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get latest transfer events for a contract
   */
  async getLatestTransfers(contractAddress: string, count: number = 10): Promise<any[]> {
    try {
      const transfers = await this.getAssetTransfers({
        contractAddresses: [contractAddress],
        maxCount: count,
        order: 'desc',
      });

      return transfers.transfers;
    } catch (error) {
      console.error(`Error fetching latest transfers for ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Monitor address activity
   */
  async monitorAddressTransfers(
    address: string,
    callback: (transfer: any) => void,
    options?: {
      fromBlock?: string;
      toBlock?: string;
      category?: AssetTransfersCategory[];
    }
  ): Promise<void> {
    try {
      const transfers = await this.getAssetTransfers({
        fromAddress: address,
        fromBlock: options?.fromBlock,
        toBlock: options?.toBlock,
        category: options?.category,
      });

      transfers.transfers.forEach((transfer: any) => callback(transfer));
    } catch (error) {
      console.error(`Error monitoring address ${address}:`, error);
      throw error;
    }
  }
}
