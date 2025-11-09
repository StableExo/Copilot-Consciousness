"""
Searcher Density Sensor - MEV Bot Activity Detection

Extracted from AxionCitadel - Operation First Light validated
Monitors MEV bot activity to adjust risk calculations dynamically

Metrics:
1. MEV transaction ratio (MEV txs / total txs)
2. Sandwich attack likelihood (gas price variance analysis)
3. Bot clustering (high-gas-paying address concentration)

Returns: Searcher density score (0.0 - 1.0)
"""

from web3 import Web3
from typing import List, Dict, Set, Tuple
import statistics


class SearcherDensitySensor:
    """Real-time MEV bot activity monitoring for risk adjustment"""
    
    def __init__(self, rpc_url: str, routers: List[str], window_size: int = 10, weights: Tuple[float, float, float] = (0.4, 0.4, 0.2)):
        """
        Initialize searcher density sensor
        
        Args:
            rpc_url: Web3 RPC endpoint URL
            routers: List of known DEX router addresses to monitor
            window_size: Number of blocks to analyze
            weights: Tuple of (mev_ratio_weight, sandwich_weight, clustering_weight)
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.routers = [r.lower() for r in routers]
        self.window_size = window_size
        self.weights = weights
        self.high_gas_threshold = 5.0  # Dynamic threshold for high-gas transactions
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC endpoint: {rpc_url}")
    
    def get_searcher_density(self) -> float:
        """
        Calculate real-time searcher density score
        
        Returns:
            Searcher density score (0.0 = no MEV activity, 1.0 = extreme MEV activity)
        """
        try:
            mev_ratio = self._calculate_mev_transaction_ratio()
            sandwich_score = self._calculate_sandwich_attack_score()
            clustering_score = self._analyze_bot_clustering()
            
            density_score = (
                self.weights[0] * mev_ratio +
                self.weights[1] * sandwich_score +
                self.weights[2] * clustering_score
            )
            
            return min(density_score, 1.0)
            
        except Exception as e:
            print(f"Error in get_searcher_density: {e}")
            return 0.5
    
    def _calculate_mev_transaction_ratio(self) -> float:
        """Calculate ratio of MEV transactions to total transactions"""
        try:
            blocks = self._fetch_recent_blocks()
            total_txs = 0
            mev_txs = 0
            
            for block in blocks:
                if not hasattr(block, 'transactions') or not block.transactions:
                    continue
                    
                total_txs += len(block.transactions)
                
                # Count transactions interacting with DEX routers as potential MEV
                for tx_hash in block.transactions:
                    tx = self.w3.eth.get_transaction(tx_hash)
                    if tx and tx.to and tx.to.lower() in self.routers:
                        mev_txs += 1
            
            if total_txs == 0:
                return 0.0
            
            return min(mev_txs / total_txs, 1.0)
            
        except Exception as e:
            print(f"Error in _calculate_mev_transaction_ratio: {e}")
            return 0.0
    
    def _calculate_sandwich_attack_score(self) -> float:
        """
        Detect sandwich attack likelihood via gas price clustering
        High variance in gas prices indicates potential sandwich attacks
        """
        try:
            blocks = self._fetch_recent_blocks()
            gas_prices = []
            
            for block in blocks:
                if not hasattr(block, 'transactions') or not block.transactions:
                    continue
                
                for tx_hash in block.transactions:
                    try:
                        tx = self.w3.eth.get_transaction(tx_hash)
                        if tx and tx.to and tx.to.lower() in self.routers:
                            gas_price_gwei = self.w3.from_wei(tx.gasPrice, 'gwei')
                            gas_prices.append(float(gas_price_gwei))
                    except Exception:
                        continue
            
            if len(gas_prices) < 2:
                return 0.0
            
            # Calculate coefficient of variation (CV)
            mean_gas = statistics.mean(gas_prices)
            std_gas = statistics.stdev(gas_prices)
            
            if mean_gas == 0:
                return 0.0
            
            cv = std_gas / mean_gas
            
            # Normalize CV to 0-1 range (CV > 1.0 indicates high variance)
            sandwich_score = min(cv, 1.0)
            
            return sandwich_score
            
        except Exception as e:
            print(f"Error in _calculate_sandwich_attack_score: {e}")
            return 0.0
    
    def _analyze_bot_clustering(self) -> float:
        """
        Analyze concentration of high-gas-paying addresses
        More concentrated activity indicates higher bot density
        """
        try:
            blocks = self._fetch_recent_blocks()
            high_gas_addresses: Set[str] = set()
            total_addresses: Set[str] = set()
            
            # Calculate average gas price first
            gas_prices = []
            for block in blocks:
                if not hasattr(block, 'transactions') or not block.transactions:
                    continue
                
                for tx_hash in block.transactions:
                    try:
                        tx = self.w3.eth.get_transaction(tx_hash)
                        if tx and tx.to and tx.to.lower() in self.routers:
                            gas_price_gwei = self.w3.from_wei(tx.gasPrice, 'gwei')
                            gas_prices.append(float(gas_price_gwei))
                    except Exception:
                        continue
            
            if not gas_prices:
                return 0.0
            
            avg_gas = statistics.mean(gas_prices)
            
            # Identify high-gas addresses
            for block in blocks:
                if not hasattr(block, 'transactions') or not block.transactions:
                    continue
                
                for tx_hash in block.transactions:
                    try:
                        tx = self.w3.eth.get_transaction(tx_hash)
                        if tx and tx.to and tx.to.lower() in self.routers:
                            total_addresses.add(tx['from'].lower())
                            
                            gas_price_gwei = self.w3.from_wei(tx.gasPrice, 'gwei')
                            if gas_price_gwei > avg_gas * self.high_gas_threshold:
                                high_gas_addresses.add(tx['from'].lower())
                    except Exception:
                        continue
            
            if len(total_addresses) == 0:
                return 0.0
            
            # Calculate clustering score
            clustering_ratio = len(high_gas_addresses) / len(total_addresses)
            
            # Normalize: cap at 50 active addresses for max score
            normalized_score = min(len(high_gas_addresses) / 50.0, 1.0)
            
            # Combine ratio and absolute count
            clustering_score = (clustering_ratio + normalized_score) / 2
            
            return min(clustering_score, 1.0)
            
        except Exception as e:
            print(f"Error in _analyze_bot_clustering: {e}")
            return 0.0
    
    def _fetch_recent_blocks(self) -> List:
        """Fetch recent blocks for analysis"""
        blocks = []
        current_block_number = self.w3.eth.block_number
        
        for i in range(self.window_size):
            if current_block_number - i >= 0:
                try:
                    block = self.w3.eth.get_block(current_block_number - i, full_transactions=False)
                    blocks.append(block)
                except Exception:
                    continue
            else:
                break
        
        return blocks
    
    def get_metrics(self) -> Dict:
        """Get detailed searcher density metrics for debugging/monitoring"""
        return {
            "searcher_density": self.get_searcher_density(),
            "mev_transaction_ratio": self._calculate_mev_transaction_ratio(),
            "sandwich_attack_score": self._calculate_sandwich_attack_score(),
            "bot_clustering_score": self._analyze_bot_clustering(),
            "window_size": self.window_size,
            "weights": self.weights,
            "monitored_routers": len(self.routers)
        }


if __name__ == '__main__':
    # Example usage
    routers = [
        '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',  # Uniswap V3 Router 2
        '0xE592427A0AEce92De3Edee1F18E0157C05861564',  # Uniswap V3 Router
        '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'   # SushiSwap Router
    ]
    
    # This would require a valid RPC URL
    # sensor = SearcherDensitySensor('https://arb1.arbitrum.io/rpc', routers)
    # print(sensor.get_metrics())
