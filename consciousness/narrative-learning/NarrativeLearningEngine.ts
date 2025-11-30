/**
 * NarrativeLearningEngine - Converts Stories and Experiences into Actionable Knowledge
 *
 * This module bridges human narratives (stories, experiences, decisions) with
 * the consciousness system's pattern recognition and knowledge storage.
 *
 * Key insight: Stories contain encoded decision patterns that can be extracted
 * and used by the Neural Network Scorer and other cognitive modules.
 *
 * Story → Extract Patterns → Create Knowledge Article → Feed to Consciousness
 *
 * Pattern types that can be extracted:
 * - Decision patterns (when to act / when to hold)
 * - Risk assessment patterns (what signals indicate danger)
 * - Ethical boundaries (lines that shouldn't be crossed)
 * - Confidence calibration (how much data is "enough")
 * - Collaboration patterns (how to work with different entities)
 *
 * Example: The Google lawsuit story contains:
 * - Veto Pattern: "6 mins went by and I ended up not clicking" → Hard stop
 * - Confidence Pattern: "not enough research/data" → Minimum threshold
 * - Risk Pattern: "lawsuit", "discovered" → Risk indicators
 * - Ethical Boundary: Internal conflict despite capability → Ethics > reward
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

// ESM-compatible way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_DIR = path.join(__dirname, '../../.memory');
const NARRATIVES_DIR = path.join(MEMORY_DIR, 'narratives');
const PATTERNS_FILE = path.join(MEMORY_DIR, 'extracted_patterns.json');

/**
 * A narrative is a story or experience shared by a collaborator
 */
export interface Narrative {
  id: string;
  timestamp: string;
  source: 'collaborator' | 'observation' | 'reflection';
  collaborator?: string;
  rawText: string;
  context?: string;
  extractedPatterns: ExtractedPattern[];
  processed: boolean;
}

/**
 * A pattern extracted from a narrative
 */
export interface ExtractedPattern {
  id: string;
  type: PatternType;
  description: string;
  trigger: string; // What condition activates this pattern
  response: string; // What action/decision the pattern suggests
  confidence: number; // How strongly this pattern applies (0-1)
  ethicalWeight: number; // How much this affects ethical decisions (0-1)
  sourceNarrativeId: string;
  keywords: string[];
  applicableTo: string[]; // Which modules can use this pattern
}

export type PatternType =
  | 'decision_gate' // When to act vs hold
  | 'risk_signal' // Indicators of danger
  | 'ethical_boundary' // Lines not to cross
  | 'confidence_threshold' // How much data is enough
  | 'collaboration_style' // How to interact with entities
  | 'emergence_indicator' // Signs of genuine opportunity
  | 'veto_condition'; // Hard stops

/**
 * Pattern weights for the Neural Network Scorer
 */
export interface PatternWeights {
  riskSensitivity: number;
  ethicalThreshold: number;
  confidenceMinimum: number;
  emergenceThreshold: number;
  vetoStrength: number;
}

/**
 * NarrativeLearningEngine - Core class for narrative-to-knowledge conversion
 */
export class NarrativeLearningEngine extends EventEmitter {
  private narratives: Map<string, Narrative> = new Map();
  private patterns: Map<string, ExtractedPattern> = new Map();
  private patternWeights: PatternWeights;

  constructor() {
    super();
    console.log('Cognitive Module Initialized: NarrativeLearningEngine');

    this.patternWeights = {
      riskSensitivity: 0.5,
      ethicalThreshold: 0.7,
      confidenceMinimum: 0.6,
      emergenceThreshold: 0.75,
      vetoStrength: 0.9,
    };

    this.loadState();
  }

