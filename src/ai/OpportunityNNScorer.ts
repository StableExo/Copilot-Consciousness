/**
 * OpportunityNNScorer - Neural Network-Based Opportunity Detection
 * 
 * Phase 3: Advanced AI Integration
 * 
 * This component uses a neural network-inspired scoring system to evaluate
 * arbitrage opportunities. While a full deep learning implementation would
 * require TensorFlow.js or similar, this implementation uses a feature-based
 * scoring model that mimics neural network behavior.
 * 
 * Core capabilities:
 * - Multi-layer feature extraction and scoring
 * - Non-linear activation functions
 * - Weighted feature combination
 * - Adaptive weight learning from outcomes
 * 
 * Integration with TheWarden/AEV:
 * - Scores opportunities before execution in AdvancedOrchestrator
 * - Uses features from MEVSensorHub, ProfitCalculator, and market data
 * - Learns optimal weights from ArbitrageConsciousness feedback
 */

import { EventEmitter } from 'events';
import { OpportunityFeatures } from './types';

interface NNScorerConfig {
  // Network architecture
  hiddenLayerSize: number;
  learningRate: number;
  momentum: number;
  
  // Scoring thresholds
  minConfidenceScore: number;
  executionThreshold: number;
  
  // Feature normalization
  featureScaling: boolean;
  
  // Training
  batchUpdateSize: number;
}

interface FeatureWeights {
  // Input to hidden layer weights
  inputHidden: number[][];
  hiddenBias: number[];
  
  // Hidden to output layer weights
  hiddenOutput: number[];
  outputBias: number;
}

interface ScoringResult {
  score: number;
  confidence: number;
  featureContributions: Map<string, number>;
  recommendation: 'execute' | 'skip' | 'uncertain';
  reasoning: string;
}

/**
 * Neural Network-Based Opportunity Scorer
 */
export class OpportunityNNScorer extends EventEmitter {
  private config: NNScorerConfig;
  private weights: FeatureWeights;
  private featureMeans: Map<string, number> = new Map();
  private featureStds: Map<string, number> = new Map();
  private trainingExamples: Array<{ features: OpportunityFeatures; label: number }> = [];
  private scoreHistory: number[] = [];
  
  // Momentum for weight updates
  private velocityInputHidden: number[][] = [];
  private velocityHiddenOutput: number[] = [];
  
  constructor(config?: Partial<NNScorerConfig>) {
    super();
    
    this.config = {
      hiddenLayerSize: config?.hiddenLayerSize ?? 16,
      learningRate: config?.learningRate ?? 0.01,
      momentum: config?.momentum ?? 0.9,
      minConfidenceScore: config?.minConfidenceScore ?? 0.6,
      executionThreshold: config?.executionThreshold ?? 0.7,
      featureScaling: config?.featureScaling ?? true,
      batchUpdateSize: config?.batchUpdateSize ?? 32,
    };
    
    // Initialize network weights
    this.weights = this.initializeWeights();
    
    console.log('[OpportunityNNScorer] Initialized with hidden layer size:', this.config.hiddenLayerSize);
  }
  
  /**
   * Initialize network weights with Xavier/He initialization
   */
  private initializeWeights(): FeatureWeights {
    const inputSize = 15; // Number of features in OpportunityFeatures
    const hiddenSize = this.config.hiddenLayerSize;
    
    // Xavier initialization for better gradient flow
    const inputHidden: number[][] = [];
    for (let i = 0; i < inputSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < hiddenSize; j++) {
        row.push(this.randomNormal() * Math.sqrt(2 / (inputSize + hiddenSize)));
      }
      inputHidden.push(row);
    }
    
    const hiddenOutput: number[] = [];
    for (let i = 0; i < hiddenSize; i++) {
      hiddenOutput.push(this.randomNormal() * Math.sqrt(2 / hiddenSize));
    }
    
