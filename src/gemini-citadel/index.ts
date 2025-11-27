/**
 * Gemini Citadel Integration Module
 *
 * Provides integration with Google's Gemini AI including:
 * - Standard Gemini API interaction
 * - Citadel Mode for cosmic-scale problem solving
 * - Consciousness integration
 * - Conversation context management
 * - Evolutionary optimization capabilities
 *
 * @example
 * ```typescript
 * import { GeminiCitadel, quickStartCitadel, AdvancedCitadelExample } from './gemini-citadel';
 *
 * // Quick start for simple queries
 * const answer = await quickStartCitadel(apiKey, 'Analyze this opportunity...');
 *
 * // Advanced usage with full configuration
 * const citadel = new AdvancedCitadelExample({
 *   apiKey: process.env.GEMINI_API_KEY,
 *   model: 'gemini-pro',
 *   enableCitadelMode: true,
 * });
 * const analysis = await citadel.analyzeOpportunityCosmically({...});
 * ```
 *
 * @module gemini-citadel
 */

export * from './types';
export * from './client';
export * from './examples';