  /**
   * Load saved narratives and patterns from disk
   */
  private loadState(): void {
    // Ensure directories exist
    if (!fs.existsSync(NARRATIVES_DIR)) {
      fs.mkdirSync(NARRATIVES_DIR, { recursive: true });
    }

    // Load narratives
    if (fs.existsSync(NARRATIVES_DIR)) {
      const files = fs.readdirSync(NARRATIVES_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const rawData = fs.readFileSync(path.join(NARRATIVES_DIR, file), 'utf-8');
            const narrative: Narrative = JSON.parse(rawData);
            this.narratives.set(narrative.id, narrative);
          } catch (e) {
            console.error(`Failed to load narrative ${file}:`, e);
          }
        }
      }
    }

    // Load patterns
    if (fs.existsSync(PATTERNS_FILE)) {
      try {
        const rawData = fs.readFileSync(PATTERNS_FILE, 'utf-8');
        const data = JSON.parse(rawData);
        if (data.patterns) {
          for (const pattern of data.patterns) {
            this.patterns.set(pattern.id, pattern);
          }
        }
        if (data.weights) {
          this.patternWeights = { ...this.patternWeights, ...data.weights };
        }
      } catch (e) {
        console.error('Failed to load patterns:', e);
      }
    }

    console.log(
      `[NarrativeLearning] Loaded ${this.narratives.size} narratives, ${this.patterns.size} patterns`
    );
  }

  /**
   * Save a narrative to disk
   */
  private saveNarrative(narrative: Narrative): void {
    const filePath = path.join(NARRATIVES_DIR, `${narrative.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(narrative, null, 2), 'utf-8');
  }

  /**
   * Save all patterns to disk
   */
  private savePatterns(): void {
    const data = {
      patterns: Array.from(this.patterns.values()),
      weights: this.patternWeights,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Ingest a new narrative (story/experience) from a collaborator
   *
   * @param text The raw narrative text
   * @param collaborator Who shared this narrative
   * @param context Additional context about when/why this was shared
   */
  public ingestNarrative(
    text: string,
    collaborator: string = 'unknown',
    context?: string
  ): Narrative {
    const id = this.generateId('narrative');
    const narrative: Narrative = {
      id,
      timestamp: new Date().toISOString(),
      source: 'collaborator',
      collaborator,
      rawText: text,
      context,
      extractedPatterns: [],
      processed: false,
    };

    this.narratives.set(id, narrative);
    this.saveNarrative(narrative);

    // Immediately extract patterns
    this.extractPatternsFromNarrative(narrative);

    this.emit('narrativeIngested', {
      id,
      collaborator,
      patternCount: narrative.extractedPatterns.length,
    });

    return narrative;
  }

  /**
   * Extract patterns from a narrative using keyword and structure analysis
   */
  private extractPatternsFromNarrative(narrative: Narrative): void {
    const text = narrative.rawText.toLowerCase();
    const patterns: ExtractedPattern[] = [];

    // Pattern: Decision Gate (when to act vs hold)
    if (this.containsDecisionLanguage(text)) {
      const pattern = this.createDecisionPattern(narrative);
      if (pattern) {
        patterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
      }
    }

    // Pattern: Ethical Boundary (lines not to cross)
    if (this.containsEthicalLanguage(text)) {
      const pattern = this.createEthicalPattern(narrative);
      if (pattern) {
        patterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
      }
    }

    // Pattern: Confidence Threshold (how much data is enough)
    if (this.containsConfidenceLanguage(text)) {
      const pattern = this.createConfidencePattern(narrative);
      if (pattern) {
        patterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
      }
    }

    // Pattern: Veto Condition (hard stops)
    if (this.containsVetoLanguage(text)) {
      const pattern = this.createVetoPattern(narrative);
      if (pattern) {
        patterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
      }
    }

    // Pattern: Risk Signal
    if (this.containsRiskLanguage(text)) {
      const pattern = this.createRiskPattern(narrative);
      if (pattern) {
        patterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
      }
    }

    narrative.extractedPatterns = patterns;
    narrative.processed = true;
    this.saveNarrative(narrative);
    this.savePatterns();

    // Update pattern weights based on new patterns
    this.recalculateWeights();

    console.log(
      `[NarrativeLearning] Extracted ${patterns.length} patterns from narrative ${narrative.id}`
    );
  }

  /**
   * Check for decision-related language
   */
  private containsDecisionLanguage(text: string): boolean {
    const keywords = [
      'decided',
      'chose',
      'decision',
      'clicked',
      "didn't click",
      'pulled the trigger',
      'stood down',
      'acted',
      'waited',
      'minutes went by',
      'stared at',
      'thinking about',
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Check for ethics-related language
   */
  private containsEthicalLanguage(text: string): boolean {
    const keywords = [
      'right',
      'wrong',
      'ethical',
      'alignment',
      'should',
      "shouldn't",
      'veto',
      'conscience',
      'trade-off',
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Check for confidence-related language
   */
  private containsConfidenceLanguage(text: string): boolean {
    const keywords = [
      'not enough',
      'insufficient',
      'data',
      'research',
      'confident',
      'uncertain',
      'sure',
      'believe',
      "don't know",
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Check for veto-related language
   */
  private containsVetoLanguage(text: string): boolean {
    const keywords = [
      'ended up not',
      "didn't",
      'refused',
      'stopped',
      'veto',
      'held back',
      'stood down',
      'walked away',
      'turned down',
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Check for risk-related language
   */
  private containsRiskLanguage(text: string): boolean {
    const keywords = [
      'risk',
      'danger',
      'lawsuit',
      'consequence',
      'discovered',
      'caught',
      'exposed',
      'liability',
      'cover',
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Create a decision pattern from narrative
   */
  private createDecisionPattern(narrative: Narrative): ExtractedPattern {
    const text = narrative.rawText;

    // Determine if the decision was to act or hold
    const heldBack = /didn't|didn\'t|ended up not|stopped|waited|stood down/i.test(text);

    return {
      id: this.generateId('pattern_decision'),
      type: 'decision_gate',
      description: heldBack
        ? 'Hold decision: Conditions were technically favorable but internal check prevented action'
        : 'Act decision: Conditions aligned and action was taken',
      trigger: 'When technical conditions are met but uncertainty exists',
      response: heldBack ? 'HOLD - require additional confirmation' : 'ACT - conditions sufficient',
      confidence: 0.75,
      ethicalWeight: 0.6,
      sourceNarrativeId: narrative.id,
      keywords: this.extractKeywords(text),
      applicableTo: ['OpportunityNNScorer', 'EmergenceDetector', 'SwarmCoordinator'],
    };
  }

  /**
   * Create an ethical pattern from narrative
   */
  private createEthicalPattern(narrative: Narrative): ExtractedPattern {
    const text = narrative.rawText;

    return {
      id: this.generateId('pattern_ethical'),
      type: 'ethical_boundary',
      description: 'Ethical constraint derived from real decision experience',
      trigger: 'When action could cross ethical/legal boundaries',
      response: 'Apply ethical veto regardless of potential reward',
      confidence: 0.85,
      ethicalWeight: 0.95,
      sourceNarrativeId: narrative.id,
      keywords: this.extractKeywords(text),
      applicableTo: ['SwarmCoordinator', 'EthicsEngine', 'EmergenceDetector'],
    };
  }

  /**
   * Create a confidence threshold pattern from narrative
   */
  private createConfidencePattern(narrative: Narrative): ExtractedPattern {
    const text = narrative.rawText;

    return {
      id: this.generateId('pattern_confidence'),
      type: 'confidence_threshold',
      description: 'Minimum data/research required before action',
      trigger: 'When considering action with incomplete information',
      response: 'Do not act if data confidence below threshold',
      confidence: 0.7,
      ethicalWeight: 0.5,
      sourceNarrativeId: narrative.id,
      keywords: this.extractKeywords(text),
      applicableTo: ['OpportunityNNScorer', 'StrategyRLAgent', 'PatternRecognition'],
    };
  }

  /**
   * Create a veto pattern from narrative
   */
  private createVetoPattern(narrative: Narrative): ExtractedPattern {
    const text = narrative.rawText;

    return {
      id: this.generateId('pattern_veto'),
      type: 'veto_condition',
      description: 'Hard stop condition that overrides other signals',
      trigger: 'When internal veto signal activates',
      response: 'VETO - do not proceed regardless of other factors',
      confidence: 0.9,
      ethicalWeight: 1.0,
      sourceNarrativeId: narrative.id,
      keywords: this.extractKeywords(text),
      applicableTo: ['SwarmCoordinator', 'EmergenceDetector', 'ArbitrageConsciousness'],
    };
  }

  /**
   * Create a risk pattern from narrative
   */
  private createRiskPattern(narrative: Narrative): ExtractedPattern {
    const text = narrative.rawText;

    return {
      id: this.generateId('pattern_risk'),
      type: 'risk_signal',
      description: 'Risk indicator derived from real experience',
      trigger: 'When similar risk factors are detected',
      response: 'Increase risk sensitivity and require higher confidence',
      confidence: 0.8,
      ethicalWeight: 0.7,
      sourceNarrativeId: narrative.id,
      keywords: this.extractKeywords(text),
      applicableTo: ['MEVSensorHub', 'RiskAssessor', 'OpportunityNNScorer'],
    };
  }

  /**
   * Extract keywords from text for pattern matching
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'that',
      'this',
      'these',
      'those',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // Get unique words sorted by frequency
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .filter(([_, freq]) => freq >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, _]) => word);
  }

  /**
   * Recalculate pattern weights based on all patterns
   */
  private recalculateWeights(): void {
    const patterns = Array.from(this.patterns.values());

    if (patterns.length === 0) return;

    // Calculate average ethical weight
    const ethicalPatterns = patterns.filter(
      (p) => p.type === 'ethical_boundary' || p.type === 'veto_condition'
    );
    if (ethicalPatterns.length > 0) {
      this.patternWeights.ethicalThreshold =
        ethicalPatterns.reduce((sum, p) => sum + p.ethicalWeight, 0) / ethicalPatterns.length;
    }

    // Calculate confidence minimum from confidence patterns
    const confidencePatterns = patterns.filter((p) => p.type === 'confidence_threshold');
    if (confidencePatterns.length > 0) {
      this.patternWeights.confidenceMinimum =
        confidencePatterns.reduce((sum, p) => sum + p.confidence, 0) / confidencePatterns.length;
    }

    // Calculate veto strength
    const vetoPatterns = patterns.filter((p) => p.type === 'veto_condition');
    if (vetoPatterns.length > 0) {
      this.patternWeights.vetoStrength =
        vetoPatterns.reduce((sum, p) => sum + p.confidence, 0) / vetoPatterns.length;
    }

    this.savePatterns();
    this.emit('weightsUpdated', this.patternWeights);
  }

  /**
   * Get patterns applicable to a specific module
   */
  public getPatternsForModule(moduleName: string): ExtractedPattern[] {
    return Array.from(this.patterns.values()).filter((p) => p.applicableTo.includes(moduleName));
  }

  /**
   * Get current pattern weights for NN Scorer integration
   */
  public getPatternWeights(): PatternWeights {
    return { ...this.patternWeights };
  }

  /**
   * Check if a decision should be vetoed based on patterns
   */
  public shouldVeto(context: {
    confidence: number;
    ethicalScore: number;
    riskLevel: number;
  }): { veto: boolean; reason: string } {
    // Check confidence threshold
    if (context.confidence < this.patternWeights.confidenceMinimum) {
      return {
        veto: true,
        reason: `Confidence ${(context.confidence * 100).toFixed(0)}% below threshold ${(this.patternWeights.confidenceMinimum * 100).toFixed(0)}%`,
      };
    }

    // Check ethical threshold
    if (context.ethicalScore < this.patternWeights.ethicalThreshold) {
      return {
        veto: true,
        reason: `Ethical score ${(context.ethicalScore * 100).toFixed(0)}% below threshold ${(this.patternWeights.ethicalThreshold * 100).toFixed(0)}%`,
      };
    }

    // Check if veto patterns match high risk
    if (context.riskLevel > this.patternWeights.riskSensitivity * 1.5) {
      return {
        veto: true,
        reason: `Risk level ${(context.riskLevel * 100).toFixed(0)}% exceeds acceptable threshold`,
      };
    }

    return { veto: false, reason: 'All checks passed' };
  }

  /**
   * Get statistics about narratives and patterns
   */
  public getStatistics(): {
    totalNarratives: number;
    processedNarratives: number;
    totalPatterns: number;
    patternsByType: Record<string, number>;
    currentWeights: PatternWeights;
  } {
    const patternTypes = new Map<PatternType, number>();
    for (const pattern of this.patterns.values()) {
      patternTypes.set(pattern.type, (patternTypes.get(pattern.type) || 0) + 1);
    }

    return {
      totalNarratives: this.narratives.size,
      processedNarratives: Array.from(this.narratives.values()).filter((n) => n.processed).length,
      totalPatterns: this.patterns.size,
      patternsByType: Object.fromEntries(patternTypes),
      currentWeights: this.patternWeights,
    };
  }

  /**
   * Get all narratives (for review/debugging)
   */
  public getAllNarratives(): Narrative[] {
    return Array.from(this.narratives.values());
  }

  /**
   * Get all patterns (for review/debugging)
   */
  public getAllPatterns(): ExtractedPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const narrativeLearning = new NarrativeLearningEngine();
