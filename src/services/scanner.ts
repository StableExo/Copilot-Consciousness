/**
 * Scanner Service - Monitors DEXs for arbitrage opportunities
 * Publishes opportunities to RabbitMQ for processing
 */

import express from 'express';
import { createConnection, Channel, Connection } from 'amqplib';
import Redis from 'ioredis';

interface ScannerConfig {
  rabbitmqUrl: string;
  redisUrl: string;
  consulUrl: string;
  scanInterval: number;
  port: number;
}

class ScannerService {
  private app: express.Application;
  private config: ScannerConfig;
  private rabbitmqConnection?: Connection;
  private rabbitmqChannel?: Channel;
  private redis?: Redis;
  private isRunning = false;

  constructor(config: ScannerConfig) {
    this.app = express();
    this.config = config;
    this.setupExpress();
  }

  private setupExpress(): void {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'scanner',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json({
        service: 'scanner',
        opportunitiesFound: 0, // TODO: Implement counter
        scansPerformed: 0,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async start(): Promise<void> {
    console.log('[Scanner] Starting service...');

    // Connect to RabbitMQ with retry logic
    let retries = 5;
    while (retries > 0) {
      try {
        this.rabbitmqConnection = await createConnection(this.config.rabbitmqUrl);
        this.rabbitmqChannel = await this.rabbitmqConnection.createChannel();
        
        // Declare opportunity queue
        await this.rabbitmqChannel.assertQueue('opportunities', {
          durable: true,
          arguments: {
            'x-max-length': 100000,
            'x-dead-letter-exchange': 'dlx',
            'x-dead-letter-routing-key': 'opportunities.dead',
          },
        });

        console.log('[Scanner] Connected to RabbitMQ');
        break;
      } catch (error) {
        retries--;
        console.error(`[Scanner] Failed to connect to RabbitMQ (${retries} retries left):`, error);
        if (retries === 0) {
          console.error('[Scanner] Could not connect to RabbitMQ after multiple attempts. Exiting.');
          process.exit(1);
        }
        await this.sleep(5000);
      }
    }

    // Connect to Redis
    try {
      this.redis = new Redis(this.config.redisUrl);
      console.log('[Scanner] Connected to Redis');
    } catch (error) {
      console.error('[Scanner] Failed to connect to Redis:', error);
    }

    // Start scanning
    this.isRunning = true;
    this.scanLoop();

    // Start HTTP server
    this.app.listen(this.config.port, () => {
      console.log(`[Scanner] HTTP server listening on port ${this.config.port}`);
    });
  }

  private async scanLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.scanForOpportunities();
        await this.sleep(this.config.scanInterval);
      } catch (error) {
        console.error('[Scanner] Error in scan loop:', error);
        await this.sleep(5000);
      }
    }
  }

  private async scanForOpportunities(): Promise<void> {
    // TODO: Implement actual scanning logic
    // For now, this is a placeholder that would integrate with existing arbitrage detection
    console.log('[Scanner] Scanning for opportunities...');
    
    // Simulate finding an opportunity
    const opportunity = {
      id: `opp-${Date.now()}`,
      type: 'cross-dex',
      profit: Math.random() * 1000,
      timestamp: Date.now(),
      chains: ['ethereum', 'polygon'],
    };

    // Publish to RabbitMQ
    if (this.rabbitmqChannel) {
      this.rabbitmqChannel.sendToQueue(
        'opportunities',
        Buffer.from(JSON.stringify(opportunity)),
        { persistent: true }
      );
    }

    // Cache in Redis for deduplication
    if (this.redis) {
      await this.redis.setex(
        `opportunity:${opportunity.id}`,
        300,
        JSON.stringify(opportunity)
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    console.log('[Scanner] Stopping service...');
    this.isRunning = false;
    
    if (this.rabbitmqChannel) await this.rabbitmqChannel.close();
    if (this.rabbitmqConnection) await this.rabbitmqConnection.close();
    if (this.redis) await this.redis.quit();
  }
}

// Start service
const config: ScannerConfig = {
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  consulUrl: process.env.CONSUL_URL || 'http://localhost:8500',
  scanInterval: parseInt(process.env.SCAN_INTERVAL || '1000', 10),
  port: parseInt(process.env.PORT || '3001', 10),
};

const service = new ScannerService(config);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await service.stop();
  process.exit(0);
});

service.start().catch(console.error);
