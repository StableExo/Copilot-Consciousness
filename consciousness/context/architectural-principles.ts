/**
 * Architectural Principles Tracker
 * 
 * Adapted from AxionCitadel's ctx_architectural_principles_and_evolution.txt
 * Tracks architectural principles and their evolution over time
 */

export enum PrincipleCategory {
  DESIGN = 'DESIGN',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  SCALABILITY = 'SCALABILITY',
  MAINTAINABILITY = 'MAINTAINABILITY',
  RELIABILITY = 'RELIABILITY'
}

export enum AdherenceLevel {
  STRICT = 'STRICT',
  MODERATE = 'MODERATE',
  FLEXIBLE = 'FLEXIBLE',
  DEPRECATED = 'DEPRECATED'
}

export interface ArchitecturalPrinciple {
  id: string;
  name: string;
  category: PrincipleCategory;
  description: string;
  rationale: string;
  adherenceLevel: AdherenceLevel;
  exceptions: PrincipleException[];
  evolutionHistory: PrincipleEvolution[];
  relatedPrinciples: string[];
  violations: PrincipleViolation[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface PrincipleException {
  id: string;
  timestamp: number;
  reason: string;
  context: string;
  approvedBy: string;
  expiresAt?: number;
}

export interface PrincipleEvolution {
  timestamp: number;
  previousVersion: string;
  newVersion: string;
  changes: string[];
  justification: string;
  impact: string[];
}

export interface PrincipleViolation {
  id: string;
  timestamp: number;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  remediation?: string;
  remediatedAt?: number;
}

export interface ArchitecturalDecision {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  context: string;
  alternatives: string[];
  decision: string;
  consequences: string[];
  affectedPrinciples: string[];
  metadata: Record<string, unknown>;
}

/**
 * Architectural Principles System
 * Tracks and enforces architectural principles and their evolution
 */
export class ArchitecturalPrinciples {
  private principles: Map<string, ArchitecturalPrinciple> = new Map();
  private decisions: Map<string, ArchitecturalDecision> = new Map();

  /**
   * Define a new architectural principle
   */
  definePrinciple(
    name: string,
    category: PrincipleCategory,
    description: string,
    rationale: string,
    adherenceLevel: AdherenceLevel = AdherenceLevel.STRICT
  ): ArchitecturalPrinciple {
    const principle: ArchitecturalPrinciple = {
      id: this.generateId('principle'),
      name,
      category,
      description,
      rationale,
      adherenceLevel,
      exceptions: [],
      evolutionHistory: [],
      relatedPrinciples: [],
      violations: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };

    this.principles.set(principle.id, principle);
    return principle;
  }

  /**
   * Evolve an existing principle
   */
  evolvePrinciple(
    principleId: string,
    newDescription: string,
    changes: string[],
    justification: string,
    impact: string[]
  ): boolean {
    const principle = this.principles.get(principleId);
    if (!principle) return false;

    const evolution: PrincipleEvolution = {
      timestamp: Date.now(),
      previousVersion: principle.description,
      newVersion: newDescription,
      changes,
      justification,
      impact
    };

    principle.evolutionHistory.push(evolution);
    principle.description = newDescription;
    principle.updatedAt = Date.now();

    return true;
  }

  /**
   * Record a principle violation
   */
  recordViolation(
    principleId: string,
    description: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  ): PrincipleViolation | null {
    const principle = this.principles.get(principleId);
    if (!principle) return null;

    const violation: PrincipleViolation = {
      id: this.generateId('violation'),
      timestamp: Date.now(),
      description,
      severity
    };

    principle.violations.push(violation);
    principle.updatedAt = Date.now();

    return violation;
  }

  /**
   * Remediate a violation
   */
  remediateViolation(principleId: string, violationId: string, remediation: string): boolean {
    const principle = this.principles.get(principleId);
    if (!principle) return false;

    const violation = principle.violations.find(v => v.id === violationId);
    if (!violation) return false;

    violation.remediation = remediation;
    violation.remediatedAt = Date.now();
    principle.updatedAt = Date.now();

    return true;
  }

  /**
   * Add an exception to a principle
   */
  addException(
    principleId: string,
    reason: string,
    context: string,
    approvedBy: string,
    expiresAt?: number
  ): PrincipleException | null {
    const principle = this.principles.get(principleId);
    if (!principle) return null;

    const exception: PrincipleException = {
      id: this.generateId('exception'),
      timestamp: Date.now(),
      reason,
      context,
      approvedBy,
      expiresAt
    };

    principle.exceptions.push(exception);
    principle.updatedAt = Date.now();

    return exception;
  }

  /**
   * Record an architectural decision
   */
  recordDecision(
    title: string,
    description: string,
    context: string,
    alternatives: string[],
    decision: string,
    consequences: string[],
    affectedPrinciples: string[]
  ): ArchitecturalDecision {
    const record: ArchitecturalDecision = {
      id: this.generateId('decision'),
      timestamp: Date.now(),
      title,
      description,
      context,
      alternatives,
      decision,
      consequences,
      affectedPrinciples,
      metadata: {}
    };

    this.decisions.set(record.id, record);

    // Update affected principles
    affectedPrinciples.forEach(principleId => {
      const principle = this.principles.get(principleId);
      if (principle) {
        if (!principle.metadata.relatedDecisions) {
          principle.metadata.relatedDecisions = [];
        }
        (principle.metadata.relatedDecisions as string[]).push(record.id);
      }
    });

    return record;
  }

  /**
   * Get principle by ID
   */
  getPrinciple(principleId: string): ArchitecturalPrinciple | null {
    return this.principles.get(principleId) || null;
  }

  /**
   * Get principles by category
   */
  getPrinciplesByCategory(category: PrincipleCategory): ArchitecturalPrinciple[] {
    return Array.from(this.principles.values())
      .filter(p => p.category === category);
  }

  /**
   * Get all active violations
   */
  getActiveViolations(severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): Array<{
    principle: ArchitecturalPrinciple;
    violation: PrincipleViolation;
  }> {
    const violations: Array<{ principle: ArchitecturalPrinciple; violation: PrincipleViolation }> = [];

    this.principles.forEach(principle => {
      principle.violations
        .filter(v => !v.remediatedAt)
        .filter(v => !severity || v.severity === severity)
        .forEach(violation => {
          violations.push({ principle, violation });
        });
    });

    return violations.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.violation.severity] - severityOrder[a.violation.severity];
    });
  }

  /**
   * Get compliance metrics
   */
  getComplianceMetrics(): {
    totalPrinciples: number;
    byCategory: Record<PrincipleCategory, number>;
    activeViolations: number;
    remediatedViolations: number;
    activeExceptions: number;
    complianceRate: number;
  } {
    const principles = Array.from(this.principles.values());
    
    const byCategory: Record<PrincipleCategory, number> = {
      [PrincipleCategory.DESIGN]: 0,
      [PrincipleCategory.PERFORMANCE]: 0,
      [PrincipleCategory.SECURITY]: 0,
      [PrincipleCategory.SCALABILITY]: 0,
      [PrincipleCategory.MAINTAINABILITY]: 0,
      [PrincipleCategory.RELIABILITY]: 0
    };

    principles.forEach(p => {
      byCategory[p.category]++;
    });

    const allViolations = principles.flatMap(p => p.violations);
    const activeViolations = allViolations.filter(v => !v.remediatedAt).length;
    const remediatedViolations = allViolations.filter(v => v.remediatedAt).length;

    const now = Date.now();
    const activeExceptions = principles.flatMap(p => p.exceptions)
      .filter(e => !e.expiresAt || e.expiresAt > now)
      .length;

    const complianceRate = allViolations.length > 0
      ? remediatedViolations / allViolations.length
      : 1.0;

    return {
      totalPrinciples: principles.length,
      byCategory,
      activeViolations,
      remediatedViolations,
      activeExceptions,
      complianceRate
    };
  }

  /**
   * Get evolution timeline
   */
  getEvolutionTimeline(): Array<{
    timestamp: number;
    principleId: string;
    principleName: string;
    evolution: PrincipleEvolution;
  }> {
    const timeline: Array<{
      timestamp: number;
      principleId: string;
      principleName: string;
      evolution: PrincipleEvolution;
    }> = [];

    this.principles.forEach(principle => {
      principle.evolutionHistory.forEach(evolution => {
        timeline.push({
          timestamp: evolution.timestamp,
          principleId: principle.id,
          principleName: principle.name,
          evolution
        });
      });
    });

    return timeline.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Export principles for persistence
   */
  exportPrinciples(): {
    principles: ArchitecturalPrinciple[];
    decisions: ArchitecturalDecision[];
  } {
    return {
      principles: Array.from(this.principles.values()),
      decisions: Array.from(this.decisions.values())
    };
  }

  /**
   * Import principles from persistence
   */
  importPrinciples(data: {
    principles: ArchitecturalPrinciple[];
    decisions: ArchitecturalDecision[];
  }): void {
    this.principles.clear();
    this.decisions.clear();

    data.principles.forEach(principle => {
      this.principles.set(principle.id, principle);
    });

    data.decisions.forEach(decision => {
      this.decisions.set(decision.id, decision);
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
