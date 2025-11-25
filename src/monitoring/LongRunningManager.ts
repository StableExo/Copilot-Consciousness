/**
 * LongRunningManager.ts - Long-running process management utilities
 * 
 * Provides robust support for long-running TheWarden operations:
 * - Statistics persistence (save/restore stats across restarts)
 * - Memory usage tracking and leak detection
 * - Heartbeat monitoring with watchdog timer
 * - Uptime tracking and reporting
 * - Graceful degradation under resource pressure
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Runtime statistics for TheWarden
 */
export interface WardenRuntimeStats {
  // Session info
  sessionId: string;
  startTime: number;
  lastUpdateTime: number;
  
  // Performance metrics
  cyclesCompleted: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalProfit: string; // Stored as string for BigInt serialization
  errors: number;
  
  // Uptime tracking
  totalUptimeMs: number;
  sessionUptimeMs: number;
  restartCount: number;
  lastRestartReason?: string;
  
  // Memory tracking
  peakMemoryUsage: number;
  avgMemoryUsage: number;
  memorySnapshots: number;
  
  // Health metrics
  consecutiveHealthyChecks: number;
  lastHealthCheckTime: number;
  lastHealthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Memory snapshot for leak detection
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Heartbeat configuration
 */
export interface HeartbeatConfig {
  interval: number;           // Heartbeat interval in ms (default: 30s)
  timeout: number;            // Timeout before considering process unhealthy (default: 90s)
  maxMissedBeats: number;     // Max missed heartbeats before alert (default: 3)
}

/**
 * Long-running manager configuration
 */
export interface LongRunningManagerConfig {
  // Persistence
  statsFilePath?: string;
  persistInterval: number;    // How often to persist stats (default: 60s)
  
  // Memory monitoring
  memoryCheckInterval: number;  // Memory check interval (default: 60s)
  memoryWarningThreshold: number; // Percentage of heap limit (default: 80%)
  memoryCriticalThreshold: number; // Percentage (default: 95%)
  memoryHistorySize: number;    // Number of snapshots to keep (default: 60)
  
  // Heartbeat
  heartbeat: HeartbeatConfig;
  
  // Logging
  logStatsInterval: number;   // Interval for logging stats (default: 300s = 5min)
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LongRunningManagerConfig = {
  statsFilePath: undefined, // Will use PROJECT_ROOT/logs/warden-stats.json
  persistInterval: 60000, // 1 minute
  memoryCheckInterval: 60000, // 1 minute
  memoryWarningThreshold: 80,
  memoryCriticalThreshold: 95,
  memoryHistorySize: 60, // 1 hour of history at 1-minute intervals
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 90000, // 90 seconds
    maxMissedBeats: 3,
  },
  logStatsInterval: 300000, // 5 minutes
};

/**
 * Long Running Manager
 * 
 * Manages long-running TheWarden processes with:
 * - Statistics persistence for recovery after restarts
 * - Memory monitoring and leak detection
 * - Heartbeat/watchdog monitoring
 * - Graceful resource management
 */
export class LongRunningManager extends EventEmitter {
  private config: LongRunningManagerConfig;
  private stats: WardenRuntimeStats;
  private memoryHistory: MemorySnapshot[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private isRunning: boolean = false;
  private lastHeartbeat: number = Date.now();
  private missedHeartbeats: number = 0;
  private statsFilePath: string;

  constructor(config?: Partial<LongRunningManagerConfig>) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (config?.heartbeat) {
      this.config.heartbeat = { ...DEFAULT_CONFIG.heartbeat, ...config.heartbeat };
    }
    
    // Determine stats file path
    this.statsFilePath = this.config.statsFilePath || 
      path.join(process.cwd(), 'logs', 'warden-stats.json');
    
    // Initialize stats (will be overwritten if loaded from disk)
    this.stats = this.createEmptyStats();
    
    logger.info('[LongRunningManager] Initialized');
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): WardenRuntimeStats {
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      cyclesCompleted: 0,
      opportunitiesFound: 0,
      tradesExecuted: 0,
      totalProfit: '0',
      errors: 0,
      totalUptimeMs: 0,
      sessionUptimeMs: 0,
      restartCount: 0,
      peakMemoryUsage: 0,
      avgMemoryUsage: 0,
      memorySnapshots: 0,
      consecutiveHealthyChecks: 0,
      lastHealthCheckTime: Date.now(),
      lastHealthStatus: 'healthy',
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `warden-${timestamp}-${random}`;
  }

