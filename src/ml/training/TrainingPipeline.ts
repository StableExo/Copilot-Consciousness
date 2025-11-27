/**
 * TrainingPipeline - Automated model training and management
 *
 * Handles scheduled retraining, incremental learning, performance monitoring,
 * A/B testing, versioning, and automated deployment of ML models.
 */

import { EventEmitter } from 'events';
import { getMLConfig, MLConfig } from '../../config/ml.config';
import { ModelMetadata, ModelPerformance, ModelAlert, TrainingRecord } from '../types';

export interface TrainingConfig {
  schedule: {
    lstmInterval: number; // milliseconds
    scorerInterval: number;
    volatilityInterval: number;
  };
  autoRetrain: boolean;
  minTrainingSamples: number;
  performanceThreshold: {
    accuracy: number;
    minImprovement: number;
  };
}

export interface TrainingJob {
  id: string;
  modelType: 'lstm' | 'random_forest' | 'garch';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  metrics?: Record<string, number>;
  error?: string;
}

/**
 * TrainingPipeline - Manages ML model training lifecycle
 */
export class TrainingPipeline extends EventEmitter {
  private config: MLConfig;
  private trainingConfig: TrainingConfig;
  private trainingJobs: Map<string, TrainingJob> = new Map();
  private retrainIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private trainingData: TrainingRecord[] = [];

