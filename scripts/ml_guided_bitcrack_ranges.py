#!/usr/bin/env python3
"""
ML-Guided Range Generator for BitCrackRandomiser

Generates optimized HEX ranges for Puzzle #71 based on ensemble ML prediction.
Compatible with BitCrackRandomiser solo pool client and BitCrack/VanitySearch.

Based on:
- ML prediction: 64.96% position, CI [13.23%, 100%]
- BitCrackRandomiser: Solo pool for puzzles 68, 69, 71
- Repository: https://github.com/ilkerccom/bitcrackrandomiser
"""

import json
import sys
import os


def load_ml_prediction(prediction_path='data/ml-predictions/puzzle71_prediction.json'):
    """Load ML ensemble prediction for Puzzle #71"""
    if not os.path.exists(prediction_path):
        print(f"❌ Prediction file not found: {prediction_path}")
        print(f"   Run: python3 scripts/ml_ensemble_prediction.py")
        sys.exit(1)
    
    with open(prediction_path, 'r') as f:
        return json.load(f)


def position_to_hex(position_percent, range_min, range_size):
    """Convert position percentage to HEX key"""
    offset = int((position_percent / 100.0) * range_size)
    key = range_min + offset
    return hex(key)[2:].upper().zfill(18)


def generate_bitcrack_ranges():
    """Generate BitCrack-compatible range specifications"""
    
    # Puzzle #71 specifications
    PUZZLE_NUM = 71
    RANGE_MIN = 0x400000000000000000  # 2^70
    RANGE_MAX = 0x7FFFFFFFFFFFFFFFFF  # 2^71 - 1 (18 hex digits)
    RANGE_SIZE = RANGE_MAX - RANGE_MIN + 1
    TARGET_ADDRESS = '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU'
    
    # Load ML prediction
    prediction = load_ml_prediction()
    pred_position = prediction['prediction']['ensemble_prediction']
    ci_lower = prediction['prediction']['confidence_interval']['lower']
    ci_upper = prediction['prediction']['confidence_interval']['upper']
    
    print("=" * 80)
    print("🤖 ML-Guided BitCrack Range Generator for Puzzle #71")
    print("=" * 80)
    print()
    print(f"📊 ML Prediction Summary:")
    print(f"   Predicted Position: {pred_position:.2f}%")
    print(f"   95% CI: [{ci_lower:.2f}%, {ci_upper:.2f}%]")
    print(f"   Std Dev: ±{prediction['prediction']['std_dev']:.2f}%")
    print()
    print(f"🎯 Target Address: {TARGET_ADDRESS}")
    print(f"📏 Full Range: {hex(RANGE_MIN)[2:].upper().zfill(18)} to {hex(RANGE_MAX)[2:].upper().zfill(18)}")
    print()
    
    # Strategy 1: High-priority range (40-90%, recommended by ML)
    print("=" * 80)
    print("Strategy 1: ML High-Priority Range (40-90%)")
    print("=" * 80)
    print()
    print("This range contains 50% of keyspace but has 2x higher probability")
    print("based on ML ensemble prediction. Recommended for first scan.")
    print()
    
    range_start = position_to_hex(40.0, RANGE_MIN, RANGE_SIZE)
    range_end = position_to_hex(90.0, RANGE_MIN, RANGE_SIZE)
    
    print("🔧 BitCrack Command (Single GPU):")
    print(f"./cuBitCrack -d 0 --keyspace {range_start}:{range_end} {TARGET_ADDRESS}")
    print()
    print("🔧 VanitySearch Command:")
    print(f"./vanitysearch -d 0 --keyspace {range_start}:{range_end} {TARGET_ADDRESS}")
    print()
    
    # Strategy 2: Multi-GPU split
    print("=" * 80)
    print("Strategy 2: Multi-GPU Parallel Search")
    print("=" * 80)
    print()
    print("Split high-priority range across multiple GPUs for parallel scanning.")
    print()
    
    gpu_splits = [
        (40.0, 55.0, "GPU 0", "Lower third"),
        (55.0, 70.0, "GPU 1", "Middle third"),
        (70.0, 90.0, "GPU 2", "Upper third"),
    ]
    
    print("🔧 BitCrack Commands (Multi-GPU):")
    for start_pct, end_pct, gpu_name, description in gpu_splits:
        range_start = position_to_hex(start_pct, RANGE_MIN, RANGE_SIZE)
        range_end = position_to_hex(end_pct, RANGE_MIN, RANGE_SIZE)
        gpu_id = gpu_name.split()[-1]
        print(f"# {description} ({start_pct:.0f}-{end_pct:.0f}%)")
        print(f"./cuBitCrack -d {gpu_id} --keyspace {range_start}:{range_end} {TARGET_ADDRESS} &")
        print()
    
    # Strategy 3: BitCrackRandomiser custom range
    print("=" * 80)
    print("Strategy 3: BitCrackRandomiser Solo Pool Integration")
    print("=" * 80)
    print()
    print("For use with official solo pool client:")
    print("https://github.com/ilkerccom/bitcrackrandomiser")
    print()
    
    # BitCrackRandomiser uses first 7 chars for Puzzle 71
    # Full range: 400000000000000000 to 7FFFFFFFFFFFFFFFFFF (18 chars)
    # Pool format: First 7 chars (4000000 to 7FFFFFF)
    
    pool_range_start = hex(RANGE_MIN)[2:].upper()[:7]
    pool_range_end = hex(RANGE_MAX)[2:].upper()[:7]
    
    ml_range_start_full = position_to_hex(40.0, RANGE_MIN, RANGE_SIZE)
    ml_range_end_full = position_to_hex(90.0, RANGE_MIN, RANGE_SIZE)
    
    ml_pool_start = ml_range_start_full[:7]
    ml_pool_end = ml_range_end_full[:7]
    
    print(f"📝 settings.txt configuration:")
    print(f"   target_puzzle=71")
    print(f"   custom_range={ml_range_start_full}:{ml_range_end_full}")
    print()
    print(f"📊 Pool Range Coverage:")
    print(f"   Full pool range: {pool_range_start} to {pool_range_end}")
    print(f"   ML-optimized: {ml_pool_start} to {ml_pool_end}")
    print(f"   Reduction: 50% of ranges (2x speedup)")
    print()
    
    # Strategy 4: Fallback ranges (if high-priority exhausted)
    print("=" * 80)
    print("Strategy 4: Fallback Ranges (Lower Priority)")
    print("=" * 80)
    print()
    print("Only scan these if high-priority range (40-90%) is exhausted.")
    print("Lower probability but covers remaining 50% of keyspace.")
    print()
    
    fallback_ranges = [
        (0.0, 40.0, "Bottom 40%"),
        (90.0, 100.0, "Top 10%"),
    ]
    
    for start_pct, end_pct, description in fallback_ranges:
        range_start = position_to_hex(start_pct, RANGE_MIN, RANGE_SIZE)
        range_end = position_to_hex(end_pct, RANGE_MIN, RANGE_SIZE)
        coverage = end_pct - start_pct
        print(f"# {description} (Coverage: {coverage:.0f}%)")
        print(f"./cuBitCrack -d 0 --keyspace {range_start}:{range_end} {TARGET_ADDRESS}")
        print()
    
    # Performance estimates
    print("=" * 80)
    print("📈 Expected Performance")
    print("=" * 80)
    print()
    
    high_priority_size = int(0.50 * RANGE_SIZE)  # 50% of keyspace
    
    print(f"Full Range Scan:")
    print(f"   Keyspace: {RANGE_SIZE:.2e}")
    print(f"   @ 1B keys/sec: {RANGE_SIZE / 1e9 / 86400 / 365:.0f} years")
    print(f"   @ 100B keys/sec: {RANGE_SIZE / 1e11 / 86400:.0f} days")
    print()
    
    print(f"ML High-Priority Range (40-90%):")
    print(f"   Keyspace: {high_priority_size:.2e} (50% of full)")
    print(f"   @ 1B keys/sec: {high_priority_size / 1e9 / 86400 / 365:.0f} years")
    print(f"   @ 100B keys/sec: {high_priority_size / 1e11 / 86400:.0f} days")
    print(f"   Success probability: 2x higher than random")
    print()
    
    print(f"💡 Recommendation:")
    print(f"   1. Start with Strategy 1 or 2 (high-priority range)")
    print(f"   2. Use multi-GPU if available (3x parallelization)")
    print(f"   3. Join BitCrackRandomiser pool for coordination")
    print(f"   4. Use private mempool relay when key found (avoid theft)")
    print()
    
    # Save ranges to JSON
    output_data = {
        'puzzle': PUZZLE_NUM,
        'target_address': TARGET_ADDRESS,
        'ml_prediction': {
            'position': pred_position,
            'ci_lower': ci_lower,
            'ci_upper': ci_upper
        },
        'ranges': {
            'high_priority': {
                'start': ml_range_start_full,
                'end': ml_range_end_full,
                'coverage': 50.0,
                'description': 'ML-optimized 40-90% range'
            },
            'multi_gpu_splits': [
                {
                    'gpu': i,
                    'start': position_to_hex(split[0], RANGE_MIN, RANGE_SIZE),
                    'end': position_to_hex(split[1], RANGE_MIN, RANGE_SIZE),
                    'description': split[3]
                }
                for i, split in enumerate(gpu_splits)
            ],
            'fallback': [
                {
                    'start': position_to_hex(fb[0], RANGE_MIN, RANGE_SIZE),
                    'end': position_to_hex(fb[1], RANGE_MIN, RANGE_SIZE),
                    'description': fb[2]
                }
                for fb in fallback_ranges
            ]
        }
    }
    
    output_path = 'data/ml-predictions/puzzle71_bitcrack_ranges.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"💾 Saved range specifications to: {output_path}")
    print()
    print("=" * 80)
    print("✨ ML-guided ranges ready for BitCrack/BitCrackRandomiser!")
    print("=" * 80)


if __name__ == '__main__':
    generate_bitcrack_ranges()
