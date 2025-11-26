/**
 * Operational Playbook
 *
 * Adapted from AxionCitadel's ctx_operational_playbook.txt
 * Defines operational decision-making procedures and best practices
 */

export enum OperationType {
  ANALYSIS = 'ANALYSIS',
  DECISION = 'DECISION',
  EXECUTION = 'EXECUTION',
  MONITORING = 'MONITORING',
  RECOVERY = 'RECOVERY',
}

export enum DecisionConfidence {
  VERY_HIGH = 0.9,
  HIGH = 0.75,
  MEDIUM = 0.5,
  LOW = 0.25,
  VERY_LOW = 0.1,
}

export interface PlaybookEntry {
  id: string;
  name: string;
  operationType: OperationType;
  description: string;
  triggerConditions: string[];
  preconditions: string[];
  steps: OperationalStep[];
  expectedOutcomes: string[];
  successMetrics: Record<string, number>;
  fallbackProcedures: string[];
  lessons: PlaybookLesson[];
  usageCount: number;
  successRate: number;
  lastUsed?: number;
  metadata: Record<string, unknown>;
}

export interface OperationalStep {
  order: number;
  action: string;
  description: string;
  requiredInputs: string[];
  expectedOutputs: string[];
  validationCriteria: string[];
  estimatedDuration?: number;
  criticalStep: boolean;
}

export interface PlaybookLesson {
  timestamp: number;
  context: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  insights: string[];
  adjustments: string[];
}

export interface DecisionRecord {
  id: string;
  timestamp: number;
  playbookId: string;
  context: Record<string, unknown>;
  alternatives: DecisionAlternative[];
  selectedAlternative: string;
  confidence: DecisionConfidence;
  reasoning: string[];
  outcome?: {
    success: boolean;
    actualResults: Record<string, unknown>;
    deviations: string[];
  };
}

export interface DecisionAlternative {
  id: string;
  name: string;
  description: string;
  estimatedRisk: number; // 0-1
  estimatedReward: number; // 0-1
  requiredResources: string[];
  constraints: string[];
  score: number;
}

/**
 * Operational Playbook System
 * Maintains decision-making procedures and learns from outcomes
 */
export class OperationalPlaybook {
  private playbooks: Map<string, PlaybookEntry> = new Map();
  private decisions: Map<string, DecisionRecord> = new Map();
  private activeOperations: Map<
    string,
    { playbookId: string; startTime: number; currentStep: number }
  > = new Map();

  /**
   * Register a new playbook entry
   */
  registerPlaybook(
    name: string,
    operationType: OperationType,
    description: string,
    steps: OperationalStep[]
  ): PlaybookEntry {
    const playbook: PlaybookEntry = {
      id: this.generateId('playbook'),
      name,
      operationType,
      description,
      triggerConditions: [],
      preconditions: [],
      steps,
      expectedOutcomes: [],
      successMetrics: {},
      fallbackProcedures: [],
      lessons: [],
      usageCount: 0,
      successRate: 0,
      metadata: {},
    };

    this.playbooks.set(playbook.id, playbook);
    return playbook;
  }

