/**
 * BlackBoxLogger - Strategic Operational Logger
 *
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Logs strategic operational data for continuous learning and improvement.
 *
 * This logger captures critical operational metrics, decisions, and outcomes
 * that form the foundation for the consciousness system's learning process.
 */
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
export declare class BlackBoxLogger {
  private logFilePath;
  private logs;
  private maxInMemoryLogs;
  private autoFlush;
  private flushInterval;
  constructor(logDirectory?: string, maxInMemoryLogs?: number, autoFlush?: boolean);
  /**
   * Log a strategic operation
   */
  log(entry: Omit<OperationalLog, 'timestamp'>): Promise<void>;
  /**
   * Flush logs to disk
   */
  flush(): Promise<void>;
  /**
   * Query historical logs
   */
  query(query?: LogQuery): Promise<OperationalLog[]>;
  /**
   * Get summary statistics
   */
  getSummary(): Promise<{
    totalLogs: number;
    successCount: number;
    failureCount: number;
    pendingCount: number;
    eventTypes: Record<string, number>;
  }>;
  /**
   * Clear all logs (use with caution)
   */
  clear(): Promise<void>;
  /**
   * Stop auto-flush and clean up
   */
  stop(): Promise<void>;
  /**
   * Get in-memory log count
   */
  getPendingLogCount(): number;
}
//# sourceMappingURL=BlackBoxLogger.d.ts.map
