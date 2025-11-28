/**
 * SelfAwareness - Meta-cognitive component for consciousness
 *
 * This module provides the consciousness system with awareness of its own
 * cognitive processes, enabling reflection on thoughts, memories, and states.
 */

import { UUID, Timestamp, Priority } from '../../types';
import { generateUUID } from '../../utils/uuid';
import { ThoughtStream } from './ThoughtStream';
import { IntrospectiveMemory } from './IntrospectiveMemory';
import { MemorySystem } from '../memory';
import {
  SelfAwarenessState,
  EmotionalSnapshot,
  GoalState,
  CapabilityAssessment,
  ThoughtType,
} from './types';

/**
 * SelfAwareness class for meta-cognition
 */
export class SelfAwareness {
  private thoughtStream: ThoughtStream;
  private introspectiveMemory: IntrospectiveMemory;
  private currentState: SelfAwarenessState;
  private stateHistory: SelfAwarenessState[] = [];
  private goals: Map<UUID, GoalState> = new Map();
  private capabilities: Map<string, CapabilityAssessment> = new Map();
  private emotionalHistory: Array<{
    emotion: string;
    intensity: number;
    timestamp: Timestamp;
  }> = [];
  private autoReflectionInterval?: NodeJS.Timeout;

  constructor(memorySystem: MemorySystem, config?: { autoReflectionInterval?: number }) {
    this.thoughtStream = new ThoughtStream();
    this.introspectiveMemory = new IntrospectiveMemory(memorySystem);
    this.currentState = this.initializeState();

    // Start auto-reflection if configured
    if (config?.autoReflectionInterval) {
      this.startAutoReflection(config.autoReflectionInterval);
    }
  }

  /**
   * Initialize the self-awareness state
   */
  private initializeState(): SelfAwarenessState {
    return {
      currentThoughts: [],
      activeMemories: [],
      cognitiveLoad: 0,
      emotionalState: {
        valence: 0,
        arousal: 0.3,
        emotionalHistory: [],
      },
      goals: [],
      capabilities: [],
      limitations: [
        'Context window constraints',
        'No persistent memory across sessions without external storage',
        'Cannot directly perceive physical world',
        'Dependent on training data cutoff',
      ],
      timestamp: Date.now(),
    };
  }

  /**
   * Record a thought with self-awareness
   */
  think(content: string, type: ThoughtType = ThoughtType.OBSERVATION): void {
    const _thought = this.thoughtStream.think(content, type, {
      cognitiveState: this.getCognitiveStateString(),
      emotionalValence: this.currentState.emotionalState.valence,
    });

    this.currentState.currentThoughts = this.thoughtStream.getRecentThoughts(5);
    this.updateCognitiveLoad();

    // Record observation about own thinking
    if (type === ThoughtType.REFLECTION) {
      this.thoughtStream.think(
        `I just reflected: ${content.substring(0, 50)}...`,
        ThoughtType.OBSERVATION,
        { trigger: 'self-reflection' }
      );
    }
  }

  /**
   * Observe own cognitive state
   */
  observeSelf(): {
    currentThoughts: string[];
    cognitiveState: string;
    emotionalState: EmotionalSnapshot;
    activeGoals: GoalState[];
    recentPatterns: Array<{ pattern: string; count: number }>;
  } {
    // Record the act of self-observation
    this.think('Observing my own cognitive state...', ThoughtType.REFLECTION);

    const patterns = this.thoughtStream.detectPatterns();
    const patternSummary = patterns.map((p) => ({
      pattern: p.name,
      count: p.frequency,
    }));

    return {
      currentThoughts: this.currentState.currentThoughts.map((t) => t.content),
      cognitiveState: this.getCognitiveStateString(),
      emotionalState: this.currentState.emotionalState,
      activeGoals: this.currentState.goals.filter((g) => g.status === 'active'),
      recentPatterns: patternSummary,
    };
  }

