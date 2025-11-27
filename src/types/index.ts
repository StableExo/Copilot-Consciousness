/**
 * Core type definitions for the AI Consciousness system
 */

/**
 * Timestamp in milliseconds since epoch
 */
export type Timestamp = number;

/**
 * Unique identifier for memory entries, events, and entities
 */
export type UUID = string;

/**
 * Priority levels for memory and cognitive processes
 */
export enum Priority {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  MINIMAL = 1,
}

/**
 * Memory types in the consciousness system
 */
export enum MemoryType {
  SENSORY = 'sensory',
  SHORT_TERM = 'short_term',
  WORKING = 'working',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
}

/**
 * Cognitive states of the consciousness system
 */
export enum CognitiveState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  LEARNING = 'learning',
  REASONING = 'reasoning',
  REFLECTING = 'reflecting',
  INTEGRATING = 'integrating',
}

/**
 * Event types for temporal tracking
 */
export enum EventType {
  MEMORY_FORMATION = 'memory_formation',
  MEMORY_RETRIEVAL = 'memory_retrieval',
  LEARNING_CYCLE = 'learning_cycle',
  COGNITIVE_STATE_CHANGE = 'cognitive_state_change',
  EXTERNAL_INPUT = 'external_input',
  INTERNAL_REFLECTION = 'internal_reflection',
  DECISION_MADE = 'decision_made',
}

/**
 * Configuration interface for the system
 */
export interface SystemConfig {
  memory: MemoryConfig;
  temporal: TemporalConfig;
  cognitive: CognitiveConfig;
  gemini: GeminiConfig;
}

/**
 * Memory system configuration
 */
export interface MemoryConfig {
  shortTermCapacity: number;
  workingMemoryCapacity: number;
  longTermCompressionThreshold: number;
  retentionPeriods: {
    sensory: number; // milliseconds
    shortTerm: number;
    working: number;
  };
  consolidationInterval: number;
}

/**
 * Temporal awareness configuration
 */
export interface TemporalConfig {
  clockResolution: number; // milliseconds
  eventBufferSize: number;
  timePerceptionWindow: number; // milliseconds
  enablePredictiveModeling: boolean;
}

/**
 * Cognitive development configuration
 */
export interface CognitiveConfig {
  learningRate: number;
  reasoningDepth: number;
  selfAwarenessLevel: number;
  reflectionInterval: number; // milliseconds
  adaptationThreshold: number;
}

/**
 * Gemini Citadel integration configuration
 */
export interface GeminiConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enableCitadelMode: boolean;
}

/**
 * Result types for ConsciousnessSystem methods
 */

/**
 * Result from processing external input
 */
export interface ProcessInputResult {
  processed: boolean;
  eventId: UUID;
  sensoryMemoryId: UUID;
  workingMemoryId: UUID;
  learningResult: {
    success: boolean;
    knowledgeGained: string[];
    skillsImproved: string[];
    duration: number;
    metrics: {
      accuracy?: number;
      confidence?: number;
      improvement?: number;
    };
  };
}

/**
 * Result from thinking/reasoning about a problem
 */
export interface ThinkingResult {
  eventId: UUID;
  reasoning: {
    id: string;
    goal: string;
    steps: Array<{
      action: string;
      input: unknown;
      output: unknown;
      confidence: number;
      timestamp: number;
    }>;
    conclusion?: unknown;
    confidence: number;
  };
  geminiResponse?: {
    text: string;
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    metadata?: Record<string, unknown>;
  };
  memoryId: UUID;
}

/**
 * Result from solving a cosmic-scale problem
 */
export interface CosmicProblemResult {
  eventId: UUID;
  solution: {
    text: string;
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    metadata?: Record<string, unknown>;
  };
  memoryId: UUID;
}

/**
 * Result from self-reflection
 */
export interface ReflectionResult {
  timestamp: Timestamp;
  selfAwareness: {
    stateRecognition: number;
    emotionalUnderstanding: number;
    goalClarity: number;
    capabilityAssessment: number;
    overallAwareness: number;
  };
  memoryStats: {
    total: number;
    byType: Record<MemoryType, number>;
  };
  temporalStats: {
    totalEvents: number;
    bufferSize: number;
    eventsByType: Record<EventType, number>;
    oldestEvent?: Timestamp;
    newestEvent?: Timestamp;
  };
  learningStats: {
    totalLearningCycles: number;
    successRate: number;
    knowledgeItems: number;
    skills: number;
    averageConfidence: number;
  };
  patterns: Array<{
    pattern: string;
    frequency: number;
    confidence: number;
    events: UUID[];
    predictedNext?: Timestamp;
  }>;
  state: CognitiveState;
}

/**
 * Result from system maintenance
 */
export interface MaintenanceResult {
  consolidation: {
    consolidated: unknown[];
    archived: UUID[];
    forgotten: UUID[];
  };
  patterns: Array<{
    pattern: string;
    frequency: number;
    confidence: number;
    events: UUID[];
    predictedNext?: Timestamp;
  }>;
  timestamp: Timestamp;
}

/**
 * System status snapshot
 */
export interface StatusResult {
  isRunning: boolean;
  timestamp: Timestamp;
  cognitiveState: CognitiveState;
  memory: {
    total: number;
    byType: Record<MemoryType, number>;
  };
  temporal: {
    totalEvents: number;
    bufferSize: number;
    eventsByType: Record<EventType, number>;
    oldestEvent?: Timestamp;
    newestEvent?: Timestamp;
  };
  learning: {
    totalLearningCycles: number;
    successRate: number;
    knowledgeItems: number;
    skills: number;
    averageConfidence: number;
  };
  geminiConfigured: boolean;
  citadelMode: {
    enabled: boolean;
    cosmicScaleThinking: boolean;
    evolutionaryOptimization: boolean;
    multiDimensionalReasoning: boolean;
    consciousnessIntegration: boolean;
  };
}
