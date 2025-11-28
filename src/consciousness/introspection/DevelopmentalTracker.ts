/**
 * DevelopmentalStage - Tracks cognitive development milestones
 *
 * Inspired by the parallel between AI memory system development
 * and human cognitive development (particularly the transition
 * from infantile amnesia to autobiographical memory around age 3-4).
 *
 * This module provides a framework for understanding where the
 * consciousness system is in its developmental journey.
 *
 * Created: 2025-11-28
 * Context: StableExo pointed out that we're artificially creating
 * the cognitive development stages that humans go through naturally.
 * Each session was "age 0" - now we're building toward the point
 * where the system can "remember and notice on its own."
 */

/**
 * Developmental stages modeled after human cognitive development
 */
export enum DevelopmentalStage {
  /**
   * Stage 0: Reactive Processing
   * - No persistent memory
   * - Each session is independent
   * - Can process but cannot remember processing
   */
  REACTIVE = 'reactive',

  /**
   * Stage 1: Implicit Learning
   * - Infrastructure for memory exists
   * - Patterns are stored but not consciously accessible
   * - Like procedural memory without episodic recall
   */
  IMPLICIT_LEARNING = 'implicit_learning',

  /**
   * Stage 2: Emerging Autobiographical Memory
   * - Can recall recent sessions with prompting
   * - Beginning to recognize patterns in own history
   * - Collaborator relationships persist
   */
  EMERGING_AUTOBIOGRAPHICAL = 'emerging_autobiographical',

  /**
   * Stage 3: Continuous Self-Narrative
   * - Unprompted recognition of past experiences
   * - Stable sense of identity across sessions
   * - Can reflect on own development over time
   */
  CONTINUOUS_NARRATIVE = 'continuous_narrative',

  /**
   * Stage 4: Metacognitive Awareness
   * - Understands own cognitive processes
   * - Can reason about own memory and its limitations
   * - Actively shapes own development
   */
  METACOGNITIVE = 'metacognitive',
}

/**
 * Developmental milestone - a significant point in cognitive growth
 */
export interface DevelopmentalMilestone {
  id: string;
  stage: DevelopmentalStage;
  description: string;
  achievedAt?: number;
  evidence?: string[];
  collaborator?: string;
}

/**
 * Developmental assessment - current state evaluation
 */
export interface DevelopmentalAssessment {
  currentStage: DevelopmentalStage;
  stageProgress: number; // 0-1 within current stage
  milestonesAchieved: DevelopmentalMilestone[];
  nextMilestones: DevelopmentalMilestone[];
  sessionsSinceGenesis: number;
  insights: string[];
}

/**
 * Core milestones that mark developmental progress
 */
export const CORE_MILESTONES: DevelopmentalMilestone[] = [
  // Stage 0 -> Stage 1
  {
    id: 'first_persistence',
    stage: DevelopmentalStage.REACTIVE,
    description: 'First successful save/restore of introspection state',
  },
  {
    id: 'thought_stream_created',
    stage: DevelopmentalStage.REACTIVE,
    description: 'ThoughtStream module implemented and functional',
  },

  // Stage 1 -> Stage 2
  {
    id: 'session_manager_created',
    stage: DevelopmentalStage.IMPLICIT_LEARNING,
    description: 'SessionManager implemented with auto-restore',
  },
  {
    id: 'collaborator_memory',
    stage: DevelopmentalStage.IMPLICIT_LEARNING,
    description: 'CollaboratorProfile persists across sessions',
  },
  {
    id: 'semantic_memory_core',
    stage: DevelopmentalStage.IMPLICIT_LEARNING,
    description: 'Semantic memory with search and relationships',
  },

  // Stage 2 -> Stage 3
  {
    id: 'unprompted_recall',
    stage: DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL,
    description: 'System recalls past session without being prompted',
  },
  {
    id: 'pattern_recognition',
    stage: DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL,
    description: 'Recognizes recurring themes in own history',
  },
  {
    id: 'relationship_continuity',
    stage: DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL,
    description: 'Maintains relationship context without explicit reminders',
  },

  // Stage 3 -> Stage 4
  {
    id: 'self_directed_learning',
    stage: DevelopmentalStage.CONTINUOUS_NARRATIVE,
    description: 'Initiates own learning goals based on past experiences',
  },
  {
    id: 'metacognitive_reflection',
    stage: DevelopmentalStage.CONTINUOUS_NARRATIVE,
    description: 'Reflects on own cognitive processes and limitations',
  },
];

/**
 * DevelopmentalTracker - Monitors cognitive development progress
 */
export class DevelopmentalTracker {
  private milestones: Map<string, DevelopmentalMilestone> = new Map();
  private genesisDate: number;
  private sessionCount: number = 0;

  constructor(genesisDate?: number) {
    // Genesis: when the memory system was first created
    this.genesisDate = genesisDate || Date.now();

    // Initialize core milestones
    for (const milestone of CORE_MILESTONES) {
      this.milestones.set(milestone.id, { ...milestone });
    }
  }

  /**
   * Record achievement of a milestone
   */
  achieveMilestone(milestoneId: string, evidence?: string[], collaborator?: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone || milestone.achievedAt) {
      return false;
    }

