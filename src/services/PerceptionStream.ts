// src/services/PerceptionStream.ts

import { ethers } from 'ethers';
import { provider } from '../utils/providers'; // Note: Adjust this import path to the actual location of your exported Ethers provider
import { SensoryMemory } from '../../consciousness/sensory_memory';
import { TemporalAwarenessFramework } from '../../consciousness/temporal_awareness';

export class PerceptionStream {
  private sensoryMemory: SensoryMemory;
  private temporalFramework: TemporalAwarenessFramework;

  constructor(sensoryMemory: SensoryMemory, temporalFramework: TemporalAwarenessFramework) {
    this.sensoryMemory = sensoryMemory;
    this.temporalFramework = temporalFramework;
    console.log("PerceptionStream constructed and ready.");
  }

  public initialize() {
    console.log("Initializing blockchain event listener...");
    provider.on('block', this.handleNewBlock.bind(this));
    console.log("Listener for new blocks is active.");
  }

  private async handleNewBlock(blockNumber: number) {
    try {
      const block = await provider.getBlock(blockNumber);
      if (!block) return;

      const blockEvent = {
        type: 'NEW_BLOCK',
        payload: {
          blockNumber: block.number,
          timestamp: block.timestamp,
          baseFeePerGas: block.baseFeePerGas?.toString() || '0',
        }
      };

      // This is the moment of perception. Feed the event to the cognitive modules.
      this.sensoryMemory.processSensoryInput(blockEvent);
      this.temporalFramework.tick(block.timestamp, block.number);

    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }
}
