import numpy as np
from .transaction_type import TransactionType

class MEVRiskModel:
    """Quantifies MEV leakage risk based on game-theoretic parameters"""
    def __init__(self):
        # Base risk parameters (calibratable)
        self.params = {
            'base_risk': 0.001,  # ETH
            'value_sensitivity': 0.15,
            'mempool_congestion_factor': 0.3,
            'searcher_density': 0.25,
            'frontrun_probability': {
                TransactionType.ARBITRAGE: 0.7,
                TransactionType.LIQUIDITY_PROVISION: 0.2,
                TransactionType.FLASH_LOAN: 0.8,
                TransactionType.FRONT_RUNNABLE: 0.9
            }
        }

    def calculate_risk(self,
                       tx_value: float,
                       gas_price: float,
                       tx_type: TransactionType,
                       mempool_congestion: float) -> float:
        """Calculate MEV leakage risk using game-theoretic model"""
        # Base probability of exploitation
        p_exploit = self.params['frontrun_probability'][tx_type]

        # Strategic adjustment factors
        value_factor = self.params['value_sensitivity'] * np.log1p(tx_value)
        congestion_factor = self.params['mempool_congestion_factor'] * mempool_congestion

        # Searcher competition effect (more searchers → higher risk)
        competition_factor = 1 + np.tanh(self.params['searcher_density'] * 3)

        # Final risk calculation
        risk = (self.params['base_risk'] +
                (p_exploit * value_factor * competition_factor) /
                (1 + congestion_factor))

        # Cap risk at 95% of tx value, but ensure base_risk is respected if tx_value is 0
        return risk if tx_value == 0 else min(risk, tx_value * 0.95)
