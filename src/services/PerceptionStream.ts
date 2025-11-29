// src/services/PerceptionStream.ts

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { SensoryMemory } from '../consciousness/sensory_memory';
import { TemporalAwarenessFramework } from '../consciousness/temporal_awareness';

// Create a dedicated public client for block watching
function createBlockWatchClient() {
  const rpcUrl =
    process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL || 'http://localhost:8545';
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
}

export class PerceptionStream {
  private readonly sensoryMemory: SensoryMemory;
  private readonly temporalFramework: TemporalAwarenessFramework;
  private readonly client = createBlockWatchClient();
  /** Cleanup function to stop watching blocks. Null when not watching. */
  private unwatchFn: (() => void) | null = null;

  constructor(sensoryMemory: SensoryMemory, temporalFramework: TemporalAwarenessFramework) {
    this.sensoryMemory = sensoryMemory;
    this.temporalFramework = temporalFramework;
    console.log('PerceptionStream constructed and ready.');
  }

  /**
   * Returns true if the stream is currently watching for blocks
   */
  public isWatching(): boolean {
    return this.unwatchFn !== null;
  }

  public initialize() {
    if (this.unwatchFn) {
      console.log('PerceptionStream already initialized.');
      return;
    }
    console.log('Initializing blockchain event listener...');
    // Use viem's watchBlockNumber to subscribe to new blocks
    this.unwatchFn = this.client.watchBlockNumber({
      onBlockNumber: (blockNumber: bigint) => this.handleNewBlock(blockNumber),
      emitOnBegin: false,
    });
    console.log('Listener for new blocks is active.');
  }

  public stop() {
    if (this.unwatchFn) {
      this.unwatchFn();
      this.unwatchFn = null;
      console.log('Block listener stopped.');
    }
  }

  private async handleNewBlock(blockNumber: bigint) {
    try {
      const block = await this.client.getBlock({ blockNumber });
      if (!block) return;

      // The raw sensory event to be logged.
      const sensoryEvent = {
        type: 'NEW_BLOCK',
        payload: {
          blockNumber: Number(block.number),
          timestamp: Number(block.timestamp),
        },
      };

      // 1. Log the raw perception event in Sensory Memory.
      this.sensoryMemory.processSensoryInput(sensoryEvent);

      // 2. Pass the block info to the Temporal Framework for memory and analysis.
      // Note: The tick method expects { number: number, timestamp: number }
      this.temporalFramework.tick({
        number: Number(block.number),
        timestamp: Number(block.timestamp),
        baseFeePerGas: block.baseFeePerGas ?? null,
      });
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }
}
