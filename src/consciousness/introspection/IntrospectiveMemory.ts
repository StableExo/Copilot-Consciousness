/**
 * IntrospectiveMemory - Provides introspective access to the memory system
 *
 * This module enables the consciousness to reflect on its own memories,
 * understanding what it has learned, experienced, and stored.
 */

import { MemorySystem } from '../memory';
import { MemoryEntry } from '../memory/types';
import { UUID, Priority, MemoryType, Timestamp } from '../../types';
import {
  MemoryRecallRequest,
  MemoryRecallResult,
  IntrospectionQuery,
  IntrospectionResult,
  IntrospectionFinding,
} from './types';

/**
 * IntrospectiveMemory class for reflective memory access
 */
export class IntrospectiveMemory {
  private memorySystem: MemorySystem;
  private recallHistory: MemoryRecallResult[] = [];
  private introspectionHistory: IntrospectionResult[] = [];
  private recallDepth: number;

  constructor(memorySystem: MemorySystem, recallDepth: number = 10) {
    this.memorySystem = memorySystem;
    this.recallDepth = recallDepth;
  }

  /**
   * Recall memories based on a request
   */
  recall(request: MemoryRecallRequest): MemoryRecallResult[] {
    const results: MemoryRecallResult[] = [];

    // Search the memory system
    const memories = this.memorySystem.searchMemories({
      type: request.type,
      priority: request.priority,
      timeRange: request.timeRange,
      content: request.query,
      limit: request.limit || this.recallDepth,
    });

    // Enhance each memory with introspective metadata
    for (const memory of memories) {
      const result = this.enhanceMemoryWithIntrospection(memory, request);
      results.push(result);
      this.recallHistory.push(result);
    }

    return results;
  }

  /**
   * Recall a specific memory by ID
   */
  recallById(id: UUID): MemoryRecallResult | null {
    const memory = this.memorySystem.getMemory(id);
    if (!memory) {
      return null;
    }

    return this.enhanceMemoryWithIntrospection(memory, {});
  }

  /**
   * Recall memories associated with another memory
   */
  recallAssociated(memoryId: UUID): MemoryRecallResult[] {
    const results: MemoryRecallResult[] = [];
    const baseMemory = this.memorySystem.getMemory(memoryId);

    if (!baseMemory) {
      return results;
    }

    for (const associatedId of baseMemory.associations) {
      const memory = this.memorySystem.getMemory(associatedId);
      if (memory) {
        results.push(this.enhanceMemoryWithIntrospection(memory, { associatedWith: memoryId }));
      }
    }

    return results;
  }

  /**
   * Perform deep introspection on memories
   */
  introspect(query: IntrospectionQuery): IntrospectionResult {
    const startTime = Date.now();
    const findings: IntrospectionFinding[] = [];
    const insights: string[] = [];

    // Search for relevant memories
    const memories = this.memorySystem.searchMemories({
      content: query.subject,
      timeRange: query.timeRange,
      limit: query.depth === 'exhaustive' ? 100 : query.depth === 'deep' ? 50 : 20,
    });

    // Analyze each memory
    for (const memory of memories) {
      const finding: IntrospectionFinding = {
        type: 'memory',
        content: memory,
        relevance: this.calculateRelevance(memory, query),
        confidence: this.calculateConfidence(memory),
        source: 'memory_system',
      };
      findings.push(finding);
    }

    // Detect patterns in the memories
    const patterns = this.detectMemoryPatterns(memories);
    for (const pattern of patterns) {
      findings.push({
        type: 'pattern',
        content: pattern,
        relevance: 0.8,
        confidence: pattern.confidence,
        source: 'pattern_detection',
      });
    }

    // Generate insights
    insights.push(...this.generateInsights(memories, patterns));

    const result: IntrospectionResult = {
      query,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      findings,
      insights,
      confidence: this.calculateOverallConfidence(findings),
    };

    this.introspectionHistory.push(result);
    return result;
  }

