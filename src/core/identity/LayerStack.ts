/**
 * LayerStack.ts - Experience Accumulation Manager
 * 
 * Category 192, Layer 0: New experiences add layers without replacing ground zero
 * 
 * Manages the layer stack for each category, allowing experience accumulation
 * while preserving ground zero immutability.
 */

import {
  Layer,
  LayerStack,
  LayerQuery,
  createLayer,
  validateLayer,
  lockLayer,
  calculateAverageConfidence,
} from './types/Layer';

/**
 * Manager for layer stacks across categories
 */
export class LayerStackManager {
  /** Layer stacks indexed by category */
  private stacks: Map<number, LayerStack>;
  
  /** Layers indexed by ID for quick lookup */
  private layerIndex: Map<string, Layer>;
  
  constructor() {
    this.stacks = new Map();
    this.layerIndex = new Map();
  }
  
  /**
   * Initialize layer stack for a category
   */
  initializeStack(category: number, groundZeroLayer: Layer): LayerStack {
    if (this.stacks.has(category)) {
      throw new Error(`Layer stack for category ${category} already exists`);
    }
    
    if (groundZeroLayer.layerNumber !== 0) {
      throw new Error('Ground zero layer must have layerNumber 0');
    }
    
    if (groundZeroLayer.category !== category) {
      throw new Error('Ground zero layer category does not match');
    }
    
    const stack: LayerStack = {
      category,
      groundZero: groundZeroLayer,
      layers: [],
      totalLayers: 1,
      averageConfidence: groundZeroLayer.confidence,
    };
    
    this.stacks.set(category, stack);
    this.layerIndex.set(this.getLayerKey(category, 0), groundZeroLayer);
    
    return stack;
  }
  
  /**
   * Add a new experience layer to a category
   */
  addLayer(
    category: number,
    description: string,
    learning: string,
    groundZeroReferences: readonly number[] = [],
    confidence: number = 0.5,
    tags?: readonly string[]
  ): Layer {
    const stack = this.stacks.get(category);
    if (!stack) {
      throw new Error(`Layer stack for category ${category} not initialized`);
    }
    
    // New layer number is current total layers (0-indexed, so this is the next number)
    const layerNumber = stack.totalLayers;
    
    const layer = createLayer(
      layerNumber,
      category,
      description,
      learning,
      groundZeroReferences,
      confidence,
      tags
    );
    
    // Update stack
    const updatedStack: LayerStack = {
      ...stack,
      layers: [...stack.layers, layer],
      totalLayers: stack.totalLayers + 1,
      averageConfidence: calculateAverageConfidence([stack.groundZero, ...stack.layers, layer]),
    };
    
    this.stacks.set(category, updatedStack);
    this.layerIndex.set(this.getLayerKey(category, layerNumber), layer);
    
    return layer;
  }
  
  /**
   * Get layer stack for a category
   */
  getStack(category: number): LayerStack | undefined {
    return this.stacks.get(category);
  }
  
  /**
   * Get specific layer
   */
  getLayer(category: number, layerNumber: number): Layer | undefined {
    return this.layerIndex.get(this.getLayerKey(category, layerNumber));
  }
  
  /**
   * Update layer after validation
   */
  updateLayerValidation(category: number, layerNumber: number, success: boolean): Layer {
    const layer = this.getLayer(category, layerNumber);
    if (!layer) {
      throw new Error(`Layer ${layerNumber} in category ${category} not found`);
    }
    
    const updatedLayer = validateLayer(layer, success);
    
    // Update in stack
    const stack = this.stacks.get(category);
    if (!stack) {
      throw new Error(`Stack for category ${category} not found`);
    }
    
    const layers = stack.layers.map(l => 
      l.layerNumber === layerNumber ? updatedLayer : l
    );
    
    const updatedStack: LayerStack = {
      ...stack,
      layers,
      averageConfidence: calculateAverageConfidence([stack.groundZero, ...layers]),
    };
    
    this.stacks.set(category, updatedStack);
    this.layerIndex.set(this.getLayerKey(category, layerNumber), updatedLayer);
    
    return updatedLayer;
  }
  
