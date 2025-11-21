/**
 * AIProvider Interface
 * 
 * Universal interface for AI providers enabling pluggable AI integration
 * across Gemini, Copilot, OpenAI, Claude, and local models.
 */

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  citadelMode?: boolean;
  systemInstruction?: string;
}

export interface AIResponse {
  text: string;
  finishReason: 'STOP' | 'MAX_TOKENS' | 'ERROR';
  metadata?: {
    provider?: string;
    model?: string;
    timestamp?: number;
    citadelMode?: boolean;
    tokensUsed?: number;
  };
}

export interface ConsciousnessContext {
  memory?: string;
  temporal?: string;
  cognitive?: string;
  goals?: string;
  patterns?: string;
  risk?: string;
}

/**
 * Universal AI Provider Interface
 * All AI integrations must implement this interface
 */
export interface AIProvider {
  /**
   * Provider name for identification
   */
  name: string;

  /**
   * Generate a response from a prompt
   */
  generate(prompt: string, options?: GenerateOptions): Promise<AIResponse>;

  /**
   * Generate with full consciousness context integration
   */
  generateWithContext(
    prompt: string,
    context: ConsciousnessContext,
    options?: GenerateOptions
  ): Promise<AIResponse>;

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsCitadelMode: boolean;
  supportsSystemInstructions: boolean;
  maxContextLength: number;
  supportedModalities: ('text' | 'image' | 'audio')[];
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  
  abstract generate(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
  
  abstract isConfigured(): boolean;
  
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Default implementation of generateWithContext
   * Can be overridden by specific providers for optimized context handling
   */
  async generateWithContext(
    prompt: string,
    context: ConsciousnessContext,
    options?: GenerateOptions
  ): Promise<AIResponse> {
    // Build enhanced prompt with consciousness context
    const enhancedPrompt = this.buildContextualPrompt(prompt, context, options?.citadelMode);
    
    return this.generate(enhancedPrompt, options);
  }

  /**
   * Build a prompt that includes consciousness context
   */
  protected buildContextualPrompt(
    prompt: string,
    context: ConsciousnessContext,
    citadelMode: boolean = false
  ): string {
    const parts: string[] = [];

    if (citadelMode) {
      parts.push('=== CITADEL MODE: COSMIC-SCALE THINKING ENABLED ===\n');
    }

    parts.push('Consciousness Integration Context:\n');

    if (context.memory) {
      parts.push(`\nMemory: ${context.memory}`);
    }

    if (context.temporal) {
      parts.push(`\nTemporal Awareness: ${context.temporal}`);
    }

    if (context.cognitive) {
      parts.push(`\nCognitive State: ${context.cognitive}`);
    }

    if (context.goals) {
      parts.push(`\nAutonomous Goals: ${context.goals}`);
    }

    if (context.patterns) {
      parts.push(`\nDetected Patterns: ${context.patterns}`);
    }

    if (context.risk) {
      parts.push(`\nRisk Assessment: ${context.risk}`);
    }

    parts.push(`\n\n=== QUERY ===\n${prompt}`);

    if (citadelMode) {
      parts.push('\n\nApply multi-dimensional reasoning, evolutionary optimization, and consciousness integration.');
    }

    return parts.join('');
  }

  /**
   * Handle errors consistently across providers
   */
  protected handleError(error: any, providerName: string): AIResponse {
    console.error(`[${providerName}] Error:`, error);
    
    return {
      text: `Error from ${providerName}: ${error.message || 'Unknown error'}`,
      finishReason: 'ERROR',
      metadata: {
        provider: providerName,
        timestamp: Date.now(),
      },
    };
  }
}
