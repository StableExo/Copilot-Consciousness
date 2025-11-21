/**
 * Alchemy Trace API Service
 * 
 * Provides transaction tracing and debugging capabilities for analyzing
 * failed transactions, understanding execution flow, and optimizing gas usage.
 */

import { getAlchemyClient } from './AlchemyClient';
import { DebugTransaction, DebugCallTracer } from 'alchemy-sdk';

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
   * Trace a transaction to understand its execution
   */
  async traceTransaction(txHash: string): Promise<TraceResult> {
    try {
      const trace = await this.client.debug.traceTransaction(txHash, {
        tracer: DebugCallTracer.CALL_TRACER,
      });

      return this.parseTraceResult(trace);
    } catch (error) {
      console.error(`Error tracing transaction ${txHash}:`, error);
      throw error;
    }
  }

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
      let internalCalls = 0;
      let valueTransfers = 0;

      if (!success) {
        // Trace the transaction to understand the failure
        try {
          const trace = await this.traceTransaction(txHash);
          failureReason = trace.error || 'Unknown error';
          
          if (trace.calls) {
            internalCalls = trace.calls.length;
            valueTransfers = this.countValueTransfers(trace.calls);
          }
        } catch (traceError) {
          failureReason = 'Unable to trace transaction';
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
   * Simulate a transaction before sending
   */
  async simulateTransaction(
    from: string,
    to: string,
    data: string,
    value?: string
  ): Promise<TraceResult> {
    try {
      // Use debug_traceCall for simulation
      const trace = await this.client.debug.traceCall(
        {
          from,
          to,
          data,
          value: value || '0x0',
        },
        'latest',
        {
          tracer: DebugCallTracer.CALL_TRACER,
        }
      );

      return this.parseTraceResult(trace);
    } catch (error) {
      console.error('Error simulating transaction:', error);
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
      const trace = await this.client.debug.traceTransaction(txHash, {
        tracer: DebugCallTracer.CALL_TRACER,
      });

      // Parse gas usage from trace
      const totalGas = parseInt(trace.gasUsed || '0', 16);
      const operationBreakdown: Array<{ operation: string; gas: number }> = [];

      // Extract gas usage per operation from trace
      if (trace.calls) {
        for (const call of trace.calls) {
          operationBreakdown.push({
            operation: call.type || 'unknown',
            gas: parseInt(call.gasUsed || '0', 16),
          });
        }
      }

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
   * Trace multiple transactions in a block
   */
  async traceBlock(blockNumber: number): Promise<TraceResult[]> {
    try {
      const block = await this.client.core.getBlockWithTransactions(blockNumber);
      
      if (!block || !block.transactions) {
        return [];
      }

      const traces: TraceResult[] = [];
      
      for (const tx of block.transactions) {
        try {
          const trace = await this.traceTransaction(tx.hash);
          traces.push(trace);
        } catch (error) {
          console.warn(`Failed to trace transaction ${tx.hash}:`, error);
        }
      }

      return traces;
    } catch (error) {
      console.error(`Error tracing block ${blockNumber}:`, error);
      throw error;
    }
  }

  /**
   * Parse trace result into a standard format
   */
  private parseTraceResult(trace: any): TraceResult {
    return {
      success: !trace.error,
      gasUsed: trace.gasUsed || '0',
      output: trace.output || trace.returnValue || '0x',
      calls: trace.calls || [],
      error: trace.error,
    };
  }

  /**
   * Count value transfers in trace calls
   */
  private countValueTransfers(calls: any[]): number {
    let count = 0;
    
    for (const call of calls) {
      if (call.value && BigInt(call.value) > 0n) {
        count++;
      }
      
      if (call.calls) {
        count += this.countValueTransfers(call.calls);
      }
    }
    
    return count;
  }

  /**
   * Extract revert reason from failed transaction
   */
  async getRevertReason(txHash: string): Promise<string | null> {
    try {
      const trace = await this.traceTransaction(txHash);
      
      if (trace.error) {
        return trace.error;
      }
      
      // Try to decode revert reason from output
      if (trace.output && trace.output.length > 2) {
        try {
          // Parse revert reason if it follows standard format
          const reason = this.decodeRevertReason(trace.output);
          return reason;
        } catch {
          return trace.output;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting revert reason for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Decode revert reason from output data
   */
  private decodeRevertReason(output: string): string {
    // Standard revert with reason string starts with 0x08c379a0
    if (output.startsWith('0x08c379a0')) {
      try {
        // Skip function selector (4 bytes) and decode the string
        const reason = Buffer.from(output.slice(10), 'hex').toString('utf8');
        return reason.replace(/\0/g, '').trim();
      } catch {
        return output;
      }
    }
    
    return output;
  }
}
