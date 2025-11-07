"""
MEV Risk Model - Game-Theoretic MEV Leakage Quantification

Extracted from AxionCitadel - Operation First Light validated
Calculates MEV leakage risk using game-theoretic parameters
"""

import numpy as np
from .transaction_type import TransactionType


class MEVRiskModel:
    """Quantifies MEV leakage risk based on game-theoretic parameters"""
    
    def __init__(self):
        """Initialize MEV risk model with calibratable parameters"""
        self.params = {
            'base_risk': 0.001,
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
    
    def calculate_risk(self, tx_value: float, gas_price: float, tx_type: TransactionType, mempool_congestion: float) -> float:
        """Calculate MEV leakage risk using game-theoretic model"""
        p_exploit = self.params['frontrun_probability'][tx_type]
        value_factor = self.params['value_sensitivity'] * np.log1p(tx_value)
        congestion_factor = self.params['mempool_congestion_factor'] * mempool_congestion
        competition_factor = 1 + np.tanh(self.params['searcher_density'] * 3)
        
        risk = (self.params['base_risk'] + (p_exploit * value_factor * competition_factor) / (1 + congestion_factor))
        
        return risk if tx_value == 0 else min(risk, tx_value * 0.95)
    
    def calibrate(self, new_params: dict):
        """Update risk parameters based on live calibration data"""
        for key, value in new_params.items():
            if key in self.params:
                self.params[key] = value
            elif key == 'frontrun_probability':
                self.params['frontrun_probability'].update(value)
    
    def get_params(self) -> dict:
        """Get current risk model parameters"""
        return self.params.copy()