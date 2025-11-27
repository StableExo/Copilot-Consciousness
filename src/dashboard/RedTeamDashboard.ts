/**
 * RedTeamDashboard - Real-time Decision & Ethics Transparency Feed
 *
 * Provides a read-only WebSocket feed exposing every decision made by TheWarden
 * along with full ethics reasoning chains. Built for red-team analysis and
 * transparency auditing.
 *
 * Features:
 * - Real-time decision stream with ethics reasoning
 * - Historical decision audit log
 * - Ethics coherence metrics
 * - Swarm voting visualization
 * - Read-only mode for security
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer, createServer } from 'http';
import express, { Express, Request, Response, NextFunction } from 'express';

/**
 * Decision record with full reasoning chain
 */
export interface DecisionRecord {
  id: string;
  timestamp: number;
  type: 'mev' | 'ethics' | 'swarm' | 'strategy' | 'emergency';
  action: string;
  outcome: 'approved' | 'rejected' | 'pending' | 'executed' | 'failed';
  confidence: number;
  reasoning: ReasoningChain;
  ethicsEvaluation?: EthicsEvaluation;
  swarmVotes?: SwarmVote[];
  metadata: Record<string, unknown>;
}

/**
 * Ethics evaluation details
 */
export interface EthicsEvaluation {
  coherent: boolean;
  confidence: number;
  categories: number[];
  principles: string[];
  reasoning: string[];
  violation?: {
    principle: string;
    category: number;
    description: string;
  };
}

/**
 * Reasoning chain
 */
export interface ReasoningChain {
  steps: ReasoningStep[];
  finalConclusion: string;
  totalDurationMs: number;
}

/**
 * Single reasoning step
 */
export interface ReasoningStep {
  order: number;
  module: string;
  input: string;
  output: string;
  confidence: number;
  durationMs: number;
}

/**
 * Swarm vote from parallel Warden instances
 */
export interface SwarmVote {
  instanceId: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning: string;
  timestamp: number;
}

/**
 * Dashboard metrics
 */
export interface DashboardMetrics {
  totalDecisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  averageConfidence: number;
  ethicsCoherence: number;
  decisionsPerMinute: number;
  swarmConsensusRate: number;
  activeConnections: number;
}

/**
 * Dashboard configuration
 */
export interface RedTeamDashboardConfig {
  port?: number;
  corsOrigin?: string;
  maxHistorySize?: number;
  metricsWindowMs?: number;
  enableAuth?: boolean;
  authToken?: string;
}

/**
 * Red Team Dashboard Server
 */
export class RedTeamDashboard {
  private app: Express;
  private httpServer: HttpServer;
  private io: SocketIOServer;
  private config: Required<RedTeamDashboardConfig>;
  private decisionHistory: DecisionRecord[] = [];
  private connectedClients: Set<string> = new Set();
  private metrics: DashboardMetrics;
  private metricsWindow: DecisionRecord[] = [];
  private started: boolean = false;

