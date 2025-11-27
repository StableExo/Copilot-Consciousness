/**
 * XAIProvider Tests
 *
 * Tests for xAI Grok integration with tool-calling support.
 */

import { XAIProvider, XAIGenerateOptions, ToolDefinition } from '../providers/XAIProvider';

describe('XAIProvider', () => {
  let provider: XAIProvider;

  beforeEach(() => {
    provider = new XAIProvider();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(provider.name).toBe('xai');
      expect(provider.isConfigured()).toBe(false);
    });

    it('should initialize with custom config', () => {
      const customProvider = new XAIProvider({
        apiKey: 'test-key',
        model: 'grok-3',
        baseUrl: 'https://custom.api.x.ai/v1',
      });
      expect(customProvider.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('should return false without API key', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should return true with API key', () => {
      const configuredProvider = new XAIProvider({ apiKey: 'test-key' });
      expect(configuredProvider.isConfigured()).toBe(true);
    });

    it('should return false with empty API key', () => {
      const emptyProvider = new XAIProvider({ apiKey: '' });
      expect(emptyProvider.isConfigured()).toBe(false);
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();

      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.supportsCitadelMode).toBe(true);
      expect(capabilities.supportsSystemInstructions).toBe(true);
      expect(capabilities.maxContextLength).toBe(131072);
      expect(capabilities.supportedModalities).toContain('text');
    });
  });

  describe('generate (simulated mode)', () => {
    it('should generate fallback response when not configured', async () => {
      const response = await provider.generate('Test prompt');

      expect(response.text).toContain('[xAI Grok - Simulated]');
      expect(response.text).toContain('XAI_PROD_API_KEY');
      expect(response.finishReason).toBe('STOP');
      expect(response.metadata?.provider).toBe('xai');
      expect(response.metadata?.model).toBe('simulated');
    });

    it('should generate citadel mode response', async () => {
      const response = await provider.generate('Test prompt', { citadelMode: true });

      expect(response.text).toContain('[xAI Grok Citadel Mode - Simulated]');
      expect(response.text).toContain('advanced reasoning');
      expect(response.metadata?.citadelMode).toBe(true);
    });

    it('should truncate long prompts in simulated response', async () => {
      const longPrompt = 'A'.repeat(200);
      const response = await provider.generate(longPrompt);

      expect(response.text).toContain('A'.repeat(100));
      expect(response.text).toContain('...');
    });
  });

  describe('tool registration', () => {
    it('should have default MEV tools registered', () => {
      const tools = provider.getRegisteredTools();

      expect(tools.length).toBeGreaterThanOrEqual(4);

      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('analyze_mempool');
      expect(toolNames).toContain('assess_mev_risk');
      expect(toolNames).toContain('get_market_context');
      expect(toolNames).toContain('recommend_strategy');
    });

    it('should allow registering custom tools', () => {
      const customTool: ToolDefinition = {
        name: 'custom_tool',
        description: 'A custom tool for testing',
        parameters: {
          type: 'object',
          properties: {
            testParam: {
              type: 'string',
              description: 'A test parameter',
            },
          },
          required: ['testParam'],
        },
      };

      provider.registerTool(customTool);
      const tools = provider.getRegisteredTools();

      expect(tools.find(t => t.name === 'custom_tool')).toBeDefined();
    });

    it('should overwrite tool with same name', () => {
      const tool1: ToolDefinition = {
        name: 'test_tool',
        description: 'First version',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      const tool2: ToolDefinition = {
        name: 'test_tool',
        description: 'Second version',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      provider.registerTool(tool1);
      provider.registerTool(tool2);

      const tools = provider.getRegisteredTools();
      const testTool = tools.find(t => t.name === 'test_tool');

      expect(testTool?.description).toBe('Second version');
    });
  });

  describe('conversation history', () => {
    it('should start with empty conversation history', () => {
      expect(provider.getConversationHistory()).toEqual([]);
    });

    it('should track conversation history', async () => {
      await provider.generate('First message');
      await provider.generate('Second message');

      const history = provider.getConversationHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
    });

    it('should clear conversation history', async () => {
      await provider.generate('Test message');
      expect(provider.getConversationHistory().length).toBe(2);

      provider.clearConversationHistory();
      expect(provider.getConversationHistory()).toEqual([]);
    });
  });

  describe('queryForMEVAnalysis', () => {
    it('should generate MEV analysis query', async () => {
      const mempoolData = {
        pendingTxCount: 150,
        topTokens: ['WETH', 'USDC', 'USDT'],
        gasPrice: '25 gwei',
      };

      const response = await provider.queryForMEVAnalysis(mempoolData);

      expect(response.text).toContain('[xAI Grok Citadel Mode - Simulated]');
      expect(response.metadata?.citadelMode).toBe(true);
    });

    it('should include consciousness context when provided', async () => {
      const mempoolData = { pendingTxCount: 100 };
      const context = {
        memory: 'Previous MEV opportunity detected',
        risk: 'Medium risk environment',
      };

      const response = await provider.queryForMEVAnalysis(mempoolData, context);

      expect(response.finishReason).toBe('STOP');
    });
  });

  describe('generateWithContext', () => {
    it('should handle consciousness context', async () => {
      const context = {
        memory: 'Recent trade history',
        temporal: 'High volatility period',
        cognitive: 'Alert state',
        goals: 'Maximize profit while minimizing risk',
        patterns: 'Detected sandwich attack pattern',
        risk: 'Elevated MEV activity',
      };

      const response = await provider.generateWithContext(
        'Analyze current market conditions',
        context,
        { citadelMode: true }
      );

      expect(response.finishReason).toBe('STOP');
      expect(response.metadata?.provider).toBe('xai');
    });
  });

  describe('default tools validation', () => {
    it('analyze_mempool tool should have correct structure', () => {
      const tools = provider.getRegisteredTools();
      const tool = tools.find(t => t.name === 'analyze_mempool');

      expect(tool).toBeDefined();
      expect(tool?.parameters.properties.chainId).toBeDefined();
      expect(tool?.parameters.properties.chainId.type).toBe('number');
      expect(tool?.parameters.required).toContain('chainId');
    });

    it('assess_mev_risk tool should have correct structure', () => {
      const tools = provider.getRegisteredTools();
      const tool = tools.find(t => t.name === 'assess_mev_risk');

      expect(tool).toBeDefined();
      expect(tool?.parameters.properties.opportunityType).toBeDefined();
      expect(tool?.parameters.properties.opportunityType.enum).toContain('sandwich');
      expect(tool?.parameters.properties.opportunityType.enum).toContain('frontrun');
    });

    it('get_market_context tool should have correct structure', () => {
      const tools = provider.getRegisteredTools();
      const tool = tools.find(t => t.name === 'get_market_context');

      expect(tool).toBeDefined();
      expect(tool?.parameters.properties.tokenPair).toBeDefined();
      expect(tool?.parameters.properties.timeframe.enum).toContain('1h');
    });

    it('recommend_strategy tool should have correct structure', () => {
      const tools = provider.getRegisteredTools();
      const tool = tools.find(t => t.name === 'recommend_strategy');

      expect(tool).toBeDefined();
      expect(tool?.parameters.properties.riskTolerance.enum).toContain('medium');
      expect(tool?.parameters.properties.objective.enum).toContain('balanced');
    });
  });
});
