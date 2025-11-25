import { RPCProvider } from '../infrastructure/RPCProvider';
import { MemorySystem } from '../consciousness/memory';
import { TemporalAwareness } from '../temporal';
import { EventType } from '../types';

export class BlockchainPerceptionStream {
  private rpcProvider: RPCProvider;
  private memorySystem: MemorySystem;
  private temporalAwareness: TemporalAwareness;

  constructor(rpcProvider: RPCProvider, memorySystem: MemorySystem, temporalAwareness: TemporalAwareness) {
    this.rpcProvider = rpcProvider;
    this.memorySystem = memorySystem;
    this.temporalAwareness = temporalAwareness;
  }

  public startListening() {
    this.rpcProvider.getProvider().on('block', async (blockNumber) => {
      const block = await this.rpcProvider.getProvider().getBlock(blockNumber);
      if (!block) return;
      
      const logData = {
        eventType: 'NEW_BLOCK',
        blockNumber: block.number,
        timestamp: block.timestamp,
      };
      console.log(JSON.stringify(logData));

      this.temporalAwareness.recordEvent('NEW_BLOCK' as any, { blockNumber });
      this.memorySystem.addSensoryMemory({
        type: 'NEW_BLOCK',
        blockNumber,
      });
      this.pollPriceData(blockNumber);
    });
  }

  private pollPriceData(blockNumber: number) {
    // TODO: Implement Chainlink price polling
    const price = 2500.50; // mock price
    const logData = {
      eventType: 'PRICE_UPDATE',
      pair: 'ETH/USD',
      price: price.toFixed(2),
      blockNumber: blockNumber,
    };
    console.log(JSON.stringify(logData));

    this.memorySystem.addSensoryMemory({
      type: 'PRICE_UPDATE',
      pair: 'ETH/USD',
      price,
      blockNumber,
    });
  }
}
