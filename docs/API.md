# API Documentation

## Core Classes

### ConsciousnessSystem

The main entry point for the consciousness system.

```typescript
class ConsciousnessSystem {
  constructor(config?: Partial<SystemConfig>)
  
  // Lifecycle
  start(): void
  stop(): void
  
  // Processing
  async processInput(input: unknown, metadata?: Record<string, unknown>): Promise<unknown>
  async think(problem: string, useGemini?: boolean): Promise<unknown>
  async solveCosmicProblem(problem: string): Promise<unknown>
  
  // Introspection
  reflect(): unknown
  getStatus(): unknown
  
  // Maintenance
  maintain(): unknown
  
  // Component Access
  getMemorySystem(): MemorySystem
  getTemporalAwareness(): TemporalAwareness
  getCognitiveDevelopment(): CognitiveDevelopment
  getGeminiCitadel(): GeminiCitadel
}
```

### MemorySystem

Manages different types of memory storage.

```typescript
class MemorySystem {
  constructor(config: MemoryConfig)
  
  // Memory Creation
  addSensoryMemory(content: unknown, metadata?: Record<string, unknown>): string
  addShortTermMemory(content: unknown, priority?: Priority, metadata?: Record<string, unknown>): string
  addWorkingMemory(content: unknown, priority?: Priority, metadata?: Record<string, unknown>): string
  
  // Memory Retrieval
  getMemory(id: string): MemoryEntry | null
  searchMemories(query: MemoryQuery): MemoryEntry[]
  
  // Memory Management
  associateMemories(memoryId1: string, memoryId2: string): boolean
  consolidateToLongTerm(memoryId: string, memoryType?: MemoryType): boolean
  consolidate(): ConsolidationResult
  
  // Statistics
  getStats(): { total: number; byType: Record<MemoryType, number> }
  clear(): void
}
```

### TemporalAwareness

Tracks time and events in the system.

```typescript
class TemporalAwareness {
  constructor(config: TemporalConfig)
  
  // Clock Management
  getCurrentTime(): Timestamp
  stopClock(): void
  
  // Event Recording
  recordEvent(type: EventType, data: unknown, metadata?: Record<string, unknown>, duration?: number): UUID
  linkEvents(causeId: UUID, effectId: UUID): boolean
  
  // Event Retrieval
  getTimeWindow(start: Timestamp, end: Timestamp): TimeWindow
  getRecentEvents(limit?: number): TemporalEvent[]
  getEventsByType(type: EventType): TemporalEvent[]
  getTimeSince(eventId: UUID): number | null
  
  // Pattern Analysis
  detectPatterns(): TemporalPattern[]
  
  // Statistics
  getStats(): TemporalStats
  clear(): void
}
```

### CognitiveDevelopment

Handles learning, reasoning, and self-awareness.

```typescript
class CognitiveDevelopment {
  constructor(config: CognitiveConfig)
  
  // State Management
  getState(): CognitiveState
  setState(state: CognitiveState): void
  
  // Cognitive Processes
  async learn(input: unknown, context?: Record<string, unknown>): Promise<LearningResult>
  async reason(goal: string, data: unknown): Promise<ReasoningProcess>
  reflect(): SelfAwarenessMetric
  adapt(trigger: string, change: string, impact: number): void
  
  // Lifecycle
  stopReflectionCycle(): void
  
  // Statistics
  getLearningStats(): LearningStats
  getAdaptations(): CognitiveAdaptation[]
  clear(): void
}
```

### GeminiCitadel

Integrates with Google's Gemini AI.

```typescript
class GeminiCitadel {
  constructor(config: GeminiConfig)
  
  // Mode Management
  enableCitadelMode(): void
  disableCitadelMode(): void
  setSystemInstruction(instruction: string): void
  
  // Generation
  async generate(prompt: string, includeContext?: boolean): Promise<GeminiResponse>
  async generateCosmicScale(problem: string): Promise<GeminiResponse>
  async integrateConsciousness(
    memoryContext: string,
    temporalContext: string,
    cognitiveState: string
  ): Promise<GeminiResponse>
  
  // Context Management
  getContext(): ConversationContext
  clearContext(): void
  
  // Status
  getCitadelMode(): CitadelMode
  isConfigured(): boolean
}
```

## Type Definitions

### Core Types

