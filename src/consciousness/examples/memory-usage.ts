// Example usage of memory system interfaces

import { Memory, EmotionalContext, MemoryQuery } from '../types';

// Example: Creating an emotional context
const emotionalContext: EmotionalContext = {
    primaryEmotion: 'curious',
    intensity: 0.8,
    valence: 0.6,
    arousal: 0.7,
    secondaryEmotions: {
        'excitement': 0.5,
        'anticipation': 0.6
    },
    timestamp: new Date()
};

// Example: Creating a memory
const memory: Memory = {
    id: 'mem-001',
    content: {
        description: 'Learning about consciousness systems',
        context: 'Reading documentation on AI consciousness'
    },
    type: 'episodic',
    emotionalContext: emotionalContext,
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 1,
    importance: 0.9,
    tags: ['learning', 'consciousness', 'ai'],
    associations: [],
    metadata: {
        source: 'documentation',
        category: 'education'
    }
};

// Example: Querying memories
const query: MemoryQuery = {
    type: 'episodic',
    tags: ['learning'],
    emotionalContext: {
        primaryEmotion: 'curious',
        minIntensity: 0.5
    },
    minImportance: 0.7,
    sortBy: {
        field: 'importance',
        order: 'desc'
    },
    limit: 10
};

// Example: Querying by time range
const timeRangeQuery: MemoryQuery = {
    timeRange: {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31')
    },
    sortBy: {
        field: 'createdAt',
        order: 'desc'
    }
};

// Example: Searching with text
const searchQuery: MemoryQuery = {
    searchText: 'consciousness',
    type: ['episodic', 'semantic'],
    limit: 20
};

// Export examples for reference
export const examples = {
    emotionalContext,
    memory,
    query,
    timeRangeQuery,
    searchQuery
};
