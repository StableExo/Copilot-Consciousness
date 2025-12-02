/**
 * Model Context Protocol (MCP) Type Definitions
 * 
 * Based on the MCP specification: https://modelcontextprotocol.io/
 * 
 * These types define the JSON-RPC 2.0 protocol used for communication
 * between MCP clients (like GitHub Copilot) and MCP servers (our modules).
 */

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

/**
 * JSON-RPC 2.0 Response (Success)
 */
export interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number;
  result: any;
}

/**
 * JSON-RPC 2.0 Response (Error)
 */
export interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * JSON-RPC 2.0 Notification (no response expected)
 */
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcSuccess | JsonRpcError | JsonRpcNotification;

/**
 * MCP Server Capabilities
 */
export interface McpCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, never>;
}

/**
 * MCP Tool Definition
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Resource Definition
 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Prompt Definition
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP Initialize Request Params
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: McpCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP Initialize Response Result
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP Tool Call Request Params
 */
export interface CallToolParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * MCP Tool Call Response Result
 */
export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Resource Read Request Params
 */
export interface ReadResourceParams {
  uri: string;
}

/**
 * MCP Resource Read Response Result
 */
export interface ReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

/**
 * MCP Prompt Get Request Params
 */
export interface GetPromptParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * MCP Prompt Get Response Result
 */
export interface GetPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
}

/**
 * MCP Standard Error Codes (JSON-RPC 2.0)
 */
export enum McpErrorCode {
  // JSON-RPC 2.0 standard errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // MCP-specific errors
  ResourceNotFound = -32001,
  ToolNotFound = -32002,
  PromptNotFound = -32003,
}

/**
 * MCP Server Configuration
 */
export interface McpServerConfig {
  name: string;
  version: string;
  description?: string;
  capabilities: McpCapabilities;
}

/**
 * MCP Server Handler Function
 */
export type McpHandler = (params: any) => Promise<any>;

/**
 * MCP Server Method Registry
 */
export interface McpMethodRegistry {
  [method: string]: McpHandler;
}
