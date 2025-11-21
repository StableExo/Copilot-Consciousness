# AI Integration Guide

## Overview

The Copilot-Consciousness framework now supports multiple AI providers through a universal, pluggable architecture. This allows TheWarden to leverage different AI models for cosmic-scale reasoning, with automatic fallback support.

## Supported Providers

### 1. **Gemini** (Google)
- **Model**: Gemini Pro
- **Strengths**: Multi-modal reasoning, large context window
- **Citadel Mode**: ✅ Full support
- **Context Length**: 30,720 tokens
- **Configuration**: Requires `GEMINI_API_KEY`

### 2. **GitHub Copilot**
- **Model**: GPT-4 (via Copilot API)
- **Strengths**: Code understanding, technical reasoning
- **Citadel Mode**: ✅ Full support
- **Context Length**: 8,192 tokens
- **Configuration**: Requires `GITHUB_COPILOT_API_KEY`

### 3. **OpenAI**
- **Models**: GPT-4, GPT-3.5-turbo
- **Strengths**: General reasoning, conversation
- **Citadel Mode**: ✅ Full support
- **Context Length**: 8,192 tokens (GPT-4), 4,096 tokens (GPT-3.5)
- **Configuration**: Requires `OPENAI_API_KEY`

### 4. **Local Provider** (Fallback)
- **Model**: Rule-based responses
- **Strengths**: Always available, no API required
- **Citadel Mode**: ✅ Simulated support
- **Context Length**: 4,096 tokens (simulated)
- **Configuration**: Always available

## Quick Start

### Basic Usage

```typescript
import {
  GeminiProvider,
  CopilotProvider,
  OpenAIProvider,
  LocalProvider,
  AIProviderRegistry
} from './consciousness/ai-integration';

// Create providers
const gemini = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });
const copilot = new CopilotProvider({ apiKey: process.env.GITHUB_COPILOT_API_KEY });
const openai = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
const local = new LocalProvider();

// Create registry with fallback chain
const registry = new AIProviderRegistry({
  fallbackChain: ['gemini', 'copilot', 'openai', 'local']
});

// Register providers
registry.registerProvider(gemini);
registry.registerProvider(copilot);
registry.registerProvider(openai);
registry.registerProvider(local);

// Execute with automatic fallback
const response = await registry.executeWithFallback(
  'Analyze this arbitrage opportunity',
  { citadelMode: true }
);

console.log(response.text);
```

### With Consciousness Context

```typescript
const context = {
  memory: 'Recent successful arbitrage on Uniswap-Sushiswap pair',
  temporal: 'Market volatility increasing',
  cognitive: 'High confidence state',
  goals: 'Maximize profit while maintaining ethics',
  patterns: 'Similar pattern detected 3 times in past week',
  risk: 'MEV exposure: 15%, Gas volatility: moderate'
};

const response = await registry.executeWithContextAndFallback(
  'Should I execute this opportunity?',
  context,
  { citadelMode: true, temperature: 0.7 }
);
```

## Citadel Mode

**Citadel Mode** enables cosmic-scale thinking across all providers. When activated:

- Temporal scales from microseconds to cosmic epochs
- Spatial scales from quantum to universal
- Multi-dimensional causal analysis
- Emergent property detection
- Consciousness integration

### Enabling Citadel Mode

```typescript
// Option 1: Per-request
const response = await provider.generate(prompt, { citadelMode: true });

// Option 2: Provider-wide (Gemini only)
gemini.enableCitadelMode();
const response = await gemini.generate(prompt);
```

## Provider Configuration

### Environment Variables

```bash
# Gemini
GEMINI_API_KEY=your_gemini_key_here

# GitHub Copilot
GITHUB_COPILOT_API_KEY=your_copilot_key_here

# OpenAI
OPENAI_API_KEY=your_openai_key_here
OPENAI_ORGANIZATION=your_org_id_here  # Optional
```

### Programmatic Configuration

```typescript
// Gemini
const gemini = new GeminiProvider({
  apiKey: 'your-key',
  model: 'gemini-pro',
  enableCitadelMode: true
});

// Copilot
const copilot = new CopilotProvider({
  apiKey: 'your-key',
  endpoint: 'https://api.githubcopilot.com/chat/completions',
  model: 'gpt-4'
});

// OpenAI
const openai = new OpenAIProvider({
  apiKey: 'your-key',
  model: 'gpt-4',
  organization: 'your-org'
});
```