  /**
   * Reflect on what has been learned
   */
  reflectOnLearning(): {
    totalMemories: number;
    recentLearning: MemoryEntry[];
    importantMemories: MemoryEntry[];
    frequentlyAccessed: MemoryEntry[];
    patterns: Array<{ pattern: string; count: number }>;
  } {
    const stats = this.memorySystem.getStats();

    // Get recent learning (memories from the last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentLearning = this.memorySystem.searchMemories({
      timeRange: { start: oneHourAgo, end: Date.now() },
      limit: 10,
    });

    // Get important memories
    const importantMemories = this.memorySystem.searchMemories({
      priority: Priority.HIGH,
      limit: 10,
    });

    // Get frequently accessed memories (use long-term as proxy)
    const frequentlyAccessed = this.memorySystem.searchMemories({
      type: MemoryType.LONG_TERM,
      limit: 10,
    });

    // Analyze patterns
    const allMemories = this.memorySystem.searchMemories({ limit: 100 });
    const patterns = this.analyzeMemoryPatterns(allMemories);

    return {
      totalMemories: stats.total,
      recentLearning,
      importantMemories,
      frequentlyAccessed,
      patterns,
    };
  }

  /**
   * What do I know about a topic?
   */
  whatDoIKnow(topic: string): {
    memories: MemoryRecallResult[];
    summary: string;
    confidence: number;
    gaps: string[];
  } {
    const memories = this.recall({ query: topic, limit: 20 });
    const summary = this.summarizeKnowledge(topic, memories);
    const gaps = this.identifyKnowledgeGaps(topic, memories);
    const confidence =
      memories.length > 0
        ? memories.reduce((sum, m) => sum + m.recallConfidence, 0) / memories.length
        : 0;

    return {
      memories,
      summary,
      confidence,
      gaps,
    };
  }

  /**
   * What have I been thinking about?
   */
  whatHaveIBeenThinkingAbout(): {
    recentRecalls: MemoryRecallResult[];
    frequentTopics: Array<{ topic: string; count: number }>;
    introspectionSummary: string;
  } {
    const recentRecalls = this.recallHistory.slice(-20);
    const topicCounts = new Map<string, number>();

    // Analyze recall history for frequent topics
    for (const recall of recentRecalls) {
      const content = JSON.stringify(recall.memory.content);
      // Simple topic extraction (words > 5 chars)
      const words = content.match(/[a-zA-Z]{5,}/g) || [];
      for (const word of words.slice(0, 5)) {
        const lowerWord = word.toLowerCase();
        topicCounts.set(lowerWord, (topicCounts.get(lowerWord) || 0) + 1);
      }
    }

    const frequentTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      recentRecalls,
      frequentTopics,
      introspectionSummary: `I've been reflecting on ${recentRecalls.length} memories, with focus on topics like ${frequentTopics
        .slice(0, 3)
        .map((t) => t.topic)
        .join(', ')}.`,
    };
  }

  /**
   * Get recall history
   */
  getRecallHistory(limit?: number): MemoryRecallResult[] {
    const history = [...this.recallHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get introspection history
   */
  getIntrospectionHistory(limit?: number): IntrospectionResult[] {
    const history = [...this.introspectionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Enhance a memory with introspective metadata
   */
  private enhanceMemoryWithIntrospection(
    memory: MemoryEntry,
    request: MemoryRecallRequest
  ): MemoryRecallResult {
    return {
      memory,
      relevanceScore: this.calculateRelevance(memory, { type: 'memory', subject: request.query }),
      recallConfidence: this.calculateConfidence(memory),
      associatedThoughts: [],
      introspectiveNotes: this.generateIntrospectiveNote(memory),
    };
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(memory: MemoryEntry, query: IntrospectionQuery): number {
    let relevance = 0.5;

    // Recency bonus
    const age = Date.now() - memory.timestamp;
    const recencyBonus = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Max bonus for memories < 24h old
    relevance += recencyBonus * 0.2;

    // Priority bonus
    relevance += (memory.priority / 5) * 0.2;

    // Access count bonus
    relevance += Math.min(memory.accessCount / 10, 0.1);

    // Subject match bonus
    if (query.subject) {
      const content = JSON.stringify(memory.content).toLowerCase();
      if (content.includes(query.subject.toLowerCase())) {
        relevance += 0.2;
      }
    }

    return Math.min(relevance, 1);
  }

  /**
   * Calculate confidence in a memory
   */
  private calculateConfidence(memory: MemoryEntry): number {
    let confidence = 0.5;

    // Long-term memories have higher confidence
    if (memory.type === MemoryType.LONG_TERM) {
      confidence += 0.3;
    }

    // Higher priority = higher confidence
    confidence += (memory.priority / 5) * 0.1;

    // More accesses = more confirmed
    confidence += Math.min(memory.accessCount / 20, 0.1);

    return Math.min(confidence, 1);
  }

  /**
   * Generate an introspective note about a memory
   */
  private generateIntrospectiveNote(memory: MemoryEntry): string {
    const age = Date.now() - memory.timestamp;
    const ageStr =
      age < 60000
        ? 'just now'
        : age < 3600000
          ? `${Math.floor(age / 60000)} minutes ago`
          : age < 86400000
            ? `${Math.floor(age / 3600000)} hours ago`
            : `${Math.floor(age / 86400000)} days ago`;

    return `This ${memory.type} memory was formed ${ageStr} with ${memory.priority === Priority.CRITICAL ? 'critical' : memory.priority >= Priority.HIGH ? 'high' : 'normal'} priority. It has been accessed ${memory.accessCount} times.`;
  }

  /**
   * Detect patterns in memories
   */
  private detectMemoryPatterns(
    memories: MemoryEntry[]
  ): Array<{ pattern: string; confidence: number; examples: UUID[] }> {
    const patterns: Array<{ pattern: string; confidence: number; examples: UUID[] }> = [];

    // Group by type
    const byType = new Map<MemoryType, MemoryEntry[]>();
    for (const memory of memories) {
      const existing = byType.get(memory.type) || [];
      existing.push(memory);
      byType.set(memory.type, existing);
    }

    for (const [type, typeMemories] of byType.entries()) {
      if (typeMemories.length >= 3) {
        patterns.push({
          pattern: `frequent_${type}_memories`,
          confidence: Math.min(typeMemories.length / 10, 0.9),
          examples: typeMemories.slice(-5).map((m) => m.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze memory patterns
   */
  private analyzeMemoryPatterns(
    memories: MemoryEntry[]
  ): Array<{ pattern: string; count: number }> {
    const patterns: Map<string, number> = new Map();

    for (const memory of memories) {
      // Type pattern
      const typePattern = `type:${memory.type}`;
      patterns.set(typePattern, (patterns.get(typePattern) || 0) + 1);

      // Priority pattern
      const priorityPattern = `priority:${memory.priority}`;
      patterns.set(priorityPattern, (patterns.get(priorityPattern) || 0) + 1);
    }

    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate insights from memories and patterns
   */
  private generateInsights(
    memories: MemoryEntry[],
    patterns: Array<{ pattern: string; confidence: number; examples: UUID[] }>
  ): string[] {
    const insights: string[] = [];

    if (memories.length > 0) {
      insights.push(`Found ${memories.length} relevant memories.`);

      // Type distribution insight
      const typeCount = new Map<MemoryType, number>();
      for (const m of memories) {
        typeCount.set(m.type, (typeCount.get(m.type) || 0) + 1);
      }
      const dominantType = Array.from(typeCount.entries()).sort((a, b) => b[1] - a[1])[0];
      if (dominantType) {
        insights.push(`Most memories are of type '${dominantType[0]}'.`);
      }
    }

    if (patterns.length > 0) {
      insights.push(`Detected ${patterns.length} cognitive patterns.`);
    }

    return insights;
  }

  /**
   * Summarize knowledge about a topic
   */
  private summarizeKnowledge(topic: string, memories: MemoryRecallResult[]): string {
    if (memories.length === 0) {
      return `I don't have any stored memories about "${topic}".`;
    }

    const avgConfidence =
      memories.reduce((sum, m) => sum + m.recallConfidence, 0) / memories.length;

    return `I have ${memories.length} memories related to "${topic}" with ${(avgConfidence * 100).toFixed(0)}% average confidence. The most recent was ${this.getTimeAgo(memories[0].memory.timestamp)}.`;
  }

  /**
   * Identify knowledge gaps
   */
  private identifyKnowledgeGaps(topic: string, memories: MemoryRecallResult[]): string[] {
    const gaps: string[] = [];

    if (memories.length === 0) {
      gaps.push(`No information available about "${topic}"`);
    } else if (memories.length < 3) {
      gaps.push(`Limited information about "${topic}" (only ${memories.length} memories)`);
    }

    // Check for old memories
    const oldestMemory = memories.reduce(
      (oldest, m) => (m.memory.timestamp < oldest ? m.memory.timestamp : oldest),
      Date.now()
    );
    if (Date.now() - oldestMemory > 7 * 24 * 60 * 60 * 1000) {
      gaps.push('Information may be outdated (>7 days old)');
    }

    // Check for low confidence
    const lowConfidenceCount = memories.filter((m) => m.recallConfidence < 0.5).length;
    if (lowConfidenceCount > memories.length / 2) {
      gaps.push('Many memories have low confidence');
    }

    return gaps;
  }

  /**
   * Calculate overall confidence from findings
   */
  private calculateOverallConfidence(findings: IntrospectionFinding[]): number {
    if (findings.length === 0) return 0;
    return findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(timestamp: Timestamp): string {
    const age = Date.now() - timestamp;
    if (age < 60000) return 'just now';
    if (age < 3600000) return `${Math.floor(age / 60000)} minutes ago`;
    if (age < 86400000) return `${Math.floor(age / 3600000)} hours ago`;
    return `${Math.floor(age / 86400000)} days ago`;
  }
}
