"""
DEX Data Provider - Unified Multi-DEX Interface

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

Unified multi-DEX interface for pool data fetching with smart V2/V3 auto-detection,
protocol registry integration, and RPC request queue for rate limiting.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
from collections import deque


class ProtocolVersion(Enum):
    """DEX protocol version"""
    V2 = "v2"
    V3 = "v3"
    UNKNOWN = "unknown"


@dataclass
class PoolData:
    """
    Pool data returned by data provider.
    
    Attributes:
        pool_address: Pool contract address
        token0: First token address
        token1: Second token address
        reserve0: Reserve of token0
        reserve1: Reserve of token1
        protocol: Protocol name
        version: Protocol version (V2/V3)
        fee: Pool fee (basis points for V2, fee tier for V3)
        liquidity: Total liquidity (V3 specific)
    """
    pool_address: str
    token0: str
    token1: str
    reserve0: float
    reserve1: float
    protocol: str
    version: ProtocolVersion
    fee: int
    liquidity: Optional[int] = None
    tick: Optional[int] = None  # V3 specific
    sqrt_price_x96: Optional[int] = None  # V3 specific


class DexDataProvider:
    """
    Unified multi-DEX interface for pool data fetching.
    
    Features:
    - Smart Uniswap V2/V3 auto-detection with fallback
    - Protocol registry integration
    - RPC request queue for rate limiting (the "Regulator" pattern)
    - Generic V2 fallback when protocol-specific fetchers fail
    - Multi-protocol support (Uniswap, Sushi, Camelot, etc.)
    """
    
    def __init__(
        self,
        web3_provider: Optional[Any] = None,
        rpc_rate_limit: int = 100,  # Max RPC calls per second
        batch_size: int = 50,  # Batch size for multicall
        protocol_registry: Optional[Any] = None
    ):
        """
        Initialize DEX data provider.
        
        Args:
            web3_provider: Web3 provider instance (placeholder)
            rpc_rate_limit: Maximum RPC calls per second
            batch_size: Batch size for multicall requests
            protocol_registry: Protocol registry for fetcher lookup
        """
        self.web3 = web3_provider
        self.rpc_rate_limit = rpc_rate_limit
        self.batch_size = batch_size
        self.protocol_registry = protocol_registry
        
        # RPC request queue (the "Regulator" pattern)
        self.request_queue: deque = deque()
        self.requests_this_second = 0
        self.last_reset_time = asyncio.get_event_loop().time()
        
        # Protocol-specific fetchers
        self.fetchers: Dict[str, Any] = {}
        
        # Cache for pool data
        self.pool_cache: Dict[str, PoolData] = {}
        self.cache_ttl = 60  # Cache TTL in seconds
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "failed_requests": 0,
            "v2_fallbacks": 0
        }
        
        print(f"DexDataProvider initialized: rate_limit={rpc_rate_limit}/s, "
              f"batch_size={batch_size}")
    
    def register_fetcher(self, protocol: str, fetcher: Any) -> None:
        """
        Register a protocol-specific data fetcher.
        
        Args:
            protocol: Protocol name (e.g., 'uniswap_v2', 'sushiswap')
            fetcher: Fetcher instance with fetch_pool_data method
        """
        self.fetchers[protocol] = fetcher
        print(f"Registered fetcher for {protocol}")
    
    async def fetch_pool_data(
        self,
        pool_address: str,
        protocol: Optional[str] = None
    ) -> Optional[PoolData]:
        """
        Fetch pool data with auto-detection and fallback.
        
        Args:
            pool_address: Pool contract address
            protocol: Optional protocol hint
            
        Returns:
            PoolData if successful, None otherwise
        """
        # Check cache first
        if pool_address in self.pool_cache:
            self.stats["cache_hits"] += 1
            return self.pool_cache[pool_address]
        
        self.stats["cache_misses"] += 1
        self.stats["total_requests"] += 1
        
        # Try protocol-specific fetcher if protocol is known
        if protocol and protocol in self.fetchers:
            try:
                pool_data = await self._fetch_with_protocol(pool_address, protocol)
                if pool_data:
                    self.pool_cache[pool_address] = pool_data
                    return pool_data
            except Exception as e:
                print(f"Protocol-specific fetch failed for {protocol}: {e}")
        
        # Try auto-detection (V2 vs V3)
        try:
            pool_data = await self._auto_detect_and_fetch(pool_address)
            if pool_data:
                self.pool_cache[pool_address] = pool_data
                return pool_data
        except Exception as e:
            print(f"Auto-detection failed: {e}")
        
        # Generic V2 fallback
        try:
            pool_data = await self._fetch_generic_v2(pool_address)
            if pool_data:
                self.stats["v2_fallbacks"] += 1
                self.pool_cache[pool_address] = pool_data
                return pool_data
        except Exception as e:
            print(f"Generic V2 fallback failed: {e}")
        
        self.stats["failed_requests"] += 1
        return None
    
    async def _fetch_with_protocol(
        self,
        pool_address: str,
        protocol: str
    ) -> Optional[PoolData]:
        """
        Fetch pool data using protocol-specific fetcher.
        
        Args:
            pool_address: Pool address
            protocol: Protocol name
            
        Returns:
            PoolData if successful
        """
        fetcher = self.fetchers.get(protocol)
        if not fetcher:
            return None
        
        # Rate limit check
        await self._rate_limit()
        
        # Call protocol-specific fetcher
        # In production: pool_data = await fetcher.fetch_pool_data(pool_address)
        print(f"Fetching {pool_address} using {protocol} fetcher")
        
        # Placeholder data
        pool_data = PoolData(
            pool_address=pool_address,
            token0="0x" + "1" * 40,
            token1="0x" + "2" * 40,
            reserve0=1000000.0,
            reserve1=2000000.0,
            protocol=protocol,
            version=ProtocolVersion.V2,
            fee=30
        )
        
        return pool_data
    
    async def _auto_detect_and_fetch(self, pool_address: str) -> Optional[PoolData]:
        """
        Auto-detect protocol version and fetch data.
        
        Args:
            pool_address: Pool address
            
        Returns:
            PoolData if successful
        """
        # Try to detect if it's V2 or V3
        version = await self._detect_version(pool_address)
        
        if version == ProtocolVersion.V2:
            return await self._fetch_generic_v2(pool_address)
        elif version == ProtocolVersion.V3:
            return await self._fetch_generic_v3(pool_address)
        
        return None
    
    async def _detect_version(self, pool_address: str) -> ProtocolVersion:
        """
        Detect if pool is V2 or V3 by checking contract interface.
        
        Args:
            pool_address: Pool address
            
        Returns:
            ProtocolVersion enum
        """
        # Rate limit check
        await self._rate_limit()
        
        # In production, check for V3-specific methods like slot0(), liquidity()
        # For now, placeholder logic
        print(f"Detecting version for {pool_address}")
        
        # Placeholder: assume V2 by default
        return ProtocolVersion.V2
    
    async def _fetch_generic_v2(self, pool_address: str) -> PoolData:
        """
        Fetch pool data using generic Uniswap V2 interface.
        
        Args:
            pool_address: Pool address
            
        Returns:
            PoolData for V2 pool
        """
        # Rate limit check
        await self._rate_limit()
        
        # In production, call:
        # - token0()
        # - token1()
        # - getReserves()
        
        print(f"Fetching V2 pool data: {pool_address}")
        
        # Placeholder data
        pool_data = PoolData(
            pool_address=pool_address,
            token0="0x" + "1" * 40,
            token1="0x" + "2" * 40,
            reserve0=1000000.0,
            reserve1=2000000.0,
            protocol="unknown",
            version=ProtocolVersion.V2,
            fee=30  # Assume 0.3% default
        )
        
        return pool_data
    
    async def _fetch_generic_v3(self, pool_address: str) -> PoolData:
        """
        Fetch pool data using generic Uniswap V3 interface.
        
        Args:
            pool_address: Pool address
            
        Returns:
            PoolData for V3 pool
        """
        # Rate limit check
        await self._rate_limit()
        
        # In production, call:
        # - token0()
        # - token1()
        # - slot0() for sqrtPriceX96 and tick
        # - liquidity()
        # - fee()
        
        print(f"Fetching V3 pool data: {pool_address}")
        
        # Placeholder data
        pool_data = PoolData(
            pool_address=pool_address,
            token0="0x" + "1" * 40,
            token1="0x" + "2" * 40,
            reserve0=1000000.0,  # Calculated from liquidity + tick
            reserve1=2000000.0,
            protocol="unknown",
            version=ProtocolVersion.V3,
            fee=500,  # V3 fee tier
            liquidity=1000000000,
            tick=0,
            sqrt_price_x96=79228162514264337593543950336  # sqrt(1) * 2^96
        )
        
        return pool_data
    
    async def fetch_multiple_pools(
        self,
        pool_addresses: List[str],
        protocols: Optional[Dict[str, str]] = None
    ) -> Dict[str, PoolData]:
        """
        Fetch multiple pools in batches with rate limiting.
        
        Args:
            pool_addresses: List of pool addresses
            protocols: Optional dict mapping addresses to protocol names
            
        Returns:
            Dictionary mapping addresses to PoolData
        """
        protocols = protocols or {}
        results = {}
        
        # Process in batches
        for i in range(0, len(pool_addresses), self.batch_size):
            batch = pool_addresses[i:i + self.batch_size]
            
            # Fetch batch concurrently
            tasks = [
                self.fetch_pool_data(addr, protocols.get(addr))
                for addr in batch
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for addr, result in zip(batch, batch_results):
                if isinstance(result, PoolData):
                    results[addr] = result
                elif isinstance(result, Exception):
                    print(f"Error fetching {addr}: {result}")
        
        print(f"Fetched {len(results)}/{len(pool_addresses)} pools")
        return results
    
    async def _rate_limit(self) -> None:
        """
        Apply rate limiting using token bucket algorithm.
        
        The "Regulator" pattern: limits RPC calls per second
        """
        current_time = asyncio.get_event_loop().time()
        
        # Reset counter every second
        if current_time - self.last_reset_time >= 1.0:
            self.requests_this_second = 0
            self.last_reset_time = current_time
        
        # Check if we've exceeded rate limit
        if self.requests_this_second >= self.rpc_rate_limit:
            # Wait until next second
            wait_time = 1.0 - (current_time - self.last_reset_time)
            if wait_time > 0:
                await asyncio.sleep(wait_time)
                self.requests_this_second = 0
                self.last_reset_time = asyncio.get_event_loop().time()
        
        self.requests_this_second += 1
    
    def clear_cache(self) -> None:
        """Clear the pool data cache"""
        self.pool_cache.clear()
        print("Pool cache cleared")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get data provider statistics.
        
        Returns:
            Dictionary of statistics
        """
        cache_hit_rate = (
            self.stats["cache_hits"] / 
            max(self.stats["cache_hits"] + self.stats["cache_misses"], 1) * 100
        )
        
        return {
            **self.stats,
            "cache_hit_rate": cache_hit_rate,
            "cache_size": len(self.pool_cache),
            "registered_fetchers": len(self.fetchers)
        }