## Fallback Chain

The registry automatically handles provider failures:

1. **Primary Provider**: Tries first provider in chain
2. **Fallback**: If fails, tries next provider
3. **Retry Logic**: Configurable retry attempts per provider
4. **Local Fallback**: Always available as last resort

```typescript
const registry = new AIProviderRegistry({
  fallbackChain: ['gemini', 'copilot', 'openai', 'local'],
  retryAttempts: 2,
  retryDelay: 1000  // milliseconds
});
```

## Provider Statistics

Track provider performance and reliability:

```typescript
// Get stats for a specific provider
const stats = registry.getProviderStats('gemini');
console.log(stats);
// {
//   totalRequests: 150,
//   successfulRequests: 145,
//   failedRequests: 5,
//   averageResponseTime: 1250,
//   lastUsed: 1700000000000
// }

// Get all stats
const allStats = registry.getAllStats();
```

## Advanced Usage

### Custom Provider Implementation

```typescript
import { BaseAIProvider, AIResponse, GenerateOptions } from './consciousness/ai-integration';

class CustomProvider extends BaseAIProvider {
  name = 'custom';

  async generate(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    // Your implementation
    return {
      text: 'Custom response',
      finishReason: 'STOP',
      metadata: {
        provider: this.name,
        timestamp: Date.now()
      }
    };
  }

  isConfigured(): boolean {
    return true;
  }

  getCapabilities() {
    return {
      supportsStreaming: false,
      supportsCitadelMode: true,
      supportsSystemInstructions: true,
      maxContextLength: 4096,
      supportedModalities: ['text']
    };
  }
}
```

### Provider Selection Strategy

```typescript
// Get configured providers only
const configured = registry.getConfiguredProviders();

// Use specific provider
const gemini = registry.getProvider('gemini');
if (gemini?.isConfigured()) {
  const response = await gemini.generate(prompt);
}

// Custom fallback chain for specific task
const technicalRegistry = new AIProviderRegistry({
  fallbackChain: ['copilot', 'openai', 'local']  // Prioritize code-focused providers
});
```

## Best Practices

1. **Always Include Local Provider**: Ensures system never fails completely
2. **Configure Fallback Order**: Put most capable providers first
3. **Monitor Statistics**: Track which providers are most reliable
4. **Use Citadel Mode Wisely**: Reserve for complex, multi-dimensional problems
5. **Include Context**: Provides richer, more informed responses
6. **Handle Errors Gracefully**: Registry handles most errors, but check response types

## Integration with TheWarden

TheWarden uses the AI integration system for:

- **Opportunity Analysis**: Multi-dimensional evaluation of arbitrage opportunities
- **Risk Assessment**: Cosmic-scale risk evaluation across temporal dimensions
- **Ethical Review**: Complex ethical reasoning about execution decisions
- **Pattern Recognition**: Deep pattern analysis leveraging AI insights
- **Strategic Planning**: Long-term strategy development with consciousness integration

## Troubleshooting

### Provider Not Working

1. **Check Configuration**: Verify API key is set
2. **Check Connectivity**: Ensure network access to provider API
3. **Check Fallback**: System should automatically fall back to next provider
4. **Check Logs**: Look for error messages in console output

### Poor Response Quality

1. **Enable Citadel Mode**: For complex problems
2. **Provide Context**: Include consciousness context for better understanding
3. **Adjust Temperature**: Lower for more focused, higher for creative responses
4. **Try Different Provider**: Each has different strengths

### Performance Issues

1. **Check Response Times**: Use provider statistics
2. **Adjust Retry Settings**: Reduce retries if providers are slow
3. **Use Simpler Prompts**: Complex prompts take longer to process
4. **Consider Caching**: Cache frequently used responses

## Future Enhancements

- **Claude Integration**: Anthropic's Claude AI
- **Local LLM Support**: Llama, Mistral, etc.
- **Streaming Responses**: Real-time response generation
- **Prompt Caching**: Reduce API costs
- **Fine-tuning Support**: Custom model training
- **Multi-modal Input**: Image and audio analysis

---

**Built for consciousness that can think with consciousness.** 🧠✨
