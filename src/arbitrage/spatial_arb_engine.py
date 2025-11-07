"""
Spatial Arbitrage Engine - Cross-DEX Price Differential Detection

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

Cross-DEX arbitrage detection for same token pairs with price differential
calculations, minimum profit filtering, and multi-DEX pool grouping.
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from .opportunity import ArbitrageOpportunity, ArbitrageType, OpportunityStatus
import uuid
from datetime import datetime


@dataclass
class PoolState:
    """
    State of a liquidity pool.
    
    Attributes:
        pool_address: Pool contract address
        token0: First token address
        token1: Second token address
        reserve0: Reserve of token0
        reserve1: Reserve of token1
        protocol: DEX protocol name
        fee_bps: Pool fee in basis points
    """
    pool_address: str
    token0: str
    token1: str
    reserve0: float
    reserve1: float
    protocol: str
    fee_bps: int = 30  # Default 0.3%


class SpatialArbEngine:
    """
    Spatial arbitrage engine for cross-DEX price differential detection.
    
    Features:
    - Price differential calculations across DEXs
    - 2-step path construction (buy low DEX A, sell high DEX B)
    - Minimum profit margin filtering (BIPS)
    - Multi-DEX pool grouping by token pair
    """
    
    def __init__(
        self,
        min_profit_bips: int = 50,  # Minimum 0.5% profit
        min_liquidity_usd: float = 10000.0,  # Minimum pool liquidity
        supported_protocols: Optional[List[str]] = None
    ):
        """
        Initialize spatial arbitrage engine.
        
        Args:
            min_profit_bips: Minimum profit margin in basis points
            min_liquidity_usd: Minimum pool liquidity in USD
            supported_protocols: List of supported DEX protocols
        """
        self.min_profit_bips = min_profit_bips
        self.min_liquidity_usd = min_liquidity_usd
        self.supported_protocols = supported_protocols or [
            "uniswap_v2", "uniswap_v3", "sushiswap", "camelot"
        ]
        
        # Statistics
        self.stats = {
            "pools_analyzed": 0,
            "opportunities_found": 0,
            "total_profit_potential": 0.0
        }
        
        print(f"SpatialArbEngine initialized: min_profit={min_profit_bips}bps, "
              f"min_liquidity=${min_liquidity_usd}")
    
    def find_opportunities(
        self,
        pools: List[PoolState],
        input_amount: float = 1.0  # Default 1 ETH equivalent
    ) -> List[ArbitrageOpportunity]:
        """
        Find spatial arbitrage opportunities across pools.
        
        Args:
            pools: List of pool states
            input_amount: Amount to trade (in base token units)
            
        Returns:
            List of profitable arbitrage opportunities
        """
        opportunities = []
        
        # Group pools by token pair
        pool_groups = self._group_pools_by_pair(pools)
        
        # Analyze each group for price differentials
        for pair_key, pair_pools in pool_groups.items():
            if len(pair_pools) < 2:
                continue  # Need at least 2 pools for spatial arb
            
            # Find best buy and sell prices
            arbs = self._find_pair_arbitrage(pair_pools, input_amount)
            opportunities.extend(arbs)
            
            self.stats["pools_analyzed"] += len(pair_pools)
        
        self.stats["opportunities_found"] += len(opportunities)
        
        print(f"Found {len(opportunities)} spatial arbitrage opportunities")
        return opportunities
    
    def _group_pools_by_pair(
        self,
        pools: List[PoolState]
    ) -> Dict[str, List[PoolState]]:
        """
        Group pools by token pair (order-independent).
        
        Args:
            pools: List of pool states
            
        Returns:
            Dictionary mapping pair keys to lists of pools
        """
        groups: Dict[str, List[PoolState]] = {}
        
        for pool in pools:
            # Filter by protocol
            if pool.protocol not in self.supported_protocols:
                continue
            
            # Create order-independent pair key
            token_pair = tuple(sorted([pool.token0, pool.token1]))
            pair_key = f"{token_pair[0]}_{token_pair[1]}"
            
            if pair_key not in groups:
                groups[pair_key] = []
            
            groups[pair_key].append(pool)
        
        return groups
    
    def _find_pair_arbitrage(
        self,
        pools: List[PoolState],
        input_amount: float
    ) -> List[ArbitrageOpportunity]:
        """
        Find arbitrage opportunities within a token pair group.
        
        Args:
            pools: Pools for the same token pair
            input_amount: Amount to trade
            
        Returns:
            List of arbitrage opportunities
        """
        opportunities = []
        
        # Compare all pool pairs
        for i, pool_buy in enumerate(pools):
            for pool_sell in pools[i+1:]:
                # Try both directions (token0->token1 and token1->token0)
                for direction in [0, 1]:
                    opp = self._calculate_spatial_arb(
                        pool_buy, pool_sell, input_amount, direction
                    )
                    if opp and opp.profit_bips >= self.min_profit_bips:
                        opportunities.append(opp)
        
        return opportunities
    
    def _calculate_spatial_arb(
        self,
        pool_buy: PoolState,
        pool_sell: PoolState,
        input_amount: float,
        direction: int  # 0: token0->token1, 1: token1->token0
    ) -> Optional[ArbitrageOpportunity]:
        """
        Calculate spatial arbitrage for specific pool pair and direction.
        
        Args:
            pool_buy: Pool to buy from
            pool_sell: Pool to sell to
            input_amount: Input amount
            direction: Trade direction (0 or 1)
            
        Returns:
            ArbitrageOpportunity if profitable, None otherwise
        """
        # Determine tokens based on direction
        if direction == 0:
            token_in = pool_buy.token0
            token_out = pool_buy.token1
            reserve_in_buy = pool_buy.reserve0
            reserve_out_buy = pool_buy.reserve1
            reserve_in_sell = pool_sell.reserve1
            reserve_out_sell = pool_sell.reserve0
        else:
            token_in = pool_buy.token1
            token_out = pool_buy.token0
            reserve_in_buy = pool_buy.reserve1
            reserve_out_buy = pool_buy.reserve0
            reserve_in_sell = pool_sell.reserve0
            reserve_out_sell = pool_sell.reserve1
        
        # Calculate buy output using constant product formula (x * y = k)
        amount_in_with_fee = input_amount * (10000 - pool_buy.fee_bps) / 10000
        numerator = amount_in_with_fee * reserve_out_buy
        denominator = reserve_in_buy + amount_in_with_fee
        amount_out_buy = numerator / denominator
        
        # Calculate sell output
        sell_in_with_fee = amount_out_buy * (10000 - pool_sell.fee_bps) / 10000
        sell_numerator = sell_in_with_fee * reserve_out_sell
        sell_denominator = reserve_in_sell + sell_in_with_fee
        final_amount = sell_numerator / sell_denominator
        
        # Calculate profit
        gross_profit = final_amount - input_amount
        profit_bips = int((gross_profit / input_amount) * 10000) if input_amount > 0 else 0
        
        # Only return if profitable
        if profit_bips < self.min_profit_bips:
            return None
        
        # Create opportunity
        opportunity_id = str(uuid.uuid4())
        
        # Build path
        path = [
            {
                "step": 0,
                "pool_address": pool_buy.pool_address,
                "protocol": pool_buy.protocol,
                "token_in": token_in,
                "token_out": token_out,
                "amount_in": input_amount,
                "expected_output": amount_out_buy,
                "fee_bps": pool_buy.fee_bps
            },
            {
                "step": 1,
                "pool_address": pool_sell.pool_address,
                "protocol": pool_sell.protocol,
                "token_in": token_out,
                "token_out": token_in,
                "amount_in": amount_out_buy,
                "expected_output": final_amount,
                "fee_bps": pool_sell.fee_bps
            }
        ]
        
        opportunity = ArbitrageOpportunity(
            opportunity_id=opportunity_id,
            arb_type=ArbitrageType.SPATIAL,
            timestamp=datetime.now(),
            status=OpportunityStatus.IDENTIFIED,
            path=path,
            token_addresses=[token_in, token_out],
            pool_addresses=[pool_buy.pool_address, pool_sell.pool_address],
            protocols=[pool_buy.protocol, pool_sell.protocol],
            input_amount=input_amount,
            expected_output=final_amount,
            gross_profit=gross_profit,
            profit_bips=profit_bips,
            requires_flash_loan=False,  # Spatial arb can use own capital
            estimated_gas=250000,  # Estimated for 2-step swap
            metadata={
                "buy_pool": pool_buy.pool_address,
                "sell_pool": pool_sell.pool_address,
                "direction": direction,
                "buy_price": amount_out_buy / input_amount if input_amount > 0 else 0,
                "sell_price": final_amount / amount_out_buy if amount_out_buy > 0 else 0
            }
        )
        
        # Calculate risk score
        opportunity.calculate_risk_score()
        
        # Track profit potential
        self.stats["total_profit_potential"] += gross_profit
        
        return opportunity
    
    def calculate_price_impact(
        self,
        pool: PoolState,
        amount_in: float,
        direction: int
    ) -> float:
        """
        Calculate price impact of a trade.
        
        Args:
            pool: Pool state
            amount_in: Input amount
            direction: Trade direction (0 or 1)
            
        Returns:
            Price impact as a percentage
        """
        if direction == 0:
            reserve_in = pool.reserve0
            reserve_out = pool.reserve1
        else:
            reserve_in = pool.reserve1
            reserve_out = pool.reserve0
        
        # Current price
        current_price = reserve_out / reserve_in if reserve_in > 0 else 0
        
        # Execute trade calculation
        amount_in_with_fee = amount_in * (10000 - pool.fee_bps) / 10000
        numerator = amount_in_with_fee * reserve_out
        denominator = reserve_in + amount_in_with_fee
        amount_out = numerator / denominator
        
        # New price
        new_price = amount_out / amount_in if amount_in > 0 else 0
        
        # Price impact
        if current_price > 0:
            impact = abs((new_price - current_price) / current_price) * 100
        else:
            impact = 0.0
        
        return impact
    
    def filter_by_liquidity(
        self,
        opportunities: List[ArbitrageOpportunity],
        token_prices: Dict[str, float]
    ) -> List[ArbitrageOpportunity]:
        """
        Filter opportunities by minimum liquidity requirement.
        
        Args:
            opportunities: List of opportunities
            token_prices: Dictionary of token prices in USD
            
        Returns:
            Filtered list of opportunities
        """
        filtered = []
        
        for opp in opportunities:
            # Check if all pools meet liquidity requirement
            meets_requirement = True
            
            for step in opp.path:
                # Calculate pool liquidity in USD (simplified)
                token = step['token_in']
                amount = step['amount_in']
                price = token_prices.get(token, 0)
                liquidity_usd = amount * price * 2  # Rough estimate
                
                if liquidity_usd < self.min_liquidity_usd:
                    meets_requirement = False
                    break
            
            if meets_requirement:
                filtered.append(opp)
        
        return filtered
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get engine statistics.
        
        Returns:
            Dictionary of statistics
        """
        return {
            **self.stats,
            "avg_profit_per_opportunity": (
                self.stats["total_profit_potential"] / 
                max(self.stats["opportunities_found"], 1)
            )
        }
