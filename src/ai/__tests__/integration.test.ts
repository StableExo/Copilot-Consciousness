/**
 * AI/RL Integration Tests
 *
 * Tests for AI component integration in BaseArbitrageRunner
 */

import { StrategyRLAgent } from '../StrategyRLAgent';
import { OpportunityNNScorer } from '../OpportunityNNScorer';
import { StrategyEvolutionEngine } from '../StrategyEvolutionEngine';
import {
  ExecutionEpisode,
  ExecutionState,
  ExecutionAction,
  ExecutionOutcome,
  MEVContext,
  StrategyParameters,
  OpportunityFeatures,
} from '../types';

describe('AI/RL Integration', () => {
  describe('StrategyRLAgent', () => {
    let agent: StrategyRLAgent;

    beforeEach(() => {
      agent = new StrategyRLAgent({
        learningRate: 0.1,
        discountFactor: 0.95,
        explorationRate: 0.3,
      });
    });

    it('should initialize with config', () => {
      expect(agent).toBeDefined();
      const stats = agent.getStatistics();
      expect(stats.episodeCount).toBe(0);
      expect(stats.qTableSize).toBe(0);
    });

    it('should record execution episodes', async () => {
      const episode: ExecutionEpisode = {
        timestamp: Date.now(),
        episodeId: 'test_episode_1',
        state: createMockState(),
        action: createMockAction(),
        outcome: createMockOutcome(true),
        reward: 0.05,
        mevContext: createMockMEVContext(),
      };

      await agent.recordEpisode(episode);

      const stats = agent.getStatistics();
      expect(stats.episodeCount).toBe(1);
      expect(stats.totalReward).toBe(0.05);
    });

    it('should suggest parameters based on learning', async () => {
      // Record some successful episodes
      for (let i = 0; i < 5; i++) {
        const episode: ExecutionEpisode = {
          timestamp: Date.now(),
          episodeId: `episode_${i}`,
          state: createMockState(),
          action: createMockAction(),
          outcome: createMockOutcome(true),
          reward: 0.05,
          mevContext: createMockMEVContext(),
        };
        await agent.recordEpisode(episode);
      }

      const currentParams: StrategyParameters = {
        minProfitThreshold: 0.01,
        mevRiskSensitivity: 0.5,
        maxSlippage: 0.005,
        gasMultiplier: 1.2,
        executionTimeout: 10000,
        priorityFeeStrategy: 'moderate',
      };

      const suggestions = await agent.suggestParameters(currentParams);

      expect(suggestions).toBeDefined();
      expect(suggestions.params).toBeDefined();
      expect(suggestions.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestions.confidence).toBeLessThanOrEqual(1);
      expect(suggestions.rationale).toBeDefined();
    });

    it('should export and import policy', () => {
      const exported = agent.exportPolicy();
      expect(exported).toBeDefined();
      expect(exported.policy).toBeDefined();
      expect(exported.statistics).toBeDefined();

      const newAgent = new StrategyRLAgent();
      newAgent.importPolicy(exported);

      const stats = newAgent.getStatistics();
      expect(stats.qTableSize).toBe(agent.getStatistics().qTableSize);
    });
  });

  describe('OpportunityNNScorer', () => {
    let scorer: OpportunityNNScorer;

    beforeEach(() => {
      scorer = new OpportunityNNScorer({
        hiddenLayerSize: 16,
        learningRate: 0.01,
        minConfidenceScore: 0.6,
        executionThreshold: 0.7,
      });
    });

    it('should initialize with config', () => {
      expect(scorer).toBeDefined();
      const stats = scorer.getStatistics();
      expect(stats.networkSize.hidden).toBe(16);
    });

    it('should score opportunities', async () => {
      const features = createMockFeatures();
      const score = await scorer.scoreOpportunity(features);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should provide detailed scoring results', async () => {
      const features = createMockFeatures();
      const result = await scorer.scoreWithDetails(features);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.recommendation).toMatch(/execute|skip|uncertain/);
      expect(result.reasoning).toBeDefined();
      expect(result.featureContributions).toBeDefined();
    });

    it('should train on execution outcomes', async () => {
      const features = createMockFeatures();

      // Train on successful outcome
      await scorer.trainOnOutcome(features, true);

      const stats = scorer.getStatistics();
      expect(stats.trainingExamples).toBeGreaterThan(0);
    });

    it('should export and import model', () => {
      const exported = scorer.exportModel();
      expect(exported).toBeDefined();
      expect(exported.weights).toBeDefined();
      expect(exported.config).toBeDefined();

      const newScorer = new OpportunityNNScorer();
      newScorer.importModel(exported);
    });
  });

  describe('StrategyEvolutionEngine', () => {
    let engine: StrategyEvolutionEngine;
    let baseParams: StrategyParameters;

    beforeEach(() => {
      baseParams = {
        minProfitThreshold: 0.01,
        mevRiskSensitivity: 0.5,
        maxSlippage: 0.005,
        gasMultiplier: 1.2,
        executionTimeout: 10000,
        priorityFeeStrategy: 'moderate',
      };

      engine = new StrategyEvolutionEngine(baseParams, {
        populationSize: 10,
        mutationRate: 0.3,
      });
    });

    it('should initialize with base config', () => {
      expect(engine).toBeDefined();
      const stats = engine.getStatistics();
      expect(stats.populationSize).toBe(10);
      expect(stats.generation).toBe(0);
    });

    it('should propose strategy variants', async () => {
      const variants = await engine.proposeVariants(baseParams);

      expect(variants).toBeDefined();
      expect(Array.isArray(variants)).toBe(true);
      expect(variants.length).toBeGreaterThan(0);

      for (const variant of variants) {
        expect(variant.id).toBeDefined();
        expect(variant.params).toBeDefined();
        expect(variant.generation).toBeGreaterThanOrEqual(0);
      }
    });

    it('should select best variant from evaluations', async () => {
      const variants = await engine.proposeVariants(baseParams);

      // Create mock evaluation results
      const evaluations = variants.map((v, i) => ({
        variantId: v.id,
        executionCount: 5,
        successRate: 0.8,
        avgProfit: 0.05 + i * 0.01,
        avgMEVLoss: 0.005,
        fitnessScore: 0,
        performanceMetrics: {
          totalProfit: 0.25,
          totalGasCost: 0.01,
          totalMEVLoss: 0.025,
          sharpeRatio: 1.5,
        },
      }));

      const best = await engine.selectBestVariant(evaluations);

      expect(best).toBeDefined();
      expect(best.id).toBeDefined();
      expect(best.fitnessScore).toBeDefined();
    });

    it('should record execution outcomes', () => {
      const variantId = 'test_variant';
      engine.recordExecution(variantId, 0.05, true, 0.005);

      const stats = engine.getStatistics();
      expect(stats.evaluatedVariants).toBe(1);
    });

    it('should export and import state', () => {
      const exported = engine.exportState();
      expect(exported).toBeDefined();
      expect(exported.state).toBeDefined();
      expect(exported.config).toBeDefined();

      const newEngine = new StrategyEvolutionEngine(baseParams);
      newEngine.importState(exported);

      const stats = newEngine.getStatistics();
      expect(stats.generation).toBe(engine.getStatistics().generation);
    });
  });
});

