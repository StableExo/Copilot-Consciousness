/**
 * ExecutionTypes.ts - Comprehensive type definitions for Mission #5
 * 
 * This module defines all TypeScript interfaces and types required for the
 * integrated arbitrage execution engine, including orchestration, pipeline,
 * execution, monitoring, and error recovery components.
 */

import { ArbitrageOpportunity, ArbitragePath as LegacyPath } from './definitions';
import { ArbitragePath, ArbitrageHop } from '../arbitrage/types';

/**
 * Execution State - Tracks the state of an arbitrage execution through the pipeline
 */
export enum ExecutionState {
  PENDING = 'PENDING',
  DETECTING = 'DETECTING',
  VALIDATING = 'VALIDATING',
  PREPARING = 'PREPARING',
  EXECUTING = 'EXECUTING',
  MONITORING = 'MONITORING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Execution Priority - Determines the priority of an execution
 */
export enum ExecutionPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Component Health Status
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Error Recovery Strategy
 */
export enum RecoveryStrategy {
  RETRY = 'RETRY',
  RESYNC_NONCE = 'RESYNC_NONCE',
  ADJUST_GAS = 'ADJUST_GAS',
  CANCEL = 'CANCEL',
  WAIT_AND_RETRY = 'WAIT_AND_RETRY',
  ESCALATE = 'ESCALATE'
}

/**
 * Transaction Status
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REVERTED = 'REVERTED',
  REPLACED = 'REPLACED',
  CANCELLED = 'CANCELLED'
}

/**
 * Execution Context - Contains all information needed for a single execution
 */
export interface ExecutionContext {
  id: string;
  opportunity: ArbitrageOpportunity;
  path: ArbitragePath;
  state: ExecutionState;
  priority: ExecutionPriority;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
  
  // Gas information
  estimatedGas?: bigint;
  gasPrice?: bigint;
  totalGasCost?: bigint;
  
  // Profit calculations
  estimatedProfit?: bigint;
  netProfit?: bigint;
  
  // Transaction info
  transactionHash?: string;
  nonce?: number;
  blockNumber?: number;
  
  // Error tracking
  errors: ExecutionError[];
  retryCount: number;
  maxRetries: number;
}

/**
 * Execution Error
 */
export interface ExecutionError {
  timestamp: number;
  stage: ExecutionState;
  errorType: string;
  message: string;
  code?: string;
  recoverable: boolean;
  suggestedStrategy?: RecoveryStrategy;
  details?: Record<string, unknown>;
}

/**
 * Pipeline Checkpoint Result
 */
export interface CheckpointResult {
  success: boolean;
  stage: ExecutionState;
  timestamp: number;
  context: ExecutionContext;
  errors?: ExecutionError[];
  warnings?: string[];
  metrics?: Record<string, unknown>;
}

/**
 * Transaction Execution Request
 */
export interface TransactionExecutionRequest {
  context: ExecutionContext;
  from: string;
  executorAddress: string;
  maxGasPrice?: bigint;
  deadline?: number;
  slippageTolerance?: number;
}

/**
 * Transaction Execution Result
 */
export interface TransactionExecutionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  actualProfit?: bigint;
  status: TransactionStatus;
  timestamp: number;
  error?: ExecutionError;
}

/**
 * Component Health Metrics
 */
export interface ComponentHealthMetrics {
  componentName: string;
  status: HealthStatus;
  uptime: number;
  lastCheck: number;
  errorRate: number;
  successRate: number;
  avgResponseTime: number;
  metrics: Record<string, number | bigint | string>;
  issues: string[];
}

/**
 * System Health Report
 */
export interface SystemHealthReport {
  timestamp: number;
  overallStatus: HealthStatus;
  components: ComponentHealthMetrics[];
  activeExecutions: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalProfit: bigint;
  totalGasCost: bigint;
  alerts: SystemAlert[];
}

/**
 * System Alert
 */
export interface SystemAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  component: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Recovery Action
 */
export interface RecoveryAction {
  id: string;
  strategy: RecoveryStrategy;
  context: ExecutionContext;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
  backoffMs: number;
  nextRetryAt?: number;
  result?: RecoveryResult;
}

/**
 * Recovery Result
 */
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  timestamp: number;
  executionResumed: boolean;
  error?: ExecutionError;
  newContext?: ExecutionContext;
}

/**
 * Orchestrator Configuration
 */
export interface OrchestratorConfig {
  // Execution settings
  maxConcurrentExecutions: number;
  executionTimeout: number;
  
