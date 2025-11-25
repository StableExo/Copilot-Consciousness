/**
 * Autonomous Goals Tracker
 * 
 * Adapted from AxionCitadel's ctx_autonomous_goal.txt
 * Tracks autonomous objectives, their progress, and evolution over time
 */

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EVOLVED = 'EVOLVED'
}

export enum GoalPriority {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  BACKGROUND = 1
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  parentGoalId?: string;
  subGoals: string[];
  progress: number; // 0-100
  metrics: Record<string, number>;
  constraints: string[];
  successCriteria: string[];
  evolutionHistory: GoalEvolution[];
  metadata: Record<string, unknown>;
}

export interface GoalEvolution {
  timestamp: number;
  previousState: Partial<Goal>;
  newState: Partial<Goal>;
  reason: string;
  triggerEvent?: string;
}

/**
 * Autonomous Goal Tracking System
 * Enables the AI to track its own objectives and evolution
 */
export class AutonomousGoals {
  private goals: Map<string, Goal> = new Map();
  private activeGoals: Set<string> = new Set();

  /**
   * Create a new autonomous goal
   */
  createGoal(
    name: string,
    description: string,
    priority: GoalPriority = GoalPriority.MEDIUM,
    metadata: Record<string, unknown> = {}
  ): Goal {
    const goal: Goal = {
      id: this.generateId(),
      name,
      description,
      status: GoalStatus.ACTIVE,
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subGoals: [],
      progress: 0,
      metrics: {},
      constraints: [],
      successCriteria: [],
      evolutionHistory: [],
      metadata
    };

    this.goals.set(goal.id, goal);
    this.activeGoals.add(goal.id);
    return goal;
  }

  /**
   * Update goal progress
   */
  updateProgress(goalId: string, progress: number, metrics?: Record<string, number>): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    const previousState = { progress: goal.progress, metrics: { ...goal.metrics } };
    
    goal.progress = Math.max(0, Math.min(100, progress));
    goal.updatedAt = Date.now();

    if (metrics) {
      goal.metrics = { ...goal.metrics, ...metrics };
    }

    // Auto-complete if progress reaches 100%
    if (goal.progress >= 100 && goal.status === GoalStatus.ACTIVE) {
      this.completeGoal(goalId, 'Progress reached 100%');
    }

    // Record evolution
    goal.evolutionHistory.push({
      timestamp: Date.now(),
      previousState,
      newState: { progress: goal.progress, metrics: goal.metrics },
      reason: 'Progress update'
    });

    return true;
  }

  /**
   * Evolve a goal (adaptive goal modification)
   */
  evolveGoal(
    goalId: string,
    updates: Partial<Goal>,
    reason: string,
    triggerEvent?: string
  ): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    const previousState = { ...goal };

    // Apply updates
    Object.assign(goal, {
      ...updates,
      updatedAt: Date.now(),
      evolutionHistory: [
        ...goal.evolutionHistory,
        {
          timestamp: Date.now(),
          previousState,
          newState: updates,
          reason,
          triggerEvent
        }
      ]
    });

    return true;
  }

  /**
   * Complete a goal
   */
  completeGoal(goalId: string, completionNote?: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.status = GoalStatus.COMPLETED;
    goal.completedAt = Date.now();
    goal.updatedAt = Date.now();
    goal.progress = 100;

    if (completionNote) {
      goal.metadata.completionNote = completionNote;
    }

    this.activeGoals.delete(goalId);

    // Record completion evolution
    goal.evolutionHistory.push({
      timestamp: Date.now(),
      previousState: { status: GoalStatus.ACTIVE },
      newState: { status: GoalStatus.COMPLETED },
      reason: completionNote || 'Goal completed'
    });

    return true;
  }

  /**
   * Add a sub-goal to an existing goal
   */
  addSubGoal(parentGoalId: string, subGoalName: string, description: string): Goal | null {
    const parentGoal = this.goals.get(parentGoalId);
    if (!parentGoal) return null;

    const subGoal = this.createGoal(
      subGoalName,
      description,
      parentGoal.priority,
      { parentGoalId }
    );

    subGoal.parentGoalId = parentGoalId;
    parentGoal.subGoals.push(subGoal.id);
    parentGoal.updatedAt = Date.now();

    return subGoal;
  }

  /**
   * Get all active goals sorted by priority
   */
  getActiveGoals(): Goal[] {
    return Array.from(this.activeGoals)
      .map(id => this.goals.get(id))
      .filter((goal): goal is Goal => goal !== undefined)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get goal by ID
   */
  getGoal(goalId: string): Goal | null {
    return this.goals.get(goalId) || null;
  }

  /**
   * Get goals by status
   */
  getGoalsByStatus(status: GoalStatus): Goal[] {
    return Array.from(this.goals.values())
      .filter(goal => goal.status === status);
  }

  /**
   * Calculate aggregate progress across all active goals
   */
  getOverallProgress(): {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    averageProgress: number;
    priorityBreakdown: Record<GoalPriority, number>;
  } {
    const allGoals = Array.from(this.goals.values());
    const active = allGoals.filter(g => g.status === GoalStatus.ACTIVE);
    const completed = allGoals.filter(g => g.status === GoalStatus.COMPLETED);

    const averageProgress = active.length > 0
      ? active.reduce((sum, g) => sum + g.progress, 0) / active.length
      : 0;

    const priorityBreakdown: Record<GoalPriority, number> = {
      [GoalPriority.CRITICAL]: 0,
      [GoalPriority.HIGH]: 0,
      [GoalPriority.MEDIUM]: 0,
      [GoalPriority.LOW]: 0,
      [GoalPriority.BACKGROUND]: 0
    };

    active.forEach(goal => {
      priorityBreakdown[goal.priority]++;
    });

    return {
      totalGoals: allGoals.length,
      activeGoals: active.length,
      completedGoals: completed.length,
      averageProgress,
      priorityBreakdown
    };
  }

  /**
   * Get evolution history for a goal
   */
  getEvolutionHistory(goalId: string): GoalEvolution[] {
    const goal = this.goals.get(goalId);
    return goal?.evolutionHistory || [];
  }

  /**
   * Export goals for persistence
   */
  exportGoals(): Goal[] {
    return Array.from(this.goals.values());
  }

  /**
   * Import goals from persistence
   */
  importGoals(goals: Goal[]): void {
    this.goals.clear();
    this.activeGoals.clear();

    goals.forEach(goal => {
      this.goals.set(goal.id, goal);
      if (goal.status === GoalStatus.ACTIVE) {
        this.activeGoals.add(goal.id);
      }
    });
  }

  private generateId(): string {
    return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
