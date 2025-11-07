"""
MEV-Aware Profit Calculation Example

Demonstrates how to use the MEV profit calculator to adjust arbitrage
profits based on game-theoretic MEV risk modeling.

This example shows:
1. Basic profit calculation with MEV risk
2. Comparison across different transaction types
3. Impact of mempool congestion on profits
4. Risk analysis and decision making
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.mev.profit_calculator import (
    ProfitCalculator,
    TransactionType,
    MempoolSimulator
)


def basic_profit_calculation():
    """Demonstrate basic MEV-aware profit calculation"""
    print("=" * 70)
    print("BASIC MEV-AWARE PROFIT CALCULATION")
    print("=" * 70)
    
    calculator = ProfitCalculator()
    
    # Example arbitrage opportunity
    revenue = 1.5  # ETH
    gas_cost = 0.05  # ETH
    tx_value = 1.0  # ETH
    
    # Calculate profit for different mempool congestion levels
    congestion_levels = {
        "Low": 0.2,
        "Medium": 0.5,
        "High": 0.8
    }
    
    for label, congestion in congestion_levels.items():
        profit = calculator.calculate_profit(
            revenue=revenue,
            gas_cost=gas_cost,
            tx_value=tx_value,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=congestion
        )
        
        print(f"\n{label} Congestion (level: {congestion}):")
        print(f"  Gross Profit:     {profit['gross_profit']:.6f} ETH")
        print(f"  MEV Risk:         {profit['mev_risk']:.6f} ETH")
        print(f"  Adjusted Profit:  {profit['adjusted_profit']:.6f} ETH")
        print(f"  Risk Ratio:       {profit['risk_ratio']:.2%}")
        print(f"  Net Margin:       {profit['net_profit_margin']:.2%}")


def transaction_type_comparison():
    """Compare MEV risk across different transaction types"""
    print("\n" + "=" * 70)
    print("TRANSACTION TYPE COMPARISON")
    print("=" * 70)
    
    calculator = ProfitCalculator()
    
    # Standard parameters
    revenue = 2.0
    gas_cost = 0.1
    tx_value = 1.5
    congestion = 0.5
    
    print(f"\nRevenue: {revenue} ETH | Gas: {gas_cost} ETH | Value: {tx_value} ETH")
    print(f"Mempool Congestion: {congestion}\n")
    
    for tx_type in TransactionType:
        profit = calculator.calculate_profit(
            revenue=revenue,
            gas_cost=gas_cost,
            tx_value=tx_value,
            tx_type=tx_type,
            mempool_congestion=congestion
        )
        
        print(f"{tx_type.name:25} | "
              f"MEV Risk: {profit['mev_risk']:8.6f} ETH | "
              f"Adjusted Profit: {profit['adjusted_profit']:8.6f} ETH")


def mempool_simulation():
    """Run comprehensive mempool simulation"""
    print("\n" + "=" * 70)
    print("MEMPOOL SIMULATION")
    print("=" * 70)
    
    calculator = ProfitCalculator()
    simulator = MempoolSimulator()
    
    print("\nRunning simulation across multiple scenarios...")
    results = simulator.run_simulation(calculator)
    
    # Analyze results
    print(f"\nTotal scenarios simulated: {len(results)}")
    
    # Find best and worst scenarios
    best = max(results, key=lambda x: x['adjusted_profit'])
    worst = min(results, key=lambda x: x['adjusted_profit'])
    
    print("\nBest Scenario:")
    print(f"  Type: {best['tx_type']}")
    print(f"  Congestion: {best['congestion']}")
    print(f"  Tx Value: {best['tx_value']:.2f} ETH")
    print(f"  Adjusted Profit: {best['adjusted_profit']:.6f} ETH")
    
    print("\nWorst Scenario:")
    print(f"  Type: {worst['tx_type']}")
    print(f"  Congestion: {worst['congestion']}")
    print(f"  Tx Value: {worst['tx_value']:.2f} ETH")
    print(f"  Adjusted Profit: {worst['adjusted_profit']:.6f} ETH")
    
    # Calculate average metrics by transaction type
    print("\nAverage Metrics by Transaction Type:")
    for tx_type in TransactionType:
        type_results = [r for r in results if r['tx_type'] == tx_type.name]
        avg_profit = sum(r['adjusted_profit'] for r in type_results) / len(type_results)
        avg_risk = sum(r['mev_risk'] for r in type_results) / len(type_results)
        
        print(f"  {tx_type.name:25} | "
              f"Avg Profit: {avg_profit:8.6f} ETH | "
              f"Avg Risk: {avg_risk:8.6f} ETH")


def risk_based_decision():
    """Demonstrate risk-based decision making"""
    print("\n" + "=" * 70)
    print("RISK-BASED DECISION MAKING")
    print("=" * 70)
    
    calculator = ProfitCalculator()
    
    # Set risk tolerance threshold
    max_acceptable_risk_ratio = 0.10  # 10% of revenue
    
    print(f"\nRisk Tolerance: {max_acceptable_risk_ratio:.1%} of revenue")
    print("\nEvaluating opportunities:\n")
    
    opportunities = [
        {"name": "Small Safe Arb", "revenue": 0.5, "gas": 0.02, "value": 0.3, "congestion": 0.2},
        {"name": "Medium Risk Arb", "revenue": 2.0, "gas": 0.1, "value": 1.5, "congestion": 0.6},
        {"name": "Large High Risk", "revenue": 10.0, "gas": 0.5, "value": 8.0, "congestion": 0.9},
    ]
    
    for opp in opportunities:
        profit = calculator.calculate_profit(
            revenue=opp["revenue"],
            gas_cost=opp["gas"],
            tx_value=opp["value"],
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=opp["congestion"]
        )
        
        decision = "✓ EXECUTE" if profit['risk_ratio'] <= max_acceptable_risk_ratio else "✗ SKIP"
        
        print(f"{opp['name']:20} | "
              f"Profit: {profit['adjusted_profit']:6.4f} ETH | "
              f"Risk: {profit['risk_ratio']:5.1%} | "
              f"{decision}")


def main():
    """Run all examples"""
    print("\n" + "=" * 70)
    print("MEV-AWARE PROFIT CALCULATION EXAMPLES")
    print("Integrated from AxionCitadel")
    print("=" * 70)
    
    try:
        basic_profit_calculation()
        transaction_type_comparison()
        mempool_simulation()
        risk_based_decision()
        
        print("\n" + "=" * 70)
        print("All examples completed successfully!")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\nError running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
