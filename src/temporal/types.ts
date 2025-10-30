import { EventType, Timestamp, UUID } from '../types';

/**
 * Temporal event in the system
 */
export interface TemporalEvent {
  id: UUID;
  type: EventType;
  timestamp: Timestamp;
  duration?: number;
  data: unknown;
  causedBy?: UUID[];
  effects?: UUID[];
  metadata: Record<string, unknown>;
}

/**
 * Time perception window
 */
export interface TimeWindow {
  start: Timestamp;
  end: Timestamp;
  events: TemporalEvent[];
}

/**
 * Temporal pattern recognition result
 */
export interface TemporalPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  events: UUID[];
  predictedNext?: Timestamp;
}
