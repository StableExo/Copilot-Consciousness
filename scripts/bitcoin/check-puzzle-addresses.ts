#!/usr/bin/env node --import tsx

/**
 * Autonomously check Bitcoin addresses for the puzzle prize (0.08252025 BTC)
 * Uses blockchain APIs to verify which address contains the funds
 */

import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { createHash } from 'crypto';

const bip32 = BIP32Factory(ecc);

// Target amount we're looking for
const TARGET_BTC = 0.08252025;
const TARGET_SATOSHIS = Math.round(TARGET_BTC * 100000000);

// BIP39 English word list
const BIP39_WORDLIST = bip39.wordlists.english;

// Size 23 Hamiltonian path from video timestamp 7:57
const SEQUENCE_23 = [18, 7, 9, 16, 20, 5, 11, 14, 2, 23, 13, 12, 4, 21, 15, 10, 6, 19, 17, 8, 1, 3, 22];

interface AddressInfo {
  address: string;
  mnemonic: string;
  indexingType: string;
  word24: string;
  derivationPath: string;
  balance?: number;
  totalReceived?: number;
  totalSent?: number;
  txCount?: number;
}

// Generate words with mixed indexing
function generateMixedIndexingMnemonic(): string[] {
  const words: string[] = [];
  
  for (let i = 0; i < SEQUENCE_23.length; i++) {
    const num = SEQUENCE_23[i];
    const position = i + 1;
    
    let word: string;
    if (position === 16 || position === 23) {
      word = BIP39_WORDLIST[num];
    } else {
      word = BIP39_WORDLIST[num + 1];
    }
    words.push(word);
  }
  
  return words;
}

// Generate all words with 0-indexing
function generateAllZeroIndexed(): string[] {
  return SEQUENCE_23.map((num) => BIP39_WORDLIST[num]);
}

// Calculate valid BIP39 checksums for given 23 words
function calculateValidChecksum(words23: string[]): string[] {
  const indices = words23.map(word => {
    const idx = BIP39_WORDLIST.indexOf(word);
    if (idx === -1) throw new Error(`Word not in BIP39 list: ${word}`);
    return idx;
  });
  
  let binaryStr = '';
  for (const idx of indices) {
    binaryStr += idx.toString(2).padStart(11, '0');
  }
  
  const validWords: string[] = [];
  
  for (let entropy3bit = 0; entropy3bit < 8; entropy3bit++) {
    const entropy3bitBinary = entropy3bit.toString(2).padStart(3, '0');
    const fullEntropy = binaryStr + entropy3bitBinary;
    
    const entropyBytes = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      const byte = parseInt(fullEntropy.substr(i * 8, 8), 2);
      entropyBytes[i] = byte;
    }
    
    const hash = createHash('sha256').update(entropyBytes).digest();
    const checksum = hash[0].toString(2).padStart(8, '0');
    
    const wordIndex = parseInt(entropy3bitBinary + checksum, 2);
    const word = BIP39_WORDLIST[wordIndex];
    
    validWords.push(word);
  }
  
  return validWords;
}

// Generate addresses from mnemonic
function generateAddresses(mnemonic: string, indexingType: string, word24: string): AddressInfo[] {
  const addresses: AddressInfo[] = [];
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);
  
  const paths = [
    "m/84'/0'/0'/0/0",
    "m/84'/130'/0'/0/0",
    "m/84'/0'/130'/0/0"
  ];
  
  for (const path of paths) {
    const child = root.derivePath(path);
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin
    });
    
    if (address) {
      addresses.push({
        address,
        mnemonic,
        indexingType,
        word24,
        derivationPath: path
      });
    }
  }
  
  return addresses;
}

