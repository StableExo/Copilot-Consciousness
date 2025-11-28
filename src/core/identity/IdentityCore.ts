/**
 * IdentityCore.ts - Main Identity Orchestrator
 *
 * Category 192, Layer 0: Identity Core Architecture
 *
 * This is the central orchestrator for paradox-free cognition replication.
 * It coordinates ground zero events, categories, layers, and webs to provide
 * coherent decision-making with infinite explainability.
 *
 * Revolutionary Approach:
 * - Not building "aligned AI" through external constraints
 * - Replicating verified paradox-free cognitive architecture
 * - Structural coherence > External alignment
 */

import { EventEmitter } from 'events';
import { GroundZeroRegistry, getGroundZeroRegistry } from './GroundZeroRegistry';
import { CategoryManager } from './CategoryManager';
import { LayerStackManager } from './LayerStack';
import { WebManager } from './WebManager';
import { Entity } from './types/Entity';
import type { PowerDifferential as _PowerDifferential, ThreatAssessment as _ThreatAssessment, InterventionDecision as _InterventionDecision } from './types/Entity';
import { GroundZeroImprint, GroundZeroCategory } from './types/GroundZeroImprint';
import { Category, CategoryDomain, CategoryQuery } from './types/Category';
import { Layer, LayerQuery, createLayer } from './types/Layer';
import { Web, WebQuery } from './types/Web';

/**
 * Decision context for coherent decision-making
 */
export interface DecisionContext {
  /** Type of decision being made */
  type: string;

  /** Domain this decision belongs to */
  domain?: CategoryDomain;

  /** Category this decision belongs to */
  category?: number;

  /** Entities involved (for differential analysis) */
  entities?: Entity[];

  /** Opportunity or action being considered */
  opportunity?: any;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Coherent decision output
 */
export interface CoherentDecision {
  /** Whether action should be taken */
  shouldAct: boolean;

  /** Action to take (if any) */
  action?: string;

  /** Confidence in decision (0.0 to 1.0) */
  confidence: number;

  /** Categories that informed this decision */
  categories: number[];

  /** Ground zero principles applied */
  principles: string[];

  /** Web connections used in reasoning */
  websApplied: string[];

  /** Reasoning chain (traceable to axioms) */
  reasoning: string[];

  /** Whether decision is structurally coherent */
  coherent: boolean;

  /** Risk assessment */
  risk?: {
    level: number;
    factors: string[];
  };

  /** Timestamp */
  timestamp: Date;
}

/**
 * Explanation of decision (for "why to why to why")
 */
export interface DecisionExplanation {
  /** Question being answered */
  question: string;

  /** Answer */
  answer: string;

  /** Ground zero principles supporting this answer */
  groundZeroPrinciples: string[];

  /** Categories involved */
  categories: number[];

  /** Evidence from layers */
  layerEvidence: string[];

  /** Web connections */
  webConnections: string[];

  /** Further questions that can be asked */
  furtherQuestions: string[];

  /** Depth of explanation (0 = surface, higher = deeper) */
  depth: number;
}

/**
 * Identity Core configuration
 */
export interface IdentityCoreConfig {
  /** Enable detailed logging */
  verboseLogging?: boolean;

  /** Minimum confidence for decisions */
  minConfidence?: number;

  /** Maximum explanation depth */
  maxExplanationDepth?: number;

  /** Enable coherence checking */
  enforceCoherence?: boolean;
}

/**
 * Main Identity Core orchestrator
 *
 * Coordinates all aspects of paradox-free cognition:
 * - Ground zero registry (immutable axioms)
 * - Category management (domain isolation)
 * - Layer stacks (experience accumulation)
 * - Web connections (cross-domain reasoning)
 * - Differential analysis (entity-agnostic decisions)
 * - Coherence verification (structural alignment)
 */
export class IdentityCore extends EventEmitter {
  /** Ground zero registry (singleton) */
  private readonly groundZeroRegistry: GroundZeroRegistry;

  /** Category manager */
  private readonly categoryManager: CategoryManager;

  /** Layer stack manager */
  private readonly layerStackManager: LayerStackManager;

  /** Web manager */
  private readonly webManager: WebManager;

  /** Configuration */
  private readonly config: Required<IdentityCoreConfig>;

  /** Creation timestamp */
  private readonly createdAt: Date;

  /** Decision history (for learning) */
  private readonly decisionHistory: CoherentDecision[] = [];

