import { UUID } from '../types';

/**
 * Generate a unique identifier
 */
export function generateUUID(): UUID {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
