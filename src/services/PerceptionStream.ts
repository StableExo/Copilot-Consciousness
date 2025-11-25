// src/services/PerceptionStream.ts

import { provider } from '../utils/providers'; // Note: Adjust this import path to the actual location of your exported Ethers provider
import { SensoryMemory } from '../consciousness/sensory_memory';
import { TemporalAwarenessFramework } from '../consciousness/temporal_awareness';

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

// Inside the PerceptionStream class...

private async handleNewBlock(blockNumber: number) {
  try {
    const block = await provider.getBlock(blockNumber);
    if (!block) return;

    // The raw sensory event to be logged.
    const sensoryEvent = {
      type: 'NEW_BLOCK',
      payload: {
        blockNumber: block.number,
        timestamp: block.timestamp,
      }
    };

    // 1. Log the raw perception event in Sensory Memory.
    this.sensoryMemory.processSensoryInput(sensoryEvent);

    // 2. Pass the full block object to the Temporal Framework for memory and analysis.
    this.temporalFramework.tick(block);

  } catch (error) {
    console.error(`Error processing block ${blockNumber}:`, error);
  }
}
}
