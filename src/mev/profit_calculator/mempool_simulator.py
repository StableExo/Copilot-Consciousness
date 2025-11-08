import numpy as np
from .transaction_type import TransactionType
from .profit_calculator import ProfitCalculator

class MempoolSimulator:
    """Simulates mempool conditions for stress testing"""
    def __init__(self):
        self.congestion_levels = [0.1, 0.5, 0.9]  # Low, Medium, High
        self.tx_values = np.linspace(0.1, 100, 5)  # ETH

    def run_simulation(self, calculator: ProfitCalculator):
        results = []
        for congestion in self.congestion_levels:
            for value in self.tx_values:
                for tx_type in TransactionType:
                    res = calculator.calculate_profit(
                        revenue=value * 1.1,  # 10% expected profit
                        gas_cost=0.01 * value,
                        tx_value=value,
                        tx_type=tx_type,
                        mempool_congestion=congestion
                    )
                    res.update({
                        "tx_type": tx_type.name,
                        "congestion": congestion,
                        "tx_value": value
                    })
                    results.append(res)
        return results
