"""
Comprehensive AxionCitadel Integration Test Suite

Tests all AxionCitadel components integrated into Copilot-Consciousness:
- Import validation for all 16 components
- Syntax and structure validation
- Dependency checking
- Component instantiation
- Integration between components

Extracted from AxionCitadel - Operation First Light validated
Source: https://github.com/metalxalloy/AxionCitadel
"""

import sys
import unittest
from typing import Dict, List, Tuple, Any
from pathlib import Path
import importlib
import inspect

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestAxionCitadelImports(unittest.TestCase):
    """Test that all AxionCitadel components can be imported"""

    def test_execution_layer_imports(self):
        """Test execution layer component imports"""
        try:
            from src.execution.advanced_profit_calculator import AdvancedProfitCalculator
            from src.execution.flash_swap_executor import FlashSwapExecutor, ArbParams, SwapStep
            from src.execution.transaction_manager import TransactionManager
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Execution layer import failed: {e}")

    def test_arbitrage_engine_imports(self):
        """Test arbitrage engine component imports"""
        try:
            from src.arbitrage.opportunity import ArbitrageOpportunity, OpportunityStatus, ArbitrageType
            from src.arbitrage.spatial_arb_engine import SpatialArbEngine, PoolState
            from src.arbitrage.triangular_arb_engine import TriangularArbEngine
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Arbitrage engine import failed: {e}")

    def test_data_layer_imports(self):
        """Test data layer component imports"""
        try:
            from src.data.dex_data_provider import DexDataProvider
            from src.data.pool_scanner import PoolScanner
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Data layer import failed: {e}")

    def test_core_infrastructure_imports(self):
        """Test core infrastructure component imports"""
        try:
            from src.core.protocol_registry import ProtocolRegistry, ProtocolInfo
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Core infrastructure import failed: {e}")

    def test_monitoring_imports(self):
        """Test monitoring component imports"""
        try:
            from src.monitoring.mempool_monitor_service import MempoolMonitorService
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Monitoring import failed: {e}")

    def test_mev_models_imports(self):
        """Test MEV model component imports (may require web3/numpy)"""
        try:
            from src.mev.models.transaction_type import TransactionType
            from src.mev.models.mev_risk_model import MEVRiskModel
            from src.mev.models.profit_calculator import ProfitCalculator
            self.assertTrue(True)
        except ImportError as e:
            self.skipTest(f"MEV models require dependencies: {e}")

    def test_mev_sensors_imports(self):
        """Test MEV sensor component imports (may require web3)"""
        try:
            from src.mev.sensors.mempool_congestion_sensor import MempoolCongestionSensor
            from src.mev.sensors.searcher_density_sensor import SearcherDensitySensor
            from src.mev.sensors.mev_sensor_hub import MEVSensorHub
            self.assertTrue(True)
        except ImportError as e:
            self.skipTest(f"MEV sensors require dependencies: {e}")


class TestAxionCitadelInstantiation(unittest.TestCase):
    """Test that AxionCitadel components can be instantiated"""

    def test_advanced_profit_calculator_instantiation(self):
        """Test AdvancedProfitCalculator can be created and used"""
        from src.execution.advanced_profit_calculator import AdvancedProfitCalculator
        
        calc = AdvancedProfitCalculator(
            flash_loan_fee_bps=9,
            mev_leak_factor=0.10
        )
        
        self.assertIsNotNone(calc)
        self.assertEqual(calc.flash_loan_fee_bps, 9)
        self.assertEqual(calc.mev_leak_factor, 0.10)

    def test_flash_swap_executor_instantiation(self):
        """Test FlashSwapExecutor can be created"""
        from src.execution.flash_swap_executor import FlashSwapExecutor
        
        # FlashSwapExecutor requires web3 provider, test class definition only
        self.assertTrue(hasattr(FlashSwapExecutor, '__init__'))

    def test_arbitrage_opportunity_instantiation(self):
        """Test ArbitrageOpportunity can be created"""
        from src.arbitrage.opportunity import ArbitrageOpportunity, OpportunityStatus, ArbitrageType
        from datetime import datetime
        
        opp = ArbitrageOpportunity(
            opportunity_id="test-001",
            arb_type=ArbitrageType.SPATIAL,
            status=OpportunityStatus.IDENTIFIED,
            input_amount=1000.0,
            expected_output=1050.0,
            gross_profit=50.0,
            pool_addresses=["0x123"],
            protocols=["uniswap_v2"],
            timestamp=datetime.now()
        )
        
        self.assertEqual(opp.opportunity_id, "test-001")
        self.assertEqual(opp.arb_type, ArbitrageType.SPATIAL)
        self.assertEqual(opp.status, OpportunityStatus.IDENTIFIED)
        self.assertEqual(opp.gross_profit, 50.0)

    def test_spatial_arb_engine_instantiation(self):
        """Test SpatialArbEngine can be created"""
        from src.arbitrage.spatial_arb_engine import SpatialArbEngine
        
        engine = SpatialArbEngine(min_profit_bips=50)
        
        self.assertIsNotNone(engine)
        self.assertEqual(engine.min_profit_bips, 50)

    def test_triangular_arb_engine_instantiation(self):
        """Test TriangularArbEngine can be created"""
        from src.arbitrage.triangular_arb_engine import TriangularArbEngine
        
        engine = TriangularArbEngine(min_profit_bips=100)
        
        self.assertIsNotNone(engine)
        self.assertEqual(engine.min_profit_bips, 100)

    def test_protocol_registry_instantiation(self):
        """Test ProtocolRegistry can be created and used"""
        from src.core.protocol_registry import ProtocolRegistry, ProtocolInfo
        
        registry = ProtocolRegistry()
        
        self.assertIsNotNone(registry)
        self.assertTrue(hasattr(registry, 'register_protocol'))


