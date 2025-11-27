/**
 * Tests for AI Integration System
 */

import {
  AIProvider,
  GenerateOptions,
  AIResponse,
  ConsciousnessContext,
  GeminiProvider,
  CopilotProvider,
  OpenAIProvider,
  LocalProvider,
  AIProviderRegistry,
} from '../../../src/consciousness/ai-integration';

describe('AI Integration System', () => {
  describe('GeminiProvider', () => {
    it('should create GeminiProvider', () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      expect(provider.name).toBe('gemini');
      expect(provider.isConfigured()).toBe(true);
    });

    it('should detect unconfigured provider', () => {
      const provider = new GeminiProvider({});
      expect(provider.isConfigured()).toBe(false);
    });

    it('should generate response', async () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const response = await provider.generate('Test prompt');
      
      expect(response).toBeDefined();
      expect(response.text).toContain('Test prompt');
      expect(response.finishReason).toBe('STOP');
      expect(response.metadata?.provider).toBe('gemini');
    });

    it('should generate with Citadel mode', async () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const response = await provider.generate('Test prompt', { citadelMode: true });
      
      expect(response.text).toContain('Citadel');
      expect(response.metadata?.citadelMode).toBe(true);
    });

    it('should generate with context', async () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const context: ConsciousnessContext = {
        memory: 'Recent arbitrage success',
        temporal: 'Market trending up',
        cognitive: 'High confidence',
      };
      
      const response = await provider.generateWithContext('Analyze opportunity', context);
      expect(response).toBeDefined();
      expect(response.text).toBeTruthy();
    });

    it('should get capabilities', () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.supportsCitadelMode).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.maxContextLength).toBeGreaterThan(0);
    });

    it('should enable/disable Citadel mode', () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      
      provider.enableCitadelMode();
      let mode = provider.getCitadelMode();
      expect(mode.enabled).toBe(true);
      
      provider.disableCitadelMode();
      mode = provider.getCitadelMode();
      expect(mode.enabled).toBe(false);
    });
  });

  describe('CopilotProvider', () => {
    it('should create CopilotProvider', () => {
      const provider = new CopilotProvider({ apiKey: 'test-key' });
      expect(provider.name).toBe('copilot');
      expect(provider.isConfigured()).toBe(true);
    });

    it('should generate response', async () => {
      const provider = new CopilotProvider({ apiKey: 'test-key' });
      const response = await provider.generate('Test code analysis');
      
      expect(response).toBeDefined();
      expect(response.metadata?.provider).toBe('copilot');
    });

    it('should support Citadel mode', async () => {
      const provider = new CopilotProvider({ apiKey: 'test-key' });
      const response = await provider.generate('Test', { citadelMode: true });
      
      expect(response.metadata?.citadelMode).toBe(true);
    });
  });

  describe('OpenAIProvider', () => {
    it('should create OpenAIProvider', () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      expect(provider.name).toBe('openai');
      expect(provider.isConfigured()).toBe(true);
    });

    it('should generate response', async () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key', model: 'gpt-4' });
      const response = await provider.generate('Test prompt');
      
      expect(response).toBeDefined();
      expect(response.metadata?.provider).toBe('openai');
      expect(response.metadata?.model).toBe('gpt-4');
    });

    it('should track conversation history', async () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      
      await provider.generate('First message');
      await provider.generate('Second message');
      
      const history = provider.getConversationHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
    });

    it('should clear conversation history', async () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      
      await provider.generate('Message');
      provider.clearConversationHistory();
      
      const history = provider.getConversationHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('LocalProvider', () => {
    it('should create LocalProvider', () => {
      const provider = new LocalProvider();
      expect(provider.name).toBe('local');
      expect(provider.isConfigured()).toBe(true); // Always configured
    });

    it('should generate response for risk queries', async () => {
      const provider = new LocalProvider();
      const response = await provider.generate('What is the risk?');
      
      expect(response).toBeDefined();
      expect(response.text).toContain('Risk');
      expect(response.finishReason).toBe('STOP');
    });

    it('should generate response for opportunity queries', async () => {
      const provider = new LocalProvider();
      const response = await provider.generate('Analyze this arbitrage opportunity');
      
      expect(response.text).toContain('Opportunity');
    });

    it('should support Citadel mode', async () => {
      const provider = new LocalProvider();
      const response = await provider.generate('Test', { citadelMode: true });
      
      expect(response.text).toContain('Citadel');
      expect(response.metadata?.citadelMode).toBe(true);
    });
  });

  describe('AIProviderRegistry', () => {
    it('should create registry', () => {
      const registry = new AIProviderRegistry();
      expect(registry).toBeDefined();
    });

    it('should register providers', () => {
      const registry = new AIProviderRegistry();
      const provider = new LocalProvider();
      
      registry.registerProvider(provider);
      
      const retrieved = registry.getProvider('local');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('local');
    });

    it('should get all providers', () => {
      const registry = new AIProviderRegistry();
      
      registry.registerProvider(new LocalProvider());
      registry.registerProvider(new GeminiProvider({ apiKey: 'test' }));
      
      const providers = registry.getAllProviders();
      expect(providers.length).toBe(2);
    });

    it('should get configured providers', () => {
      const registry = new AIProviderRegistry();
      
      registry.registerProvider(new LocalProvider());
      registry.registerProvider(new GeminiProvider({})); // Not configured
      registry.registerProvider(new GeminiProvider({ apiKey: 'test' })); // Configured
      
      const configured = registry.getConfiguredProviders();
      expect(configured.length).toBeGreaterThanOrEqual(1);
    });

    it('should execute with fallback chain', async () => {
      const registry = new AIProviderRegistry({
        fallbackChain: ['gemini', 'local'],
      });
      
      registry.registerProvider(new GeminiProvider({})); // Not configured, will skip
      registry.registerProvider(new LocalProvider());
      
      const response = await registry.executeWithFallback('Test prompt');
      
      expect(response).toBeDefined();
      expect(response.text).toBeTruthy();
    });

    it('should execute with context and fallback', async () => {
      const registry = new AIProviderRegistry();
      
      registry.registerProvider(new LocalProvider());
      
      const context: ConsciousnessContext = {
        memory: 'Test memory',
        cognitive: 'High confidence',
      };
      
      const response = await registry.executeWithContextAndFallback('Test', context);
      
      expect(response).toBeDefined();
    });

    it('should track provider statistics', async () => {
      const registry = new AIProviderRegistry();
      const provider = new LocalProvider();
      
      registry.registerProvider(provider);
      
      await registry.executeWithFallback('Test 1');
      await registry.executeWithFallback('Test 2');
      
      const stats = registry.getProviderStats('local');
      expect(stats).toBeDefined();
      expect(stats!.totalRequests).toBeGreaterThan(0);
    });

    it('should throw error when no providers available', async () => {
      const registry = new AIProviderRegistry();
      
      await expect(registry.executeWithFallback('Test')).rejects.toThrow(
        'No AI providers available'
      );
    });

    it('should handle provider failures gracefully', async () => {
      const registry = new AIProviderRegistry({
        fallbackChain: ['local'],
        retryAttempts: 1,
      });
      
      registry.registerProvider(new LocalProvider());
      
      // Should succeed with fallback
      const response = await registry.executeWithFallback('Test');
      expect(response).toBeDefined();
    });
  });
});