  // Gas settings
  maxGasPrice: bigint;
  minProfitAfterGas: bigint;
  gasBufferMultiplier: number;
  
  // Retry settings
  maxRetries: number;
  retryBackoffMs: number;
  retryBackoffMultiplier: number;
  
  // Validation settings
  validateBeforeExecution: boolean;
  requireGasEstimation: boolean;
  requireProfitValidation: boolean;
  
  // Monitoring settings
  healthCheckInterval: number;
  metricsCollectionInterval: number;
  enableAnomalyDetection: boolean;
  
  // Recovery settings
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  escalationThreshold: number;
}

/**
 * Pipeline Stage Configuration
 */
export interface PipelineStageConfig {
  stageName: string;
  timeout: number;
  retryable: boolean;
  required: boolean;
  validateCheckpoint: boolean;
}

/**
 * Multi-DEX Transaction Parameters
 */
export interface MultiDEXTransactionParams {
  dexType: 'UniswapV2' | 'UniswapV3' | 'SushiSwap' | 'Curve' | 'Aave' | 'Balancer';
  contractAddress: string;
  functionName: string;
  params: Record<string, unknown>;
  borrowTokenAddress: string;
  borrowAmount: bigint;
  minAmountOut: bigint;
}

/**
 * Transaction Monitoring Info
 */
export interface TransactionMonitoringInfo {
  transactionHash: string;
  submittedAt: number;
  confirmedAt?: number;
  blockNumber?: number;
  confirmations: number;
  requiredConfirmations: number;
  status: TransactionStatus;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  avgExecutionTime: number;
  avgGasUsed: bigint;
  avgProfit: bigint;
  successRate: number;
  totalExecutions: number;
  profitableExecutions: number;
  totalProfit: bigint;
  totalGasCost: bigint;
  netProfit: bigint;
  roi: number;
}

/**
 * Anomaly Detection Result
 */
export interface AnomalyDetectionResult {
  detected: boolean;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedComponent: string;
  suggestedAction?: string;
  metrics?: Record<string, number>;
}

/**
 * Event Types for Event-Driven Architecture
 */
export enum ExecutionEventType {
  OPPORTUNITY_DETECTED = 'OPPORTUNITY_DETECTED',
  VALIDATION_STARTED = 'VALIDATION_STARTED',
  VALIDATION_COMPLETED = 'VALIDATION_COMPLETED',
  PREPARATION_STARTED = 'PREPARATION_STARTED',
  PREPARATION_COMPLETED = 'PREPARATION_COMPLETED',
  EXECUTION_STARTED = 'EXECUTION_STARTED',
  TRANSACTION_SUBMITTED = 'TRANSACTION_SUBMITTED',
  TRANSACTION_CONFIRMED = 'TRANSACTION_CONFIRMED',
  EXECUTION_COMPLETED = 'EXECUTION_COMPLETED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  RECOVERY_INITIATED = 'RECOVERY_INITIATED',
  RECOVERY_COMPLETED = 'RECOVERY_COMPLETED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED'
}

/**
 * Execution Event
 */
export interface ExecutionEvent {
  id: string;
  type: ExecutionEventType;
  timestamp: number;
  context: ExecutionContext;
  data?: Record<string, unknown>;
}

/**
 * Event Handler Function Type
 */
export type ExecutionEventHandler = (event: ExecutionEvent) => void | Promise<void>;

/**
 * Opportunity Decision - Accept or reject an opportunity
 */
export interface OpportunityDecision {
  accepted: boolean;
  reason?: string;
  priority?: ExecutionPriority;
  validations: {
    gasValidation: boolean;
    profitValidation: boolean;
    liquidityValidation: boolean;
    riskValidation: boolean;
  };
  estimatedMetrics?: {
    estimatedGas: bigint;
    gasPrice: bigint;
    totalGasCost: bigint;
    estimatedProfit: bigint;
    netProfit: bigint;
    roi: number;
  };
}

/**
 * State Persistence Interface
 */
export interface StatePersistence {
  save(context: ExecutionContext): Promise<void>;
  load(id: string): Promise<ExecutionContext | null>;
  update(id: string, updates: Partial<ExecutionContext>): Promise<void>;
  delete(id: string): Promise<void>;
  listActive(): Promise<ExecutionContext[]>;
}

/**
 * Atomic Operation Result
 */
export interface AtomicOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  rollback?: () => Promise<void>;
}