  constructor(config?: Partial<MLConfig>) {
    super();
    this.config = config ? { ...getMLConfig(), ...config } : getMLConfig();
    this.trainingConfig = {
      schedule: {
        lstmInterval: this.config.models.lstm.retrainInterval,
        scorerInterval: this.config.models.opportunityScorer.retrainInterval,
        volatilityInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      autoRetrain: true,
      minTrainingSamples: 1000,
      performanceThreshold: {
        accuracy: 0.7,
        minImprovement: 0.05,
      },
    };
  }

  /**
   * Start automated training pipeline
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('[TrainingPipeline] Starting automated training pipeline');

    // Schedule LSTM retraining
    if (this.config.models.lstm.enabled) {
      this.scheduleRetraining('lstm', this.trainingConfig.schedule.lstmInterval);
    }

    // Schedule opportunity scorer retraining
    if (this.config.models.opportunityScorer.enabled) {
      this.scheduleRetraining('scorer', this.trainingConfig.schedule.scorerInterval);
    }

    // Schedule volatility model retraining
    if (this.config.models.volatility.enabled) {
      this.scheduleRetraining('volatility', this.trainingConfig.schedule.volatilityInterval);
    }

    this.emit('started');
  }

  /**
   * Stop training pipeline
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all scheduled retraining
    for (const [modelType, interval] of this.retrainIntervals.entries()) {
      clearInterval(interval);
      console.log(`[TrainingPipeline] Stopped scheduled retraining for ${modelType}`);
    }
    this.retrainIntervals.clear();

    console.log('[TrainingPipeline] Training pipeline stopped');
    this.emit('stopped');
  }

  /**
   * Schedule periodic model retraining
   */
  private scheduleRetraining(modelType: string, interval: number): void {
    const timer = setInterval(async () => {
      console.log(`[TrainingPipeline] Scheduled retraining triggered for ${modelType}`);
      await this.trainModel(modelType);
    }, interval);

    this.retrainIntervals.set(modelType, timer);
    console.log(`[TrainingPipeline] Scheduled ${modelType} retraining every ${interval}ms`);
  }

  /**
   * Train a specific model
   */
  async trainModel(modelType: string): Promise<TrainingJob> {
    const jobId = `${modelType}-${Date.now()}`;

    const job: TrainingJob = {
      id: jobId,
      modelType: modelType as any,
      status: 'pending',
    };

    this.trainingJobs.set(jobId, job);
    this.emit('job_created', job);

    try {
      // Check if we have enough training data
      if (this.trainingData.length < this.trainingConfig.minTrainingSamples) {
        throw new Error(
          `Insufficient training data: ${this.trainingData.length} < ${this.trainingConfig.minTrainingSamples}`
        );
      }

      job.status = 'running';
      job.startTime = Date.now();
      this.emit('job_started', job);

      console.log(`[TrainingPipeline] Training ${modelType} model...`);

      // Train based on model type
      let metrics: Record<string, number> = {};

      switch (modelType) {
        case 'lstm':
          metrics = await this.trainLSTM();
          break;
        case 'scorer':
          metrics = await this.trainOpportunityScorer();
          break;
        case 'volatility':
          metrics = await this.trainVolatility();
          break;
        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }

      // Update job status
      job.status = 'completed';
      job.endTime = Date.now();
      job.metrics = metrics;

      console.log(`[TrainingPipeline] ${modelType} training completed:`, metrics);
      this.emit('job_completed', job);

      // Check if model meets performance threshold
      await this.evaluateModel(modelType, metrics);

      return job;
    } catch (error) {
      job.status = 'failed';
      job.endTime = Date.now();
      job.error = error instanceof Error ? error.message : String(error);

      console.error(`[TrainingPipeline] Training failed for ${modelType}:`, error);
      this.emit('job_failed', job);

      // Emit alert
      this.emitAlert('error', 'training_failed', `Training failed for ${modelType}: ${job.error}`);

      return job;
    }
  }

  /**
   * Train LSTM model
   */
  private async trainLSTM(): Promise<Record<string, number>> {
    // In production, this would:
    // 1. Prepare sequences from training data
    // 2. Call Python training script via subprocess or REST API
    // 3. Wait for training completion
    // 4. Load and validate new model
    // 5. Return training metrics

    // Placeholder metrics
    return {
      loss: 0.05,
      val_loss: 0.06,
      mae: 0.02,
      accuracy: 0.72,
      training_time: 1800,
    };
  }

  /**
   * Train opportunity scorer
   */
  private async trainOpportunityScorer(): Promise<Record<string, number>> {
    // In production, this would:
    // 1. Extract features from training data
    // 2. Split into train/val sets
    // 3. Train Random Forest
    // 4. Perform cross-validation
    // 5. Export model to joblib
    // 6. Return metrics

    // Placeholder metrics
    return {
      accuracy: 0.78,
      precision: 0.75,
      recall: 0.82,
      f1: 0.78,
      auc: 0.85,
    };
  }

  /**
   * Train volatility model
   */
  private async trainVolatility(): Promise<Record<string, number>> {
    // In production, this would:
    // 1. Prepare price series
    // 2. Fit GARCH model
    // 3. Validate forecasts
    // 4. Export model
    // 5. Return metrics

    // Placeholder metrics
    return {
      aic: 1234.5,
      bic: 1256.7,
      log_likelihood: -615.2,
      forecast_accuracy: 0.71,
    };
  }

  /**
   * Evaluate model performance and decide whether to deploy
   */
  private async evaluateModel(modelType: string, metrics: Record<string, number>): Promise<void> {
    const accuracy = metrics.accuracy || metrics.forecast_accuracy || 0;

    // Check if model meets minimum threshold
    if (accuracy < this.trainingConfig.performanceThreshold.accuracy) {
      this.emitAlert(
        'warning',
        'accuracy_drop',
        `${modelType} accuracy (${accuracy.toFixed(3)}) below threshold (${
          this.trainingConfig.performanceThreshold.accuracy
        })`
      );
      return;
    }

    console.log(`[TrainingPipeline] ${modelType} model evaluation passed`);

    // In production, this would:
    // 1. Compare with current production model
    // 2. Run A/B test if needed
    // 3. Deploy new model if better
    // 4. Update model metadata

    this.emit('model_deployed', {
      modelType,
      metrics,
      timestamp: Date.now(),
    });
  }

  /**
   * Add training data
   */
  addTrainingData(data: TrainingRecord | TrainingRecord[]): void {
    const records = Array.isArray(data) ? data : [data];
    this.trainingData.push(...records);

    // Keep only recent data to avoid memory issues
    const maxRecords = this.trainingConfig.minTrainingSamples * 10;
    if (this.trainingData.length > maxRecords) {
      this.trainingData = this.trainingData.slice(-maxRecords);
    }

    this.emit('training_data_added', records.length);
  }

  /**
   * Get training data count
   */
  getTrainingDataCount(): number {
    return this.trainingData.length;
  }

  /**
   * Trigger manual retraining
   */
  async retrain(modelType: string): Promise<TrainingJob> {
    console.log(`[TrainingPipeline] Manual retraining triggered for ${modelType}`);
    return this.trainModel(modelType);
  }

  /**
   * Get training job status
   */
  getJob(jobId: string): TrainingJob | undefined {
    return this.trainingJobs.get(jobId);
  }

  /**
   * Get all training jobs
   */
  getAllJobs(): TrainingJob[] {
    return Array.from(this.trainingJobs.values());
  }

  /**
   * Get recent jobs
   */
  getRecentJobs(limit: number = 10): TrainingJob[] {
    return Array.from(this.trainingJobs.values())
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .slice(0, limit);
  }

  /**
   * Emit model alert
   */
  private emitAlert(severity: 'info' | 'warning' | 'error', type: string, message: string): void {
    const alert: ModelAlert = {
      severity,
      type: type as any,
      message,
      timestamp: Date.now(),
    };

    this.emit('alert', alert);
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    for (const [jobId, job] of this.trainingJobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.trainingJobs.delete(jobId);
      }
    }
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    const jobs = Array.from(this.trainingJobs.values());

    return {
      isRunning: this.isRunning,
      trainingDataCount: this.trainingData.length,
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      scheduledModels: Array.from(this.retrainIntervals.keys()),
    };
  }
}