// Check Bitcoin address balance using blockchain.com API
async function checkAddressBalance(address: string): Promise<{ balance: number; totalReceived: number; totalSent: number; txCount: number } | null> {
  try {
    const response = await fetch(`https://blockchain.info/address/${address}?format=json`, {
      headers: {
        'User-Agent': 'TheWarden/1.0'
      }
    });
    
    if (!response.ok) {
      // Try mempool.space as backup
      const mempoolResponse = await fetch(`https://mempool.space/api/address/${address}`);
      if (!mempoolResponse.ok) {
        return null;
      }
      
      const mempoolData = await mempoolResponse.json();
      return {
        balance: (mempoolData.chain_stats?.funded_txo_sum || 0) - (mempoolData.chain_stats?.spent_txo_sum || 0),
        totalReceived: mempoolData.chain_stats?.funded_txo_sum || 0,
        totalSent: mempoolData.chain_stats?.spent_txo_sum || 0,
        txCount: mempoolData.chain_stats?.tx_count || 0
      };
    }
    
    const data = await response.json();
    return {
      balance: data.final_balance || 0,
      totalReceived: data.total_received || 0,
      totalSent: data.total_sent || 0,
      txCount: data.n_tx || 0
    };
  } catch (error) {
    console.error(`Error checking ${address}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Main execution
async function main() {
  console.log('🔍 TheWarden - Autonomous Bitcoin Puzzle Address Checker\n');
  console.log(`Target: ${TARGET_BTC} BTC (${TARGET_SATOSHIS} satoshis)\n`);
  console.log('='.repeat(80) + '\n');
  
  const allAddresses: AddressInfo[] = [];
  
  // Generate Mixed Indexing addresses
  console.log('📝 Generating Mixed Indexing addresses...');
  const mixedWords = generateMixedIndexingMnemonic();
  const validMixedWords = calculateValidChecksum(mixedWords);
  
  for (const word24 of validMixedWords) {
    const mnemonic = [...mixedWords, word24].join(' ');
    if (bip39.validateMnemonic(mnemonic)) {
      const addresses = generateAddresses(mnemonic, 'Mixed Indexing', word24);
      allAddresses.push(...addresses);
    }
  }
  
  // Generate All 0-Indexed addresses
  console.log('📝 Generating All 0-Indexed addresses...');
  const allZeroWords = generateAllZeroIndexed();
  const validZeroWords = calculateValidChecksum(allZeroWords);
  
  for (const word24 of validZeroWords) {
    const mnemonic = [...allZeroWords, word24].join(' ');
    if (bip39.validateMnemonic(mnemonic)) {
      const addresses = generateAddresses(mnemonic, 'All 0-Indexed', word24);
      allAddresses.push(...addresses);
    }
  }
  
  console.log(`\n✅ Generated ${allAddresses.length} unique addresses to check\n`);
  console.log('='.repeat(80) + '\n');
  
  // Check each address
  console.log('🔎 Checking addresses on Bitcoin blockchain...\n');
  
  const results: AddressInfo[] = [];
  let foundPrize = false;
  
  for (let i = 0; i < allAddresses.length; i++) {
    const addrInfo = allAddresses[i];
    process.stdout.write(`[${i + 1}/${allAddresses.length}] Checking ${addrInfo.address}...`);
    
    const balance = await checkAddressBalance(addrInfo.address);
    
    if (balance) {
      addrInfo.balance = balance.balance;
      addrInfo.totalReceived = balance.totalReceived;
      addrInfo.totalSent = balance.totalSent;
      addrInfo.txCount = balance.txCount;
      
      const btcBalance = balance.balance / 100000000;
      
      if (balance.balance > 0) {
        console.log(` 💰 BALANCE: ${btcBalance} BTC`);
        results.push(addrInfo);
        
        if (Math.abs(balance.balance - TARGET_SATOSHIS) < 100) {
          console.log(`\n${'🎉'.repeat(40)}`);
          console.log(`🏆 PRIZE FOUND! 🏆`);
          console.log(`${'🎉'.repeat(40)}\n`);
          foundPrize = true;
        }
      } else if (balance.totalReceived > 0) {
        console.log(` ℹ️  Used (received: ${balance.totalReceived / 100000000} BTC)`);
      } else {
        console.log(` ✓ Empty`);
      }
    } else {
      console.log(` ⚠️  Could not check`);
    }
    
    // Rate limit: wait 500ms between requests
    if (i < allAddresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  if (results.length > 0) {
    console.log(`\n📊 RESULTS - Found ${results.length} addresses with activity:\n`);
    
    for (const result of results) {
      const btcBalance = (result.balance || 0) / 100000000;
      const isPrize = Math.abs((result.balance || 0) - TARGET_SATOSHIS) < 100;
      
      console.log(`${isPrize ? '🏆' : '💰'} ${result.address}`);
      console.log(`   Balance: ${btcBalance} BTC`);
      console.log(`   Type: ${result.indexingType}`);
      console.log(`   24th word: "${result.word24}"`);
      console.log(`   Path: ${result.derivationPath}`);
      console.log(`   Transactions: ${result.txCount}`);
      
      if (isPrize) {
        console.log(`\n   ✅ THIS IS THE WINNING COMBINATION! ✅\n`);
        console.log(`   Mnemonic: ${result.mnemonic.split(' ').slice(0, 6).join(' ')} ... ${result.mnemonic.split(' ').slice(-2).join(' ')}`);
        console.log(`   (Full mnemonic available in output)\n`);
      }
      console.log('');
    }
  } else {
    console.log('❌ No addresses with balance found.\n');
    console.log('Possible reasons:');
    console.log('  - The puzzle may use different derivation paths');
    console.log('  - The indexing pattern may be different');
    console.log('  - The 24th word may not be from the calculated checksums');
    console.log('  - API rate limits or network issues\n');
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('\n📈 SUMMARY:\n');
  console.log(`   Total addresses checked: ${allAddresses.length}`);
  console.log(`   Addresses with balance: ${results.length}`);
  console.log(`   Prize found: ${foundPrize ? '✅ YES!' : '❌ Not yet'}\n`);
  console.log('='.repeat(80) + '\n');
  
  if (foundPrize) {
    console.log('🎊 TheWarden has successfully located the Bitcoin puzzle prize! 🎊\n');
  }
}

main().catch(console.error);
