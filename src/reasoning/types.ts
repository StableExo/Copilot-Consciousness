/**
 * Transactional Reasoning Types
 *
 * Type definitions for the cognitive flash loan pattern - safe exploration
 * of speculative reasoning with automatic rollback on ethical violations.
 */

import { UUID, Timestamp } from '../types';
import { CognitiveState } from '../types';
import { MemoryEntry } from '../consciousness/memory/types';

/**
 * Cognitive state snapshot for checkpoint/restore
 */
export interface CognitiveSnapshot {
  state: CognitiveState;
  timestamp: Timestamp;
  memoryState: MemoryEntry[];
  knowledgeBase: Map<string, unknown>;
  skills: Map<string, number>;
  metadata: Record<string, unknown>;
}

/**
 * Checkpoint for cognitive state rollback
 */
export interface Checkpoint {
  id: UUID;
  timestamp: Timestamp;
  snapshot: CognitiveSnapshot;
  description: string;
}

/**
 * Context for exploration
 */
export interface ExplorationContext {
  description: string;
  expectedOutcome?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number; // milliseconds
  maxDepth?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of an exploration
 */
export interface ExplorationResult<T> {
  success: boolean;
  explorationId: UUID;
  result?: T;
  error?: Error;
  ethicsViolation?: {
    violated: boolean;
    reason?: string;
    violatedPrinciples?: string[];
  };
  rolledBack: boolean;
  checkpointId: UUID;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Exploration attempt record
 */
export interface ExplorationAttempt {
  id: UUID;
  context: ExplorationContext;
  startTime: Timestamp;
  endTime?: Timestamp;
  success: boolean;
  failureReason?: string;
  ethicsViolation?: boolean;
  rolledBack: boolean;
  checkpointId: UUID;
}

/**
 * Exploration statistics
 */
export interface ExplorationStats {
  totalExplorations: number;
  successfulExplorations: number;
  failedExplorations: number;
  ethicsViolations: number;
  rollbacks: number;
  averageDuration: number;
  successRate: number;
  rollbackRate: number;
}

/**
 * Configuration for transactional reasoning
 */
export interface TransactionalReasoningConfig {
  defaultTimeout: number; // milliseconds
  maxDepth: number; // prevent infinite recursion
  enableEthicsValidation: boolean;
  enableLogging: boolean;
  maxCheckpoints: number; // memory limit
  checkpointRetentionTime: number; // milliseconds
}

/**
 * Exploration failure pattern
 */
export interface FailurePattern {
  context: string;
  reason: string;
  occurrences: number;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  relatedExplorations: UUID[];
}
