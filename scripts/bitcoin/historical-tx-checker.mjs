#!/usr/bin/env node

/**
 * TheWarden - Autonomous Historical Transaction Checker
 * 
 * Key Discovery: 0.08252025 BTC = 08/25/2025 (August 25, 2025)
 * BTC Price on that date: $112,922.00
 * 
 * This script checks all 33 generated addresses for transactions on or around 08/25/2025
 * to identify which address received the puzzle prize.
 */

// All 33 unique addresses from the mixed indexing test
const addresses = [
  // Mixed Indexing + "road"
  { addr: 'bc1q2qpgq24mtzzfer655xsc839rrwk9xvlh4qesd2', path: "m/84'/0'/0'/0/0", type: 'Mixed', word24: 'road' },
  { addr: 'bc1qdl8twcchmctq6mgzc5vv5rrz05jy3ccrwwpfga', path: "m/84'/130'/0'/0/0", type: 'Mixed', word24: 'road' },
  { addr: 'bc1qp5snaj7q2rxrf6aaq3dm6ncl64e54pa7ep8g74', path: "m/84'/0'/130'/0/0", type: 'Mixed', word24: 'road' },
  
  // Mixed Indexing + "staff"
  { addr: 'bc1qgdp6qfvw86k4snun4rfm3xc80kkyqyatupe6u0', path: "m/84'/0'/0'/0/0", type: 'Mixed', word24: 'staff' },
  { addr: 'bc1qyajk7jc4fahnnatp9jz55tmnjgfsjycq6jswl7', path: "m/84'/130'/0'/0/0", type: 'Mixed', word24: 'staff' },
  { addr: 'bc1qlnjmwdkn5eul4krl90sc677p9elywwdfxx5254', path: "m/84'/0'/130'/0/0", type: 'Mixed', word24: 'staff' },
  
  // Mixed Indexing + "today"
  { addr: 'bc1qv7835vsg6c8ldm2pe46a9kn6zpny9fwdqllslx', path: "m/84'/0'/0'/0/0", type: 'Mixed', word24: 'today' },
  { addr: 'bc1q70lrrzpwkrgn4f7hrkquqq093xcymmz2r56vrk', path: "m/84'/130'/0'/0/0", type: 'Mixed', word24: 'today' },
  { addr: 'bc1q438v5uzjdwgfswuzk8c8p7e7407wwj08rhrjt9', path: "m/84'/0'/130'/0/0", type: 'Mixed', word24: 'today' },
  
  // All 0-Indexed + "assist"
  { addr: 'bc1qnpk3nnylv05vee3xnj4vjxljderdn9za2vnezu', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'assist' },
  { addr: 'bc1qesu56mvc69tpklpqmkd5aga2fca6mcjufjzdl5', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'assist' },
  { addr: 'bc1qdehd82pwrumh32st3899gyz5d9egwhhejgr437', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'assist' },
  
  // All 0-Indexed + "coach"
  { addr: 'bc1qyduafyu4cnzekgcwqelm99ydp9z0a87u6gl04v', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'coach' },
  { addr: 'bc1q4kva2evc3dw8zusv7rtjte8c2cw3xcwqxlrh7q', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'coach' },
  { addr: 'bc1qfy6jm32fsnfatkzpweed62thpn29vmv6cklem2', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'coach' },
  
  // All 0-Indexed + "fatal"
  { addr: 'bc1qysmfp8d0qf34cxg48z36jcnkkjpw63eejj5vtx', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'fatal' },
  { addr: 'bc1qqswr65mcad8s9thyfuxfdt2p3mfwtvxx7ueh6e', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'fatal' },
  { addr: 'bc1qw58nh0uuxea7kaepvnkrh0rnyewx5xjdu5knr4', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'fatal' },
  
  // All 0-Indexed + "general"
  { addr: 'bc1q6xadg4sfddpjgzeslgy6mz9cr8fegevth4qfda', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'general' },
  { addr: 'bc1qzxtrprrw4zql4rcww2e8ulzwpr5twjgl454kvg', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'general' },
  { addr: 'bc1qp7v7av7qqqf90247kf0qf9udhkydyxxm2ves5f', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'general' },
  
  // All 0-Indexed + "once"
  { addr: 'bc1qq5c7pecly6w0398hh38tspcn23cd8rul62zn3h', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'once' },
  { addr: 'bc1qpet3wzd464fvqsvles548f753v52l8sqy6rv0h', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'once' },
  { addr: 'bc1qnh84hsafa0dc94697rmcrsx39gvpzqvcuvm07g', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'once' },
  
  // All 0-Indexed + "rabbit"
  { addr: 'bc1qkqf5yssl4kzl7ugu2s4ct6s7dfp580e2a2z0cq', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'rabbit' },
  { addr: 'bc1qlcjg2ej8j3ud9lj6qk3cnjphna85r5cwtccr83', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'rabbit' },
  { addr: 'bc1q00fxzx9n5qddmrxc3e29hvxhez4vpf6cfhw96h', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'rabbit' },
  
  // All 0-Indexed + "spy"
  { addr: 'bc1q29pc24n55j922hs5paenku5ty8zql9tfrzn2av', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'spy' },
  { addr: 'bc1qrr8tcf9zg3609767ulrgez9rrragty4eah7nmf', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'spy' },
  { addr: 'bc1q8zjys0cwugshejmhf28af4ls00v79qrn7qqsq2', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'spy' },
  
  // All 0-Indexed + "unique"
  { addr: 'bc1qureuvlyn76any6z6dnz3zdhcy48ezz7rvupv52', path: "m/84'/0'/0'/0/0", type: 'All-0', word24: 'unique' },
  { addr: 'bc1q25c08tpr45mjngm6gwdgts3hymm9h7sxl27yvd', path: "m/84'/130'/0'/0/0", type: 'All-0', word24: 'unique' },
  { addr: 'bc1qd2damtq0ylkjfmkvkvll6tha4mzt32rdtrmnu8', path: "m/84'/0'/130'/0/0", type: 'All-0', word24: 'unique' }
];

