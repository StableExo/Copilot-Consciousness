/**
 * Tests for LongRunningManager
 *
 * Tests the long-running process management utilities including:
 * - Statistics persistence
 * - Memory monitoring
 * - Heartbeat tracking
 * - Uptime tracking
 */

import { LongRunningManager } from '../LongRunningManager';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('LongRunningManager', () => {
  let manager: LongRunningManager;
  const testStatsPath = path.join(__dirname, '.test-stats.json');

  beforeEach(() => {
    // Clean up any existing test stats file
    if (fs.existsSync(testStatsPath)) {
      fs.unlinkSync(testStatsPath);
    }
  });

  afterEach(async () => {
    // Stop manager if running
    if (manager) {
      await manager.stop('test_cleanup');
    }

    // Clean up test stats file
    if (fs.existsSync(testStatsPath)) {
      fs.unlinkSync(testStatsPath);
    }
  });

  describe('initialization', () => {
    it('should create a new manager instance', () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      expect(manager).toBeDefined();
    });

    it('should start and generate a session ID', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      const stats = manager.getStats();
      expect(stats.sessionId).toBeDefined();
      expect(stats.sessionId).toMatch(/^warden-[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should track restart count across sessions', async () => {
      // First session
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();
      expect(manager.getStats().restartCount).toBe(1);
      await manager.stop('test');

      // Second session
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();
      expect(manager.getStats().restartCount).toBe(2);
    });
  });

  describe('heartbeat', () => {
    it('should record heartbeats', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
        heartbeat: {
          interval: 1000,
          timeout: 3000,
          maxMissedBeats: 3,
        },
      });

      await manager.start();

      // Record a heartbeat
      manager.heartbeat();

      expect(manager.isHealthy()).toBe(true);
    });

    it('should emit heartbeat event', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      const heartbeatPromise = new Promise<void>((resolve) => {
        manager.on('heartbeat', () => {
          resolve();
        });
      });

      manager.heartbeat();

      await heartbeatPromise;
    });
  });

  describe('stats tracking', () => {
    it('should update stats correctly', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      manager.updateStats({
        cyclesCompleted: 100,
        opportunitiesFound: 50,
        tradesExecuted: 5,
        totalProfit: BigInt(1000000000000000000), // 1 ETH
        errors: 2,
      });

      const stats = manager.getStats();
      expect(stats.cyclesCompleted).toBe(100);
      expect(stats.opportunitiesFound).toBe(50);
      expect(stats.tradesExecuted).toBe(5);
      expect(stats.totalProfit).toBe('1000000000000000000');
      expect(stats.errors).toBe(2);
    });

    it('should persist stats to disk', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 100, // Short interval for testing
        memoryCheckInterval: 60000,
      });

      await manager.start();

      // Wait for the persist event to ensure file is written
      const persistPromise = new Promise((resolve) => {
        manager.once('stats-persisted', resolve);
      });

      manager.updateStats({
        cyclesCompleted: 42,
      });

      // Wait for persist interval and the persist event
      await Promise.race([persistPromise, new Promise((resolve) => setTimeout(resolve, 300))]);

      // Small delay to ensure file write is complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify file exists
      expect(fs.existsSync(testStatsPath)).toBe(true);

      // Verify content
      const fileContent = fs.readFileSync(testStatsPath, 'utf-8');
      expect(fileContent.length).toBeGreaterThan(0); // Ensure file is not empty
      const content = JSON.parse(fileContent);
      expect(content.cyclesCompleted).toBe(42);
    });
  });

  describe('memory monitoring', () => {
    it('should track memory snapshots', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 100, // Short interval for testing
      });

      await manager.start();

      // Wait for a few memory checks
      await new Promise((resolve) => setTimeout(resolve, 350));

      const history = manager.getMemoryHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);

      // Verify snapshot structure
      const snapshot = history[0];
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('heapUsed');
      expect(snapshot).toHaveProperty('heapTotal');
      expect(snapshot).toHaveProperty('rss');
    });

    it('should track peak memory usage', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 100,
      });

      await manager.start();

      // Wait for memory check
      await new Promise((resolve) => setTimeout(resolve, 200));

      const stats = manager.getStats();
      expect(stats.peakMemoryUsage).toBeGreaterThan(0);
      expect(stats.memorySnapshots).toBeGreaterThanOrEqual(1);
    });
  });

  describe('uptime tracking', () => {
    it('should track session uptime', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const uptime = manager.getUptime();
      expect(uptime.sessionUptime).toBeGreaterThanOrEqual(100);
      expect(uptime.restartCount).toBe(1);
    });

    it('should accumulate total uptime across sessions', async () => {
      // First session
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await manager.stop('test');

      // Second session
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const uptime = manager.getUptime();
      expect(uptime.totalUptime).toBeGreaterThanOrEqual(200);
    });
  });

  describe('health status', () => {
    it('should update health status', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      manager.updateHealthStatus('healthy');

      const stats = manager.getStats();
      expect(stats.lastHealthStatus).toBe('healthy');
      expect(stats.consecutiveHealthyChecks).toBe(1);
    });

    it('should reset consecutive healthy checks on degraded status', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      manager.updateHealthStatus('healthy');
      manager.updateHealthStatus('healthy');
      expect(manager.getStats().consecutiveHealthyChecks).toBe(2);

      manager.updateHealthStatus('degraded');
      expect(manager.getStats().consecutiveHealthyChecks).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should persist stats on shutdown', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      manager.updateStats({
        cyclesCompleted: 999,
      });

      await manager.stop('test_shutdown');

      // Verify final stats were persisted
      expect(fs.existsSync(testStatsPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(testStatsPath, 'utf-8'));
      expect(content.cyclesCompleted).toBe(999);
      expect(content.lastRestartReason).toBe('test_shutdown');
    });

    it('should emit stopped event with uptime', async () => {
      manager = new LongRunningManager({
        statsFilePath: testStatsPath,
        persistInterval: 60000,
        memoryCheckInterval: 60000,
      });

      await manager.start();

      const stoppedPromise = new Promise<{ uptime: number; reason: string }>((resolve) => {
        manager.on('stopped', (data) => {
          resolve(data);
        });
      });

      await manager.stop('test_reason');

      const stoppedData = await stoppedPromise;
      expect(stoppedData.reason).toBe('test_reason');
      expect(stoppedData.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
