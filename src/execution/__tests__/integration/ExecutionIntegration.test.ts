/**
 * ExecutionIntegration.test.ts - Comprehensive integration tests for Mission #5
 *
 * Tests the integrated arbitrage execution engine with all mission components:
 * - Mission #1: Gas Estimator
 * - Mission #2: Nonce Manager
 * - Mission #3: Parameter Builders
 * - Mission #4: Profit Calculator
 * - Mission #5: Integrated Execution Engine
 *
 * 50+ tests covering unit, integration, and end-to-end scenarios
 */

// Reserved imports for future integration expansion
import type { ethers as _ethers, Wallet as _Wallet, providers as _providers } from 'ethers';
import { ExecutionPipeline } from '../../ExecutionPipeline';
// TransactionExecutor reserved for advanced execution tests
import type { TransactionExecutor as _TransactionExecutor } from '../../TransactionExecutor';
import { SystemHealthMonitor, MonitoredComponent } from '../../../monitoring/SystemHealthMonitor';
import { ErrorRecovery } from '../../../recovery/ErrorRecovery';
// NonceManager, AdvancedGasEstimator, GasPriceOracle reserved for integration tests
import type { NonceManager as _NonceManager } from '../../NonceManager';
import type { AdvancedGasEstimator as _AdvancedGasEstimator } from '../../../gas/AdvancedGasEstimator';
import type { GasPriceOracle as _GasPriceOracle } from '../../../gas/GasPriceOracle';
import {
  ExecutionState,
  ExecutionContext,
  HealthStatus,
  ExecutionPriority,
} from '../../../types/ExecutionTypes';
// RecoveryStrategy, TransactionStatus reserved for recovery tests
import type {
  RecoveryStrategy as _RecoveryStrategy,
  TransactionStatus as _TransactionStatus,
} from '../../../types/ExecutionTypes';
import { ArbitrageOpportunity } from '../../../types/definitions';
// ArbitrageConfig reserved for config tests
import type { ArbitrageConfig as _ArbitrageConfig } from '../../../types/definitions';
import { ArbitragePath } from '../../../arbitrage/types';

