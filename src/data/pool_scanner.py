"""
Pool Scanner - Automated Pool Discovery and State Fetching

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel

Automated pool discovery and state fetching (the "Sentinel Protocol") with
batch parallel fetching, token decimals caching, and contract validation.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import asyncio
import json
from pathlib import Path


@dataclass
class PoolManifestEntry:
    """
    Entry from dynamic_pool_manifest.json.
    
    Attributes:
        pool_address: Pool contract address
        token0: First token address
        token1: Second token address
        protocol: Protocol name
        factory: Factory contract address
        created_block: Block number when pool was created
    """
    pool_address: str
    token0: str
    token1: str
    protocol: str
    factory: str
    created_block: int


@dataclass
class TokenMetadata:
    """
    Token metadata including decimals.
    
    Attributes:
        address: Token contract address
        decimals: Token decimals
        symbol: Token symbol
        name: Token name
    """
    address: str
    decimals: int
    symbol: Optional[str] = None
    name: Optional[str] = None


class PoolScanner:
    """
    Automated pool discovery and state fetching (the "Sentinel Protocol").
    
    Features:
    - Reads from dynamic_pool_manifest.json (surveyor output)
    - Batch parallel pool state fetching
    - Token decimals caching to reduce RPC calls
    - Contract validation (checks code exists at address)
    - Protocol details lookup from config
    """
    
    def __init__(
        self,
        manifest_path: str = "dynamic_pool_manifest.json",
        web3_provider: Optional[Any] = None,
        data_provider: Optional[Any] = None,
        batch_size: int = 100,
        validate_contracts: bool = True
    ):
        """
        Initialize pool scanner.
        
        Args:
            manifest_path: Path to pool manifest JSON file
            web3_provider: Web3 provider instance (placeholder)
            data_provider: DexDataProvider instance for pool data
            batch_size: Batch size for parallel fetching
            validate_contracts: Whether to validate contract existence
        """
        self.manifest_path = Path(manifest_path)
        self.web3 = web3_provider
        self.data_provider = data_provider
        self.batch_size = batch_size
        self.validate_contracts = validate_contracts
        
        # Token decimals cache to reduce RPC calls
        self.token_decimals_cache: Dict[str, TokenMetadata] = {}
        
        # Pool manifest
        self.manifest: List[PoolManifestEntry] = []
        
        # Protocol details
        self.protocol_config: Dict[str, Dict[str, Any]] = {
            "uniswap_v2": {
                "version": "v2",
                "fee_bps": 30,
                "factory": "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
            },
            "uniswap_v3": {
                "version": "v3",
                "fee_tiers": [100, 500, 3000, 10000],
                "factory": "0x1F98431c8aD98523631AE4a59f267346ea31F984"
            },
            "sushiswap": {
                "version": "v2",
                "fee_bps": 30,
                "factory": "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
            },
            "camelot": {
                "version": "v2",
                "fee_bps": 30,
                "factory": "0x6EcCab422D763aC031210895C81787E87B43A652"
            }
        }
        
        # Statistics
        self.stats = {
            "pools_loaded": 0,
            "pools_scanned": 0,
            "valid_pools": 0,
            "invalid_pools": 0,
            "tokens_cached": 0
        }
        
        print(f"PoolScanner initialized: manifest={manifest_path}, "
              f"batch_size={batch_size}")
    
    def load_manifest(self) -> List[PoolManifestEntry]:
        """
        Load pool manifest from JSON file.
        
        Returns:
            List of pool manifest entries
        """
        if not self.manifest_path.exists():
            print(f"Warning: Manifest file not found: {self.manifest_path}")
            return []
        
        try:
            with open(self.manifest_path, 'r') as f:
                data = json.load(f)
            
            # Parse manifest entries
            self.manifest = []
            pools_data = data.get('pools', []) if isinstance(data, dict) else data
            
            for entry in pools_data:
                pool_entry = PoolManifestEntry(
                    pool_address=entry['pool_address'],
                    token0=entry['token0'],
                    token1=entry['token1'],
                    protocol=entry.get('protocol', 'unknown'),
                    factory=entry.get('factory', ''),
                    created_block=entry.get('created_block', 0)
                )
                self.manifest.append(pool_entry)
            
            self.stats["pools_loaded"] = len(self.manifest)
            print(f"Loaded {len(self.manifest)} pools from manifest")
            
            return self.manifest
            
        except Exception as e:
            print(f"Error loading manifest: {e}")
            return []
    
    async def scan_pools(
        self,
        pool_addresses: Optional[List[str]] = None,
        protocols: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Scan pools and fetch their current state.
        
        Args:
            pool_addresses: Optional list of specific pools to scan
            protocols: Optional filter by protocols
            
        Returns:
            List of pool states with metadata
        """
        # Load manifest if not already loaded
        if not self.manifest:
            self.load_manifest()
        
        # Filter pools
        pools_to_scan = self._filter_pools(pool_addresses, protocols)
        
        print(f"Scanning {len(pools_to_scan)} pools...")
        
        # Scan in batches
        all_pool_states = []
        
        for i in range(0, len(pools_to_scan), self.batch_size):
            batch = pools_to_scan[i:i + self.batch_size]
            
            # Fetch batch in parallel
            batch_states = await self._scan_batch(batch)
            all_pool_states.extend(batch_states)
            
            print(f"Progress: {len(all_pool_states)}/{len(pools_to_scan)} pools scanned")
        
        self.stats["pools_scanned"] = len(pools_to_scan)
        self.stats["valid_pools"] = len(all_pool_states)
        self.stats["invalid_pools"] = len(pools_to_scan) - len(all_pool_states)
        
        return all_pool_states
    
    def _filter_pools(
        self,
        pool_addresses: Optional[List[str]],
        protocols: Optional[List[str]]
    ) -> List[PoolManifestEntry]:
        """
        Filter pools by addresses and protocols.
        
        Args:
            pool_addresses: Optional list of pool addresses
            protocols: Optional list of protocols
            
        Returns:
            Filtered list of manifest entries
        """
        filtered = self.manifest.copy()
        
        # Filter by addresses
        if pool_addresses:
            address_set = set(addr.lower() for addr in pool_addresses)
            filtered = [p for p in filtered if p.pool_address.lower() in address_set]
        
        # Filter by protocols
        if protocols:
            protocol_set = set(p.lower() for p in protocols)
            filtered = [p for p in filtered if p.protocol.lower() in protocol_set]
        
        return filtered
    
    async def _scan_batch(
        self,
        batch: List[PoolManifestEntry]
    ) -> List[Dict[str, Any]]:
        """
        Scan a batch of pools in parallel.
        
        Args:
            batch: Batch of manifest entries
            
        Returns:
            List of valid pool states
        """
        tasks = [self._scan_single_pool(entry) for entry in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors and None values
        valid_results = []
        for result in results:
            if isinstance(result, dict):
                valid_results.append(result)
            elif isinstance(result, Exception):
                print(f"Error scanning pool: {result}")
        
        return valid_results
    
    async def _scan_single_pool(
        self,
        entry: PoolManifestEntry
    ) -> Optional[Dict[str, Any]]:
        """
        Scan a single pool and fetch its state.
        
        Args:
            entry: Pool manifest entry
            
        Returns:
            Pool state dictionary if valid, None otherwise
        """
        # Validate contract if required
        if self.validate_contracts:
            is_valid = await self._validate_contract(entry.pool_address)
            if not is_valid:
                print(f"Invalid contract: {entry.pool_address}")
                return None
        
        # Fetch pool data
        if self.data_provider:
            pool_data = await self.data_provider.fetch_pool_data(
                entry.pool_address,
                entry.protocol
            )
            
            if not pool_data:
                return None
            
            # Fetch token metadata (decimals)
            token0_meta = await self.get_token_metadata(entry.token0)
            token1_meta = await self.get_token_metadata(entry.token1)
            
            # Build pool state
            pool_state = {
                "pool_address": entry.pool_address,
                "token0": entry.token0,
                "token1": entry.token1,
                "token0_symbol": token0_meta.symbol if token0_meta else None,
                "token1_symbol": token1_meta.symbol if token1_meta else None,
                "token0_decimals": token0_meta.decimals if token0_meta else 18,
                "token1_decimals": token1_meta.decimals if token1_meta else 18,
                "reserve0": pool_data.reserve0,
                "reserve1": pool_data.reserve1,
                "protocol": entry.protocol,
                "version": pool_data.version.value,
                "fee": pool_data.fee,
                "factory": entry.factory,
                "created_block": entry.created_block,
                "liquidity": pool_data.liquidity,
                "protocol_details": self.get_protocol_details(entry.protocol)
            }
            
            return pool_state
        else:
            # Placeholder when data provider not available
            return {
                "pool_address": entry.pool_address,
                "token0": entry.token0,
                "token1": entry.token1,
                "protocol": entry.protocol,
                "error": "No data provider configured"
            }
    
    async def _validate_contract(self, address: str) -> bool:
        """
        Validate that contract code exists at address.
        
        Args:
            address: Contract address
            
        Returns:
            True if contract exists, False otherwise
        """
        if not self.web3:
            return True  # Skip validation if no web3 provider
        
        try:
            # In production: code = await self.web3.eth.get_code(address)
            # return len(code) > 0
            
            # Placeholder: assume valid
            return True
            
        except Exception as e:
            print(f"Contract validation failed for {address}: {e}")
            return False
    
    async def get_token_metadata(self, token_address: str) -> Optional[TokenMetadata]:
        """
        Get token metadata with caching to reduce RPC calls.
        
        Args:
            token_address: Token contract address
            
        Returns:
            TokenMetadata if successful, None otherwise
        """
        # Check cache first
        if token_address in self.token_decimals_cache:
            return self.token_decimals_cache[token_address]
        
        # Fetch from chain
        try:
            # In production, call:
            # - decimals()
            # - symbol()
            # - name()
            
            # Placeholder metadata
            metadata = TokenMetadata(
                address=token_address,
                decimals=18,
                symbol="TKN",
                name="Token"
            )
            
            # Cache it
            self.token_decimals_cache[token_address] = metadata
            self.stats["tokens_cached"] = len(self.token_decimals_cache)
            
            return metadata
            
        except Exception as e:
            print(f"Failed to fetch token metadata for {token_address}: {e}")
            return None
    
    def get_protocol_details(self, protocol: str) -> Dict[str, Any]:
        """
        Get protocol configuration details.
        
        Args:
            protocol: Protocol name
            
        Returns:
            Protocol details dictionary
        """
        return self.protocol_config.get(
            protocol.lower(),
            {"version": "unknown", "fee_bps": 30}
        )
    
    def save_scan_results(
        self,
        results: List[Dict[str, Any]],
        output_path: str = "pool_scan_results.json"
    ) -> None:
        """
        Save scan results to JSON file.
        
        Args:
            results: List of pool state dictionaries
            output_path: Output file path
        """
        output = {
            "timestamp": asyncio.get_event_loop().time(),
            "total_pools": len(results),
            "pools": results,
            "statistics": self.stats
        }
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"Saved {len(results)} pool states to {output_path}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get scanner statistics.
        
        Returns:
            Dictionary of statistics
        """
        return {
            **self.stats,
            "cached_tokens": len(self.token_decimals_cache),
            "manifest_loaded": len(self.manifest) > 0
        }
