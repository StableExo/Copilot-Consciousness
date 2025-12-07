/**
 * Consciousness System MCP Server
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { BaseMcpServer } from '../base/BaseMcpServer.js';
import {
  McpTool,
  CallToolParams,
  CallToolResult,
} from '../types/protocol.js';

export class ConsciousnessSystemServer extends BaseMcpServer {
  private memoryBasePath: string;

  constructor(memoryBasePath: string = '.memory') {
    super({
      name: 'consciousness-system',
      version: '1.0.0',
      description: 'Consciousness System introspection',
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
    });
    this.memoryBasePath = memoryBasePath;
    this.registerMethod('tools/list', this.handleListTools.bind(this));
    this.registerMethod('tools/call', this.handleCallTool.bind(this));
  }

  protected async onInitialized(): Promise<void> {
    this.log('Consciousness System MCP Server initialized');
  }

  private async handleListTools(): Promise<{ tools: McpTool[] }> {
    return {
      tools: [
        {
          name: 'get_consciousness_state',
          description: 'Get current consciousness state',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ],
    };
  }

  private async handleCallTool(params: CallToolParams): Promise<CallToolResult> {
    const statePath = join(this.memoryBasePath, 'introspection', 'latest.json');
    try {
      const content = await readFile(statePath, 'utf-8');
      const state = JSON.parse(content);
      return {
        content: [{
          type: 'text',
          text: '# Consciousness State\n\nSession: ' + state.sessionId,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: 'Error: ' + error.message }],
      };
    }
  }
}
