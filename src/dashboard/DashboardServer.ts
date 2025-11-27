/**
 * DashboardServer - Main server for the Real-Time Analytics Dashboard
 *
 * Integrates Express, Socket.IO, and all dashboard services
 * Provides REST API and WebSocket streaming for real-time data
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer } from 'http';
import path from 'path';
import fs from 'fs';
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
    // Check for built frontend files
    const frontendDistPath = path.resolve(__dirname, '../../../frontend/dist');
    const hasFrontendBuild = fs.existsSync(frontendDistPath);

    if (hasFrontendBuild) {
      // Serve static files from built frontend
      this.app.use(express.static(frontendDistPath));
    }

    // API routes - must come before the catch-all
    const apiRoutes = createRoutes(
      this.metricsAggregator,
      this.alertSystem,
      this.timeSeriesDB!,
      this.wsHandler
    );
    this.app.use('/api', apiRoutes);

    // Root endpoint - serve dashboard HTML or info page
    this.app.get('/', (req: Request, res: Response) => {
      // If frontend build exists and request accepts HTML, serve it
      if (hasFrontendBuild && req.accepts('html')) {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
        return;
      }

      // Otherwise, serve an informative HTML page
      const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TheWarden Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #e0e0e0;
      padding: 2rem;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { 
      font-size: 2.5rem; 
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status { 
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .status-badge {
      display: inline-block;
      background: #00d4ff;
      color: #1a1a2e;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .card h3 { color: #00d4ff; margin-bottom: 1rem; font-size: 1.1rem; }
    .endpoint { 
      display: flex; 
      justify-content: space-between; 
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .endpoint:last-child { border-bottom: none; }
    .endpoint a { color: #7b2cbf; text-decoration: none; }
    .endpoint a:hover { text-decoration: underline; }
    code {
      background: rgba(0,0,0,0.3);
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
    }
    .info-box {
      background: rgba(123, 44, 191, 0.1);
      border: 1px solid rgba(123, 44, 191, 0.3);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-top: 1rem;
    }
    .ws-status { color: #4ade80; }
    .metric { font-size: 1.5rem; font-weight: 600; color: #00d4ff; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛡️ TheWarden Dashboard</h1>
    <p style="margin-bottom: 2rem; opacity: 0.8;">AEV (Autonomous Extracted Value) - Real-Time Analytics</p>
    
    <div class="status">
      <span class="status-badge">● ONLINE</span>
      <span style="margin-left: 1rem;">System is running and monitoring for opportunities</span>
    </div>

    <div class="grid">
      <div class="card">
        <h3>📊 API Endpoints</h3>
        <div class="endpoint"><span>Health Check</span><a href="/api/health">/api/health</a></div>
        <div class="endpoint"><span>Metrics</span><a href="/api/metrics">/api/metrics</a></div>
        <div class="endpoint"><span>Performance</span><a href="/api/performance">/api/performance</a></div>
        <div class="endpoint"><span>Recent Trades</span><a href="/api/trades/recent">/api/trades/recent</a></div>
        <div class="endpoint"><span>Alerts</span><a href="/api/alerts">/api/alerts</a></div>
        <div class="endpoint"><span>Gas Analytics</span><a href="/api/gas/analytics">/api/gas/analytics</a></div>
        <div class="endpoint"><span>Cross-Chain</span><a href="/api/cross-chain/summary">/api/cross-chain/summary</a></div>
      </div>

      <div class="card">
        <h3>🔌 WebSocket Connection</h3>
        <p class="ws-status">● WebSocket Enabled</p>
        <p style="margin-top: 0.5rem;">Active Connections: <span class="metric">${this.wsHandler.getConnectedClientsCount()}</span></p>
        <div class="info-box">
          <p><strong>Connect via:</strong></p>
          <code>ws://localhost:${this.config.port}</code>
        </div>
      </div>

      <div class="card">
        <h3>⚡ Quick Stats</h3>
        <p>Update Interval: <span class="metric">${this.config.updateInterval}ms</span></p>
        <p style="margin-top: 0.5rem;">Max Connections: <span class="metric">${this.config.maxConnections}</span></p>
      </div>

      <div class="card">
        <h3>🚀 Full Dashboard</h3>
        <p>For the complete React dashboard with charts and real-time updates:</p>
        <div class="info-box">
          <p><strong>Option 1:</strong> Build the frontend</p>
          <code>cd frontend && npm install && npm run build</code>
          <p style="margin-top: 1rem;"><strong>Option 2:</strong> Run in development mode</p>
          <code>cd frontend && npm run dev</code>
          <p style="margin-top: 0.5rem; opacity: 0.7;">Then visit <a href="http://localhost:3001" style="color: #00d4ff;">http://localhost:3001</a></p>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h3 style="margin-bottom: 0.5rem;">📖 API Response Format</h3>
      <p>All API endpoints return JSON. Add <code>Accept: application/json</code> header for programmatic access.</p>
    </div>
  </div>
</body>
</html>`;

      res.type('html').send(htmlResponse);
    });
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
