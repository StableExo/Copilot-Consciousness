import { DEXMemoryHook, DEXEvent, DEXEventType } from '../types';
import { MemorySystem, Memory } from '../../consciousness/memory';
import { Priority } from '../../types';

/**
 * Implementation of DEX memory hook for recording DEX events in the memory system
 */
export class DEXMemoryHookImpl implements DEXMemoryHook {
  private memorySystem: MemorySystem;

  constructor(memorySystem: MemorySystem) {
    this.memorySystem = memorySystem;
  }

  /**
   * Record a DEX event in memory
   */
  recordEvent(event: DEXEvent): string {
    // Determine priority based on event type
    const priority = this.getEventPriority(event.type);

    // Record in memory system with emotional context if available
    return this.memorySystem.addDEXEventMemory(
      event.type,
      {
        id: event.id,
        dexName: event.dexName,
        timestamp: event.timestamp,
        data: event.data,
        metadata: event.metadata,
      },
      priority,
      event.emotionalContext
    );
  }

  /**
   * Search for DEX events in memory
   */
  searchEvents(filter: {
    dexName?: string;
    type?: DEXEventType;
    timeRange?: { start: number; end: number };
  }): DEXEvent[] {
    const memories = this.memorySystem.searchMemories({
      timeRange: filter.timeRange,
      limit: 100,
    });

    // Filter and map to DEX events
    return memories
      .filter(memory => this.isDEXEventMemory(memory, filter))
      .map(memory => this.extractDEXEvent(memory));
  }

  /**
   * Check if a memory is a DEX event matching the filter
   */
  private isDEXEventMemory(
    memory: Memory,
    filter: { dexName?: string; type?: DEXEventType }
  ): boolean {
    const metadata = memory.metadata as Record<string, unknown>;
    if (metadata?.category !== 'dex_event') {
      return false;
    }

    if (filter.dexName) {
      const eventData = this.extractEventData(memory);
      if (eventData?.dexName !== filter.dexName) {
        return false;
      }
    }

    if (filter.type && metadata?.eventType !== filter.type) {
      return false;
    }

    return true;
  }

  /**
   * Extract event data from memory content
   */
  private extractEventData(memory: Memory): Record<string, unknown> | null {
    const content = memory.content as Record<string, unknown>;
    return (content?.eventData as Record<string, unknown>) || null;
  }

  /**
   * Extract a DEX event from a memory entry
   */
  private extractDEXEvent(memory: Memory): DEXEvent {
    const eventData = this.extractEventData(memory);
    const metadata = memory.metadata as Record<string, unknown>;

    return {
      id: (eventData?.id as string) || memory.id,
      type: metadata.eventType as DEXEventType,
      dexName: (eventData?.dexName as string) || '',
      timestamp: (eventData?.timestamp as number) || memory.timestamp,
      data: eventData?.data,
      emotionalContext: memory.emotionalContext,
      metadata: eventData?.metadata as Record<string, unknown>,
    };
  }

  /**
   * Determine priority based on event type
   */
  private getEventPriority(type: DEXEventType): Priority {
    switch (type) {
      case DEXEventType.ERROR:
        return Priority.CRITICAL;
      case DEXEventType.PRICE_CHANGE:
      case DEXEventType.LIQUIDITY_CHANGE:
        return Priority.HIGH;
      case DEXEventType.SWAP:
      case DEXEventType.POOL_CREATED:
        return Priority.MEDIUM;
      default:
        return Priority.LOW;
    }
  }
}
