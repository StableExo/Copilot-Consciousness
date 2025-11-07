"""
Mempool Monitor Service - Real-time Mempool Surveillance

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

Real-time mempool surveillance and congestion scoring based on EIP-1559
base fee changes, with configurable block window and parallel fetching.
"""

from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from collections import deque
import asyncio
from datetime import datetime


@dataclass
class BlockInfo:
    """
    Block information for congestion analysis.
    
    Attributes:
        block_number: Block number
        timestamp: Block timestamp
        base_fee_per_gas: EIP-1559 base fee (in Wei)
        gas_used: Gas used in block
        gas_limit: Block gas limit
        transaction_count: Number of transactions
    """
    block_number: int
    timestamp: int
    base_fee_per_gas: int
    gas_used: int
    gas_limit: int
    transaction_count: int


@dataclass
class MempoolTransaction:
    """
    Pending transaction in mempool.
    
    Attributes:
        tx_hash: Transaction hash
        from_address: Sender address
        to_address: Recipient address
        value: Transaction value (in Wei)
        gas_price: Gas price (legacy)
        max_fee_per_gas: Max fee (EIP-1559)
        max_priority_fee_per_gas: Max priority fee (EIP-1559)
        data: Transaction data
    """
    tx_hash: str
    from_address: str
    to_address: Optional[str]
    value: int
    gas_price: Optional[int]
    max_fee_per_gas: Optional[int]
    max_priority_fee_per_gas: Optional[int]
    data: str


