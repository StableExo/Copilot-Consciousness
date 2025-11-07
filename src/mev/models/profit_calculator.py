"""
MEV-Aware Profit Calculator

Extracted from AxionCitadel - Operation First Light validated
Calculates adjusted profit accounting for MEV leakage risk
"""

from .mev_risk_model import MEVRiskModel
from .transaction_type import TransactionType
from typing import Dict


class ProfitCalculator:
    """MEV-aware profit calculator with game-theoretic risk modeling"""
    
    def __init__(self):
        """Initialize profit calculator with MEV risk model"""
        self.risk_model = MEVRiskModel()
    
    def calculate_profit(
        self,
        revenue: float,
        gas_cost: float,
        tx_value: float,
        tx_type: TransactionType,
        mempool_congestion: float = 0.5
    ) -> Dict[str, float]:
        """Calculate adjusted profit with MEV risk deduction"""
        if revenue < 0 or gas_cost < 0 or tx_value < 0:
            raise ValueError("Negative values not permitted")
        
        mev_risk = self.risk_model.calculate_risk(
            tx_value=tx_value,
            gas_price=gas_cost,
            tx_type=tx_type,
            mempool_congestion=mempool_congestion
        )
        
        gross_profit = revenue - gas_cost
        adjusted_profit = gross_profit - mev_risk
        revenue_safe = revenue + 1e-9
        
        return {
            "gross_profit": gross_profit,
            "adjusted_profit": adjusted_profit,
            "mev_risk": mev_risk,
            "risk_ratio": mev_risk / revenue_safe,
            "net_profit_margin": adjusted_profit / revenue_safe
        }
    
    def get_risk_model(self) -> MEVRiskModel:
        """Get underlying MEV risk model for calibration"""
        return self.risk_model
