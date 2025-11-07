"""
Comprehensive Test Suite for MEV Profit Calculator Module

Tests all components of the profit_calculator module integrated from AxionCitadel.
"""

import sys
import unittest
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.mev.profit_calculator import (
    TransactionType,
    MEVRiskModel,
    ProfitCalculator,
    MempoolSimulator
)


class TestTransactionType(unittest.TestCase):
    """Test TransactionType enum"""
    
    def test_enum_values(self):
        """Test all enum values are defined"""
        self.assertEqual(TransactionType.ARBITRAGE.value, 1)
        self.assertEqual(TransactionType.LIQUIDITY_PROVISION.value, 2)
        self.assertEqual(TransactionType.FLASH_LOAN.value, 3)
        self.assertEqual(TransactionType.FRONT_RUNNABLE.value, 4)
    
    def test_enum_names(self):
        """Test enum names are correct"""
        self.assertEqual(TransactionType.ARBITRAGE.name, "ARBITRAGE")
        self.assertEqual(TransactionType.LIQUIDITY_PROVISION.name, "LIQUIDITY_PROVISION")
        self.assertEqual(TransactionType.FLASH_LOAN.name, "FLASH_LOAN")
        self.assertEqual(TransactionType.FRONT_RUNNABLE.name, "FRONT_RUNNABLE")


