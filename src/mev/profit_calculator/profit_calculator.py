from .mev_risk_model import MEVRiskModel
from .transaction_type import TransactionType
from typing import Dict

class ProfitCalculator:
    """MEV-aware profit calculator with game-theoretic risk modeling"""
    def __init__(self):
        self.risk_model = MEVRiskModel()

    def calculate_profit(self,
                        revenue: float,
                        gas_cost: float,
                        tx_value: float,
                        tx_type: TransactionType,
                        mempool_congestion: float = 0.5) -> Dict[str, float]:
        """Calculate adjusted profit with MEV risk"""
        # Validate inputs
        if revenue < 0 or gas_cost < 0 or tx_value < 0:
            raise ValueError("Negative values not permitted")

        # Calculate MEV leakage risk
        mev_risk = self.risk_model.calculate_risk(
            tx_value, gas_cost, tx_type, mempool_congestion
        )

        # Core profit calculation
        adjusted_profit = revenue - gas_cost - mev_risk

        return {
            "gross_profit": revenue - gas_cost,
            "adjusted_profit": adjusted_profit,
            "mev_risk": mev_risk,
            "risk_ratio": mev_risk / (revenue + 1e-9),  # Avoid division by zero
            "net_profit_margin": adjusted_profit / (revenue + 1e-9)
        }
