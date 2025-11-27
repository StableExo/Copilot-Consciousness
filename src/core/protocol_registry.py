"""
Protocol Registry - DEX Protocol Management System

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

DEX protocol management system with pluggable architecture for TxBuilder
and Fetcher registration, enabling easy addition of new DEX protocols.
"""

from typing import Dict, Optional, Any, Callable, List
from dataclasses import dataclass
from abc import ABC, abstractmethod


class TxBuilderInterface(ABC):
    """Interface for protocol-specific transaction builders"""
    
    @abstractmethod
    def build_swap_tx(self, swap_params: Dict[str, Any]) -> Dict[str, Any]:
        """Build a swap transaction for the protocol"""
        pass
    
    @abstractmethod
    def encode_swap_data(self, swap_params: Dict[str, Any]) -> bytes:
        """Encode swap parameters for contract call"""
        pass


class FetcherInterface(ABC):
    """Interface for protocol-specific data fetchers"""
    
    @abstractmethod
    async def fetch_pool_data(self, pool_address: str) -> Dict[str, Any]:
        """Fetch pool data from the protocol"""
        pass
    
    @abstractmethod
    async def fetch_pool_reserves(self, pool_address: str) -> tuple:
        """Fetch pool reserves"""
        pass


@dataclass
class ProtocolInfo:
    """
    Protocol information and configuration.
    
    Attributes:
        name: Protocol name
        version: Protocol version (v2, v3, etc.)
        factory_address: Factory contract address
        router_address: Router contract address
        fee_structure: Fee structure (fixed or dynamic)
        tx_builder: Transaction builder instance
        fetcher: Data fetcher instance
    """
    name: str
    version: str
    factory_address: str
    router_address: str
    fee_structure: str
    tx_builder: Optional[TxBuilderInterface] = None
    fetcher: Optional[FetcherInterface] = None


