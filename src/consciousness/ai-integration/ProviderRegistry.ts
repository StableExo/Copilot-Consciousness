/**
 * AIProviderRegistry - Universal AI Provider Management
 *
 * Manages multiple AI providers with automatic fallback chain.
 * Enables TheWarden to use multiple AI providers seamlessly.
 */

import { AIProvider, GenerateOptions, AIResponse, ConsciousnessContext } from './AIProvider';

export interface RegistryConfig {
  fallbackChain?: string[];
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed: number;
}

/**
 * AI Provider Registry with Fallback Support
 */
export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private stats: Map<string, ProviderStats> = new Map();
  private config: Required<RegistryConfig>;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      fallbackChain: [],
      retryAttempts: 2,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Register an AI provider
   */
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    this.stats.set(provider.name, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastUsed: 0,
    });

    console.log(`[AIProviderRegistry] Registered provider: ${provider.name}`);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get configured providers (those that have API keys, etc.)
   */
  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isConfigured());
  }

  /**
   * Execute with automatic fallback chain
   */
  async executeWithFallback(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const chain = this.buildFallbackChain();

    if (chain.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);

      if (!provider) {
        console.warn(`[AIProviderRegistry] Provider ${providerName} not found in registry`);
        continue;
      }

      // Skip unconfigured providers unless it's the local fallback
      if (!provider.isConfigured() && provider.name !== 'local') {
        console.log(`[AIProviderRegistry] Skipping unconfigured provider: ${providerName}`);
        continue;
      }

      try {
        console.log(`[AIProviderRegistry] Attempting provider: ${providerName}`);
        const response = await this.executeWithRetry(provider, prompt, options);

        // Check if response indicates error
        if (response.finishReason === 'ERROR') {
          throw new Error(response.text);
        }

        // Success!
        this.recordSuccess(providerName, 0); // TODO: Track actual response time
        return response;
      } catch (error: any) {
        console.warn(`[AIProviderRegistry] Provider ${providerName} failed:`, error.message);
        this.recordFailure(providerName);
        lastError = error;

        // Continue to next provider in fallback chain
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Execute with full consciousness context and fallback
   */
  async executeWithContextAndFallback(
    prompt: string,
    context: ConsciousnessContext,
    options?: GenerateOptions
  ): Promise<AIResponse> {
    const chain = this.buildFallbackChain();

    if (chain.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);

      if (!provider) {
        continue;
      }

      if (!provider.isConfigured() && provider.name !== 'local') {
        continue;
      }

      try {
        console.log(`[AIProviderRegistry] Attempting provider with context: ${providerName}`);
        const response = await this.executeWithContextAndRetry(provider, prompt, context, options);

        if (response.finishReason === 'ERROR') {
          throw new Error(response.text);
        }

        this.recordSuccess(providerName, 0);
        return response;
      } catch (error: any) {
        console.warn(`[AIProviderRegistry] Provider ${providerName} failed:`, error.message);
        this.recordFailure(providerName);
        lastError = error;
        continue;
      }
    }

    throw new Error(
      `All AI providers failed with context. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Get provider statistics
   */
  getProviderStats(name: string): ProviderStats | undefined {
    return this.stats.get(name);
  }

  /**
   * Get all provider statistics
   */
  getAllStats(): Map<string, ProviderStats> {
    return new Map(this.stats);
  }

  /**
   * Build fallback chain based on configuration and availability
   */
  private buildFallbackChain(): string[] {
    // Use configured fallback chain if provided
    if (this.config.fallbackChain.length > 0) {
      return this.config.fallbackChain;
    }

    // Otherwise, build automatic chain
    const chain: string[] = [];

    // Priority order: configured providers first
    const configured = this.getConfiguredProviders();
    chain.push(...configured.map((p) => p.name));

    // Always add local as last resort
    if (this.providers.has('local') && !chain.includes('local')) {
      chain.push('local');
    }

    return chain;
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(
    provider: AIProvider,
    prompt: string,
    options?: GenerateOptions
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const response = await provider.generate(prompt, options);
        const responseTime = Date.now() - startTime;

        // Update stats on success
        this.updateResponseTime(provider.name, responseTime);

        return response;
      } catch (error: any) {
        lastError = error;

        // Wait before retry (except on last attempt)
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError || new Error('Unknown error during retry');
  }

  /**
   * Execute with context and retry logic
   */
  private async executeWithContextAndRetry(
    provider: AIProvider,
    prompt: string,
    context: ConsciousnessContext,
    options?: GenerateOptions
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const response = await provider.generateWithContext(prompt, context, options);
        const responseTime = Date.now() - startTime;

        this.updateResponseTime(provider.name, responseTime);

        return response;
      } catch (error: any) {
        lastError = error;

        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError || new Error('Unknown error during context retry');
  }

  /**
   * Record successful provider execution
   */
  private recordSuccess(providerName: string, _responseTime: number): void {
    const stats = this.stats.get(providerName);
    if (stats) {
      stats.totalRequests++;
      stats.successfulRequests++;
      stats.lastUsed = Date.now();
    }
  }

  /**
   * Record failed provider execution
   */
  private recordFailure(providerName: string): void {
    const stats = this.stats.get(providerName);
    if (stats) {
      stats.totalRequests++;
      stats.failedRequests++;
    }
  }

  /**
   * Update average response time
   */
  private updateResponseTime(providerName: string, responseTime: number): void {
    const stats = this.stats.get(providerName);
    if (stats) {
      // Calculate rolling average
      const totalTime = stats.averageResponseTime * (stats.successfulRequests - 1);
      stats.averageResponseTime = (totalTime + responseTime) / stats.successfulRequests;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