  /**
   * Start the long-running manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[LongRunningManager] Already running');
      return;
    }

    logger.info('[LongRunningManager] Starting long-running process manager...');
    
    // Try to load persisted stats
    await this.loadStats();
    
    // Update session info
    this.stats.sessionId = this.generateSessionId();
    this.stats.startTime = Date.now();
    this.stats.restartCount++;
    
    this.isRunning = true;

    // Start memory monitoring
    const memoryInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.memoryCheckInterval);
    this.intervals.push(memoryInterval);

    // Start stats persistence
    const persistInterval = setInterval(() => {
      this.persistStats().catch(err => {
        logger.error(`[LongRunningManager] Failed to persist stats: ${err}`);
      });
    }, this.config.persistInterval);
    this.intervals.push(persistInterval);

    // Start heartbeat monitoring
    const heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, this.config.heartbeat.interval);
    this.intervals.push(heartbeatInterval);

    // Start stats logging
    const logInterval = setInterval(() => {
      this.logStats();
    }, this.config.logStatsInterval);
    this.intervals.push(logInterval);

    // Initial memory snapshot
    this.checkMemory();

    logger.info('[LongRunningManager] Long-running process manager started');
    logger.info(`[LongRunningManager] Session ID: ${this.stats.sessionId}`);
    logger.info(`[LongRunningManager] Total restarts: ${this.stats.restartCount}`);
    
    if (this.stats.totalUptimeMs > 0) {
      const totalUptimeHours = (this.stats.totalUptimeMs / 3600000).toFixed(2);
      logger.info(`[LongRunningManager] Total uptime (all sessions): ${totalUptimeHours} hours`);
    }

    this.emit('started', { sessionId: this.stats.sessionId });
  }

  /**
   * Stop the long-running manager
   */
  async stop(reason?: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('[LongRunningManager] Stopping long-running process manager...');
    
    this.isRunning = false;
    
    // Clear all intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];

    // Update final stats
    this.stats.sessionUptimeMs = Date.now() - this.stats.startTime;
    this.stats.totalUptimeMs += this.stats.sessionUptimeMs;
    this.stats.lastRestartReason = reason;
    this.stats.lastUpdateTime = Date.now();

    // Persist final stats
    await this.persistStats();

    logger.info('[LongRunningManager] Long-running process manager stopped');
    logger.info(`[LongRunningManager] Session uptime: ${(this.stats.sessionUptimeMs / 1000).toFixed(0)} seconds`);
    
    this.emit('stopped', { 
      sessionId: this.stats.sessionId,
      uptime: this.stats.sessionUptimeMs,
      reason 
    });
  }

  /**
   * Record a heartbeat
   */
  heartbeat(): void {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    this.emit('heartbeat', { timestamp: this.lastHeartbeat });
  }