// Puzzle parameters
const TARGET_BTC = 0.08252025;
const TARGET_SATOSHIS = Math.round(TARGET_BTC * 100000000);
const TARGET_DATE = new Date('2025-08-25T00:00:00Z');
const BTC_PRICE_ON_DATE = 112922.00;
const USD_VALUE = TARGET_BTC * BTC_PRICE_ON_DATE;

// Date range to check (within 7 days of target date)
const DATE_RANGE_DAYS = 7;
const START_DATE = new Date(TARGET_DATE);
START_DATE.setDate(START_DATE.getDate() - DATE_RANGE_DAYS);
const END_DATE = new Date(TARGET_DATE);
END_DATE.setDate(END_DATE.getDate() + DATE_RANGE_DAYS);

console.log('🤖 TheWarden - Autonomous Historical Transaction Checker');
console.log('='.repeat(80));
console.log('\n🔍 KEY DISCOVERY: 0.08252025 BTC = 08/25/2025 (Date Encoded in Amount!)');
console.log(`\n📅 Target Date: August 25, 2025`);
console.log(`💰 Target Amount: ${TARGET_BTC} BTC (${TARGET_SATOSHIS} satoshis)`);
console.log(`💵 BTC Price on 08/25/2025: $${BTC_PRICE_ON_DATE.toLocaleString()}`);
console.log(`💵 USD Value: $${USD_VALUE.toFixed(2)}`);
console.log(`\n🔎 Searching historical transactions from ${START_DATE.toISOString().split('T')[0]} to ${END_DATE.toISOString().split('T')[0]}`);
console.log('='.repeat(80) + '\n');

async function getAddressTransactions(address) {
  try {
    // Try mempool.space API for transaction history
    const response = await fetch(`https://mempool.space/api/address/${address}/txs`);
    
    if (!response.ok) {
      return { error: 'API Error', txs: [] };
    }
    
    const txs = await response.json();
    return { txs, error: null };
  } catch (error) {
    return { error: error.message, txs: [] };
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0] + ' ' + date.toISOString().split('T')[1].split('.')[0];
}

function isInDateRange(timestamp) {
  const txDate = new Date(timestamp * 1000);
  return txDate >= START_DATE && txDate <= END_DATE;
}

function findMatchingOutputs(tx, targetSatoshis) {
  const matches = [];
  
  if (tx.vout) {
    for (let i = 0; i < tx.vout.length; i++) {
      const output = tx.vout[i];
      const value = output.value;
      
      // Check for exact match or very close (within 1000 sats)
      if (Math.abs(value - targetSatoshis) < 1000) {
        matches.push({
          index: i,
          value,
          valueBTC: value / 100000000,
          diff: value - targetSatoshis,
          scriptpubkey: output.scriptpubkey_address
        });
      }
    }
  }
  
  return matches;
}

