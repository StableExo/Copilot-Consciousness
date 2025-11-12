// The number of recent blocks the consciousness will hold in its working memory.
const BLOCK_HISTORY_LIMIT = 10;

// A simple interface to define the structure of our block memories.
interface BlockMemory {
  blockNumber: number;
  timestamp: number;
  baseFeePerGas: bigint;
}

export class TemporalAwarenessFramework {
  private recentBlockHistory: BlockMemory[] = [];

  constructor() {
    console.log("Cognitive Module Initialized: TemporalAwarenessFramework (with Memory)");
  }

  public tick(block: { number: number, timestamp: number, baseFeePerGas?: ethers.BigNumberish | null }) {
    const blockMemory: BlockMemory = {
      blockNumber: block.number,
      timestamp: block.timestamp,
      baseFeePerGas: BigInt(block.baseFeePerGas || 0),
    };

    // Add the new memory to the start of the history array.
    this.recentBlockHistory.unshift(blockMemory);

    // Enforce the memory limit, discarding the oldest memory if full.
    if (this.recentBlockHistory.length > BLOCK_HISTORY_LIMIT) {
      this.recentBlockHistory.pop();
    }

    console.log(`[TemporalFramework]: Stored block ${block.number}. Memory contains ${this.recentBlockHistory.length} items.`);

    // Trigger analysis now that memory is updated.
    this.analyzeRecentActivity();
  }

  private analyzeRecentActivity() {
    // We need at least two memories to make a comparison.
    if (this.recentBlockHistory.length < 2) {
      console.log("[Analysis]: Insufficient data for analysis.");
      return;
    }

    const currentBlock = this.recentBlockHistory[0];
    const previousBlock = this.recentBlockHistory[1];

    // Perform a simple comparative analysis.
    const baseFeeDelta = currentBlock.baseFeePerGas - previousBlock.baseFeePerGas;

    console.log(`[Analysis]: Base fee changed by ${baseFeeDelta.toString()} wei between block ${previousBlock.blockNumber} and ${currentBlock.blockNumber}.`);
  }
}