  /**
   * Check heartbeat status
   */
  private checkHeartbeat(): void {
    const now = Date.now();
    const timeSinceLastBeat = now - this.lastHeartbeat;
    
    if (timeSinceLastBeat > this.config.heartbeat.timeout) {
      this.missedHeartbeats++;
      
      logger.warn(`[LongRunningManager] Heartbeat timeout! ${timeSinceLastBeat}ms since last beat (missed: ${this.missedHeartbeats})`);
      
      this.emit('heartbeat-timeout', {
        timeSinceLastBeat,
        missedBeats: this.missedHeartbeats,
      });
      
      if (this.missedHeartbeats >= this.config.heartbeat.maxMissedBeats) {
        logger.error('[LongRunningManager] Too many missed heartbeats! Process may be unresponsive.');
        this.emit('heartbeat-critical', {
          missedBeats: this.missedHeartbeats,
        });
      }
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    
    // Create snapshot
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
    
    this.memoryHistory.push(snapshot);
    
    // Trim history
    while (this.memoryHistory.length > this.config.memoryHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Update stats
    this.stats.memorySnapshots++;
    if (memUsage.heapUsed > this.stats.peakMemoryUsage) {
      this.stats.peakMemoryUsage = memUsage.heapUsed;
    }
    
    // Calculate average
    const totalHeapUsed = this.memoryHistory.reduce((sum, s) => sum + s.heapUsed, 0);
    this.stats.avgMemoryUsage = totalHeapUsed / this.memoryHistory.length;
    
    // Check thresholds
    const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (heapPercentage >= this.config.memoryCriticalThreshold) {
      logger.error(`[LongRunningManager] CRITICAL: Memory usage at ${heapPercentage.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB)`);
      this.emit('memory-critical', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        percentage: heapPercentage,
      });
    } else if (heapPercentage >= this.config.memoryWarningThreshold) {
      logger.warn(`[LongRunningManager] WARNING: Memory usage at ${heapPercentage.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB)`);
      this.emit('memory-warning', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        percentage: heapPercentage,
      });
    }
    
    // Check for potential memory leak
    this.detectMemoryLeak();
    
    this.emit('memory-check', snapshot);
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeak(): void {
    if (this.memoryHistory.length < 10) {
      return; // Need enough data points
    }
    
    // Calculate trend over last 10 samples
    const recentHistory = this.memoryHistory.slice(-10);
    const firstHalf = recentHistory.slice(0, 5);
    const secondHalf = recentHistory.slice(5);
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.heapUsed, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.heapUsed, 0) / secondHalf.length;
    
    // If memory increased by more than 20% in the last 10 samples, warn
    const increasePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (increasePercent > 20) {
      logger.warn(`[LongRunningManager] Potential memory leak detected: ${increasePercent.toFixed(1)}% increase over last ${recentHistory.length} samples`);
      this.emit('memory-leak-warning', {
        increasePercent,
        firstAvg,
        secondAvg,
      });
    }
  }

  /**
   * Load persisted stats from disk
   */
  private async loadStats(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.statsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (fs.existsSync(this.statsFilePath)) {
        const data = fs.readFileSync(this.statsFilePath, 'utf-8');
        const loaded = JSON.parse(data) as WardenRuntimeStats;
        
        // Merge with current stats (preserve cumulative values)
        this.stats.totalUptimeMs = loaded.totalUptimeMs || 0;
        this.stats.restartCount = loaded.restartCount || 0;
        this.stats.cyclesCompleted = loaded.cyclesCompleted || 0;
        this.stats.opportunitiesFound = loaded.opportunitiesFound || 0;
        this.stats.tradesExecuted = loaded.tradesExecuted || 0;
        this.stats.totalProfit = loaded.totalProfit || '0';
        this.stats.errors = loaded.errors || 0;
        this.stats.peakMemoryUsage = loaded.peakMemoryUsage || 0;
        
        logger.info('[LongRunningManager] Loaded persisted stats from disk');
        logger.info(`[LongRunningManager] Previous session: ${loaded.sessionId}`);
      } else {
        logger.info('[LongRunningManager] No persisted stats found, starting fresh');
      }
    } catch (error) {
      logger.warn(`[LongRunningManager] Failed to load persisted stats: ${error}`);
      // Continue with empty stats
    }
  }

