from enum import Enum

class TransactionType(Enum):
    ARBITRAGE = 1
    LIQUIDITY_PROVISION = 2
    FLASH_LOAN = 3
    FRONT_RUNNABLE = 4
