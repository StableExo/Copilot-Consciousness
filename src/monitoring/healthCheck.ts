/**
 * Health Check HTTP Endpoint
 * 
 * Express HTTP server providing health and metrics endpoints.
 * - GET /health - Returns system health status
 * - GET /metrics - Returns performance metrics
 */

import express, { Request, Response } from 'express';
import { Server } from 'http';
import { logger } from '../utils/logger';
import { InitializedComponents } from '../core/initializer';

export interface HealthCheckConfig {
  port: number;
  enabled: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  components: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message?: string;
    };
  };
}

export interface MetricsResponse {
  timestamp: string;
  uptime: number;
  system: {
    memory: {
      total: number;
      used: number;
      free: number;
      percentUsed: number;
    };
    cpu: {
      loadAverage: number[];
    };
  };
  arbitrage: {
    cyclesCompleted: number;
    opportunitiesFound: number;
    tradesExecuted: number;
    totalProfit: string;
    successRate: number;
  };
  network: {
    blockNumber?: number;
    gasPrice?: string;
  };
}

/**
 * Health Check Server
 */
export class HealthCheckServer {
  private app: express.Application;
  private server?: Server;
  private config: HealthCheckConfig;
  private components?: InitializedComponents;
  private startTime: number = Date.now();
  private stats = {
    cyclesCompleted: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: BigInt(0),
  };

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = {
      port: config?.port || parseInt(process.env.HEALTH_CHECK_PORT || '3001'),
      enabled: config?.enabled !== undefined ? config.enabled : true,
    };

    this.app = express();
    this.setupRoutes();
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Health endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const health = await this.getHealthStatus();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error(`Error in /health endpoint: ${error}`, 'HEALTH');
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await this.getMetrics();
        res.status(200).json(metrics);
      } catch (error) {
        logger.error(`Error in /metrics endpoint: ${error}`, 'HEALTH');
        res.status(500).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        service: 'Copilot-Consciousness Arbitrage Bot',
        version: '3.0.0',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
        },
      });
    });
  }

  /**
   * Get health status
   */
  private async getHealthStatus(): Promise<HealthCheckResponse> {
    const components: HealthCheckResponse['components'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check provider
    if (this.components?.provider) {
      try {
        await this.components.provider.getBlockNumber();
        components.provider = { status: 'healthy' };
      } catch (error) {
        components.provider = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : String(error),
        };
        overallStatus = 'unhealthy';
      }
    } else {
      components.provider = { status: 'unhealthy', message: 'Not initialized' };
      overallStatus = 'unhealthy';
    }

    // Check wallet
    if (this.components?.wallet) {
      try {
        const balance = await this.components.wallet.getBalance();
        if (balance.eq(0)) {
          components.wallet = { status: 'degraded', message: 'Zero balance' };
          if (overallStatus === 'healthy') overallStatus = 'degraded';
        } else {
          components.wallet = { status: 'healthy' };
        }
      } catch (error) {
        components.wallet = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : String(error),
        };
        overallStatus = 'unhealthy';
      }
    } else {
      components.wallet = { status: 'unhealthy', message: 'Not initialized' };
      overallStatus = 'unhealthy';
    }

    // Check gas oracle
    if (this.components?.gasOracle) {
      try {
        const gasPriceData = await this.components.gasOracle.getCurrentGasPrice('fast');
        components.gasOracle = { status: 'healthy' };
      } catch (error) {
        components.gasOracle = {
          status: 'degraded',
          message: error instanceof Error ? error.message : String(error),
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }
    }

    // Check orchestrators
    if (this.components?.advancedOrchestrator) {
      components.advancedOrchestrator = { status: 'healthy' };
    }

    if (this.components?.integratedOrchestrator) {
      components.integratedOrchestrator = { status: 'healthy' };
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      components,
    };
  }

  /**
   * Get performance metrics
   */
  private async getMetrics(): Promise<MetricsResponse> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const freeMem = totalMem - usedMem;

    let blockNumber: number | undefined;
    let gasPrice: string | undefined;

    // Get network metrics
    if (this.components?.provider) {
      try {
        blockNumber = await this.components.provider.getBlockNumber();
      } catch (error) {
        // Ignore errors
      }
    }

    if (this.components?.gasOracle) {
      try {
        const gasPriceData = await this.components.gasOracle.getCurrentGasPrice('fast');
        gasPrice = `${Number(gasPriceData.maxFeePerGas / BigInt(1e9))} gwei`;
      } catch (error) {
        // Ignore errors
      }
    }

    // Calculate success rate
    const successRate =
      this.stats.tradesExecuted > 0
        ? (this.stats.tradesExecuted / (this.stats.tradesExecuted + 0)) * 100
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      system: {
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentUsed: (usedMem / totalMem) * 100,
        },
        cpu: {
          loadAverage: [0, 0, 0], // Not available in Node.js on all platforms
        },
      },
      arbitrage: {
        cyclesCompleted: this.stats.cyclesCompleted,
        opportunitiesFound: this.stats.opportunitiesFound,
        tradesExecuted: this.stats.tradesExecuted,
        totalProfit: this.stats.totalProfit.toString(),
        successRate,
      },
      network: {
        blockNumber,
        gasPrice,
      },
    };
  }

  /**
   * Set initialized components for health checks
   */
  setComponents(components: InitializedComponents): void {
    this.components = components;
  }

  /**
   * Update statistics
   */
  updateStats(stats: Partial<typeof this.stats>): void {
    this.stats = { ...this.stats, ...stats };
  }

  /**
   * Start the health check server
   */
  start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Health check server is disabled', 'HEALTH');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          logger.info(`Health check server listening on port ${this.config.port}`, 'HEALTH');
          logger.info(`  - Health endpoint: http://localhost:${this.config.port}/health`, 'HEALTH');
          logger.info(`  - Metrics endpoint: http://localhost:${this.config.port}/metrics`, 'HEALTH');
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error(`Health check server error: ${error}`, 'HEALTH');
          reject(error);
        });
      } catch (error) {
        logger.error(`Failed to start health check server: ${error}`, 'HEALTH');
        reject(error);
      }
    });
  }

  /**
   * Stop the health check server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          logger.error(`Error stopping health check server: ${error}`, 'HEALTH');
          reject(error);
        } else {
          logger.info('Health check server stopped', 'HEALTH');
          resolve();
        }
      });
    });
  }
}
