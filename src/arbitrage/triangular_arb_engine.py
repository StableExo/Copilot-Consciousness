"""
Triangular Arbitrage Engine - 3-Token Cycle Detection

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

3-token cycle arbitrage detection (A → B → C → A) with multi-hop path
construction, amount propagation, and pair map optimization.
"""

from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass
from .opportunity import ArbitrageOpportunity, ArbitrageType, OpportunityStatus
from .spatial_arb_engine import PoolState
import uuid
from datetime import datetime


class TriangularArbEngine:
    """
    Triangular arbitrage engine for 3-token cycle detection.
    
    Features:
    - Multi-hop path construction with amount propagation
    - Profit margin calculation in BIPS
    - Pair map optimization for O(1) lookups
    - Only creates opportunities if final amount > initial
    """
    
    def __init__(
        self,
        min_profit_bips: int = 50,  # Minimum 0.5% profit
        max_hops: int = 3,  # Maximum path length
        supported_protocols: Optional[List[str]] = None
    ):
        """
        Initialize triangular arbitrage engine.
        
        Args:
            min_profit_bips: Minimum profit margin in basis points
            max_hops: Maximum number of hops in path
            supported_protocols: List of supported DEX protocols
        """
        self.min_profit_bips = min_profit_bips
        self.max_hops = max_hops
        self.supported_protocols = supported_protocols or [
            "uniswap_v2", "uniswap_v3", "sushiswap", "camelot"
        ]
        
        # Pair map for O(1) lookups: token_pair -> list of pools
        self.pair_map: Dict[str, List[PoolState]] = {}
        
        # Statistics
        self.stats = {
            "cycles_analyzed": 0,
            "opportunities_found": 0,
            "total_profit_potential": 0.0,
            "avg_cycle_length": 0.0
        }
        
        print(f"TriangularArbEngine initialized: min_profit={min_profit_bips}bps, "
              f"max_hops={max_hops}")
    
    def build_pair_map(self, pools: List[PoolState]) -> None:
        """
        Build pair map for efficient pool lookup.
        
        Args:
            pools: List of pool states
        """
        self.pair_map.clear()
        
        for pool in pools:
            if pool.protocol not in self.supported_protocols:
                continue
            
            # Create bidirectional mappings
            key1 = f"{pool.token0}_{pool.token1}"
            key2 = f"{pool.token1}_{pool.token0}"
            
            if key1 not in self.pair_map:
                self.pair_map[key1] = []
            if key2 not in self.pair_map:
                self.pair_map[key2] = []
            
            self.pair_map[key1].append(pool)
            self.pair_map[key2].append(pool)
        
        print(f"Built pair map with {len(self.pair_map)} pairs")
    
    def find_opportunities(
        self,
        pools: List[PoolState],
        start_token: str,
        input_amount: float = 1.0
    ) -> List[ArbitrageOpportunity]:
        """
        Find triangular arbitrage opportunities starting from a token.
        
        Args:
            pools: List of pool states
            start_token: Token to start cycle from
            input_amount: Amount to trade (in start token units)
            
        Returns:
            List of profitable arbitrage opportunities
        """
        # Build pair map if not already built
        if not self.pair_map:
            self.build_pair_map(pools)
        
        opportunities = []
        
        # Find all 3-hop cycles starting from start_token
        cycles = self._find_cycles(start_token, max_depth=self.max_hops)
        
        # Evaluate each cycle for profitability
        for cycle in cycles:
            opp = self._evaluate_cycle(cycle, input_amount)
            if opp and opp.profit_bips >= self.min_profit_bips:
                opportunities.append(opp)
                self.stats["total_profit_potential"] += opp.gross_profit
            
            self.stats["cycles_analyzed"] += 1
        
        self.stats["opportunities_found"] += len(opportunities)
        if opportunities:
            avg_length = sum(len(o.path) for o in opportunities) / len(opportunities)
            self.stats["avg_cycle_length"] = avg_length
        
        print(f"Found {len(opportunities)} triangular arbitrage opportunities")
        return opportunities
    
    def _find_cycles(
        self,
        start_token: str,
        max_depth: int
    ) -> List[List[Tuple[str, str, PoolState]]]:
        """
        Find all cycles starting from a token using DFS.
        
        Args:
            start_token: Token to start from
            max_depth: Maximum path depth
            
        Returns:
            List of cycles, where each cycle is a list of (token_in, token_out, pool)
        """
        cycles = []
        
        def dfs(
            current_token: str,
            path: List[Tuple[str, str, PoolState]],
            visited: Set[str]
        ) -> None:
            """Depth-first search for cycles"""
            if len(path) > max_depth:
                return
            
            # If we've returned to start token and path length >= 2, found a cycle
            if len(path) >= 2 and current_token == start_token:
                cycles.append(path.copy())
                return
            
            # Don't revisit tokens (except when closing the cycle)
            if current_token in visited and current_token != start_token:
                return
            
            # Find all pools where current_token is an input
            for next_token in self._get_connected_tokens(current_token):
                if next_token == start_token and len(path) < 2:
                    continue  # Need at least 2 hops before returning to start
                
                # Get pools for this pair
                pair_key = f"{current_token}_{next_token}"
                pools = self.pair_map.get(pair_key, [])
                
                for pool in pools:
                    # Determine which token is in/out
                    if pool.token0 == current_token:
                        token_in, token_out = pool.token0, pool.token1
                    else:
                        token_in, token_out = pool.token1, pool.token0
                    
                    # Add to path and continue DFS
                    new_path = path + [(token_in, token_out, pool)]
                    new_visited = visited.copy()
                    new_visited.add(current_token)
                    
                    dfs(next_token, new_path, new_visited)
        
        # Start DFS from start_token
        dfs(start_token, [], set())
        
        return cycles
    
    def _get_connected_tokens(self, token: str) -> Set[str]:
        """
        Get all tokens directly connected to given token.
        
        Args:
            token: Token address
            
        Returns:
            Set of connected token addresses
        """
        connected = set()
        
        for pair_key in self.pair_map:
            tokens = pair_key.split('_')
            if tokens[0] == token:
                connected.add(tokens[1])
        
        return connected
    
    def _evaluate_cycle(
        self,
        cycle: List[Tuple[str, str, PoolState]],
        input_amount: float
    ) -> Optional[ArbitrageOpportunity]:
        """
        Evaluate a cycle for profitability with amount propagation.
        
        Args:
            cycle: List of (token_in, token_out, pool) tuples
            input_amount: Initial amount
            
        Returns:
            ArbitrageOpportunity if profitable, None otherwise
        """
        if not cycle:
            return None
        
        # Propagate amounts through the cycle
        current_amount = input_amount
        path = []
        
        for step_idx, (token_in, token_out, pool) in enumerate(cycle):
            # Calculate output amount using constant product formula
            if pool.token0 == token_in:
                reserve_in = pool.reserve0
                reserve_out = pool.reserve1
            else:
                reserve_in = pool.reserve1
                reserve_out = pool.reserve0
            
            # Apply fee
            amount_in_with_fee = current_amount * (10000 - pool.fee_bps) / 10000
            
            # Calculate output using x * y = k
            numerator = amount_in_with_fee * reserve_out
            denominator = reserve_in + amount_in_with_fee
            amount_out = numerator / denominator
            
            # Build path step
            path.append({
                "step": step_idx,
                "pool_address": pool.pool_address,
                "protocol": pool.protocol,
                "token_in": token_in,
                "token_out": token_out,
                "amount_in": current_amount,
                "expected_output": amount_out,
                "fee_bps": pool.fee_bps
            })
            
            # Propagate amount to next step
            current_amount = amount_out
        
        # Calculate profit (final amount must be in same token as initial)
        final_amount = current_amount
        gross_profit = final_amount - input_amount
        
        # Only create opportunity if final > initial
        if final_amount <= input_amount:
            return None
        
        # Calculate profit in basis points
        profit_bips = int((gross_profit / input_amount) * 10000)
        
        if profit_bips < self.min_profit_bips:
            return None
        
        # Extract unique tokens and pools
        token_addresses = list(dict.fromkeys([step["token_in"] for step in path]))
        pool_addresses = [step["pool_address"] for step in path]
        protocols = [step["protocol"] for step in path]
        
        # Create opportunity
        opportunity_id = str(uuid.uuid4())
        
        opportunity = ArbitrageOpportunity(
            opportunity_id=opportunity_id,
            arb_type=ArbitrageType.TRIANGULAR,
            timestamp=datetime.now(),
            status=OpportunityStatus.IDENTIFIED,
            path=path,
            token_addresses=token_addresses,
            pool_addresses=pool_addresses,
            protocols=protocols,
            input_amount=input_amount,
            expected_output=final_amount,
            gross_profit=gross_profit,
            profit_bips=profit_bips,
            requires_flash_loan=True,  # Triangular arb typically needs flash loan
            flash_loan_amount=input_amount,
            flash_loan_token=token_addresses[0] if token_addresses else "",
            estimated_gas=150000 * len(path),  # Estimate per swap
            metadata={
                "cycle_length": len(path),
                "tokens_in_cycle": token_addresses,
                "price_ratio": final_amount / input_amount if input_amount > 0 else 0
            }
        )
        
        # Calculate risk score
        opportunity.calculate_risk_score()
        
        return opportunity
    
    def find_all_triangular_opportunities(
        self,
        pools: List[PoolState],
        input_amount: float = 1.0
    ) -> List[ArbitrageOpportunity]:
        """
        Find triangular arbitrage opportunities for all possible start tokens.
        
        Args:
            pools: List of pool states
            input_amount: Amount to trade
            
        Returns:
            List of all profitable opportunities
        """
        # Build pair map
        self.build_pair_map(pools)
        
        # Get all unique tokens
        all_tokens = set()
        for pool in pools:
            all_tokens.add(pool.token0)
            all_tokens.add(pool.token1)
        
        # Find opportunities for each start token
        all_opportunities = []
        
        for start_token in all_tokens:
            opps = self.find_opportunities(pools, start_token, input_amount)
            all_opportunities.extend(opps)
        
        # Remove duplicate opportunities (same path, different start token)
        unique_opportunities = self._deduplicate_opportunities(all_opportunities)
        
        print(f"Found {len(unique_opportunities)} unique triangular opportunities "
              f"from {len(all_tokens)} tokens")
        
        return unique_opportunities
    
    def _deduplicate_opportunities(
        self,
        opportunities: List[ArbitrageOpportunity]
    ) -> List[ArbitrageOpportunity]:
        """
        Remove duplicate opportunities (same pools, different order).
        
        Args:
            opportunities: List of opportunities
            
        Returns:
            Deduplicated list
        """
        seen_signatures = set()
        unique = []
        
        for opp in opportunities:
            # Create signature from sorted pool addresses
            signature = tuple(sorted(opp.pool_addresses))
            
            if signature not in seen_signatures:
                seen_signatures.add(signature)
                unique.append(opp)
        
        return unique
    
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
            ),
            "pairs_in_map": len(self.pair_map)
        }
