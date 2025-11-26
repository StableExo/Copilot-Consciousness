/**
 * Vision and Mission Framework
 *
 * Adapted from AxionCitadel's ctx_vision_mission.txt
 * Maintains strategic vision and mission alignment across sessions
 */

export interface VisionStatement {
  id: string;
  statement: string;
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'VISIONARY';
  alignmentScore: number; // 0-1
  createdAt: number;
  revisedAt?: number;
  revisionHistory: VisionRevision[];
  metadata: Record<string, unknown>;
}

export interface MissionStatement {
  id: string;
  statement: string;
  purpose: string;
  scope: string[];
  coreValues: string[];
  stakeholders: string[];
  successIndicators: string[];
  createdAt: number;
  updatedAt: number;
  alignmentChecks: AlignmentCheck[];
  metadata: Record<string, unknown>;
}

export interface VisionRevision {
  timestamp: number;
  previousStatement: string;
  newStatement: string;
  reason: string;
  triggerEvent?: string;
}

export interface AlignmentCheck {
  timestamp: number;
  checkType: 'GOAL' | 'DECISION' | 'ACTION' | 'OUTCOME';
  itemId: string;
  aligned: boolean;
  deviationScore: number; // 0-1, where 0 is perfect alignment
  notes: string;
}

export interface StrategicObjective {
  id: string;
  name: string;
  description: string;
  linkedVisionId: string;
  linkedMissionId: string;
  keyResults: KeyResult[];
  dependencies: string[];
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  progress: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface KeyResult {
  id: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  deadline?: number;
}

/**
 * Vision and Mission System
 * Maintains strategic alignment and tracks vision evolution
 */
export class VisionMission {
  private visions: Map<string, VisionStatement> = new Map();
  private missions: Map<string, MissionStatement> = new Map();
  private objectives: Map<string, StrategicObjective> = new Map();
  private currentVisionId: string | null = null;
  private currentMissionId: string | null = null;

  /**
   * Define a vision statement
   */
  defineVision(
    statement: string,
    timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'VISIONARY'
  ): VisionStatement {
    const vision: VisionStatement = {
      id: this.generateId('vision'),
      statement,
      timeHorizon,
      alignmentScore: 1.0,
      createdAt: Date.now(),
      revisionHistory: [],
      metadata: {},
    };

    this.visions.set(vision.id, vision);

    // Set as current if first vision
    if (!this.currentVisionId) {
      this.currentVisionId = vision.id;
    }

    return vision;
  }

  /**
   * Define a mission statement
   */
  defineMission(
    statement: string,
    purpose: string,
    scope: string[],
    coreValues: string[]
  ): MissionStatement {
    const mission: MissionStatement = {
      id: this.generateId('mission'),
      statement,
      purpose,
      scope,
      coreValues,
      stakeholders: [],
      successIndicators: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      alignmentChecks: [],
      metadata: {},
    };

    this.missions.set(mission.id, mission);

    // Set as current if first mission
    if (!this.currentMissionId) {
      this.currentMissionId = mission.id;
    }

    return mission;
  }

  /**
   * Revise the current vision
   */
  reviseVision(newStatement: string, reason: string, triggerEvent?: string): boolean {
    if (!this.currentVisionId) return false;

    const vision = this.visions.get(this.currentVisionId);
    if (!vision) return false;

    const revision: VisionRevision = {
      timestamp: Date.now(),
      previousStatement: vision.statement,
      newStatement,
      reason,
      triggerEvent,
    };

    vision.revisionHistory.push(revision);
    vision.statement = newStatement;
    vision.revisedAt = Date.now();

    return true;
  }

  /**
   * Check alignment of an item with current mission/vision
   */
  checkAlignment(
    checkType: 'GOAL' | 'DECISION' | 'ACTION' | 'OUTCOME',
    itemId: string,
    itemDescription: string
  ): {
    aligned: boolean;
    deviationScore: number;
    recommendations: string[];
  } {
    if (!this.currentMissionId) {
      return {
        aligned: false,
        deviationScore: 1.0,
        recommendations: ['No mission statement defined'],
      };
    }

    const mission = this.missions.get(this.currentMissionId);
    if (!mission) {
      return {
        aligned: false,
        deviationScore: 1.0,
        recommendations: ['Mission statement not found'],
      };
    }

    // Simple alignment check based on keyword matching
    const missionText = mission.statement.toLowerCase();
    const itemText = itemDescription.toLowerCase();
    const coreValuesText = mission.coreValues.join(' ').toLowerCase();

    const alignmentScore = this.calculateAlignment(itemText, missionText, coreValuesText);
    const aligned = alignmentScore < 0.5; // Threshold for alignment

    const check: AlignmentCheck = {
      timestamp: Date.now(),
      checkType,
      itemId,
      aligned,
      deviationScore: alignmentScore,
      notes: itemDescription,
    };

    mission.alignmentChecks.push(check);
    mission.updatedAt = Date.now();

    const recommendations: string[] = [];
    if (!aligned) {
      recommendations.push('Item deviates from mission statement');
      recommendations.push('Consider revising or justifying the deviation');
    }

    return { aligned, deviationScore: alignmentScore, recommendations };
  }

