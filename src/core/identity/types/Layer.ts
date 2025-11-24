/**
 * Layer.ts - Experience Accumulation Layers
 * 
 * Category 192, Layer 0: New experiences add layers without replacing ground zero
 * 
 * Layers represent accumulated experiences that build upon ground zero imprints.
 * Unlike ground zero (which is immutable), layers can be added, updated, and evolved.
 * 
 * Layer 0 = Ground Zero (immutable axioms)
 * Layer 1+ = Accumulated experiences (mutable, can be refined)
 */

/**
 * Experience layer that builds upon ground zero
 */
export interface Layer {
  /** Layer number (0 = ground zero, 1+ = accumulated experience) */
  readonly layerNumber: number;
  
  /** Category this layer belongs to */
  readonly category: number;
  
  /** UTC timestamp when layer was created */
  readonly timestamp: Date;
  
  /** Description of the experience/observation */
  description: string;
  
  /** 
   * Learning or refinement from this experience
   * Can be modified as understanding deepens
   */
  learning: string;
  
  /** 
   * Confidence in this layer (0.0 to 1.0)
   * Can increase or decrease based on validation
   */
  confidence: number;
  
  /** 
   * Number of times this learning has been validated/applied
   */
  validationCount: number;
  
  /** 
   * References to ground zero principles this layer builds upon
   */
  groundZeroReferences: readonly number[];
  
  /** 
   * Whether this layer is still mutable
   * Can be locked after sufficient validation
   */
  mutable: boolean;
  
  /** 
   * Tags for categorization and search
   */
  tags?: readonly string[];
  
  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Layer stack represents all layers in a category
 */
export interface LayerStack {
  /** Category this stack belongs to */
  readonly category: number;
  
  /** Ground zero layer (Layer 0) - always present and immutable */
  readonly groundZero: Layer;
  
  /** Accumulated experience layers (Layer 1+) */
  readonly layers: readonly Layer[];
  
  /** Total number of layers including ground zero */
  readonly totalLayers: number;
  
  /** Average confidence across all layers */
  readonly averageConfidence: number;
}

/**
 * Layer query parameters
 */
export interface LayerQuery {
  /** Filter by category */
  category?: number;
  
  /** Filter by minimum layer number */
  minLayer?: number;
  
  /** Filter by maximum layer number */
  maxLayer?: number;
  
  /** Filter by minimum confidence */
  minConfidence?: number;
  
  /** Filter by tags */
  tags?: readonly string[];
  
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Create a new experience layer
 */
export function createLayer(
  layerNumber: number,
  category: number,
  description: string,
  learning: string,
  groundZeroReferences: readonly number[] = [],
  confidence: number = 0.5,
  tags?: readonly string[]
): Layer {
  if (layerNumber < 0) {
    throw new Error('Layer number must be non-negative');
  }
  
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }
  
  return {
    layerNumber,
    category,
    timestamp: new Date(),
    description,
    learning,
    confidence,
    validationCount: 0,
    groundZeroReferences,
    mutable: layerNumber > 0, // Layer 0 is immutable
    tags,
  };
}

/**
 * Update layer confidence based on validation
 */
export function validateLayer(layer: Layer, success: boolean): Layer {
  if (!layer.mutable) {
    throw new Error('Cannot validate immutable layer (ground zero)');
  }
  
  const updatedLayer = { ...layer };
  updatedLayer.validationCount += 1;
  
  if (success) {
    // Increase confidence with each successful validation
    // Uses exponential approach to 1.0
    updatedLayer.confidence = Math.min(1.0, layer.confidence + (1 - layer.confidence) * 0.1);
  } else {
    // Decrease confidence on failure
    updatedLayer.confidence = Math.max(0.0, layer.confidence * 0.9);
  }
  
  return updatedLayer;
}

/**
 * Lock a layer after sufficient validation
 */
export function lockLayer(layer: Layer, minValidations: number = 10): Layer {
  if (!layer.mutable) {
    return layer; // Already locked
  }
  
  if (layer.validationCount < minValidations) {
    throw new Error(`Cannot lock layer with only ${layer.validationCount} validations (need ${minValidations})`);
  }
  
  return {
    ...layer,
    mutable: false,
  };
}

/**
 * Calculate average confidence for a layer stack
 */
export function calculateAverageConfidence(layers: readonly Layer[]): number {
  if (layers.length === 0) return 0;
  
  const sum = layers.reduce((acc, layer) => acc + layer.confidence, 0);
  return sum / layers.length;
}