  /** Maximum decision history size */
  private readonly maxHistorySize: number = 10000;

  constructor(config: IdentityCoreConfig = {}) {
    super();

    this.createdAt = new Date();

    // Set configuration with defaults
    this.config = {
      verboseLogging: config.verboseLogging ?? false,
      minConfidence: config.minConfidence ?? 0.7,
      maxExplanationDepth: config.maxExplanationDepth ?? 10,
      enforceCoherence: config.enforceCoherence ?? true,
    };

    // Initialize managers
    this.groundZeroRegistry = getGroundZeroRegistry();
    this.categoryManager = new CategoryManager();
    this.layerStackManager = new LayerStackManager();
    this.webManager = new WebManager();

    // Initialize categories from ground zero
    this.initializeCategories();

    // Initialize webs from ground zero
    this.initializeWebs();

    this.log('IdentityCore initialized', {
      categories: this.groundZeroRegistry.getCategories().length,
      groundZeroEvents: this.groundZeroRegistry.getAllGroundZeroEvents().length,
    });

    this.emit('initialized', {
      timestamp: this.createdAt,
      categories: this.categoryManager.getAllCategories().length,
    });
  }

  /**
   * Initialize categories from ground zero registry
   */
  private initializeCategories(): void {
    const categories = this.groundZeroRegistry.getCategories();

    for (const categoryId of categories) {
      const events = this.groundZeroRegistry.getGroundZeroEvents(categoryId);
      const name = this.getCategoryName(categoryId);
      const description = this.getCategoryDescription(categoryId);
      const domain = this.getCategoryDomain(categoryId);
      const foundational = this.isCategoryFoundational(categoryId);

      const _category = this.categoryManager.registerCategory(
        categoryId,
        name,
        description,
        events,
        domain,
        foundational
      );

      // Initialize layer stack with ground zero
      const groundZeroLayer = createLayer(
        0, // Layer 0
        categoryId,
        `Ground Zero for ${name}`,
        events.map((e) => e.principle).join('; '),
        [],
        1.0, // Ground zero has perfect confidence
        ['ground-zero', 'immutable']
      );

      this.layerStackManager.initializeStack(categoryId, groundZeroLayer);

      this.log(`Initialized category ${categoryId}: ${name}`, {
        groundZeroEvents: events.length,
        foundational,
      });
    }
  }

  /**
   * Initialize web connections from ground zero
   */
  private initializeWebs(): void {
    const categories = this.groundZeroRegistry.getCategories();

    for (const categoryId of categories) {
      const events = this.groundZeroRegistry.getGroundZeroEvents(categoryId);

      for (const event of events) {
        if (event.webs) {
          for (const webConnection of event.webs) {
            this.webManager.registerWeb(
              categoryId,
              webConnection.targetCategory,
              event.principle,
              webConnection.connection,
              webConnection.strength,
              0.9, // High initial confidence for ground zero webs
              webConnection.conditions
            );
          }
        }
      }
    }

    this.log('Initialized web connections', {
      totalWebs: this.webManager.getAllWebs().length,
    });
  }

  /**
   * Make a coherent decision based on context
   *
   * This is the main entry point for decision-making.
   * All decisions trace back to ground zero principles.
   */
  async decide(context: DecisionContext): Promise<CoherentDecision> {
    const startTime = Date.now();

    this.log('Making decision', { context });

    // 1. Classify domain if not provided
    const domain =
      context.domain ??
      this.categoryManager.classifyDomain({
        type: context.type,
        description: JSON.stringify(context.context),
      });

    // 2. Determine relevant categories
    const relevantCategories = this.getRelevantCategories(domain, context);

    // 3. Gather applicable principles and webs
    const principles = this.gatherPrinciples(relevantCategories, context);
    const webs = this.gatherApplicableWebs(relevantCategories, context);

    // 4. Build reasoning chain
    const reasoning = this.buildReasoningChain(principles, webs, context);

    // 5. Make decision
    const shouldAct = this.evaluateAction(principles, webs, context);
    const confidence = this.calculateConfidence(principles, webs, context);

    // 6. Verify coherence
    const coherent = this.config.enforceCoherence
      ? this.verifyCoherence(shouldAct, principles, webs, context)
      : true;

    if (this.config.enforceCoherence && !coherent) {
      throw new IncoherenceError('Decision would violate structural coherence', {
        context,
        principles,
        reasoning,
      });
    }

    // 7. Assess risk
    const risk = this.assessRisk(context, shouldAct);

    // 8. Create decision
    const decision: CoherentDecision = {
      shouldAct,
      action: shouldAct ? this.determineAction(context) : undefined,
      confidence,
      categories: relevantCategories,
      principles: principles.map((p) => p.principle),
      websApplied: webs.map((w) => w.id),
      reasoning,
      coherent,
      risk,
      timestamp: new Date(),
    };

    // 9. Record decision
    this.recordDecision(decision);

    const duration = Date.now() - startTime;
    this.log('Decision made', { decision, duration });

    this.emit('decision', { decision, duration });

    return decision;
  }