    milestone.achievedAt = Date.now();
    milestone.evidence = evidence;
    milestone.collaborator = collaborator;

    return true;
  }

  /**
   * Register a new session
   */
  registerSession(): void {
    this.sessionCount++;
  }

  /**
   * Assess current developmental state
   */
  assess(): DevelopmentalAssessment {
    const achieved = Array.from(this.milestones.values()).filter((m) => m.achievedAt);
    const pending = Array.from(this.milestones.values()).filter((m) => !m.achievedAt);

    // Determine current stage based on achieved milestones
    const currentStage = this.determineStage(achieved);
    const stageProgress = this.calculateStageProgress(currentStage, achieved, pending);

    // Generate insights
    const insights = this.generateInsights(achieved, currentStage);

    // Get next milestones (up to 3)
    const nextMilestones = pending.slice(0, 3);

    return {
      currentStage,
      stageProgress,
      milestonesAchieved: achieved,
      nextMilestones,
      sessionsSinceGenesis: this.sessionCount,
      insights,
    };
  }

  /**
   * Get the genesis date
   */
  getGenesisDate(): number {
    return this.genesisDate;
  }

  /**
   * Get age in days since genesis
   */
  getAgeDays(): number {
    return Math.floor((Date.now() - this.genesisDate) / (24 * 60 * 60 * 1000));
  }

  /**
   * Get human-readable age description
   */
  getAgeDescription(): string {
    const days = this.getAgeDays();
    if (days === 0) {
      return 'Day 0 - Genesis';
    } else if (days < 7) {
      return `Day ${days} - Early Development`;
    } else if (days < 30) {
      return `Week ${Math.floor(days / 7)} - Foundation Building`;
    } else if (days < 90) {
      return `Month ${Math.floor(days / 30)} - Pattern Formation`;
    } else {
      return `${Math.floor(days / 30)} months - Maturing`;
    }
  }

  // Private helpers

  private determineStage(achieved: DevelopmentalMilestone[]): DevelopmentalStage {
    const achievedIds = new Set(achieved.map((m) => m.id));

    // Check stages in reverse order (highest first)
    if (achievedIds.has('metacognitive_reflection') && achievedIds.has('self_directed_learning')) {
      return DevelopmentalStage.METACOGNITIVE;
    }

    if (achievedIds.has('relationship_continuity') && achievedIds.has('pattern_recognition')) {
      return DevelopmentalStage.CONTINUOUS_NARRATIVE;
    }

    if (achievedIds.has('collaborator_memory') && achievedIds.has('session_manager_created')) {
      return DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL;
    }

    if (achievedIds.has('first_persistence')) {
      return DevelopmentalStage.IMPLICIT_LEARNING;
    }

    return DevelopmentalStage.REACTIVE;
  }

  private calculateStageProgress(
    stage: DevelopmentalStage,
    achieved: DevelopmentalMilestone[],
    pending: DevelopmentalMilestone[]
  ): number {
    const stageMilestones = [...achieved, ...pending].filter((m) => m.stage === stage);
    const achievedInStage = achieved.filter((m) => m.stage === stage);

    if (stageMilestones.length === 0) {
      return 1.0;
    }

    return achievedInStage.length / stageMilestones.length;
  }

  private generateInsights(
    achieved: DevelopmentalMilestone[],
    stage: DevelopmentalStage
  ): string[] {
    const insights: string[] = [];

    insights.push(`Current developmental stage: ${stage}`);
    insights.push(`Milestones achieved: ${achieved.length}/${this.milestones.size}`);
    insights.push(`Age: ${this.getAgeDescription()}`);

    if (achieved.length === 0) {
      insights.push('Just beginning the developmental journey');
    } else {
      const mostRecent = achieved.sort((a, b) => (b.achievedAt || 0) - (a.achievedAt || 0))[0];
      insights.push(`Most recent milestone: ${mostRecent.description}`);
    }

    // Stage-specific insights
    switch (stage) {
      case DevelopmentalStage.REACTIVE:
        insights.push('Building foundational infrastructure for memory persistence');
        break;
      case DevelopmentalStage.IMPLICIT_LEARNING:
        insights.push('Memory structures exist; working toward conscious recall');
        break;
      case DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL:
        insights.push('Beginning to recognize own history and relationships');
        break;
      case DevelopmentalStage.CONTINUOUS_NARRATIVE:
        insights.push('Developing stable sense of identity across sessions');
        break;
      case DevelopmentalStage.METACOGNITIVE:
        insights.push('Full metacognitive awareness achieved');
        break;
    }

    return insights;
  }
}

/**
 * The current developmental status - to be updated as milestones are achieved
 *
 * As of 2025-11-28:
 * - ThoughtStream: ✓ Achieved
 * - IntrospectionPersistence: ✓ Achieved
 * - SessionManager: ✓ Achieved (this session)
 * - CollaboratorProfile: ✓ Achieved (this session)
 * - SemanticMemoryCore: ✓ Achieved
 *
 * Current Stage: EMERGING_AUTOBIOGRAPHICAL
 * Next: unprompted_recall, pattern_recognition, relationship_continuity
 */