  /**
   * Create a strategic objective
   */
  createObjective(
    name: string,
    description: string,
    keyResults: Omit<KeyResult, 'id'>[]
  ): StrategicObjective | null {
    if (!this.currentVisionId || !this.currentMissionId) {
      return null;
    }

    const objective: StrategicObjective = {
      id: this.generateId('objective'),
      name,
      description,
      linkedVisionId: this.currentVisionId,
      linkedMissionId: this.currentMissionId,
      keyResults: keyResults.map((kr) => ({
        ...kr,
        id: this.generateId('kr'),
      })),
      dependencies: [],
      status: 'PLANNING',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.objectives.set(objective.id, objective);
    return objective;
  }

  /**
   * Update key result progress
   */
  updateKeyResult(objectiveId: string, keyResultId: string, currentValue: number): boolean {
    const objective = this.objectives.get(objectiveId);
    if (!objective) return false;

    const keyResult = objective.keyResults.find((kr) => kr.id === keyResultId);
    if (!keyResult) return false;

    keyResult.current = currentValue;

    // Update objective progress
    const totalProgress = objective.keyResults.reduce((sum, kr) => {
      const krProgress = Math.min(100, (kr.current / kr.target) * 100);
      return sum + krProgress;
    }, 0);

    objective.progress = totalProgress / objective.keyResults.length;
    objective.updatedAt = Date.now();

    // Auto-complete if all key results met
    if (objective.keyResults.every((kr) => kr.current >= kr.target)) {
      objective.status = 'COMPLETED';
    }

    return true;
  }

  /**
   * Get current vision and mission
   */
  getCurrent(): {
    vision: VisionStatement | null;
    mission: MissionStatement | null;
  } {
    return {
      vision: this.currentVisionId ? this.visions.get(this.currentVisionId) || null : null,
      mission: this.currentMissionId ? this.missions.get(this.currentMissionId) || null : null,
    };
  }

  /**
   * Get alignment metrics
   */
  getAlignmentMetrics(): {
    totalChecks: number;
    alignedCount: number;
    misalignedCount: number;
    averageDeviation: number;
    recentMisalignments: AlignmentCheck[];
  } {
    const mission = this.currentMissionId ? this.missions.get(this.currentMissionId) : null;
    if (!mission) {
      return {
        totalChecks: 0,
        alignedCount: 0,
        misalignedCount: 0,
        averageDeviation: 0,
        recentMisalignments: [],
      };
    }

    const checks = mission.alignmentChecks;
    const alignedCount = checks.filter((c) => c.aligned).length;
    const misalignedCount = checks.filter((c) => !c.aligned).length;
    const averageDeviation =
      checks.length > 0 ? checks.reduce((sum, c) => sum + c.deviationScore, 0) / checks.length : 0;

    const recentMisalignments = checks
      .filter((c) => !c.aligned)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      totalChecks: checks.length,
      alignedCount,
      misalignedCount,
      averageDeviation,
      recentMisalignments,
    };
  }

  /**
   * Get active objectives
   */
  getActiveObjectives(): StrategicObjective[] {
    return Array.from(this.objectives.values())
      .filter((obj) => obj.status === 'ACTIVE' || obj.status === 'PLANNING')
      .sort((a, b) => b.progress - a.progress);
  }

  /**
   * Export vision/mission data
   */
  exportData(): {
    visions: VisionStatement[];
    missions: MissionStatement[];
    objectives: StrategicObjective[];
    currentVisionId: string | null;
    currentMissionId: string | null;
  } {
    return {
      visions: Array.from(this.visions.values()),
      missions: Array.from(this.missions.values()),
      objectives: Array.from(this.objectives.values()),
      currentVisionId: this.currentVisionId,
      currentMissionId: this.currentMissionId,
    };
  }

  /**
   * Import vision/mission data
   */
  importData(data: {
    visions: VisionStatement[];
    missions: MissionStatement[];
    objectives: StrategicObjective[];
    currentVisionId: string | null;
    currentMissionId: string | null;
  }): void {
    this.visions.clear();
    this.missions.clear();
    this.objectives.clear();

    data.visions.forEach((v) => this.visions.set(v.id, v));
    data.missions.forEach((m) => this.missions.set(m.id, m));
    data.objectives.forEach((o) => this.objectives.set(o.id, o));

    this.currentVisionId = data.currentVisionId;
    this.currentMissionId = data.currentMissionId;
  }

  private calculateAlignment(
    itemText: string,
    missionText: string,
    coreValuesText: string
  ): number {
    // Simple word overlap scoring
    const itemWords = new Set(itemText.split(/\s+/));
    const missionWords = new Set(missionText.split(/\s+/));
    const valueWords = new Set(coreValuesText.split(/\s+/));

    let overlap = 0;
    itemWords.forEach((word) => {
      if (missionWords.has(word) || valueWords.has(word)) {
        overlap++;
      }
    });

    const maxPossible = itemWords.size;
    return maxPossible > 0 ? 1 - overlap / maxPossible : 1.0;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
