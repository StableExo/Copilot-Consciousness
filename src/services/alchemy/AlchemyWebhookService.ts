/**
 * Alchemy Webhook/Notify Service
 * 
 * Provides real-time blockchain event monitoring using Alchemy's Notify API.
 * Useful for MEV opportunity detection, address activity monitoring, and
 * transaction confirmation tracking.
 */

import { getAlchemyClient } from './AlchemyClient';
import { formatEther } from 'ethers';

export interface WebhookEvent {
  type: 'ADDRESS_ACTIVITY' | 'MINED_TRANSACTION' | 'DROPPED_TRANSACTION' | 'CUSTOM';
  network: string;
  activity: any[];
  timestamp: number;
}

export interface AddressActivityConfig {
  addresses: string[];
  webhook_url?: string;
  callback?: (event: WebhookEvent) => void;
}

/**
 * Service for real-time blockchain event monitoring
 */
export class AlchemyWebhookService {
  private client = getAlchemyClient();
  private listeners: Map<string, (event: WebhookEvent) => void> = new Map();

  /**
   * Subscribe to address activity via WebSocket
   */
  async subscribeToAddress(
    address: string,
    callback: (event: any) => void
  ): Promise<void> {
    try {
      // Subscribe to all pending transactions
      this.client.ws.on(
        'alchemy_pendingTransactions',
        (tx) => {
          // Filter for address
          if (tx.to === address || tx.from === address) {
            callback({
              type: 'PENDING_TX',
              address,
              transaction: tx,
              timestamp: Date.now(),
            });
          }
        }
      );

      console.log(`Subscribed to address activity: ${address}`);
    } catch (error) {
      console.error(`Error subscribing to address ${address}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to new blocks
   */
  async subscribeToBlocks(callback: (blockNumber: number) => void): Promise<void> {
    try {
      this.client.ws.on('block', (blockNumber) => {
        callback(blockNumber);
      });

      console.log('Subscribed to new blocks');
    } catch (error) {
      console.error('Error subscribing to blocks:', error);
      throw error;
    }
  }

  /**
   * Subscribe to pending transactions
   */
  async subscribeToPendingTransactions(
    callback: (tx: any) => void,
    filter?: {
      fromAddress?: string;
      toAddress?: string;
    }
  ): Promise<void> {
    try {
      this.client.ws.on('alchemy_pendingTransactions', (tx) => {
        // Apply filters if provided
        if (filter?.fromAddress && tx.from !== filter.fromAddress) {
          return;
        }
        if (filter?.toAddress && tx.to !== filter.toAddress) {
          return;
        }
        callback(tx);
      });

      console.log('Subscribed to pending transactions');
    } catch (error) {
      console.error('Error subscribing to pending transactions:', error);
      throw error;
    }
  }

  /**
   * Monitor mempool for specific token transfers
   */
  async monitorTokenTransfers(
    tokenAddress: string,
    callback: (transfer: any) => void
  ): Promise<void> {
    try {
      await this.subscribeToPendingTransactions((tx) => {
        // Filter for token transfer transactions
        if (tx.to && tx.to.toLowerCase() === tokenAddress.toLowerCase()) {
          callback({
            type: 'TOKEN_TRANSFER',
            tokenAddress,
            transaction: tx,
            timestamp: Date.now(),
          });
        }
      });

      console.log(`Monitoring token transfers for ${tokenAddress}`);
    } catch (error) {
      console.error(`Error monitoring token transfers for ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Monitor DEX activity for arbitrage opportunities
   */
  async monitorDexActivity(
    dexAddresses: string[],
    callback: (activity: any) => void
  ): Promise<void> {
    try {
      for (const dexAddress of dexAddresses) {
        await this.subscribeToPendingTransactions(
          (tx) => {
            callback({
              type: 'DEX_ACTIVITY',
              dexAddress,
              transaction: tx,
              timestamp: Date.now(),
            });
          },
          { toAddress: dexAddress }
        );
      }

      console.log(`Monitoring DEX activity for ${dexAddresses.length} addresses`);
    } catch (error) {
      console.error('Error monitoring DEX activity:', error);
      throw error;
    }
  }

  /**
   * Monitor large transactions (potential MEV opportunities)
   */
  async monitorLargeTransactions(
    minValueEth: number,
    callback: (tx: any) => void
  ): Promise<void> {
    try {
      await this.subscribeToPendingTransactions((tx) => {
        if (tx.value) {
          try {
            const valueEth = parseFloat(utils.formatEther(tx.value));
            if (valueEth >= minValueEth) {
              callback({
                type: 'LARGE_TRANSACTION',
                valueEth,
                transaction: tx,
                timestamp: Date.now(),
              });
            }
          } catch (error) {
            console.error('Error parsing transaction value:', error);
          }
        }
      });

      console.log(`Monitoring large transactions (>= ${minValueEth} ETH)`);
    } catch (error) {
      console.error('Error monitoring large transactions:', error);
      throw error;
    }
  }

  /**
   * Subscribe to logs for specific contract events
   */
  async subscribeToLogs(
    contractAddress: string,
    topics: string[],
    callback: (log: any) => void
  ): Promise<void> {
    try {
      this.client.ws.on(
        {
          address: contractAddress,
          topics: topics,
        },
        (log) => {
          callback(log);
        }
      );

      console.log(`Subscribed to logs for ${contractAddress}`);
    } catch (error) {
      console.error(`Error subscribing to logs for ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all listeners
   */
  async unsubscribeAll(): Promise<void> {
    try {
      this.client.ws.removeAllListeners();
      this.listeners.clear();
      console.log('Unsubscribed from all listeners');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw error;
    }
  }

  /**
   * Get WebSocket connection status
   */
  isConnected(): boolean {
    try {
      // Simple check if WebSocket exists
      return !!this.client.ws;
    } catch {
      return false;
    }
  }
}