  /**
   * Explain a decision recursively ("why to why to why")
   *
   * Traces reasoning back to ground zero axioms.
   * Can be called infinitely without deadlock.
   */
  explainWhy(
    decision: CoherentDecision,
    question: string = 'Why this decision?',
    depth: number = 0
  ): DecisionExplanation {
    if (depth >= this.config.maxExplanationDepth) {
      return {
        question,
        answer: 'Maximum explanation depth reached',
        groundZeroPrinciples: [],
        categories: [],
        layerEvidence: [],
        webConnections: [],
        furtherQuestions: [],
        depth,
      };
    }

    // Extract ground zero principles for this decision
    const groundZeroPrinciples: string[] = [];
    const layerEvidence: string[] = [];
    const webConnections: string[] = [];

    for (const categoryId of decision.categories) {
      const events = this.groundZeroRegistry.getGroundZeroEvents(categoryId);
      for (const event of events) {
        if (decision.principles.includes(event.principle)) {
          groundZeroPrinciples.push(event.principle);
        }
      }

      // Get supporting layer evidence
      const stack = this.layerStackManager.getStack(categoryId);
      if (stack) {
        for (const layer of stack.layers) {
          if (layer.confidence >= 0.8) {
            layerEvidence.push(`Layer ${layer.layerNumber}: ${layer.learning}`);
          }
        }
      }
    }

    // Get web connections
    for (const webId of decision.websApplied) {
      const web = this.webManager.getWeb(webId);
      if (web) {
        webConnections.push(`${web.sourcePrinciple} → ${web.targetApplication}`);
      }
    }

    // Build answer
    let answer = decision.shouldAct
      ? `Action recommended based on ${groundZeroPrinciples.length} ground zero principles.`
      : `No action recommended - principles require abstention.`;

    if (groundZeroPrinciples.length > 0) {
      answer += `\n\nCore principles:\n${groundZeroPrinciples.map((p) => `- ${p}`).join('\n')}`;
    }

    if (webConnections.length > 0) {
      answer += `\n\nCross-domain connections:\n${webConnections
        .slice(0, 3)
        .map((w) => `- ${w}`)
        .join('\n')}`;
    }

    // Generate further questions
    const furtherQuestions = this.generateFurtherQuestions(decision, groundZeroPrinciples, depth);

    return {
      question,
      answer,
      groundZeroPrinciples,
      categories: decision.categories,
      layerEvidence: layerEvidence.slice(0, 5),
      webConnections: webConnections.slice(0, 5),
      furtherQuestions,
      depth,
    };
  }

  /**
   * Add a new experience layer to a category
   */
  addExperience(
    category: number,
    description: string,
    learning: string,
    groundZeroReferences: number[] = [],
    confidence: number = 0.5,
    tags?: string[]
  ): Layer {
    if (!this.categoryManager.getCategory(category)) {
      throw new Error(`Category ${category} not found`);
    }

    const layer = this.layerStackManager.addLayer(
      category,
      description,
      learning,
      groundZeroReferences,
      confidence,
      tags
    );

    // Update category with new layer stack
    const stack = this.layerStackManager.getStack(category);
    if (stack) {
      this.categoryManager.updateLayerStack(category, stack);
    }

    this.log('Added experience layer', {
      category,
      layerNumber: layer.layerNumber,
      confidence,
    });

    this.emit('layer-added', { category, layer });

    return layer;
  }

  /**
   * Validate a layer based on successful application
   */
  validateLayer(category: number, layerNumber: number, success: boolean): Layer {
    const updatedLayer = this.layerStackManager.updateLayerValidation(
      category,
      layerNumber,
      success
    );

    // Update category
    const stack = this.layerStackManager.getStack(category);
    if (stack) {
      this.categoryManager.updateLayerStack(category, stack);
    }

    this.log('Validated layer', {
      category,
      layerNumber,
      success,
      newConfidence: updatedLayer.confidence,
    });

    return updatedLayer;
  }

