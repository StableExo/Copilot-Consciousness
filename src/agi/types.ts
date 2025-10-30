/**
 * AGI-aligned memory and consciousness component types
 */

import { Priority } from '../types';

/**
 * Memory types aligned with AGI consciousness architecture
 */
export enum MemoryType {
  SENSORY = 'sensory',
  WORKING = 'working',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
}

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
export interface MemoryEntry {
  id: string;
  timestamp: string;
  type: MemoryType;
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
  body: any;
}