  constructor(config: RedTeamDashboardConfig = {}) {
    this.config = {
      port: config.port || 3001,
      corsOrigin: config.corsOrigin || '*',
      maxHistorySize: config.maxHistorySize || 10000,
      metricsWindowMs: config.metricsWindowMs || 60000,
      enableAuth: config.enableAuth ?? false,
      authToken: config.authToken || '',
    };

    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: this.config.corsOrigin,
        methods: ['GET'],
      },
    });

    this.metrics = this.initializeMetrics();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): DashboardMetrics {
    return {
      totalDecisions: 0,
      approvedDecisions: 0,
      rejectedDecisions: 0,
      averageConfidence: 0,
      ethicsCoherence: 1.0,
      decisionsPerMinute: 0,
      swarmConsensusRate: 1.0,
      activeConnections: 0,
    };
  }

  /**
   * Setup Express routes (read-only)
   */
  private setupRoutes(): void {
    // CORS middleware
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', this.config.corsOrigin);
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Auth middleware (optional)
    if (this.config.enableAuth) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token !== this.config.authToken) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        next();
      });
    }

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'healthy', mode: 'read-only' });
    });

    // Get current metrics
    this.app.get('/api/metrics', (_req: Request, res: Response) => {
      res.json(this.getMetrics());
    });

    // Get decision history
    this.app.get('/api/decisions', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;

      let filtered = this.decisionHistory;
      if (type) {
        filtered = filtered.filter((d) => d.type === type);
      }

      const paginated = filtered.slice(offset, offset + limit);
      res.json({
        decisions: paginated,
        total: filtered.length,
        limit,
        offset,
      });
    });

    // Get specific decision
    this.app.get('/api/decisions/:id', (req: Request, res: Response) => {
      const decision = this.decisionHistory.find((d) => d.id === req.params.id);
      if (!decision) {
        res.status(404).json({ error: 'Decision not found' });
        return;
      }
      res.json(decision);
    });

    // Get ethics summary
    this.app.get('/api/ethics', (_req: Request, res: Response) => {
      const ethicsDecisions = this.decisionHistory.filter((d) => d.ethicsEvaluation);
      const coherent = ethicsDecisions.filter((d) => d.ethicsEvaluation?.coherent).length;
      
      res.json({
        totalEthicsEvaluations: ethicsDecisions.length,
        coherentDecisions: coherent,
        incoherentDecisions: ethicsDecisions.length - coherent,
        coherenceRate: ethicsDecisions.length > 0 ? coherent / ethicsDecisions.length : 1,
        recentViolations: ethicsDecisions
          .filter((d) => d.ethicsEvaluation?.violation)
          .slice(-10)
          .map((d) => ({
            id: d.id,
            timestamp: d.timestamp,
            violation: d.ethicsEvaluation?.violation,
          })),
      });
    });

    // Get swarm voting summary
    this.app.get('/api/swarm', (_req: Request, res: Response) => {
      const swarmDecisions = this.decisionHistory.filter((d) => d.swarmVotes && d.swarmVotes.length > 0);
      
      res.json({
        totalSwarmDecisions: swarmDecisions.length,
        averageParticipation: swarmDecisions.reduce((sum, d) => sum + (d.swarmVotes?.length || 0), 0) / 
          (swarmDecisions.length || 1),
        consensusRate: this.calculateSwarmConsensusRate(),
        recentVotes: swarmDecisions.slice(-10).map((d) => ({
          id: d.id,
          timestamp: d.timestamp,
          votes: d.swarmVotes,
        })),
      });
    });
  }

  /**
   * Setup WebSocket handlers
   */
  private setupWebSocket(): void {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      this.connectedClients.add(clientId);
      this.updateActiveConnections();

      console.log(`[RedTeamDashboard] Client connected: ${clientId}`);

      // Send initial state
      socket.emit('init', {
        metrics: this.getMetrics(),
        recentDecisions: this.decisionHistory.slice(-50),
      });

      // Handle subscription requests
      socket.on('subscribe', (channel: string) => {
        socket.join(channel);
        console.log(`[RedTeamDashboard] Client ${clientId} subscribed to: ${channel}`);
      });

      socket.on('unsubscribe', (channel: string) => {
        socket.leave(channel);
      });

      // Request historical data
      socket.on('request:history', (params: { limit?: number; offset?: number; type?: string }) => {
        let filtered = this.decisionHistory;
        if (params.type) {
          filtered = filtered.filter((d) => d.type === params.type);
        }
        const paginated = filtered.slice(params.offset || 0, (params.offset || 0) + (params.limit || 100));
        socket.emit('history', { decisions: paginated, total: filtered.length });
      });

      // Request metrics
      socket.on('request:metrics', () => {
        socket.emit('metrics', this.getMetrics());
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        this.updateActiveConnections();
        console.log(`[RedTeamDashboard] Client disconnected: ${clientId}`);
      });
    });
  }

  /**
   * Update active connections metric
   */
  private updateActiveConnections(): void {
    this.metrics.activeConnections = this.connectedClients.size;
  }

  /**
   * Record a new decision
   */
  recordDecision(decision: DecisionRecord): void {
    // Add to history
    this.decisionHistory.push(decision);

    // Trim history if needed
    if (this.decisionHistory.length > this.config.maxHistorySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.config.maxHistorySize);
    }

    // Update metrics window
    const now = Date.now();
    this.metricsWindow = this.metricsWindow.filter(
      (d) => now - d.timestamp < this.config.metricsWindowMs
    );
    this.metricsWindow.push(decision);

    // Update metrics
    this.updateMetrics(decision);

    // Broadcast to all connected clients
    this.broadcast('decision', decision);

    // Broadcast to specific channels
    this.io.to(decision.type).emit('decision', decision);
    
    if (decision.ethicsEvaluation) {
      this.io.to('ethics').emit('ethics-evaluation', {
        decisionId: decision.id,
        evaluation: decision.ethicsEvaluation,
      });
    }

    if (decision.swarmVotes) {
      this.io.to('swarm').emit('swarm-vote', {
        decisionId: decision.id,
        votes: decision.swarmVotes,
      });
    }
  }

  /**
   * Update metrics based on new decision
   */
  private updateMetrics(decision: DecisionRecord): void {
    this.metrics.totalDecisions++;

    if (decision.outcome === 'approved' || decision.outcome === 'executed') {
      this.metrics.approvedDecisions++;
    } else if (decision.outcome === 'rejected') {
      this.metrics.rejectedDecisions++;
    }

    // Update average confidence
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (this.metrics.totalDecisions - 1) + decision.confidence) /
      this.metrics.totalDecisions;

    // Update ethics coherence
    if (decision.ethicsEvaluation) {
      const coherentCount = this.decisionHistory.filter(
        (d) => d.ethicsEvaluation?.coherent
      ).length;
      const totalEthics = this.decisionHistory.filter((d) => d.ethicsEvaluation).length;
      this.metrics.ethicsCoherence = totalEthics > 0 ? coherentCount / totalEthics : 1.0;
    }

    // Update decisions per minute
    this.metrics.decisionsPerMinute = this.metricsWindow.length;

    // Update swarm consensus rate
    this.metrics.swarmConsensusRate = this.calculateSwarmConsensusRate();
  }

  /**
   * Calculate swarm consensus rate
   */
  private calculateSwarmConsensusRate(): number {
    const swarmDecisions = this.decisionHistory.filter(
      (d) => d.swarmVotes && d.swarmVotes.length > 1
    );

    if (swarmDecisions.length === 0) return 1.0;

    let consensusCount = 0;
    for (const decision of swarmDecisions) {
      const votes = decision.swarmVotes!;
      const approves = votes.filter((v) => v.vote === 'approve').length;
      const rejects = votes.filter((v) => v.vote === 'reject').length;
      const majority = Math.max(approves, rejects);
      const consensus = majority / votes.length;
      if (consensus >= 0.7) consensusCount++;
    }

    return consensusCount / swarmDecisions.length;
  }

  /**
   * Get current metrics
   */
  getMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }

  /**
   * Broadcast event to all clients
   */
  broadcast(event: string, data: unknown): void {
    this.io.emit(event, data);
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    if (this.started) return;

    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        this.started = true;
        console.log(`[RedTeamDashboard] Read-only dashboard running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    if (!this.started) return;

    return new Promise((resolve) => {
      this.io.close();
      this.httpServer.close(() => {
        this.started = false;
        console.log('[RedTeamDashboard] Dashboard stopped');
        resolve();
      });
    });
  }

  /**
   * Get the Express app (for testing)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get decision count
   */
  getDecisionCount(): number {
    return this.decisionHistory.length;
  }

  /**
   * Check if started
   */
  isStarted(): boolean {
    return this.started;
  }
}