// Helper functions to create mock data

function createMockState(): ExecutionState {
  return {
    baseFee: 20,
    gasPrice: 25,
    congestion: 0.5,
    searcherDensity: 0.3,
    expectedProfit: 0.1,
    pathComplexity: 3,
    liquidityDepth: 100000,
    recentSuccessRate: 0.6,
    avgProfitPerTx: 0.05,
    recentMEVLoss: 0.01,
  };
}

function createMockAction(): ExecutionAction {
  return {
    executed: true,
    strategyParams: {
      minProfitThreshold: 0.01,
      mevRiskSensitivity: 0.5,
      maxSlippage: 0.005,
      gasMultiplier: 1.2,
      executionTimeout: 10000,
      priorityFeeStrategy: 'moderate',
    },
    blockDelay: 0,
    priorityFee: 0.001,
  };
}

function createMockOutcome(success: boolean): ExecutionOutcome {
  return {
    success,
    actualProfit: success ? 0.05 : 0,
    gasUsed: 300000,
    mevLoss: 0.005,
    slippage: 0.001,
    executionTime: 2000,
  };
}

function createMockMEVContext(): MEVContext {
  return {
    competitorCount: 5,
    frontrunRisk: 0.2,
    backrunRisk: 0.1,
    sandwichRisk: 0.15,
    blockPosition: 50,
  };
}

function createMockFeatures(): OpportunityFeatures {
  return {
    grossProfit: 0.1,
    netProfit: 0.08,
    profitMargin: 0.8,
    roi: 0.75,

    totalLiquidity: 1000000,
    liquidityRatio: 1.2,
    poolDepth: 500000,

    mevRisk: 0.3,
    competitionLevel: 0.4,
    blockCongestion: 0.5,

    hopCount: 2,
    pathComplexity: 2.5,
    gasEstimate: 300000,

    volatility: 0.05,
    priceImpact: 0.001,
    timeOfDay: 0.5,

    similarPathSuccessRate: 0.7,
    avgHistoricalProfit: 0.06,
  };
}
