"""
Advanced Profit Calculator with MEV Awareness

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

Advanced profit calculations with flash loan fee validation, MEV leak risk,
and loan repayability checks for production arbitrage execution.
"""

from typing import Dict, Optional, List
from decimal import Decimal


class AdvancedProfitCalculator:
    """
    Advanced profit calculator with MEV awareness and flash loan fee integration.
    
    Features:
    - Flash loan fee integration (0.09% default)
    - MEV leak risk factor (default 10%)
    - Loan repayability validation
    - EIP-1559 gas cost modeling
    - Multi-token profit harmonization
    """
    
    def __init__(
        self,
        flash_loan_fee_bps: int = 9,  # 0.09% in basis points
        mev_leak_factor: float = 0.10,  # 10% MEV leakage risk
        min_profit_threshold: float = 0.0  # Minimum profit in USD
    ):
        """
        Initialize advanced profit calculator.
        
        Args:
            flash_loan_fee_bps: Flash loan fee in basis points (default 9 = 0.09%)
            mev_leak_factor: MEV leakage risk factor (default 0.10 = 10%)
            min_profit_threshold: Minimum profit threshold in USD
        """
        self.flash_loan_fee_bps = flash_loan_fee_bps
        self.mev_leak_factor = mev_leak_factor
        self.min_profit_threshold = min_profit_threshold
        
        # EIP-1559 gas modeling parameters
        self.gas_buffer_multiplier = 1.2  # 20% gas buffer
        self.priority_fee_multiplier = 1.5  # 50% priority fee boost
    
    def calculate_profit(
        self,
        revenue: float,
        flash_loan_amount: float,
        gas_cost_gwei: float,
        gas_limit: int,
        base_fee_gwei: Optional[float] = None,
        priority_fee_gwei: Optional[float] = None
    ) -> Dict[str, float]:
        """
        Calculate adjusted profit with all fees and risk factors.
        
        Args:
            revenue: Gross revenue from arbitrage in USD
            flash_loan_amount: Flash loan principal amount in USD
            gas_cost_gwei: Legacy gas price in Gwei (if not using EIP-1559)
            gas_limit: Gas limit for transaction
            base_fee_gwei: EIP-1559 base fee per gas (optional)
            priority_fee_gwei: EIP-1559 priority fee per gas (optional)
            
        Returns:
            Dictionary containing profit breakdown:
            - gross_profit: Revenue before fees
            - flash_loan_fee: Flash loan fee amount
            - gas_cost_usd: Gas cost in USD
            - mev_risk: MEV leakage risk amount
            - net_profit: Final profit after all deductions
            - profit_margin: Net profit as percentage of revenue
            - is_profitable: Boolean indicating if profitable
            - loan_repayable: Boolean indicating if loan can be repaid
        """
        # Calculate flash loan fee
        flash_loan_fee = self._calculate_flash_loan_fee(flash_loan_amount)
        
        # Calculate gas cost using EIP-1559 if parameters provided
        if base_fee_gwei is not None and priority_fee_gwei is not None:
            gas_cost_usd = self._calculate_eip1559_gas_cost(
                gas_limit, base_fee_gwei, priority_fee_gwei
            )
        else:
            gas_cost_usd = self._calculate_legacy_gas_cost(gas_limit, gas_cost_gwei)
        
        # Calculate gross profit
        gross_profit = revenue - gas_cost_usd
        
        # Calculate MEV risk (percentage of gross profit)
        mev_risk = gross_profit * self.mev_leak_factor
        
        # Calculate net profit
        net_profit = gross_profit - flash_loan_fee - mev_risk
        
        # Calculate profit margin
        profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0.0
        
        # Check if loan is repayable (revenue must cover loan + fee + gas)
        loan_repayable = revenue >= (flash_loan_amount + flash_loan_fee + gas_cost_usd)
        
        # Check if profitable
        is_profitable = net_profit >= self.min_profit_threshold
        
        return {
            "gross_profit": gross_profit,
            "flash_loan_fee": flash_loan_fee,
            "gas_cost_usd": gas_cost_usd,
            "mev_risk": mev_risk,
            "net_profit": net_profit,
            "profit_margin": profit_margin,
            "is_profitable": is_profitable,
            "loan_repayable": loan_repayable,
            "revenue": revenue,
            "flash_loan_amount": flash_loan_amount
        }
    
    def _calculate_flash_loan_fee(self, loan_amount: float) -> float:
        """
        Calculate flash loan fee based on loan amount.
        
        Args:
            loan_amount: Principal loan amount in USD
            
        Returns:
            Flash loan fee amount
        """
        return loan_amount * (self.flash_loan_fee_bps / 10000.0)
    
    def _calculate_eip1559_gas_cost(
        self,
        gas_limit: int,
        base_fee_gwei: float,
        priority_fee_gwei: float,
        eth_price_usd: float = 2000.0  # Default ETH price
    ) -> float:
        """
        Calculate gas cost using EIP-1559 parameters.
        
        Args:
            gas_limit: Gas limit for transaction
            base_fee_gwei: Base fee per gas in Gwei
            priority_fee_gwei: Priority fee per gas in Gwei
            eth_price_usd: ETH price in USD
            
        Returns:
            Total gas cost in USD
        """
        # Add buffer to gas limit
        buffered_gas_limit = int(gas_limit * self.gas_buffer_multiplier)
        
        # Boost priority fee for faster inclusion
        boosted_priority_fee = priority_fee_gwei * self.priority_fee_multiplier
        
        # Total fee = (base_fee + priority_fee) * gas_limit
        total_fee_gwei = (base_fee_gwei + boosted_priority_fee) * buffered_gas_limit
        
        # Convert to ETH (1 ETH = 1e9 Gwei)
        total_fee_eth = total_fee_gwei / 1e9
        
        # Convert to USD
        return total_fee_eth * eth_price_usd
    
    def _calculate_legacy_gas_cost(
        self,
        gas_limit: int,
        gas_price_gwei: float,
        eth_price_usd: float = 2000.0  # Default ETH price
    ) -> float:
        """
        Calculate gas cost using legacy gas pricing.
        
        Args:
            gas_limit: Gas limit for transaction
            gas_price_gwei: Gas price in Gwei
            eth_price_usd: ETH price in USD
            
        Returns:
            Total gas cost in USD
        """
        # Add buffer to gas limit
        buffered_gas_limit = int(gas_limit * self.gas_buffer_multiplier)
        
        # Total fee = gas_price * gas_limit
        total_fee_gwei = gas_price_gwei * buffered_gas_limit
        
        # Convert to ETH (1 ETH = 1e9 Gwei)
        total_fee_eth = total_fee_gwei / 1e9
        
        # Convert to USD
        return total_fee_eth * eth_price_usd
    
    def calculate_multi_token_profit(
        self,
        token_amounts: List[Dict[str, float]],
        flash_loan_amount: float,
        gas_cost_usd: float
    ) -> Dict[str, float]:
        """
        Harmonize profit calculations across multiple tokens.
        
        Args:
            token_amounts: List of dicts with 'token', 'amount', 'price_usd'
            flash_loan_amount: Total flash loan amount in USD
            gas_cost_usd: Total gas cost in USD
            
        Returns:
            Harmonized profit calculation
        """
        # Calculate total revenue in USD
        total_revenue_usd = sum(
            token['amount'] * token['price_usd'] 
            for token in token_amounts
        )
        
        # Use main calculation logic
        return self.calculate_profit(
            revenue=total_revenue_usd,
            flash_loan_amount=flash_loan_amount,
            gas_cost_gwei=0,  # Already have USD cost
            gas_limit=0,
            base_fee_gwei=None,
            priority_fee_gwei=None
        )
    
    def validate_repayability(
        self,
        revenue: float,
        flash_loan_amount: float,
        flash_loan_fee: float,
        gas_cost: float
    ) -> tuple[bool, str]:
        """
        Validate if flash loan can be repaid from revenue.
        
        Args:
            revenue: Total revenue from arbitrage
            flash_loan_amount: Principal loan amount
            flash_loan_fee: Flash loan fee
            gas_cost: Gas cost for transaction
            
        Returns:
            Tuple of (is_repayable, reason)
        """
        total_obligation = flash_loan_amount + flash_loan_fee + gas_cost
        
        if revenue >= total_obligation:
            margin = revenue - total_obligation
            return True, f"Repayable with {margin:.2f} USD margin"
        else:
            shortfall = total_obligation - revenue
            return False, f"Shortfall of {shortfall:.2f} USD"
    
    def update_parameters(
        self,
        flash_loan_fee_bps: Optional[int] = None,
        mev_leak_factor: Optional[float] = None,
        min_profit_threshold: Optional[float] = None
    ) -> None:
        """
        Update calculator parameters.
        
        Args:
            flash_loan_fee_bps: New flash loan fee in basis points
            mev_leak_factor: New MEV leakage risk factor
            min_profit_threshold: New minimum profit threshold
        """
        if flash_loan_fee_bps is not None:
            self.flash_loan_fee_bps = flash_loan_fee_bps
        if mev_leak_factor is not None:
            self.mev_leak_factor = mev_leak_factor
        if min_profit_threshold is not None:
            self.min_profit_threshold = min_profit_threshold
        
        print(f"Updated parameters: fee={self.flash_loan_fee_bps}bps, "
              f"mev_leak={self.mev_leak_factor:.2%}, "
              f"min_profit=${self.min_profit_threshold:.2f}")
