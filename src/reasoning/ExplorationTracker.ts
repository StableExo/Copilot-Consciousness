/**
 * Exploration Tracker
 *
 * Tracks speculative reasoning attempts, records patterns,
 * and learns from failed explorations.
 */

import { generateUUID } from '../utils/uuid';
import { ExplorationAttempt, ExplorationContext, ExplorationStats, FailurePattern } from './types';

export class ExplorationTracker {
  private explorations: Map<string, ExplorationAttempt> = new Map();
  private failurePatterns: Map<string, FailurePattern> = new Map();
  private readonly maxHistory: number;

  constructor(maxHistory: number = 1000) {
    this.maxHistory = maxHistory;
  }

  /**
   * Start tracking a new exploration
   */
  startExploration(context: ExplorationContext, checkpointId: string): string {
    const explorationId = generateUUID();
    const attempt: ExplorationAttempt = {
      id: explorationId,
      context,
      startTime: Date.now(),
      success: false,
      rolledBack: false,
      checkpointId,
    };

    this.explorations.set(explorationId, attempt);

    // Enforce history limit
    if (this.explorations.size > this.maxHistory) {
      this.removeOldestExploration();
    }

    return explorationId;
  }

  /**
   * Record successful exploration completion
   */
  recordSuccess(explorationId: string): void {
    const attempt = this.explorations.get(explorationId);
    if (attempt) {
      attempt.success = true;
      attempt.endTime = Date.now();
    }
  }

  /**
   * Record failed exploration
   */
  recordFailure(explorationId: string, reason: string, ethicsViolation: boolean = false): void {
    const attempt = this.explorations.get(explorationId);
    if (attempt) {
      attempt.success = false;
      attempt.endTime = Date.now();
      attempt.failureReason = reason;
      attempt.ethicsViolation = ethicsViolation;

      // Track failure pattern
      this.recordFailurePattern(attempt.context.description, reason, explorationId);
    }
  }

  /**
   * Record that exploration was rolled back
   */
  recordRollback(explorationId: string): void {
    const attempt = this.explorations.get(explorationId);
    if (attempt) {
      attempt.rolledBack = true;
      if (!attempt.endTime) {
        attempt.endTime = Date.now();
      }
    }
  }

  /**
   * Get exploration attempt by ID
   */
  getExploration(explorationId: string): ExplorationAttempt | null {
    return this.explorations.get(explorationId) || null;
  }

  /**
   * Get all explorations
   */
  getAllExplorations(): ExplorationAttempt[] {
    return Array.from(this.explorations.values()).sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get exploration statistics
   */
  getStats(): ExplorationStats {
    const explorations = Array.from(this.explorations.values());
    const total = explorations.length;
    const successful = explorations.filter((e) => e.success).length;
    const failed = explorations.filter((e) => !e.success).length;
    const ethicsViolations = explorations.filter((e) => e.ethicsViolation).length;
    const rolledBack = explorations.filter((e) => e.rolledBack).length;

    const completedExplorations = explorations.filter((e) => e.endTime);
    const totalDuration = completedExplorations.reduce(
      (sum, e) => sum + ((e.endTime || 0) - e.startTime),
      0
    );
    const averageDuration =
      completedExplorations.length > 0 ? totalDuration / completedExplorations.length : 0;

    return {
      totalExplorations: total,
      successfulExplorations: successful,
      failedExplorations: failed,
      ethicsViolations,
      rollbacks: rolledBack,
      averageDuration,
      successRate: total > 0 ? successful / total : 0,
      rollbackRate: total > 0 ? rolledBack / total : 0,
    };
  }

  /**
   * Get failure patterns
   */
  getFailurePatterns(): FailurePattern[] {
    return Array.from(this.failurePatterns.values()).sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Get a specific failure pattern
   */
  getFailurePattern(context: string): FailurePattern | null {
    return this.failurePatterns.get(context) || null;
  }

  /**
   * Check if a context has failed before
   */
  hasPreviousFailure(context: string): boolean {
    return this.failurePatterns.has(context);
  }

  /**
   * Get recent explorations within time window
   */
  getRecentExplorations(timeWindowMs: number): ExplorationAttempt[] {
    const now = Date.now();
    return Array.from(this.explorations.values())
      .filter((e) => now - e.startTime <= timeWindowMs)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get explorations by risk level
   */
  getExplorationsByRisk(riskLevel: 'low' | 'medium' | 'high' | 'critical'): ExplorationAttempt[] {
    return Array.from(this.explorations.values())
      .filter((e) => e.context.riskLevel === riskLevel)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Clear all exploration history
   */
  clear(): void {
    this.explorations.clear();
    this.failurePatterns.clear();
  }

  /**
   * Record a failure pattern
   */
  private recordFailurePattern(context: string, reason: string, explorationId: string): void {
    const existing = this.failurePatterns.get(context);

    if (existing) {
      existing.occurrences++;
      existing.lastSeen = Date.now();
      existing.relatedExplorations.push(explorationId);
    } else {
      const pattern: FailurePattern = {
        context,
        reason,
        occurrences: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        relatedExplorations: [explorationId],
      };
      this.failurePatterns.set(context, pattern);
    }
  }

  /**
   * Remove oldest exploration to maintain history limit
   */
  private removeOldestExploration(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, exploration] of this.explorations) {
      if (exploration.startTime < oldestTime) {
        oldestTime = exploration.startTime;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.explorations.delete(oldestId);
    }
  }
}