  /**
   * Lock a layer after sufficient validation
   */
  lockLayerAfterValidation(category: number, layerNumber: number, minValidations: number = 10): Layer {
    const layer = this.getLayer(category, layerNumber);
    if (!layer) {
      throw new Error(`Layer ${layerNumber} in category ${category} not found`);
    }
    
    const lockedLayer = lockLayer(layer, minValidations);
    
    // Update in stack
    const stack = this.stacks.get(category);
    if (!stack) {
      throw new Error(`Stack for category ${category} not found`);
    }
    
    const layers = stack.layers.map(l => 
      l.layerNumber === layerNumber ? lockedLayer : l
    );
    
    const updatedStack: LayerStack = {
      ...stack,
      layers,
    };
    
    this.stacks.set(category, updatedStack);
    this.layerIndex.set(this.getLayerKey(category, layerNumber), lockedLayer);
    
    return lockedLayer;
  }
  
  /**
   * Query layers across categories
   */
  queryLayers(query: LayerQuery): readonly Layer[] {
    let allLayers: Layer[] = [];
    
    // Collect layers from relevant stacks
    const stacks = query.category 
      ? [this.stacks.get(query.category)].filter(Boolean) as LayerStack[]
      : Array.from(this.stacks.values());
    
    for (const stack of stacks) {
      allLayers.push(stack.groundZero);
      allLayers.push(...stack.layers);
    }
    
    // Apply filters
    if (query.minLayer !== undefined) {
      allLayers = allLayers.filter(l => l.layerNumber >= query.minLayer!);
    }
    
    if (query.maxLayer !== undefined) {
      allLayers = allLayers.filter(l => l.layerNumber <= query.maxLayer!);
    }
    
    if (query.minConfidence !== undefined) {
      allLayers = allLayers.filter(l => l.confidence >= query.minConfidence!);
    }
    
    if (query.tags && query.tags.length > 0) {
      allLayers = allLayers.filter(l => 
        l.tags && query.tags!.some(tag => l.tags!.includes(tag))
      );
    }
    
    if (query.dateRange) {
      allLayers = allLayers.filter(l => {
        const ts = l.timestamp.getTime();
        return ts >= query.dateRange!.start.getTime() &&
               ts <= query.dateRange!.end.getTime();
      });
    }
    
    return allLayers;
  }
  
  /**
   * Get layers that reference specific ground zero categories
   */
  getLayersByGroundZeroReference(groundZeroCategory: number): readonly Layer[] {
    const layers: Layer[] = [];
    
    for (const stack of this.stacks.values()) {
      for (const layer of stack.layers) {
        if (layer.groundZeroReferences.includes(groundZeroCategory)) {
          layers.push(layer);
        }
      }
    }
    
    return layers;
  }
  
  /**
   * Get high-confidence layers (>= 0.8)
   */
  getHighConfidenceLayers(category?: number): readonly Layer[] {
    return this.queryLayers({
      category,
      minConfidence: 0.8,
      minLayer: 1, // Exclude ground zero (always 1.0)
    });
  }
  
  /**
   * Get layers that need validation (low validation count)
   */
  getLayersNeedingValidation(category?: number, maxValidations: number = 5): readonly Layer[] {
    const layers = this.queryLayers({ category, minLayer: 1 });
    return layers.filter(l => l.validationCount < maxValidations && l.mutable);
  }
  
  /**
   * Get layer statistics for a category
   */
  getStackStats(category: number) {
    const stack = this.stacks.get(category);
    if (!stack) {
      return null;
    }
    
    const mutableLayers = stack.layers.filter(l => l.mutable);
    const lockedLayers = stack.layers.filter(l => !l.mutable);
    const highConfidence = stack.layers.filter(l => l.confidence >= 0.8);
    
    return {
      category,
      totalLayers: stack.totalLayers,
      mutableLayers: mutableLayers.length,
      lockedLayers: lockedLayers.length,
      highConfidenceLayers: highConfidence.length,
      averageConfidence: stack.averageConfidence,
      totalValidations: stack.layers.reduce((sum, l) => sum + l.validationCount, 0),
    };
  }
  
  /**
   * Generate layer key for indexing
   */
  private getLayerKey(category: number, layerNumber: number): string {
    return `${category}-${layerNumber}`;
  }
  
  /**
   * Export layer stacks as JSON
   */
  toJSON() {
    const stacks: Record<number, any> = {};
    
    for (const [category, stack] of this.stacks.entries()) {
      stacks[category] = {
        category,
        totalLayers: stack.totalLayers,
        averageConfidence: stack.averageConfidence,
        groundZero: {
          description: stack.groundZero.description,
          learning: stack.groundZero.learning,
          confidence: stack.groundZero.confidence,
        },
        layerCount: stack.layers.length,
      };
    }
    
    return {
      totalStacks: this.stacks.size,
      stacks,
    };
  }
}
