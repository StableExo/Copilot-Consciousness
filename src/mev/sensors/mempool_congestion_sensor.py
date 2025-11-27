"""
Mempool Congestion Sensor - Real-time MEV Risk Monitoring

Extracted from AxionCitadel - Operation First Light validated
Monitors mempool congestion to adjust MEV risk calculations dynamically

Metrics:
1. Pending transactions ratio (mempool depth)
2. Gas usage deviation (block fullness variance)
3. Base fee velocity (EIP-1559 dynamics)

Returns: Congestion score (0.0 - 1.0)
"""

from web3 import Web3
import statistics
from typing import Tuple, List


class MempoolCongestionSensor:
    """Real-time mempool congestion monitoring for MEV risk adjustment"""
    
    def __init__(self, rpc_url: str, window_size: int = 5, weights: Tuple[float, float, float] = (0.4, 0.3, 0.3)):
        """\n        Initialize mempool congestion sensor\n        
        Args:\n            rpc_url: Web3 RPC endpoint URL (e.g., Arbitrum, Ethereum)\n            window_size: Number of blocks to analyze for historical trends\n            weights: Tuple of (pending_ratio_weight, gas_deviation_weight, fee_velocity_weight)\n        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.window_size = window_size
        self.weights = weights
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC endpoint: {rpc_url}")
    
    def get_congestion_score(self) -> float:
        """\n        Calculate real-time mempool congestion score\n        
        Returns:\n            Congestion score (0.0 = empty, 1.0 = extremely congested)\n        """
        try:
            pending_ratio = self._calculate_pending_ratio() 
            gas_deviation = self._calculate_gas_deviation() 
            fee_velocity = self._calculate_fee_velocity() 
            
            congestion_score = (
                self.weights[0] * pending_ratio +
                self.weights[1] * min(gas_deviation, 1.0) +
                self.weights[2] * min(abs(fee_velocity), 1.0)
            )
            
            return min(congestion_score, 1.0)
            
        except Exception as e:
            print(f"Error in get_congestion_score: {e}")
            return 0.5
    
    def _calculate_pending_ratio(self) -> float:
        """Calculate ratio of pending transactions to block capacity"""
        try:
            pending_block = self.w3.eth.get_block('pending', full_transactions=True)
            pending_count = len(pending_block.transactions)
            
            latest_block = self.w3.eth.get_block('latest')
            tx_per_block = len(latest_block.transactions) if latest_block.transactions else 1
            
            pending_ratio = min(pending_count / max(tx_per_block * 10, 1), 1.0)
            return pending_ratio
            
        except Exception:
            return 0.0
    
    def _calculate_gas_deviation(self) -> float:
        """Calculate gas usage deviation across recent blocks"""
        try:
            blocks = self._fetch_recent_blocks()
            
            if not blocks:
                return 0.0
            
            gas_ratios = [b.gasUsed / b.gasLimit for b in blocks if b.gasLimit > 0]
            
            if len(gas_ratios) < 2:
                return 0.0
            
            gas_deviation = statistics.stdev(gas_ratios) * 2
            return gas_deviation
            
        except Exception:
            return 0.0
    
    def _calculate_fee_velocity(self) -> float:
        """Calculate base fee velocity (rate of change)"""
        try:
            blocks = self._fetch_recent_blocks()
            base_fees = [b.baseFeePerGas for b in blocks if b.baseFeePerGas is not None]
            
            if len(base_fees) < 2:
                return 0.0
            
            if base_fees[-1] > 0:
                fee_velocity = (base_fees[0] - base_fees[-1]) / base_fees[-1]
            else:
                fee_velocity = 0.0 if base_fees[0] == 0 else 1.0
            
            return fee_velocity
            
        except Exception:
            return 0.0
    
    def _fetch_recent_blocks(self) -> List:
        """Fetch recent blocks for analysis"""
        blocks = []
        current_block_number = self.w3.eth.block_number
        
        for i in range(self.window_size):
            if current_block_number - i >= 0:
                block = self.w3.eth.get_block(current_block_number - i)
                blocks.append(block)
            else:
                break
        
        return blocks
    
    def get_metrics(self) -> dict:
        """Get detailed congestion metrics for debugging/monitoring"""
        return {
            "congestion_score": self.get_congestion_score(),
            "pending_ratio": self._calculate_pending_ratio(),
            "gas_deviation": self._calculate_gas_deviation(),
            "fee_velocity": self._calculate_fee_velocity(),
            "window_size": self.window_size,
            "weights": self.weights
        }