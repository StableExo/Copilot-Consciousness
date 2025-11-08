/**
 * Evolution Tracker
 * 
 * Adapted from AxionCitadel's development roadmap tracking
 * Tracks system evolution, capability development, and adaptation over time
 */

export enum EvolutionPhase {
  INITIALIZATION = 'INITIALIZATION',
  LEARNING = 'LEARNING',
  OPTIMIZATION = 'OPTIMIZATION',
  ADAPTATION = 'ADAPTATION',
  MASTERY = 'MASTERY'
}

export enum CapabilityStatus {
  PLANNED = 'PLANNED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  TESTING = 'TESTING',
  DEPLOYED = 'DEPLOYED',
  DEPRECATED = 'DEPRECATED'
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  status: CapabilityStatus;
  maturityLevel: number; // 0-100
  dependencies: string[];
  metrics: CapabilityMetrics;
  developmentHistory: DevelopmentEvent[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface CapabilityMetrics {
  usageCount: number;
  successRate: number;
  averagePerformance: number;
  errorRate: number;
  lastUsed?: number;
}

export interface DevelopmentEvent {
  timestamp: number;
  eventType: 'CREATED' | 'IMPROVED' | 'TESTED' | 'DEPLOYED' | 'OPTIMIZED' | 'DEPRECATED';
  description: string;
  impact: string[];
  metrics?: Record<string, number>;
}

export interface EvolutionMilestone {
  id: string;
  name: string;
  description: string;
  phase: EvolutionPhase;
  targetDate?: number;
  completedDate?: number;
  criteria: string[];
  progress: number; // 0-100
  relatedCapabilities: string[];
  metadata: Record<string, unknown>;
}

export interface AdaptationEvent {
  id: string;
  timestamp: number;
  trigger: string;
  context: Record<string, unknown>;
  changes: AdaptationChange[];
  effectiveness?: number; // 0-1, measured after adaptation
  metadata: Record<string, unknown>;
}

export interface AdaptationChange {
  targetId: string;
  targetType: 'CAPABILITY' | 'PARAMETER' | 'STRATEGY' | 'GOAL';
  changeType: 'ADD' | 'MODIFY' | 'REMOVE' | 'OPTIMIZE';
  previousValue?: unknown;
  newValue: unknown;
  reasoning: string;
}

/**
 * Evolution Tracking System
 * Monitors and records system evolution and capability development
 */
export class EvolutionTracker {
  private capabilities: Map<string, Capability> = new Map();
  private milestones: Map<string, EvolutionMilestone> = new Map();
  private adaptations: Map<string, AdaptationEvent> = new Map();
  private currentPhase: EvolutionPhase = EvolutionPhase.INITIALIZATION;
  private phaseTransitions: Array<{
    timestamp: number;
    from: EvolutionPhase;
    to: EvolutionPhase;
    reason: string;
  }> = [];

  /**
   * Register a new capability
   */
  registerCapability(
    name: string,
    description: string,
    category: string,
    dependencies: string[] = []
  ): Capability {
    const capability: Capability = {
      id: this.generateId('capability'),
      name,
      description,
      category,
      status: CapabilityStatus.PLANNED,
      maturityLevel: 0,
      dependencies,
      metrics: {
        usageCount: 0,
        successRate: 0,
        averagePerformance: 0,
        errorRate: 0
      },
      developmentHistory: [{
        timestamp: Date.now(),
        eventType: 'CREATED',
        description: 'Capability registered',
        impact: ['New capability added to system']
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };

    this.capabilities.set(capability.id, capability);
    return capability;
  }

  /**
   * Update capability status
   */
  updateCapabilityStatus(
    capabilityId: string,
    status: CapabilityStatus,
    description: string
  ): boolean {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) return false;

    const eventTypeMap: Record<CapabilityStatus, DevelopmentEvent['eventType']> = {
      [CapabilityStatus.PLANNED]: 'CREATED',
      [CapabilityStatus.IN_DEVELOPMENT]: 'IMPROVED',
      [CapabilityStatus.TESTING]: 'TESTED',
      [CapabilityStatus.DEPLOYED]: 'DEPLOYED',
      [CapabilityStatus.DEPRECATED]: 'DEPRECATED'
    };

    capability.status = status;
    capability.updatedAt = Date.now();
    capability.developmentHistory.push({
      timestamp: Date.now(),
      eventType: eventTypeMap[status],
      description,
      impact: [`Status changed to ${status}`]
    });

    // Update maturity level based on status
    const maturityByStatus: Record<CapabilityStatus, number> = {
      [CapabilityStatus.PLANNED]: 10,
      [CapabilityStatus.IN_DEVELOPMENT]: 30,
      [CapabilityStatus.TESTING]: 60,
      [CapabilityStatus.DEPLOYED]: 80,
      [CapabilityStatus.DEPRECATED]: 0
    };

    capability.maturityLevel = Math.max(
      capability.maturityLevel,
      maturityByStatus[status]
    );

    return true;
  }

  /**
   * Record capability usage
   */
  recordUsage(capabilityId: string, success: boolean, performance: number): boolean {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) return false;

    const metrics = capability.metrics;
    metrics.usageCount++;
    metrics.lastUsed = Date.now();

    // Update success rate
    const successCount = metrics.successRate * (metrics.usageCount - 1) + (success ? 1 : 0);
    metrics.successRate = successCount / metrics.usageCount;

    // Update performance
    const totalPerformance = metrics.averagePerformance * (metrics.usageCount - 1) + performance;
    metrics.averagePerformance = totalPerformance / metrics.usageCount;

    // Update error rate
    if (!success) {
      const errorCount = metrics.errorRate * (metrics.usageCount - 1) + 1;
      metrics.errorRate = errorCount / metrics.usageCount;
    }

    // Improve maturity with usage
    if (success && capability.maturityLevel < 100) {
      capability.maturityLevel = Math.min(100, capability.maturityLevel + 0.5);
    }

    capability.updatedAt = Date.now();
    return true;
  }

  /**
   * Define an evolution milestone
   */
  defineMilestone(
    name: string,
    description: string,
    phase: EvolutionPhase,
    criteria: string[],
    relatedCapabilities: string[] = []
  ): EvolutionMilestone {
    const milestone: EvolutionMilestone = {
      id: this.generateId('milestone'),
      name,
      description,
      phase,
      criteria,
      progress: 0,
      relatedCapabilities,
      metadata: {}
    };

    this.milestones.set(milestone.id, milestone);
    return milestone;
  }

  /**
   * Update milestone progress
   */
  updateMilestoneProgress(milestoneId: string, progress: number): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.progress = Math.max(0, Math.min(100, progress));

    if (milestone.progress >= 100 && !milestone.completedDate) {
      milestone.completedDate = Date.now();
    }

    return true;
  }

  /**
   * Record an adaptation event
   */
  recordAdaptation(
    trigger: string,
    context: Record<string, unknown>,
    changes: AdaptationChange[]
  ): AdaptationEvent {
    const adaptation: AdaptationEvent = {
      id: this.generateId('adaptation'),
      timestamp: Date.now(),
      trigger,
      context,
      changes,
      metadata: {}
    };

    this.adaptations.set(adaptation.id, adaptation);

    // Apply changes to capabilities if relevant
    changes.forEach(change => {
      if (change.targetType === 'CAPABILITY') {
        const capability = this.capabilities.get(change.targetId);
        if (capability) {
          capability.developmentHistory.push({
            timestamp: Date.now(),
            eventType: 'OPTIMIZED',
            description: `Adapted due to: ${trigger}`,
            impact: [change.reasoning]
          });
        }
      }
    });

    return adaptation;
  }

  /**
   * Transition to a new evolution phase
   */
  transitionPhase(newPhase: EvolutionPhase, reason: string): void {
    const previousPhase = this.currentPhase;
    
    this.phaseTransitions.push({
      timestamp: Date.now(),
      from: previousPhase,
      to: newPhase,
      reason
    });

    this.currentPhase = newPhase;
  }

  /**
   * Get current evolution state
   */
  getEvolutionState(): {
    currentPhase: EvolutionPhase;
    totalCapabilities: number;
    deployedCapabilities: number;
    averageMaturity: number;
    completedMilestones: number;
    totalAdaptations: number;
  } {
    const capabilities = Array.from(this.capabilities.values());
    const deployedCapabilities = capabilities.filter(
      c => c.status === CapabilityStatus.DEPLOYED
    ).length;

    const averageMaturity = capabilities.length > 0
      ? capabilities.reduce((sum, c) => sum + c.maturityLevel, 0) / capabilities.length
      : 0;

    const completedMilestones = Array.from(this.milestones.values())
      .filter(m => m.completedDate)
      .length;

    return {
      currentPhase: this.currentPhase,
      totalCapabilities: capabilities.length,
      deployedCapabilities,
      averageMaturity,
      completedMilestones,
      totalAdaptations: this.adaptations.size
    };
  }

  /**
   * Get capability maturity report
   */
  getMaturityReport(): Array<{
    category: string;
    capabilities: number;
    averageMaturity: number;
    deployedCount: number;
  }> {
    const categories = new Map<string, Capability[]>();

    this.capabilities.forEach(capability => {
      if (!categories.has(capability.category)) {
        categories.set(capability.category, []);
      }
      categories.get(capability.category)!.push(capability);
    });

    return Array.from(categories.entries()).map(([category, caps]) => ({
      category,
      capabilities: caps.length,
      averageMaturity: caps.reduce((sum, c) => sum + c.maturityLevel, 0) / caps.length,
      deployedCount: caps.filter(c => c.status === CapabilityStatus.DEPLOYED).length
    }));
  }

  /**
   * Get adaptation effectiveness
   */
  getAdaptationEffectiveness(): {
    totalAdaptations: number;
    measuredAdaptations: number;
    averageEffectiveness: number;
    recentAdaptations: AdaptationEvent[];
  } {
    const adaptations = Array.from(this.adaptations.values());
    const measured = adaptations.filter(a => a.effectiveness !== undefined);
    
    const averageEffectiveness = measured.length > 0
      ? measured.reduce((sum, a) => sum + (a.effectiveness || 0), 0) / measured.length
      : 0;

    const recentAdaptations = adaptations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      totalAdaptations: adaptations.length,
      measuredAdaptations: measured.length,
      averageEffectiveness,
      recentAdaptations
    };
  }

  /**
   * Export evolution data
   */
  exportData(): {
    capabilities: Capability[];
    milestones: EvolutionMilestone[];
    adaptations: AdaptationEvent[];
    currentPhase: EvolutionPhase;
    phaseTransitions: typeof this.phaseTransitions;
  } {
    return {
      capabilities: Array.from(this.capabilities.values()),
      milestones: Array.from(this.milestones.values()),
      adaptations: Array.from(this.adaptations.values()),
      currentPhase: this.currentPhase,
      phaseTransitions: [...this.phaseTransitions]
    };
  }

  /**
   * Import evolution data
   */
  importData(data: {
    capabilities: Capability[];
    milestones: EvolutionMilestone[];
    adaptations: AdaptationEvent[];
    currentPhase: EvolutionPhase;
    phaseTransitions: typeof this.phaseTransitions;
  }): void {
    this.capabilities.clear();
    this.milestones.clear();
    this.adaptations.clear();

    data.capabilities.forEach(c => this.capabilities.set(c.id, c));
    data.milestones.forEach(m => this.milestones.set(m.id, m));
    data.adaptations.forEach(a => this.adaptations.set(a.id, a));

    this.currentPhase = data.currentPhase;
    this.phaseTransitions = [...data.phaseTransitions];
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
