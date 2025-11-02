/**
 * Dashboard Server Entry Point
 * 
 * Initializes and starts the Real-Time Analytics Dashboard
 */

import { GasAnalytics } from '../gas/GasAnalytics';
import { CrossChainAnalytics } from '../chains/CrossChainAnalytics';
import { DashboardServer } from './DashboardServer';
import { DashboardConfig } from './types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main function to start the dashboard server
 */
async function main(): Promise<void> {
  // Initialize analytics modules
  const gasAnalytics = new GasAnalytics();
  const crossChainAnalytics = new CrossChainAnalytics();

  // Configure dashboard
  const config: Partial<DashboardConfig> = {
    port: parseInt(process.env.DASHBOARD_PORT || '3000'),
    enableCors: true,
    updateInterval: parseInt(process.env.UPDATE_INTERVAL || '1000'),
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100'),
    
    // Alert configuration
    alerts: {
      profitThreshold: parseFloat(process.env.ALERT_PROFIT_THRESHOLD || '1.0'), // 1 ETH
      lossThreshold: parseFloat(process.env.ALERT_LOSS_THRESHOLD || '0.5'), // 0.5 ETH
      gasThreshold: parseFloat(process.env.ALERT_GAS_THRESHOLD || '0.1'), // 0.1 ETH
      successRateThreshold: parseFloat(process.env.ALERT_SUCCESS_RATE_THRESHOLD || '90'), // 90%
      
      channels: {
        websocket: true,
        email: {
          enabled: process.env.EMAIL_ENABLED === 'true',
          recipients: process.env.EMAIL_RECIPIENTS?.split(',') || []
        },
        telegram: process.env.TELEGRAM_BOT_TOKEN ? {
          enabled: true,
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          chatId: process.env.TELEGRAM_CHAT_ID || ''
        } : undefined,
        discord: process.env.DISCORD_WEBHOOK_URL ? {
          enabled: true,
          webhookUrl: process.env.DISCORD_WEBHOOK_URL
        } : undefined
      }
    }
  };

  // Add TimescaleDB configuration if available
  if (process.env.TIMESCALEDB_HOST) {
    config.timescaledb = {
      host: process.env.TIMESCALEDB_HOST,
      port: parseInt(process.env.TIMESCALEDB_PORT || '5432'),
      database: process.env.TIMESCALEDB_DATABASE || 'arbitrage_dashboard',
      user: process.env.TIMESCALEDB_USER || 'postgres',
      password: process.env.TIMESCALEDB_PASSWORD || ''
    };
  }

  // Add Redis configuration if available
  if (process.env.REDIS_HOST) {
    config.redis = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    };
  }

  // Create and start dashboard server
  const dashboardServer = new DashboardServer(
    gasAnalytics,
    crossChainAnalytics,
    config
  );

  try {
    await dashboardServer.start();
  } catch (error) {
    console.error('Failed to start dashboard server:', error);
    process.exit(1);
  }
}

// Run the server
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
