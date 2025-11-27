"""
Arbitrage Opportunity Data Model

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

Arbitrage opportunity data model with risk scoring, lifecycle management,
and comprehensive tracking across execution stages.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json


class OpportunityStatus(Enum):
    """Lifecycle status of arbitrage opportunity"""
    IDENTIFIED = "identified"  # Just discovered
    SIMULATED = "simulated"    # Simulation completed
    PENDING = "pending"        # Queued for execution
    EXECUTING = "executing"    # Currently executing
    EXECUTED = "executed"      # Successfully executed
    FAILED = "failed"          # Execution failed
    EXPIRED = "expired"        # Deadline passed


class ArbitrageType(Enum):
    """Type of arbitrage opportunity"""
    SPATIAL = "spatial"          # Cross-DEX arbitrage (same pair)
    TRIANGULAR = "triangular"    # 3-token cycle
    MULTI_HOP = "multi_hop"      # N-hop arbitrage
    FLASH_LOAN = "flash_loan"    # Flash loan arbitrage


@dataclass
class ArbitrageOpportunity:
    """
    Arbitrage opportunity with risk scoring and lifecycle management.
    
    Features:
    - Risk scoring algorithm (protocol-specific + path length penalties)
    - Status lifecycle: identified -> simulated -> executed
    - Simulation parameter generation
    - JSON serialization for logging/API
    - Profit tracking across execution stages
    """
    
    # Core identification
    opportunity_id: str
    arb_type: ArbitrageType
    timestamp: datetime = field(default_factory=datetime.now)
    status: OpportunityStatus = OpportunityStatus.IDENTIFIED
    
    # Path information
    path: List[Dict[str, Any]] = field(default_factory=list)
    token_addresses: List[str] = field(default_factory=list)
    pool_addresses: List[str] = field(default_factory=list)
    protocols: List[str] = field(default_factory=list)
    
    # Financial metrics
    input_amount: float = 0.0
    expected_output: float = 0.0
    gross_profit: float = 0.0
    profit_bips: int = 0  # Profit in basis points
    
    # Flash loan details
    requires_flash_loan: bool = False
    flash_loan_amount: float = 0.0
    flash_loan_token: str = ""
    flash_loan_pool: str = ""
    
    # Gas and fees
    estimated_gas: int = 0
    gas_price_gwei: float = 0.0
    gas_cost_usd: float = 0.0
    flash_loan_fee: float = 0.0
    
    # Net profit
    net_profit: float = 0.0
    net_profit_margin: float = 0.0
    
    # Risk metrics
    risk_score: float = 0.0
    slippage_risk: float = 0.0
    
    # Execution tracking
    simulation_profit: Optional[float] = None
    actual_profit: Optional[float] = None
    tx_hash: Optional[str] = None
    execution_time: Optional[datetime] = None
    error_message: Optional[str] = None
    
    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def calculate_risk_score(self) -> float:
        """
        Calculate risk score based on protocol, path length, and other factors.
        
        Risk factors:
        - Protocol risk: Each protocol has a base risk (0.1-0.3)
        - Path length penalty: Longer paths = higher risk
        - Slippage risk: Based on pool liquidity
        - Flash loan risk: Additional risk if flash loan required
        
        Returns:
            Risk score from 0.0 (low risk) to 1.0 (high risk)
        """
        # Base risk from protocol mix
        protocol_risk_map = {
            "uniswap_v2": 0.1,
            "uniswap_v3": 0.15,
            "sushiswap": 0.2,
            "camelot": 0.25,
            "unknown": 0.3
        }
        
        # Calculate average protocol risk
        protocol_risks = [
            protocol_risk_map.get(p.lower(), 0.3) 
            for p in self.protocols
        ]
        avg_protocol_risk = sum(protocol_risks) / max(len(protocol_risks), 1)
        
        # Path length penalty (each hop adds 0.05 risk)
        path_length = len(self.path)
        path_penalty = min(path_length * 0.05, 0.3)
        
        # Flash loan risk (adds 0.1 if required)
        flash_loan_risk = 0.1 if self.requires_flash_loan else 0.0
        
        # Slippage risk (from stored value or default)
        slippage_risk = self.slippage_risk or 0.1
        
        # Combine risks (weighted average)
        total_risk = (
            avg_protocol_risk * 0.3 +
            path_penalty * 0.2 +
            flash_loan_risk * 0.2 +
            slippage_risk * 0.3
        )
        
        # Normalize to 0-1 range
        self.risk_score = min(total_risk, 1.0)
        return self.risk_score
    
    def update_status(self, new_status: OpportunityStatus, error: Optional[str] = None) -> None:
        """
        Update opportunity status with lifecycle validation.
        
        Args:
            new_status: New status to set
            error: Error message if status is FAILED
        """
        valid_transitions = {
            OpportunityStatus.IDENTIFIED: [OpportunityStatus.SIMULATED, OpportunityStatus.EXPIRED, OpportunityStatus.FAILED],
            OpportunityStatus.SIMULATED: [OpportunityStatus.PENDING, OpportunityStatus.EXPIRED, OpportunityStatus.FAILED],
            OpportunityStatus.PENDING: [OpportunityStatus.EXECUTING, OpportunityStatus.EXPIRED, OpportunityStatus.FAILED],
            OpportunityStatus.EXECUTING: [OpportunityStatus.EXECUTED, OpportunityStatus.FAILED],
            OpportunityStatus.EXECUTED: [],  # Terminal state
            OpportunityStatus.FAILED: [],    # Terminal state
            OpportunityStatus.EXPIRED: []    # Terminal state
        }
        
        if new_status in valid_transitions.get(self.status, []):
            self.status = new_status
            if new_status == OpportunityStatus.FAILED and error:
                self.error_message = error
            print(f"Opportunity {self.opportunity_id} status: {self.status.value}")
        else:
            print(f"Invalid status transition: {self.status.value} -> {new_status.value}")
    
    def generate_simulation_params(self) -> Dict[str, Any]:
        """
        Generate parameters for profit simulation.
        
        Returns:
            Dictionary of simulation parameters
        """
        return {
            "opportunity_id": self.opportunity_id,
            "arb_type": self.arb_type.value,
            "path": self.path,
            "input_amount": self.input_amount,
            "token_addresses": self.token_addresses,
            "pool_addresses": self.pool_addresses,
            "protocols": self.protocols,
            "flash_loan_amount": self.flash_loan_amount if self.requires_flash_loan else 0,
            "flash_loan_token": self.flash_loan_token,
            "estimated_gas": self.estimated_gas,
            "gas_price_gwei": self.gas_price_gwei
        }
    
    def update_simulation_results(self, simulation_data: Dict[str, Any]) -> None:
        """
        Update opportunity with simulation results.
        
        Args:
            simulation_data: Results from profit simulation
        """
        self.simulation_profit = simulation_data.get('net_profit', 0.0)
        self.estimated_gas = simulation_data.get('gas_used', self.estimated_gas)
        
        # Update status
        if self.simulation_profit > 0:
            self.update_status(OpportunityStatus.SIMULATED)
        else:
            self.update_status(OpportunityStatus.FAILED, "Simulation showed no profit")
    
    def update_execution_results(
        self,
        tx_hash: str,
        actual_profit: float,
        gas_used: int,
        success: bool = True
    ) -> None:
        """
        Update opportunity with execution results.
        
        Args:
            tx_hash: Transaction hash
            actual_profit: Actual profit realized
            gas_used: Actual gas consumed
            success: Whether execution succeeded
        """
        self.tx_hash = tx_hash
        self.actual_profit = actual_profit
        self.estimated_gas = gas_used
        self.execution_time = datetime.now()
        
        if success:
            self.update_status(OpportunityStatus.EXECUTED)
        else:
            self.update_status(OpportunityStatus.FAILED, "Execution reverted")
    
    def calculate_profit_margin(self) -> float:
        """
        Calculate profit margin as percentage.
        
        Returns:
            Profit margin percentage
        """
        if self.input_amount > 0:
            self.net_profit_margin = (self.net_profit / self.input_amount) * 100
        else:
            self.net_profit_margin = 0.0
        return self.net_profit_margin
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert opportunity to dictionary for JSON serialization.
        
        Returns:
            Dictionary representation
        """
        return {
            "opportunity_id": self.opportunity_id,
            "arb_type": self.arb_type.value,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "path": self.path,
            "token_addresses": self.token_addresses,
            "pool_addresses": self.pool_addresses,
            "protocols": self.protocols,
            "input_amount": self.input_amount,
            "expected_output": self.expected_output,
            "gross_profit": self.gross_profit,
            "profit_bips": self.profit_bips,
            "net_profit": self.net_profit,
            "net_profit_margin": self.net_profit_margin,
            "requires_flash_loan": self.requires_flash_loan,
            "flash_loan_amount": self.flash_loan_amount,
            "estimated_gas": self.estimated_gas,
            "gas_price_gwei": self.gas_price_gwei,
            "gas_cost_usd": self.gas_cost_usd,
            "risk_score": self.risk_score,
            "simulation_profit": self.simulation_profit,
            "actual_profit": self.actual_profit,
            "tx_hash": self.tx_hash,
            "execution_time": self.execution_time.isoformat() if self.execution_time else None,
            "error_message": self.error_message,
            "metadata": self.metadata
        }
    
    def to_json(self) -> str:
        """
        Convert opportunity to JSON string.
        
        Returns:
            JSON string representation
        """
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ArbitrageOpportunity':
        """
        Create opportunity from dictionary.
        
        Args:
            data: Dictionary with opportunity data
            
        Returns:
            ArbitrageOpportunity instance
        """
        # Convert enum strings back to enums
        arb_type = ArbitrageType(data.get('arb_type', 'spatial'))
        status = OpportunityStatus(data.get('status', 'identified'))
        
        # Convert timestamp
        timestamp = datetime.fromisoformat(data['timestamp']) if 'timestamp' in data else datetime.now()
        execution_time = datetime.fromisoformat(data['execution_time']) if data.get('execution_time') else None
        
        return cls(
            opportunity_id=data['opportunity_id'],
            arb_type=arb_type,
            status=status,
            timestamp=timestamp,
            path=data.get('path', []),
            token_addresses=data.get('token_addresses', []),
            pool_addresses=data.get('pool_addresses', []),
            protocols=data.get('protocols', []),
            input_amount=data.get('input_amount', 0.0),
            expected_output=data.get('expected_output', 0.0),
            gross_profit=data.get('gross_profit', 0.0),
            profit_bips=data.get('profit_bips', 0),
            net_profit=data.get('net_profit', 0.0),
            net_profit_margin=data.get('net_profit_margin', 0.0),
            requires_flash_loan=data.get('requires_flash_loan', False),
            flash_loan_amount=data.get('flash_loan_amount', 0.0),
            flash_loan_token=data.get('flash_loan_token', ''),
            flash_loan_pool=data.get('flash_loan_pool', ''),
            estimated_gas=data.get('estimated_gas', 0),
            gas_price_gwei=data.get('gas_price_gwei', 0.0),
            gas_cost_usd=data.get('gas_cost_usd', 0.0),
            risk_score=data.get('risk_score', 0.0),
            simulation_profit=data.get('simulation_profit'),
            actual_profit=data.get('actual_profit'),
            tx_hash=data.get('tx_hash'),
            execution_time=execution_time,
            error_message=data.get('error_message'),
            metadata=data.get('metadata', {})
        )
    
    def __repr__(self) -> str:
        """String representation of opportunity"""
        return (
            f"ArbitrageOpportunity(id={self.opportunity_id}, "
            f"type={self.arb_type.value}, "
            f"status={self.status.value}, "
            f"profit={self.net_profit:.4f}, "
            f"risk={self.risk_score:.2f})"
        )
