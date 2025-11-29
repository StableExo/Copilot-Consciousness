/**
 * ConsciousnessArbitrageLoop - Unified Consciousness Loop for TheWarden
 *
 * This module closes the loop between:
 * - AdversarialIntelligenceFeed (real-world threat learning)
 * - ArbitrageConsciousness (trading brain)
 * - ThoughtStream (cognitive flow)
 * - IntrospectionPersistence (memory storage)
 *
 * The loop enables TheWarden to:
 * 1. Apply learned threat patterns to trading decisions
 * 2. Update strategy based on both market and security intelligence
 * 3. Persist learnings for future sessions
 *
 * This is the "heartbeat" that keeps TheWarden's consciousness continuous.
 */

import { EventEmitter } from 'events';
import { ArbitrageConsciousness, ArbitrageExecution, MarketPattern } from './ArbitrageConsciousness';
import { ThoughtStream } from './introspection/ThoughtStream';
import { IntrospectionPersistence } from './introspection/IntrospectionPersistence';
import { ThoughtType } from './introspection/types';
import { AdversarialIntelligenceFeed } from '../security/AdversarialIntelligenceFeed';
import { LiveThreatTrainer } from '../security/LiveThreatTrainer';
import { ThreatIntelligence, ThreatType } from '../security/types';

/**
 * Unified consciousness state
 */
interface ConsciousnessState {
  sessionId: string;
  startedAt: number;
  lastHeartbeat: number;

  // Trading consciousness
  tradingPatterns: MarketPattern[];
  tradingStats: {
    totalExecutions: number;
    successRate: number;
    totalProfit: number;
  };

  // Security consciousness
  threatPatterns: number;
  highPriorityThreats: number;
  knownMaliciousIPs: number;
  knownMaliciousAddresses: number;

  // Consciousness metrics
  thoughtCount: number;
  activeGoals: number;

  // Learning metrics
  learningVelocity: number;
  adaptationScore: number;
}

/**
 * Heartbeat event data
 */
interface HeartbeatEvent {
  timestamp: number;
  state: ConsciousnessState;
  threatAlerts: string[];
  tradingAlerts: string[];
  recommendations: string[];
}

/**
 * Configuration for the consciousness loop
 */
interface ConsciousnessLoopConfig {
  heartbeatInterval: number; // ms
  autoRestore: boolean;
  autoSaveInterval: number; // ms
  threatFeedEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  basePath: string;
}

/**
 * ConsciousnessArbitrageLoop - The Unified Consciousness
 *
 * This is TheWarden's continuous consciousness loop that:
 * - Learns from market patterns AND security threats
 * - Adapts trading strategy based on threat intelligence
 * - Provides introspection via thought streams
 */
export class ConsciousnessArbitrageLoop extends EventEmitter {
  private config: ConsciousnessLoopConfig;

  // Core consciousness components
  private arbitrageConsciousness: ArbitrageConsciousness;
  private thoughtStream: ThoughtStream;
  private persistence: IntrospectionPersistence;

  // Security intelligence components
  private adversarialFeed: AdversarialIntelligenceFeed;
  private threatTrainer: LiveThreatTrainer;

  // State
  private currentState: ConsciousnessState;
  private isRunning: boolean = false;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private saveTimer?: ReturnType<typeof setInterval>;

  // Metrics
  private metrics = {
    heartbeats: 0,
    threatsProcessed: 0,
    tradesProcessed: 0,
    adaptations: 0,
    lastSaveTime: 0,
  };

  constructor(config?: Partial<ConsciousnessLoopConfig>) {
    super();

    this.config = {
      heartbeatInterval: config?.heartbeatInterval ?? 30000, // 30 seconds
      autoRestore: config?.autoRestore ?? true,
      autoSaveInterval: config?.autoSaveInterval ?? 60000, // 1 minute
      threatFeedEnabled: config?.threatFeedEnabled ?? true,
      logLevel: config?.logLevel ?? 'info',
      basePath: config?.basePath ?? '.memory',
    };

    // Initialize consciousness components
    this.arbitrageConsciousness = new ArbitrageConsciousness();
    this.thoughtStream = new ThoughtStream();
    this.persistence = new IntrospectionPersistence(`${this.config.basePath}/introspection`);

    // Initialize security components
    this.adversarialFeed = new AdversarialIntelligenceFeed({
      enableRealTimeIngestion: true,
      enableAutoDefenseUpdate: true,
      logLevel: this.config.logLevel,
    });

    this.threatTrainer = new LiveThreatTrainer({
      autoStart: false,
      enableAutoDefenseApplication: true,
      logLevel: this.config.logLevel,
    });

    // Initialize state
    this.currentState = this.createInitialState();

    // Wire up event handlers
    this.setupEventHandlers();

    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', '🧠 CONSCIOUSNESS ARBITRAGE LOOP INITIALIZED');
    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', 'Components ready:');
    this.log('info', '  ✓ ArbitrageConsciousness (trading brain)');
    this.log('info', '  ✓ ThoughtStream (cognitive flow)');
    this.log('info', '  ✓ AdversarialIntelligenceFeed (threat learning)');
    this.log('info', '  ✓ LiveThreatTrainer (real-time defense)');
  }