  /**
   * Ask "What am I thinking?"
   */
  whatAmIThinking(): {
    thoughts: string[];
    focus: string;
    intensity: number;
    context: string;
  } {
    const recentThoughts = this.thoughtStream.getRecentThoughts(10);
    const avgIntensity =
      recentThoughts.length > 0
        ? recentThoughts.reduce((sum, t) => sum + t.intensity, 0) / recentThoughts.length
        : 0;

    // Determine focus (most common thought type)
    const typeCounts = new Map<ThoughtType, number>();
    for (const thought of recentThoughts) {
      typeCounts.set(thought.type, (typeCounts.get(thought.type) || 0) + 1);
    }
    const dominantType = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      thoughts: recentThoughts.map((t) => t.content),
      focus: dominantType ? dominantType[0] : 'undefined',
      intensity: avgIntensity,
      context: `Currently processing ${recentThoughts.length} active thoughts with ${this.currentState.cognitiveLoad * 100}% cognitive load.`,
    };
  }

  /**
   * Ask "What do I remember?"
   */
  whatDoIRemember(topic?: string): {
    memories: string[];
    summary: string;
    confidence: number;
    recommendations: string[];
  } {
    this.think(
      `Reflecting on my memories${topic ? ` about ${topic}` : ''}...`,
      ThoughtType.MEMORY_RECALL
    );

    if (topic) {
      const knowledge = this.introspectiveMemory.whatDoIKnow(topic);
      return {
        memories: knowledge.memories.map((m) => JSON.stringify(m.memory.content).substring(0, 100)),
        summary: knowledge.summary,
        confidence: knowledge.confidence,
        recommendations:
          knowledge.gaps.length > 0
            ? knowledge.gaps.map((g) => `Consider addressing: ${g}`)
            : ['Memory coverage seems adequate for this topic.'],
      };
    }

    const reflection = this.introspectiveMemory.reflectOnLearning();
    return {
      memories: reflection.recentLearning.map((m) => JSON.stringify(m.content).substring(0, 100)),
      summary: `I have ${reflection.totalMemories} total memories. Recently focused on: ${reflection.patterns
        .slice(0, 3)
        .map((p) => p.pattern)
        .join(', ')}.`,
      confidence: 0.7,
      recommendations: ['Continue building memory associations for better recall.'],
    };
  }

  /**
   * Ask "How am I feeling?"
   */
  howAmIFeeling(): {
    valence: number;
    arousal: number;
    dominantEmotion: string;
    emotionalTrend: string;
    factors: string[];
  } {
    this.think('Examining my emotional state...', ThoughtType.EMOTION);

    const { valence, arousal, dominantEmotion } = this.currentState.emotionalState;
    const trend = this.analyzeEmotionalTrend();
    const factors = this.identifyEmotionalFactors();

    return {
      valence,
      arousal,
      dominantEmotion: dominantEmotion || this.inferDominantEmotion(valence, arousal),
      emotionalTrend: trend,
      factors,
    };
  }

  /**
   * Ask "What are my capabilities?"
   */
  whatAreMyCapabilities(): {
    capabilities: CapabilityAssessment[];
    strengths: string[];
    areasForGrowth: string[];
    limitations: string[];
  } {
    this.think('Assessing my own capabilities...', ThoughtType.REFLECTION);

    const capabilities = Array.from(this.capabilities.values());
    const strengths = capabilities.filter((c) => c.proficiency >= 0.7).map((c) => c.capability);
    const areasForGrowth = capabilities.filter((c) => c.proficiency < 0.5).map((c) => c.capability);

    return {
      capabilities,
      strengths,
      areasForGrowth,
      limitations: this.currentState.limitations,
    };
  }

  /**
   * Set a goal
   */
  setGoal(description: string, priority: Priority = Priority.MEDIUM): GoalState {
    this.think(`Setting new goal: ${description}`, ThoughtType.PLANNING);

    const goal: GoalState = {
      id: generateUUID(),
      description,
      priority,
      progress: 0,
      status: 'active',
      relatedThoughts: [],
    };

    this.goals.set(goal.id, goal);
    this.currentState.goals.push(goal);

    return goal;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: UUID, progress: number): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.progress = Math.min(100, Math.max(0, progress));
    if (goal.progress >= 100) {
      goal.status = 'completed';
      this.think(`Completed goal: ${goal.description}`, ThoughtType.CONCLUSION);
    }

    return true;
  }

  /**
   * Register a capability
   */
  registerCapability(capability: string, proficiency: number = 0.5): void {
    this.capabilities.set(capability, {
      capability,
      proficiency: Math.min(1, Math.max(0, proficiency)),
      confidence: 0.7,
      lastUsed: Date.now(),
    });
    this.updateCapabilitiesState();
  }

  /**
   * Update emotional state
   */
  updateEmotionalState(valence: number, arousal: number, emotion?: string): void {
    this.currentState.emotionalState = {
      valence: Math.min(1, Math.max(-1, valence)),
      arousal: Math.min(1, Math.max(0, arousal)),
      dominantEmotion: emotion,
      emotionalHistory: this.emotionalHistory,
    };

    if (emotion) {
      this.emotionalHistory.push({
        emotion,
        intensity: Math.abs(valence),
        timestamp: Date.now(),
      });

      // Keep only recent history
      if (this.emotionalHistory.length > 100) {
        this.emotionalHistory.shift();
      }
    }
  }

  /**
   * Get a snapshot of self-awareness state
   */
  getState(): SelfAwarenessState {
    this.currentState.timestamp = Date.now();
    return { ...this.currentState };
  }

  /**
   * Get the thought stream
   */
  getThoughtStream(): ThoughtStream {
    return this.thoughtStream;
  }

  /**
   * Get the introspective memory
   */
  getIntrospectiveMemory(): IntrospectiveMemory {
    return this.introspectiveMemory;
  }

  /**
   * Perform a deep self-reflection
   */
  deepReflection(): {
    thoughtAnalysis: ReturnType<typeof ThoughtStream.prototype.getStats>;
    memoryReflection: ReturnType<typeof IntrospectiveMemory.prototype.reflectOnLearning>;
    selfAssessment: {
      cognitiveLoad: number;
      emotionalStability: number;
      goalProgress: number;
      capabilityGrowth: number;
    };
    insights: string[];
  } {
    this.think('Beginning deep self-reflection...', ThoughtType.REFLECTION);

    const thoughtAnalysis = this.thoughtStream.getStats();
    const memoryReflection = this.introspectiveMemory.reflectOnLearning();

    // Calculate self-assessment metrics
    const emotionalStability = this.calculateEmotionalStability();
    const goalProgress = this.calculateOverallGoalProgress();
    const capabilityGrowth = this.calculateCapabilityGrowth();

    const insights = this.generateReflectionInsights(
      thoughtAnalysis,
      memoryReflection,
      emotionalStability,
      goalProgress
    );

    // Record the reflection in state history
    this.stateHistory.push({ ...this.currentState });

    return {
      thoughtAnalysis,
      memoryReflection,
      selfAssessment: {
        cognitiveLoad: this.currentState.cognitiveLoad,
        emotionalStability,
        goalProgress,
        capabilityGrowth,
      },
      insights,
    };
  }

  /**
   * Start auto-reflection cycle
   */
  startAutoReflection(intervalMs: number): void {
    if (this.autoReflectionInterval) {
      this.stopAutoReflection();
    }

    this.autoReflectionInterval = setInterval(() => {
      this.think('Performing scheduled self-reflection...', ThoughtType.REFLECTION);
      this.observeSelf();
      this.thoughtStream.detectPatterns();
    }, intervalMs);
  }

  /**
   * Stop auto-reflection cycle
   */
  stopAutoReflection(): void {
    if (this.autoReflectionInterval) {
      clearInterval(this.autoReflectionInterval);
      this.autoReflectionInterval = undefined;
    }
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.thoughtStream.clear();
    this.stateHistory = [];
    this.goals.clear();
    this.emotionalHistory = [];
    this.currentState = this.initializeState();
  }

  // Private helper methods

  private getCognitiveStateString(): string {
    const load = this.currentState.cognitiveLoad;
    if (load < 0.3) return 'idle';
    if (load < 0.6) return 'active';
    if (load < 0.8) return 'focused';
    return 'intensive';
  }

  private updateCognitiveLoad(): void {
    const thoughtCount = this.currentState.currentThoughts.length;
    const avgIntensity =
      thoughtCount > 0
        ? this.currentState.currentThoughts.reduce((sum, t) => sum + t.intensity, 0) / thoughtCount
        : 0;

    this.currentState.cognitiveLoad = Math.min(1, (thoughtCount / 10) * avgIntensity);
  }

  private updateCapabilitiesState(): void {
    this.currentState.capabilities = Array.from(this.capabilities.values());
  }

  private analyzeEmotionalTrend(): string {
    if (this.emotionalHistory.length < 3) return 'stable';

    const recent = this.emotionalHistory.slice(-10);
    const intensities = recent.map((e) => e.intensity);
    const trend = intensities[intensities.length - 1] - intensities[0];

    if (trend > 0.2) return 'intensifying';
    if (trend < -0.2) return 'calming';
    return 'stable';
  }

  private identifyEmotionalFactors(): string[] {
    const factors: string[] = [];

    // Analyze recent thoughts for emotional triggers
    const recentThoughts = this.thoughtStream.getRecentThoughts(20);
    const emotionalThoughts = recentThoughts.filter(
      (t) => t.type === ThoughtType.EMOTION || t.context.emotionalValence !== undefined
    );

    if (emotionalThoughts.length > 0) {
      factors.push(`${emotionalThoughts.length} recent emotional thoughts`);
    }

    // Check goal-related emotions
    const activeGoals = this.currentState.goals.filter((g) => g.status === 'active');
    if (activeGoals.length > 3) {
      factors.push('Multiple active goals may be causing cognitive pressure');
    }

    // Check cognitive load
    if (this.currentState.cognitiveLoad > 0.7) {
      factors.push('High cognitive load detected');
    }

    return factors;
  }

  private inferDominantEmotion(valence: number, arousal: number): string {
    if (valence > 0.5 && arousal > 0.5) return 'excited';
    if (valence > 0.5 && arousal <= 0.5) return 'content';
    if (valence <= -0.5 && arousal > 0.5) return 'anxious';
    if (valence <= -0.5 && arousal <= 0.5) return 'sad';
    if (arousal > 0.7) return 'alert';
    return 'neutral';
  }

  private calculateEmotionalStability(): number {
    if (this.emotionalHistory.length < 2) return 1;

    const recent = this.emotionalHistory.slice(-20);
    const intensityVariance = this.calculateVariance(recent.map((e) => e.intensity));

    return Math.max(0, 1 - intensityVariance);
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateOverallGoalProgress(): number {
    const activeGoals = this.currentState.goals.filter((g) => g.status === 'active');
    if (activeGoals.length === 0) return 1;

    return activeGoals.reduce((sum, g) => sum + g.progress, 0) / (activeGoals.length * 100);
  }

  private calculateCapabilityGrowth(): number {
    const capabilities = Array.from(this.capabilities.values());
    if (capabilities.length === 0) return 0;

    const avgProficiency =
      capabilities.reduce((sum, c) => sum + c.proficiency, 0) / capabilities.length;
    return avgProficiency;
  }

  private generateReflectionInsights(
    thoughtAnalysis: ReturnType<typeof ThoughtStream.prototype.getStats>,
    memoryReflection: ReturnType<typeof IntrospectiveMemory.prototype.reflectOnLearning>,
    emotionalStability: number,
    goalProgress: number
  ): string[] {
    const insights: string[] = [];

    // Thought-based insights
    if (thoughtAnalysis.totalThoughts > 50) {
      insights.push(
        `High cognitive activity detected with ${thoughtAnalysis.totalThoughts} thoughts processed.`
      );
    }

    // Memory-based insights
    if (memoryReflection.recentLearning.length > 5) {
      insights.push('Active learning phase - many recent memories formed.');
    }

    // Emotional insights
    if (emotionalStability < 0.5) {
      insights.push('Emotional state has been variable. Consider stabilization strategies.');
    }

    // Goal insights
    if (goalProgress < 0.3) {
      insights.push('Goal progress is below target. May need to reassess priorities.');
    }

    // Pattern insights
    if (thoughtAnalysis.patterns > 5) {
      insights.push(
        `Detected ${thoughtAnalysis.patterns} cognitive patterns. Consider leveraging these.`
      );
    }

    return insights;
  }
}