class MempoolMonitorService:
    """
    Real-time mempool surveillance and congestion scoring.
    
    Features:
    - Congestion scoring based on base fee changes (EIP-1559)
    - Configurable block window for fee analysis (default 5 blocks)
    - Scales congestion from 0.0 (calm) to 1.0 (very congested)
    - Event subscription for new transactions
    - Parallel block fetching for performance
    """
    
    def __init__(
        self,
        web3_provider: Optional[Any] = None,
        block_window: int = 5,  # Number of blocks for congestion analysis
        update_interval: int = 2,  # Seconds between updates
        max_mempool_size: int = 1000  # Max pending txs to track
    ):
        """
        Initialize mempool monitor service.
        
        Args:
            web3_provider: Web3 provider instance (placeholder)
            block_window: Number of blocks to analyze for congestion
            update_interval: Seconds between monitoring updates
            max_mempool_size: Maximum pending transactions to track
        """
        self.web3 = web3_provider
        self.block_window = block_window
        self.update_interval = update_interval
        self.max_mempool_size = max_mempool_size
        
        # Block history for congestion analysis
        self.block_history: deque[BlockInfo] = deque(maxlen=block_window)
        
        # Pending transactions
        self.pending_txs: Dict[str, MempoolTransaction] = {}
        
        # Congestion metrics
        self.current_congestion_score: float = 0.0
        self.avg_base_fee: int = 0
        self.base_fee_trend: str = "stable"  # stable, rising, falling
        
        # Event subscribers
        self.tx_subscribers: List[Callable] = []
        
        # Monitoring state
        self.is_monitoring = False
        self.monitor_task: Optional[asyncio.Task] = None
        
        # Statistics
        self.stats = {
            "blocks_analyzed": 0,
            "txs_seen": 0,
            "high_congestion_periods": 0,
            "avg_congestion": 0.0
        }
        
        print(f"MempoolMonitorService initialized: block_window={block_window}, "
              f"update_interval={update_interval}s")
    
    async def start_monitoring(self) -> None:
        """Start monitoring the mempool"""
        if self.is_monitoring:
            print("Monitoring already active")
            return
        
        self.is_monitoring = True
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        print("Mempool monitoring started")
    
    async def stop_monitoring(self) -> None:
        """Stop monitoring the mempool"""
        if not self.is_monitoring:
            return
        
        self.is_monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        print("Mempool monitoring stopped")
    
    async def _monitor_loop(self) -> None:
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                # Fetch latest block
                await self._fetch_latest_block()
                
                # Update congestion score
                self.current_congestion_score = self._calculate_congestion_score()
                
                # Fetch pending transactions
                await self._fetch_pending_transactions()
                
                # Update statistics
                self._update_statistics()
                
                # Wait before next update
                await asyncio.sleep(self.update_interval)
                
            except Exception as e:
                print(f"Error in monitor loop: {e}")
                await asyncio.sleep(self.update_interval)
    
    async def _fetch_latest_block(self) -> None:
        """Fetch the latest block and add to history"""
        if not self.web3:
            # Placeholder when no web3 provider
            block_info = BlockInfo(
                block_number=1000000,
                timestamp=int(datetime.now().timestamp()),
                base_fee_per_gas=50_000_000_000,  # 50 Gwei
                gas_used=15_000_000,
                gas_limit=30_000_000,
                transaction_count=200
            )
        else:
            # In production: fetch real block data
            # block = await self.web3.eth.get_block('latest')
            block_info = BlockInfo(
                block_number=1000000,
                timestamp=int(datetime.now().timestamp()),
                base_fee_per_gas=50_000_000_000,
                gas_used=15_000_000,
                gas_limit=30_000_000,
                transaction_count=200
            )
        
        self.block_history.append(block_info)
        self.stats["blocks_analyzed"] += 1
    
    def _calculate_congestion_score(self) -> float:
        """
        Calculate congestion score based on base fee changes.
        
        Congestion scoring:
        - Analyzes base fee changes over block window
        - Rising fees = higher congestion
        - High gas usage = higher congestion
        - Scores from 0.0 (calm) to 1.0 (very congested)
        
        Returns:
            Congestion score (0.0 to 1.0)
        """
        if len(self.block_history) < 2:
            return 0.0
        
        blocks = list(self.block_history)
        
        # Calculate base fee change rate
        base_fees = [b.base_fee_per_gas for b in blocks]
        avg_fee = sum(base_fees) / len(base_fees)
        self.avg_base_fee = int(avg_fee)
        
        # Calculate fee trend (% change from first to last)
        fee_change_pct = (
            (base_fees[-1] - base_fees[0]) / max(base_fees[0], 1) * 100
        )
        
        # Determine trend
        if fee_change_pct > 10:
            self.base_fee_trend = "rising"
        elif fee_change_pct < -10:
            self.base_fee_trend = "falling"
        else:
            self.base_fee_trend = "stable"
        
        # Calculate gas utilization (avg across window)
        gas_utilizations = [
            b.gas_used / max(b.gas_limit, 1) 
            for b in blocks
        ]
        avg_utilization = sum(gas_utilizations) / len(gas_utilizations)
        
        # Combine metrics into congestion score
        # Base fee component (normalized to 0-0.5)
        fee_component = min(abs(fee_change_pct) / 100, 0.5)
        
        # Utilization component (0-0.5)
        utilization_component = avg_utilization * 0.5
        
        # Total score
        congestion_score = fee_component + utilization_component
        
        # Clamp to 0-1
        return min(max(congestion_score, 0.0), 1.0)
    
    async def _fetch_pending_transactions(self) -> None:
        """Fetch pending transactions from mempool"""
        if not self.web3:
            # Placeholder when no web3 provider
            return
        
        # In production:
        # pending = await self.web3.eth.get_pending_transactions()
        # Process and store up to max_mempool_size
        
        # For now, just log
        # print(f"Pending transactions: {len(self.pending_txs)}")
        pass
    
    def subscribe_to_transactions(
        self,
        callback: Callable[[MempoolTransaction], None]
    ) -> None:
        """
        Subscribe to new pending transactions.
        
        Args:
            callback: Function to call when new transaction detected
        """
        self.tx_subscribers.append(callback)
        print(f"Added transaction subscriber (total: {len(self.tx_subscribers)})")
    
    def _notify_subscribers(self, tx: MempoolTransaction) -> None:
        """
        Notify all subscribers of a new transaction.
        
        Args:
            tx: New pending transaction
        """
        for callback in self.tx_subscribers:
            try:
                callback(tx)
            except Exception as e:
                print(f"Error in subscriber callback: {e}")
    
    def get_congestion_level(self) -> str:
        """
        Get human-readable congestion level.
        
        Returns:
            Congestion level string
        """
        score = self.current_congestion_score
        
        if score < 0.2:
            return "low"
        elif score < 0.4:
            return "moderate"
        elif score < 0.7:
            return "high"
        else:
            return "very_high"
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """
        Get current mempool metrics.
        
        Returns:
            Dictionary of current metrics
        """
        return {
            "congestion_score": self.current_congestion_score,
            "congestion_level": self.get_congestion_level(),
            "avg_base_fee": self.avg_base_fee,
            "base_fee_trend": self.base_fee_trend,
            "pending_txs": len(self.pending_txs),
            "blocks_in_window": len(self.block_history),
            "latest_block": (
                self.block_history[-1].block_number 
                if self.block_history else None
            )
        }
    
    def _update_statistics(self) -> None:
        """Update running statistics"""
        # Track high congestion periods
        if self.current_congestion_score > 0.7:
            self.stats["high_congestion_periods"] += 1
        
        # Update average congestion (running average)
        n = self.stats["blocks_analyzed"]
        if n > 0:
            old_avg = self.stats["avg_congestion"]
            self.stats["avg_congestion"] = (
                (old_avg * (n - 1) + self.current_congestion_score) / n
            )
    
    async def get_parallel_block_history(
        self,
        start_block: int,
        num_blocks: int
    ) -> List[BlockInfo]:
        """
        Fetch multiple blocks in parallel for performance.
        
        Args:
            start_block: Starting block number
            num_blocks: Number of blocks to fetch
            
        Returns:
            List of BlockInfo objects
        """
        # Create tasks for parallel fetching
        tasks = [
            self._fetch_block(start_block + i)
            for i in range(num_blocks)
        ]
        
        # Fetch in parallel
        blocks = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        valid_blocks = [
            b for b in blocks 
            if isinstance(b, BlockInfo)
        ]
        
        return valid_blocks
    
    async def _fetch_block(self, block_number: int) -> BlockInfo:
        """
        Fetch a specific block.
        
        Args:
            block_number: Block number to fetch
            
        Returns:
            BlockInfo object
        """
        # Placeholder - in production, fetch real block
        return BlockInfo(
            block_number=block_number,
            timestamp=int(datetime.now().timestamp()),
            base_fee_per_gas=50_000_000_000,
            gas_used=15_000_000,
            gas_limit=30_000_000,
            transaction_count=200
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get monitor statistics.
        
        Returns:
            Dictionary of statistics
        """
        return {
            **self.stats,
            "is_monitoring": self.is_monitoring,
            "subscribers": len(self.tx_subscribers)
        }