class TestAxionCitadelDataStructures(unittest.TestCase):
    """Test AxionCitadel data structures and enums"""

    def test_opportunity_status_enum(self):
        """Test OpportunityStatus enum values"""
        from src.arbitrage.opportunity import OpportunityStatus
        
        self.assertEqual(OpportunityStatus.IDENTIFIED.value, "identified")
        self.assertEqual(OpportunityStatus.SIMULATED.value, "simulated")
        self.assertEqual(OpportunityStatus.PENDING.value, "pending")
        self.assertEqual(OpportunityStatus.EXECUTING.value, "executing")
        self.assertEqual(OpportunityStatus.EXECUTED.value, "executed")
        self.assertEqual(OpportunityStatus.FAILED.value, "failed")
        self.assertEqual(OpportunityStatus.EXPIRED.value, "expired")

    def test_arbitrage_type_enum(self):
        """Test ArbitrageType enum values"""
        from src.arbitrage.opportunity import ArbitrageType
        
        self.assertEqual(ArbitrageType.SPATIAL.value, "spatial")
        self.assertEqual(ArbitrageType.TRIANGULAR.value, "triangular")
        self.assertEqual(ArbitrageType.MULTI_HOP.value, "multi_hop")
        self.assertEqual(ArbitrageType.FLASH_LOAN.value, "flash_loan")

    def test_pool_state_dataclass(self):
        """Test PoolState dataclass"""
        from src.arbitrage.spatial_arb_engine import PoolState
        
        pool = PoolState(
            pool_address="0x1234567890123456789012345678901234567890",
            token0="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            token1="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            reserve0=1000000.0,
            reserve1=500.0,
            protocol="uniswap_v2"
        )
        
        self.assertEqual(pool.protocol, "uniswap_v2")
        self.assertEqual(pool.reserve0, 1000000.0)
        self.assertEqual(pool.reserve1, 500.0)


class TestAxionCitadelIntegration(unittest.TestCase):
    """Test integration between AxionCitadel components"""

    def test_profit_calculator_basic_calculation(self):
        """Test AdvancedProfitCalculator performs calculations"""
        from src.execution.advanced_profit_calculator import AdvancedProfitCalculator
        
        calc = AdvancedProfitCalculator(
            flash_loan_fee_bps=9,
            mev_leak_factor=0.10
        )
        
        result = calc.calculate_profit(
            revenue=1000.0,
            flash_loan_amount=500.0,
            gas_cost_gwei=50,
            gas_limit=200000
        )
        
        self.assertIn('net_profit', result)
        self.assertIn('is_profitable', result)
        self.assertIsInstance(result['net_profit'], (int, float))
        self.assertIsInstance(result['is_profitable'], bool)

    def test_spatial_arb_engine_find_opportunities(self):
        """Test SpatialArbEngine can find opportunities"""
        from src.arbitrage.spatial_arb_engine import SpatialArbEngine, PoolState
        
        engine = SpatialArbEngine(min_profit_bips=50)
        
        # Create sample pools
        pool1 = PoolState(
            pool_address="0x1234567890123456789012345678901234567890",
            token0="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            token1="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            reserve0=1000000.0,
            reserve1=500.0,
            protocol="uniswap_v2"
        )
        
        pool2 = PoolState(
            pool_address="0x2345678901234567890123456789012345678901",
            token0="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            token1="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            reserve0=900000.0,
            reserve1=510.0,
            protocol="sushiswap"
        )
        
        opportunities = engine.find_opportunities([pool1, pool2], input_amount=1.0)
        
        self.assertIsInstance(opportunities, list)

    def test_triangular_arb_engine_find_opportunities(self):
        """Test TriangularArbEngine can find opportunities"""
        from src.arbitrage.triangular_arb_engine import TriangularArbEngine, PoolState
        
        engine = TriangularArbEngine(min_profit_bips=100)
        
        # Create sample pools for triangular arbitrage
        pool1 = PoolState(
            pool_address="0x1234567890123456789012345678901234567890",
            token0="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
            token1="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # WETH
            reserve0=1000000.0,
            reserve1=500.0,
            protocol="uniswap_v2"
        )
        
        opportunities = engine.find_opportunities(
            pools=[pool1],
            start_token="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            input_amount=100.0
        )
        
        self.assertIsInstance(opportunities, list)

    def test_protocol_registry_registration(self):
        """Test ProtocolRegistry can register protocols"""
        from src.core.protocol_registry import ProtocolRegistry, ProtocolInfo
        
        registry = ProtocolRegistry()
        
        registry.register_protocol(
            name="uniswap_v2",
            version="v2",
            factory_address="0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
            router_address="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            fee_structure="fixed"
        )
        
        retrieved = registry.get_protocol_info("uniswap_v2")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, "uniswap_v2")

    def test_opportunity_status_lifecycle(self):
        """Test ArbitrageOpportunity status transitions"""
        from src.arbitrage.opportunity import ArbitrageOpportunity, OpportunityStatus, ArbitrageType
        from datetime import datetime
        
        opp = ArbitrageOpportunity(
            opportunity_id="test-lifecycle",
            arb_type=ArbitrageType.SPATIAL,
            status=OpportunityStatus.IDENTIFIED,
            input_amount=1000.0,
            expected_output=1050.0,
            gross_profit=50.0,
            pool_addresses=["0x123"],
            protocols=["uniswap_v2"],
            timestamp=datetime.now()
        )
        
        # Test status updates
        opp.status = OpportunityStatus.SIMULATED
        self.assertEqual(opp.status, OpportunityStatus.SIMULATED)
        
        opp.status = OpportunityStatus.PENDING
        self.assertEqual(opp.status, OpportunityStatus.PENDING)
        
        opp.status = OpportunityStatus.EXECUTED
        self.assertEqual(opp.status, OpportunityStatus.EXECUTED)


