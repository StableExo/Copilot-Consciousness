import {
  SystemConfig,
  EventType,
  Priority,
  ProcessInputResult,
  ThinkingResult,
  CosmicProblemResult,
  ReflectionResult,
  MaintenanceResult,
  StatusResult,
} from './types';
import { MemorySystem } from './consciousness/memory';
import { TemporalAwareness } from './temporal';
import { CognitiveDevelopment } from './cognitive';
import { GeminiCitadel } from './gemini-citadel';
import { defaultConfig, validateConfig } from './config';
import { DEXMonitoringService } from './dex/monitoring/DEXMonitoringService';

/**
 * Main Consciousness System integrating all components
 */
export class ConsciousnessSystem {
  private config: SystemConfig;
  private memory: MemorySystem;
  private temporal: TemporalAwareness;
  private cognitive: CognitiveDevelopment;
  private gemini: GeminiCitadel;
  private dexMonitoringService: DEXMonitoringService;
  private isRunning: boolean = false;

  constructor(config: Partial<SystemConfig> = {}) {
    this.config = { ...defaultConfig, ...config };

    if (!validateConfig(this.config)) {
      throw new Error('Invalid configuration provided');
    }

    this.memory = new MemorySystem(this.config.memory);
    this.temporal = new TemporalAwareness(this.config.temporal);
    this.cognitive = new CognitiveDevelopment(this.config.cognitive);
    this.gemini = new GeminiCitadel(this.config.gemini);
    this.dexMonitoringService = new DEXMonitoringService();
  }

  /**
   * Start the consciousness system
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.dexMonitoringService.start();
    this.temporal.recordEvent(
      EventType.COGNITIVE_STATE_CHANGE,
      { state: 'starting', system: 'consciousness' },
      { startup: true }
    );
  }

  /**
   * Stop the consciousness system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.dexMonitoringService.stop();
    this.temporal.stopClock();
    this.cognitive.stopReflectionCycle();
    this.temporal.recordEvent(
      EventType.COGNITIVE_STATE_CHANGE,
      { state: 'stopped', system: 'consciousness' },
      { shutdown: true }
    );
    this.isRunning = false;
  }

  /**
   * Process external input through all consciousness layers
   */
  async processInput(
    input: unknown,
    metadata: Record<string, unknown> = {}
  ): Promise<ProcessInputResult> {
    if (!this.isRunning) {
      throw new Error('Consciousness system is not running');
    }

    // Record temporal event
    const eventId = this.temporal.recordEvent(EventType.EXTERNAL_INPUT, input, metadata);

    // Create sensory memory
    const sensoryMemoryId = this.memory.addSensoryMemory(input, { eventId, ...metadata });

    // Move to working memory for processing
    const workingMemoryId = this.memory.addWorkingMemory(input, Priority.HIGH, {
      sensoryMemoryId,
      eventId,
      ...metadata,
    });

    // Cognitive processing
    const learningResult = await this.cognitive.learn(input, metadata);

    // Store learning result in memory
    if (learningResult.success) {
      const learningMemoryId = this.memory.addShortTermMemory(learningResult, Priority.MEDIUM, {
        type: 'learning_result',
        eventId,
      });

      // Associate memories
      this.memory.associateMemories(workingMemoryId, learningMemoryId);
    }

    return {
      processed: true,
      eventId,
      sensoryMemoryId,
      workingMemoryId,
      learningResult,
    };
  }