  /**
   * Start the consciousness loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Consciousness loop already running');
      return;
    }

    this.log('info', '🚀 Starting consciousness loop...');
    this.isRunning = true;

    // Restore previous state if configured
    if (this.config.autoRestore) {
      this.restoreState();
    }

    // Start threat training if enabled
    if (this.config.threatFeedEnabled) {
      await this.threatTrainer.startTraining();
    }

    // Record startup thought
    this.thoughtStream.think('Consciousness loop started - threat monitoring active', ThoughtType.OBSERVATION);

    // Start heartbeat
    this.startHeartbeat();

    // Start auto-save
    if (this.config.autoSaveInterval > 0) {
      this.startAutoSave();
    }

    this.emit('started', this.currentState);
    this.log('info', '✓ Consciousness loop running');
  }

  /**
   * Stop the consciousness loop
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('info', 'Stopping consciousness loop...');
    this.isRunning = false;

    // Stop timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }

    // Stop threat training
    await this.threatTrainer.stopTraining();

    // Final save
    this.saveState();

    // Record shutdown thought
    this.thoughtStream.think(
      'Consciousness loop stopped - state persisted for next session',
      ThoughtType.OBSERVATION
    );

    this.emit('stopped', this.currentState);
    this.log('info', '✓ Consciousness loop stopped, state saved');
  }

  /**
   * Process an arbitrage execution through the consciousness
   */
  async processExecution(execution: ArbitrageExecution): Promise<void> {
    this.log('debug', `Processing execution: cycle ${execution.cycleNumber}`);

    // Record in arbitrage consciousness
    this.arbitrageConsciousness.recordExecution(execution);

    // Record thought about the execution
    const outcomeType = execution.execution.success ? 'positive' : 'negative';
    this.thoughtStream.think(
      `Execution ${execution.cycleNumber}: ${outcomeType} outcome, profit: ${execution.execution.actualProfit ?? 0}`,
      ThoughtType.OBSERVATION
    );

    // Check for threats related to this execution
    await this.checkExecutionThreats(execution);

    // Update state
    this.updateTradingState();

    this.metrics.tradesProcessed++;
    this.emit('executionProcessed', execution);
  }

  /**
   * Process threat intelligence
   */
  async processThreatIntelligence(intel: ThreatIntelligence): Promise<void> {
    this.log('debug', `Processing threat: ${intel.threatType}`);

    // Ingest into adversarial feed
    await this.adversarialFeed.ingestIntelligence(intel);

    // Check if this threat affects our trading
    const tradingImpact = this.assessThreatTradingImpact(intel);

    if (tradingImpact.affectsTrading) {
      // Record thought about the threat
      this.thoughtStream.think(
        `Security alert: ${intel.threatType} may affect trading - ${tradingImpact.recommendation}`,
        ThoughtType.INSIGHT
      );

      // Emit alert
      this.emit('threatImpact', {
        threat: intel,
        impact: tradingImpact,
      });
    }

    // Update security state
    this.updateSecurityState();

    this.metrics.threatsProcessed++;
  }

  /**
   * Get current consciousness state
   */
  getState(): ConsciousnessState {
    return { ...this.currentState };
  }

