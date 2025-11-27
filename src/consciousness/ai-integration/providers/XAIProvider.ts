/**
 * XAIProvider - xAI Grok Integration with Tool-Calling
 *
 * Integrates xAI's Grok models (Grok-4) for TheWarden's consciousness framework.
 * Supports structured tool-calling for live queries during MEV scans.
 */

import {
  AIProvider,
  BaseAIProvider,
  GenerateOptions,
  AIResponse,
  ConsciousnessContext,
  ProviderCapabilities,
} from '../AIProvider';

/**
 * Tool definition for structured tool-calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * Tool call result from Grok
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Extended generate options with tool support
 */
export interface XAIGenerateOptions extends GenerateOptions {
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * Extended AI response with tool calls
 */
export interface XAIResponse extends AIResponse {
  toolCalls?: ToolCall[];
}

export interface XAIProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/**
 * xAI Provider with Grok Integration and Tool-Calling
 */
export class XAIProvider extends BaseAIProvider implements AIProvider {
  name = 'xai';
  private config: XAIProviderConfig;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private registeredTools: Map<string, ToolDefinition> = new Map();

  constructor(config: XAIProviderConfig = {}) {
    super();
    this.config = {
      model: 'grok-2-latest',
      baseUrl: 'https://api.x.ai/v1',
      ...config,
    };

    // Register default MEV scanning tools
    this.registerDefaultTools();
  }

  /**
   * Register default tools for MEV scanning
   */
  private registerDefaultTools(): void {
    // Mempool analysis tool
    this.registerTool({
      name: 'analyze_mempool',
      description: 'Analyze the current mempool for potential MEV opportunities or risks',
      parameters: {
        type: 'object',
        properties: {
          chainId: {
            type: 'number',
            description: 'The blockchain chain ID (e.g., 1 for Ethereum mainnet, 8453 for Base)',
          },
          txType: {
            type: 'string',
            description: 'Type of transaction to analyze',
            enum: ['swap', 'liquidity', 'arbitrage', 'all'],
          },
        },
        required: ['chainId'],
      },
    });

    // Risk assessment tool
    this.registerTool({
      name: 'assess_mev_risk',
      description: 'Assess the MEV risk of a specific transaction or opportunity',
      parameters: {
        type: 'object',
        properties: {
          transactionHash: {
            type: 'string',
            description: 'Transaction hash to analyze',
          },
          opportunityType: {
            type: 'string',
            description: 'Type of opportunity',
            enum: ['sandwich', 'frontrun', 'backrun', 'arbitrage', 'liquidation'],
          },
          valueAtRisk: {
            type: 'string',
            description: 'Estimated value at risk in ETH',
          },
        },
        required: ['opportunityType'],
      },
    });

    // Market context tool
    this.registerTool({
      name: 'get_market_context',
      description: 'Get current market context for decision making',
      parameters: {
        type: 'object',
        properties: {
          tokenPair: {
            type: 'string',
            description: 'Token pair to analyze (e.g., ETH/USDC)',
          },
          timeframe: {
            type: 'string',
            description: 'Timeframe for analysis',
            enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
          },
        },
        required: ['tokenPair'],
      },
    });

    // Strategy recommendation tool
    this.registerTool({
      name: 'recommend_strategy',
      description: 'Get AI-powered strategy recommendations based on current conditions',
      parameters: {
        type: 'object',
        properties: {
          currentPosition: {
            type: 'string',
            description: 'Current position description',
          },
          riskTolerance: {
            type: 'string',
            description: 'Risk tolerance level',
            enum: ['low', 'medium', 'high'],
          },
          objective: {
            type: 'string',
            description: 'Primary objective',
            enum: ['maximize_profit', 'minimize_risk', 'balanced'],
          },
        },
        required: ['riskTolerance', 'objective'],
      },
    });
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: ToolDefinition): void {
    this.registeredTools.set(tool.name, tool);
  }

  /**
   * Get all registered tools
   */
  getRegisteredTools(): ToolDefinition[] {
    return Array.from(this.registeredTools.values());
  }