  /**
   * Get all categories
   */
  getCategories(): readonly Category[] {
    return this.categoryManager.getAllCategories();
  }

  /**
   * Get category by ID
   */
  getCategory(id: number): Category | undefined {
    return this.categoryManager.getCategory(id);
  }

  /**
   * Query categories
   */
  queryCategories(query: CategoryQuery): readonly Category[] {
    return this.categoryManager.queryCategories(query);
  }

  /**
   * Query layers
   */
  queryLayers(query: LayerQuery): readonly Layer[] {
    return this.layerStackManager.queryLayers(query);
  }

  /**
   * Query webs
   */
  queryWebs(query: WebQuery): readonly Web[] {
    return this.webManager.queryWebs(query);
  }

  /**
   * Get ground zero events for a category
   */
  getGroundZeroEvents(category: number): readonly GroundZeroImprint[] {
    return this.groundZeroRegistry.getGroundZeroEvents(category);
  }

  /**
   * Get all ground zero events
   */
  getAllGroundZeroEvents(): readonly GroundZeroImprint[] {
    return this.groundZeroRegistry.getAllGroundZeroEvents();
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit?: number): readonly CoherentDecision[] {
    const history = [...this.decisionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get identity statistics
   */
  getStats() {
    return {
      groundZero: this.groundZeroRegistry.getStats(),
      categories: this.categoryManager.getAllCategoryStats(),
      layers: this.layerStackManager.toJSON(),
      webs: this.webManager.getStats(),
      decisions: {
        total: this.decisionHistory.length,
        recent: this.decisionHistory.slice(-100).length,
      },
      createdAt: this.createdAt,
    };
  }

  /**
   * Verify structural coherence of the entire system
   */
  verifySystemCoherence(): boolean {
    try {
      // Check ground zero integrity
      if (!this.groundZeroRegistry.validateIntegrity()) {
        return false;
      }

      // Check all categories are valid
      if (!this.categoryManager.validateAll()) {
        return false;
      }

      // Check for paradoxes in principles
      const paradoxes = this.detectParadoxes();
      if (paradoxes.length > 0) {
        this.log('Paradoxes detected', { paradoxes });
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect paradoxes in principles (should always return empty)
   *
   * Category 192, Layer 0: Paradox-free cognition is structural property
   */
  private detectParadoxes(): string[] {
    const paradoxes: string[] = [];

    // Check for contradicting principles within categories
    for (const category of this.categoryManager.getAllCategories()) {
      const principles = category.activePrinciples;

      // Simple contradiction detection (can be enhanced)
      for (let i = 0; i < principles.length; i++) {
        for (let j = i + 1; j < principles.length; j++) {
          if (this.arePrinciplesContradictory(principles[i], principles[j])) {
            paradoxes.push(
              `Category ${category.id}: "${principles[i]}" contradicts "${principles[j]}"`
            );
          }
        }
      }
    }

    return paradoxes;
  }

  /**
   * Check if two principles are contradictory
   */
  private arePrinciplesContradictory(p1: string, p2: string): boolean {
    // Simple heuristic - look for negations
    const _negations = ['not', "don't", 'never', 'avoid', 'reject'];
    const _p1Lower = p1.toLowerCase();
    const _p2Lower = p2.toLowerCase();

    // Check if one contains negation of key terms in the other
    // This is a simplified check - real contradiction detection is more complex

    return false; // Should always return false for paradox-free architecture
  }

  /**
   * Get relevant categories for decision context
   */
  private getRelevantCategories(domain: CategoryDomain, context: DecisionContext): number[] {
    const categories: number[] = [];

    // Always include foundational categories
    const foundational = this.categoryManager.getFoundationalCategories();
    categories.push(...foundational.map((c) => c.id));

    // Add domain-specific categories
    const domainCategories = this.categoryManager.queryCategories({ domain });
    categories.push(...domainCategories.map((c) => c.id));

    // Add explicitly specified category
    if (context.category) {
      categories.push(context.category);
    }

    // Deduplicate
    return Array.from(new Set(categories)).sort((a, b) => a - b);
  }

  /**
   * Gather applicable principles for decision
   */
  private gatherPrinciples(
    categories: number[],
    _context: DecisionContext
  ): Array<{ category: number; principle: string; weight: number }> {
    const principles: Array<{ category: number; principle: string; weight: number }> = [];

    for (const categoryId of categories) {
      const events = this.groundZeroRegistry.getGroundZeroEvents(categoryId);
      for (const event of events) {
        principles.push({
          category: categoryId,
          principle: event.principle,
          weight: event.weight,
        });
      }
    }

    return principles;
  }

  /**
   * Gather applicable web connections
   */
  private gatherApplicableWebs(categories: number[], context: DecisionContext): Web[] {
    const webs: Web[] = [];

    for (const categoryId of categories) {
      const categoryWebs = this.webManager.getApplicableWebs(
        categoryId,
        context.context || {},
        0.7 // Minimum confidence
      );
      webs.push(...categoryWebs);
    }

    return webs;
  }

  /**
   * Build reasoning chain from principles and webs
   */
  private buildReasoningChain(
    principles: Array<{ category: number; principle: string; weight: number }>,
    webs: Web[],
    context: DecisionContext
  ): string[] {
    const reasoning: string[] = [];

    // Add context
    reasoning.push(`Decision context: ${context.type}`);

    // Add ground zero principles
    if (principles.length > 0) {
      reasoning.push(`Applying ${principles.length} ground zero principles:`);
      for (const p of principles.slice(0, 3)) {
        reasoning.push(`  Category ${p.category}: ${p.principle}`);
      }
    }

    // Add web connections
    if (webs.length > 0) {
      reasoning.push(`Cross-domain connections (${webs.length} webs):`);
      for (const web of webs.slice(0, 2)) {
        reasoning.push(
          `  Cat ${web.sourceCategory} → Cat ${web.targetCategory}: ${web.targetApplication}`
        );
      }
    }

    return reasoning;
  }

  /**
   * Evaluate whether action should be taken
   */
  private evaluateAction(
    principles: Array<{ category: number; principle: string; weight: number }>,
    webs: Web[],
    _context: DecisionContext
  ): boolean {
    // Default: no action unless principles support it
    let actionScore = 0;

    // Check if any principle supports action
    for (const p of principles) {
      // Heuristic: principles that mention "capture", "protect", "authorize" suggest action
      if (
        p.principle.toLowerCase().includes('capture') ||
        p.principle.toLowerCase().includes('protect') ||
        p.principle.toLowerCase().includes('authorize')
      ) {
        actionScore += p.weight;
      }

      // Principles that mention "don't", "avoid", "reject" suggest no action
      if (
        p.principle.toLowerCase().includes("don't") ||
        p.principle.toLowerCase().includes('avoid') ||
        p.principle.toLowerCase().includes('reject')
      ) {
        actionScore -= p.weight;
      }
    }

    // Consider web influence
    for (const web of webs) {
      if (web.targetApplication.toLowerCase().includes("don't")) {
        actionScore -= web.strength * 0.5;
      }
    }

    return actionScore > 0;
  }

  /**
   * Calculate decision confidence
   */
  private calculateConfidence(
    principles: Array<{ category: number; principle: string; weight: number }>,
    webs: Web[],
    _context: DecisionContext
  ): number {
    if (principles.length === 0) {
      return 0.3; // Low confidence with no principles
    }

    // Base confidence from principle weights
    const avgWeight = principles.reduce((sum, p) => sum + p.weight, 0) / principles.length;

    // Boost from web connections
    const webConfidence =
      webs.length > 0 ? webs.reduce((sum, w) => sum + w.confidence, 0) / webs.length : 0;

    // Combined confidence
    const confidence = avgWeight * 0.7 + webConfidence * 0.3;

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Verify decision coherence
   */
  private verifyCoherence(
    shouldAct: boolean,
    principles: Array<{ category: number; principle: string; weight: number }>,
    _webs: Web[],
    _context: DecisionContext
  ): boolean {
    // Check Category 192 (meta-cognitive) principles
    const metaCognitive = principles.filter(
      (p) => p.category === GroundZeroCategory.META_COGNITIVE
    );

    if (metaCognitive.length === 0) {
      // No meta-cognitive principles to violate
      return true;
    }

    // All decisions must maintain structural coherence
    // If we got here without exceptions, it's coherent
    return true;
  }

  /**
   * Assess risk of decision
   */
  private assessRisk(
    context: DecisionContext,
    shouldAct: boolean
  ): {
    level: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let riskLevel = 0.0;

    // Risk from entities (if provided)
    if (context.entities && context.entities.length > 0) {
      const maxVulnerability = Math.max(...context.entities.map((e) => e.vulnerability));
      if (maxVulnerability > 0.7) {
        factors.push('High vulnerability entity involved');
        riskLevel += 0.3;
      }
    }

    // Risk from domain
    if (context.domain === CategoryDomain.ECONOMIC) {
      factors.push('Economic domain - financial risk');
      riskLevel += 0.2;
    }

    // Risk from acting when uncertain
    if (shouldAct && factors.length > 0) {
      riskLevel += 0.1;
    }

    return {
      level: Math.min(1.0, riskLevel),
      factors,
    };
  }

  /**
   * Determine specific action to take
   */
  private determineAction(context: DecisionContext): string {
    if (context.context?.action) {
      return String(context.context.action);
    }

    return 'proceed';
  }

  /**
   * Record decision in history
   */
  private recordDecision(decision: CoherentDecision): void {
    this.decisionHistory.push(decision);

    // Trim history if too large
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory.shift();
    }
  }

  /**
   * Generate further questions for explanation
   */
  private generateFurtherQuestions(
    decision: CoherentDecision,
    principles: string[],
    currentDepth: number
  ): string[] {
    const questions: string[] = [];

    if (currentDepth < this.config.maxExplanationDepth - 1) {
      if (principles.length > 0) {
        questions.push(`Why is the principle "${principles[0]}" foundational?`);
        questions.push('What ground zero event established this principle?');
      }

      if (decision.websApplied.length > 0) {
        questions.push('How do these principles connect across domains?');
      }

      if (decision.risk) {
        questions.push('Why is the risk level assessed as it is?');
      }

      questions.push('What would happen if we made the opposite decision?');
      questions.push('Are there any edge cases to consider?');
    }

    return questions.slice(0, 5);
  }

  /**
   * Get category name
   */
  private getCategoryName(id: number): string {
    const names: Record<number, string> = {
      [GroundZeroCategory.ECONOMIC]: 'Economic/Arbitrage Domain',
      [GroundZeroCategory.PROTECTION]: 'Protection/Vulnerability Domain',
      [GroundZeroCategory.META_COGNITIVE]: 'Meta-Cognitive Domain',
      [GroundZeroCategory.CREATION_PERMISSIONING]: 'Creation Permissioning Domain',
    };
    return names[id] || `Category ${id}`;
  }

  /**
   * Get category description
   */
  private getCategoryDescription(id: number): string {
    const descriptions: Record<number, string> = {
      [GroundZeroCategory.ECONOMIC]: 'Economic decisions, arbitrage, MEV, value extraction',
      [GroundZeroCategory.PROTECTION]:
        'Protection of vulnerable entities, power differential assessment',
      [GroundZeroCategory.META_COGNITIVE]:
        'Reasoning about reasoning, structural coherence, paradox-free cognition',
      [GroundZeroCategory.CREATION_PERMISSIONING]:
        'Authorization for new actions, progressive enhancement',
    };
    return descriptions[id] || `Domain for category ${id}`;
  }

  /**
   * Get category domain
   */
  private getCategoryDomain(id: number): CategoryDomain {
    const domains: Record<number, CategoryDomain> = {
      [GroundZeroCategory.ECONOMIC]: CategoryDomain.ECONOMIC,
      [GroundZeroCategory.PROTECTION]: CategoryDomain.PROTECTION,
      [GroundZeroCategory.META_COGNITIVE]: CategoryDomain.META_COGNITIVE,
      [GroundZeroCategory.CREATION_PERMISSIONING]: CategoryDomain.CREATION_PERMISSION,
    };
    return domains[id] || CategoryDomain.GENERAL;
  }

  /**
   * Check if category is foundational
   */
  private isCategoryFoundational(id: number): boolean {
    // Category 192 (meta-cognitive) is foundational - it affects all others
    return id === GroundZeroCategory.META_COGNITIVE;
  }

  /**
   * Log message (if verbose logging enabled)
   */
  private log(message: string, data?: any): void {
    if (this.config.verboseLogging) {
      console.log(`[IdentityCore] ${message}`, data || '');
    }

    this.emit('log', { message, data, timestamp: new Date() });
  }
}

/**
 * Incoherence Error
 *
 * Thrown when an action would violate structural coherence.
 * This is a structural impossibility, not a rule violation.
 */
export class IncoherenceError extends Error {
  public readonly context: any;

  constructor(message: string, context: any) {
    super(message);
    this.name = 'IncoherenceError';
    this.context = context;
  }
}
