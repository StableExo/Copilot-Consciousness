"""
Searcher Density Sensor - MEV Bot Activity Detection

Extracted from AxionCitadel - Operation First Light validated
Quantifies MEV bot competition density for risk adjustment

Metrics:
1. MEV transaction ratio (DEX router interactions)
2. Sandwich attack score (gas price clustering)
3. Bot clustering (high-gas address concentration)

Returns: Searcher density score (0.0 - 1.0)
"""

from web3 import Web3
import numpy as np
from typing import Dict, Set, Tuple


# Predefined MEV-sensitive contracts (update periodically)
DEFAULT_MEV_CONTRACTS = {
    "UNISWAP_V3_ROUTER": "0x68b3465833fb72A70f208F2388Ac69476D97006d",
    "SUSHI_ROUTER": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    "CAMELOT_ROUTER": "0xc873fEcbd354f5A56E00E710B90EF4201db2448d",
    "BALANCER_VAULT": "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
}


class SearcherDensitySensor:
    """Real-time MEV bot activity detection for searcher competition analysis"""
    
    def __init__(self,
        rpc_url: str,
        lookback_blocks: int = 20,
        weights: Tuple[float, float, float] = (0.5, 0.3, 0.2),
        mev_contracts: Dict[str, str] = None
    ):
        """Initialize searcher density sensor"""
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.lookback_blocks = lookback_blocks
        self.weights = weights
        
        contracts = mev_contracts or DEFAULT_MEV_CONTRACTS
        self.mev_contract_addresses = {
            Web3.to_checksum_address(addr) for addr in contracts.values()
        }
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC endpoint: {rpc_url}")
    
    def get_density_score(self) -> float:
        """Calculate real-time MEV searcher density score"""
        try:
            mev_ratio = self._calculate_mev_ratio()
            sandwich_score = self._calculate_sandwich_score()
            clustering = self._calculate_bot_clustering()
            
            density_score = (
                self.weights[0] * mev_ratio +
                self.weights[1] * sandwich_score +
                self.weights[2] * clustering
            )
            
            return min(density_score, 1.0)
            
        except Exception as e:
            print(f"Error in get_density_score: {e}")
            return 0.5
    
    def _calculate_mev_ratio(self) -> float:
        """Calculate ratio of MEV transactions to total transactions"""
        try:
            current_block_number = self.w3.eth.block_number
            mev_tx_count = 0
            total_tx_count = 0
            
            for i in range(self.lookback_blocks):
                if current_block_number - i < 0:
                    break
                
                block = self.w3.eth.get_block(current_block_number - i, full_transactions=True)
                total_tx_count += len(block.transactions)
                
                for tx in block.transactions:
                    if tx.to and Web3.to_checksum_address(tx.to) in self.mev_contract_addresses:
                        mev_tx_count += 1
            
            mev_ratio = mev_tx_count / max(total_tx_count, 1)
            return mev_ratio
            
        except Exception:
            return 0.0
    
    def _calculate_sandwich_score(self) -> float:
        """Calculate sandwich attack probability using gas price variance"""
        try:
            current_block_number = self.w3.eth.block_number
            gas_prices = []
            
            for i in range(min(self.lookback_blocks, 3)):
                if current_block_number - i < 0:
                    break
                
                block = self.w3.eth.get_block(current_block_number - i, full_transactions=True)
                for tx in block.transactions:
                    if tx.gasPrice:
                        gas_prices.append(tx.gasPrice)
            
            if len(gas_prices) < 10:
                return 0.0
            
            mean_gas = np.mean(gas_prices)
            std_gas = np.std(gas_prices)
            
            if mean_gas > 0:
                sandwich_score = min(std_gas / mean_gas, 1.0)
            else:
                sandwich_score = 0.0
            
            return sandwich_score
            
        except Exception:
            return 0.0
    
    def _calculate_bot_clustering(self) -> float:
        """Calculate bot address clustering"""
        try:
            current_block_number = self.w3.eth.block_number
            avg_gas_price = self._get_average_gas_price()
            high_gas_threshold = avg_gas_price * 5
            
            bot_addresses: Set[str] = set()
            
            for i in range(min(self.lookback_blocks, 3)):
                if current_block_number - i < 0:
                    break
                
                block = self.w3.eth.get_block(current_block_number - i, full_transactions=True)
                for tx in block.transactions:
                    if tx.get('from') and tx.gasPrice and tx.gasPrice > high_gas_threshold:
                        bot_addresses.add(tx['from'])
            
            clustering = min(len(bot_addresses) / 50.0, 1.0)
            return clustering
            
        except Exception:
            return 0.0
    
    def _get_average_gas_price(self) -> int:
        """Get average gas price from latest block"""
        try:
            latest_block = self.w3.eth.get_block('latest', full_transactions=True)
            
            if not latest_block.transactions:
                return self.w3.to_wei('0.1', 'gwei')
            
            gas_prices = [tx.gasPrice for tx in latest_block.transactions if tx.gasPrice]
            
            if not gas_prices:
                return self.w3.to_wei('0.1', 'gwei')
            
            return int(np.mean(gas_prices))
            
        except Exception:
            return self.w3.to_wei('0.1', 'gwei')
    
    def get_metrics(self) -> dict:
        """Get detailed searcher density metrics for debugging/monitoring""" 
        return {
            "density_score": self.get_density_score(),
            "mev_ratio": self._calculate_mev_ratio(),
            "sandwich_score": self._calculate_sandwich_score(),
            "bot_clustering": self._calculate_bot_clustering(),
            "lookback_blocks": self.lookback_blocks,
            "weights": self.weights,
            "tracked_contracts": len(self.mev_contract_addresses)
        }