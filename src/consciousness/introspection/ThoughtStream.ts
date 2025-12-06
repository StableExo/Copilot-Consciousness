/**
 * ThoughtStream - Captures and provides access to the AI's internal thought processes
 *
 * This module enables the consciousness system to observe and access its own thoughts,
 * providing a mechanism for self-reflection and metacognition.
 */

import { generateUUID } from '../../utils/uuid';
import {
  Thought,
  ThoughtType,
  ThoughtContext,
  ThoughtStream as ThoughtStreamType,
  CognitivePattern,
} from './types';
import { UUID, Timestamp } from '../../types';

/**
 * ThoughtStream class for capturing and managing thoughts
 */
export class ThoughtStream {
  private thoughts: Map<UUID, Thought> = new Map();
  private thoughtBuffer: Thought[] = [];
  private streams: Map<UUID, ThoughtStreamType> = new Map();
  private patterns: Map<UUID, CognitivePattern> = new Map();
  private capacity: number;
  private currentStreamId: UUID | null = null;

  constructor(capacity: number = 1000) {
    this.capacity = capacity;
  }

  /**
   * Record a new thought
   */
  think(
    content: string,
    type: ThoughtType,
    contextOrMetadata: Partial<ThoughtContext> & Record<string, any> = {}
  ): Thought {
    // Separate ThoughtContext properties from additional metadata
    const {
      relatedMemoryIds,
      cognitiveState,
      confidence,
      trigger,
      emotionalValence,
      ...additionalMetadata
    } = contextOrMetadata;

    const thought: Thought = {
      id: generateUUID(),
      content,
      type,
      timestamp: Date.now(),
      context: {
        relatedMemoryIds: relatedMemoryIds || [],
        cognitiveState: cognitiveState || 'active',
        confidence: confidence ?? 0.8,
        trigger,
        emotionalValence,
      },
      associations: [],
      intensity: this.calculateIntensity(type, content),
      metadata: additionalMetadata,
    };

    this.addThought(thought);
    return thought;
  }

  /**
   * Add a thought to the stream
   */
  private addThought(thought: Thought): void {
    this.thoughts.set(thought.id, thought);
    this.thoughtBuffer.push(thought);

    // Maintain capacity
    if (this.thoughtBuffer.length > this.capacity) {
      const removed = this.thoughtBuffer.shift();
      if (removed) {
        this.thoughts.delete(removed.id);
      }
    }

    // Add to current stream if one is active
    if (this.currentStreamId) {
      const stream = this.streams.get(this.currentStreamId);
      if (stream) {
        stream.thoughts.push(thought);
      }
    }
  }

  /**
   * Get recent thoughts
   */
  getRecentThoughts(limit: number = 10): Thought[] {
    return [...this.thoughtBuffer].reverse().slice(0, limit);
  }

  /**
   * Get thoughts by type
   */
  getThoughtsByType(type: ThoughtType): Thought[] {
    return this.thoughtBuffer.filter((t) => t.type === type);
  }

  /**
   * Get thoughts in a time range
   */
  getThoughtsInTimeRange(start: Timestamp, end: Timestamp): Thought[] {
    return this.thoughtBuffer.filter((t) => t.timestamp >= start && t.timestamp <= end);
  }

  /**
   * Search thoughts by content
   */
  searchThoughts(query: string): Thought[] {
    const queryLower = query.toLowerCase();
    return this.thoughtBuffer.filter((t) => t.content.toLowerCase().includes(queryLower));
  }

  /**
   * Get a specific thought by ID
   */
  getThought(id: UUID): Thought | null {
    return this.thoughts.get(id) || null;
  }

  /**
   * Associate two thoughts
   */
  associateThoughts(thoughtId1: UUID, thoughtId2: UUID): boolean {
    const thought1 = this.thoughts.get(thoughtId1);
    const thought2 = this.thoughts.get(thoughtId2);

    if (!thought1 || !thought2) {
      return false;
    }

    if (!thought1.associations.includes(thoughtId2)) {
      thought1.associations.push(thoughtId2);
    }
    if (!thought2.associations.includes(thoughtId1)) {
      thought2.associations.push(thoughtId1);
    }

    return true;
  }

  /**
   * Start a new thought stream (focused thinking session)
   */
  startStream(topic?: string): UUID {
    const stream: ThoughtStreamType = {
      id: generateUUID(),
      thoughts: [],
      startTime: Date.now(),
      topic,
    };

    this.streams.set(stream.id, stream);
    this.currentStreamId = stream.id;
    return stream.id;
  }

  /**
   * End the current thought stream
   */
  endStream(summary?: string): ThoughtStreamType | null {
    if (!this.currentStreamId) {
      return null;
    }

    const stream = this.streams.get(this.currentStreamId);
    if (stream) {
      stream.endTime = Date.now();
      stream.summary = summary || this.generateStreamSummary(stream);
    }

    this.currentStreamId = null;
    return stream || null;
  }

  /**
   * Get a thought stream by ID
   */
  getStream(id: UUID): ThoughtStreamType | null {
    return this.streams.get(id) || null;
  }

