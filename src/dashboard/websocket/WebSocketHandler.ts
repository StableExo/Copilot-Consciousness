/**
 * WebSocketHandler - Manages WebSocket connections for real-time updates
 * 
 * Provides low-latency streaming of metrics, trades, and alerts
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { MetricsAggregator } from '../services/MetricsAggregator';
import { AlertSystem } from '../services/AlertSystem';
import { PerformanceMetrics } from '../types';

export class WebSocketHandler {
  private io: SocketIOServer;
  private metricsAggregator: MetricsAggregator;
  private alertSystem: AlertSystem;
  private updateInterval: number;
  private intervalId?: NodeJS.Timeout;
  private connectedClients: Set<string>;
  private performanceMetrics: PerformanceMetrics;

  constructor(
    httpServer: HttpServer,
    metricsAggregator: MetricsAggregator,
    alertSystem: AlertSystem,
    updateInterval: number = 1000
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*', // Configure in production: comma-separated list or '*'
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.metricsAggregator = metricsAggregator;
    this.alertSystem = alertSystem;
    this.updateInterval = updateInterval;
    this.connectedClients = new Set();
    this.performanceMetrics = this.initializePerformanceMetrics();

    this.setupEventHandlers();
    this.setupAlertListener();
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      systemUptime: process.uptime() * 1000,
      apiLatency: 0,
      wsLatency: 0,
      memoryUsed: process.memoryUsage().heapUsed,
      memoryTotal: process.memoryUsage().heapTotal,
      cpuUsage: 0,
      activeConnections: 0,
      requestsPerSecond: 0,
      errorsPerMinute: 0
    };
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      
      console.log(`Client connected: ${clientId}`);
      this.connectedClients.add(clientId);
      this.updatePerformanceMetrics();

      // Send initial data
      void this.sendMetricsUpdate(socket);
      this.sendPerformanceUpdate(socket);

      // Handle client requests
      socket.on('request:metrics', () => {
        void this.sendMetricsUpdate(socket);
      });

      socket.on('request:chart-data', (data: { timeRange?: { start: number; end: number } }) => {
        const chartData = this.metricsAggregator.getChartData(data.timeRange);
        socket.emit('chart-data', chartData);
      });

      socket.on('request:recent-alerts', (data: { limit?: number }) => {
        const alerts = this.alertSystem.getRecentAlerts(data.limit || 50);
        socket.emit('alerts', alerts);
      });

      socket.on('request:performance', () => {
        this.sendPerformanceUpdate(socket);
      });

      // Ping/pong for latency measurement
      socket.on('ping', (timestamp: number) => {
        const latency = Date.now() - timestamp;
        this.performanceMetrics.wsLatency = latency;
        socket.emit('pong', { timestamp, latency });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.connectedClients.delete(clientId);
        this.updatePerformanceMetrics();
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.performanceMetrics.errorsPerMinute++;
      });
    });
  }

  /**
   * Setup alert listener
   */
  private setupAlertListener(): void {
    this.alertSystem.on('alert', (alert) => {
      this.broadcast('alert', alert);
    });
  }

  /**
   * Start broadcasting updates
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    console.log(`Starting WebSocket updates (interval: ${this.updateInterval}ms)`);
    
    this.intervalId = setInterval(async () => {
      await this.broadcastMetrics();
      this.broadcastPerformance();
    }, this.updateInterval);
  }

  /**
   * Stop broadcasting updates
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('Stopped WebSocket updates');
    }
  }

  /**
   * Broadcast metrics to all connected clients
   */
  private async broadcastMetrics(): Promise<void> {
    const metrics = await this.metricsAggregator.getCurrentMetrics();
    
    // Check metrics against alert thresholds
    this.alertSystem.checkMetrics(metrics);
    
    this.broadcast('metrics', metrics);
  }

  /**
   * Broadcast performance metrics
   */
  private broadcastPerformance(): void {
    this.updatePerformanceMetrics();
    this.broadcast('performance', this.performanceMetrics);
  }

  /**
   * Send metrics update to specific socket
   */
  private async sendMetricsUpdate(socket: Socket): Promise<void> {
    const metrics = await this.metricsAggregator.getCurrentMetrics();
    socket.emit('metrics', metrics);
  }

  /**
   * Send performance update to specific socket
   */
  private sendPerformanceUpdate(socket: Socket): void {
    this.updatePerformanceMetrics();
    socket.emit('performance', this.performanceMetrics);
  }

  /**
   * Broadcast event to all connected clients
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcast(eventType: string, data: any): void {
    this.io.emit(eventType, data);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.performanceMetrics = {
      systemUptime: process.uptime() * 1000,
      apiLatency: this.performanceMetrics.apiLatency, // Updated by API routes
      wsLatency: this.performanceMetrics.wsLatency,
      memoryUsed: memUsage.heapUsed,
      memoryTotal: memUsage.heapTotal,
      cpuUsage: process.cpuUsage().system / 1000, // Convert to ms
      activeConnections: this.connectedClients.size,
      requestsPerSecond: this.performanceMetrics.requestsPerSecond, // Updated by API middleware
      errorsPerMinute: this.performanceMetrics.errorsPerMinute
    };
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.updatePerformanceMetrics();
    return this.performanceMetrics;
  }

  /**
   * Update API latency (called by API middleware)
   */
  updateApiLatency(latency: number): void {
    this.performanceMetrics.apiLatency = latency;
  }

  /**
   * Update request rate (called by API middleware)
   */
  updateRequestRate(rps: number): void {
    this.performanceMetrics.requestsPerSecond = rps;
  }

  /**
   * Shutdown WebSocket server
   */
  async shutdown(): Promise<void> {
    this.stop();
    
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}
