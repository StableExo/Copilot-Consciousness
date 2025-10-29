// Memory system interfaces and types for the consciousness system

/**
 * Represents the emotional context associated with a memory or state
 */
export interface EmotionalContext {
    /**
     * The primary emotional state (e.g., "happy", "anxious", "curious")
     */
    primaryEmotion: string;
    
    /**
     * Intensity of the emotional state (0-1 scale)
     */
    intensity: number;
    
    /**
     * Valence of the emotion (-1 to 1, negative to positive)
     */
    valence: number;
    
    /**
     * Arousal level (0-1 scale, calm to excited)
     */
    arousal: number;
    
    /**
     * Additional contextual emotions with their intensities
     */
    secondaryEmotions?: Record<string, number>;
    
    /**
     * Timestamp when this emotional context was captured
     */
    timestamp: Date;
}

/**
 * Represents a stored memory in the consciousness system
 */
export interface Memory {
    /**
     * Unique identifier for the memory
     */
    id: string;
    
    /**
     * The actual content/data of the memory
     */
    content: any;
    
    /**
     * Type or category of the memory (e.g., "episodic", "semantic", "procedural")
     */
    type: string;
    
    /**
     * Emotional context at the time the memory was formed
     */
    emotionalContext: EmotionalContext;
    
    /**
     * Timestamp when the memory was created
     */
    createdAt: Date;
    
    /**
     * Timestamp when the memory was last accessed
     */
    lastAccessedAt: Date;
    
    /**
     * Number of times this memory has been accessed
     */
    accessCount: number;
    
    /**
     * Importance/salience score of the memory (0-1 scale)
     */
    importance: number;
    
    /**
     * Tags or labels associated with the memory for categorization
     */
    tags: string[];
    
    /**
     * References to other related memories (memory IDs)
     */
    associations?: string[];
    
    /**
     * Metadata for additional custom properties
     */
    metadata?: Record<string, any>;
}

/**
 * Query parameters for retrieving memories from the memory system
 */
export interface MemoryQuery {
    /**
     * Filter by memory type(s)
     */
    type?: string | string[];
    
    /**
     * Filter by tags (memories must have at least one matching tag)
     */
    tags?: string[];
    
    /**
     * Filter by emotional context criteria
     */
    emotionalContext?: {
        /**
         * Filter by primary emotion
         */
        primaryEmotion?: string;
        
        /**
         * Minimum intensity threshold
         */
        minIntensity?: number;
        
        /**
         * Maximum intensity threshold
         */
        maxIntensity?: number;
        
        /**
         * Minimum valence threshold
         */
        minValence?: number;
        
        /**
         * Maximum valence threshold
         */
        maxValence?: number;
    };
    
    /**
     * Filter by minimum importance score
     */
    minImportance?: number;
    
    /**
     * Filter by time range
     */
    timeRange?: {
        /**
         * Start of the time range
         */
        start?: Date;
        
        /**
         * End of the time range
         */
        end?: Date;
    };
    
    /**
     * Filter by associated memory IDs
     */
    associatedWith?: string[];
    
    /**
     * Maximum number of results to return
     */
    limit?: number;
    
    /**
     * Offset for pagination
     */
    offset?: number;
    
    /**
     * Sort order for results
     */
    sortBy?: {
        /**
         * Field to sort by
         */
        field: 'createdAt' | 'lastAccessedAt' | 'importance' | 'accessCount';
        
        /**
         * Sort direction
         */
        order: 'asc' | 'desc';
    };
    
    /**
     * Full-text search query for memory content
     */
    searchText?: string;
}
