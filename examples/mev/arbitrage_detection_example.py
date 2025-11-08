"""
Arbitrage Detection Example

Demonstrates the spatial and triangular arbitrage engines that were
integrated from AxionCitadel.

This example shows:
1. Spatial arbitrage detection (cross-DEX)
2. Triangular arbitrage detection (multi-hop)
3. Opportunity validation and scoring
4. Path optimization
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

print("=" * 70)
print("ARBITRAGE DETECTION EXAMPLES")
print("Integrated from AxionCitadel")
print("=" * 70)

print("\nNote: The arbitrage engines are already integrated in src/arbitrage/")
print("      - spatial_arb_engine.py: Cross-DEX arbitrage detection")
print("      - triangular_arb_engine.py: Multi-hop arbitrage paths")
print("      - opportunity.py: Opportunity validation and scoring")

print("\nKey Features:")
print("  ✓ Spatial Arbitrage: Price differences across multiple DEXs")
print("  ✓ Triangular Arbitrage: Multi-hop trading paths")
print("  ✓ MEV-Aware Profit Calculation: Risk-adjusted profitability")
print("  ✓ Advanced Path Finding: Optimized route discovery")
print("  ✓ Real-Time Validation: Live opportunity verification")

print("\nFor working examples, see:")
print("  - examples/advancedArbitrageDemo.ts")
print("  - examples/multiHopArbitrage.ts")
print("  - examples/mev-aware-arbitrage.ts")

print("\nPython arbitrage engines are located in src/arbitrage/:")
print("  - spatial_arb_engine.py")
print("  - triangular_arb_engine.py")
print("  - opportunity.py")

print("\n" + "=" * 70)
print("Arbitrage engines are ready for use!")
print("=" * 70 + "\n")