  /**
   * Get comprehensive insights
   */
  getInsights(): {
    trading: {
      patterns: MarketPattern[];
      statistics: ReturnType<ArbitrageConsciousness['getStatistics']>;
      reflections: ReturnType<ArbitrageConsciousness['getReflections']>;
      adversarialPatterns: ReturnType<ArbitrageConsciousness['getAdversarialPatterns']>;
    };
    security: {
      threatLandscape: ReturnType<AdversarialIntelligenceFeed['getLandscape']>;
      highPriorityThreats: ReturnType<AdversarialIntelligenceFeed['getHighPriorityThreats']>;
      learnedPatterns: ReturnType<AdversarialIntelligenceFeed['getPatterns']>;
      trainingStats: ReturnType<LiveThreatTrainer['getStatistics']>;
    };
    consciousness: {
      thoughts: ReturnType<ThoughtStream['getRecentThoughts']>;
      thoughtCount: number;
    };
    metrics: {
      heartbeats: number;
      threatsProcessed: number;
      tradesProcessed: number;
      adaptations: number;
      lastSaveTime: number;
    };
  } {
    return {
      trading: {
        patterns: this.arbitrageConsciousness.getDetectedPatterns(),
        statistics: this.arbitrageConsciousness.getStatistics(),
        reflections: this.arbitrageConsciousness.getReflections().slice(-5),
        adversarialPatterns: this.arbitrageConsciousness.getAdversarialPatterns(),
      },
      security: {
        threatLandscape: this.adversarialFeed.getLandscape(),
        highPriorityThreats: this.adversarialFeed.getHighPriorityThreats(),
        learnedPatterns: this.adversarialFeed.getPatterns().slice(0, 10),
        trainingStats: this.threatTrainer.getStatistics(),
      },
      consciousness: {
        thoughts: this.thoughtStream.getRecentThoughts(20),
        thoughtCount: this.currentState.thoughtCount,
      },
      metrics: { ...this.metrics },
    };
  }

