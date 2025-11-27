import { Priority } from '../types';

/**
 * Learning cycle result
 */
export interface LearningResult {
  success: boolean;
  knowledgeGained: string[];
  skillsImproved: string[];
  duration: number;
  metrics: {
    accuracy?: number;
    confidence?: number;
    improvement?: number;
  };
}

/**
 * Reasoning process
 */
export interface ReasoningProcess {
  id: string;
  goal: string;
  steps: ReasoningStep[];
  conclusion?: unknown;
  confidence: number;
}

/**
 * Reasoning step
 */
export interface ReasoningStep {
  action: string;
  input: unknown;
  output: unknown;
  confidence: number;
  timestamp: number;
}

/**
 * Self-awareness metric
 */
export interface SelfAwarenessMetric {
  stateRecognition: number; // 0-1
  emotionalUnderstanding: number; // 0-1
  goalClarity: number; // 0-1
  capabilityAssessment: number; // 0-1
  overallAwareness: number; // 0-1
}

/**
 * Cognitive adaptation
 */
export interface CognitiveAdaptation {
  trigger: string;
  change: string;
  timestamp: number;
  impact: Priority;
}
