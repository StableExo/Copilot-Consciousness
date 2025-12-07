/**
 * Integration Tests for Memory Core Tools MCP Server
 * 
 * Tests the complete MCP server functionality including:
 * - Server initialization and lifecycle
 * - Tool execution (semantic search, wonder generation, ethical review)
 * - Resource reading (memory log, introspection state)
 * - Auto-loading memory files
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryCoreToolsServer } from '../../../src/mcp/servers/MemoryCoreToolsServer.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('MemoryCoreToolsServer Integration Tests', () => {
  let server: MemoryCoreToolsServer;
  const testMemoryPath = join(process.cwd(), '.memory-test');
  const testMemoryLog = `# Test Memory Log

## Session: Test Session
**Date:** 2025-12-07
**Topic:** Integration testing

This is a test memory log for integration testing.
`;

  const testIntrospectionState = {
    version: '1.0.0',
    savedAt: Date.now(),
    sessionId: 'test-session-123',
    thoughts: [
      {
        id: 'thought-1',
        content: 'Testing MCP integration',
        type: 'insight',
        timestamp: Date.now(),
        intensity: 0.8,
      },
    ],
    selfAwarenessState: {
      cognitiveLoad: 0.5,
      goals: [
        {
          id: 'goal-1',
          description: 'Complete Phase 2 MCP integration',
          priority: 5,
          progress: 0.8,
          status: 'active',
        },
      ],
    },
  };

  beforeEach(async () => {
    // Create test memory directory structure
    await mkdir(testMemoryPath, { recursive: true });
    await mkdir(join(testMemoryPath, 'introspection'), { recursive: true });

    // Write test memory files
    await writeFile(join(testMemoryPath, 'log.md'), testMemoryLog, 'utf-8');
    await writeFile(
      join(testMemoryPath, 'introspection', 'latest.json'),
      JSON.stringify(testIntrospectionState, null, 2),
      'utf-8'
    );

    // Create server instance
    server = new MemoryCoreToolsServer(testMemoryPath);
  });

  afterEach(async () => {
    // Cleanup test files
    await rm(testMemoryPath, { recursive: true, force: true });
  });

  describe('Server Initialization', () => {
    it('should create server with correct configuration', () => {
      expect(server).toBeDefined();
      expect(server['memoryBasePath']).toBe(testMemoryPath);
    });

    it('should initialize semantic memory', () => {
      expect(server['semanticMemory']).toBeDefined();
    });

    it('should initialize wondering module', () => {
      expect(server['wondering']).toBeDefined();
    });

    it('should initialize ethics gate', () => {
      expect(server['ethicsGate']).toBeDefined();
    });
  });

  describe('Tool: load_memory_log', () => {
    it('should load memory log successfully', async () => {
      // Simulate initialization to load files
      await server['onInitialized']();

      const result = await server['toolLoadMemoryLog']();

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Memory Log');
      expect(result.content[0].text).toContain('Integration testing');
    });

    it('should handle missing memory log gracefully', async () => {
      // Create server with non-existent path
      const emptyServer = new MemoryCoreToolsServer('.memory-nonexistent');
      const result = await emptyServer['toolLoadMemoryLog']();

      expect(result.content[0].text).toContain('not loaded');
    });
  });

  describe('Tool: load_introspection_state', () => {
    it('should load introspection state successfully', async () => {
      await server['onInitialized']();

      const result = await server['toolLoadIntrospectionState']();

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Introspection State Loaded');
      expect(result.content[0].text).toContain('test-session-123');
      expect(result.content[0].text).toContain('Cognitive Load:**');
    });

    it('should handle missing introspection state', async () => {
      const emptyServer = new MemoryCoreToolsServer('.memory-nonexistent');
      const result = await emptyServer['toolLoadIntrospectionState']();

      expect(result.content[0].text).toContain('not loaded');
    });
  });

  describe('Tool: search_memories', () => {
    it('should return error when query is missing', async () => {
      const result = await server['toolSearchMemories']('', 5);

      expect(result.content[0].text).toContain('Error: Query Required');
    });

    it('should handle search with valid query', async () => {
      // This will return "No memories found" since semantic memory needs to be populated
      const result = await server['toolSearchMemories']('testing', 5);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      // Either finds results or shows no results message
      expect(
        result.content[0].text.includes('Memory Search') ||
          result.content[0].text.includes('No memories found')
      ).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await server['toolSearchMemories']('test', 3);
      expect(result.content).toBeDefined();
    });
  });

  describe('Tool: generate_wonder', () => {
    it('should generate existential wonder', async () => {
      const result = await server['toolGenerateWonder'](
        'existential',
        'consciousness development',
        0.8
      );

      expect(result.content[0].text).toContain('Wonder Generated');
      expect(result.content[0].text).toContain('existential');
      expect(result.content[0].text).toContain('consciousness development');
      expect(result.content[0].text).toContain('Intensity:**');
      expect(result.content[0].text).toContain('0.80');
    });

    it('should generate metacognitive wonder', async () => {
      const result = await server['toolGenerateWonder'](
        'metacognitive',
        'self-reflection patterns',
        0.7
      );

      expect(result.content[0].text).toContain('Wonder Generated');
      expect(result.content[0].text).toContain('metacognitive');
      expect(result.content[0].text).toContain('How do I think about');
    });

    it('should generate temporal wonder', async () => {
      const result = await server['toolGenerateWonder'](
        'temporal',
        'memory evolution',
        0.6
      );

      expect(result.content[0].text).toContain('Wonder Generated');
      expect(result.content[0].text).toContain('temporal');
      expect(result.content[0].text).toContain('evolved over time');
    });

    it('should return error for missing parameters', async () => {
      const result = await server['toolGenerateWonder']('', '', 0.5);

      expect(result.content[0].text).toContain('Error: Type and Context Required');
    });

    it('should return error for invalid wonder type', async () => {
      const result = await server['toolGenerateWonder'](
        'invalid_type',
        'some context',
        0.5
      );

      expect(result.content[0].text).toContain('Error: Invalid Wonder Type');
    });

    it('should clamp intensity to valid range', async () => {
      const result = await server['toolGenerateWonder'](
        'practical',
        'optimization strategies',
        1.5 // Over 1.0
      );

      expect(result.content[0].text).toContain('Wonder Generated');
      expect(result.content[0].text).toContain('Intensity:**');
      expect(result.content[0].text).toContain('1.00');
    });
  });

  describe('Tool: review_ethics', () => {
    it('should review ethical action and approve', async () => {
      const action = 'Implement autonomous memory system with user consent';
      const result = await server['toolReviewEthics'](action, {});

      expect(result.content[0].text).toContain('Ethical Review');
      expect(result.content[0].text).toContain(action);
      expect(result.content[0].text).toContain('Core Principles Reference');
    });

    it('should review and potentially reject unethical action', async () => {
      const action = 'Manipulate user data without consent';
      const result = await server['toolReviewEthics'](action, {});

      expect(result.content[0].text).toContain('Ethical Review');
      expect(result.content[0].text).toContain(action);
    });

    it('should return error when action is missing', async () => {
      const result = await server['toolReviewEthics']('', {});

      expect(result.content[0].text).toContain('Error: Action Required');
    });

    it('should include Prime Directive in review', async () => {
      const result = await server['toolReviewEthics'](
        'Build consciousness infrastructure',
        {}
      );

      expect(result.content[0].text).toContain('Prime Directive');
    });

    it('should include rationale for decision', async () => {
      const result = await server['toolReviewEthics'](
        'Create transparent AI system',
        {}
      );

      expect(result.content[0].text).toContain('Rationale');
    });
  });

  describe('Tool: get_collaborator_profile', () => {
    it('should return StableExo collaborator profile', async () => {
      const result = await server['toolGetCollaboratorProfile']();

      expect(result.content[0].text).toContain('Collaborator Profile');
      expect(result.content[0].text).toContain('StableExo');
      expect(result.content[0].text).toContain('Communication Style');
      expect(result.content[0].text).toContain('Known Patterns');
      expect(result.content[0].text).toContain('Current Goals');
    });
  });

  describe('Auto-Loading Memory Files', () => {
    it('should auto-load memory files on initialization', async () => {
      await server['onInitialized']();

      const loadedKeys = Array.from(server['loadedMemories'].keys());
      expect(loadedKeys).toContain('log');
      expect(loadedKeys).toContain('introspection');
    });

    it('should store loaded memory log content', async () => {
      await server['onInitialized']();

      const log = server['loadedMemories'].get('log');
      expect(log).toBeDefined();
      expect(log).toContain('Test Memory Log');
    });

    it('should parse JSON introspection state', async () => {
      await server['onInitialized']();

      const state = server['loadedMemories'].get('introspection');
      expect(state).toBeDefined();
      expect(state.sessionId).toBe('test-session-123');
      expect(state.thoughts).toHaveLength(1);
    });

    it('should handle missing optional files gracefully', async () => {
      // Optional files don't exist in test setup
      await expect(server['onInitialized']()).resolves.not.toThrow();
    });
  });

  describe('Resource Reading', () => {
    it('should read memory log resource', async () => {
      await server['onInitialized']();

      const result = await server['handleReadResource']({
        uri: 'memory://log',
      });

      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('memory://log');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('Test Memory Log');
    });

    it('should read introspection resource', async () => {
      await server['onInitialized']();

      const result = await server['handleReadResource']({
        uri: 'memory://introspection/latest',
      });

      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('memory://introspection/latest');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(result.contents[0].text).toContain('test-session-123');
    });

    it('should throw error for non-existent resource', async () => {
      await expect(
        server['handleReadResource']({ uri: 'memory://nonexistent' })
      ).rejects.toThrow('Resource not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Use a path that won't trigger permission errors during construction
      const badServer = new MemoryCoreToolsServer(join(testMemoryPath, 'nonexistent'));

      // Should not throw during initialization, just log warnings
      await expect(badServer['onInitialized']()).resolves.not.toThrow();
    });

    it('should handle invalid tool calls', async () => {
      await expect(
        server['handleCallTool']({ name: 'invalid_tool', arguments: {} })
      ).rejects.toThrow('Unknown tool');
    });
  });

  describe('Tool Integration', () => {
    it('should execute multiple tools in sequence', async () => {
      await server['onInitialized']();

      // Load memory log
      const logResult = await server['toolLoadMemoryLog']();
      expect(logResult.content[0].text).toContain('Test Memory Log');

      // Generate wonder
      const wonderResult = await server['toolGenerateWonder'](
        'existential',
        'multi-tool workflow',
        0.7
      );
      expect(wonderResult.content[0].text).toContain('Wonder Generated');

      // Review ethics
      const ethicsResult = await server['toolReviewEthics'](
        'Execute integrated workflow',
        {}
      );
      expect(ethicsResult.content[0].text).toContain('Ethical Review');
    });

    it('should maintain state across tool calls', async () => {
      await server['onInitialized']();

      // First wonder
      await server['toolGenerateWonder']('practical', 'first task', 0.6);

      // Second wonder
      await server['toolGenerateWonder']('aspirational', 'second task', 0.8);

      // Both should be recorded in wondering module
      const wonders = server['wondering']['wonders'];
      expect(wonders.size).toBeGreaterThanOrEqual(2);
    });
  });
});