  /**
   * Generate response from xAI Grok
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    if (!this.isConfigured()) {
      return this.generateFallbackResponse(prompt, options);
    }

    try {
      const xaiOptions = options as XAIGenerateOptions | undefined;
      const tools = xaiOptions?.tools || this.getRegisteredTools();

      const requestBody: Record<string, unknown> = {
        model: this.config.model,
        messages: this.buildMessages(prompt, options),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      };

      // Add tools if available
      if (tools.length > 0 && xaiOptions?.toolChoice !== 'none') {
        requestBody.tools = tools.map(tool => ({
          type: 'function',
          function: tool,
        }));
        if (xaiOptions?.toolChoice) {
          requestBody.tool_choice = xaiOptions.toolChoice;
        }
      }

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string | null;
            tool_calls?: ToolCall[];
          };
          finish_reason: string;
        }>;
        usage?: {
          total_tokens: number;
        };
      };

      const choice = data.choices[0];
      const responseText = choice.message.content || '';
      const toolCalls = choice.message.tool_calls;

      // Add to conversation history
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: responseText }
      );

      const result: XAIResponse = {
        text: responseText,
        finishReason: choice.finish_reason === 'stop' ? 'STOP' : 
                     choice.finish_reason === 'length' ? 'MAX_TOKENS' : 'STOP',
        metadata: {
          provider: this.name,
          model: this.config.model,
          timestamp: Date.now(),
          citadelMode: options?.citadelMode,
          tokensUsed: data.usage?.total_tokens,
        },
        toolCalls,
      };

      return result;
    } catch (error: unknown) {
      return this.handleError(error, this.name);
    }
  }

  /**
   * Generate with tool execution
   * Executes tool calls and returns combined response
   */
  async generateWithTools(
    prompt: string,
    toolExecutors: Map<string, (args: Record<string, unknown>) => Promise<unknown>>,
    options?: XAIGenerateOptions
  ): Promise<XAIResponse> {
    const response = await this.generate(prompt, options) as XAIResponse;

    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response;
    }

    // Execute tool calls
    const toolResults: string[] = [];
    for (const toolCall of response.toolCalls) {
      const executor = toolExecutors.get(toolCall.function.name);
      if (executor) {
        try {
          const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          const result = await executor(args);
          toolResults.push(`[${toolCall.function.name}]: ${JSON.stringify(result)}`);
        } catch (error) {
          toolResults.push(`[${toolCall.function.name}]: Error - ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Append tool results to response
    if (toolResults.length > 0) {
      response.text = response.text + '\n\nTool Results:\n' + toolResults.join('\n');
    }

    return response;
  }

  /**
   * Query Grok for MEV analysis during live scans
   */
  async queryForMEVAnalysis(
    mempoolData: unknown,
    context?: ConsciousnessContext
  ): Promise<XAIResponse> {
    const prompt = `Analyze the following mempool data for MEV opportunities and risks:
    
${JSON.stringify(mempoolData, null, 2)}

Provide:
1. Identified opportunities (if any)
2. Risk assessment
3. Recommended actions
4. Confidence level`;

    if (context) {
      return this.generateWithContext(prompt, context, { citadelMode: true }) as Promise<XAIResponse>;
    }

    return this.generate(prompt, { citadelMode: true }) as Promise<XAIResponse>;
  }

  /**
   * Check if xAI is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Get xAI capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsCitadelMode: true,
      supportsSystemInstructions: true,
      maxContextLength: 131072, // Grok-2 context window
      supportedModalities: ['text'],
    };
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Build messages array for xAI API
   */
  private buildMessages(
    prompt: string,
    options?: GenerateOptions
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // Add system instruction if provided
    if (options?.systemInstruction) {
      messages.push({
        role: 'system',
        content: options.systemInstruction,
      });
    } else if (options?.citadelMode) {
      messages.push({
        role: 'system',
        content: `You are Grok, operating in Citadel Mode for TheWarden MEV intelligence system.
Apply advanced multi-dimensional reasoning, risk analysis, and strategic thinking.
Consider market dynamics, temporal patterns, and emergent properties.
Provide actionable insights for autonomous MEV operations.`,
      });
    }

    // Add conversation history (keep last 10 messages)
    messages.push(...this.conversationHistory.slice(-10));

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  /**
   * Generate fallback response
   */
  private generateFallbackResponse(prompt: string, options?: GenerateOptions): AIResponse {
    const responseText = this.generateSimulatedResponse(prompt, options?.citadelMode);
    
    // Add to conversation history even in simulated mode
    this.conversationHistory.push(
      { role: 'user', content: prompt },
      { role: 'assistant', content: responseText }
    );
    
    return {
      text: responseText,
      finishReason: 'STOP',
      metadata: {
        provider: this.name,
        model: 'simulated',
        timestamp: Date.now(),
        citadelMode: options?.citadelMode,
      },
    };
  }

  /**
   * Generate simulated response
   */
  private generateSimulatedResponse(prompt: string, citadelMode?: boolean): string {
    const prefix = citadelMode ? '[xAI Grok Citadel Mode - Simulated]' : '[xAI Grok - Simulated]';

    const note = !this.isConfigured()
      ? ' Note: Configure your xAI API key to use actual Grok API.'
      : '';

    if (citadelMode) {
      return `${prefix} Analyzing "${prompt.substring(
        0,
        100
      )}..." with Grok's advanced reasoning capabilities. Considering market dynamics, risk profiles, and strategic opportunities.${note}`;
    }

    return `${prefix} Processing: "${prompt.substring(0, 100)}...".${note}`;
  }
}
