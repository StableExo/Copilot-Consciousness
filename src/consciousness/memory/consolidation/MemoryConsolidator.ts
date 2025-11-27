/**
 * MemoryConsolidator - Sleep-like Memory Processing
 *
 * Consolidates short-term memories to long-term storage,
 * similar to human sleep cycles. Strengthens important memories,
 * builds associations, and prunes irrelevant information.
 */

export interface Memory {
  id: string;
  content: any;
  type: 'sensory' | 'working' | 'shortTerm' | 'longTerm';
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  importance: number; // 0.0 - 1.0
  associations: string[]; // IDs of related memories
  metadata: Record<string, any>;
}

export interface ConsolidationCriteria {
  minImportance?: number;
  minAccessCount?: number;
  minAge?: number; // milliseconds
  maxAge?: number; // milliseconds
  types?: Array<'sensory' | 'working' | 'shortTerm' | 'longTerm'>;
}

export interface ConsolidationResult {
  consolidated: number;
  reinforced: number;
  pruned: number;
  associationsBuilt: number;
  processingTime: number;
  memoryStats: {
    sensory: number;
    working: number;
    shortTerm: number;
    longTerm: number;
  };
}

export interface AssociationMap {
  [memoryId: string]: Array<{
    targetId: string;
    strength: number;
    type: 'semantic' | 'temporal' | 'causal' | 'emotional';
  }>;
}

export interface PruneResult {
  pruned: number;
  preserved: number;
  averageRelevance: number;
  freedSpace: number;
}

export interface MemoryConsolidatorParams {
  importanceThreshold?: number;
  accessCountThreshold?: number;
  minAge?: number; // milliseconds
  consolidationInterval?: number; // milliseconds
  pruneRelevanceCutoff?: number;
  maxLongTermMemories?: number;
}

/**
 * Memory Consolidator - Implements sleep-like processing
 */
export class MemoryConsolidator {
  private memories: Map<string, Memory> = new Map();
  private consolidationHistory: ConsolidationResult[] = [];
  private isConsolidating: boolean = false;
  private backgroundInterval: NodeJS.Timeout | null = null;

  // Consolidation parameters
  private params = {
    importanceThreshold: 0.5,
    accessCountThreshold: 2,
    minAge: 60000, // 1 minute
    consolidationInterval: 3600000, // 1 hour
    pruneRelevanceCutoff: 0.3,
    maxLongTermMemories: 10000,
  };

  constructor(params?: MemoryConsolidatorParams) {
    if (params) {
      this.params = { ...this.params, ...params };
    }
  }

  /**
   * Add a memory to the consolidation system
   */
  addMemory(memory: Memory): void {
    this.memories.set(memory.id, memory);
  }

