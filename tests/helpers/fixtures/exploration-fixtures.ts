/**
 * Exploration Test Fixtures
 * 
 * Common exploration-related test data for transactional reasoning
 */

import { ExplorationContext, Checkpoint, CognitiveSnapshot } from '../../../src/reasoning/types';
import { CognitiveState } from '../../../src/types';

/**
 * Create a mock exploration context
 */
export function createMockExplorationContext(
  overrides?: Partial<ExplorationContext>
): ExplorationContext {
  return {
    description: 'Test exploration',
    riskLevel: 'medium',
    timeout: 5000,
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a low-risk exploration context
 */
export function createLowRiskContext(description: string = 'Low risk exploration'): ExplorationContext {
  return createMockExplorationContext({
    description,
    riskLevel: 'low',
    timeout: 10000,
  });
}

/**
 * Create a high-risk exploration context
 */
export function createHighRiskContext(description: string = 'High risk exploration'): ExplorationContext {
  return createMockExplorationContext({
    description,
    riskLevel: 'high',
    timeout: 3000,
  });
}

/**
 * Create a mock cognitive snapshot
 */
export function createMockCognitiveSnapshot(
  overrides?: Partial<CognitiveSnapshot>
): CognitiveSnapshot {
  return {
    state: CognitiveState.ACTIVE,
    timestamp: Date.now(),
    memoryState: [],
    knowledgeBase: new Map(),
    skills: new Map(),
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a mock checkpoint
 */
export function createMockCheckpoint(
  overrides?: Partial<Checkpoint>
): Checkpoint {
  return {
    id: `checkpoint-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    snapshot: createMockCognitiveSnapshot(),
    description: 'Test checkpoint',
    ...overrides,
  };
}

/**
 * Create multiple exploration contexts with varying risk levels
 */
export function createExplorationContextBatch(count: number = 5): ExplorationContext[] {
  const riskLevels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
  
  return Array.from({ length: count }, (_, i) => ({
    description: `Exploration ${i + 1}`,
    riskLevel: riskLevels[i % riskLevels.length],
    timeout: 5000,
    metadata: { index: i },
  }));
}
