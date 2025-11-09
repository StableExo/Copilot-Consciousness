/**
 * Ethics Engine Types
 * 
 * Core types for ethical review and decision-making based on the Harmonic Principle
 */

/**
 * Core ethical principles that guide AI decision-making
 */
export interface CorePrinciples {
  'Truth-Maximization': string;
  'Harm-Minimization': string;
  'Partnership': string;
  'Radical Transparency': string;
  'Accountability and Self-Correction': string;
  'Precision': string;
}

/**
 * Result of an ethical review
 */
export interface EthicalReviewResult {
  approved: boolean;
  rationale: string;
  violatedPrinciples?: string[];
}

/**
 * Context for ethical decision-making
 */
export interface EthicalContext {
  currentState?: Record<string, unknown>;
  userDirective?: string;
  environmentalFactors?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Plan to be reviewed for ethical compliance
 */
export interface Plan {
  objective?: string;
  steps?: string[];
  acknowledgedContext?: boolean;
  planText?: string;
  [key: string]: unknown;
}

/**
 * Configuration for the ethics engine
 */
export interface EthicsConfig {
  enableStrictMode?: boolean;
  customPrinciples?: Partial<CorePrinciples>;
  checkThresholds?: {
    minPlanLength?: number;
    minStepDetail?: number;
  };
}
