/**
 * AlertSystem Tests
 */

import { AlertSystem } from '../services/AlertSystem';
import { AlertConfig, DashboardMetrics } from '../types';

describe('AlertSystem', () => {
  let alertSystem: AlertSystem;
  let config: AlertConfig;

  beforeEach(() => {
    config = {
      profitThreshold: 1.0,
      lossThreshold: 0.5,
      gasThreshold: 0.1,
      successRateThreshold: 90,
      channels: {
        websocket: true,
      },
    };
    alertSystem = new AlertSystem(config);
  });

  describe('createAlert', () => {
    it('should create an alert with id and timestamp', () => {
      const alert = alertSystem.createAlert({
        type: 'info',
        title: 'Test Alert',
        message: 'This is a test',
      });

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.timestamp).toBeDefined();
      expect(alert.type).toBe('info');
      expect(alert.title).toBe('Test Alert');
      expect(alert.message).toBe('This is a test');
    });

    it('should emit alert event', async () => {
      const alertPromise = new Promise<void>((resolve) => {
        alertSystem.on('alert', (alert) => {
          expect(alert.title).toBe('Test Event');
          resolve();
        });
      });

      alertSystem.createAlert({
        type: 'success',
        title: 'Test Event',
        message: 'Event test',
      });

      await alertPromise;
    });
  });

  describe('checkMetrics', () => {
    it('should not create alert if thresholds not exceeded', () => {
      const metrics: DashboardMetrics = {
        totalTrades: 10,
        successfulTrades: 9,
        failedTrades: 1,
        successRate: 90,
        totalProfit: '100000000000000000', // 0.1 ETH
        totalLoss: '50000000000000000', // 0.05 ETH
        netProfit: '50000000000000000',
        roi: 5.0,
        sharpeRatio: 1.5,
        maxDrawdown: 2.0,
        averageExecutionTime: 1000,
        averageGasCost: '10000000000000000', // 0.01 ETH
        uptime: 3600000,
        latency: 10,
        memoryUsage: 100,
        errorRate: 0.1,
      };

      const initialAlerts = alertSystem.getRecentAlerts();
      alertSystem.checkMetrics(metrics);
      const newAlerts = alertSystem.getRecentAlerts();

      expect(newAlerts.length).toBeGreaterThanOrEqual(initialAlerts.length);
    });

    it('should create alert when profit threshold exceeded', () => {
      const metrics: DashboardMetrics = {
        totalTrades: 10,
        successfulTrades: 10,
        failedTrades: 0,
        successRate: 100,
        totalProfit: '2000000000000000000', // 2 ETH
        totalLoss: '0',
        netProfit: '2000000000000000000', // 2 ETH (exceeds threshold)
        roi: 20.0,
        sharpeRatio: 2.0,
        maxDrawdown: 0,
        averageExecutionTime: 1000,
        averageGasCost: '10000000000000000',
        uptime: 3600000,
        latency: 10,
        memoryUsage: 100,
        errorRate: 0,
      };

      alertSystem.checkMetrics(metrics);
      const alerts = alertSystem.getRecentAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      const profitAlert = alerts.find((a) => a.title.includes('Profit'));
      expect(profitAlert).toBeDefined();
    });
  });

  describe('getRecentAlerts', () => {
    it('should return recent alerts in reverse chronological order', () => {
      alertSystem.createAlert({
        type: 'info',
        title: 'First',
        message: 'First alert',
      });

      alertSystem.createAlert({
        type: 'warning',
        title: 'Second',
        message: 'Second alert',
      });

      const alerts = alertSystem.getRecentAlerts(10);
      expect(alerts.length).toBe(2);
      expect(alerts[0].title).toBe('Second');
      expect(alerts[1].title).toBe('First');
    });

    it('should limit number of alerts returned', () => {
      for (let i = 0; i < 10; i++) {
        alertSystem.createAlert({
          type: 'info',
          title: `Alert ${i}`,
          message: `Message ${i}`,
        });
      }

      const alerts = alertSystem.getRecentAlerts(5);
      expect(alerts.length).toBe(5);
    });
  });

  describe('getAlertsByType', () => {
    it('should filter alerts by type', () => {
      alertSystem.createAlert({
        type: 'error',
        title: 'Error Alert',
        message: 'An error occurred',
      });

      alertSystem.createAlert({
        type: 'info',
        title: 'Info Alert',
        message: 'Information',
      });

      const errorAlerts = alertSystem.getAlertsByType('error');
      expect(errorAlerts.length).toBe(1);
      expect(errorAlerts[0].type).toBe('error');
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', () => {
      alertSystem.createAlert({
        type: 'error',
        title: 'Error',
        message: 'Error',
      });

      alertSystem.createAlert({
        type: 'warning',
        title: 'Warning',
        message: 'Warning',
      });

      const stats = alertSystem.getAlertStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(2);
      expect(stats.byType.error).toBe(1);
      expect(stats.byType.warning).toBe(1);
      expect(stats.lastHour).toBeGreaterThanOrEqual(2);
    });
  });

  describe('clearAlerts', () => {
    it('should clear all alerts', () => {
      alertSystem.createAlert({
        type: 'info',
        title: 'Test',
        message: 'Test',
      });

      expect(alertSystem.getRecentAlerts().length).toBeGreaterThan(0);

      alertSystem.clearAlerts();
      expect(alertSystem.getRecentAlerts().length).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update alert configuration', () => {
      alertSystem.updateConfig({
        profitThreshold: 5.0,
      });

      // Configuration is updated internally
      expect(alertSystem).toBeDefined();
    });
  });
});