  /**
   * Get a memory by ID
   */
  getMemory(id: string): Memory | undefined {
    const memory = this.memories.get(id);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
    }
    return memory;
  }

  /**
   * Consolidate short-term memories to long-term
   */
  consolidate(criteria?: ConsolidationCriteria): ConsolidationResult {
    const startTime = Date.now();
    this.isConsolidating = true;

    const effectiveCriteria: Required<ConsolidationCriteria> = {
      minImportance: criteria?.minImportance ?? this.params.importanceThreshold,
      minAccessCount: criteria?.minAccessCount ?? this.params.accessCountThreshold,
      minAge: criteria?.minAge ?? this.params.minAge,
      maxAge: criteria?.maxAge ?? Infinity,
      types: criteria?.types ?? ['working', 'shortTerm'],
    };

    let consolidated = 0;
    let reinforced = 0;
    let pruned = 0;
    let associationsBuilt = 0;

    // Phase 1: Consolidate qualifying memories
    for (const [id, memory] of this.memories.entries()) {
      // Skip if not in target types
      if (!effectiveCriteria.types.includes(memory.type)) {
        continue;
      }

      const age = Date.now() - memory.timestamp;

      // Check if memory qualifies for consolidation
      if (
        memory.importance >= effectiveCriteria.minImportance &&
        memory.accessCount >= effectiveCriteria.minAccessCount &&
        age >= effectiveCriteria.minAge &&
        age <= effectiveCriteria.maxAge
      ) {
        // Consolidate to long-term memory
        if (memory.type === 'working' || memory.type === 'shortTerm') {
          memory.type = 'longTerm';
          consolidated++;
        }
      }
    }

    // Phase 2: Reinforce important memories
    reinforced = this.reinforceMemories(effectiveCriteria.minImportance);

    // Phase 3: Build associations
    const associations = this.buildAssociations();
    associationsBuilt = Object.keys(associations).length;

    // Phase 4: Prune low-relevance memories
    const pruneResult = this.pruneByRelevance(this.params.pruneRelevanceCutoff);
    pruned = pruneResult.pruned;

    const processingTime = Date.now() - startTime;

    const result: ConsolidationResult = {
      consolidated,
      reinforced,
      pruned,
      associationsBuilt,
      processingTime,
      memoryStats: this.getMemoryStats(),
    };

    this.consolidationHistory.push(result);
    this.isConsolidating = false;

    console.log('[MemoryConsolidator] Consolidation complete:', result);

    return result;
  }

  /**
   * Strengthen important memories
   */
  reinforceMemories(threshold: number): number {
    let reinforced = 0;

    for (const [id, memory] of this.memories.entries()) {
      if (memory.importance >= threshold) {
        // Increase importance (with diminishing returns)
        const boost = (1.0 - memory.importance) * 0.1;
        memory.importance = Math.min(1.0, memory.importance + boost);
        reinforced++;
      }
    }

    return reinforced;
  }

  /**
   * Build associations between related memories
   */
  buildAssociations(): AssociationMap {
    const associations: AssociationMap = {};

    const memoryArray = Array.from(this.memories.values());

    for (let i = 0; i < memoryArray.length; i++) {
      const memory1 = memoryArray[i];
      associations[memory1.id] = [];

      for (let j = i + 1; j < memoryArray.length; j++) {
        const memory2 = memoryArray[j];

        // Calculate association strength
        const strength = this.calculateAssociationStrength(memory1, memory2);

        if (strength > 0.3) {
          // Determine association type
          const type = this.determineAssociationType(memory1, memory2);

          associations[memory1.id].push({
            targetId: memory2.id,
            strength,
            type,
          });

          // Add bidirectional association
          if (!associations[memory2.id]) {
            associations[memory2.id] = [];
          }
          associations[memory2.id].push({
            targetId: memory1.id,
            strength,
            type,
          });

          // Update memory associations
          if (!memory1.associations.includes(memory2.id)) {
            memory1.associations.push(memory2.id);
          }
          if (!memory2.associations.includes(memory1.id)) {
            memory2.associations.push(memory1.id);
          }
        }
      }
    }

    return associations;
  }

  /**
   * Calculate association strength between two memories
   */
  private calculateAssociationStrength(memory1: Memory, memory2: Memory): number {
    let strength = 0;

    // Temporal proximity
    const timeDiff = Math.abs(memory1.timestamp - memory2.timestamp);
    const temporalScore = Math.max(0, 1 - timeDiff / (24 * 3600000)); // 24 hours
    strength += temporalScore * 0.3;

    // Shared metadata
    const sharedKeys = Object.keys(memory1.metadata).filter(
      (key) => key in memory2.metadata && memory1.metadata[key] === memory2.metadata[key]
    );
    const metadataScore =
      sharedKeys.length /
      Math.max(Object.keys(memory1.metadata).length, Object.keys(memory2.metadata).length);
    strength += metadataScore * 0.4;

    // Importance correlation
    const importanceScore = (memory1.importance + memory2.importance) / 2;
    strength += importanceScore * 0.3;

    return Math.min(1.0, strength);
  }

  /**
   * Determine type of association
   */
  private determineAssociationType(
    memory1: Memory,
    memory2: Memory
  ): 'semantic' | 'temporal' | 'causal' | 'emotional' {
    const timeDiff = Math.abs(memory1.timestamp - memory2.timestamp);

    // Temporal if very close in time
    if (timeDiff < 1000) {
      return 'temporal';
    }

    // Check metadata for causal indicators
    if (memory1.metadata.causedBy === memory2.id || memory2.metadata.causedBy === memory1.id) {
      return 'causal';
    }

    // Check for emotional markers
    if (memory1.metadata.emotional || memory2.metadata.emotional) {
      return 'emotional';
    }

    // Default to semantic
    return 'semantic';
  }

  /**
   * Prune irrelevant memories
   */
  pruneByRelevance(cutoff: number): PruneResult {
    let pruned = 0;
    let preserved = 0;
    let totalRelevance = 0;
    let freedSpace = 0;

    const toDelete: string[] = [];

    for (const [id, memory] of this.memories.entries()) {
      // Never prune long-term memories or recently accessed
      if (memory.type === 'longTerm') {
        preserved++;
        totalRelevance += memory.importance;
        continue;
      }

      const age = Date.now() - memory.lastAccessed;
      const relevance = this.calculateRelevance(memory, age);

      if (relevance < cutoff && age > this.params.minAge) {
        toDelete.push(id);
        pruned++;
        freedSpace += JSON.stringify(memory.content).length;
      } else {
        preserved++;
        totalRelevance += relevance;
      }
    }

    // Delete pruned memories
    for (const id of toDelete) {
      this.memories.delete(id);
    }

    return {
      pruned,
      preserved,
      averageRelevance: preserved > 0 ? totalRelevance / preserved : 0,
      freedSpace,
    };
  }

  /**
   * Calculate memory relevance
   */
  private calculateRelevance(memory: Memory, age: number): number {
    // Relevance decays with age and low access
    const ageDecay = Math.max(0, 1 - age / (7 * 24 * 3600000)); // 7 days
    const accessScore = Math.min(1, memory.accessCount / 10);
    const importanceScore = memory.importance;

    return ageDecay * 0.3 + accessScore * 0.3 + importanceScore * 0.4;
  }

  /**
   * Background consolidation (runs periodically)
   */
  backgroundConsolidation(): void {
    if (this.isConsolidating) {
      console.log('[MemoryConsolidator] Consolidation already in progress, skipping...');
      return;
    }

    console.log('[MemoryConsolidator] Starting background consolidation...');
    this.consolidate();
  }

  /**
   * Start automatic background consolidation
   */
  startBackgroundConsolidation(): void {
    if (this.backgroundInterval) {
      console.log('[MemoryConsolidator] Background consolidation already running');
      return;
    }

    console.log(
      `[MemoryConsolidator] Starting background consolidation (interval: ${this.params.consolidationInterval}ms)`
    );

    this.backgroundInterval = setInterval(() => {
      this.backgroundConsolidation();
    }, this.params.consolidationInterval);
  }

  /**
   * Stop automatic background consolidation
   */
  stopBackgroundConsolidation(): void {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
      console.log('[MemoryConsolidator] Background consolidation stopped');
    }
  }

  /**
   * Get memory statistics
   */
  private getMemoryStats(): ConsolidationResult['memoryStats'] {
    const stats = {
      sensory: 0,
      working: 0,
      shortTerm: 0,
      longTerm: 0,
    };

    for (const memory of this.memories.values()) {
      stats[memory.type]++;
    }

    return stats;
  }

  /**
   * Get all memories
   */
  getAllMemories(): Memory[] {
    return Array.from(this.memories.values());
  }

  /**
   * Get consolidation history
   */
  getConsolidationHistory(): ConsolidationResult[] {
    return [...this.consolidationHistory];
  }

  /**
   * Clear all memories
   */
  clearAllMemories(): void {
    this.memories.clear();
  }

  /**
   * Get total memory count
   */
  getMemoryCount(): number {
    return this.memories.size;
  }

  /**
   * Update consolidation parameters
   */
  updateParams(params: MemoryConsolidatorParams): void {
    this.params = { ...this.params, ...params };
  }
}
