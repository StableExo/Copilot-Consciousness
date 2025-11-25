/**
 * Distance Calculator Utility
 * 
 * Provides various distance metrics for multi-dimensional spatial analysis.
 */

/**
 * Calculate Euclidean distance between two points in n-dimensional space
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensionality');
  }
  
  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    sumSquares += Math.pow(a[i] - b[i], 2);
  }
  
  return Math.sqrt(sumSquares);
}

/**
 * Calculate Manhattan (L1) distance between two points
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensionality');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  
  return sum;
}

/**
 * Calculate Chebyshev (L∞) distance between two points
 */
export function chebyshevDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensionality');
  }
  
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = Math.abs(a[i] - b[i]);
    if (diff > max) max = diff;
  }
  
  return max;
}

/**
 * Calculate Minkowski distance with parameter p
 */
export function minkowskiDistance(a: number[], b: number[], p: number): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensionality');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(Math.abs(a[i] - b[i]), p);
  }
  
  return Math.pow(sum, 1 / p);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensionality');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine distance (1 - similarity)
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Normalize vector to unit length
 */
export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return v.map(() => 0);
  return v.map(val => val / norm);
}

/**
 * Min-max normalization of vector values to [0, 1]
 */
export function minMaxNormalize(v: number[]): number[] {
  const min = Math.min(...v);
  const max = Math.max(...v);
  
  if (min === max) return v.map(() => 0.5);
  
  return v.map(val => (val - min) / (max - min));
}

/**
 * Z-score normalization (standardization)
 */
export function standardize(v: number[]): number[] {
  const mean = v.reduce((sum, val) => sum + val, 0) / v.length;
  const variance = v.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / v.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return v.map(() => 0);
  
  return v.map(val => (val - mean) / stdDev);
}

/**
 * Distance metric type
 */
export type DistanceMetric = 
  | 'euclidean'
  | 'manhattan'
  | 'chebyshev'
  | 'minkowski'
  | 'cosine';

/**
 * Calculate distance using specified metric
 */
export function calculateDistance(
  a: number[],
  b: number[],
  metric: DistanceMetric = 'euclidean',
  p: number = 2
): number {
  switch (metric) {
    case 'euclidean':
      return euclideanDistance(a, b);
    case 'manhattan':
      return manhattanDistance(a, b);
    case 'chebyshev':
      return chebyshevDistance(a, b);
    case 'minkowski':
      return minkowskiDistance(a, b, p);
    case 'cosine':
      return cosineDistance(a, b);
    default:
      throw new Error(`Unknown distance metric: ${metric}`);
  }
}