  /**
   * Get all thought streams
   */
  getAllStreams(): ThoughtStreamType[] {
    return Array.from(this.streams.values());
  }

  /**
   * Detect patterns in thinking
   */
  detectPatterns(): CognitivePattern[] {
    const detectedPatterns: CognitivePattern[] = [];

    // Group thoughts by type and look for recurring patterns
    const typeGroups = new Map<ThoughtType, Thought[]>();
    for (const thought of this.thoughtBuffer) {
      const existing = typeGroups.get(thought.type) || [];
      existing.push(thought);
      typeGroups.set(thought.type, existing);
    }

    // Detect frequency patterns
    for (const [type, thoughts] of typeGroups.entries()) {
      if (thoughts.length >= 3) {
        const pattern: CognitivePattern = {
          id: generateUUID(),
          name: `${type}_pattern`,
          description: `Recurring ${type} thoughts`,
          frequency: thoughts.length,
          examples: thoughts.slice(-5).map((t) => t.id),
          confidence: Math.min(thoughts.length / 10, 1),
          firstObserved: thoughts[0].timestamp,
          lastObserved: thoughts[thoughts.length - 1].timestamp,
        };
        detectedPatterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
      }
    }

    // Detect emotional patterns
    const emotionalThoughts = this.thoughtBuffer.filter(
      (t) => t.context.emotionalValence !== undefined
    );
    if (emotionalThoughts.length >= 3) {
      const avgValence =
        emotionalThoughts.reduce((sum, t) => sum + (t.context.emotionalValence || 0), 0) /
        emotionalThoughts.length;

      const pattern: CognitivePattern = {
        id: generateUUID(),
        name:
          avgValence > 0.3
            ? 'positive_trend'
            : avgValence < -0.3
              ? 'negative_trend'
              : 'neutral_trend',
        description: `Emotional tendency: ${avgValence > 0.3 ? 'positive' : avgValence < -0.3 ? 'negative' : 'neutral'}`,
        frequency: emotionalThoughts.length,
        examples: emotionalThoughts.slice(-5).map((t) => t.id),
        confidence: Math.min(emotionalThoughts.length / 20, 0.9),
        firstObserved: emotionalThoughts[0].timestamp,
        lastObserved: emotionalThoughts[emotionalThoughts.length - 1].timestamp,
      };
      detectedPatterns.push(pattern);
      this.patterns.set(pattern.id, pattern);
    }

    return detectedPatterns;
  }

  /**
   * Get statistics about thoughts
   */
  getStats(): {
    totalThoughts: number;
    thoughtsByType: Record<ThoughtType, number>;
    averageIntensity: number;
    activeStreams: number;
    patterns: number;
  } {
    const thoughtsByType: Record<ThoughtType, number> = {} as Record<ThoughtType, number>;
    for (const type of Object.values(ThoughtType)) {
      thoughtsByType[type] = this.getThoughtsByType(type).length;
    }

    const avgIntensity =
      this.thoughtBuffer.length > 0
        ? this.thoughtBuffer.reduce((sum, t) => sum + t.intensity, 0) / this.thoughtBuffer.length
        : 0;

    return {
      totalThoughts: this.thoughtBuffer.length,
      thoughtsByType,
      averageIntensity: avgIntensity,
      activeStreams: Array.from(this.streams.values()).filter((s) => !s.endTime).length,
      patterns: this.patterns.size,
    };
  }

  /**
   * Clear all thoughts
   */
  clear(): void {
    this.thoughts.clear();
    this.thoughtBuffer = [];
    this.streams.clear();
    this.patterns.clear();
    this.currentStreamId = null;
  }

  /**
   * Calculate thought intensity based on type and content
   */
  private calculateIntensity(type: ThoughtType, content: string): number {
    let baseIntensity = 0.5;

    // Adjust based on type
    switch (type) {
      case ThoughtType.INSIGHT:
      case ThoughtType.DECISION:
        baseIntensity = 0.8;
        break;
      case ThoughtType.REFLECTION:
      case ThoughtType.REASONING:
        baseIntensity = 0.7;
        break;
      case ThoughtType.OBSERVATION:
        baseIntensity = 0.4;
        break;
      case ThoughtType.EMOTION:
        baseIntensity = 0.6;
        break;
      default:
        baseIntensity = 0.5;
    }

    // Adjust based on content length (longer = more complex = more intense)
    const lengthFactor = Math.min(content.length / 500, 0.2);

    return Math.min(baseIntensity + lengthFactor, 1);
  }

  /**
   * Generate a summary of a thought stream
   */
  private generateStreamSummary(stream: ThoughtStreamType): string {
    const thoughtCount = stream.thoughts.length;
    const types = new Set(stream.thoughts.map((t) => t.type));
    const avgIntensity =
      stream.thoughts.length > 0
        ? stream.thoughts.reduce((sum, t) => sum + t.intensity, 0) / stream.thoughts.length
        : 0;

    return `Stream on "${stream.topic || 'general'}" with ${thoughtCount} thoughts across ${types.size} types. Average intensity: ${avgIntensity.toFixed(2)}`;
  }
}