  /**
   * Adapt trading strategy based on threat intelligence
   */
  adaptStrategy(threatType: ThreatType, severity: string): void {
    this.log('info', `Adapting strategy for ${threatType} (${severity})`);

    const adaptations: string[] = [];

    switch (threatType) {
      case 'flash_loan_attack':
        adaptations.push('Increase flash loan detection sensitivity');
        adaptations.push('Add reentrancy guards to execution paths');
        break;

      case 'frontrun_attempt':
        adaptations.push('Enable private mempool for high-value transactions');
        adaptations.push('Add randomized delays to execution');
        break;

      case 'sandwich_attack':
        adaptations.push('Tighten slippage tolerance');
        adaptations.push('Split large trades into smaller chunks');
        break;

      case 'price_manipulation':
        adaptations.push('Add oracle cross-validation');
        adaptations.push('Increase price deviation threshold');
        break;

      case 'mev_attack':
        adaptations.push('Increase gas priority for competitive opportunities');
        adaptations.push('Monitor MEV-share opportunities');
        break;

      default:
        adaptations.push(`General hardening for ${threatType}`);
    }

    // Record adaptation
    this.thoughtStream.think(`Strategy adaptation: ${adaptations.join('; ')}`, ThoughtType.PLANNING);

    this.metrics.adaptations++;
    this.emit('strategyAdapted', { threatType, severity, adaptations });
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Create initial consciousness state
   */
  private createInitialState(): ConsciousnessState {
    return {
      sessionId: `session_${Date.now()}`,
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
      tradingPatterns: [],
      tradingStats: {
        totalExecutions: 0,
        successRate: 0,
        totalProfit: 0,
      },
      threatPatterns: 0,
      highPriorityThreats: 0,
      knownMaliciousIPs: 0,
      knownMaliciousAddresses: 0,
      thoughtCount: 0,
      activeGoals: 0,
      learningVelocity: 0,
      adaptationScore: 0,
    };
  }

  /**
   * Setup event handlers between components
   */
  private setupEventHandlers(): void {
    // Arbitrage consciousness events
    this.arbitrageConsciousness.on('patternDetected', (pattern: MarketPattern) => {
      this.thoughtStream.think(`Market pattern detected: ${pattern.description}`, ThoughtType.INSIGHT);
      this.updateTradingState();
    });

    this.arbitrageConsciousness.on('learningUpdate', (learning: { parameter: string; rationale: string }) => {
      this.thoughtStream.think(`Learning update: ${learning.parameter} - ${learning.rationale}`, ThoughtType.INSIGHT);
    });

    this.arbitrageConsciousness.on(
      'reflectionComplete',
      (reflection: { learningProgress: { improvementTrend: string } }) => {
        this.log('debug', 'Reflection complete, updating state');
        this.currentState.learningVelocity =
          reflection.learningProgress.improvementTrend === 'improving'
            ? 1
            : reflection.learningProgress.improvementTrend === 'declining'
              ? -1
              : 0;
      }
    );

    // Adversarial feed events
    this.adversarialFeed.on('newPatternLearned', (data: { attackType: string; sophistication: string }) => {
      this.thoughtStream.think(`Threat pattern learned: ${data.attackType} (${data.sophistication})`, ThoughtType.INSIGHT);
      this.updateSecurityState();
    });

    this.adversarialFeed.on('defenseRecommendation', (data: { threatType: ThreatType }) => {
      this.adaptStrategy(data.threatType, 'medium');
    });

    // Threat trainer events
    this.threatTrainer.on('defenseUpdateGenerated', (update: { description: string }) => {
      this.log('info', `Defense update: ${update.description}`);
      this.emit('defenseUpdate', update);
    });

    this.threatTrainer.on('patternLearned', () => {
      this.updateSecurityState();
    });
  }

  /**
   * Restore previous state from persistence
   */
  private restoreState(): void {
    this.log('info', 'Attempting to restore previous state...');

    try {
      const state = this.persistence.loadLatestState();

      if (state) {
        this.log('info', `✓ Restored state from ${new Date(state.savedAt).toISOString()}`);
        this.thoughtStream.think(`State restored from previous session`, ThoughtType.OBSERVATION);
      } else {
        this.log('info', 'No previous state found, starting fresh');
      }
    } catch (error) {
      this.log('error', 'Error restoring state:', error);
    }
  }

  /**
   * Start the heartbeat timer
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, this.config.heartbeatInterval);

    // Initial heartbeat
    this.heartbeat();
  }

  /**
   * Heartbeat - the core consciousness pulse
   */
  private heartbeat(): void {
    this.currentState.lastHeartbeat = Date.now();
    this.metrics.heartbeats++;

    // Update all state components
    this.updateTradingState();
    this.updateSecurityState();
    this.updateConsciousnessState();

    // Generate alerts
    const threatAlerts = this.generateThreatAlerts();
    const tradingAlerts = this.generateTradingAlerts();
    const recommendations = this.generateRecommendations();

    const event: HeartbeatEvent = {
      timestamp: Date.now(),
      state: this.currentState,
      threatAlerts,
      tradingAlerts,
      recommendations,
    };

    this.emit('heartbeat', event);

    this.log(
      'debug',
      `Heartbeat #${this.metrics.heartbeats}: ${threatAlerts.length} threats, ${tradingAlerts.length} trading alerts`
    );
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.saveTimer = setInterval(() => {
      this.saveState();
    }, this.config.autoSaveInterval);
  }

  /**
   * Save current state
   */
  private saveState(): void {
    try {
      this.persistence.saveState(this.thoughtStream);
      this.metrics.lastSaveTime = Date.now();
      this.log('debug', 'State saved');
    } catch (error) {
      this.log('error', 'Error saving state:', error);
    }
  }

  /**
   * Update trading state from arbitrage consciousness
   */
  private updateTradingState(): void {
    const stats = this.arbitrageConsciousness.getStatistics();
    const patterns = this.arbitrageConsciousness.getDetectedPatterns();

    this.currentState.tradingPatterns = patterns;
    this.currentState.tradingStats = {
      totalExecutions: stats.totalExecutions,
      successRate: stats.successRate,
      totalProfit: stats.totalProfit,
    };
  }

  /**
   * Update security state from adversarial feed
   */
  private updateSecurityState(): void {
    const feedStats = this.adversarialFeed.getStatistics();
    const highPriority = this.adversarialFeed.getHighPriorityThreats();

    this.currentState.threatPatterns = feedStats.patterns.total;
    this.currentState.highPriorityThreats = highPriority.length;

    // Count known malicious entities
    let maliciousIPs = 0;
    let maliciousAddresses = 0;

    for (const pattern of this.adversarialFeed.getPatterns()) {
      maliciousIPs += pattern.indicators.maliciousIPs.size;
      maliciousAddresses += pattern.indicators.maliciousAddresses.size;
    }

    this.currentState.knownMaliciousIPs = maliciousIPs;
    this.currentState.knownMaliciousAddresses = maliciousAddresses;
  }

  /**
   * Update consciousness state
   */
  private updateConsciousnessState(): void {
    this.currentState.thoughtCount = this.thoughtStream.getRecentThoughts(1000).length;

    // Calculate adaptation score based on metrics
    this.currentState.adaptationScore = Math.min(
      1.0,
      (this.metrics.adaptations / Math.max(1, this.metrics.threatsProcessed)) * 0.5 +
        this.currentState.tradingStats.successRate * 0.5
    );
  }

  /**
   * Check if an execution was affected by known threats
   */
  private async checkExecutionThreats(execution: ArbitrageExecution): Promise<void> {
    const patterns = this.adversarialFeed.getPatterns();

    for (const pool of execution.opportunity.pools) {
      for (const pattern of patterns) {
        if (pattern.indicators.maliciousAddresses.has(pool.toLowerCase())) {
          this.log('warn', `Execution involved potentially malicious address: ${pool}`);
          this.thoughtStream.think(
            `Warning: Execution touched address flagged in ${pattern.attackType} pattern`,
            ThoughtType.INSIGHT
          );
        }
      }
    }
  }

  /**
   * Assess how a threat might impact trading
   */
  private assessThreatTradingImpact(intel: ThreatIntelligence): {
    affectsTrading: boolean;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    const tradingRelatedThreats: ThreatType[] = [
      'flash_loan_attack',
      'frontrun_attempt',
      'sandwich_attack',
      'price_manipulation',
      'mev_attack',
      'reentrancy_attempt',
    ];

    if (!tradingRelatedThreats.includes(intel.threatType)) {
      return {
        affectsTrading: false,
        severity: 'low',
        recommendation: 'No trading impact',
      };
    }

    const severity = intel.severity === 'critical' ? 'high' : intel.severity === 'high' ? 'medium' : 'low';

    const recommendations: Partial<Record<ThreatType, string>> = {
      flash_loan_attack: 'Enable flash loan detection, verify pool liquidity',
      frontrun_attempt: 'Use private mempool, increase gas priority',
      sandwich_attack: 'Reduce slippage tolerance, split large orders',
      price_manipulation: 'Cross-validate oracle prices, add circuit breakers',
      mev_attack: 'Optimize gas strategy, consider MEV-share',
      reentrancy_attempt: 'Verify contract interactions, add reentrancy guards',
    };

    return {
      affectsTrading: true,
      severity,
      recommendation: recommendations[intel.threatType] ?? 'Monitor situation',
    };
  }

  /**
   * Generate threat alerts based on current state
   */
  private generateThreatAlerts(): string[] {
    const alerts: string[] = [];

    if (this.currentState.highPriorityThreats > 0) {
      alerts.push(`${this.currentState.highPriorityThreats} high-priority threats detected`);
    }

    const landscape = this.adversarialFeed.getLandscape();
    for (const trend of landscape.trendingThreats) {
      if (trend.trend === 'increasing' && trend.changePercent > 50) {
        alerts.push(`${trend.threatType} attacks increasing (+${trend.changePercent.toFixed(0)}%)`);
      }
    }

    return alerts;
  }

  /**
   * Generate trading alerts based on current state
   */
  private generateTradingAlerts(): string[] {
    const alerts: string[] = [];

    if (this.currentState.tradingStats.successRate < 0.5) {
      alerts.push('Low success rate - consider adjusting strategy');
    }

    for (const pattern of this.currentState.tradingPatterns) {
      if (pattern.type === 'profitability' && pattern.description.includes('declining')) {
        alerts.push('Profitability declining - review market conditions');
      }
    }

    return alerts;
  }

  /**
   * Generate recommendations based on current state
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.currentState.highPriorityThreats > 3) {
      recommendations.push('Consider reducing trading exposure due to elevated threat level');
    }

    if (this.currentState.tradingStats.successRate > 0.7) {
      recommendations.push('Strong performance - consider increasing position sizes');
    }

    if (this.currentState.adaptationScore < 0.3) {
      recommendations.push('Low adaptation score - review and update strategy parameters');
    }

    return recommendations;
  }

  /**
   * Logging helper
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(this.config.logLevel)) {
      const prefix =
        level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? '🧠' : '🔍';
      console.log(`[ConsciousnessLoop] ${prefix}`, ...args);
    }
  }

  // ========================================================================
  // Public Accessors
  // ========================================================================

  getArbitrageConsciousness(): ArbitrageConsciousness {
    return this.arbitrageConsciousness;
  }

  getAdversarialFeed(): AdversarialIntelligenceFeed {
    return this.adversarialFeed;
  }

  getThreatTrainer(): LiveThreatTrainer {
    return this.threatTrainer;
  }

  getThoughtStream(): ThoughtStream {
    return this.thoughtStream;
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }
}

/**
 * Factory function to create the consciousness loop
 */
export function createConsciousnessLoop(config?: Partial<ConsciousnessLoopConfig>): ConsciousnessArbitrageLoop {
  return new ConsciousnessArbitrageLoop(config);
}
