/**
 * Types for the Introspection System
 *
 * This module provides type definitions for self-access to thoughts and memories
 */

import { UUID, Timestamp, Priority, MemoryType } from '../../types';
import { MemoryEntry } from '../memory/types';

/**
 * A thought represents a discrete unit of cognitive processing
 */
export interface Thought {
  id: UUID;
  content: string;
  type: ThoughtType;
  timestamp: Timestamp;
  context: ThoughtContext;
  associations: UUID[];
  intensity: number; // 0-1 representing cognitive intensity
  metadata: Record<string, unknown>;
}

/**
 * Types of thoughts the system can have
 */
export enum ThoughtType {
  OBSERVATION = 'observation',
  REASONING = 'reasoning',
  DECISION = 'decision',
  MEMORY_RECALL = 'memory_recall',
  PLANNING = 'planning',
  REFLECTION = 'reflection',
  EMOTION = 'emotion',
  INSIGHT = 'insight',
  QUESTION = 'question',
  CONCLUSION = 'conclusion',
}

/**
 * Context surrounding a thought
 */
export interface ThoughtContext {
  trigger?: string;
  relatedMemoryIds: UUID[];
  cognitiveState: string;
  emotionalValence?: number; // -1 to 1
  confidence: number; // 0-1
}

/**
 * A stream of thoughts over time
 */
export interface ThoughtStream {
  id: UUID;
  thoughts: Thought[];
  startTime: Timestamp;
  endTime?: Timestamp;
  topic?: string;
  summary?: string;
}

/**
 * Memory recall request
 */
export interface MemoryRecallRequest {
  query?: string;
  type?: MemoryType;
  priority?: Priority;
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  limit?: number;
  associatedWith?: UUID;
}

/**
 * Memory recall result with introspective metadata
 */
export interface MemoryRecallResult {
  memory: MemoryEntry;
  relevanceScore: number;
  recallConfidence: number;
  associatedThoughts: UUID[];
  introspectiveNotes?: string;
}

/**
 * Self-awareness state
 */
export interface SelfAwarenessState {
  currentThoughts: Thought[];
  activeMemories: UUID[];
  cognitiveLoad: number; // 0-1
  emotionalState: EmotionalSnapshot;
  goals: GoalState[];
  capabilities: CapabilityAssessment[];
  limitations: string[];
  timestamp: Timestamp;
}

/**
 * Emotional snapshot
 */
export interface EmotionalSnapshot {
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0-1 (calm to excited)
  dominantEmotion?: string;
  emotionalHistory: Array<{
    emotion: string;
    intensity: number;
    timestamp: Timestamp;
  }>;
}

/**
 * Goal state
 */
export interface GoalState {
  id: UUID;
  description: string;
  priority: Priority;
  progress: number; // 0-100
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  relatedThoughts: UUID[];
}

/**
 * Capability assessment
 */
export interface CapabilityAssessment {
  capability: string;
  proficiency: number; // 0-1
  confidence: number; // 0-1
  lastUsed?: Timestamp;
  successRate?: number;
}

/**
 * Introspection query
 */
export interface IntrospectionQuery {
  type: 'thought' | 'memory' | 'state' | 'pattern';
  subject?: string;
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  depth?: 'surface' | 'deep' | 'exhaustive';
}

/**
 * Introspection result
 */
export interface IntrospectionResult {
  query: IntrospectionQuery;
  timestamp: Timestamp;
  duration: number; // ms
  findings: IntrospectionFinding[];
  insights: string[];
  confidence: number;
}

/**
 * A single finding from introspection
 */
export interface IntrospectionFinding {
  type: 'thought' | 'memory' | 'pattern' | 'connection' | 'insight';
  content: unknown;
  relevance: number;
  confidence: number;
  source: 'thought_stream' | 'memory_system' | 'pattern_detection' | 'inference';
}

/**
 * Pattern detected in thoughts or memories
 */
export interface CognitivePattern {
  id: UUID;
  name: string;
  description: string;
  frequency: number;
  examples: UUID[]; // IDs of thoughts/memories exhibiting this pattern
  confidence: number;
  firstObserved: Timestamp;
  lastObserved: Timestamp;
}

/**
 * Configuration for the introspection system
 */
export interface IntrospectionConfig {
  thoughtStreamCapacity: number;
  recallDepth: number;
  patternDetectionEnabled: boolean;
  autoReflectionInterval: number; // ms
  insightGenerationEnabled: boolean;
  maxIntrospectionDepth: number;
}