class ProtocolRegistry:
    """
    DEX protocol management system with pluggable architecture.
    
    Features:
    - TxBuilder registration (protocol-specific transaction construction)
    - Fetcher registration (protocol-specific data fetching)
    - Validation of required methods before registration
    - Error handling with graceful fallback
    - Enables easy addition of new DEX protocols
    """
    
    def __init__(self):
        """Initialize protocol registry"""
        self.protocols: Dict[str, ProtocolInfo] = {}
        self.tx_builders: Dict[str, TxBuilderInterface] = {}
        self.fetchers: Dict[str, FetcherInterface] = {}
        
        # Statistics
        self.stats = {
            "protocols_registered": 0,
            "tx_builders_registered": 0,
            "fetchers_registered": 0
        }
        
        print("ProtocolRegistry initialized")
    
    def register_protocol(
        self,
        name: str,
        version: str,
        factory_address: str,
        router_address: str,
        fee_structure: str = "fixed"
    ) -> None:
        """
        Register a new protocol.
        
        Args:
            name: Protocol name (e.g., 'uniswap_v2', 'sushiswap')
            version: Protocol version (e.g., 'v2', 'v3')
            factory_address: Factory contract address
            router_address: Router contract address
            fee_structure: 'fixed' or 'dynamic'
        """
        protocol_info = ProtocolInfo(
            name=name,
            version=version,
            factory_address=factory_address,
            router_address=router_address,
            fee_structure=fee_structure
        )
        
        self.protocols[name] = protocol_info
        self.stats["protocols_registered"] += 1
        
        print(f"Registered protocol: {name} ({version})")
    
    def register_tx_builder(
        self,
        protocol_name: str,
        tx_builder: TxBuilderInterface
    ) -> bool:
        """
        Register a transaction builder for a protocol.
        
        Args:
            protocol_name: Protocol name
            tx_builder: TxBuilder instance implementing TxBuilderInterface
            
        Returns:
            True if registration successful, False otherwise
        """
        # Validate protocol exists
        if protocol_name not in self.protocols:
            print(f"Error: Protocol {protocol_name} not registered")
            return False
        
        # Validate required methods
        if not self._validate_tx_builder(tx_builder):
            print(f"Error: TxBuilder for {protocol_name} missing required methods")
            return False
        
        # Register
        self.tx_builders[protocol_name] = tx_builder
        self.protocols[protocol_name].tx_builder = tx_builder
        self.stats["tx_builders_registered"] += 1
        
        print(f"Registered TxBuilder for {protocol_name}")
        return True
    
    def register_fetcher(
        self,
        protocol_name: str,
        fetcher: FetcherInterface
    ) -> bool:
        """
        Register a data fetcher for a protocol.
        
        Args:
            protocol_name: Protocol name
            fetcher: Fetcher instance implementing FetcherInterface
            
        Returns:
            True if registration successful, False otherwise
        """
        # Validate protocol exists
        if protocol_name not in self.protocols:
            print(f"Error: Protocol {protocol_name} not registered")
            return False
        
        # Validate required methods
        if not self._validate_fetcher(fetcher):
            print(f"Error: Fetcher for {protocol_name} missing required methods")
            return False
        
        # Register
        self.fetchers[protocol_name] = fetcher
        self.protocols[protocol_name].fetcher = fetcher
        self.stats["fetchers_registered"] += 1
        
        print(f"Registered Fetcher for {protocol_name}")
        return True
    
    def _validate_tx_builder(self, tx_builder: Any) -> bool:
        """
        Validate that tx_builder implements required methods.
        
        Args:
            tx_builder: TxBuilder instance to validate
            
        Returns:
            True if valid, False otherwise
        """
        required_methods = ['build_swap_tx', 'encode_swap_data']
        
        for method in required_methods:
            if not hasattr(tx_builder, method):
                return False
            if not callable(getattr(tx_builder, method)):
                return False
        
        return True
    
    def _validate_fetcher(self, fetcher: Any) -> bool:
        """
        Validate that fetcher implements required methods.
        
        Args:
            fetcher: Fetcher instance to validate
            
        Returns:
            True if valid, False otherwise
        """
        required_methods = ['fetch_pool_data', 'fetch_pool_reserves']
        
        for method in required_methods:
            if not hasattr(fetcher, method):
                return False
            if not callable(getattr(fetcher, method)):
                return False
        
        return True
    
    def get_tx_builder(self, protocol_name: str) -> Optional[TxBuilderInterface]:
        """
        Get transaction builder for a protocol.
        
        Args:
            protocol_name: Protocol name
            
        Returns:
            TxBuilder instance if registered, None otherwise
        """
        return self.tx_builders.get(protocol_name)
    
    def get_fetcher(self, protocol_name: str) -> Optional[FetcherInterface]:
        """
        Get data fetcher for a protocol.
        
        Args:
            protocol_name: Protocol name
            
        Returns:
            Fetcher instance if registered, None otherwise
        """
        return self.fetchers.get(protocol_name)
    
    def get_protocol_info(self, protocol_name: str) -> Optional[ProtocolInfo]:
        """
        Get protocol information.
        
        Args:
            protocol_name: Protocol name
            
        Returns:
            ProtocolInfo if registered, None otherwise
        """
        return self.protocols.get(protocol_name)
    
    def list_protocols(self) -> List[str]:
        """
        List all registered protocols.
        
        Returns:
            List of protocol names
        """
        return list(self.protocols.keys())
    
    def list_protocols_with_tx_builders(self) -> List[str]:
        """
        List protocols that have TxBuilders registered.
        
        Returns:
            List of protocol names
        """
        return list(self.tx_builders.keys())
    
    def list_protocols_with_fetchers(self) -> List[str]:
        """
        List protocols that have Fetchers registered.
        
        Returns:
            List of protocol names
        """
        return list(self.fetchers.keys())
    
    def has_tx_builder(self, protocol_name: str) -> bool:
        """
        Check if protocol has a TxBuilder registered.
        
        Args:
            protocol_name: Protocol name
            
        Returns:
            True if TxBuilder registered, False otherwise
        """
        return protocol_name in self.tx_builders
    
    def has_fetcher(self, protocol_name: str) -> bool:
        """
        Check if protocol has a Fetcher registered.
        
        Args:
            protocol_name: Protocol name
            
        Returns:
            True if Fetcher registered, False otherwise
        """
        return protocol_name in self.fetchers
    
    def unregister_protocol(self, protocol_name: str) -> bool:
        """
        Unregister a protocol and its components.
        
        Args:
            protocol_name: Protocol name
            
        Returns:
            True if unregistered, False if not found
        """
        if protocol_name not in self.protocols:
            return False
        
        # Remove from all registries
        self.protocols.pop(protocol_name, None)
        self.tx_builders.pop(protocol_name, None)
        self.fetchers.pop(protocol_name, None)
        
        print(f"Unregistered protocol: {protocol_name}")
        return True
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get registry statistics.
        
        Returns:
            Dictionary of statistics
        """
        return {
            **self.stats,
            "total_protocols": len(self.protocols),
            "protocols_with_tx_builders": len(self.tx_builders),
            "protocols_with_fetchers": len(self.fetchers),
            "fully_configured_protocols": len([
                p for p in self.protocols.values()
                if p.tx_builder is not None and p.fetcher is not None
            ])
        }
    
    def __repr__(self) -> str:
        """String representation"""
        return (
            f"ProtocolRegistry("
            f"protocols={len(self.protocols)}, "
            f"tx_builders={len(self.tx_builders)}, "
            f"fetchers={len(self.fetchers)})"
        )
