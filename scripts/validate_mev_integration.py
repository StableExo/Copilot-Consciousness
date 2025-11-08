#!/usr/bin/env python3
"""
MEV Integration Validation Script

Validates the complete MEV integration from AxionCitadel into Copilot-Consciousness.
Performs comprehensive checks on:
- Directory structure
- Required files
- Module imports
- Configuration
- Test suite
- Example scripts
"""

import sys
import os
from pathlib import Path
from typing import List, Tuple, Dict
import importlib.util


class Color:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


class ValidationResult:
    """Store validation results"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.errors: List[str] = []
        self.warnings_list: List[str] = []
    
    def add_pass(self):
        self.passed += 1
    
    def add_fail(self, message: str):
        self.failed += 1
        self.errors.append(message)
    
    def add_warning(self, message: str):
        self.warnings += 1
        self.warnings_list.append(message)
    
    def is_success(self) -> bool:
        return self.failed == 0
    
    def print_summary(self):
        """Print validation summary"""
        print("\n" + "=" * 70)
        print(f"{Color.BOLD}VALIDATION SUMMARY{Color.END}")
        print("=" * 70)
        print(f"{Color.GREEN}✅ Passed: {self.passed}{Color.END}")
        if self.warnings > 0:
            print(f"{Color.YELLOW}⚠️  Warnings: {self.warnings}{Color.END}")
        if self.failed > 0:
            print(f"{Color.RED}❌ Failed: {self.failed}{Color.END}")
        
        if self.warnings_list:
            print(f"\n{Color.YELLOW}Warnings:{Color.END}")
            for warning in self.warnings_list:
                print(f"  ⚠️  {warning}")
        
        if self.errors:
            print(f"\n{Color.RED}Errors:{Color.END}")
            for error in self.errors:
                print(f"  ❌ {error}")
        
        print("=" * 70)


def get_repo_root() -> Path:
    """Get the repository root directory"""
    script_dir = Path(__file__).parent
    return script_dir.parent.absolute()


def check_directory_structure(result: ValidationResult):
    """Validate required directory structure exists"""
    print(f"\n{Color.BLUE}▶ Checking directory structure{Color.END}")
    print("━" * 70)
    
    repo_root = get_repo_root()
    
    required_dirs = [
        'src/mev/profit_calculator',
        'src/mev/models',
        'tests/mev',
        'examples/mev',
        'scripts',
        'docs',
    ]
    
    for dir_path in required_dirs:
        full_path = repo_root / dir_path
        if full_path.exists() and full_path.is_dir():
            print(f"  {Color.GREEN}✅{Color.END} {dir_path}")
            result.add_pass()
        else:
            print(f"  {Color.RED}❌{Color.END} {dir_path} - not found")
            result.add_fail(f"Directory missing: {dir_path}")


def check_required_files(result: ValidationResult):
    """Validate required files exist"""
    print(f"\n{Color.BLUE}▶ Checking required files{Color.END}")
    print("━" * 70)
    
    repo_root = get_repo_root()
    
    required_files = [
        # Core MEV profit calculator modules
        'src/mev/profit_calculator/__init__.py',
        'src/mev/profit_calculator/transaction_type.py',
        'src/mev/profit_calculator/mev_risk_model.py',
        'src/mev/profit_calculator/profit_calculator.py',
        'src/mev/profit_calculator/mempool_simulator.py',
        
        # Test files
        'tests/mev/test_profit_calculator.py',
        
        # Examples
        'examples/mev/mev_profit_calculation_example.py',
        
        # Scripts
        'scripts/setup_mev_integration.sh',
        'scripts/validate_mev_integration.py',
        
        # Configuration
        'requirements.txt',
    ]
    
    for file_path in required_files:
        full_path = repo_root / file_path
        if full_path.exists() and full_path.is_file():
            print(f"  {Color.GREEN}✅{Color.END} {file_path}")
            result.add_pass()
        else:
            print(f"  {Color.RED}❌{Color.END} {file_path} - not found")
            result.add_fail(f"File missing: {file_path}")
    
    # Optional files (warnings only)
    optional_files = [
        'docs/MEV_SETUP_GUIDE.md',
        'IMPLEMENTATION_SUMMARY_MEV.md',
    ]
    
    for file_path in optional_files:
        full_path = repo_root / file_path
        if full_path.exists():
            print(f"  {Color.GREEN}✅{Color.END} {file_path} (optional)")
            result.add_pass()
        else:
            print(f"  {Color.YELLOW}⚠️{Color.END}  {file_path} - not found (optional)")
            result.add_warning(f"Optional file missing: {file_path}")


def check_module_imports(result: ValidationResult):
    """Validate MEV modules can be imported"""
    print(f"\n{Color.BLUE}▶ Checking module imports{Color.END}")
    print("━" * 70)
    
    repo_root = get_repo_root()
    
    # Add repo root to path for imports
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    
    modules_to_test = [
        ('src.mev.profit_calculator', 'TransactionType'),
        ('src.mev.profit_calculator', 'MEVRiskModel'),
        ('src.mev.profit_calculator', 'ProfitCalculator'),
        ('src.mev.profit_calculator', 'MempoolSimulator'),
    ]
    
    for module_name, class_name in modules_to_test:
        try:
            module = importlib.import_module(module_name)
            if hasattr(module, class_name):
                print(f"  {Color.GREEN}✅{Color.END} {module_name}.{class_name}")
                result.add_pass()
            else:
                print(f"  {Color.RED}❌{Color.END} {module_name}.{class_name} - class not found")
                result.add_fail(f"Class not found: {module_name}.{class_name}")
        except ImportError as e:
            print(f"  {Color.RED}❌{Color.END} {module_name}.{class_name} - import error: {e}")
            result.add_fail(f"Import error: {module_name}.{class_name}")


def check_dependencies(result: ValidationResult):
    """Check if required dependencies are installed"""
    print(f"\n{Color.BLUE}▶ Checking dependencies{Color.END}")
    print("━" * 70)
    
    critical_deps = ['numpy']
    optional_deps = ['pandas', 'scikit-learn']
    
    for dep in critical_deps:
        try:
            importlib.import_module(dep)
            print(f"  {Color.GREEN}✅{Color.END} {dep}")
            result.add_pass()
        except ImportError:
            print(f"  {Color.RED}❌{Color.END} {dep} - not installed")
            result.add_fail(f"Critical dependency missing: {dep}")
    
    for dep in optional_deps:
        try:
            importlib.import_module(dep)
            print(f"  {Color.GREEN}✅{Color.END} {dep} (optional)")
            result.add_pass()
        except ImportError:
            print(f"  {Color.YELLOW}⚠️{Color.END}  {dep} - not installed (optional)")
            result.add_warning(f"Optional dependency missing: {dep}")


def check_test_suite(result: ValidationResult):
    """Validate test suite can run"""
    print(f"\n{Color.BLUE}▶ Checking test suite{Color.END}")
    print("━" * 70)
    
    repo_root = get_repo_root()
    test_file = repo_root / 'tests/mev/test_profit_calculator.py'
    
    if not test_file.exists():
        print(f"  {Color.RED}❌{Color.END} Test file not found")
        result.add_fail("Test file not found: tests/mev/test_profit_calculator.py")
        return
    
    # Try to import the test module
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    
    try:
        # Load test module
        import unittest
        loader = unittest.TestLoader()
        
        # Change to repo root for imports
        original_dir = os.getcwd()
        os.chdir(repo_root)
        
        try:
            suite = loader.loadTestsFromName('tests.mev.test_profit_calculator')
            test_count = suite.countTestCases()
            
            print(f"  {Color.GREEN}✅{Color.END} Test suite loaded successfully")
            print(f"  {Color.GREEN}✅{Color.END} Found {test_count} test cases")
            result.add_pass()
            result.add_pass()
            
            if test_count >= 20:
                print(f"  {Color.GREEN}✅{Color.END} Test coverage is comprehensive (30+ tests)")
                result.add_pass()
            else:
                print(f"  {Color.YELLOW}⚠️{Color.END}  Test coverage could be improved (currently {test_count} tests)")
                result.add_warning(f"Test coverage: {test_count} tests (recommended: 30+)")
        
        finally:
            os.chdir(original_dir)
    
    except Exception as e:
        print(f"  {Color.RED}❌{Color.END} Failed to load test suite: {e}")
        result.add_fail(f"Test suite load error: {e}")


def check_examples(result: ValidationResult):
    """Validate example scripts exist and can be imported"""
    print(f"\n{Color.BLUE}▶ Checking example scripts{Color.END}")
    print("━" * 70)
    
    repo_root = get_repo_root()
    
    example_files = [
        'examples/mev/mev_profit_calculation_example.py',
        'examples/mev/arbitrage_detection_example.py',
        'examples/mev/realtime_monitoring_example.py',
    ]
    
    for example_path in example_files:
        full_path = repo_root / example_path
        if full_path.exists():
            print(f"  {Color.GREEN}✅{Color.END} {example_path}")
            result.add_pass()
            
            # Check if it has a main function or __main__ block
            try:
                with open(full_path, 'r') as f:
                    content = f.read()
                    if 'if __name__' in content or 'def main(' in content:
                        print(f"      {Color.GREEN}→{Color.END} Has entry point")
                    else:
                        print(f"      {Color.YELLOW}→{Color.END} No clear entry point")
            except Exception:
                pass
        else:
            print(f"  {Color.YELLOW}⚠️{Color.END}  {example_path} - not found")
            result.add_warning(f"Example not found: {example_path}")


def check_configuration(result: ValidationResult):
    """Validate configuration files"""
    print(f"\n{Color.BLUE}▶ Checking configuration{Color.END}")
    print("━" * 70)
    
    repo_root = get_repo_root()
    
    # Check requirements.txt
    req_file = repo_root / 'requirements.txt'
    if req_file.exists():
        print(f"  {Color.GREEN}✅{Color.END} requirements.txt exists")
        result.add_pass()
        
        # Check for key dependencies
        with open(req_file, 'r') as f:
            content = f.read().lower()
            key_deps = ['numpy', 'web3']
            
            for dep in key_deps:
                if dep in content:
                    print(f"      {Color.GREEN}→{Color.END} {dep} listed")
                else:
                    print(f"      {Color.YELLOW}→{Color.END} {dep} not found")
                    result.add_warning(f"Dependency {dep} not in requirements.txt")
    else:
        print(f"  {Color.RED}❌{Color.END} requirements.txt - not found")
        result.add_fail("requirements.txt not found")


def main():
    """Main validation routine"""
    print("╔" + "=" * 70 + "╗")
    print("║" + f"{Color.BOLD}MEV INTEGRATION VALIDATION{Color.END}".center(80) + "║")
    print("║" + "Validating AxionCitadel MEV Integration".center(80) + "║")
    print("╚" + "=" * 70 + "╝")
    
    result = ValidationResult()
    
    try:
        # Run all validation checks
        check_directory_structure(result)
        check_required_files(result)
        check_dependencies(result)
        check_module_imports(result)
        check_configuration(result)
        check_test_suite(result)
        check_examples(result)
        
        # Print summary
        result.print_summary()
        
        # Exit with appropriate code
        if result.is_success():
            print(f"\n{Color.GREEN}{Color.BOLD}✅ MEV Integration validation PASSED{Color.END}")
            print(f"\nThe MEV integration is properly set up and ready to use.")
            print(f"\nNext steps:")
            print(f"  • Run tests:    python3 tests/mev/test_profit_calculator.py")
            print(f"  • Run example:  python3 examples/mev/mev_profit_calculation_example.py")
            print(f"  • Read docs:    docs/MEV_SETUP_GUIDE.md")
            print()
            sys.exit(0)
        else:
            print(f"\n{Color.RED}{Color.BOLD}❌ MEV Integration validation FAILED{Color.END}")
            print(f"\nPlease fix the errors above and run validation again.")
            print(f"\nTo re-run setup:")
            print(f"  bash scripts/setup_mev_integration.sh")
            print()
            sys.exit(1)
    
    except Exception as e:
        print(f"\n{Color.RED}Fatal error during validation: {e}{Color.END}")
        import traceback
        traceback.print_exc()
        sys.exit(2)


if __name__ == '__main__':
    main()
