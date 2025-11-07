"""
MEV Component Test Suite

Comprehensive testing for MEV (Maximal Extractable Value) components
after installing dependencies (web3, numpy, pandas, scikit-learn).

Tests all MEV models and sensors that were previously skipped due to missing dependencies.

Test Categories:
1. Import Tests - Verify all MEV components can be imported
2. Instantiation Tests - Verify MEV components can be created
3. Enum Validation Tests - Verify TransactionType enum values
4. Basic Functionality Tests - Verify MEV components perform operations
5. Integration Tests - Verify MEV components work together
6. Dependency Validation - Verify required dependencies are available

Author: StableExo
Related Issues: #229, #230
"""

import sys
import unittest
from pathlib import Path
from typing import Dict, Any

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestMEVImports(unittest.TestCase):
    """Test that all MEV components can be imported"""

    def test_import_transaction_type(self):
        """Test TransactionType enum can be imported"""
        from src.mev.models.transaction_type import TransactionType
        self.assertIsNotNone(TransactionType)

    def test_import_mev_risk_model(self):
        """Test MEVRiskModel class can be imported"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        self.assertIsNotNone(MEVRiskModel)

    def test_import_profit_calculator(self):
        """Test ProfitCalculator class can be imported"""
        from src.mev.models.profit_calculator import ProfitCalculator
        self.assertIsNotNone(ProfitCalculator)

    def test_import_mempool_congestion_sensor(self):
        """Test MempoolCongestionSensor class can be imported"""
        from src.mev.sensors.mempool_congestion_sensor import MempoolCongestionSensor
        self.assertIsNotNone(MempoolCongestionSensor)

    def test_import_searcher_density_sensor(self):
        """Test SearcherDensitySensor class can be imported"""
        from src.mev.sensors.searcher_density_sensor import SearcherDensitySensor
        self.assertIsNotNone(SearcherDensitySensor)

    def test_import_mev_sensor_hub(self):
        """Test MEVSensorHub class can be imported"""
        from src.mev.sensors.mev_sensor_hub import MEVSensorHub
        self.assertIsNotNone(MEVSensorHub)


class TestMEVInstantiation(unittest.TestCase):
    """Test that MEV components can be instantiated"""

    def test_mev_risk_model_instantiation(self):
        """Test MEVRiskModel can be created without parameters"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        
        model = MEVRiskModel()
        self.assertIsNotNone(model)
        self.assertTrue(hasattr(model, 'params'))
        self.assertTrue(hasattr(model, 'calculate_risk'))

    def test_profit_calculator_instantiation(self):
        """Test ProfitCalculator can be created without parameters"""
        from src.mev.models.profit_calculator import ProfitCalculator
        
        calc = ProfitCalculator()
        self.assertIsNotNone(calc)
        self.assertTrue(hasattr(calc, 'calculate_profit'))
        self.assertTrue(hasattr(calc, 'risk_model'))

    def test_searcher_density_sensor_instantiation(self):
        """Test SearcherDensitySensor can be created with minimal parameters"""
        from src.mev.sensors.searcher_density_sensor import SearcherDensitySensor
        
        # Create with empty routers list for testing
        sensor = SearcherDensitySensor(routers=[])
        self.assertIsNotNone(sensor)
        self.assertTrue(hasattr(sensor, 'routers'))

    def test_mev_sensor_hub_instantiation(self):
        """Test MEVSensorHub can be created without parameters"""
        from src.mev.sensors.mev_sensor_hub import MEVSensorHub
        
        hub = MEVSensorHub()
        self.assertIsNotNone(hub)
        self.assertTrue(hasattr(hub, 'cache'))


