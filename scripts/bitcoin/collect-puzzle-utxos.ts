#!/usr/bin/env node --import tsx

/**
 * Autonomous Bitcoin Puzzle UTXO Collector
 * 
 * Collects all unspent outputs (UTXOs) from the famous 1000 BTC puzzle challenge.
 * This script:
 * 1. Fetches the original 256 puzzle outputs from the 2015 transaction
 * 2. Queries blockchain API for UTXO status of each address
 * 3. Identifies which puzzles are solved vs. unsolved
 * 4. Calculates total unclaimed BTC and USD value
 * 5. Exports results to JSON for further analysis
 * 
 * Transaction: 08389f34c98c606322740c0be6a7125d9860bb8d5cb182c02f98461e5fa6cd15
 * Created: 2015-01-15 (The famous "1000 BTC puzzle")
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const PUZZLE_TX = '08389f34c98c606322740c0be6a7125d9860bb8d5cb182c02f98461e5fa6cd15';

// Multiple API sources for redundancy
const API_SOURCES = [
  { name: 'Blockstream', url: 'https://blockstream.info/api' },
  { name: 'Mempool.space', url: 'https://mempool.space/api' },
];

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || '';
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'puzzle_unspent_2025.json');
const SUMMARY_FILE = path.join(process.cwd(), 'data', 'puzzle_summary_2025.txt');

// Rate limiting to be nice to the API
const REQUEST_DELAY_MS = 500; // 500ms between requests (slower to avoid rate limits)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status?: {
    confirmed: boolean;
    block_height?: number;
  };
}

interface VOut {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
}

interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: any[];
  vout: VOut[];
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

interface UnspentPuzzle {
  puzzle: number;
  address: string;
  btc: number;
  usd: number;
  utxos: UTXO[];
  status: 'UNSPENT' | 'SPENT';
  lastChecked: string;
}

interface PuzzleSummary {
  totalPuzzles: number;
  unspentPuzzles: number;
  spentPuzzles: number;
  totalUnclaimedBTC: number;
  totalUnclaimedUSD: number;
  btcPriceUSD: number;
  scanDate: string;
  puzzles: UnspentPuzzle[];
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function satoshisToBTC(satoshis: number): number {
  return satoshis / 100000000;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getBTCPriceUSD(): Promise<number> {
  // Try CoinMarketCap API if key available
  if (COINMARKETCAP_API_KEY) {
    try {
      const response = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD',
        {
          headers: {
            'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const price = data.data.BTC.quote.USD.price;
        console.log(`💰 BTC price from CoinMarketCap: $${price.toFixed(2)}`);
        return price;
      }
    } catch (error) {
      console.warn('⚠️  CoinMarketCap API failed, trying fallback');
    }
  }

  // Fallback: Use a reasonable estimate
  console.warn('⚠️  Using fallback BTC price estimate');
  return 95000; // Updated fallback estimate (Dec 2024)
}

async function getTransaction(txid: string): Promise<Transaction> {
  for (const api of API_SOURCES) {
    const url = `${api.url}/tx/${txid}`;
    
    try {
      console.log(`🔍 Trying ${api.name} API...`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TheWarden-PuzzleCollector/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`⚠️  ${api.name} returned ${response.status}, trying next API...`);
        continue;
      }

      console.log(`✅ Successfully fetched transaction from ${api.name}`);
      return await response.json();
    } catch (error) {
      console.warn(`⚠️  ${api.name} failed:`, error instanceof Error ? error.message : error);
      continue;
    }
  }
  
  throw new Error('All API sources failed to fetch transaction');
}

async function getUTXOs(address: string, retryCount = 0): Promise<UTXO[]> {
  for (const api of API_SOURCES) {
    const url = `${api.url}/address/${address}/utxo`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TheWarden-PuzzleCollector/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Address has no UTXOs (spent or never received)
          return [];
        }
        if (response.status === 429) {
          // Rate limited, try next API
          console.warn(`⚠️  Rate limited on ${api.name}, trying next API...`);
          continue;
        }
        throw new Error(`Failed to fetch UTXOs: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Try next API source
      continue;
    }
  }

  // If all APIs failed and we have retries left, wait and retry
  if (retryCount < MAX_RETRIES) {
    console.warn(`⚠️  All APIs failed, retrying in ${RETRY_DELAY_MS}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    await sleep(RETRY_DELAY_MS);
    return getUTXOs(address, retryCount + 1);
  }

  // All attempts exhausted
  return [];
}

// ═══════════════════════════════════════════════════════════════
// MAIN COLLECTION LOGIC
// ═══════════════════════════════════════════════════════════════

async function collectPuzzleUTXOs(): Promise<PuzzleSummary> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   🧩 AUTONOMOUS BITCOIN PUZZLE UTXO COLLECTOR 🧩            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();

  // Step 1: Get current BTC price
  console.log('📊 Fetching current BTC price...');
  const btcPrice = await getBTCPriceUSD();
  console.log(`💰 Current BTC price: $${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log();

  // Step 2: Fetch the original puzzle transaction
  console.log(`🔍 Fetching puzzle transaction: ${PUZZLE_TX}`);
  const tx = await getTransaction(PUZZLE_TX);
  console.log(`✅ Found ${tx.vout.length} outputs in the puzzle transaction`);
  console.log(`📅 Block height: ${tx.status.block_height}`);
  console.log(`⏰ Block time: ${new Date(tx.status.block_time * 1000).toISOString()}`);
  console.log();

  // Step 3: Check each output for UTXOs
  console.log('🔎 Scanning all puzzle addresses for unspent outputs...');
  console.log('━'.repeat(80));
  console.log();

  const unspentPuzzles: UnspentPuzzle[] = [];
  let totalUnclaimedBTC = 0;
  let spentCount = 0;

  for (let idx = 0; idx < tx.vout.length; idx++) {
    const vout = tx.vout[idx];
    const puzzleNumber = idx + 1;
    const address = vout.scriptpubkey_address;
    const originalAmount = satoshisToBTC(vout.value);

    // Check for UTXOs
    const utxos = await getUTXOs(address);
    const unspentUTXOs = utxos.filter(u => !('spent' in u) || !(u as any).spent);

    if (unspentUTXOs.length > 0) {
      // Calculate total unspent amount
      const totalSatoshis = unspentUTXOs.reduce((sum, u) => sum + u.value, 0);
      const totalBTC = satoshisToBTC(totalSatoshis);
      const totalUSD = totalBTC * btcPrice;

      totalUnclaimedBTC += totalBTC;

      console.log(`✨ Puzzle #${puzzleNumber.toString().padStart(3, ' ')} | ${address}`);
      console.log(`   💎 ${totalBTC.toFixed(8)} BTC ≈ $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`   📊 Status: UNSPENT (${unspentUTXOs.length} UTXO${unspentUTXOs.length > 1 ? 's' : ''})`);
      console.log();

      unspentPuzzles.push({
        puzzle: puzzleNumber,
        address,
        btc: totalBTC,
        usd: totalUSD,
        utxos: unspentUTXOs,
        status: 'UNSPENT',
        lastChecked: new Date().toISOString(),
      });
    } else {
      spentCount++;
      console.log(`⚫ Puzzle #${puzzleNumber.toString().padStart(3, ' ')} | ${address} → SPENT/SOLVED`);
    }

    // Rate limiting
    if (idx < tx.vout.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log();
  console.log('━'.repeat(80));

  // Step 4: Generate summary
  const summary: PuzzleSummary = {
    totalPuzzles: tx.vout.length,
    unspentPuzzles: unspentPuzzles.length,
    spentPuzzles: spentCount,
    totalUnclaimedBTC,
    totalUnclaimedUSD: totalUnclaimedBTC * btcPrice,
    btcPriceUSD: btcPrice,
    scanDate: new Date().toISOString(),
    puzzles: unspentPuzzles,
  };

  return summary;
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function printSummary(summary: PuzzleSummary): void {
  console.log();
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      📊 SUMMARY REPORT 📊                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📅 Scan Date: ${new Date(summary.scanDate).toLocaleString('en-US')}`);
  console.log(`💵 BTC Price: $${summary.btcPriceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log();
  console.log(`🧩 Total Puzzles: ${summary.totalPuzzles}`);
  console.log(`✅ Spent/Solved: ${summary.spentPuzzles}`);
  console.log(`💎 Still Unspent: ${summary.unspentPuzzles}`);
  console.log();
  console.log(`💰 Total Unclaimed BTC: ${summary.totalUnclaimedBTC.toFixed(8)} BTC`);
  console.log(`💵 Total Unclaimed USD: $${summary.totalUnclaimedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log();
  console.log('━'.repeat(80));
  console.log();
}

function saveSummary(summary: PuzzleSummary): void {
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`💾 Saved detailed JSON report: ${OUTPUT_FILE}`);

  // Save human-readable summary
  const summaryText = `
═══════════════════════════════════════════════════════════════
  BITCOIN PUZZLE UTXO COLLECTION REPORT
═══════════════════════════════════════════════════════════════

Scan Date: ${new Date(summary.scanDate).toLocaleString('en-US')}
BTC Price: $${summary.btcPriceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

PUZZLE STATISTICS
─────────────────────────────────────────────────────────────
Total Puzzles:       ${summary.totalPuzzles}
Spent/Solved:        ${summary.spentPuzzles}
Still Unspent:       ${summary.unspentPuzzles}

UNCLAIMED VALUE
─────────────────────────────────────────────────────────────
Total BTC:           ${summary.totalUnclaimedBTC.toFixed(8)} BTC
Total USD:           $${summary.totalUnclaimedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

UNSPENT PUZZLES DETAIL
─────────────────────────────────────────────────────────────
${summary.puzzles
  .sort((a, b) => b.btc - a.btc)
  .map(
    (p) => `
Puzzle #${p.puzzle}
  Address: ${p.address}
  Amount:  ${p.btc.toFixed(8)} BTC ≈ $${p.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  UTXOs:   ${p.utxos.length}
`
  )
  .join('')}

═══════════════════════════════════════════════════════════════
Generated by TheWarden - Autonomous UTXO Collector
Transaction: ${PUZZLE_TX}
═══════════════════════════════════════════════════════════════
`;

  fs.writeFileSync(SUMMARY_FILE, summaryText, 'utf-8');
  console.log(`📄 Saved human-readable summary: ${SUMMARY_FILE}`);
  console.log();
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

async function main() {
  try {
    const summary = await collectPuzzleUTXOs();
    printSummary(summary);
    saveSummary(summary);

    console.log('✅ Collection complete!');
    console.log();
    console.log('🎯 Next Steps:');
    console.log('   1. Review the JSON file for programmatic analysis');
    console.log('   2. Review the summary file for human-readable report');
    console.log('   3. Use this data to identify claiming opportunities');
    console.log('   4. Monitor for changes over time');
    console.log();
    console.log('💡 The "leftovers" have been autonomously collected! 😎');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during collection:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { collectPuzzleUTXOs, type PuzzleSummary, type UnspentPuzzle };