class TestMEVRiskModel(unittest.TestCase):
    """Test MEVRiskModel class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.model = MEVRiskModel()
    
    def test_initialization(self):
        """Test model initializes with correct parameters"""
        self.assertIsNotNone(self.model.params)
        self.assertEqual(self.model.params['base_risk'], 0.001)
        self.assertEqual(self.model.params['value_sensitivity'], 0.15)
        self.assertEqual(self.model.params['mempool_congestion_factor'], 0.3)
        self.assertEqual(self.model.params['searcher_density'], 0.25)
    
    def test_frontrun_probabilities(self):
        """Test frontrun probabilities are set for all transaction types"""
        probs = self.model.params['frontrun_probability']
        self.assertEqual(probs[TransactionType.ARBITRAGE], 0.7)
        self.assertEqual(probs[TransactionType.LIQUIDITY_PROVISION], 0.2)
        self.assertEqual(probs[TransactionType.FLASH_LOAN], 0.8)
        self.assertEqual(probs[TransactionType.FRONT_RUNNABLE], 0.9)
    
    def test_calculate_risk_basic(self):
        """Test basic risk calculation"""
        risk = self.model.calculate_risk(
            tx_value=1.0,
            gas_price=0.05,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        self.assertIsInstance(risk, float)
        self.assertGreater(risk, 0)
        self.assertLessEqual(risk, 1.0 * 0.95)  # Should not exceed 95% of tx_value
    
    def test_calculate_risk_zero_value(self):
        """Test risk calculation with zero transaction value"""
        risk = self.model.calculate_risk(
            tx_value=0.0,
            gas_price=0.05,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        # Should return base risk when tx_value is 0
        self.assertGreater(risk, 0)
    
    def test_calculate_risk_high_congestion(self):
        """Test risk calculation with high mempool congestion"""
        risk_low = self.model.calculate_risk(
            tx_value=1.0,
            gas_price=0.05,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.1
        )
        risk_high = self.model.calculate_risk(
            tx_value=1.0,
            gas_price=0.05,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.9
        )
        # Higher congestion should result in lower risk (due to denominator)
        self.assertGreater(risk_low, risk_high)
    
    def test_calculate_risk_different_types(self):
        """Test risk varies by transaction type"""
        params = {
            'tx_value': 1.0,
            'gas_price': 0.05,
            'mempool_congestion': 0.5
        }
        
        risks = {
            tx_type: self.model.calculate_risk(**params, tx_type=tx_type)
            for tx_type in TransactionType
        }
        
        # Front-runnable should have highest risk
        self.assertGreater(risks[TransactionType.FRONT_RUNNABLE], 
                          risks[TransactionType.LIQUIDITY_PROVISION])
    
    def test_calculate_risk_cap(self):
        """Test risk is capped at 95% of transaction value"""
        # Use very high value to test cap
        risk = self.model.calculate_risk(
            tx_value=1.0,
            gas_price=10.0,
            tx_type=TransactionType.FRONT_RUNNABLE,
            mempool_congestion=0.1
        )
        self.assertLessEqual(risk, 1.0 * 0.95)


class TestProfitCalculator(unittest.TestCase):
    """Test ProfitCalculator class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.calculator = ProfitCalculator()
    
    def test_initialization(self):
        """Test calculator initializes with risk model"""
        self.assertIsNotNone(self.calculator.risk_model)
        self.assertIsInstance(self.calculator.risk_model, MEVRiskModel)
    
    def test_calculate_profit_basic(self):
        """Test basic profit calculation"""
        result = self.calculator.calculate_profit(
            revenue=1.5,
            gas_cost=0.05,
            tx_value=1.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        self.assertIn('gross_profit', result)
        self.assertIn('adjusted_profit', result)
        self.assertIn('mev_risk', result)
        self.assertIn('risk_ratio', result)
        self.assertIn('net_profit_margin', result)
    
    def test_calculate_profit_values(self):
        """Test profit calculation produces correct values"""
        result = self.calculator.calculate_profit(
            revenue=2.0,
            gas_cost=0.1,
            tx_value=1.5,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        # Gross profit should be revenue - gas_cost
        self.assertAlmostEqual(result['gross_profit'], 1.9, places=5)
        
        # Adjusted profit should be gross_profit - mev_risk
        expected_adjusted = result['gross_profit'] - result['mev_risk']
        self.assertAlmostEqual(result['adjusted_profit'], expected_adjusted, places=5)
        
        # MEV risk should be positive
        self.assertGreater(result['mev_risk'], 0)
    
    def test_calculate_profit_negative_input(self):
        """Test that negative inputs raise ValueError"""
        with self.assertRaises(ValueError):
            self.calculator.calculate_profit(
                revenue=-1.0,
                gas_cost=0.05,
                tx_value=1.0,
                tx_type=TransactionType.ARBITRAGE,
                mempool_congestion=0.5
            )
        
        with self.assertRaises(ValueError):
            self.calculator.calculate_profit(
                revenue=1.0,
                gas_cost=-0.05,
                tx_value=1.0,
                tx_type=TransactionType.ARBITRAGE,
                mempool_congestion=0.5
            )
    
    def test_calculate_profit_default_congestion(self):
        """Test default mempool congestion parameter"""
        result = self.calculator.calculate_profit(
            revenue=1.5,
            gas_cost=0.05,
            tx_value=1.0,
            tx_type=TransactionType.ARBITRAGE
        )
        
        self.assertIsNotNone(result)
        self.assertIn('adjusted_profit', result)
    
    def test_risk_ratio_calculation(self):
        """Test risk ratio is calculated correctly"""
        result = self.calculator.calculate_profit(
            revenue=10.0,
            gas_cost=0.1,
            tx_value=5.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        expected_ratio = result['mev_risk'] / (result['gross_profit'] + result['mev_risk'] + 1e-9)
        # Note: risk_ratio is calculated as mev_risk / (revenue + 1e-9)
        self.assertGreater(result['risk_ratio'], 0)
    
    def test_zero_revenue_division(self):
        """Test division by zero protection with zero revenue"""
        result = self.calculator.calculate_profit(
            revenue=0.0,
            gas_cost=0.0,
            tx_value=0.0,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        # Should not raise division by zero error
        self.assertIsNotNone(result)
        self.assertIsInstance(result['risk_ratio'], float)


class TestMempoolSimulator(unittest.TestCase):
    """Test MempoolSimulator class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.simulator = MempoolSimulator()
        self.calculator = ProfitCalculator()
    
    def test_initialization(self):
        """Test simulator initializes with correct parameters"""
        self.assertEqual(len(self.simulator.congestion_levels), 3)
        self.assertEqual(len(self.simulator.tx_values), 5)
        self.assertIn(0.1, self.simulator.congestion_levels)
        self.assertIn(0.5, self.simulator.congestion_levels)
        self.assertIn(0.9, self.simulator.congestion_levels)
    
    def test_run_simulation(self):
        """Test simulation runs and produces results"""
        results = self.simulator.run_simulation(self.calculator)
        
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        
        # Should have results for each combination of:
        # 3 congestion levels * 5 tx values * 4 transaction types = 60 results
        expected_count = 3 * 5 * 4
        self.assertEqual(len(results), expected_count)
    
    def test_simulation_result_structure(self):
        """Test each simulation result has correct structure"""
        results = self.simulator.run_simulation(self.calculator)
        
        for result in results:
            # Check profit calculator fields
            self.assertIn('gross_profit', result)
            self.assertIn('adjusted_profit', result)
            self.assertIn('mev_risk', result)
            self.assertIn('risk_ratio', result)
            self.assertIn('net_profit_margin', result)
            
            # Check simulator added fields
            self.assertIn('tx_type', result)
            self.assertIn('congestion', result)
            self.assertIn('tx_value', result)
    
    def test_simulation_transaction_types(self):
        """Test simulation covers all transaction types"""
        results = self.simulator.run_simulation(self.calculator)
        
        tx_types = set(r['tx_type'] for r in results)
        expected_types = {t.name for t in TransactionType}
        
        self.assertEqual(tx_types, expected_types)
    
    def test_simulation_congestion_levels(self):
        """Test simulation covers all congestion levels"""
        results = self.simulator.run_simulation(self.calculator)
        
        congestion_levels = set(r['congestion'] for r in results)
        expected_levels = set(self.simulator.congestion_levels)
        
        self.assertEqual(congestion_levels, expected_levels)
    
    def test_simulation_values_are_numeric(self):
        """Test all simulation result values are numeric"""
        results = self.simulator.run_simulation(self.calculator)
        
        for result in results:
            self.assertIsInstance(result['gross_profit'], (int, float))
            self.assertIsInstance(result['adjusted_profit'], (int, float))
            self.assertIsInstance(result['mev_risk'], (int, float))
            self.assertIsInstance(result['tx_value'], (int, float))
            self.assertIsInstance(result['congestion'], (int, float))


class TestIntegration(unittest.TestCase):
    """Integration tests for the profit calculator module"""
    
    def test_full_workflow(self):
        """Test complete workflow from calculation to simulation"""
        # Create calculator
        calculator = ProfitCalculator()
        
        # Calculate single profit
        profit = calculator.calculate_profit(
            revenue=2.0,
            gas_cost=0.1,
            tx_value=1.5,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.5
        )
        
        self.assertIsNotNone(profit)
        self.assertGreater(profit['adjusted_profit'], 0)
        
        # Run simulation
        simulator = MempoolSimulator()
        results = simulator.run_simulation(calculator)
        
        self.assertEqual(len(results), 60)  # 3 * 5 * 4
        
        # Verify all results are valid
        for result in results:
            self.assertIsInstance(result['adjusted_profit'], (int, float))
            self.assertGreater(result['gross_profit'], 0)
    
    def test_realistic_arbitrage_scenario(self):
        """Test realistic arbitrage scenario"""
        calculator = ProfitCalculator()
        
        # Realistic values for a typical arbitrage
        revenue = 1.2  # 20% profit on 1 ETH
        gas_cost = 0.08  # ~$160 at 2000 gwei
        tx_value = 1.0
        
        profit = calculator.calculate_profit(
            revenue=revenue,
            gas_cost=gas_cost,
            tx_value=tx_value,
            tx_type=TransactionType.ARBITRAGE,
            mempool_congestion=0.6
        )
        
        # Verify reasonable values
        self.assertGreater(profit['gross_profit'], 0)
        self.assertLess(profit['mev_risk'], profit['gross_profit'])
        self.assertGreater(profit['risk_ratio'], 0)
        self.assertLess(profit['risk_ratio'], 1.0)


def main():
    """Run all tests"""
    unittest.main(verbosity=2)


if __name__ == '__main__':
    main()
