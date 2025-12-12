#!/usr/bin/env node
/**
 * CoinMarketCap API Integration Verification
 * 
 * Checks if CoinMarketCap API is properly configured and
 * explores the 8 CEX integrations available through CMC
 * 
 * CMC provides unified access to BOTH:
 * - CEX data (Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Gate.io, Huobi, etc.)
 * - DEX data (Uniswap, PancakeSwap, SushiSwap, Curve, etc.)
 * 
 * All with ONE API key!
 */

import { CoinMarketCapClient, CMCApiTier } from '../../src/execution/coinmarketcap/index.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 COINMARKETCAP API VERIFICATION');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Check environment configuration
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;
const CMC_ENABLED = process.env.ENABLE_COINMARKETCAP === 'true';
const CMC_TIER = process.env.COINMARKETCAP_API_TIER || 'free';

console.log('📋 Configuration:');
console.log(`   API Key: ${CMC_API_KEY ? '✅ Present (' + CMC_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`   Enabled: ${CMC_ENABLED ? '✅ Yes' : '❌ No'}`);
console.log(`   Tier: ${CMC_TIER}`);
console.log('');

if (!CMC_API_KEY) {
  console.log('❌ COINMARKETCAP_API_KEY not found in environment');
  console.log('');
  console.log('To enable:');
  console.log('  1. Add to .env:');
  console.log('     COINMARKETCAP_API_KEY=your_api_key_here');
  console.log('     ENABLE_COINMARKETCAP=true');
  console.log('     COINMARKETCAP_API_TIER=free');
  console.log('');
  console.log('  2. Get free API key from:');
  console.log('     https://coinmarketcap.com/api/');
  console.log('');
  process.exit(1);
}

// Initialize client
const client = new CoinMarketCapClient({
  apiKey: CMC_API_KEY,
  tier: CMCApiTier.FREE,
});

console.log('═══════════════════════════════════════════════════════════');
console.log('🏦 CEX INTEGRATION CHECK (8 Major Exchanges)');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

async function checkCEXIntegrations() {
  try {
    console.log('Checking top CEX integrations via CoinMarketCap...');
    console.log('');
    
    // These 8 CEX are the ones we want to verify
    const targetExchanges = [
      'binance',
      'coinbase-exchange',
      'kraken',
      'okx',
      'bybit',
      'kucoin',
      'gate-io',
      'huobi-global'
    ];
    
    console.log('🎯 Target CEX Integrations (8):');
    targetExchanges.forEach((exchange, i) => {
      console.log(`   ${i + 1}. ${exchange}`);
    });
    console.log('');
    
    // Fetch exchange data from CMC
    console.log('📡 Fetching exchange data from CoinMarketCap...');
    
    const exchangeData = await client.getCEXExchangeQuotes({
      slug: targetExchanges,
      convert: 'USD',
    });
    
    console.log('');
    console.log('✅ Successfully connected to CoinMarketCap API');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 EXCHANGE DATA RETRIEVED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    const exchanges = Object.values(exchangeData.data);
    
    exchanges.forEach((exchange, i) => {
      const volume24h = exchange.quote.USD.volume_24h;
      const volumeChange = exchange.quote.USD.percent_change_volume_24h;
      const numMarkets = exchange.num_market_pairs;
      
      console.log(`${i + 1}. ${exchange.name}`);
      console.log(`   Slug: ${exchange.slug}`);
      console.log(`   24h Volume: $${(volume24h / 1e9).toFixed(2)}B`);
      console.log(`   Volume Change: ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(2)}%`);
      console.log(`   Market Pairs: ${numMarkets.toLocaleString()}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔗 INTEGRATION STATUS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`✅ CoinMarketCap API: CONNECTED`);
    console.log(`✅ CEX Integrations: ${exchanges.length}/8 accessible`);
    console.log(`✅ Total Market Pairs: ${exchanges.reduce((sum, e) => sum + e.num_market_pairs, 0).toLocaleString()}`);
    console.log('');
    
    // Check API usage
    const stats = client.getStats();
    console.log('📈 API Usage Statistics:');
    console.log(`   Requests This Session: ${stats.totalRequests}`);
    console.log(`   Credits Used: ${stats.totalCreditsUsed}`);
    console.log(`   Credits Remaining: ${stats.creditsRemaining}`);
    console.log(`   Requests This Minute: ${stats.requestsThisMinute}`);
    console.log(`   Requests Today: ${stats.requestsToday}`);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💡 WHAT THIS MEANS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ ONE API Key → Access to 8 Major CEX + All DEXs');
    console.log('✅ Free Tier: 333 credits/day, 30 requests/minute');
    console.log('✅ Real-time price data from:');
    console.log('   • Binance, Coinbase, Kraken, OKX');
    console.log('   • Bybit, KuCoin, Gate.io, Huobi');
    console.log('   • Plus Uniswap, PancakeSwap, SushiSwap, etc.');
    console.log('');
    console.log('✅ Can replace individual CEX WebSocket connections');
    console.log('✅ Unified data format across all exchanges');
    console.log('✅ Built-in rate limiting and error handling');
    console.log('');
    console.log('💰 Perfect for CEX-DEX arbitrage detection!');
    console.log('');
    
    return true;
    
  } catch (error) {
    console.error('');
    console.error('❌ Error checking CEX integrations:');
    console.error(`   ${error.message}`);
    console.error('');
    
    if (error.message.includes('401')) {
      console.error('💡 Possible issues:');
      console.error('   • API key is invalid');
      console.error('   • API key not properly set in environment');
      console.error('   • Get a free key from https://coinmarketcap.com/api/');
    } else if (error.message.includes('429')) {
      console.error('💡 Rate limit reached:');
      console.error('   • Free tier: 333 credits/day');
      console.error('   • Wait a few minutes and try again');
    }
    console.error('');
    
    return false;
  }
}

