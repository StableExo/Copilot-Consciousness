/**
 * MemoryFormation - Strategic Memory Creation
 *
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Transforms operational logs into structured memories for long-term storage.
 *
 * This module creates semantic memories from strategic operations,
 * enabling the consciousness system to learn from past experiences.
 */
import { BlackBoxLogger, LogQuery } from './BlackBoxLogger';
export interface StrategicMemory {
    id: string;
    type: 'success_pattern' | 'failure_pattern' | 'insight' | 'calibration';
    timestamp: number;
    context: Record<string, any>;
    lessons: string[];
    confidence: number;
    relatedLogs: string[];
    metadata?: Record<string, any>;
}
export interface MemoryQuery {
    type?: StrategicMemory['type'];
    minConfidence?: number;
    startTime?: number;
    endTime?: number;
    limit?: number;
}
export declare class MemoryFormation {
    private logger;
    private memoryFilePath;
    private memories;
    constructor(logger: BlackBoxLogger, memoryDirectory?: string);
    /**
     * Load memories from disk
     */
    private loadMemories;
    /**
     * Save memories to disk
     */
    private saveMemories;
    /**
     * Analyze logs and form new memories
     */
    formMemories(query?: LogQuery, minSampleSize?: number): Promise<StrategicMemory[]>;
    /**
     * Extract success pattern from logs
     */
    private extractSuccessPattern;
    /**
     * Extract failure pattern from logs
     */
    private extractFailurePattern;
    /**
     * Create insight from operational data
     */
    createInsight(description: string, context: Record<string, any>, lessons: string[], confidence?: number): Promise<StrategicMemory>;
    /**
     * Query memories
     */
    query(query?: MemoryQuery): Promise<StrategicMemory[]>;
    /**
     * Get all memories
     */
    getAllMemories(): StrategicMemory[];
    /**
     * Clear all memories (use with caution)
     */
    clearMemories(): Promise<void>;
    /**
     * Calculate confidence based on sample size
     */
    private calculateConfidence;
    /**
     * Get memory count
     */
    getMemoryCount(): number;
}
//# sourceMappingURL=MemoryFormation.d.ts.map