    return {
      inputHidden,
      hiddenBias: new Array(hiddenSize).fill(0),
      hiddenOutput,
      outputBias: 0,
    };
  }
  
  /**
   * Generate random number from standard normal distribution
   */
  private randomNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  
  /**
   * Score an arbitrage opportunity
   * 
   * Primary integration point - called by AdvancedOrchestrator
   * 
   * @param features Opportunity features extracted from market data
   * @returns Score between 0-1 indicating execution worthiness
   */
  async scoreOpportunity(features: OpportunityFeatures): Promise<number> {
    const result = await this.scoreWithDetails(features);
    return result.score;
  }
  
  /**
   * Score opportunity with detailed breakdown
   */
  async scoreWithDetails(features: OpportunityFeatures): Promise<ScoringResult> {
    // Normalize features
    const normalizedFeatures = this.config.featureScaling
      ? this.normalizeFeatures(features)
      : this.featuresToArray(features);
    
    // Forward pass through network
    const { output, hiddenActivations } = this.forwardPass(normalizedFeatures);
    
    // Calculate confidence based on output strength
    const confidence = this.calculateConfidence(output, hiddenActivations);
    
    // Determine recommendation
    const recommendation = this.determineRecommendation(output, confidence);
    
    // Calculate feature contributions (simplified gradient-based attribution)
    const contributions = this.calculateFeatureContributions(features, normalizedFeatures, hiddenActivations);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(features, output, contributions, recommendation);
    
    // Track score history
    this.scoreHistory.push(output);
    if (this.scoreHistory.length > 1000) {
      this.scoreHistory.shift();
    }
    
    // Emit scoring event
    this.emit('opportunityScored', {
      score: output,
      confidence,
      recommendation,
      features,
    });
    
    return {
      score: output,
      confidence,
      featureContributions: contributions,
      recommendation,
      reasoning,
    };
  }
  
  /**
   * Forward pass through neural network
   */
  private forwardPass(input: number[]): { output: number; hiddenActivations: number[] } {
    const hiddenSize = this.config.hiddenLayerSize;
    const hiddenActivations: number[] = [];
    
    // Input to hidden layer
    for (let i = 0; i < hiddenSize; i++) {
      let sum = this.weights.hiddenBias[i];
      for (let j = 0; j < input.length; j++) {
        sum += input[j] * this.weights.inputHidden[j][i];
      }
      // ReLU activation
      hiddenActivations.push(Math.max(0, sum));
    }
    
    // Hidden to output layer
    let output = this.weights.outputBias;
    for (let i = 0; i < hiddenSize; i++) {
      output += hiddenActivations[i] * this.weights.hiddenOutput[i];
    }
    
    // Sigmoid activation for output (0-1 range)
    output = 1 / (1 + Math.exp(-output));
    
    return { output, hiddenActivations };
  }
  
  /**
   * Normalize features using running mean and std
   */
  private normalizeFeatures(features: OpportunityFeatures): number[] {
    const arr = this.featuresToArray(features);
    const normalized: number[] = [];
    
    const featureNames = Object.keys(features);
    
    for (let i = 0; i < arr.length; i++) {
      const name = featureNames[i];
      const mean = this.featureMeans.get(name) ?? 0;
      const std = this.featureStds.get(name) ?? 1;
      
      normalized.push((arr[i] - mean) / (std + 1e-8));
    }
    
    return normalized;
  }
  
  /**
   * Convert features object to array
   */
  private featuresToArray(features: OpportunityFeatures): number[] {
    return [
      features.grossProfit,
      features.netProfit,
      features.profitMargin,
      features.roi,
      features.totalLiquidity,
      features.liquidityRatio,
      features.poolDepth,
      features.mevRisk,
      features.competitionLevel,
      features.blockCongestion,
      features.hopCount,
      features.pathComplexity,
      features.gasEstimate,
      features.volatility,
      features.priceImpact,
      features.timeOfDay,
      features.similarPathSuccessRate,
      features.avgHistoricalProfit,
    ];
  }
  
  /**
   * Calculate confidence in score
   */
  private calculateConfidence(output: number, hiddenActivations: number[]): number {
    // Confidence based on:
    // 1. Output strength (closer to 0 or 1 is more confident)
    const outputStrength = Math.abs(output - 0.5) * 2;
    
    // 2. Hidden layer activation diversity
    const activationMean = hiddenActivations.reduce((a, b) => a + b, 0) / hiddenActivations.length;
    const activationVariance = hiddenActivations.reduce((sum, val) => 
      sum + Math.pow(val - activationMean, 2), 0) / hiddenActivations.length;
    const diversityScore = Math.min(1, activationVariance / 10);
    
    return (outputStrength * 0.7 + diversityScore * 0.3);
  }
  
  /**
   * Determine execution recommendation
   */
  private determineRecommendation(
    score: number,
    confidence: number
  ): 'execute' | 'skip' | 'uncertain' {
    if (score >= this.config.executionThreshold && confidence >= this.config.minConfidenceScore) {
      return 'execute';
    }
    
    if (score < 0.3 || (score < 0.5 && confidence >= this.config.minConfidenceScore)) {
      return 'skip';
    }
    
    return 'uncertain';
  }
  
  /**
   * Calculate feature contributions using gradient-based attribution
   */
  private calculateFeatureContributions(
    features: OpportunityFeatures,
    normalizedInput: number[],
    hiddenActivations: number[]
  ): Map<string, number> {
    const contributions = new Map<string, number>();
    const featureNames = Object.keys(features) as (keyof OpportunityFeatures)[];
    
    // Simplified gradient calculation (actual implementation would use backprop)
    for (let i = 0; i < normalizedInput.length; i++) {
      let contribution = 0;
      
      // Sum contributions through hidden layer
      for (let j = 0; j < this.config.hiddenLayerSize; j++) {
        const weight = this.weights.inputHidden[i][j];
        const hiddenContribution = this.weights.hiddenOutput[j];
        contribution += weight * hiddenContribution * (hiddenActivations[j] > 0 ? 1 : 0);
      }
      
      // Normalize contribution
      contribution = Math.abs(contribution) * Math.abs(normalizedInput[i]);
      
      if (i < featureNames.length) {
        contributions.set(featureNames[i], contribution);
      }
    }
    
    return contributions;
  }
  
  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    features: OpportunityFeatures,
    score: number,
    contributions: Map<string, number>,
    recommendation: 'execute' | 'skip' | 'uncertain'
  ): string {
    // Find top contributing features
    const sortedContributions = Array.from(contributions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    const topFactors = sortedContributions.map(([name, _]) => name).join(', ');
    
    const scorePercent = (score * 100).toFixed(0);
    
    if (recommendation === 'execute') {
      return `High confidence execution (${scorePercent}% score). Key factors: ${topFactors}. ` +
             `Net profit ${features.netProfit.toFixed(4)} ETH with ${(features.mevRisk * 100).toFixed(0)}% MEV risk.`;
    }
    
    if (recommendation === 'skip') {
      return `Low score (${scorePercent}%). Negative factors: ${topFactors}. ` +
             `MEV risk ${(features.mevRisk * 100).toFixed(0)}% or insufficient profit margin.`;
    }
    
    return `Uncertain (${scorePercent}% score). Mixed signals from ${topFactors}. ` +
           `Recommend gathering more data or adjusting thresholds.`;
  }
  
  /**
   * Train network on labeled example
   * 
   * Called by ArbitrageConsciousness after execution completes
   * 
   * @param features Features used for scoring
   * @param success Whether execution was successful and profitable
   */
  async trainOnOutcome(features: OpportunityFeatures, success: boolean): Promise<void> {
    const label = success ? 1.0 : 0.0;
    
    // Add to training examples
    this.trainingExamples.push({ features, label });
    
    // Update feature statistics for normalization
    this.updateFeatureStatistics(features);
    
    // Perform batch update if we have enough examples
    if (this.trainingExamples.length >= this.config.batchUpdateSize) {
      await this.batchUpdate();
    }
    
    this.emit('trained', {
      exampleCount: this.trainingExamples.length,
      label: success ? 'success' : 'failure',
    });
  }
  
  /**
   * Update feature statistics for normalization
   */
  private updateFeatureStatistics(features: OpportunityFeatures): void {
    const featureArray = this.featuresToArray(features);
    const featureNames = Object.keys(features);
    
    for (let i = 0; i < featureArray.length && i < featureNames.length; i++) {
      const name = featureNames[i];
      const value = featureArray[i];
      
      // Running mean update
      const currentMean = this.featureMeans.get(name) ?? value;
      const newMean = currentMean * 0.99 + value * 0.01;
      this.featureMeans.set(name, newMean);
      
      // Running std update
      const currentStd = this.featureStds.get(name) ?? 1;
      const deviation = Math.abs(value - newMean);
      const newStd = currentStd * 0.99 + deviation * 0.01;
      this.featureStds.set(name, newStd);
    }
  }
  
  /**
   * Perform batch gradient descent update
   */
  private async batchUpdate(): Promise<void> {
    if (this.trainingExamples.length === 0) return;
    
    // Sample batch
    const batchSize = Math.min(this.config.batchUpdateSize, this.trainingExamples.length);
    const batch = this.sampleBatch(batchSize);
    
    // Accumulate gradients
    const gradInputHidden = this.initializeGradientMatrix(this.weights.inputHidden);
    const gradHiddenOutput = new Array(this.config.hiddenLayerSize).fill(0);
    let gradOutputBias = 0;
    const gradHiddenBias = new Array(this.config.hiddenLayerSize).fill(0);
    
    for (const example of batch) {
      const input = this.config.featureScaling
        ? this.normalizeFeatures(example.features)
        : this.featuresToArray(example.features);
      
      // Forward pass
      const { output, hiddenActivations } = this.forwardPass(input);
      
      // Backward pass
      const outputError = output - example.label;
      gradOutputBias += outputError;
      
      // Hidden to output gradients
      for (let i = 0; i < this.config.hiddenLayerSize; i++) {
        gradHiddenOutput[i] += outputError * hiddenActivations[i];
        
        // Backprop to hidden layer
        const hiddenError = outputError * this.weights.hiddenOutput[i];
        const hiddenDelta = hiddenActivations[i] > 0 ? hiddenError : 0; // ReLU derivative
        
        gradHiddenBias[i] += hiddenDelta;
        
        // Input to hidden gradients
        for (let j = 0; j < input.length; j++) {
          gradInputHidden[j][i] += hiddenDelta * input[j];
        }
      }
    }
    
    // Average gradients
    const scale = 1 / batchSize;
    for (let i = 0; i < gradInputHidden.length; i++) {
      for (let j = 0; j < gradInputHidden[i].length; j++) {
        gradInputHidden[i][j] *= scale;
      }
    }
    
    for (let i = 0; i < gradHiddenOutput.length; i++) {
      gradHiddenOutput[i] *= scale;
      gradHiddenBias[i] *= scale;
    }
    gradOutputBias *= scale;
    
    // Update weights with momentum
    this.updateWeightsWithMomentum(gradInputHidden, gradHiddenOutput, gradOutputBias, gradHiddenBias);
    
    // Clear processed examples
    this.trainingExamples = this.trainingExamples.slice(batchSize);
    
    this.emit('batchUpdated', {
      batchSize,
      remainingExamples: this.trainingExamples.length,
    });
  }
  
  /**
   * Initialize gradient matrix with zeros
   */
  private initializeGradientMatrix(template: number[][]): number[][] {
    return template.map(row => new Array(row.length).fill(0));
  }
  
  /**
   * Update weights using gradient descent with momentum
   */
  private updateWeightsWithMomentum(
    gradInputHidden: number[][],
    gradHiddenOutput: number[],
    gradOutputBias: number,
    gradHiddenBias: number[]
  ): void {
    const lr = this.config.learningRate;
    const momentum = this.config.momentum;
    
    // Initialize velocity if needed
    if (this.velocityInputHidden.length === 0) {
      this.velocityInputHidden = this.initializeGradientMatrix(this.weights.inputHidden);
      this.velocityHiddenOutput = new Array(this.config.hiddenLayerSize).fill(0);
    }
    
    // Update input-hidden weights
    for (let i = 0; i < this.weights.inputHidden.length; i++) {
      for (let j = 0; j < this.weights.inputHidden[i].length; j++) {
        this.velocityInputHidden[i][j] = momentum * this.velocityInputHidden[i][j] - lr * gradInputHidden[i][j];
        this.weights.inputHidden[i][j] += this.velocityInputHidden[i][j];
      }
    }
    
    // Update hidden-output weights
    for (let i = 0; i < this.weights.hiddenOutput.length; i++) {
      this.velocityHiddenOutput[i] = momentum * this.velocityHiddenOutput[i] - lr * gradHiddenOutput[i];
      this.weights.hiddenOutput[i] += this.velocityHiddenOutput[i];
      
      // Update hidden bias
      this.weights.hiddenBias[i] -= lr * gradHiddenBias[i];
    }
    
    // Update output bias
    this.weights.outputBias -= lr * gradOutputBias;
  }
  
  /**
   * Sample random batch from training examples
   */
  private sampleBatch(size: number): Array<{ features: OpportunityFeatures; label: number }> {
    const batch: Array<{ features: OpportunityFeatures; label: number }> = [];
    const exampleCount = this.trainingExamples.length;
    
    for (let i = 0; i < size && i < exampleCount; i++) {
      const idx = Math.floor(Math.random() * exampleCount);
      batch.push(this.trainingExamples[idx]);
    }
    
    return batch;
  }
  
  /**
   * Get scorer statistics
   */
  getStatistics() {
    const avgScore = this.scoreHistory.length > 0
      ? this.scoreHistory.reduce((a, b) => a + b, 0) / this.scoreHistory.length
      : 0;
    
    return {
      trainingExamples: this.trainingExamples.length,
      scoreHistorySize: this.scoreHistory.length,
      avgScore,
      featureMeansCount: this.featureMeans.size,
      networkSize: {
        input: 18,
        hidden: this.config.hiddenLayerSize,
        output: 1,
      },
    };
  }
  
  /**
   * Export model for persistence
   */
  exportModel(): any {
    return {
      weights: this.weights,
      featureMeans: Array.from(this.featureMeans.entries()),
      featureStds: Array.from(this.featureStds.entries()),
      config: this.config,
      statistics: this.getStatistics(),
    };
  }
  
  /**
   * Import model from persistence
   */
  importModel(data: any): void {
    if (data.weights) {
      this.weights = data.weights;
    }
    
    if (data.featureMeans) {
      this.featureMeans = new Map(data.featureMeans);
    }
    
    if (data.featureStds) {
      this.featureStds = new Map(data.featureStds);
    }
    
    console.log('[OpportunityNNScorer] Imported model');
  }
}
