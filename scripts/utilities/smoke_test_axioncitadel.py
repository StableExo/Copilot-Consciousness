#!/usr/bin/env python3
"""
AxionCitadel Smoke Test

Quick smoke test script that:
- Imports all AxionCitadel components
- Creates sample instances
- Runs basic operations
- Reports success/failure for each component
- Provides summary of integration health
"""

import sys
from pathlib import Path
from typing import Dict, Tuple, Any
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class SmokeTest:
    """AxionCitadel Integration Smoke Test"""
    
    def __init__(self):
        self.results: Dict[str, Tuple[bool, str]] = {}
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.skipped_tests = 0
    
    def run_test(self, name: str, test_func):
        """Run a single test and record results"""
        self.total_tests += 1
        try:
            success, message = test_func()
            self.results[name] = (success, message)
            if success:
                self.passed_tests += 1
                print(f"✓ {name}: {message}")
            else:
                self.failed_tests += 1
                print(f"✗ {name}: {message}")
        except Exception as e:
            self.failed_tests += 1
            self.results[name] = (False, f"Exception: {e}")
            print(f"✗ {name}: Exception: {e}")
    
    def skip_test(self, name: str, reason: str):
        """Skip a test"""
        self.total_tests += 1
        self.skipped_tests += 1
        self.results[name] = (None, f"Skipped: {reason}")
        print(f"⊘ {name}: Skipped - {reason}")
    
    def test_import_advanced_profit_calculator(self):
        """Test AdvancedProfitCalculator import"""
        try:
            from src.execution.advanced_profit_calculator import AdvancedProfitCalculator
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_flash_swap_executor(self):
        """Test FlashSwapExecutor import"""
        try:
            from src.execution.flash_swap_executor import FlashSwapExecutor, ArbParams, SwapStep
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_transaction_manager(self):
        """Test TransactionManager import"""
        try:
            from src.execution.transaction_manager import TransactionManager
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_arbitrage_opportunity(self):
        """Test ArbitrageOpportunity import"""
        try:
            from src.arbitrage.opportunity import ArbitrageOpportunity, OpportunityStatus, ArbitrageType
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_spatial_arb_engine(self):
        """Test SpatialArbEngine import"""
        try:
            from src.arbitrage.spatial_arb_engine import SpatialArbEngine, PoolState
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_triangular_arb_engine(self):
        """Test TriangularArbEngine import"""
        try:
            from src.arbitrage.triangular_arb_engine import TriangularArbEngine
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_dex_data_provider(self):
        """Test DexDataProvider import"""
        try:
            from src.data.dex_data_provider import DexDataProvider
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_pool_scanner(self):
        """Test PoolScanner import"""
        try:
            from src.data.pool_scanner import PoolScanner
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_protocol_registry(self):
        """Test ProtocolRegistry import"""
        try:
            from src.core.protocol_registry import ProtocolRegistry, ProtocolInfo
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_import_mempool_monitor(self):
        """Test MempoolMonitorService import"""
        try:
            from src.monitoring.mempool_monitor_service import MempoolMonitorService
            return True, "Import successful"
        except ImportError as e:
            return False, f"Import failed: {e}"
    
    def test_instantiate_profit_calculator(self):
        """Test AdvancedProfitCalculator instantiation"""
        try:
            from src.execution.advanced_profit_calculator import AdvancedProfitCalculator
            calc = AdvancedProfitCalculator(flash_loan_fee_bps=9, mev_leak_factor=0.10)
            return True, "Instantiation successful"
        except Exception as e:
            return False, f"Instantiation failed: {e}"
    
    def test_instantiate_spatial_engine(self):
        """Test SpatialArbEngine instantiation"""
        try:
            from src.arbitrage.spatial_arb_engine import SpatialArbEngine
            engine = SpatialArbEngine(min_profit_bips=50)
            return True, "Instantiation successful"
        except Exception as e:
            return False, f"Instantiation failed: {e}"
    
    def test_instantiate_triangular_engine(self):
        """Test TriangularArbEngine instantiation"""
        try:
            from src.arbitrage.triangular_arb_engine import TriangularArbEngine
            engine = TriangularArbEngine(min_profit_bips=100)
            return True, "Instantiation successful"
        except Exception as e:
            return False, f"Instantiation failed: {e}"
    
    def test_instantiate_protocol_registry(self):
        """Test ProtocolRegistry instantiation"""
        try:
            from src.core.protocol_registry import ProtocolRegistry
            registry = ProtocolRegistry()
            return True, "Instantiation successful"
        except Exception as e:
            return False, f"Instantiation failed: {e}"
    
    def test_profit_calculation(self):
        """Test AdvancedProfitCalculator calculation"""
        try:
            from src.execution.advanced_profit_calculator import AdvancedProfitCalculator
            calc = AdvancedProfitCalculator(flash_loan_fee_bps=9, mev_leak_factor=0.10)
            result = calc.calculate_profit(
                revenue=1000.0,
                flash_loan_amount=500.0,
                gas_cost_gwei=50,
                gas_limit=200000
            )
            if 'net_profit' in result and 'is_profitable' in result:
                return True, f"Calculation successful: profit={result['net_profit']:.2f}"
            else:
                return False, "Result missing expected fields"
        except Exception as e:
            return False, f"Calculation failed: {e}"
    
    def test_opportunity_creation(self):
        """Test ArbitrageOpportunity creation"""
        try:
            from src.arbitrage.opportunity import ArbitrageOpportunity, OpportunityStatus, ArbitrageType
            opp = ArbitrageOpportunity(
                opportunity_id="smoke-test-001",
                arb_type=ArbitrageType.SPATIAL,
                status=OpportunityStatus.IDENTIFIED,
                input_amount=1000.0,
                expected_output=1050.0,
                gross_profit=50.0,
                pool_addresses=["0x123"],
                protocols=["uniswap_v2"],
                timestamp=datetime.now()
            )
            return True, f"Opportunity created: {opp.opportunity_id}"
        except Exception as e:
            return False, f"Creation failed: {e}"
    
    def test_protocol_registration(self):
        """Test ProtocolRegistry registration"""
        try:
            from src.core.protocol_registry import ProtocolRegistry, ProtocolInfo
            registry = ProtocolRegistry()
            
            registry.register_protocol(
                name="uniswap_v2",
                version="v2",
                factory_address="0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
                router_address="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                fee_structure="fixed"
            )
            
            protocol = registry.get_protocol_info("uniswap_v2")
            if protocol and protocol.name == "uniswap_v2":
                return True, "Protocol registration successful"
            else:
                return False, "Protocol not found after registration"
        except Exception as e:
            return False, f"Registration failed: {e}"
    
    def run_all_tests(self):
        """Run all smoke tests"""
        print("=" * 80)
        print("AXIONCITADEL INTEGRATION SMOKE TEST")
        print("=" * 80)
        print()
        
        # Import tests
        print("IMPORT TESTS")
        print("-" * 80)
        self.run_test("Import AdvancedProfitCalculator", self.test_import_advanced_profit_calculator)
        self.run_test("Import FlashSwapExecutor", self.test_import_flash_swap_executor)
        self.run_test("Import TransactionManager", self.test_import_transaction_manager)
        self.run_test("Import ArbitrageOpportunity", self.test_import_arbitrage_opportunity)
        self.run_test("Import SpatialArbEngine", self.test_import_spatial_arb_engine)
        self.run_test("Import TriangularArbEngine", self.test_import_triangular_arb_engine)
        self.run_test("Import DexDataProvider", self.test_import_dex_data_provider)
        self.run_test("Import PoolScanner", self.test_import_pool_scanner)
        self.run_test("Import ProtocolRegistry", self.test_import_protocol_registry)
        self.run_test("Import MempoolMonitorService", self.test_import_mempool_monitor)
        
        print()
        
        # Instantiation tests
        print("INSTANTIATION TESTS")
        print("-" * 80)
        self.run_test("Instantiate AdvancedProfitCalculator", self.test_instantiate_profit_calculator)
        self.run_test("Instantiate SpatialArbEngine", self.test_instantiate_spatial_engine)
        self.run_test("Instantiate TriangularArbEngine", self.test_instantiate_triangular_engine)
        self.run_test("Instantiate ProtocolRegistry", self.test_instantiate_protocol_registry)
        
        print()
        
        # Functional tests
        print("FUNCTIONAL TESTS")
        print("-" * 80)
        self.run_test("Profit Calculation", self.test_profit_calculation)
        self.run_test("Opportunity Creation", self.test_opportunity_creation)
        self.run_test("Protocol Registration", self.test_protocol_registration)
        
        print()
        
        # Summary
        self.print_summary()
        
        return 0 if self.failed_tests == 0 else 1
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 80)
        print("SMOKE TEST SUMMARY")
        print("=" * 80)
        print(f"Total tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests} ✓")
        print(f"Failed: {self.failed_tests} ✗")
        print(f"Skipped: {self.skipped_tests} ⊘")
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        print(f"Success rate: {success_rate:.1f}%")
        
        if self.failed_tests == 0:
            print("\n✅ ALL SMOKE TESTS PASSED!")
            print("AxionCitadel integration is healthy and ready for development.")
        else:
            print("\n⚠️  SOME TESTS FAILED")
            print("Review failed tests above for details.")
        
        print("=" * 80)


def main():
    """Main entry point"""
    smoke_test = SmokeTest()
    return smoke_test.run_all_tests()


if __name__ == '__main__':
    sys.exit(main())
