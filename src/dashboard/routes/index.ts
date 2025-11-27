/**
 * REST API Routes for the Dashboard
 *
 * Provides HTTP endpoints for metrics, trades, alerts, and configuration
 */

import { Router, Request, Response } from 'express';
import { MetricsAggregator } from '../services/MetricsAggregator';
import { AlertSystem } from '../services/AlertSystem';
import { TimeSeriesDB } from '../services/TimeSeriesDB';
import { WebSocketHandler } from '../websocket/WebSocketHandler';

export function createRoutes(
  metricsAggregator: MetricsAggregator,
  alertSystem: AlertSystem,
  timeSeriesDB: TimeSeriesDB,
  wsHandler: WebSocketHandler
): Router {
  const router = Router();

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      connections: wsHandler.getConnectedClientsCount(),
    });
  });

  /**
   * GET /api/metrics
   * Get current aggregated metrics
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await metricsAggregator.getCurrentMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
      });
    }
  });

  /**
   * GET /api/metrics/history
   * Get historical metrics
   */
  router.get('/metrics/history', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = metricsAggregator.getMetricsHistory(limit);

      res.json({
        success: true,
        data: history,
        count: history.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching metrics history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics history',
      });
    }
  });

  /**
   * GET /api/chart-data
   * Get chart data for visualizations
   */
  router.get('/chart-data', (req: Request, res: Response) => {
    try {
      const timeRange =
        req.query.start && req.query.end
          ? {
              start: parseInt(req.query.start as string),
              end: parseInt(req.query.end as string),
            }
          : undefined;

      const chartData = metricsAggregator.getChartData(timeRange);

      res.json({
        success: true,
        data: chartData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chart data',
      });
    }
  });

  /**
   * GET /api/trades/recent
   * Get recent trades from CrossChainAnalytics
   */
  router.get('/trades/recent', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const crossChainAnalytics = metricsAggregator.getCrossChainAnalytics();
      const trades = crossChainAnalytics.getRecentTrades(limit);

      res.json({
        success: true,
        data: trades,
        count: trades.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent trades',
      });
    }
  });

  /**
   * GET /api/gas/analytics
   * Get gas analytics data
   */
  router.get('/gas/analytics', (req: Request, res: Response) => {
    try {
      const gasAnalytics = metricsAggregator.getGasAnalytics();
      const metrics = gasAnalytics.getMetrics();
      const bestTimes = gasAnalytics.getBestExecutionTimes();
      const avgByHopCount = gasAnalytics.getAverageGasCostByHopCount();

      res.json({
        success: true,
        data: {
          metrics: {
            totalGasUsed: metrics.totalGasUsed.toString(),
            totalGasCost: metrics.totalGasCost.toString(),
            averageGasPerArbitrage: metrics.averageGasPerArbitrage.toString(),
            gasSavingsFromOptimizations: metrics.gasSavingsFromOptimizations.toString(),
            failedTransactionGasWasted: metrics.failedTransactionGasWasted.toString(),
            mostEfficientTimeOfDay: metrics.mostEfficientTimeOfDay,
            executionSuccessRate: metrics.executionSuccessRate,
          },
          bestExecutionTimes: bestTimes.map((t) => ({
            hour: t.hour,
            avgGasCost: t.avgGasCost.toString(),
          })),
          averageCostByHopCount: Array.from(avgByHopCount.entries()).map(([hops, cost]) => ({
            hops,
            cost: cost.toString(),
          })),
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching gas analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch gas analytics',
      });
    }
  });

  /**
   * GET /api/alerts
   * Get recent alerts
   */
  router.get('/alerts', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const alerts = alertSystem.getRecentAlerts(limit);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
      });
    }
  });

  /**
   * GET /api/alerts/stats
   * Get alert statistics
   */
  router.get('/alerts/stats', (req: Request, res: Response) => {
    try {
      const stats = alertSystem.getAlertStats();

      res.json({
        success: true,
        data: stats,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert stats',
      });
    }
  });

  /**
   * POST /api/alerts/test
   * Create a test alert
   */
  router.post('/alerts/test', (req: Request, res: Response) => {
    try {
      const alert = alertSystem.createAlert({
        type: 'info',
        title: 'Test Alert',
        message: 'This is a test alert from the API',
        metadata: { source: 'api', timestamp: Date.now() },
      });

      res.json({
        success: true,
        data: alert,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error creating test alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create test alert',
      });
    }
  });

  /**
   * GET /api/performance
   * Get system performance metrics
   */
  router.get('/performance', (req: Request, res: Response) => {
    try {
      const performance = wsHandler.getPerformanceMetrics();

      res.json({
        success: true,
        data: performance,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
      });
    }
  });

  /**
   * GET /api/cross-chain/summary
   * Get cross-chain analytics summary
   */
  router.get('/cross-chain/summary', (req: Request, res: Response) => {
    try {
      const crossChainAnalytics = metricsAggregator.getCrossChainAnalytics();
      const summary = crossChainAnalytics.getSummary();

      res.json({
        success: true,
        data: {
          totalTrades: summary.totalTrades,
          successfulTrades: summary.successfulTrades,
          failedTrades: summary.failedTrades,
          totalProfit: summary.totalProfit.toString(),
          totalLoss: summary.totalLoss.toString(),
          netProfit: summary.netProfit.toString(),
          successRate: summary.successRate,
          averageExecutionTime: summary.averageExecutionTime,
          averageBridgeTime: summary.averageBridgeTime,
          mostProfitableChainPair: summary.mostProfitableChainPair
            ? {
                chainA: summary.mostProfitableChainPair.chainA,
                chainB: summary.mostProfitableChainPair.chainB,
                totalTrades: summary.mostProfitableChainPair.totalTrades,
                successfulTrades: summary.mostProfitableChainPair.successfulTrades,
                totalProfit: summary.mostProfitableChainPair.totalProfit.toString(),
                averageProfit: summary.mostProfitableChainPair.averageProfit.toString(),
                averageBridgeTime: summary.mostProfitableChainPair.averageBridgeTime,
              }
            : null,
          bridgeStats: summary.bridgeStats.map((bs) => ({
            bridgeName: bs.bridgeName,
            totalUses: bs.totalUses,
            successfulBridges: bs.successfulBridges,
            failedBridges: bs.failedBridges,
            successRate: bs.successRate,
            averageTime: bs.averageTime,
            totalFeesSpent: bs.totalFeesSpent.toString(),
          })),
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching cross-chain summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cross-chain summary',
      });
    }
  });

  /**
   * GET /api/cross-chain/chain-pairs
   * Get all chain pair statistics
   */
  router.get('/cross-chain/chain-pairs', (req: Request, res: Response) => {
    try {
      const crossChainAnalytics = metricsAggregator.getCrossChainAnalytics();
      const chainPairs = crossChainAnalytics.getAllChainPairStats();

      res.json({
        success: true,
        data: chainPairs.map((cp) => ({
          chainA: cp.chainA,
          chainB: cp.chainB,
          totalTrades: cp.totalTrades,
          successfulTrades: cp.successfulTrades,
          totalProfit: cp.totalProfit.toString(),
          averageProfit: cp.averageProfit.toString(),
          averageBridgeTime: cp.averageBridgeTime,
        })),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching chain pair stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chain pair stats',
      });
    }
  });

  return router;
}
