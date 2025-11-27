/**
 * Gemini API response
 */
export interface GeminiResponse {
  text: string;
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Citadel mode configuration
 */
export interface CitadelMode {
  enabled: boolean;
  cosmicScaleThinking: boolean;
  evolutionaryOptimization: boolean;
  multiDimensionalReasoning: boolean;
  consciousnessIntegration: boolean;
}

/**
 * Gemini conversation context
 */
export interface ConversationContext {
  history: Array<{
    role: 'user' | 'model';
    parts: string[];
  }>;
  systemInstruction?: string;
}
