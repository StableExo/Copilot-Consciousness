"""
Real-Time MEV Monitoring Example

Demonstrates how to use the MEV sensor hub for real-time monitoring
of mempool congestion and searcher density.

This example shows:
1. Basic sensor usage
2. Real-time monitoring setup
3. Alert generation based on thresholds
4. Integration with profit calculator

Note: This example requires a valid RPC endpoint to function.
"""

import sys
from pathlib import Path
import time

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.mev.sensors import get_mempool_congestion, detect_searcher_density
from src.mev.profit_calculator import ProfitCalculator, TransactionType


def basic_sensor_usage():
    """Demonstrate basic MEV sensor usage"""
    print("=" * 70)
    print("BASIC MEV SENSOR USAGE")
    print("=" * 70)
    
    print("\nNote: This example requires a valid RPC endpoint.")
    print("Set ARBITRUM_RPC_URL in your .env file to run real monitoring.\n")
    
    # Mock sensor data for demonstration
    mock_congestion = 0.65
    mock_searcher_density = 0.42
    
    print(f"Current Mempool Congestion: {mock_congestion:.2%}")
    print(f"Current Searcher Density:   {mock_searcher_density:.2%}")
    
    # Interpret the metrics
    if mock_congestion < 0.3:
        print("\n✓ Low congestion - Good time for arbitrage")
    elif mock_congestion < 0.7:
        print("\n⚠ Medium congestion - Proceed with caution")
    else:
        print("\n✗ High congestion - High MEV risk")
    
    if mock_searcher_density < 0.3:
        print("✓ Low searcher competition")
    elif mock_searcher_density < 0.7:
        print("⚠ Medium searcher competition")
    else:
        print("✗ High searcher competition - Very high frontrun risk")


def monitoring_with_alerts():
    """Demonstrate continuous monitoring with alerts"""
    print("\n" + "=" * 70)
    print("CONTINUOUS MONITORING WITH ALERTS")
    print("=" * 70)
    
    # Alert thresholds
    congestion_alert = 0.8
    searcher_alert = 0.6
    
    print(f"\nAlert Thresholds:")
    print(f"  Congestion: {congestion_alert:.1%}")
    print(f"  Searcher Density: {searcher_alert:.1%}")
    
    print("\nSimulating 10 monitoring cycles...\n")
    
    # Simulate monitoring cycles
    import random
    
    for i in range(10):
        # Mock sensor readings (in real usage, these would come from actual sensors)
        congestion = random.uniform(0.2, 0.95)
        searcher = random.uniform(0.15, 0.85)
        
        timestamp = time.strftime("%H:%M:%S")
        status = "ALERT" if congestion > congestion_alert or searcher > searcher_alert else "OK   "
        
        print(f"[{timestamp}] {status} | "
              f"Congestion: {congestion:5.1%} | "
              f"Searchers: {searcher:5.1%}")
        
        # Generate alerts
        if congestion > congestion_alert:
            print(f"           ⚠ HIGH CONGESTION ALERT: {congestion:.1%}")
        if searcher > searcher_alert:
            print(f"           ⚠ HIGH SEARCHER ACTIVITY: {searcher:.1%}")
        
        time.sleep(0.5)  # Simulate time between readings


def integrated_profit_calculation():
    """Demonstrate integration with profit calculator"""
    print("\n" + "=" * 70)
    print("INTEGRATED PROFIT CALCULATION")
    print("=" * 70)
    
    calculator = ProfitCalculator()
    
    # Simulated sensor readings
    congestion = 0.55
    searcher_density = 0.38
    
    print(f"\nCurrent Network Conditions:")
    print(f"  Congestion: {congestion:.1%}")
    print(f"  Searcher Density: {searcher_density:.1%}")
    
    # Example arbitrage opportunity
    opportunity = {
        "revenue": 1.8,
        "gas_cost": 0.08,
        "tx_value": 1.2
    }
    
    print(f"\nOpportunity Details:")
    print(f"  Expected Revenue: {opportunity['revenue']} ETH")
    print(f"  Gas Cost: {opportunity['gas_cost']} ETH")
    print(f"  Transaction Value: {opportunity['tx_value']} ETH")
    
    # Calculate profit with current network conditions
    profit = calculator.calculate_profit(
        revenue=opportunity['revenue'],
        gas_cost=opportunity['gas_cost'],
        tx_value=opportunity['tx_value'],
        tx_type=TransactionType.ARBITRAGE,
        mempool_congestion=congestion
    )
    
    print(f"\nProfit Analysis:")
    print(f"  Gross Profit:     {profit['gross_profit']:.6f} ETH")
    print(f"  MEV Risk:         {profit['mev_risk']:.6f} ETH")
    print(f"  Adjusted Profit:  {profit['adjusted_profit']:.6f} ETH")
    print(f"  Risk Ratio:       {profit['risk_ratio']:.2%}")
    
    # Decision logic
    min_profit = 0.5  # ETH
    max_risk_ratio = 0.15  # 15%
    
    execute = (profit['adjusted_profit'] >= min_profit and 
               profit['risk_ratio'] <= max_risk_ratio)
    
    print(f"\nDecision Criteria:")
    print(f"  Min Profit: {min_profit} ETH - {'✓' if profit['adjusted_profit'] >= min_profit else '✗'}")
    print(f"  Max Risk: {max_risk_ratio:.1%} - {'✓' if profit['risk_ratio'] <= max_risk_ratio else '✗'}")
    print(f"\n{'✓ EXECUTE ARBITRAGE' if execute else '✗ SKIP OPPORTUNITY'}")


def adaptive_strategy():
    """Demonstrate adaptive strategy based on network conditions"""
    print("\n" + "=" * 70)
    print("ADAPTIVE STRATEGY")
    print("=" * 70)
    
    calculator = ProfitCalculator()
    
    print("\nAdjusting strategy based on network conditions:\n")
    
    scenarios = [
        {"name": "Quiet Network", "congestion": 0.2, "searchers": 0.15},
        {"name": "Normal Activity", "congestion": 0.5, "searchers": 0.45},
        {"name": "High Activity", "congestion": 0.8, "searchers": 0.75},
    ]
    
    base_opportunity = {
        "revenue": 2.0,
        "gas_cost": 0.1,
        "tx_value": 1.5
    }
    
    for scenario in scenarios:
        profit = calculator.calculate_profit(
            revenue=base_opportunity['revenue'],
            gas_cost=base_opportunity['gas_cost'],
            tx_value=base_opportunity['tx_value'],
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=scenario['congestion']
        )
        
        # Adaptive thresholds
        if scenario['congestion'] < 0.3:
            min_profit = 0.3  # Lower threshold in quiet conditions
            strategy = "Aggressive"
        elif scenario['congestion'] < 0.7:
            min_profit = 0.5
            strategy = "Balanced"
        else:
            min_profit = 0.8  # Higher threshold in high congestion
            strategy = "Conservative"
        
        execute = profit['adjusted_profit'] >= min_profit
        
        print(f"{scenario['name']:20} | "
              f"Strategy: {strategy:12} | "
              f"Profit: {profit['adjusted_profit']:6.4f} ETH | "
              f"{'✓ Execute' if execute else '✗ Skip':10}")


def main():
    """Run all examples"""
    print("\n" + "=" * 70)
    print("REAL-TIME MEV MONITORING EXAMPLES")
    print("Integrated from AxionCitadel")
    print("=" * 70)
    
    try:
        basic_sensor_usage()
        monitoring_with_alerts()
        integrated_profit_calculation()
        adaptive_strategy()
        
        print("\n" + "=" * 70)
        print("All examples completed successfully!")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\nError running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