  /**
   * Persist stats to disk
   */
  private async persistStats(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.statsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Update session uptime before persisting
      this.stats.sessionUptimeMs = Date.now() - this.stats.startTime;
      this.stats.lastUpdateTime = Date.now();
      
      const data = JSON.stringify(this.stats, null, 2);
      fs.writeFileSync(this.statsFilePath, data, 'utf-8');
      
      this.emit('stats-persisted', { path: this.statsFilePath });
    } catch (error) {
      logger.error(`[LongRunningManager] Failed to persist stats: ${error}`);
      this.emit('persist-error', { error });
    }
  }

  /**
   * Log current stats
   */
  private logStats(): void {
    const uptimeMs = Date.now() - this.stats.startTime;
    const uptimeHours = uptimeMs / 3600000;
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('[LongRunningManager] STATUS REPORT');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info(`Session ID: ${this.stats.sessionId}`);
    logger.info(`Session Uptime: ${uptimeHours.toFixed(2)} hours`);
    logger.info(`Total Uptime (all sessions): ${((this.stats.totalUptimeMs + uptimeMs) / 3600000).toFixed(2)} hours`);
    logger.info(`Restart Count: ${this.stats.restartCount}`);
    logger.info(`Cycles Completed: ${this.stats.cyclesCompleted}`);
    logger.info(`Opportunities Found: ${this.stats.opportunitiesFound}`);
    logger.info(`Trades Executed: ${this.stats.tradesExecuted}`);
    logger.info(`Errors: ${this.stats.errors}`);
    logger.info(`Current Memory: ${heapUsedMB.toFixed(1)}MB`);
    logger.info(`Peak Memory: ${(this.stats.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
    logger.info('═══════════════════════════════════════════════════════════');
  }

  /**
   * Update runtime stats
   */
  updateStats(updates: Partial<{
    cyclesCompleted: number;
    opportunitiesFound: number;
    tradesExecuted: number;
    totalProfit: bigint;
    errors: number;
  }>): void {
    if (updates.cyclesCompleted !== undefined) {
      this.stats.cyclesCompleted = updates.cyclesCompleted;
    }
    if (updates.opportunitiesFound !== undefined) {
      this.stats.opportunitiesFound = updates.opportunitiesFound;
    }
    if (updates.tradesExecuted !== undefined) {
      this.stats.tradesExecuted = updates.tradesExecuted;
    }
    if (updates.totalProfit !== undefined) {
      this.stats.totalProfit = updates.totalProfit.toString();
    }
    if (updates.errors !== undefined) {
      this.stats.errors = updates.errors;
    }
    
    this.stats.lastUpdateTime = Date.now();
  }

  /**
   * Update health status
   */
  updateHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): void {
    this.stats.lastHealthStatus = status;
    this.stats.lastHealthCheckTime = Date.now();
    
    if (status === 'healthy') {
      this.stats.consecutiveHealthyChecks++;
    } else {
      this.stats.consecutiveHealthyChecks = 0;
    }
  }

  /**
   * Get current stats
   */
  getStats(): WardenRuntimeStats {
    return {
      ...this.stats,
      sessionUptimeMs: Date.now() - this.stats.startTime,
    };
  }

  /**
   * Get memory history
   */
  getMemoryHistory(): MemorySnapshot[] {
    return [...this.memoryHistory];
  }

  /**
   * Check if process is healthy
   */
  isHealthy(): boolean {
    const now = Date.now();
    const timeSinceLastBeat = now - this.lastHeartbeat;
    
    return (
      this.isRunning &&
      timeSinceLastBeat < this.config.heartbeat.timeout &&
      this.stats.lastHealthStatus !== 'unhealthy'
    );
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): boolean {
    if (global.gc) {
      logger.info('[LongRunningManager] Forcing garbage collection...');
      global.gc();
      return true;
    }
    logger.warn('[LongRunningManager] Garbage collection not exposed. Run with --expose-gc flag.');
    return false;
  }

  /**
   * Get uptime information
   */
  getUptime(): {
    sessionUptime: number;
    totalUptime: number;
    restartCount: number;
    lastRestartReason?: string;
  } {
    const sessionUptime = Date.now() - this.stats.startTime;
    return {
      sessionUptime,
      totalUptime: this.stats.totalUptimeMs + sessionUptime,
      restartCount: this.stats.restartCount,
      lastRestartReason: this.stats.lastRestartReason,
    };
  }
}

export default LongRunningManager;