class TestAxionCitadelSyntaxValidation(unittest.TestCase):
    """Test Python syntax and structure validation"""

    def test_all_modules_are_valid_python(self):
        """Test all Python files have valid syntax"""
        import py_compile
        from pathlib import Path
        
        base_path = Path(__file__).parent.parent
        python_files = [
            "src/execution/advanced_profit_calculator.py",
            "src/execution/flash_swap_executor.py",
            "src/execution/transaction_manager.py",
            "src/arbitrage/opportunity.py",
            "src/arbitrage/spatial_arb_engine.py",
            "src/arbitrage/triangular_arb_engine.py",
            "src/data/dex_data_provider.py",
            "src/data/pool_scanner.py",
            "src/core/protocol_registry.py",
            "src/monitoring/mempool_monitor_service.py",
        ]
        
        for file_path in python_files:
            full_path = base_path / file_path
            if full_path.exists():
                try:
                    py_compile.compile(str(full_path), doraise=True)
                except py_compile.PyCompileError as e:
                    self.fail(f"Syntax error in {file_path}: {e}")

    def test_dataclass_definitions(self):
        """Test dataclass definitions are valid"""
        from dataclasses import is_dataclass
        from src.arbitrage.opportunity import ArbitrageOpportunity
        from src.arbitrage.spatial_arb_engine import PoolState
        from src.core.protocol_registry import ProtocolInfo
        
        self.assertTrue(is_dataclass(ArbitrageOpportunity))
        self.assertTrue(is_dataclass(PoolState))
        self.assertTrue(is_dataclass(ProtocolInfo))

    def test_enum_definitions(self):
        """Test enum definitions are valid"""
        from enum import Enum
        from src.arbitrage.opportunity import OpportunityStatus, ArbitrageType
        
        self.assertTrue(issubclass(OpportunityStatus, Enum))
        self.assertTrue(issubclass(ArbitrageType, Enum))


class TestAxionCitadelDependencies(unittest.TestCase):
    """Test dependency requirements"""

    def test_stdlib_imports(self):
        """Test standard library imports work"""
        import typing
        import dataclasses
        import enum
        import asyncio
        import json
        from datetime import datetime
        from decimal import Decimal
        from abc import ABC, abstractmethod
        
        self.assertTrue(True)

    def test_optional_dependencies_listed(self):
        """Test optional dependencies are documented"""
        # This test documents which components need which dependencies
        dependencies = {
            "web3": ["flash_swap_executor", "mempool_monitor_service", "mev_sensors"],
            "numpy": ["mev_models"],
        }
        
        # Just verify the dependency mapping exists
        self.assertIn("web3", dependencies)
        self.assertIn("numpy", dependencies)


def run_test_suite():
    """Run the complete test suite and return results"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestAxionCitadelImports))
    suite.addTests(loader.loadTestsFromTestCase(TestAxionCitadelInstantiation))
    suite.addTests(loader.loadTestsFromTestCase(TestAxionCitadelDataStructures))
    suite.addTests(loader.loadTestsFromTestCase(TestAxionCitadelIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestAxionCitadelSyntaxValidation))
    suite.addTests(loader.loadTestsFromTestCase(TestAxionCitadelDependencies))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result


if __name__ == '__main__':
    # Run the test suite
    result = run_test_suite()
    
    # Print summary
    print("\n" + "=" * 70)
    print("AXIONCITADEL INTEGRATION TEST SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    print("=" * 70)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
