"""
Transaction Type Classification for MEV Risk Modeling

Extracted from AxionCitadel - Operation First Light validated
Each transaction type has different MEV exploitation probabilities
"""

from enum import Enum


class TransactionType(Enum):
    """Transaction types with different MEV risk profiles"""
    ARBITRAGE = 1
    LIQUIDITY_PROVISION = 2
    FLASH_LOAN = 3
    FRONT_RUNNABLE = 4