class TestTransactionTypeEnum(unittest.TestCase):
    """Test TransactionType enum values and structure"""

    def test_transaction_type_enum_values(self):
        """Test TransactionType has expected enum values"""
        from src.mev.models.transaction_type import TransactionType
        
        # Verify enum has expected MEV-related transaction types
        self.assertTrue(hasattr(TransactionType, 'ARBITRAGE'))
        self.assertTrue(hasattr(TransactionType, 'LIQUIDITY_PROVISION'))
        self.assertTrue(hasattr(TransactionType, 'FLASH_LOAN'))
        self.assertTrue(hasattr(TransactionType, 'FRONT_RUNNABLE'))

    def test_transaction_type_enum_count(self):
        """Test TransactionType has the expected number of values"""
        from src.mev.models.transaction_type import TransactionType
        
        # Should have 4 transaction types
        enum_values = list(TransactionType)
        self.assertEqual(len(enum_values), 4)

    def test_transaction_type_enum_values_are_numeric(self):
        """Test TransactionType enum values are integers"""
        from src.mev.models.transaction_type import TransactionType
        
        for tx_type in TransactionType:
            self.assertIsInstance(tx_type.value, int)


class TestMEVRiskModel(unittest.TestCase):
    """Test MEVRiskModel basic functionality"""

    def test_mev_risk_calculation(self):
        """Test MEVRiskModel can calculate risk"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        from src.mev.models.transaction_type import TransactionType
        
        model = MEVRiskModel()
        
        # Test risk calculation with valid parameters
        risk = model.calculate_risk(
            tx_value=1000.0,
            gas_price=50.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        self.assertIsNotNone(risk)
        self.assertIsInstance(risk, float)
        self.assertGreaterEqual(risk, 0.0)

    def test_mev_risk_model_parameters(self):
        """Test MEVRiskModel has expected parameters"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        
        model = MEVRiskModel()
        params = model.get_params()
        
        self.assertIn('base_risk', params)
        self.assertIn('value_sensitivity', params)
        self.assertIn('mempool_congestion_factor', params)
        self.assertIn('searcher_density', params)
        self.assertIn('frontrun_probability', params)

    def test_mev_risk_model_calibration(self):
        """Test MEVRiskModel calibration method works"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        
        model = MEVRiskModel()
        
        # Test calibration with new parameters
        new_params = {
            'base_risk': 0.002,
            'value_sensitivity': 0.20
        }
        
        model.calibrate(new_params)
        updated_params = model.get_params()
        
        self.assertEqual(updated_params['base_risk'], 0.002)
        self.assertEqual(updated_params['value_sensitivity'], 0.20)

    def test_mev_risk_different_transaction_types(self):
        """Test MEVRiskModel calculates different risks for different transaction types"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        from src.mev.models.transaction_type import TransactionType
        
        model = MEVRiskModel()
        
        # Calculate risk for different transaction types
        risk_arbitrage = model.calculate_risk(
            tx_value=1000.0,
            gas_price=50.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        risk_flash_loan = model.calculate_risk(
            tx_value=1000.0,
            gas_price=50.0,
            tx_type=TransactionType.FLASH_LOAN,
            mempool_congestion=0.5
        )
        
        # Flash loans should have higher risk than arbitrage
        # (based on frontrun_probability: FLASH_LOAN=0.8 vs ARBITRAGE=0.7)
        self.assertGreater(risk_flash_loan, risk_arbitrage)


class TestProfitCalculator(unittest.TestCase):
    """Test ProfitCalculator basic functionality"""

    def test_profit_calculation_with_mev(self):
        """Test ProfitCalculator calculates profit with MEV risk"""
        from src.mev.models.profit_calculator import ProfitCalculator
        from src.mev.models.transaction_type import TransactionType
        
        calc = ProfitCalculator()
        
        # Test profit calculation
        result = calc.calculate_profit(
            revenue=1000.0,
            gas_cost=50.0,
            tx_value=500.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        self.assertIsNotNone(result)
        self.assertIsInstance(result, dict)
        self.assertIn('gross_profit', result)
        self.assertIn('adjusted_profit', result)
        self.assertIn('mev_risk', result)
        self.assertIn('risk_ratio', result)
        self.assertIn('net_profit_margin', result)

    def test_profit_calculation_values(self):
        """Test ProfitCalculator produces expected values"""
        from src.mev.models.profit_calculator import ProfitCalculator
        from src.mev.models.transaction_type import TransactionType
        
        calc = ProfitCalculator()
        
        result = calc.calculate_profit(
            revenue=1000.0,
            gas_cost=50.0,
            tx_value=500.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        # Gross profit should be revenue - gas_cost
        self.assertEqual(result['gross_profit'], 950.0)
        
        # Adjusted profit should be gross profit - mev_risk
        self.assertEqual(result['adjusted_profit'], result['gross_profit'] - result['mev_risk'])
        
        # MEV risk should be positive
        self.assertGreater(result['mev_risk'], 0.0)

    def test_profit_calculation_error_handling(self):
        """Test ProfitCalculator handles invalid inputs"""
        from src.mev.models.profit_calculator import ProfitCalculator
        from src.mev.models.transaction_type import TransactionType
        
        calc = ProfitCalculator()
        
        # Test negative revenue raises error
        with self.assertRaises(ValueError):
            calc.calculate_profit(
                revenue=-100.0,
                gas_cost=50.0,
                tx_value=500.0,
                tx_type=TransactionType.ARBITRAGE
            )

    def test_profit_calculator_has_risk_model(self):
        """Test ProfitCalculator has access to underlying MEV risk model"""
        from src.mev.models.profit_calculator import ProfitCalculator
        from src.mev.models.mev_risk_model import MEVRiskModel
        
        calc = ProfitCalculator()
        risk_model = calc.get_risk_model()
        
        self.assertIsNotNone(risk_model)
        self.assertIsInstance(risk_model, MEVRiskModel)


class TestMEVSensorHub(unittest.TestCase):
    """Test MEVSensorHub integration"""

    def test_sensor_hub_has_cache(self):
        """Test MEVSensorHub has caching mechanism"""
        from src.mev.sensors.mev_sensor_hub import MEVSensorHub
        
        hub = MEVSensorHub()
        
        self.assertTrue(hasattr(hub, 'cache'))
        self.assertTrue(hasattr(hub, 'cache_ttl'))

    def test_sensor_hub_has_metrics_method(self):
        """Test MEVSensorHub can retrieve metrics"""
        from src.mev.sensors.mev_sensor_hub import MEVSensorHub
        
        hub = MEVSensorHub()
        
        self.assertTrue(hasattr(hub, 'get_metrics'))

    def test_sensor_hub_cache_methods(self):
        """Test MEVSensorHub cache methods exist"""
        from src.mev.sensors.mev_sensor_hub import MEVSensorHub
        
        hub = MEVSensorHub()
        
        self.assertTrue(hasattr(hub, '_cache_result'))
        self.assertTrue(hasattr(hub, '_is_cache_valid'))


class TestSearcherDensitySensor(unittest.TestCase):
    """Test SearcherDensitySensor functionality"""

    def test_searcher_density_sensor_attributes(self):
        """Test SearcherDensitySensor has expected attributes"""
        from src.mev.sensors.searcher_density_sensor import SearcherDensitySensor
        
        routers = ['Uniswap V3', 'Sushiswap']
        sensor = SearcherDensitySensor(routers=routers)
        
        self.assertEqual(sensor.routers, routers)
        self.assertTrue(hasattr(sensor, 'bot_activity_data'))
        self.assertTrue(hasattr(sensor, 'mev_transaction_ratio'))
        self.assertTrue(hasattr(sensor, 'sandwich_attack_score'))

    def test_searcher_density_sensor_methods(self):
        """Test SearcherDensitySensor has expected methods"""
        from src.mev.sensors.searcher_density_sensor import SearcherDensitySensor
        
        sensor = SearcherDensitySensor(routers=[])
        
        self.assertTrue(hasattr(sensor, 'track_activity'))
        self.assertTrue(hasattr(sensor, 'calculate_mev_transaction_ratio'))
        self.assertTrue(hasattr(sensor, 'calculate_sandwich_attack_score'))
        self.assertTrue(hasattr(sensor, 'analyze_bot_clustering'))


class TestDependencies(unittest.TestCase):
    """Test that required dependencies are available"""

    def test_numpy_available(self):
        """Test numpy dependency is installed and importable"""
        import numpy as np
        self.assertIsNotNone(np)
        
        # Test basic numpy functionality
        arr = np.array([1, 2, 3])
        self.assertEqual(len(arr), 3)

    def test_web3_available(self):
        """Test web3 dependency is installed and importable"""
        from web3 import Web3
        self.assertIsNotNone(Web3)
        
        # Test Web3 can be instantiated
        w3 = Web3()
        self.assertIsNotNone(w3)

    def test_pandas_available(self):
        """Test pandas dependency is installed and importable"""
        import pandas as pd
        self.assertIsNotNone(pd)

    def test_sklearn_available(self):
        """Test scikit-learn dependency is installed and importable"""
        import sklearn
        self.assertIsNotNone(sklearn)


class TestMEVIntegration(unittest.TestCase):
    """Test integration between MEV components"""

    def test_profit_calculator_uses_risk_model(self):
        """Test ProfitCalculator integrates with MEVRiskModel"""
        from src.mev.models.profit_calculator import ProfitCalculator
        from src.mev.models.transaction_type import TransactionType
        
        calc = ProfitCalculator()
        
        # Calculate profit - this should internally use MEVRiskModel
        result = calc.calculate_profit(
            revenue=1000.0,
            gas_cost=50.0,
            tx_value=500.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        # Verify risk was calculated and deducted
        self.assertGreater(result['mev_risk'], 0.0)
        self.assertLess(result['adjusted_profit'], result['gross_profit'])

    def test_transaction_type_enum_used_by_models(self):
        """Test TransactionType enum is properly used by MEV models"""
        from src.mev.models.mev_risk_model import MEVRiskModel
        from src.mev.models.transaction_type import TransactionType
        
        model = MEVRiskModel()
        
        # All transaction types should have frontrun probabilities
        params = model.get_params()
        frontrun_probs = params['frontrun_probability']
        
        for tx_type in TransactionType:
            self.assertIn(tx_type, frontrun_probs)
            self.assertIsInstance(frontrun_probs[tx_type], float)
            self.assertGreaterEqual(frontrun_probs[tx_type], 0.0)
            self.assertLessEqual(frontrun_probs[tx_type], 1.0)


def run_test_suite():
    """Run the complete MEV component test suite with formatted output"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes in order
    test_classes = [
        TestMEVImports,
        TestMEVInstantiation,
        TestTransactionTypeEnum,
        TestMEVRiskModel,
        TestProfitCalculator,
        TestMEVSensorHub,
        TestSearcherDensitySensor,
        TestDependencies,
        TestMEVIntegration,
    ]
    
    for test_class in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(test_class))
    
    # Run tests with verbosity
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result


def print_summary(result):
    """Print formatted test summary"""
    total_tests = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped)
    passed = total_tests - failures - errors - skipped
    success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
    
    print("\n" + "=" * 70)
    print("MEV COMPONENT TEST SUITE - SUMMARY")
    print("=" * 70)
    print(f"Total Tests:     {total_tests}")
    print(f"Passed:          {passed} ✓")
    print(f"Failed:          {failures} ✗")
    print(f"Errors:          {errors} ✗")
    print(f"Skipped:         {skipped}")
    print(f"Success Rate:    {success_rate:.1f}%")
    print("=" * 70)
    
    if result.wasSuccessful():
        print("\n✅ ALL MEV COMPONENT TESTS PASSED!")
        print("Dependencies are properly installed and MEV system is operational.")
    else:
        print("\n❌ SOME TESTS FAILED")
        print("Review the output above for details.")
    
    print()


if __name__ == '__main__':
    print("=" * 70)
    print("MEV COMPONENT TEST SUITE")
    print("=" * 70)
    print("Testing MEV models, sensors, and integrations")
    print("Dependencies: web3, numpy, pandas, scikit-learn")
    print("=" * 70)
    print()
    
    # Run the test suite
    result = run_test_suite()
    
    # Print formatted summary
    print_summary(result)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
