/**
 * Memory Test Fixtures
 * 
 * Common memory-related test data
 */

import { MemoryEntry } from '../../../src/consciousness/memory/types';
import { MemoryType, Priority } from '../../../src/types';

/**
 * Create a mock sensory memory entry
 */
export function createMockSensoryMemory(
  content: any,
  overrides?: Partial<MemoryEntry>
): MemoryEntry {
  return {
    id: `sensory-${Date.now()}-${Math.random()}`,
    type: MemoryType.SENSORY,
    content,
    timestamp: Date.now(),
    strength: 0.8,
    associations: [],
    priority: Priority.NORMAL,
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a mock working memory entry
 */
export function createMockWorkingMemory(
  content: any,
  overrides?: Partial<MemoryEntry>
): MemoryEntry {
  return {
    id: `working-${Date.now()}-${Math.random()}`,
    type: MemoryType.WORKING,
    content,
    timestamp: Date.now(),
    strength: 0.9,
    associations: [],
    priority: Priority.HIGH,
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a mock long-term memory entry
 */
export function createMockLongTermMemory(
  content: any,
  overrides?: Partial<MemoryEntry>
): MemoryEntry {
  return {
    id: `longterm-${Date.now()}-${Math.random()}`,
    type: MemoryType.LONG_TERM,
    content,
    timestamp: Date.now(),
    strength: 1.0,
    associations: [],
    priority: Priority.CRITICAL,
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a collection of diverse memory entries
 */
export function createMockMemoryCollection(count: number = 10): MemoryEntry[] {
  const memories: MemoryEntry[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      memories.push(createMockSensoryMemory({ data: `sensory-${i}` }));
    } else if (type === 1) {
      memories.push(createMockWorkingMemory({ data: `working-${i}` }));
    } else {
      memories.push(createMockLongTermMemory({ data: `longterm-${i}` }));
    }
  }
  
  return memories;
}

/**
 * Create memories with associations
 */
export function createAssociatedMemories(count: number = 3): MemoryEntry[] {
  const memories = createMockMemoryCollection(count);
  
  // Create circular associations
  for (let i = 0; i < memories.length; i++) {
    const nextIndex = (i + 1) % memories.length;
    memories[i].associations = [
      {
        memoryId: memories[nextIndex].id,
        strength: 0.7,
        type: 'sequential',
      },
    ];
  }
  
  return memories;
}