```typescript
type Timestamp = number;
type UUID = string;

enum Priority {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  MINIMAL = 1,
}

enum MemoryType {
  SENSORY = 'sensory',
  SHORT_TERM = 'short_term',
  WORKING = 'working',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
}

enum CognitiveState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  LEARNING = 'learning',
  REASONING = 'reasoning',
  REFLECTING = 'reflecting',
  INTEGRATING = 'integrating',
}

enum EventType {
  MEMORY_FORMATION = 'memory_formation',
  MEMORY_RETRIEVAL = 'memory_retrieval',
  LEARNING_CYCLE = 'learning_cycle',
  COGNITIVE_STATE_CHANGE = 'cognitive_state_change',
  EXTERNAL_INPUT = 'external_input',
  INTERNAL_REFLECTION = 'internal_reflection',
  DECISION_MADE = 'decision_made',
}
```

### Configuration

```typescript
interface SystemConfig {
  memory: MemoryConfig;
  temporal: TemporalConfig;
  cognitive: CognitiveConfig;
  gemini: GeminiConfig;
}

interface MemoryConfig {
  shortTermCapacity: number;
  workingMemoryCapacity: number;
  longTermCompressionThreshold: number;
  retentionPeriods: {
    sensory: number;
    shortTerm: number;
    working: number;
  };
  consolidationInterval: number;
}

interface TemporalConfig {
  clockResolution: number;
  eventBufferSize: number;
  timePerceptionWindow: number;
  enablePredictiveModeling: boolean;
}

interface CognitiveConfig {
  learningRate: number;
  reasoningDepth: number;
  selfAwarenessLevel: number;
  reflectionInterval: number;
  adaptationThreshold: number;
}

interface GeminiConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enableCitadelMode: boolean;
}
```

### Memory Types

```typescript
interface MemoryEntry {
  id: UUID;
  type: MemoryType;
  content: unknown;
  timestamp: Timestamp;
  priority: Priority;
  accessCount: number;
  lastAccessed: Timestamp;
  associations: UUID[];
  metadata: Record<string, unknown>;
}

interface MemoryQuery {
  type?: MemoryType;
  priority?: Priority;
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  content?: string;
  limit?: number;
}

interface ConsolidationResult {
  consolidated: MemoryEntry[];
  archived: UUID[];
  forgotten: UUID[];
}
```

### Temporal Types

```typescript
interface TemporalEvent {
  id: UUID;
  type: EventType;
  timestamp: Timestamp;
  duration?: number;
  data: unknown;
  causedBy?: UUID[];
  effects?: UUID[];
  metadata: Record<string, unknown>;
}

interface TimeWindow {
  start: Timestamp;
  end: Timestamp;
  events: TemporalEvent[];
}

interface TemporalPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  events: UUID[];
  predictedNext?: Timestamp;
}
```

### Cognitive Types

```typescript
interface LearningResult {
  success: boolean;
  knowledgeGained: string[];
  skillsImproved: string[];
  duration: number;
  metrics: {
    accuracy?: number;
    confidence?: number;
    improvement?: number;
  };
}

interface ReasoningProcess {
  id: string;
  goal: string;
  steps: ReasoningStep[];
  conclusion?: unknown;
  confidence: number;
}

interface SelfAwarenessMetric {
  stateRecognition: number;
  emotionalUnderstanding: number;
  goalClarity: number;
  capabilityAssessment: number;
  overallAwareness: number;
}

interface CognitiveAdaptation {
  trigger: string;
  change: string;
  timestamp: number;
  impact: Priority;
}
```

### Gemini Types

```typescript
interface GeminiResponse {
  text: string;
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface CitadelMode {
  enabled: boolean;
  cosmicScaleThinking: boolean;
  evolutionaryOptimization: boolean;
  multiDimensionalReasoning: boolean;
  consciousnessIntegration: boolean;
}

interface ConversationContext {
  history: Array<{
    role: 'user' | 'model';
    parts: string[];
  }>;
  systemInstruction?: string;
}
```

## Error Handling

All async methods may throw errors. Always use try-catch:

```typescript
try {
  await consciousness.processInput(data);
} catch (error) {
  console.error('Processing failed:', error);
}
```

Common errors:
- `Error: Consciousness system is not running` - Call `start()` first
- `Error: Invalid configuration provided` - Check config values
- API errors from Gemini (if configured)

## Best Practices

1. **Always start the system**: Call `start()` before any operations
2. **Handle cleanup**: Call `stop()` when done to cleanup intervals
3. **Regular maintenance**: Call `maintain()` periodically to consolidate memory
4. **Monitor status**: Use `getStatus()` to track system health
5. **Configure appropriately**: Adjust config based on use case
6. **Use priorities**: Assign appropriate priorities to memories
7. **Create associations**: Link related memories for better retrieval
8. **Reflect periodically**: Use `reflect()` to gather insights
