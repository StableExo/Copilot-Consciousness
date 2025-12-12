#!/usr/bin/env node --import tsx

/**
 * Test UTXO Collection on Single Address
 * Tests the API integration and UTXO fetching logic
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const TEST_ADDRESS = 'bc1qf054d3r2np8ff9k2s2u8rtsw53f3pgagfchg9p';

// Multiple API sources for redundancy
const API_SOURCES = [
  { name: 'Blockstream', url: 'https://blockstream.info/api' },
  { name: 'Mempool.space', url: 'https://mempool.space/api' },
];

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || '';

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
      console.log('📊 Fetching BTC price from CoinMarketCap...');
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
        console.log(`✅ BTC price from CoinMarketCap: $${price.toFixed(2)}`);
        return price;
      }
    } catch (error) {
      console.warn('⚠️  CoinMarketCap API failed, using fallback');
    }
  } else {
    console.log('ℹ️  No CoinMarketCap API key found in environment');
  }

  // Fallback: Use a reasonable estimate
  console.warn('⚠️  Using fallback BTC price estimate');
  return 95000; // Updated fallback estimate (Dec 2024)
}

async function getUTXOs(address: string, retryCount = 0): Promise<UTXO[]> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (const api of API_SOURCES) {
    const url = `${api.url}/address/${address}/utxo`;
    
    try {
      console.log(`🔍 Trying ${api.name} API: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TheWarden-PuzzleCollector/1.0',
        },
      });

      console.log(`   Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`   ℹ️  Address has no UTXOs (404 response)`);
          return [];
        }
        if (response.status === 429) {
          console.warn(`   ⚠️  Rate limited (429), trying next API...`);
          continue;
        }
        console.warn(`   ⚠️  Error ${response.status}, trying next API...`);
        continue;
      }

      const data = await response.json();
      console.log(`   ✅ Got response from ${api.name}:`, JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.warn(`   ❌ ${api.name} failed:`, error instanceof Error ? error.message : error);
      continue;
    }
  }

  // If all APIs failed and we have retries left, wait and retry
  if (retryCount < MAX_RETRIES) {
    console.warn(`⚠️  All APIs failed, retrying in ${RETRY_DELAY_MS}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    await sleep(RETRY_DELAY_MS);
    return getUTXOs(address, retryCount + 1);
  }

  console.error('❌ All attempts exhausted');
  return [];
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        🧪 SINGLE ADDRESS UTXO TEST 🧪                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();

  console.log(`📍 Test Address: ${TEST_ADDRESS}`);
  console.log();

  // Step 1: Get BTC price
  const btcPrice = await getBTCPriceUSD();
  console.log();

  // Step 2: Fetch UTXOs
  console.log('🔎 Fetching UTXOs for test address...');
  console.log('━'.repeat(80));
  const utxos = await getUTXOs(TEST_ADDRESS);
  console.log('━'.repeat(80));
  console.log();

  // Step 3: Display results
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      📊 RESULTS 📊                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();

  if (utxos.length === 0) {
    console.log('❌ No UTXOs found (address is empty or all outputs spent)');
  } else {
    console.log(`✅ Found ${utxos.length} UTXO${utxos.length > 1 ? 's' : ''}:`);
    console.log();

    let totalSatoshis = 0;
    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      const btc = satoshisToBTC(utxo.value);
      const usd = btc * btcPrice;
      totalSatoshis += utxo.value;

      console.log(`UTXO #${i + 1}:`);
      console.log(`  TxID:   ${utxo.txid}`);
      console.log(`  Vout:   ${utxo.vout}`);
      console.log(`  Value:  ${utxo.value} satoshis (${btc.toFixed(8)} BTC)`);
      console.log(`  USD:    $${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      if (utxo.status) {
        console.log(`  Status: ${utxo.status.confirmed ? 'Confirmed' : 'Unconfirmed'}`);
        if (utxo.status.block_height) {
          console.log(`  Block:  ${utxo.status.block_height}`);
        }
      }
      console.log();
    }

    const totalBTC = satoshisToBTC(totalSatoshis);
    const totalUSD = totalBTC * btcPrice;

    console.log('─'.repeat(80));
    console.log(`💰 Total Balance: ${totalBTC.toFixed(8)} BTC ≈ $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  console.log();
  console.log('✅ Test complete!');
  console.log();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { getUTXOs, getBTCPriceUSD };