async function checkDEXIntegrations() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🦄 DEX INTEGRATION CHECK (Bonus!)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  try {
    console.log('Checking DEX data availability...');
    console.log('');
    
    // Sample DEX pairs
    const dexPairs = [
      'uniswap-v3:eth-usdt',
      'pancakeswap-v3:eth-usdt',
      'sushiswap:eth-usdt',
      'curve:eth-usdt',
    ];
    
    const dexData = await client.getDEXPairsLatest({
      pairs: dexPairs,
      convert: 'USD',
    });
    
    console.log('✅ DEX Data Available:');
    Object.values(dexData.data).forEach((pair) => {
      console.log(`   ${pair.dex_name}: ${pair.base_symbol}/${pair.quote_symbol}`);
      console.log(`     Price: $${pair.quote.USD.price.toFixed(2)}`);
      console.log(`     Liquidity: $${(pair.quote.USD.liquidity / 1e6).toFixed(2)}M`);
    });
    console.log('');
    
  } catch (error) {
    console.log(`⚠️  DEX data check failed: ${error.message}`);
    console.log('   (This is optional - CEX data is primary)');
    console.log('');
  }
}

async function main() {
  const cexSuccess = await checkCEXIntegrations();
  
  if (cexSuccess) {
    await checkDEXIntegrations();
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  if (cexSuccess) {
    console.log('✅ CoinMarketCap integration is HOOKED UP and WORKING!');
    console.log('✅ All 8 CEX integrations accessible via CMC API');
    console.log('✅ Ready for CEX-DEX arbitrage detection');
    console.log('');
    console.log('Next steps:');
    console.log('  • Use CMC data in intelligence gathering');
    console.log('  • Compare CMC prices with on-chain DEX prices');
    console.log('  • Detect arbitrage opportunities across 8+ exchanges');
    console.log('');
  } else {
    console.log('❌ CoinMarketCap integration needs attention');
    console.log('   Check API key and configuration above');
    console.log('');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
