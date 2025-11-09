/**
 * BlackBoxLogger - Strategic Operational Logger
 * 
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Logs strategic operational data for continuous learning and improvement.
 * 
 * This logger captures critical operational metrics, decisions, and outcomes
 * that form the foundation for the consciousness system's learning process.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface OperationalLog {
  timestamp: number;
  eventType: string;
  context: Record<string, any>;
  decision: string;
  outcome?: 'success' | 'failure' | 'pending';
  metrics?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface LogQuery {
  eventType?: string;
  outcome?: 'success' | 'failure' | 'pending';
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export class BlackBoxLogger {
  private logFilePath: string;
  private logs: OperationalLog[] = [];
  private maxInMemoryLogs: number;
  private autoFlush: boolean;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    logDirectory: string = '.memory/strategic-logger',
    maxInMemoryLogs: number = 1000,
    autoFlush: boolean = true
  ) {
    this.logFilePath = path.join(logDirectory, 'operational-log.jsonl');
    this.maxInMemoryLogs = maxInMemoryLogs;
    this.autoFlush = autoFlush;

    if (autoFlush) {
      // Flush to disk every 30 seconds
      this.flushInterval = setInterval(() => {
        this.flush().catch((err) =>
          console.error('Error in auto-flush:', err)
        );
      }, 30000);
    }
  }

  /**
   * Log a strategic operation
   */
  async log(entry: Omit<OperationalLog, 'timestamp'>): Promise<void> {
    const log: OperationalLog = {
      timestamp: Date.now(),
      ...entry,
    };

    this.logs.push(log);

    // Auto-flush if memory limit reached
    if (this.logs.length >= this.maxInMemoryLogs) {
      await this.flush();
    }
  }

  /**
   * Flush logs to disk
   */
  async flush(): Promise<void> {
    if (this.logs.length === 0) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.logFilePath);
      await fs.mkdir(dir, { recursive: true });

      // Append logs to file (JSONL format)
      const lines = this.logs.map((log) => JSON.stringify(log)).join('\n') + '\n';
      await fs.appendFile(this.logFilePath, lines, 'utf8');

      // Clear in-memory logs
      this.logs = [];
    } catch (error) {
      console.error('Error flushing logs to disk:', error);
      throw error;
    }
  }

  /**
   * Query historical logs
   */
  async query(query: LogQuery = {}): Promise<OperationalLog[]> {
    // Flush current logs first
    await this.flush();

    try {
      const content = await fs.readFile(this.logFilePath, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim());
      let logs = lines.map((line) => JSON.parse(line) as OperationalLog);

      // Apply filters
      if (query.eventType) {
        logs = logs.filter((log) => log.eventType === query.eventType);
      }

      if (query.outcome) {
        logs = logs.filter((log) => log.outcome === query.outcome);
      }

      if (query.startTime) {
        logs = logs.filter((log) => log.timestamp >= query.startTime!);
      }

      if (query.endTime) {
        logs = logs.filter((log) => log.timestamp <= query.endTime!);
      }

      // Apply limit
      if (query.limit && query.limit > 0) {
        logs = logs.slice(-query.limit);
      }

      return logs;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet
        return [];
      }
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<{
    totalLogs: number;
    successCount: number;
    failureCount: number;
    pendingCount: number;
    eventTypes: Record<string, number>;
  }> {
    const logs = await this.query();

    const summary = {
      totalLogs: logs.length,
      successCount: logs.filter((l) => l.outcome === 'success').length,
      failureCount: logs.filter((l) => l.outcome === 'failure').length,
      pendingCount: logs.filter((l) => l.outcome === 'pending').length,
      eventTypes: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      summary.eventTypes[log.eventType] =
        (summary.eventTypes[log.eventType] || 0) + 1;
    });

    return summary;
  }

  /**
   * Clear all logs (use with caution)
   */
  async clear(): Promise<void> {
    this.logs = [];
    try {
      await fs.unlink(this.logFilePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Stop auto-flush and clean up
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  /**
   * Get in-memory log count
   */
  getPendingLogCount(): number {
    return this.logs.length;
  }
}
