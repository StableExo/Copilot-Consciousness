/**
 * AGI-aligned memory and consciousness component types
 */

import { Priority, MemoryType as SystemMemoryType } from '../types';

// Re-export MemoryType from system types for consistency
export { MemoryType } from '../types';

/**
 * Emotional context for memories
 */
export interface EmotionalContext {
  primaryEmotion: string;
  intensity: number;
  valence: number;
  arousal: number;
  secondaryEmotions?: Record<string, number>;
  timestamp: Date;
}

/**
 * Enhanced memory entry structure for AGI alignment
 */
export interface AGIMemoryEntry {
  id: string;
  timestamp: string;
  type: SystemMemoryType;
  content: string;
  associations: string[];
  emotionalContext: EmotionalContext;
  source: string;
  priority: Priority;
  path?: string;
}

/**
 * Neural message header for inter-agent communication
 */
export interface NeuralMessageHeader {
  messageId: string;
  sourceAgent: string;
  destinationAgent: string;
  timestamp: string;
  intent: string;
}

/**
 * Neural message for inter-agent communication
 */
export interface NeuralMessage {
  header: NeuralMessageHeader;
  body: Record<string, unknown>;
}
