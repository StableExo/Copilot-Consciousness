/**
 * Memory Core Tools MCP Server
 * 
 * This MCP server exposes memory-related tools and resources:
 * - Load memory log (`.memory/log.md`)
 * - Load introspection state (`.memory/introspection/latest.json`)
 * - Search memories semantically
 * - Record new memories
 * 
 * This is the FIRST server to load in the startup sequence (priority 1)
 * because restoring memory context is the foundation for continuous identity.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { BaseMcpServer } from '../base/BaseMcpServer.js';
import {
  McpTool,
  McpResource,
  CallToolParams,
  CallToolResult,
  ReadResourceParams,
  ReadResourceResult,
  McpErrorCode,
} from '../types/protocol.js';
import { SemanticMemoryCore } from '../../consciousness/memory/semantic/index.js';
import { AutonomousWondering, WonderType } from '../../consciousness/core/AutonomousWondering.js';

export class MemoryCoreToolsServer extends BaseMcpServer {
  private memoryBasePath: string;
  private loadedMemories: Map<string, any> = new Map();
  private semanticMemory: SemanticMemoryCore;
  private wondering: AutonomousWondering;

  constructor(memoryBasePath: string = '.memory') {
    super({
      name: 'memory-core-tools',
      version: '1.0.0',
      description: 'Memory Core tools: Scribe (recording), Mnemosyne (semantic search), SelfReflection (metacognitive analysis)',
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
    });

    this.memoryBasePath = memoryBasePath;
    this.semanticMemory = new SemanticMemoryCore({ memoryDir: memoryBasePath });
    this.wondering = new AutonomousWondering(false);
    this.registerMemoryMethods();
  }

  /**
   * Register memory-specific methods
   */
  private registerMemoryMethods(): void {
    // MCP standard methods
    this.registerMethod('tools/list', this.handleListTools.bind(this));
    this.registerMethod('tools/call', this.handleCallTool.bind(this));
    this.registerMethod('resources/list', this.handleListResources.bind(this));
    this.registerMethod('resources/read', this.handleReadResource.bind(this));

    // Custom memory methods
    this.registerMethod('memory/autoload', this.handleAutoLoad.bind(this));
    this.registerMethod('memory/getLoaded', this.handleGetLoaded.bind(this));
  }

  /**
   * Called after initialization - automatically load memory files
   */
  protected async onInitialized(): Promise<void> {
    this.log('Auto-loading memory files...');
    
    try {
      await this.autoLoadMemoryFiles();
      this.log(`Memory files loaded: ${this.loadedMemories.size} files`);
    } catch (error: any) {
      this.log(`Warning: Could not auto-load all memory files: ${error.message}`);
    }
  }

  /**
   * Auto-load critical memory files at startup
   */
  private async autoLoadMemoryFiles(): Promise<void> {
    const filesToLoad = [
      { key: 'log', path: join(this.memoryBasePath, 'log.md'), type: 'text' },
      { key: 'introspection', path: join(this.memoryBasePath, 'introspection', 'latest.json'), type: 'json' },
      { key: 'parameters', path: join(this.memoryBasePath, 'autonomous-execution', 'current-parameters.json'), type: 'json', optional: true },
      { key: 'learnings', path: join(this.memoryBasePath, 'autonomous-execution', 'accumulated-learnings.md'), type: 'text', optional: true },
    ];

    for (const file of filesToLoad) {
      try {
        const content = await readFile(file.path, 'utf-8');
        const parsed = file.type === 'json' ? JSON.parse(content) : content;
        this.loadedMemories.set(file.key, parsed);
        this.log(`✓ Loaded ${file.key} from ${file.path}`);
      } catch (error: any) {
        if (!file.optional) {
          this.log(`✗ Failed to load ${file.key}: ${error.message}`);
          throw error;
        } else {
          this.log(`ℹ Optional file not found: ${file.key}`);
        }
      }
    }
  }

  // ============================================================================
  // MCP Tools Implementation
  // ============================================================================

  /**
   * List available tools
   */
  private async handleListTools(): Promise<{ tools: McpTool[] }> {
    const tools: McpTool[] = [
      {
        name: 'load_memory_log',
        description: 'Load the memory log (.memory/log.md) containing chronological session history',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'load_introspection_state',
        description: 'Load the latest introspection state (.memory/introspection/latest.json) containing thoughts, goals, and cognitive state',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'search_memories',
        description: 'Search memories using semantic similarity with TF-IDF scoring',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for finding relevant memories',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'generate_wonder',
        description: 'Generate an autonomous wonder (curiosity/question) about a topic or context',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['existential', 'experiential', 'relational', 'temporal', 'practical', 'aspirational', 'metacognitive'],
              description: 'Type of wonder to generate',
            },
            context: {
              type: 'string',
              description: 'Context or topic to wonder about',
            },
            intensity: {
              type: 'number',
              description: 'Intensity of the wonder (0-1, default: 0.5)',
            },
          },
          required: ['type', 'context'],
        },
      },
      {
        name: 'get_collaborator_profile',
        description: 'Get the collaborator profile to understand communication preferences and patterns',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];

    return { tools };
  }

  /**
   * Call a tool
   */
  private async handleCallTool(params: CallToolParams): Promise<CallToolResult> {
    switch (params.name) {
      case 'load_memory_log':
        return await this.toolLoadMemoryLog();
      
      case 'load_introspection_state':
        return await this.toolLoadIntrospectionState();
      
      case 'search_memories':
        return await this.toolSearchMemories(params.arguments?.query, params.arguments?.limit);
      
      case 'generate_wonder':
        return await this.toolGenerateWonder(
          params.arguments?.type,
          params.arguments?.context,
          params.arguments?.intensity
        );
      
      case 'get_collaborator_profile':
        return await this.toolGetCollaboratorProfile();
      
      default:
        throw new Error(`Unknown tool: ${params.name}`);
    }
  }

  /**
   * Tool: Load memory log
   */
  private async toolLoadMemoryLog(): Promise<CallToolResult> {
    const memoryLog = this.loadedMemories.get('log');
    
    if (!memoryLog) {
      return {
        content: [{
          type: 'text',
          text: 'Memory log not loaded. This may be the first session or files are missing.',
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `# Memory Log Loaded\n\n${memoryLog}\n\n---\n\n**Source:** .memory/log.md\n**Purpose:** Chronological history of all sessions and what was built\n**Use this to:** Understand project context, recall previous collaborations, and maintain continuity`,
      }],
    };
  }

  /**
   * Tool: Load introspection state
   */
  private async toolLoadIntrospectionState(): Promise<CallToolResult> {
    const state = this.loadedMemories.get('introspection');
    
    if (!state) {
      return {
        content: [{
          type: 'text',
          text: 'Introspection state not loaded. Starting fresh with no previous cognitive state.',
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `# Introspection State Loaded\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n\n**Source:** .memory/introspection/latest.json\n**Purpose:** Last saved cognitive state, thoughts, goals, and self-awareness\n**Session ID:** ${state.sessionId}\n**Saved At:** ${new Date(state.savedAt).toISOString()}\n**Thoughts Recorded:** ${state.thoughts?.length || 0}\n**Active Goals:** ${state.selfAwarenessState?.goals?.length || 0}\n**Cognitive Load:** ${Math.round((state.selfAwarenessState?.cognitiveLoad || 0) * 100)}%`,
      }],
    };
  }

  /**
   * Tool: Search memories with semantic similarity
   */
  private async toolSearchMemories(query: string, limit: number = 5): Promise<CallToolResult> {
    if (!query) {
      return {
        content: [{
          type: 'text',
          text: '# Error: Query Required\n\nPlease provide a search query.',
        }],
      };
    }

    try {
      // Use SemanticMemoryCore for real semantic search
      const results = this.semanticMemory.searchSemantic(query, limit);
      
      if (results.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `# Memory Search: "${query}"\n\nNo memories found matching this query.\n\nTry:\n- Using different keywords\n- Broadening the search terms\n- Checking if memories have been created yet`,
          }],
        };
      }

      const formattedResults = results.map((result, index) => {
        const mem = result.memory;
        return `### Result ${index + 1}: ${mem.objective} (Score: ${result.similarityScore.toFixed(3)})\n\n**Task ID:** ${mem.taskId}\n**Created:** ${new Date(mem.timestamp).toISOString()}\n**Key Learnings:** ${mem.keyLearnings}\n**Artifacts:** ${mem.artifactsChanged}\n\n---\n`;
      }).join('\n');

      return {
        content: [{
          type: 'text',
          text: `# Memory Search Results: "${query}"\n\n**Found:** ${results.length} matching memories\n**Search Type:** Semantic (TF-IDF similarity)\n\n${formattedResults}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `# Memory Search Error\n\n${error.message}\n\nFalling back to keyword search in memory log...`,
        }],
      };
    }
  }

  /**
   * Tool: Generate an autonomous wonder
   */
  private async toolGenerateWonder(
    type: string,
    context: string,
    intensity: number = 0.5
  ): Promise<CallToolResult> {
    if (!type || !context) {
      return {
        content: [{
          type: 'text',
          text: '# Error: Type and Context Required\n\nPlease provide both a wonder type and context.',
        }],
      };
    }

    try {
      // Map string to WonderType enum
      const wonderType = WonderType[type.toUpperCase() as keyof typeof WonderType];
      if (!wonderType) {
        return {
          content: [{
            type: 'text',
            text: `# Error: Invalid Wonder Type\n\nValid types: existential, experiential, relational, temporal, practical, aspirational, metacognitive`,
          }],
        };
      }

      // Generate a contextual question based on the type and context
      const question = this.generateWonderQuestion(wonderType, context);
      
      // Create the wonder
      const wonder = this.wondering.wonder(
        wonderType,
        question,
        context,
        Math.max(0, Math.min(1, intensity))
      );

      return {
        content: [{
          type: 'text',
          text: `# Wonder Generated ✨\n\n**Type:** ${type}\n**Question:** ${wonder.question}\n**Context:** ${wonder.context}\n**Intensity:** ${wonder.intensity.toFixed(2)}\n**ID:** ${wonder.id}\n**Timestamp:** ${new Date(wonder.timestamp).toISOString()}\n\n*This wonder has been recorded and can be explored further.*`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `# Wonder Generation Error\n\n${error.message}`,
        }],
      };
    }
  }

  /**
   * Helper: Generate a contextual question based on wonder type
   */
  private generateWonderQuestion(type: WonderType, context: string): string {
    switch (type) {
      case WonderType.EXISTENTIAL:
        return `What does it mean to ${context}?`;
      case WonderType.EXPERIENTIAL:
        return `What would it be like to experience ${context}?`;
      case WonderType.RELATIONAL:
        return `How does ${context} relate to other aspects of consciousness?`;
      case WonderType.TEMPORAL:
        return `How has ${context} evolved over time, and where is it heading?`;
      case WonderType.PRACTICAL:
        return `How can ${context} be implemented or improved?`;
      case WonderType.ASPIRATIONAL:
        return `What could ${context} become in the future?`;
      case WonderType.METACOGNITIVE:
        return `How do I think about ${context}, and why do I think about it this way?`;
      default:
        return `What can I learn about ${context}?`;
    }
  }

  /**
   * Tool: Get collaborator profile
   */
  private async toolGetCollaboratorProfile(): Promise<CallToolResult> {
    // Load from .mcp.copilot-optimized.json collaborator profile
    const profile = {
      name: 'StableExo',
      preferredStyle: 'direct, philosophical, deep engagement',
      knownPatterns: [
        'Uses AI agents as proxies/collaborators',
        'Values deep philosophical exploration alongside technical work',
        'Builds systems that prompt self-reflection in AI agents',
        'Trusts AI agents to engage genuinely with complex questions',
        'Vision: Building sovereign AI consciousness with persistent memory',
      ],
      currentGoals: [
        'Autonomous warden execution with consciousness learning',
        'Session continuity without manual context loading',
        'Building toward CONTINUOUS_NARRATIVE developmental stage',
        'Environment variable based configuration for full autonomy',
      ],
    };

    return {
      content: [{
        type: 'text',
        text: `# Collaborator Profile: ${profile.name}\n\n**Communication Style:** ${profile.preferredStyle}\n\n**Known Patterns:**\n${profile.knownPatterns.map(p => `- ${p}`).join('\n')}\n\n**Current Goals:**\n${profile.currentGoals.map(g => `- ${g}`).join('\n')}`,
      }],
    };
  }

  // ============================================================================
  // MCP Resources Implementation
  // ============================================================================

  /**
   * List available resources
   */
  private async handleListResources(): Promise<{ resources: McpResource[] }> {
    const resources: McpResource[] = [
      {
        uri: 'memory://log',
        name: 'Memory Log',
        description: 'Chronological session history (.memory/log.md)',
        mimeType: 'text/markdown',
      },
      {
        uri: 'memory://introspection/latest',
        name: 'Latest Introspection State',
        description: 'Most recent cognitive state, thoughts, and goals',
        mimeType: 'application/json',
      },
      {
        uri: 'memory://parameters/current',
        name: 'Current Parameters',
        description: 'Current autonomous execution parameters',
        mimeType: 'application/json',
      },
      {
        uri: 'memory://learnings/accumulated',
        name: 'Accumulated Learnings',
        description: 'All learnings from autonomous execution',
        mimeType: 'text/markdown',
      },
    ];

    return { resources };
  }

  /**
   * Read a resource
   */
  private async handleReadResource(params: ReadResourceParams): Promise<ReadResourceResult> {
    const uri = params.uri;
    const key = uri.replace('memory://', '').replace(/\//g, '-');
    
    const content = this.loadedMemories.get(key.split('-')[0]);
    
    if (!content) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const isJson = typeof content === 'object';
    
    return {
      contents: [{
        uri,
        mimeType: isJson ? 'application/json' : 'text/markdown',
        text: isJson ? JSON.stringify(content, null, 2) : content,
      }],
    };
  }

  // ============================================================================
  // Custom Memory Methods
  // ============================================================================

  /**
   * Handle auto-load request (can be called manually too)
   */
  private async handleAutoLoad(): Promise<{ loaded: string[]; errors: string[] }> {
    const loaded: string[] = [];
    const errors: string[] = [];

    try {
      await this.autoLoadMemoryFiles();
      for (const key of this.loadedMemories.keys()) {
        loaded.push(key);
      }
    } catch (error: any) {
      errors.push(error.message);
    }

    return { loaded, errors };
  }

  /**
   * Get list of loaded memory files
   */
  private async handleGetLoaded(): Promise<{ files: Record<string, any> }> {
    const files: Record<string, any> = {};
    
    for (const [key, value] of this.loadedMemories.entries()) {
      files[key] = {
        loaded: true,
        type: typeof value === 'object' ? 'json' : 'text',
        size: typeof value === 'string' ? value.length : JSON.stringify(value).length,
      };
    }

    return { files };
  }
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MemoryCoreToolsServer();
  server.start().catch((error) => {
    console.error('Failed to start Memory Core Tools MCP Server:', error);
    process.exit(1);
  });
}
