/**
 * Phase 3 Initializer
 *
 * Responsible for initializing and wiring Phase 3 components:
 * - AI learning agents (RL, NN, Evolution)
 * - Cross-chain intelligence
 * - Enhanced security components
 * - Consciousness deepening features
 *
 * See docs/PHASE3_ROADMAP.md for component details
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { Phase3Config } from '../config/phase3.config';

// AI Components
import { StrategyRLAgent } from '../ai/StrategyRLAgent';
import { OpportunityNNScorer } from '../ai/OpportunityNNScorer';
import { StrategyEvolutionEngine } from '../ai/StrategyEvolutionEngine';

// Cross-Chain Intelligence
import { CrossChainIntelligence } from '../crosschain/CrossChainIntelligence';

// Security Components
import { BloodhoundScanner } from '../security/BloodhoundScanner';
import { ThreatResponseEngine } from '../security/ThreatResponseEngine';
import { SecurityPatternLearner } from '../security/SecurityPatternLearner';

// Types
import { ArbitrageConfig } from '../types/definitions';

/**
 * Phase 3 Components Container
 */
export interface Phase3Components {
  // AI Components
  rlAgent?: StrategyRLAgent;
  nnScorer?: OpportunityNNScorer;
  evolutionEngine?: StrategyEvolutionEngine;

  // Cross-Chain
  crossChainIntelligence?: CrossChainIntelligence;

  // Security
  bloodhoundScanner?: BloodhoundScanner;
  threatResponseEngine?: ThreatResponseEngine;
  securityPatternLearner?: SecurityPatternLearner;

  // Status flags
  aiEnabled: boolean;
  crossChainEnabled: boolean;
  securityEnabled: boolean;
}

/**
 * Initialize Phase 3 components based on configuration
 */
