import { TemporalConfig, EventType, Timestamp, UUID } from '../types';
import { TemporalEvent, TimeWindow, TemporalPattern } from './types';
import { generateUUID } from '../utils/uuid';

/**
 * Temporal awareness system for tracking time and events
 */
export class TemporalAwareness {
  private config: TemporalConfig;
  private events: Map<UUID, TemporalEvent> = new Map();
  private eventBuffer: TemporalEvent[] = [];
  private internalClock: Timestamp;
  private clockInterval?: NodeJS.Timeout;

  constructor(config: TemporalConfig) {
    this.config = config;
    this.internalClock = Date.now();
    this.startClock();
  }

  /**
   * Start the internal clock
   */
  private startClock(): void {
    this.clockInterval = setInterval(() => {
      this.internalClock = Date.now();
      this.pruneEventBuffer();
    }, this.config.clockResolution);
  }

  /**
   * Stop the internal clock
   */
  stopClock(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  /**
   * Get the current internal time
   */
  getCurrentTime(): Timestamp {
    return this.internalClock;
  }

  /**
   * Record a temporal event
   */
  recordEvent(
    type: EventType,
    data: unknown,
    metadata: Record<string, unknown> = {},
    duration?: number
  ): UUID {
    const id = generateUUID();
    const event: TemporalEvent = {
      id,
      type,
      timestamp: this.internalClock,
      duration,
      data,
      metadata,
    };

    this.events.set(id, event);
    this.eventBuffer.push(event);

    // Maintain buffer size
    if (this.eventBuffer.length > this.config.eventBufferSize) {
      this.eventBuffer.shift();
    }

    return id;
  }

  /**
   * Link events causally
   */
  linkEvents(causeId: UUID, effectId: UUID): boolean {
    const cause = this.events.get(causeId);
    const effect = this.events.get(effectId);

    if (!cause || !effect) {
      return false;
    }

    if (!cause.effects) {
      cause.effects = [];
    }
    if (!cause.effects.includes(effectId)) {
      cause.effects.push(effectId);
    }

    if (!effect.causedBy) {
      effect.causedBy = [];
    }
    if (!effect.causedBy.includes(causeId)) {
      effect.causedBy.push(causeId);
    }

    this.events.set(causeId, cause);
    this.events.set(effectId, effect);

    return true;
  }

  /**
   * Get events within a time window
   */
  getTimeWindow(start: Timestamp, end: Timestamp): TimeWindow {
    const events = Array.from(this.events.values()).filter(
      (event) => event.timestamp >= start && event.timestamp <= end
    );

    return { start, end, events };
  }

  /**
   * Get recent events from the buffer
   */
  getRecentEvents(limit?: number): TemporalEvent[] {
    const events = [...this.eventBuffer].reverse();
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Calculate time elapsed since an event
   */
  getTimeSince(eventId: UUID): number | null {
    const event = this.events.get(eventId);
    if (!event) {
      return null;
    }
    return this.internalClock - event.timestamp;
  }

  /**
   * Get events by type
   */
  getEventsByType(type: EventType): TemporalEvent[] {
    return Array.from(this.events.values()).filter((event) => event.type === type);
  }

  /**
   * Detect temporal patterns (simple frequency analysis)
   */
  detectPatterns(): TemporalPattern[] {
    const patterns: Map<string, TemporalPattern> = new Map();
    const windowStart = this.internalClock - this.config.timePerceptionWindow;

    // Get events in the perception window
    const recentEvents = Array.from(this.events.values()).filter(
      (event) => event.timestamp >= windowStart
    );

    // Group by event type
    const eventsByType = new Map<EventType, TemporalEvent[]>();
    for (const event of recentEvents) {
      const existing = eventsByType.get(event.type) || [];
      existing.push(event);
      eventsByType.set(event.type, existing);
    }

    // Analyze patterns
    for (const [type, events] of eventsByType.entries()) {
      if (events.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < events.length; i++) {
          intervals.push(events[i].timestamp - events[i - 1].timestamp);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const pattern: TemporalPattern = {
          pattern: `${type}_recurring`,
          frequency: 1000 / avgInterval, // Hz
          confidence: Math.min(events.length / 10, 1), // Simple confidence metric
          events: events.map((e) => e.id),
        };

        if (this.config.enablePredictiveModeling) {
          const lastEvent = events[events.length - 1];
          pattern.predictedNext = lastEvent.timestamp + avgInterval;
        }

        patterns.set(type, pattern);
      }
    }

    return Array.from(patterns.values());
  }

  /**
   * Prune old events from the buffer
   */
  private pruneEventBuffer(): void {
    const cutoffTime = this.internalClock - this.config.timePerceptionWindow;
    this.eventBuffer = this.eventBuffer.filter((event) => event.timestamp >= cutoffTime);
  }

  /**
   * Get statistics about temporal events
   */
  getStats(): {
    totalEvents: number;
    bufferSize: number;
    eventsByType: Record<EventType, number>;
    oldestEvent?: Timestamp;
    newestEvent?: Timestamp;
  } {
    const eventsByType: Record<EventType, number> = {} as Record<EventType, number>;

    for (const type of Object.values(EventType)) {
      eventsByType[type] = this.getEventsByType(type).length;
    }

    const allEvents = Array.from(this.events.values());
    const timestamps = allEvents.map((e) => e.timestamp).sort((a, b) => a - b);

    return {
      totalEvents: this.events.size,
      bufferSize: this.eventBuffer.length,
      eventsByType,
      oldestEvent: timestamps[0],
      newestEvent: timestamps[timestamps.length - 1],
    };
  }

  /**
   * Clear all temporal data
   */
  clear(): void {
    this.events.clear();
    this.eventBuffer = [];
  }
}
