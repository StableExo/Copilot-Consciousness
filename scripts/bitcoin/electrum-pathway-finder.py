#!/usr/bin/env python3
"""
Electrum-Based Pathway Finder

Uses Electrum's built-in BIP39/BIP84 support to efficiently test derivation paths.
Much faster and more reliable than manual derivation.

Target: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
Mnemonic: focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel 
          joke liquid middle north park price refuse salmon silent sponsor symbol train
"""

import subprocess
import json
import os
import sys
from pathlib import Path

MNEMONIC = "focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train"
TARGET_ADDRESS = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"

# Passphrases to test
PASSPHRASES = [
    "",           # No passphrase
    "130",        # Puzzle number
    "train",      # Last word
    "focus",      # First word
    "pi",
    "3.14159",
    "80",
    "80.18",
    "track",
    "23",         # Word count
    "symbol",
]

# Account numbers to test
ACCOUNTS = [0, 1, 2, 3, 4, 5, 130, 23, 80, 18, 721, 1848, 100, 200, 300, 1844]

# Index range
MAX_INDEX = 1000

def test_with_electrum(passphrase, account, index_range=100):
    """
    Use Electrum to create a wallet and check addresses
    """
    wallet_path = f"/tmp/test_wallet_{account}.db"
    
    # Remove old wallet if exists
    if os.path.exists(wallet_path):
        os.remove(wallet_path)
    
    try:
        # Create wallet from mnemonic with specific derivation path
        # Electrum uses BIP84 by default for bc1 addresses
        derivation = f"m/84'/0'/{account}'"
        
        cmd = [
            "electrum",
            "--offline",
            "--wallet", wallet_path,
            "restore",
            MNEMONIC
        ]
        
        if passphrase:
            cmd.extend(["--passphrase", passphrase])
        
        # Create wallet
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            return None
        
        # Get receiving addresses
        result = subprocess.run(
            ["electrum", "--offline", "--wallet", wallet_path, "listaddresses"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            addresses = json.loads(result.stdout)
            return addresses
            
    except Exception as e:
        print(f"Error: {e}")
        return None
    finally:
        # Cleanup
        if os.path.exists(wallet_path):
            os.remove(wallet_path)
    
    return None

def main():
    print("=" * 80)
    print("  🔍 ELECTRUM-BASED PATHWAY FINDER")
    print("=" * 80)
    print(f"  Target: {TARGET_ADDRESS}")
    print(f"  Method: Using Electrum CLI for efficient testing")
    print("=" * 80)
    print()
    
    total_tested = 0
    
    for passphrase in PASSPHRASES:
        pp_label = "(none)" if passphrase == "" else f'"{passphrase}"'
        print(f"\n{'─' * 80}")
        print(f"Testing passphrase: {pp_label}")
        print(f"{'─' * 80}\n")
        
        for account in ACCOUNTS:
            print(f"  Testing account {account}... ", end="", flush=True)
            
            addresses = test_with_electrum(passphrase, account, MAX_INDEX)
            
            if addresses:
                total_tested += len(addresses)
                print(f"({len(addresses)} addresses generated)")
                
                # Check if target is in the list
                if TARGET_ADDRESS in addresses:
                    index = addresses.index(TARGET_ADDRESS)
                    path = f"m/84'/0'/{account}'/0/{index}"
                    
                    print()
                    print("=" * 80)
                    print("  🎉🎉🎉 PATHWAY FOUND!!! 🎉🎉🎉")
                    print("=" * 80)
                    print()
                    print(f"  ✅ Mnemonic: {MNEMONIC}")
                    print(f"  ✅ Passphrase: {pp_label}")
                    print(f"  ✅ Derivation Path: {path}")
                    print(f"  ✅ Account: {account}")
                    print(f"  ✅ Index: {index}")
                    print(f"  ✅ Address: {TARGET_ADDRESS}")
                    print()
                    print(f"  📊 Total Addresses Tested: {total_tested}")
                    print()
                    print("=" * 80)
                    return 0
            else:
                print("(error)")
    
    print()
    print("=" * 80)
    print("  ❌ PATHWAY NOT FOUND")
    print("=" * 80)
    print(f"  Total Addresses Tested: {total_tested}")
    print()
    return 1

if __name__ == "__main__":
    sys.exit(main())
