/**
 * Base MCP Server Implementation
 * 
 * This class provides the foundation for creating MCP servers that communicate
 * via stdio (standard input/output) using JSON-RPC 2.0 protocol.
 * 
 * MCP Servers expose tools, resources, and prompts to AI clients like GitHub Copilot.
 */

import { createInterface } from 'readline';
import {
  JsonRpcRequest,
  JsonRpcSuccess,
  JsonRpcError,
  JsonRpcNotification,
  McpServerConfig,
  McpMethodRegistry,
  McpErrorCode,
  InitializeParams,
  InitializeResult,
} from '../types/protocol.js';

export abstract class BaseMcpServer {
  protected config: McpServerConfig;
  protected methods: McpMethodRegistry = {};
  protected initialized = false;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.registerStandardMethods();
  }

  /**
   * Register standard MCP methods that all servers must implement
   */
  protected registerStandardMethods(): void {
    this.registerMethod('initialize', this.handleInitialize.bind(this));
    this.registerMethod('initialized', this.handleInitialized.bind(this));
    this.registerMethod('ping', this.handlePing.bind(this));
    this.registerMethod('shutdown', this.handleShutdown.bind(this));
  }

  /**
   * Register a custom method handler
   */
  protected registerMethod(method: string, handler: (params: any) => Promise<any>): void {
    this.methods[method] = handler;
  }

  /**
   * Start the MCP server and listen for JSON-RPC messages on stdin
   */
  public async start(): Promise<void> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line: string) => {
      try {
        const message = JSON.parse(line);
        await this.handleMessage(message);
      } catch (error) {
        this.sendError(null, McpErrorCode.ParseError, 'Parse error', error);
      }
    });

    rl.on('close', () => {
      this.onShutdown();
      process.exit(0);
    });

    // Log server start
    this.log(`MCP Server started: ${this.config.name} v${this.config.version}`);
  }

  /**
   * Handle incoming JSON-RPC message
   */
  protected async handleMessage(message: any): Promise<void> {
    // Handle notifications (no response expected)
    if (!('id' in message)) {
      await this.handleNotification(message as JsonRpcNotification);
      return;
    }

    const request = message as JsonRpcRequest;

    // Validate JSON-RPC 2.0 format
    if (request.jsonrpc !== '2.0') {
      this.sendError(request.id, McpErrorCode.InvalidRequest, 'Invalid JSON-RPC version');
      return;
    }

    // Check if method exists
    const handler = this.methods[request.method];
    if (!handler) {
      this.sendError(request.id, McpErrorCode.MethodNotFound, `Method not found: ${request.method}`);
      return;
    }

    try {
      const result = await handler(request.params || {});
      this.sendSuccess(request.id, result);
    } catch (error: any) {
      this.sendError(
        request.id,
        McpErrorCode.InternalError,
        error.message || 'Internal error',
        error
      );
    }
  }

  /**
   * Handle JSON-RPC notification (no response)
   */
  protected async handleNotification(notification: JsonRpcNotification): Promise<void> {
    const handler = this.methods[notification.method];
    if (handler) {
      try {
        await handler(notification.params || {});
      } catch (error) {
        this.log(`Error handling notification ${notification.method}: ${error}`);
      }
    }
  }

  /**
   * Send successful JSON-RPC response
   */
  protected sendSuccess(id: string | number, result: any): void {
    const response: JsonRpcSuccess = {
      jsonrpc: '2.0',
      id,
      result,
    };
    this.send(response);
  }

  /**
   * Send error JSON-RPC response
   */
  protected sendError(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): void {
    const response: JsonRpcError = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
    this.send(response);
  }

  /**
   * Send JSON-RPC notification
   */
  protected sendNotification(method: string, params?: Record<string, any>): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.send(notification);
  }

  /**
   * Send message to stdout (JSON-RPC over stdio)
   */
  protected send(message: any): void {
    console.log(JSON.stringify(message));
  }

  /**
   * Log message to stderr (so it doesn't interfere with JSON-RPC on stdout)
   */
  protected log(message: string): void {
    console.error(`[${this.config.name}] ${message}`);
  }

  // ============================================================================
  // Standard MCP Method Handlers
  // ============================================================================

  /**
   * Handle 'initialize' method - client initiates connection
   */
  protected async handleInitialize(params: InitializeParams): Promise<InitializeResult> {
    this.log(`Client connected: ${params.clientInfo.name} v${params.clientInfo.version}`);
    this.log(`Protocol version: ${params.protocolVersion}`);

    return {
      protocolVersion: '2024-11-05',
      capabilities: this.config.capabilities,
      serverInfo: {
        name: this.config.name,
        version: this.config.version,
      },
    };
  }

  /**
   * Handle 'initialized' notification - client finished initializing
   */
  protected async handleInitialized(params: any): Promise<void> {
    this.initialized = true;
    this.log('Client initialization complete');
    await this.onInitialized();
  }

  /**
   * Handle 'ping' method - health check
   */
  protected async handlePing(params: any): Promise<Record<string, never>> {
    return {};
  }

  /**
   * Handle 'shutdown' method - graceful shutdown
   */
  protected async handleShutdown(params: any): Promise<Record<string, never>> {
    this.log('Shutdown requested');
    await this.onShutdown();
    return {};
  }

  // ============================================================================
  // Abstract methods that subclasses must implement
  // ============================================================================

  /**
   * Called after client sends 'initialized' notification
   * Override to perform initialization logic
   */
  protected async onInitialized(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when server is shutting down
   * Override to perform cleanup logic
   */
  protected async onShutdown(): Promise<void> {
    // Override in subclass
  }
}