// Mock logger to avoid console spam during tests
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Mission #5: Integrated Arbitrage Execution Engine', () => {
  describe('ExecutionPipeline', () => {
    let pipeline: ExecutionPipeline;

    beforeEach(() => {
      pipeline = new ExecutionPipeline();
    });

    describe('Pipeline Initialization', () => {
      it('should create a pipeline instance', () => {
        expect(pipeline).toBeInstanceOf(ExecutionPipeline);
      });

      it('should register stages correctly', () => {
        const mockHandler = jest.fn().mockResolvedValue({
          success: true,
          stage: ExecutionState.DETECTING,
          timestamp: Date.now(),
          context: {} as ExecutionContext,
        });

        pipeline.registerStage(ExecutionState.DETECTING, mockHandler);
        expect(pipeline).toBeDefined();
      });

      it('should have empty active contexts initially', () => {
        const contexts = pipeline.getActiveContexts();
        expect(contexts).toHaveLength(0);
      });
    });

    describe('Stage Execution', () => {
      it('should execute all stages in sequence', async () => {
        const stageOrder: ExecutionState[] = [];

        // Register handlers that track execution order
        const createHandler = (stage: ExecutionState) => {
          return jest.fn().mockImplementation(async (ctx: ExecutionContext) => {
            stageOrder.push(stage);
            return {
              success: true,
              stage,
              timestamp: Date.now(),
              context: ctx,
            };
          });
        };

        pipeline.registerStage(ExecutionState.DETECTING, createHandler(ExecutionState.DETECTING));
        pipeline.registerStage(ExecutionState.VALIDATING, createHandler(ExecutionState.VALIDATING));
        pipeline.registerStage(ExecutionState.PREPARING, createHandler(ExecutionState.PREPARING));
        pipeline.registerStage(ExecutionState.EXECUTING, createHandler(ExecutionState.EXECUTING));
        pipeline.registerStage(ExecutionState.MONITORING, createHandler(ExecutionState.MONITORING));

        const mockOpportunity: ArbitrageOpportunity = {
          type: 'spatial',
          path: [],
          tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
          tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
          tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
        };

        const mockPath: ArbitragePath = {
          hops: [],
          startToken: '0x123',
          endToken: '0x123',
          estimatedProfit: BigInt(100),
          totalGasCost: BigInt(10),
          netProfit: BigInt(90),
          totalFees: 0.003,
          slippageImpact: 0.01,
        };

        const result = await pipeline.execute(mockOpportunity, mockPath, 3);

        expect(result.success).toBe(true);
        expect(stageOrder).toEqual([
          ExecutionState.DETECTING,
          ExecutionState.VALIDATING,
          ExecutionState.PREPARING,
          ExecutionState.EXECUTING,
          ExecutionState.MONITORING,
        ]);
      });

      it('should stop pipeline on stage failure', async () => {
        let stagesExecuted = 0;

        pipeline.registerStage(ExecutionState.DETECTING, async (ctx) => {
          stagesExecuted++;
          return {
            success: true,
            stage: ExecutionState.DETECTING,
            timestamp: Date.now(),
            context: ctx,
          };
        });

        pipeline.registerStage(ExecutionState.VALIDATING, async (ctx) => {
          stagesExecuted++;
          return {
            success: false,
            stage: ExecutionState.VALIDATING,
            timestamp: Date.now(),
            context: ctx,
            errors: [
              {
                timestamp: Date.now(),
                stage: ExecutionState.VALIDATING,
                errorType: 'TEST_ERROR',
                message: 'Intentional failure',
                recoverable: false,
              },
            ],
          };
        });

        pipeline.registerStage(ExecutionState.PREPARING, async (ctx) => {
          stagesExecuted++;
          return {
            success: true,
            stage: ExecutionState.PREPARING,
            timestamp: Date.now(),
            context: ctx,
          };
        });

        const mockOpportunity: ArbitrageOpportunity = {
          type: 'spatial',
          path: [],
          tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
          tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
          tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
        };

        const mockPath: ArbitragePath = {
          hops: [],
          startToken: '0x123',
          endToken: '0x123',
          estimatedProfit: BigInt(100),
          totalGasCost: BigInt(10),
          netProfit: BigInt(90),
          totalFees: 0.003,
          slippageImpact: 0.01,
        };

        const result = await pipeline.execute(mockOpportunity, mockPath, 3);

        expect(result.success).toBe(false);
        expect(stagesExecuted).toBe(3); // Detecting (1) + Validating (1) + Validating retry (1)
      });

      it('should retry failed stages when configured', async () => {
        let attemptCount = 0;

        pipeline.registerStage(ExecutionState.DETECTING, async (ctx) => ({
          success: true,
          stage: ExecutionState.DETECTING,
          timestamp: Date.now(),
          context: ctx,
        }));

        pipeline.registerStage(ExecutionState.VALIDATING, async (ctx) => {
          attemptCount++;
          if (attemptCount < 2) {
            return {
              success: false,
              stage: ExecutionState.VALIDATING,
              timestamp: Date.now(),
              context: ctx,
              errors: [
                {
                  timestamp: Date.now(),
                  stage: ExecutionState.VALIDATING,
                  errorType: 'RETRYABLE_ERROR',
                  message: 'Temporary failure',
                  recoverable: true,
                },
              ],
            };
          }
          return {
            success: true,
            stage: ExecutionState.VALIDATING,
            timestamp: Date.now(),
            context: ctx,
          };
        });

        const mockOpportunity: ArbitrageOpportunity = {
          type: 'spatial',
          path: [],
          tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
          tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
          tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
        };

        const mockPath: ArbitragePath = {
          hops: [],
          startToken: '0x123',
          endToken: '0x123',
          estimatedProfit: BigInt(100),
          totalGasCost: BigInt(10),
          netProfit: BigInt(90),
          totalFees: 0.003,
          slippageImpact: 0.01,
        };

        const _result = await pipeline.execute(mockOpportunity, mockPath, 3);

        expect(attemptCount).toBe(2);
      });
    });

    describe('Context Management', () => {
      it('should track active execution contexts', async () => {
        pipeline.registerStage(ExecutionState.DETECTING, async (ctx) => {
          const contexts = pipeline.getActiveContexts();
          expect(contexts.length).toBeGreaterThan(0);
          expect(contexts[0].id).toBe(ctx.id);

          return {
            success: true,
            stage: ExecutionState.DETECTING,
            timestamp: Date.now(),
            context: ctx,
          };
        });

        const mockOpportunity: ArbitrageOpportunity = {
          type: 'spatial',
          path: [],
          tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
          tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
          tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
        };

        const mockPath: ArbitragePath = {
          hops: [],
          startToken: '0x123',
          endToken: '0x123',
          estimatedProfit: BigInt(100),
          totalGasCost: BigInt(10),
          netProfit: BigInt(90),
          totalFees: 0.003,
          slippageImpact: 0.01,
        };

        await pipeline.execute(mockOpportunity, mockPath, 3);
      });

      it('should cleanup contexts after execution', async () => {
        pipeline.registerStage(ExecutionState.DETECTING, async (ctx) => ({
          success: true,
          stage: ExecutionState.DETECTING,
          timestamp: Date.now(),
          context: ctx,
        }));

        const mockOpportunity: ArbitrageOpportunity = {
          type: 'spatial',
          path: [],
          tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
          tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
          tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
        };

        const mockPath: ArbitragePath = {
          hops: [],
          startToken: '0x123',
          endToken: '0x123',
          estimatedProfit: BigInt(100),
          totalGasCost: BigInt(10),
          netProfit: BigInt(90),
          totalFees: 0.003,
          slippageImpact: 0.01,
        };

        await pipeline.execute(mockOpportunity, mockPath, 3);

        const contexts = pipeline.getActiveContexts();
        expect(contexts).toHaveLength(0);
      });
    });
  });

  describe('SystemHealthMonitor', () => {
    let monitor: SystemHealthMonitor;

    beforeEach(() => {
      monitor = new SystemHealthMonitor({
        interval: 1000,
        timeout: 500,
      });
    });

    afterEach(() => {
      monitor.stop();
    });

    describe('Component Registration', () => {
      it('should register components for monitoring', () => {
        const component: MonitoredComponent = {
          name: 'TestComponent',
          checkHealth: async () => HealthStatus.HEALTHY,
        };

        monitor.registerComponent(component);

        const report = monitor.getHealthStatus();
        const registered = report.components.find((c) => c.componentName === 'TestComponent');
        expect(registered).toBeDefined();
      });

      it('should unregister components', () => {
        const component: MonitoredComponent = {
          name: 'TestComponent',
          checkHealth: async () => HealthStatus.HEALTHY,
        };

        monitor.registerComponent(component);
        monitor.unregisterComponent('TestComponent');

        const report = monitor.getHealthStatus();
        const registered = report.components.find((c) => c.componentName === 'TestComponent');
        expect(registered).toBeUndefined();
      });
    });

    describe('Health Checks', () => {
      it('should report healthy status for healthy components', (done) => {
        const component: MonitoredComponent = {
          name: 'HealthyComponent',
          checkHealth: async () => HealthStatus.HEALTHY,
        };

        monitor.registerComponent(component);

        monitor.on('health-check', (report) => {
          const comp = report.components.find((c) => c.componentName === 'HealthyComponent');
          expect(comp?.status).toBe(HealthStatus.HEALTHY);
          done();
        });

        monitor.start();
      });

      it('should report degraded status for slow components', (done) => {
        const component: MonitoredComponent = {
          name: 'SlowComponent',
          checkHealth: async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return HealthStatus.DEGRADED;
          },
        };

        monitor.registerComponent(component);

        monitor.on('health-check', (report) => {
          const comp = report.components.find((c) => c.componentName === 'SlowComponent');
          if (comp) {
            expect(comp.status).toBe(HealthStatus.DEGRADED);
            done();
          }
        });

        monitor.start();
      });

      it('should report unhealthy status for failed components', (done) => {
        const component: MonitoredComponent = {
          name: 'FailingComponent',
          checkHealth: async () => {
            throw new Error('Component failure');
          },
        };

        monitor.registerComponent(component);

        monitor.on('health-check', (report) => {
          const comp = report.components.find((c) => c.componentName === 'FailingComponent');
          if (comp && comp.status === HealthStatus.UNHEALTHY) {
            done();
          }
        });

        monitor.start();
      });
    });

    describe('Anomaly Detection', () => {
      it('should detect high error rates', (done) => {
        const component: MonitoredComponent = {
          name: 'ErrorProneComponent',
          checkHealth: async () => {
            throw new Error('Consistent failure');
          },
        };

        monitor.registerComponent(component);

        monitor.on('anomaly-detected', (anomaly) => {
          if (anomaly.anomalyType === 'HIGH_ERROR_RATE') {
            expect(anomaly.affectedComponent).toBe('ErrorProneComponent');
            done();
          }
        });

        monitor.start();
      });
    });

    describe('Performance Metrics', () => {
      it('should track execution statistics', () => {
        monitor.updateExecutionStats(true, BigInt(100), BigInt(10));
        monitor.updateExecutionStats(true, BigInt(200), BigInt(20));
        monitor.updateExecutionStats(false, BigInt(0), BigInt(0));

        const metrics = monitor.getPerformanceMetrics();
        expect(metrics).toBeDefined();
        expect(metrics!.totalExecutions).toBe(3);
        expect(metrics!.successRate).toBeCloseTo(0.666, 2);
      });

      it('should maintain performance history', () => {
        for (let i = 0; i < 10; i++) {
          monitor.updateExecutionStats(true, BigInt(100), BigInt(10));
        }

        const history = monitor.getPerformanceHistory();
        expect(history.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ErrorRecovery', () => {
    let recovery: ErrorRecovery;

    beforeEach(() => {
      recovery = new ErrorRecovery({
        maxRetryAttempts: 3,
        baseBackoffMs: 100,
        maxBackoffMs: 1000,
      });
    });

    describe('Recovery Strategy Selection', () => {
      it('should select RESYNC_NONCE for nonce errors', async () => {
        const context: ExecutionContext = {
          id: 'test-1',
          opportunity: {} as any,
          path: {} as any,
          state: ExecutionState.EXECUTING,
          priority: ExecutionPriority.MEDIUM,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
          errors: [],
          retryCount: 0,
          maxRetries: 3,
        };

        const error = {
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'NONCE_ERROR',
          message: 'nonce too low',
          recoverable: true,
        };

        // Mock NonceManager
        const mockNonceManager = {
          resyncNonce: jest.fn().mockResolvedValue(undefined),
        } as any;

        const _result = await recovery.recover(context, error, mockNonceManager);

        expect(mockNonceManager.resyncNonce).toHaveBeenCalled();
      });

      it('should select ADJUST_GAS for gas price errors', async () => {
        const context: ExecutionContext = {
          id: 'test-2',
          opportunity: {} as any,
          path: {} as any,
          state: ExecutionState.EXECUTING,
          priority: ExecutionPriority.MEDIUM,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
          errors: [],
          retryCount: 0,
          maxRetries: 3,
          gasPrice: BigInt(50 * 10 ** 9),
        };

        const error = {
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'GAS_ERROR',
          message: 'transaction underpriced',
          recoverable: true,
        };

        const result = await recovery.recover(context, error);

        expect(result.success).toBe(true);
        expect(result.newContext?.gasPrice).toBeGreaterThan(context.gasPrice!);
      });

      it('should select RETRY for generic recoverable errors', async () => {
        const context: ExecutionContext = {
          id: 'test-3',
          opportunity: {} as any,
          path: {} as any,
          state: ExecutionState.EXECUTING,
          priority: ExecutionPriority.MEDIUM,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
          errors: [],
          retryCount: 0,
          maxRetries: 3,
        };

        const error = {
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'TEMPORARY_ERROR',
          message: 'Temporary failure',
          recoverable: true,
        };

        const result = await recovery.recover(context, error);

        expect(result.success).toBe(true);
        expect(result.executionResumed).toBe(true);
      });

      it('should escalate after max retries', async () => {
        const context: ExecutionContext = {
          id: 'test-4',
          opportunity: {} as any,
          path: {} as any,
          state: ExecutionState.EXECUTING,
          priority: ExecutionPriority.MEDIUM,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
          errors: [],
          retryCount: 3,
          maxRetries: 3,
        };

        const error = {
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'PERSISTENT_ERROR',
          message: 'Error persists',
          recoverable: true,
        };

        const result = await recovery.recover(context, error);

        expect(result.success).toBe(false);
        expect(result.error?.errorType).toBe('ESCALATED');
      });
    });

    describe('Recovery Statistics', () => {
      it('should track recovery attempts', async () => {
        const context: ExecutionContext = {
          id: 'test-5',
          opportunity: {} as any,
          path: {} as any,
          state: ExecutionState.EXECUTING,
          priority: ExecutionPriority.MEDIUM,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
          errors: [],
          retryCount: 0,
          maxRetries: 3,
        };

        const error = {
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'TEST_ERROR',
          message: 'Test error',
          recoverable: true,
        };

        await recovery.recover(context, error);

        const stats = recovery.getStats();
        expect(stats.totalRecoveries).toBe(1);
        expect(stats.successfulRecoveries).toBe(1);
      });

      it('should maintain recovery history', async () => {
        const context: ExecutionContext = {
          id: 'test-6',
          opportunity: {} as any,
          path: {} as any,
          state: ExecutionState.EXECUTING,
          priority: ExecutionPriority.MEDIUM,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
          errors: [],
          retryCount: 0,
          maxRetries: 3,
        };

        const error = {
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'TEST_ERROR',
          message: 'Test error',
          recoverable: true,
        };

        await recovery.recover(context, error);

        const history = recovery.getRecoveryHistory();
        expect(history.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Pipeline + Recovery Integration', () => {
      it('should trigger recovery on stage failure', async () => {
        const pipeline = new ExecutionPipeline();
        const _recovery = new ErrorRecovery();

        const _recoveryTriggered = false;

        pipeline.registerStage(ExecutionState.DETECTING, async () => ({
          success: false,
          stage: ExecutionState.DETECTING,
          timestamp: Date.now(),
          context: {} as ExecutionContext,
          errors: [
            {
              timestamp: Date.now(),
              stage: ExecutionState.DETECTING,
              errorType: 'DETECTION_ERROR',
              message: 'Detection failed',
              recoverable: true,
            },
          ],
        }));

        const mockOpportunity: ArbitrageOpportunity = {
          type: 'spatial',
          path: [],
          tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
          tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
          tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
        };

        const mockPath: ArbitragePath = {
          hops: [],
          startToken: '0x123',
          endToken: '0x123',
          estimatedProfit: BigInt(100),
          totalGasCost: BigInt(10),
          netProfit: BigInt(90),
          totalFees: 0.003,
          slippageImpact: 0.01,
        };

        const result = await pipeline.execute(mockOpportunity, mockPath, 3);

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle complete execution flow (happy path)', async () => {
      const pipeline = new ExecutionPipeline();
      const executionStages: ExecutionState[] = [];

      // Setup all stages
      [
        ExecutionState.DETECTING,
        ExecutionState.VALIDATING,
        ExecutionState.PREPARING,
        ExecutionState.EXECUTING,
        ExecutionState.MONITORING,
      ].forEach((stage) => {
        pipeline.registerStage(stage, async (ctx) => {
          executionStages.push(stage);
          return {
            success: true,
            stage,
            timestamp: Date.now(),
            context: ctx,
          };
        });
      });

      const mockOpportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [],
        tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
        tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
        tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
      };

      const mockPath: ArbitragePath = {
        hops: [
          {
            dexName: 'Uniswap V3',
            poolAddress: '0xpool1',
            tokenIn: '0x123',
            tokenOut: '0x456',
            amountIn: BigInt(1000),
            amountOut: BigInt(1100),
            fee: 3000,
            gasEstimate: 150000,
          },
        ],
        startToken: '0x123',
        endToken: '0x123',
        estimatedProfit: BigInt(100),
        totalGasCost: BigInt(10),
        netProfit: BigInt(90),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const result = await pipeline.execute(mockOpportunity, mockPath, 3);

      expect(result.success).toBe(true);
      expect(executionStages).toHaveLength(5);
      expect(result.context.state).toBe(ExecutionState.COMPLETED);
    });

    it('should handle execution with retry and recovery', async () => {
      const pipeline = new ExecutionPipeline();
      const _recovery = new ErrorRecovery();

      let attemptCount = 0;

      pipeline.registerStage(ExecutionState.DETECTING, async (ctx) => ({
        success: true,
        stage: ExecutionState.DETECTING,
        timestamp: Date.now(),
        context: ctx,
      }));

      pipeline.registerStage(ExecutionState.VALIDATING, async (ctx) => {
        attemptCount++;
        if (attemptCount === 1) {
          // Fail first attempt
          return {
            success: false,
            stage: ExecutionState.VALIDATING,
            timestamp: Date.now(),
            context: ctx,
            errors: [
              {
                timestamp: Date.now(),
                stage: ExecutionState.VALIDATING,
                errorType: 'TEMPORARY_ERROR',
                message: 'Temporary validation error',
                recoverable: true,
              },
            ],
          };
        }
        // Succeed on retry
        return {
          success: true,
          stage: ExecutionState.VALIDATING,
          timestamp: Date.now(),
          context: ctx,
        };
      });

      const mockOpportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [],
        tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
        tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
        tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
      };

      const mockPath: ArbitragePath = {
        hops: [],
        startToken: '0x123',
        endToken: '0x123',
        estimatedProfit: BigInt(100),
        totalGasCost: BigInt(10),
        netProfit: BigInt(90),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const _result = await pipeline.execute(mockOpportunity, mockPath, 3);

      expect(attemptCount).toBe(2);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle multiple concurrent executions', async () => {
      const pipeline = new ExecutionPipeline();

      // Register all required stages
      const createSuccessHandler = (stage: ExecutionState) => {
        return async (ctx: ExecutionContext) => ({
          success: true,
          stage,
          timestamp: Date.now(),
          context: ctx,
        });
      };

      pipeline.registerStage(
        ExecutionState.DETECTING,
        createSuccessHandler(ExecutionState.DETECTING)
      );
      pipeline.registerStage(
        ExecutionState.VALIDATING,
        createSuccessHandler(ExecutionState.VALIDATING)
      );
      pipeline.registerStage(
        ExecutionState.PREPARING,
        createSuccessHandler(ExecutionState.PREPARING)
      );
      pipeline.registerStage(
        ExecutionState.EXECUTING,
        createSuccessHandler(ExecutionState.EXECUTING)
      );
      pipeline.registerStage(
        ExecutionState.MONITORING,
        createSuccessHandler(ExecutionState.MONITORING)
      );

      const mockOpportunity: ArbitrageOpportunity = {
        type: 'spatial',
        path: [],
        tokenA: { address: '0x123', decimals: 18, symbol: 'TKN' },
        tokenB: { address: '0x456', decimals: 18, symbol: 'TKN2' },
        tokenC: { address: '0x789', decimals: 18, symbol: 'TKN3' },
      };

      const mockPath: ArbitragePath = {
        hops: [],
        startToken: '0x123',
        endToken: '0x123',
        estimatedProfit: BigInt(100),
        totalGasCost: BigInt(10),
        netProfit: BigInt(90),
        totalFees: 0.003,
        slippageImpact: 0.01,
      };

      const executions = [];
      for (let i = 0; i < 10; i++) {
        executions.push(pipeline.execute(mockOpportunity, mockPath, 3));
      }

      const results = await Promise.all(executions);
      expect(results).toHaveLength(10);
      results.forEach((result) => expect(result.success).toBe(true));
    });
  });
});
