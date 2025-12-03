import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import BitCrackRangeManager from '../../../scripts/bitcrack_range_manager';

describe('BitCrackRangeManager', () => {
  const testDataDir = '/tmp/test-ml-predictions';
  let manager: BitCrackRangeManager;
  
  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }
    
    // Create mock ML prediction
    const mockPrediction = {
      prediction: {
        ensemble_prediction: 64.96,
        confidence_interval: {
          lower: 13.23,
          upper: 100.00
        },
        std_dev: 25.86
      },
      puzzle: {
        number: 71,
        target_address: '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU',
        range_min: '0x400000000000000000',
        range_max: '0x7FFFFFFFFFFFFFFFFF'
      }
    };
    
    writeFileSync(
      join(testDataDir, 'puzzle71_prediction.json'),
      JSON.stringify(mockPrediction, null, 2)
    );
    
    manager = new BitCrackRangeManager(testDataDir);
  });
  
  afterEach(() => {
    // Clean up test files
    const files = [
      'puzzle71_prediction.json',
      'puzzle71_bitcrack_ranges.json',
      'puzzle71_search_progress.json'
    ];
    
    files.forEach(file => {
      const filePath = join(testDataDir, file);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    });
  });
  
  describe('loadMLPrediction', () => {
    it('should load ML prediction successfully', () => {
      const prediction = manager.loadMLPrediction();
      
      expect(prediction).not.toBeNull();
      expect(prediction?.prediction.ensemble_prediction).toBe(64.96);
    });
  });
  
  describe('generateRanges', () => {
    it('should generate valid range specifications', () => {
      const prediction = manager.loadMLPrediction();
      expect(prediction).not.toBeNull();
      
      const ranges = manager.generateRanges(prediction!);
      
      expect(ranges.puzzle).toBe(71);
      expect(ranges.target_address).toBe('1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU');
    });
  });
});
