"use strict";
/**
 * MemoryFormation - Strategic Memory Creation
 *
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Transforms operational logs into structured memories for long-term storage.
 *
 * This module creates semantic memories from strategic operations,
 * enabling the consciousness system to learn from past experiences.
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
exports.MemoryFormation = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class MemoryFormation {
    constructor(logger, memoryDirectory = '.memory/strategic-logger') {
        this.memories = [];
        this.logger = logger;
        this.memoryFilePath = path.join(memoryDirectory, 'strategic-memories.json');
        this.loadMemories().catch((err) => console.error('Error loading memories:', err));
    }
    /**
     * Load memories from disk
     */
    async loadMemories() {
        try {
            const content = await fs.readFile(this.memoryFilePath, 'utf8');
            this.memories = JSON.parse(content);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet
                this.memories = [];
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Save memories to disk
     */
    async saveMemories() {
        try {
            const dir = path.dirname(this.memoryFilePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.memoryFilePath, JSON.stringify(this.memories, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Error saving memories:', error);
            throw error;
        }
    }
    /**
     * Analyze logs and form new memories
     */
    async formMemories(query = {}, minSampleSize = 5) {
        const logs = await this.logger.query(query);
        if (logs.length < minSampleSize) {
            return [];
        }
        const newMemories = [];
        // Identify success patterns
        const successLogs = logs.filter((l) => l.outcome === 'success');
        if (successLogs.length >= minSampleSize) {
            const successMemory = this.extractSuccessPattern(successLogs);
            if (successMemory) {
                newMemories.push(successMemory);
            }
        }
        // Identify failure patterns
        const failureLogs = logs.filter((l) => l.outcome === 'failure');
        if (failureLogs.length >= minSampleSize) {
            const failureMemory = this.extractFailurePattern(failureLogs);
            if (failureMemory) {
                newMemories.push(failureMemory);
            }
        }
        // Save new memories
        for (const memory of newMemories) {
            this.memories.push(memory);
        }
        await this.saveMemories();
        return newMemories;
    }
    /**
     * Extract success pattern from logs
     */
    extractSuccessPattern(logs) {
        if (logs.length === 0)
            return null;
        // Analyze common factors in successful operations
        const contextKeys = new Set();
        logs.forEach((log) => {
            Object.keys(log.context).forEach((key) => contextKeys.add(key));
        });
        const commonContext = {};
        contextKeys.forEach((key) => {
            const values = logs.map((l) => l.context[key]).filter((v) => v !== undefined);
            if (values.length === logs.length) {
                // Check if all values are the same
                if (new Set(values).size === 1) {
                    commonContext[key] = values[0];
                }
            }
        });
        const lessons = [
            `Success rate: ${((logs.length / logs.length) * 100).toFixed(1)}%`,
            `Sample size: ${logs.length} operations`,
        ];
        if (Object.keys(commonContext).length > 0) {
            lessons.push(`Common factors: ${Object.keys(commonContext).join(', ')}`);
        }
        return {
            id: `success-${Date.now()}`,
            type: 'success_pattern',
            timestamp: Date.now(),
            context: commonContext,
            lessons,
            confidence: this.calculateConfidence(logs.length),
            relatedLogs: logs.map((l) => l.timestamp.toString()),
        };
    }
    /**
     * Extract failure pattern from logs
     */
    extractFailurePattern(logs) {
        if (logs.length === 0)
            return null;
        // Analyze common factors in failed operations
        const contextKeys = new Set();
        logs.forEach((log) => {
            Object.keys(log.context).forEach((key) => contextKeys.add(key));
        });
        const commonContext = {};
        contextKeys.forEach((key) => {
            const values = logs.map((l) => l.context[key]).filter((v) => v !== undefined);
            if (values.length === logs.length) {
                if (new Set(values).size === 1) {
                    commonContext[key] = values[0];
                }
            }
        });
        const lessons = [
            `Failure rate: ${((logs.length / logs.length) * 100).toFixed(1)}%`,
            `Sample size: ${logs.length} operations`,
            `Recommendation: Avoid operations with these conditions`,
        ];
        if (Object.keys(commonContext).length > 0) {
            lessons.push(`Common failure factors: ${Object.keys(commonContext).join(', ')}`);
        }
        return {
            id: `failure-${Date.now()}`,
            type: 'failure_pattern',
            timestamp: Date.now(),
            context: commonContext,
            lessons,
            confidence: this.calculateConfidence(logs.length),
            relatedLogs: logs.map((l) => l.timestamp.toString()),
        };
    }
    /**
     * Create insight from operational data
     */
    async createInsight(description, context, lessons, confidence = 0.5) {
        const insight = {
            id: `insight-${Date.now()}`,
            type: 'insight',
            timestamp: Date.now(),
            context,
            lessons,
            confidence,
            relatedLogs: [],
            metadata: { description },
        };
        this.memories.push(insight);
        await this.saveMemories();
        return insight;
    }
    /**
     * Query memories
     */
    async query(query = {}) {
        let results = [...this.memories];
        if (query.type) {
            results = results.filter((m) => m.type === query.type);
        }
        if (query.minConfidence !== undefined) {
            results = results.filter((m) => m.confidence >= query.minConfidence);
        }
        if (query.startTime) {
            results = results.filter((m) => m.timestamp >= query.startTime);
        }
        if (query.endTime) {
            results = results.filter((m) => m.timestamp <= query.endTime);
        }
        if (query.limit && query.limit > 0) {
            results = results.slice(-query.limit);
        }
        return results;
    }
    /**
     * Get all memories
     */
    getAllMemories() {
        return [...this.memories];
    }
    /**
     * Clear all memories (use with caution)
     */
    async clearMemories() {
        this.memories = [];
        await this.saveMemories();
    }
    /**
     * Calculate confidence based on sample size
     */
    calculateConfidence(sampleSize) {
        return Math.min(1 - Math.exp(-sampleSize / 20), 0.95);
    }
    /**
     * Get memory count
     */
    getMemoryCount() {
        return this.memories.length;
    }
}
exports.MemoryFormation = MemoryFormation;
//# sourceMappingURL=MemoryFormation.js.map