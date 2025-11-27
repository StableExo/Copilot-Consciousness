#!/usr/bin/env python3
"""
AxionCitadel Dependency Checker

Analyzes all AxionCitadel Python files to:
- List all imports from each file
- Identify external dependencies (not stdlib)
- Check if dependencies exist in requirements.txt
- Report missing dependencies
- Validate Python version compatibility
"""

import ast
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple
import importlib.util

# Standard library modules (Python 3.10+)
STDLIB_MODULES = {
    'abc', 'asyncio', 'collections', 'dataclasses', 'datetime', 'decimal',
    'enum', 'json', 'logging', 'math', 'os', 'pathlib', 're', 'sys',
    'time', 'typing', 'unittest', 'warnings', 'importlib', 'inspect',
    'py_compile', 'traceback', 'io', 'copy', 'itertools', 'functools',
    'heapq', 'queue', 'threading', 'multiprocessing', 'subprocess',
}


def get_imports_from_file(file_path: Path) -> Set[str]:
    """Extract all import statements from a Python file"""
    imports = set()
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=str(file_path))
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    # Get the top-level module
                    module = alias.name.split('.')[0]
                    imports.add(module)
            elif isinstance(node, ast.ImportFrom):
                # Skip relative imports (., .., etc)
                if node.level > 0:
                    continue
                if node.module:
                    # Get the top-level module
                    module = node.module.split('.')[0]
                    imports.add(module)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    
    return imports


def is_stdlib_module(module_name: str) -> bool:
    """Check if a module is part of the standard library"""
    if module_name in STDLIB_MODULES:
        return True
    
    # Check if it's a built-in module
    if module_name in sys.builtin_module_names:
        return True
    
    # Try to find module spec
    try:
        spec = importlib.util.find_spec(module_name)
        if spec is None:
            return False
        
        # Check if it's in the standard library path
        if spec.origin:
            return 'site-packages' not in spec.origin
        return False
    except (ImportError, ModuleNotFoundError, ValueError):
        return False


def get_requirements(requirements_file: Path) -> Set[str]:
    """Parse requirements.txt and extract package names"""
    packages = set()
    
    if not requirements_file.exists():
        return packages
    
    with open(requirements_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                # Extract package name (before version specifier)
                package = line.split('>=')[0].split('==')[0].split('<')[0].split('>')[0].strip()
                packages.add(package.lower())
    
    return packages


def analyze_axioncitadel_dependencies():
    """Analyze all AxionCitadel component dependencies"""
    
    base_path = Path(__file__).parent.parent
    requirements_file = base_path / 'requirements.txt'
    
    # Define AxionCitadel component files
    axioncitadel_files = [
        "src/execution/advanced_profit_calculator.py",
        "src/execution/flash_swap_executor.py",
        "src/execution/transaction_manager.py",
        "src/arbitrage/opportunity.py",
        "src/arbitrage/spatial_arb_engine.py",
        "src/arbitrage/triangular_arb_engine.py",
        "src/data/dex_data_provider.py",
        "src/data/pool_scanner.py",
        "src/data/__init__.py",
        "src/core/protocol_registry.py",
        "src/monitoring/mempool_monitor_service.py",
        "src/mev/models/transaction_type.py",
        "src/mev/models/mev_risk_model.py",
        "src/mev/models/profit_calculator.py",
        "src/mev/sensors/mempool_congestion_sensor.py",
        "src/mev/sensors/searcher_density_sensor.py",
        "src/mev/sensors/mev_sensor_hub.py",
    ]
    
    print("=" * 80)
    print("AXIONCITADEL DEPENDENCY ANALYSIS")
    print("=" * 80)
    print()
    
    # Collect all imports by file
    file_imports: Dict[str, Set[str]] = {}
    all_external_deps = set()
    
    for file_path in axioncitadel_files:
        full_path = base_path / file_path
        if full_path.exists():
            imports = get_imports_from_file(full_path)
            
            # Filter out internal imports (src.*)
            external_imports = {imp for imp in imports if not imp.startswith('src')}
            
            # Separate stdlib from external
            external_deps = {imp for imp in external_imports if not is_stdlib_module(imp)}
            
            if external_deps:
                file_imports[file_path] = external_deps
                all_external_deps.update(external_deps)
    
    # Print per-file analysis
    print("IMPORTS BY FILE:")
    print("-" * 80)
    for file_path, deps in sorted(file_imports.items()):
        print(f"\n{file_path}:")
        for dep in sorted(deps):
            print(f"  - {dep}")
    
    print("\n")
    print("=" * 80)
    print("EXTERNAL DEPENDENCIES SUMMARY")
    print("=" * 80)
    
    # Get requirements
    requirements = get_requirements(requirements_file)
    
    print(f"\nFound {len(all_external_deps)} unique external dependencies:")
    for dep in sorted(all_external_deps):
        print(f"  - {dep}")
    
    # Check which are in requirements.txt
    print(f"\nDependencies in requirements.txt:")
    in_requirements = all_external_deps & requirements
    for dep in sorted(in_requirements):
        print(f"  ✓ {dep}")
    
    # Check for missing dependencies
    missing = all_external_deps - requirements
    if missing:
        print(f"\n⚠️  MISSING from requirements.txt:")
        for dep in sorted(missing):
            print(f"  ✗ {dep}")
    else:
        print(f"\n✅ All dependencies are listed in requirements.txt")
    
    # Check Python version compatibility
    print("\n" + "=" * 80)
    print("PYTHON VERSION COMPATIBILITY")
    print("=" * 80)
    print(f"Current Python version: {sys.version}")
    print(f"Minimum required: Python 3.10+")
    
    if sys.version_info >= (3, 10):
        print("✅ Python version is compatible")
    else:
        print("⚠️  Python 3.10+ required for full compatibility")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total files analyzed: {len(axioncitadel_files)}")
    print(f"Files with external deps: {len(file_imports)}")
    print(f"Unique external dependencies: {len(all_external_deps)}")
    print(f"Dependencies in requirements.txt: {len(in_requirements)}")
    print(f"Missing dependencies: {len(missing)}")
    
    if missing:
        print("\n⚠️  ACTION REQUIRED:")
        print(f"Add the following to requirements.txt:")
        for dep in sorted(missing):
            print(f"  {dep}")
        return 1
    else:
        print("\n✅ All dependencies are properly configured!")
        return 0


if __name__ == '__main__':
    sys.exit(analyze_axioncitadel_dependencies())