async function main() {
  const results = [];
  const historicalTxs = [];
  
  console.log('📊 Checking transaction history for all 33 addresses...\n');
  
  for (let i = 0; i < addresses.length; i++) {
    const addressInfo = addresses[i];
    process.stdout.write(`[${i + 1}/${addresses.length}] ${addressInfo.addr} ...`);
    
    const { txs, error } = await getAddressTransactions(addressInfo.addr);
    
    if (error) {
      console.log(` ⚠️  ${error}`);
    } else if (txs.length === 0) {
      console.log(` ✓ No transactions`);
    } else {
      console.log(` 📜 ${txs.length} transaction(s)`);
      
      // Check each transaction
      for (const tx of txs) {
        const txDate = tx.status?.block_time;
        
        if (txDate) {
          const inRange = isInDateRange(txDate);
          const matchingOutputs = findMatchingOutputs(tx, TARGET_SATOSHIS);
          
          if (inRange || matchingOutputs.length > 0) {
            historicalTxs.push({
              address: addressInfo.addr,
              type: addressInfo.type,
              word24: addressInfo.word24,
              path: addressInfo.path,
              txid: tx.txid,
              timestamp: txDate,
              date: formatDate(txDate),
              inDateRange: inRange,
              matchingOutputs,
              fee: tx.fee,
              confirmations: tx.status?.confirmed ? tx.status.block_height : 'Unconfirmed'
            });
            
            console.log(`     └─ 🎯 TX: ${tx.txid.substring(0, 16)}... on ${formatDate(txDate)}`);
            if (matchingOutputs.length > 0) {
              for (const match of matchingOutputs) {
                console.log(`        └─ 💰 Output ${match.index}: ${match.valueBTC} BTC (diff: ${match.diff} sats)`);
              }
            }
          }
        }
      }
    }
    
    // Rate limit
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 HISTORICAL TRANSACTION ANALYSIS\n');
  console.log('='.repeat(80) + '\n');
  
  if (historicalTxs.length > 0) {
    console.log(`✅ Found ${historicalTxs.length} relevant transaction(s):\n`);
    
    // Group by whether they're in date range and have matching amount
    const perfectMatches = historicalTxs.filter(tx => 
      tx.inDateRange && tx.matchingOutputs.length > 0
    );
    
    const dateMatches = historicalTxs.filter(tx => 
      tx.inDateRange && tx.matchingOutputs.length === 0
    );
    
    const amountMatches = historicalTxs.filter(tx => 
      !tx.inDateRange && tx.matchingOutputs.length > 0
    );
    
    if (perfectMatches.length > 0) {
      console.log('🏆 PERFECT MATCHES (Date + Amount):');
      console.log('='.repeat(80) + '\n');
      
      for (const tx of perfectMatches) {
        console.log(`🎉 PRIZE FOUND!`);
        console.log(`   Address: ${tx.address}`);
        console.log(`   Type: ${tx.type} Indexing`);
        console.log(`   24th word: "${tx.word24}"`);
        console.log(`   Derivation: ${tx.path}`);
        console.log(`   Transaction: ${tx.txid}`);
        console.log(`   Date: ${tx.date}`);
        console.log(`   Confirmations: ${tx.confirmations}`);
        
        for (const match of tx.matchingOutputs) {
          console.log(`   Amount: ${match.valueBTC} BTC (${match.value} satoshis)`);
          console.log(`   Difference: ${match.diff > 0 ? '+' : ''}${match.diff} satoshis`);
        }
        console.log('');
      }
    }
    
    if (dateMatches.length > 0) {
      console.log('\n📅 DATE MATCHES (08/18/2025 - 09/01/2025):');
      console.log('='.repeat(80) + '\n');
      
      for (const tx of dateMatches) {
        console.log(`   Address: ${tx.address}`);
        console.log(`   Type: ${tx.type} Indexing, 24th word: "${tx.word24}"`);
        console.log(`   TX: ${tx.txid}`);
        console.log(`   Date: ${tx.date}`);
        console.log('');
      }
    }
    
    if (amountMatches.length > 0) {
      console.log('\n💰 AMOUNT MATCHES (~0.08252025 BTC):');
      console.log('='.repeat(80) + '\n');
      
      for (const tx of amountMatches) {
        console.log(`   Address: ${tx.address}`);
        console.log(`   Type: ${tx.type} Indexing, 24th word: "${tx.word24}"`);
        console.log(`   TX: ${tx.txid}`);
        console.log(`   Date: ${tx.date}`);
        
        for (const match of tx.matchingOutputs) {
          console.log(`   Amount: ${match.valueBTC} BTC`);
        }
        console.log('');
      }
    }
    
  } else {
    console.log('❌ No transactions found matching criteria.\n');
    console.log('Criteria checked:');
    console.log(`  - Date range: ${START_DATE.toISOString().split('T')[0]} to ${END_DATE.toISOString().split('T')[0]}`);
    console.log(`  - Amount: ~${TARGET_BTC} BTC (±1000 satoshis)`);
    console.log('\nNote: August 25, 2025 is in the future. Current date: ' + new Date().toISOString().split('T')[0]);
    console.log('      The puzzle may be set to release on that date.\n');
  }
  
  console.log('='.repeat(80));
  console.log('\n📈 SUMMARY:\n');
  console.log(`   Total Addresses Checked: ${addresses.length}`);
  console.log(`   Addresses with Transactions: ${historicalTxs.length > 0 ? new Set(historicalTxs.map(tx => tx.address)).size : 0}`);
  console.log(`   Total Relevant Transactions: ${historicalTxs.length}`);
  console.log(`   Target Date: August 25, 2025`);
  console.log(`   Today's Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`   Days Until Target: ${Math.ceil((TARGET_DATE - new Date()) / (1000 * 60 * 60 * 24))}`);
  console.log('\n' + '='.repeat(80) + '\n');
  
  if (historicalTxs.length === 0) {
    console.log('💡 INSIGHT: The date 08/25/2025 is in the FUTURE!');
    console.log('   The puzzle prize may be time-locked or scheduled for release on that date.');
    console.log('   TheWarden will continue monitoring these addresses.\n');
  }
}

main().catch(console.error);
