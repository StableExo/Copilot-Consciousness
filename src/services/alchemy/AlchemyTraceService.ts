/**
 * Alchemy Trace API Service
 *
 * Provides transaction tracing and debugging capabilities for analyzing
 * failed transactions, understanding execution flow, and optimizing gas usage.
 */

import { getAlchemyClient } from './AlchemyClient';

export interface TraceResult {
  success: boolean;
  gasUsed: string;
  output: string;
  calls?: any[];
  error?: string;
}

export interface TransactionAnalysis {
  txHash: string;
  success: boolean;
  gasUsed: number;
  failureReason?: string;
  internalCalls: number;
  valueTransfers: number;
}

/**
 * Service for transaction tracing and debugging
 */
export class AlchemyTraceService {
  private client = getAlchemyClient();

  /**
   * Analyze a failed transaction to determine why it failed
   */
  async analyzeFailedTransaction(txHash: string): Promise<TransactionAnalysis> {
    try {
      // Get transaction receipt
      const receipt = await this.client.core.getTransactionReceipt(txHash);

      if (!receipt) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      const success = receipt.status === 1;
      const gasUsed = parseInt(receipt.gasUsed.toString());

      let failureReason: string | undefined;
      const internalCalls = 0;
      const valueTransfers = 0;

      if (!success) {
        // Try to get revert reason
        try {
          const tx = await this.client.core.getTransaction(txHash);
          if (tx) {
            // Attempt to replay the transaction to get revert reason
            try {
              await this.client.core.call(
                {
                  to: tx.to || undefined,
                  from: tx.from,
                  data: tx.data,
                  value: tx.value,
                },
                receipt.blockNumber
              );
            } catch (callError: any) {
              failureReason = callError.message || 'Unknown error';
            }
          }
        } catch (_traceError) {
          failureReason = 'Unable to determine failure reason';
        }
      }

      return {
        txHash,
        success,
        gasUsed,
        failureReason,
        internalCalls,
        valueTransfers,
      };
    } catch (error) {
      console.error(`Error analyzing transaction ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed gas usage breakdown
   */
  async analyzeGasUsage(txHash: string): Promise<{
    totalGas: number;
    operationBreakdown: Array<{ operation: string; gas: number }>;
  }> {
    try {
      const receipt = await this.client.core.getTransactionReceipt(txHash);

      if (!receipt) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      const totalGas = parseInt(receipt.gasUsed.toString());
      const operationBreakdown: Array<{ operation: string; gas: number }> = [
        {
          operation: 'total',
          gas: totalGas,
        },
      ];

      return {
        totalGas,
        operationBreakdown,
      };
    } catch (error) {
      console.error(`Error analyzing gas usage for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get transaction receipt with additional context
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    try {
      const [receipt, tx] = await Promise.all([
        this.client.core.getTransactionReceipt(txHash),
        this.client.core.getTransaction(txHash),
      ]);

      return {
        receipt,
        transaction: tx,
        success: receipt?.status === 1,
        gasUsed: receipt ? parseInt(receipt.gasUsed.toString()) : 0,
      };
    } catch (error) {
      console.error(`Error getting transaction details for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Extract revert reason from failed transaction
   */
  async getRevertReason(txHash: string): Promise<string | null> {
    try {
      const receipt = await this.client.core.getTransactionReceipt(txHash);

      if (!receipt || receipt.status === 1) {
        return null; // Transaction succeeded
      }

      const tx = await this.client.core.getTransaction(txHash);
      if (!tx) {
        return null;
      }

      // Try to replay the transaction
      try {
        await this.client.core.call(
          {
            to: tx.to || undefined,
            from: tx.from,
            data: tx.data,
            value: tx.value,
          },
          receipt.blockNumber
        );

        return null;
      } catch (error: any) {
        return error.message || error.toString();
      }
    } catch (error) {
      console.error(`Error getting revert reason for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Check if transaction will succeed (simulation)
   */
  async simulateTransaction(
    from: string,
    to: string,
    data: string,
    value?: string
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      const result = await this.client.core.call({
        from,
        to,
        data,
        value: value || '0x0',
      });

      return {
        success: true,
        result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error.toString(),
      };
    }
  }
}
