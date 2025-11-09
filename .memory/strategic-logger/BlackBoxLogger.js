"use strict";
/**
 * BlackBoxLogger - Strategic Operational Logger
 *
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Logs strategic operational data for continuous learning and improvement.
 *
 * This logger captures critical operational metrics, decisions, and outcomes
 * that form the foundation for the consciousness system's learning process.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlackBoxLogger = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class BlackBoxLogger {
    constructor(logDirectory = '.memory/strategic-logger', maxInMemoryLogs = 1000, autoFlush = true) {
        this.logs = [];
        this.flushInterval = null;
        this.logFilePath = path.join(logDirectory, 'operational-log.jsonl');
        this.maxInMemoryLogs = maxInMemoryLogs;
        this.autoFlush = autoFlush;
        if (autoFlush) {
            // Flush to disk every 30 seconds
            this.flushInterval = setInterval(() => {
                this.flush().catch((err) => console.error('Error in auto-flush:', err));
            }, 30000);
        }
    }
    /**
     * Log a strategic operation
     */
    async log(entry) {
        const log = {
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
    async flush() {
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
        }
        catch (error) {
            console.error('Error flushing logs to disk:', error);
            throw error;
        }
    }
    /**
     * Query historical logs
     */
    async query(query = {}) {
        // Flush current logs first
        await this.flush();
        try {
            const content = await fs.readFile(this.logFilePath, 'utf8');
            const lines = content.split('\n').filter((line) => line.trim());
            let logs = lines.map((line) => JSON.parse(line));
            // Apply filters
            if (query.eventType) {
                logs = logs.filter((log) => log.eventType === query.eventType);
            }
            if (query.outcome) {
                logs = logs.filter((log) => log.outcome === query.outcome);
            }
            if (query.startTime) {
                logs = logs.filter((log) => log.timestamp >= query.startTime);
            }
            if (query.endTime) {
                logs = logs.filter((log) => log.timestamp <= query.endTime);
            }
            // Apply limit
            if (query.limit && query.limit > 0) {
                logs = logs.slice(-query.limit);
            }
            return logs;
        }
        catch (error) {
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
    async getSummary() {
        const logs = await this.query();
        const summary = {
            totalLogs: logs.length,
            successCount: logs.filter((l) => l.outcome === 'success').length,
            failureCount: logs.filter((l) => l.outcome === 'failure').length,
            pendingCount: logs.filter((l) => l.outcome === 'pending').length,
            eventTypes: {},
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
    async clear() {
        this.logs = [];
        try {
            await fs.unlink(this.logFilePath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    /**
     * Stop auto-flush and clean up
     */
    async stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        await this.flush();
    }
    /**
     * Get in-memory log count
     */
    getPendingLogCount() {
        return this.logs.length;
    }
}
exports.BlackBoxLogger = BlackBoxLogger;
//# sourceMappingURL=BlackBoxLogger.js.map