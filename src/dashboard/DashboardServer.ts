/**
 * DashboardServer - Main server for the Real-Time Analytics Dashboard
 *
 * Integrates Express, Socket.IO, and all dashboard services
 * Provides REST API and WebSocket streaming for real-time data
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer } from 'http';
import cors from 'cors';
import { GasAnalytics } from '../gas/GasAnalytics';
import { CrossChainAnalytics } from '../chains/CrossChainAnalytics';
import { MetricsAggregator } from './services/MetricsAggregator';
import { AlertSystem } from './services/AlertSystem';
import { TimeSeriesDB } from './services/TimeSeriesDB';
import { WebSocketHandler } from './websocket/WebSocketHandler';
import { createRoutes } from './routes';
import { DashboardConfig } from './types';

export class DashboardServer {
  private app: Express;
  private httpServer: HttpServer;
  private config: DashboardConfig;

  // Services
  private metricsAggregator: MetricsAggregator;
  private alertSystem: AlertSystem;
  private timeSeriesDB?: TimeSeriesDB;
  private wsHandler: WebSocketHandler;

  // Performance tracking
  private requestCount: number = 0;
  private lastRequestTime: number = Date.now();

  constructor(
    gasAnalytics: GasAnalytics,
    crossChainAnalytics: CrossChainAnalytics,
    config: Partial<DashboardConfig> = {}
  ) {
    // Initialize configuration with defaults
    this.config = {
      port: config.port || 3000,
      enableCors: config.enableCors !== undefined ? config.enableCors : true,
      updateInterval: config.updateInterval || 1000,
      maxConnections: config.maxConnections || 100,
      alerts: config.alerts || {
        channels: {
          websocket: true,
        },
      },
      ...config,
    };

    // Initialize Express app
    this.app = express();
    this.httpServer = createServer(this.app);

    // Initialize services
    this.metricsAggregator = new MetricsAggregator(gasAnalytics, crossChainAnalytics);
    this.alertSystem = new AlertSystem(this.config.alerts);

    if (this.config.timescaledb) {
      this.timeSeriesDB = new TimeSeriesDB(this.config.timescaledb);
    }

    this.wsHandler = new WebSocketHandler(
      this.httpServer,
      this.metricsAggregator,
      this.alertSystem,
      this.config.updateInterval
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS if configured
    // NOTE: For production, configure specific origins via DashboardConfig
    // Example: cors: { origin: ['https://dashboard.example.com', 'https://app.example.com'] }
    if (this.config.enableCors) {
      this.app.use(
        cors({
          origin: '*', // TODO: Configure specific origins in production via config.cors
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: ['Content-Type', 'Authorization'],
        })
      );
    }

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging and performance tracking
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Update performance metrics
        this.wsHandler.updateApiLatency(duration);

        // Track request rate
        this.requestCount++;
        const timeSinceLastUpdate = Date.now() - this.lastRequestTime;
        if (timeSinceLastUpdate >= 1000) {
          const rps = this.requestCount / (timeSinceLastUpdate / 1000);
          this.wsHandler.updateRequestRate(rps);
          this.requestCount = 0;
          this.lastRequestTime = Date.now();
        }

        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });

      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Arbitrage Bot Dashboard API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/api/health',
          metrics: '/api/metrics',
          chartData: '/api/chart-data',
          trades: '/api/trades/recent',
          alerts: '/api/alerts',
          performance: '/api/performance',
          crossChain: '/api/cross-chain/summary',
          gas: '/api/gas/analytics',
        },
        websocket: {
          enabled: true,
          activeConnections: this.wsHandler.getConnectedClientsCount(),
        },
      });
    });

    // API routes
    const apiRoutes = createRoutes(
      this.metricsAggregator,
      this.alertSystem,
      this.timeSeriesDB!,
      this.wsHandler
    );
    this.app.use('/api', apiRoutes);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        path: req.path,
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message,
      });
    });
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    try {
      // Initialize TimescaleDB if configured
      if (this.timeSeriesDB) {
        await this.timeSeriesDB.initialize();
      }

      // Start WebSocket handler
      this.wsHandler.start();

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.listen(this.config.port, () => {
          console.log('='.repeat(60));
          console.log('📊 Real-Time Analytics Dashboard Started');
          console.log('='.repeat(60));
          console.log(`🌐 HTTP Server: http://localhost:${this.config.port}`);
          console.log(`🔌 WebSocket: ws://localhost:${this.config.port}`);
          console.log(`📈 Update Interval: ${this.config.updateInterval}ms`);
          console.log(`👥 Max Connections: ${this.config.maxConnections}`);
          console.log('='.repeat(60));
          resolve();
        });
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start dashboard server:', error);
      throw error;
    }
  }

  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    console.log('Shutting down dashboard server...');

    // Stop WebSocket handler
    await this.wsHandler.shutdown();

    // Close TimescaleDB connection
    if (this.timeSeriesDB) {
      await this.timeSeriesDB.close();
    }

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });

    console.log('Dashboard server stopped successfully');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Get metrics aggregator
   */
  getMetricsAggregator(): MetricsAggregator {
    return this.metricsAggregator;
  }

  /**
   * Get alert system
   */
  getAlertSystem(): AlertSystem {
    return this.alertSystem;
  }

  /**
   * Get WebSocket handler
   */
  getWebSocketHandler(): WebSocketHandler {
    return this.wsHandler;
  }

  /**
   * Get TimeSeriesDB
   */
  getTimeSeriesDB(): TimeSeriesDB | undefined {
    return this.timeSeriesDB;
  }
}
