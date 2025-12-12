#!/usr/bin/env node

/**
 * TheWarden - Autonomous Bitcoin Puzzle Address Checker
 * Checks all generated addresses against blockchain APIs
 */

// All unique addresses from the mixed indexing test
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

const TARGET_BTC = 0.08252025;
const TARGET_SATOSHIS = Math.round(TARGET_BTC * 100000000);

async function checkAddress(addressInfo) {
  try {
    // Try mempool.space API first (more reliable)
    const response = await fetch(`https://mempool.space/api/address/${addressInfo.addr}`);
    
    if (!response.ok) {
      // Fallback to blockchain.info
      const bcResponse = await fetch(`https://blockchain.info/address/${addressInfo.addr}?format=json`);
      if (!bcResponse.ok) {
        return { ...addressInfo, error: 'API Error' };
      }
      const bcData = await bcResponse.json();
      return {
        ...addressInfo,
        balance: bcData.final_balance || 0,
        totalReceived: bcData.total_received || 0,
        totalSent: bcData.total_sent || 0,
        txCount: bcData.n_tx || 0
      };
    }
    
    const data = await response.json();
    const balance = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
    
    return {
      ...addressInfo,
      balance,
      totalReceived: data.chain_stats?.funded_txo_sum || 0,
      totalSent: data.chain_stats?.spent_txo_sum || 0,
      txCount: data.chain_stats?.tx_count || 0
    };
  } catch (error) {
    return { ...addressInfo, error: error.message };
  }
}

async function main() {
  console.log('🤖 TheWarden - Autonomous Bitcoin Puzzle Solver');
  console.log('='.repeat(80));
  console.log(`\n🎯 Target: ${TARGET_BTC} BTC (${TARGET_SATOSHIS} satoshis)`);
  console.log(`📊 Checking ${addresses.length} unique addresses...\n`);
  console.log('='.repeat(80) + '\n');
  
  const results = [];
  let foundPrize = false;
  
  for (let i = 0; i < addresses.length; i++) {
    const addressInfo = addresses[i];
    process.stdout.write(`[${i + 1}/${addresses.length}] ${addressInfo.addr} ...`);
    
    const result = await checkAddress(addressInfo);
    
    if (result.error) {
      console.log(` ⚠️  ${result.error}`);
    } else if (result.balance > 0) {
      const btcBalance = result.balance / 100000000;
      console.log(` 💰 ${btcBalance} BTC`);
      
      results.push(result);
      
      // Check if this is the prize
      if (Math.abs(result.balance - TARGET_SATOSHIS) < 100) {
        console.log(`\n${'🎉'.repeat(40)}`);
        console.log(`🏆 PRIZE FOUND! 🏆`);
        console.log(`${'🎉'.repeat(40)}\n`);
        foundPrize = true;
      }
    } else if (result.totalReceived > 0) {
      console.log(` ℹ️  Used (${result.totalReceived / 100000000} BTC received)`);
    } else {
      console.log(` ✓ Empty`);
    }
    
    // Rate limit: 600ms between requests to be respectful to APIs
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 FINAL RESULTS\n');
  console.log('='.repeat(80) + '\n');
  
  if (results.length > 0) {
    console.log(`Found ${results.length} address(es) with balance:\n`);
    
    for (const result of results) {
      const btcBalance = result.balance / 100000000;
      const isPrize = Math.abs(result.balance - TARGET_SATOSHIS) < 100;
      
      console.log(`${isPrize ? '🏆' : '💰'} ${result.addr}`);
      console.log(`   Balance: ${btcBalance} BTC (${result.balance} satoshis)`);
      console.log(`   Type: ${result.type} Indexing`);
      console.log(`   24th word: "${result.word24}"`);
      console.log(`   Derivation: ${result.path}`);
      console.log(`   TX Count: ${result.txCount}`);
      console.log(`   Total Received: ${result.totalReceived / 100000000} BTC`);
      console.log(`   Total Sent: ${result.totalSent / 100000000} BTC`);
      
      if (isPrize) {
        console.log(`\n   ✅ THIS IS THE WINNING ADDRESS! ✅\n`);
      }
      console.log('');
    }
  } else {
    console.log('❌ No addresses with current balance found.\n');
  }
  
  console.log('='.repeat(80));
  console.log('\n📈 SUMMARY:\n');
  console.log(`   Total Addresses Checked: ${addresses.length}`);
  console.log(`   Addresses with Balance: ${results.length}`);
  console.log(`   Prize Found: ${foundPrize ? '✅ YES!' : '❌ Not yet'}`);
  console.log(`   Indexing Types: Mixed (9 addrs), All-0-Indexed (24 addrs)`);
  console.log(`   Derivation Paths: Standard, Magic 130, Alternate 130`);
  console.log('\n' + '='.repeat(80) + '\n');
  
  if (foundPrize) {
    console.log('🎊 TheWarden successfully solved the Bitcoin puzzle! 🎊\n');
  } else {
    console.log('💡 TheWarden continues the search...\n');
  }
}

main().catch(console.error);