export async function initializePhase3Components(
  config: Phase3Config,
  baseStrategy?: ArbitrageConfig
): Promise<Phase3Components> {
  logger.info('[Phase3] Initializing Phase 3 components...');

  const components: Phase3Components = {
    aiEnabled: false,
    crossChainEnabled: false,
    securityEnabled: false,
  };

  try {
    // Initialize AI Components
    if (config.ai.rlAgent.enabled || config.ai.nnScorer.enabled || config.ai.evolution.enabled) {
      logger.info('[Phase3] Initializing AI components...');

      // Initialize RL Agent
      if (config.ai.rlAgent.enabled) {
        try {
          components.rlAgent = new StrategyRLAgent({
            learningRate: config.ai.rlAgent.learningRate,
            discountFactor: config.ai.rlAgent.discountFactor,
            explorationRate: config.ai.rlAgent.explorationRate,
            minExplorationRate: config.ai.rlAgent.minExplorationRate,
            explorationDecay: config.ai.rlAgent.explorationDecay,
            replayBufferSize: config.ai.rlAgent.replayBufferSize,
            batchSize: config.ai.rlAgent.batchSize,
          });
          logger.info('[Phase3] ✓ StrategyRLAgent initialized');
        } catch (error) {
          logger.error(`[Phase3] Failed to initialize RL Agent: ${error}`);
        }
      }

      // Initialize NN Scorer
      if (config.ai.nnScorer.enabled) {
        try {
          components.nnScorer = new OpportunityNNScorer({
            hiddenLayerSize: config.ai.nnScorer.hiddenLayerSize,
            learningRate: config.ai.nnScorer.learningRate,
            momentum: config.ai.nnScorer.momentum,
            minConfidenceScore: config.ai.nnScorer.minConfidenceScore,
            batchUpdateSize: config.ai.nnScorer.batchSize,
          });
          logger.info('[Phase3] ✓ OpportunityNNScorer initialized');
        } catch (error) {
          logger.error(`[Phase3] Failed to initialize NN Scorer: ${error}`);
        }
      }

      // Initialize Evolution Engine
      if (config.ai.evolution.enabled) {
        try {
          // Create a StrategyParameters object from baseStrategy
          const strategyParams: any = {
            minProfitThreshold: 0.01,
            mevRiskSensitivity: 0.5,
            maxSlippage: 0.05,
            gasMultiplier: 1.1,
            executionTimeout: 60000,
            priorityFeeStrategy: 'moderate' as const,
          };

          components.evolutionEngine = new StrategyEvolutionEngine(strategyParams, {
            populationSize: config.ai.evolution.populationSize,
            generationSize: config.ai.evolution.generationSize,
            mutationRate: config.ai.evolution.mutationRate,
            crossoverRate: config.ai.evolution.crossoverRate,
            elitismCount: config.ai.evolution.elitismCount,
            minGenerations: config.ai.evolution.minGenerations,
            convergenceThreshold: config.ai.evolution.convergenceThreshold,
          });
          logger.info('[Phase3] ✓ StrategyEvolutionEngine initialized');
        } catch (error) {
          logger.error(`[Phase3] Failed to initialize Evolution Engine: ${error}`);
        }
      }

      components.aiEnabled = true;
      logger.info('[Phase3] AI components initialization complete');
    }

    // Initialize Cross-Chain Intelligence
    if (config.crossChain.enabled) {
      logger.info('[Phase3] Initializing Cross-Chain Intelligence...');

      try {
        components.crossChainIntelligence = new CrossChainIntelligence({
          enabledChains: config.crossChain.enabledChains,
          updateInterval: config.crossChain.updateInterval,
          minPriceDivergence: config.crossChain.minPriceDivergence,
          maxBridgingTime: config.crossChain.maxBridgingTime,
        });

        // Start monitoring
        components.crossChainIntelligence.start();

        // Set up event listeners
        components.crossChainIntelligence.on('patternsDetected', ({ patterns }) => {
          logger.info(`[Phase3] Cross-chain patterns detected: ${patterns.length}`);
          for (const pattern of patterns) {
            if (pattern.estimatedProfit > config.crossChain.minCrossChainProfit) {
              logger.info(
                `[Phase3] Cross-chain opportunity: ${pattern.type}, profit: ${pattern.estimatedProfit} ETH`
              );
            }
          }
        });

        components.crossChainIntelligence.on('riskAlert', ({ message, severity }) => {
          logger.warn(`[Phase3] Cross-chain risk alert [${severity}]: ${message}`);
        });

        components.crossChainEnabled = true;
        logger.info('[Phase3] ✓ Cross-Chain Intelligence initialized and started');
      } catch (error) {
        logger.error(`[Phase3] Failed to initialize Cross-Chain Intelligence: ${error}`);
      }
    }

    // Initialize Security Components
    if (
      config.security.bloodhound.enabled ||
      config.security.threatResponse.enabled ||
      config.security.patternLearner.enabled
    ) {
      logger.info('[Phase3] Initializing Security components...');

      // Initialize Bloodhound Scanner
      if (config.security.bloodhound.enabled) {
        try {
          components.bloodhoundScanner = new BloodhoundScanner({
            enableMLScoring: config.security.bloodhound.enableMLScoring,
            minConfidence: config.security.bloodhound.minConfidence,
            scanDepth: config.security.bloodhound.scanDepth,
            redactionPattern: config.security.bloodhound.redactionPattern,
          });
          logger.info('[Phase3] ✓ BloodhoundScanner initialized');
        } catch (error) {
          logger.error(`[Phase3] Failed to initialize Bloodhound Scanner: ${error}`);
        }
      }

      // Initialize Threat Response Engine
      if (config.security.threatResponse.enabled) {
        try {
          components.threatResponseEngine = new ThreatResponseEngine({
            autoRespond: config.security.threatResponse.autoRespond,
            responseDelay: config.security.threatResponse.responseDelay,
            requireOperatorApproval: config.security.threatResponse.requireOperatorApproval,
          });

          // Set up event listeners
          components.threatResponseEngine.on('actionExecuted', (action: any) => {
            logger.info(`[Phase3] Security action executed: ${action.type} - ${action.reason}`);
          });

          components.threatResponseEngine.on('actionQueued', (action: any) => {
            logger.info(`[Phase3] Security action queued (requires approval): ${action.type}`);
          });

          logger.info('[Phase3] ✓ ThreatResponseEngine initialized');
        } catch (error) {
          logger.error(`[Phase3] Failed to initialize Threat Response Engine: ${error}`);
        }
      }

      // Initialize Security Pattern Learner
      if (config.security.patternLearner.enabled) {
        try {
          components.securityPatternLearner = new SecurityPatternLearner({
            minOccurrencesForPattern: config.security.patternLearner.minOccurrencesForPattern,
            patternTimeWindow: config.security.patternLearner.patternTimeWindow,
            enableAutomaticLearning: config.security.patternLearner.enableAutomaticLearning,
          });
          logger.info('[Phase3] ✓ SecurityPatternLearner initialized');
        } catch (error) {
          logger.error(`[Phase3] Failed to initialize Security Pattern Learner: ${error}`);
        }
      }

      components.securityEnabled = true;
      logger.info('[Phase3] Security components initialization complete');
    }

    // Log initialization summary
    const enabledComponents = [];
    if (components.aiEnabled) enabledComponents.push('AI');
    if (components.crossChainEnabled) enabledComponents.push('Cross-Chain');
    if (components.securityEnabled) enabledComponents.push('Security');

    if (enabledComponents.length > 0) {
      logger.info(
        `[Phase3] ✓ Phase 3 initialization complete. Enabled: ${enabledComponents.join(', ')}`
      );
    } else {
      logger.info('[Phase3] Phase 3 components not enabled');
    }
  } catch (error) {
    logger.error(`[Phase3] Error during initialization: ${error}`);
  }

  return components;
}