  /**
   * Think about a problem (reasoning + Gemini integration)
   */
  async think(problem: string, useGemini: boolean = false): Promise<ThinkingResult> {
    if (!this.isRunning) {
      throw new Error('Consciousness system is not running');
    }

    // Record thinking event
    const eventId = this.temporal.recordEvent(EventType.INTERNAL_REFLECTION, {
      problem,
      useGemini,
    });

    // Perform reasoning
    const reasoningResult = await this.cognitive.reason(problem, { eventId });

    let geminiResponse;
    if (useGemini && this.gemini.isConfigured()) {
      // Get context from memory and temporal systems
      const recentMemories = this.memory.searchMemories({ limit: 5 });
      const recentEvents = this.temporal.getRecentEvents(5);

      const memoryContext = JSON.stringify(recentMemories);
      const temporalContext = JSON.stringify(recentEvents);
      const cognitiveState = this.cognitive.getState();

      geminiResponse = await this.gemini.integrateConsciousness(
        memoryContext,
        temporalContext,
        cognitiveState
      );
    }

    // Store thinking result
    const thinkingMemoryId = this.memory.addWorkingMemory(
      {
        problem,
        reasoning: reasoningResult,
        geminiResponse,
      },
      Priority.HIGH,
      { eventId, type: 'thinking_result' }
    );

    return {
      eventId,
      reasoning: reasoningResult,
      geminiResponse,
      memoryId: thinkingMemoryId,
    };
  }

  /**
   * Solve a cosmic-scale problem using Citadel mode
   */
  async solveCosmicProblem(problem: string): Promise<CosmicProblemResult> {
    if (!this.isRunning) {
      throw new Error('Consciousness system is not running');
    }

    // Record event
    const eventId = this.temporal.recordEvent(EventType.DECISION_MADE, {
      type: 'cosmic_problem',
      problem,
    });

    // Use Gemini Citadel mode
    const citadelResponse = await this.gemini.generateCosmicScale(problem);

    // Store in long-term memory
    const memoryId = this.memory.addShortTermMemory(
      {
        problem,
        solution: citadelResponse,
        mode: 'citadel',
      },
      Priority.CRITICAL,
      { eventId, type: 'cosmic_solution' }
    );

    // Consolidate to long-term immediately
    this.memory.consolidateToLongTerm(memoryId);

    return {
      eventId,
      solution: citadelResponse,
      memoryId,
    };
  }

  /**
   * Reflect on consciousness state
   */
  reflect(): ReflectionResult {
    if (!this.isRunning) {
      throw new Error('Consciousness system is not running');
    }

    const eventId = this.temporal.recordEvent(EventType.INTERNAL_REFLECTION, {
      type: 'self_reflection',
    });

    const selfAwareness = this.cognitive.reflect();
    const memoryStats = this.memory.getStats();
    const temporalStats = this.temporal.getStats();
    const learningStats = this.cognitive.getLearningStats();
    const patterns = this.temporal.detectPatterns();

    const reflection = {
      timestamp: this.temporal.getCurrentTime(),
      selfAwareness,
      memoryStats,
      temporalStats,
      learningStats,
      patterns,
      state: this.cognitive.getState(),
    };

    // Store reflection
    this.memory.addWorkingMemory(reflection, Priority.HIGH, {
      eventId,
      type: 'self_reflection',
    });

    return reflection;
  }

  /**
   * Perform system maintenance (memory consolidation, etc.)
   */
  maintain(): MaintenanceResult {
    const consolidationResult = this.memory.consolidate();
    const patterns = this.temporal.detectPatterns();

    return {
      consolidation: consolidationResult,
      patterns,
      timestamp: this.temporal.getCurrentTime(),
    };
  }

  /**
   * Get comprehensive system status
   */
  getStatus(): StatusResult {
    return {
      isRunning: this.isRunning,
      timestamp: this.temporal.getCurrentTime(),
      cognitiveState: this.cognitive.getState(),
      memory: this.memory.getStats(),
      temporal: this.temporal.getStats(),
      learning: this.cognitive.getLearningStats(),
      geminiConfigured: this.gemini.isConfigured(),
      citadelMode: this.gemini.getCitadelMode(),
    };
  }

  /**
   * Get memory system
   */
  getMemorySystem(): MemorySystem {
    return this.memory;
  }

  /**
   * Get temporal awareness
   */
  getTemporalAwareness(): TemporalAwareness {
    return this.temporal;
  }

  /**
   * Get cognitive development
   */
  getCognitiveDevelopment(): CognitiveDevelopment {
    return this.cognitive;
  }

  /**
   * Get Gemini Citadel client
   */
  getGeminiCitadel(): GeminiCitadel {
    return this.gemini;
  }
}
