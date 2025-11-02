/**
 * Pathfinding Service - Finds optimal arbitrage paths
 * Consumes opportunities from RabbitMQ, finds paths, publishes to execution queue
 */

import express from 'express';
import { createConnection, Channel, Connection, ConsumeMessage } from 'amqplib';
import Redis from 'ioredis';

interface PathfindingConfig {
  rabbitmqUrl: string;
  redisUrl: string;
  consulUrl: string;
  port: number;
  concurrency: number;
}

class PathfindingService {
  private app: express.Application;
  private config: PathfindingConfig;
  private rabbitmqConnection?: Connection;
  private rabbitmqChannel?: Channel;
  private redis?: Redis;
  private isRunning = false;
  private pathsProcessed = 0;

  constructor(config: PathfindingConfig) {
    this.app = express();
    this.config = config;
    this.setupExpress();
  }

  private setupExpress(): void {
    this.app.use(express.json());

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'pathfinding',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get('/metrics', (req, res) => {
      res.json({
        service: 'pathfinding',
        pathsProcessed: this.pathsProcessed,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async start(): Promise<void> {
    console.log('[Pathfinding] Starting service...');

    // Connect to RabbitMQ
    try {
      this.rabbitmqConnection = await createConnection(this.config.rabbitmqUrl);
      this.rabbitmqChannel = await this.rabbitmqConnection.createChannel();
      
      await this.rabbitmqChannel.assertQueue('opportunities', { durable: true });
      await this.rabbitmqChannel.assertQueue('paths', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'dlx',
          'x-dead-letter-routing-key': 'paths.dead',
        },
      });

      // Set prefetch for load distribution
      await this.rabbitmqChannel.prefetch(this.config.concurrency);

      // Start consuming
      await this.rabbitmqChannel.consume('opportunities', this.handleOpportunity.bind(this));

      console.log('[Pathfinding] Connected to RabbitMQ and consuming messages');
    } catch (error) {
      console.error('[Pathfinding] Failed to connect to RabbitMQ:', error);
    }

    // Connect to Redis
    try {
      this.redis = new Redis(this.config.redisUrl);
      console.log('[Pathfinding] Connected to Redis');
    } catch (error) {
      console.error('[Pathfinding] Failed to connect to Redis:', error);
    }

    this.isRunning = true;

    // Start HTTP server
    this.app.listen(this.config.port, () => {
      console.log(`[Pathfinding] HTTP server listening on port ${this.config.port}`);
    });
  }

  private async handleOpportunity(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.rabbitmqChannel) return;

    try {
      const opportunity = JSON.parse(msg.content.toString());
      console.log('[Pathfinding] Processing opportunity:', opportunity.id);

      // Find optimal paths
      const paths = await this.findPaths(opportunity);

      // Publish paths to execution queue
      for (const path of paths) {
        this.rabbitmqChannel.sendToQueue(
          'paths',
          Buffer.from(JSON.stringify(path)),
          { persistent: true }
        );
      }

      this.pathsProcessed++;
      this.rabbitmqChannel.ack(msg);
    } catch (error) {
      console.error('[Pathfinding] Error processing opportunity:', error);
      // Reject and requeue with limit
      if (this.rabbitmqChannel) {
        this.rabbitmqChannel.nack(msg, false, false);
      }
    }
  }

  private async findPaths(opportunity: any): Promise<any[]> {
    // TODO: Implement actual pathfinding logic using existing PathFinder
    console.log('[Pathfinding] Finding paths for opportunity:', opportunity.id);

    // Check Redis cache first
    if (this.redis) {
      const cached = await this.redis.get(`paths:${opportunity.id}`);
      if (cached) {
        console.log('[Pathfinding] Using cached paths');
        return JSON.parse(cached);
      }
    }

    // Simulate pathfinding
    const paths = [
      {
        opportunityId: opportunity.id,
        path: ['DEX1', 'DEX2'],
        estimatedProfit: opportunity.profit * 0.95,
        gasEstimate: 200000,
        timestamp: Date.now(),
      },
    ];

    // Cache the result
    if (this.redis) {
      await this.redis.setex(
        `paths:${opportunity.id}`,
        60,
        JSON.stringify(paths)
      );
    }

    return paths;
  }

  async stop(): Promise<void> {
    console.log('[Pathfinding] Stopping service...');
    this.isRunning = false;
    
    if (this.rabbitmqChannel) await this.rabbitmqChannel.close();
    if (this.rabbitmqConnection) await this.rabbitmqConnection.close();
    if (this.redis) await this.redis.quit();
  }
}

const config: PathfindingConfig = {
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  consulUrl: process.env.CONSUL_URL || 'http://localhost:8500',
  port: parseInt(process.env.PORT || '3002', 10),
  concurrency: parseInt(process.env.CONCURRENCY || '10', 10),
};

const service = new PathfindingService(config);

process.on('SIGTERM', async () => {
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await service.stop();
  process.exit(0);
});

service.start().catch(console.error);