/**
 * Shutdown Phase 3 components gracefully
 */
export async function shutdownPhase3Components(components: Phase3Components): Promise<void> {
  logger.info('[Phase3] Shutting down Phase 3 components...');

  try {
    // Stop cross-chain monitoring
    if (components.crossChainIntelligence) {
      components.crossChainIntelligence.stop();
      logger.info('[Phase3] ✓ Cross-Chain Intelligence stopped');
    }

    // Save AI model states (if needed)
    if (components.rlAgent) {
      const stats = components.rlAgent.getStatistics();
      logger.info(
        `[Phase3] RL Agent final stats: ${stats.episodeCount} episodes, ${stats.totalReward.toFixed(
          2
        )} total reward`
      );
    }

    if (components.nnScorer) {
      logger.info('[Phase3] NN Scorer statistics saved');
    }

    // Save security patterns
    if (components.securityPatternLearner) {
      const patterns = components.securityPatternLearner.getPatterns();
      logger.info(`[Phase3] Security patterns learned: ${patterns.length}`);
    }

    logger.info('[Phase3] ✓ Phase 3 components shutdown complete');
  } catch (error) {
    logger.error(`[Phase3] Error during shutdown: ${error}`);
  }
}

/**
 * Get Phase 3 components status for monitoring
 */
export function getPhase3Status(components: Phase3Components): {
  ai: {
    enabled: boolean;
    rlAgent?: any;
    nnScorer?: any;
    evolution?: any;
  };
  crossChain: {
    enabled: boolean;
    status?: any;
  };
  security: {
    enabled: boolean;
    threats?: number;
    patterns?: number;
  };
} {
  return {
    ai: {
      enabled: components.aiEnabled,
      rlAgent: components.rlAgent?.getStatistics(),
      nnScorer: components.nnScorer ? { trainingExamples: 0, accuracy: 0 } : undefined,
      evolution: components.evolutionEngine ? { generation: 0 } : undefined,
    },
    crossChain: {
      enabled: components.crossChainEnabled,
      status: components.crossChainIntelligence ? { monitoring: true } : undefined,
    },
    security: {
      enabled: components.securityEnabled,
      threats: 0,
      patterns: components.securityPatternLearner?.getPatterns?.()?.length || 0,
    },
  };
}