  /**
   * Execute a decision-making process
   */
  makeDecision(
    playbookId: string,
    context: Record<string, unknown>,
    alternatives: DecisionAlternative[]
  ): DecisionRecord {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook ${playbookId} not found`);
    }

    // Score alternatives
    const scoredAlternatives = this.scoreAlternatives(alternatives, context);

    // Select best alternative
    const selected = scoredAlternatives.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Calculate confidence based on score separation
    const confidence = this.calculateConfidence(scoredAlternatives);

    const decision: DecisionRecord = {
      id: this.generateId('decision'),
      timestamp: Date.now(),
      playbookId,
      context,
      alternatives: scoredAlternatives,
      selectedAlternative: selected.id,
      confidence,
      reasoning: this.generateReasoning(selected, scoredAlternatives, context),
    };

    this.decisions.set(decision.id, decision);
    playbook.usageCount++;
    playbook.lastUsed = Date.now();

    return decision;
  }

  /**
   * Record the outcome of a decision
   */
  recordOutcome(
    decisionId: string,
    success: boolean,
    actualResults: Record<string, unknown>,
    deviations: string[] = []
  ): void {
    const decision = this.decisions.get(decisionId);
    if (!decision) return;

    decision.outcome = {
      success,
      actualResults,
      deviations,
    };

    // Update playbook success rate
    const playbook = this.playbooks.get(decision.playbookId);
    if (playbook) {
      const totalDecisions = Array.from(this.decisions.values()).filter(
        (d) => d.playbookId === decision.playbookId && d.outcome
      ).length;

      const successfulDecisions = Array.from(this.decisions.values()).filter(
        (d) => d.playbookId === decision.playbookId && d.outcome?.success
      ).length;

      playbook.successRate = totalDecisions > 0 ? successfulDecisions / totalDecisions : 0;

      // Add lesson learned
      this.addLesson(playbook.id, {
        timestamp: Date.now(),
        context: JSON.stringify(decision.context),
        outcome: success ? 'SUCCESS' : 'FAILURE',
        insights: deviations,
        adjustments: [],
      });
    }
  }

  /**
   * Add a lesson learned to a playbook
   */
  addLesson(playbookId: string, lesson: PlaybookLesson): boolean {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return false;

    playbook.lessons.push(lesson);

    // Keep only recent lessons (last 100)
    if (playbook.lessons.length > 100) {
      playbook.lessons = playbook.lessons.slice(-100);
    }

    return true;
  }

  /**
   * Get recommended playbook for a given situation
   */
  recommendPlaybook(
    operationType: OperationType,
    context: Record<string, unknown>
  ): PlaybookEntry | null {
    const candidates = Array.from(this.playbooks.values())
      .filter((p) => p.operationType === operationType)
      .map((playbook) => ({
        playbook,
        score: this.scorePlaybook(playbook, context),
      }))
      .sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0].playbook : null;
  }

  /**
   * Get playbook by ID
   */
  getPlaybook(playbookId: string): PlaybookEntry | null {
    return this.playbooks.get(playbookId) || null;
  }

  /**
   * Get all playbooks of a specific type
   */
  getPlaybooksByType(operationType: OperationType): PlaybookEntry[] {
    return Array.from(this.playbooks.values())
      .filter((p) => p.operationType === operationType)
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(limit: number = 100): DecisionRecord[] {
    return Array.from(this.decisions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get performance metrics for a playbook
   */
  getPlaybookMetrics(playbookId: string): {
    usageCount: number;
    successRate: number;
    averageConfidence: number;
    recentLessons: PlaybookLesson[];
  } | null {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return null;

    const decisions = Array.from(this.decisions.values()).filter(
      (d) => d.playbookId === playbookId
    );

    const averageConfidence =
      decisions.length > 0
        ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
        : 0;

    return {
      usageCount: playbook.usageCount,
      successRate: playbook.successRate,
      averageConfidence,
      recentLessons: playbook.lessons.slice(-10),
    };
  }

  /**
   * Export playbooks for persistence
   */
  exportPlaybooks(): PlaybookEntry[] {
    return Array.from(this.playbooks.values());
  }

  /**
   * Import playbooks from persistence
   */
  importPlaybooks(playbooks: PlaybookEntry[]): void {
    this.playbooks.clear();
    playbooks.forEach((playbook) => {
      this.playbooks.set(playbook.id, playbook);
    });
  }

  private scoreAlternatives(
    alternatives: DecisionAlternative[],
    context: Record<string, unknown>
  ): DecisionAlternative[] {
    return alternatives.map((alt) => ({
      ...alt,
      score: this.calculateAlternativeScore(alt, context),
    }));
  }

  private calculateAlternativeScore(
    alternative: DecisionAlternative,
    context: Record<string, unknown>
  ): number {
    // Simple risk-reward scoring
    const riskWeight = 0.4;
    const rewardWeight = 0.6;

    return (
      (1 - alternative.estimatedRisk) * riskWeight + alternative.estimatedReward * rewardWeight
    );
  }

  private calculateConfidence(alternatives: DecisionAlternative[]): DecisionConfidence {
    if (alternatives.length < 2) return DecisionConfidence.MEDIUM;

    const sorted = [...alternatives].sort((a, b) => b.score - a.score);
    const scoreDifference = sorted[0].score - sorted[1].score;

    if (scoreDifference >= 0.5) return DecisionConfidence.VERY_HIGH;
    if (scoreDifference >= 0.3) return DecisionConfidence.HIGH;
    if (scoreDifference >= 0.15) return DecisionConfidence.MEDIUM;
    if (scoreDifference >= 0.05) return DecisionConfidence.LOW;
    return DecisionConfidence.VERY_LOW;
  }

  private generateReasoning(
    selected: DecisionAlternative,
    alternatives: DecisionAlternative[],
    context: Record<string, unknown>
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Selected alternative: ${selected.name}`);
    reasoning.push(`Score: ${selected.score.toFixed(3)}`);
    reasoning.push(
      `Risk: ${selected.estimatedRisk.toFixed(3)}, Reward: ${selected.estimatedReward.toFixed(3)}`
    );

    if (alternatives.length > 1) {
      const otherOptions = alternatives.filter((a) => a.id !== selected.id);
      reasoning.push(`Rejected ${otherOptions.length} alternatives with lower scores`);
    }

    return reasoning;
  }

  private scorePlaybook(playbook: PlaybookEntry, context: Record<string, unknown>): number {
    // Score based on success rate and recency
    const successScore = playbook.successRate * 0.7;
    const recencyScore = playbook.lastUsed
      ? Math.max(0, 1 - (Date.now() - playbook.lastUsed) / (1000 * 60 * 60 * 24 * 30)) * 0.3
      : 0;

    return successScore + recencyScore;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
