/**
 * Production Logging System
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Colorized console output
 * - Timestamp formatting
 * - Module/component tags
 * - File logging support (optional)
 * - Performance metric logging
 */

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableFileLogging: boolean;
  logDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
}

class Logger {
  private config: LoggerConfig;
  private currentLogFile?: string;
  private currentLogSize: number = 0;

  // ANSI color codes
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
  };

  constructor(config?: Partial<LoggerConfig>) {
    const defaultConfig: LoggerConfig = {
      level: process.env.LOG_LEVEL 
        ? this.parseLogLevel(process.env.LOG_LEVEL) 
        : (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
      enableColors: process.env.LOG_COLORS !== 'false',
      enableFileLogging: process.env.LOG_FILE === 'true',
      logDir: process.env.LOG_DIR || './logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    };

    this.config = { ...defaultConfig, ...config };

    if (this.config.enableFileLogging) {
      this.initializeFileLogging();
    }
  }

  private parseLogLevel(level: string): LogLevel {
    const normalized = level.toUpperCase();
    switch (normalized) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private initializeFileLogging(): void {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
      this.rotateLogFile();
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
      this.config.enableFileLogging = false;
    }
  }

  private rotateLogFile(): void {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const logFileName = `arbitrage-bot-${dateStr}-${timeStr}.log`;
    this.currentLogFile = path.join(this.config.logDir, logFileName);
    this.currentLogSize = 0;

    // Check if file exists and get size
    if (fs.existsSync(this.currentLogFile)) {
      const stats = fs.statSync(this.currentLogFile);
      this.currentLogSize = stats.size;
    }

    // Clean up old log files
    this.cleanupOldLogs();
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(f => f.startsWith('arbitrage-bot-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.config.logDir, f),
          time: fs.statSync(path.join(this.config.logDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only maxFiles
      if (files.length > this.config.maxFiles) {
        files.slice(this.config.maxFiles).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            // Ignore errors during cleanup
          }
        });
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  }

  private colorize(text: string, color: string): string {
    if (!this.config.enableColors) return text;
    return `${color}${text}${this.colors.reset}`;
  }

  private formatMessage(level: string, message: string, tag?: string): string {
    const timestamp = this.getTimestamp();
    const tagStr = tag ? ` [${tag}]` : '';
    return `[${timestamp}] [${level}]${tagStr} ${message}`;
  }

  private writeToFile(message: string): void {
    if (!this.config.enableFileLogging || !this.currentLogFile) return;

    try {
      // Check if rotation is needed
      if (this.currentLogSize > this.config.maxFileSize) {
        this.rotateLogFile();
      }

      const data = message + '\n';
      fs.appendFileSync(this.currentLogFile, data);
      this.currentLogSize += Buffer.byteLength(data);
    } catch (error) {
      // Silently fail file logging to not disrupt the application
    }
  }

  private log(level: LogLevel, levelName: string, color: string, message: string, tag?: string): void {
    if (level < this.config.level) return;

    const formattedMessage = this.formatMessage(levelName, message, tag);
    const coloredLevel = this.colorize(levelName, color);
    const coloredMessage = this.formatMessage(coloredLevel, message, tag);

    // Console output with colors
    switch (level) {
      case LogLevel.DEBUG:
        console.log(coloredMessage);
        break;
      case LogLevel.INFO:
        console.log(coloredMessage);
        break;
      case LogLevel.WARN:
        console.warn(coloredMessage);
        break;
      case LogLevel.ERROR:
        console.error(coloredMessage);
        break;
    }

    // File output without colors
    this.writeToFile(formattedMessage);
  }

  debug(message: string, tag?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', this.colors.dim + this.colors.cyan, message, tag);
  }

  info(message: string, tag?: string): void {
    this.log(LogLevel.INFO, 'INFO', this.colors.green, message, tag);
  }

  warn(message: string, tag?: string): void {
    this.log(LogLevel.WARN, 'WARN', this.colors.yellow, message, tag);
  }

  error(message: string, tag?: string): void {
    this.log(LogLevel.ERROR, 'ERROR', this.colors.red, message, tag);
  }

  /**
   * Log performance metrics
   */
  metric(name: string, value: number | bigint | string, unit?: string): void {
    const unitStr = unit ? ` ${unit}` : '';
    this.info(`Metric: ${name} = ${value}${unitStr}`, 'METRICS');
  }

  /**
   * Log with custom tag
   */
  tagged(tag: string, level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    switch (level) {
      case 'debug': this.debug(message, tag); break;
      case 'info': this.info(message, tag); break;
      case 'warn': this.warn(message, tag); break;
      case 'error': this.error(message, tag); break;
    }
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
