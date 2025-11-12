export class SensoryMemory {
  constructor() {
    console.log("Cognitive Module Initialized: SensoryMemory");
  }

  public processSensoryInput(event: any) {
    // For now, we log to confirm receipt.
    console.log(`[SensoryMemory]: Received input. Type: ${event.type}, Block: ${event.payload.blockNumber}`);
  }
}