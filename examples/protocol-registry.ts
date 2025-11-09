/**
 * Example: Protocol Registry Usage
 * 
 * Demonstrates how to use the Protocol Registry system for managing
 * DEX protocols, tokens, and pools
 */

import { 
  protocolRegistry,
  tokenPrecision,
  dynamicPoolManager,
  getChainAddresses,
  getWETHAddress
} from '../src/config/registry';

async function main() {
  console.log('=== Protocol Registry Usage Example ===\n');

  // Example 1: Protocol Registry Basics
  console.log('1. Protocol Registry Basics');
  console.log('----------------------------');

  // Get protocol by name
  const uniswapV3 = protocolRegistry.get('Uniswap V3');
  if (uniswapV3) {
    console.log('Uniswap V3 Configuration:');
    console.log(`  Router: ${uniswapV3.router}`);
    console.log(`  Factory: ${uniswapV3.factory}`);
    console.log(`  Quoter: ${uniswapV3.quoter}`);
    console.log(`  Chains: ${uniswapV3.supportedChains.join(', ')}`);
    console.log(`  Features: ${uniswapV3.features.join(', ')}`);
  }

  // Get all protocols for Arbitrum
  const arbitrumProtocols = protocolRegistry.getByChain(42161);
  console.log(`\nProtocols on Arbitrum (${arbitrumProtocols.length}):`);
  arbitrumProtocols.forEach(p => {
    console.log(`  - ${p.name} (${p.type})`);
  });

  // Check feature support
  const supportsFlashSwap = protocolRegistry.supports('Uniswap V3', 'flash-swap');
  const supportsConcentratedLiq = protocolRegistry.supports('Uniswap V3', 'concentrated-liquidity');
  console.log(`\nUniswap V3 Features:`);
  console.log(`  Flash Swap: ${supportsFlashSwap ? '✅' : '❌'}`);
  console.log(`  Concentrated Liquidity: ${supportsConcentratedLiq ? '✅' : '❌'}`);

  // Example 2: Token Precision Manager
  console.log('\n\n2. Token Precision Manager');
  console.log('---------------------------');

  const wethArb = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
  const usdcArb = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';

  // Get token decimals
  const wethDecimals = tokenPrecision.getDecimals(wethArb, 42161);
  const usdcDecimals = tokenPrecision.getDecimals(usdcArb, 42161);
  console.log(`WETH decimals: ${wethDecimals}`);
  console.log(`USDC decimals: ${usdcDecimals}`);

  // Convert human-readable to token units
  const wethAmount = '10.5';
  const wethUnits = tokenPrecision.toTokenUnits(wethAmount, wethArb, 42161);
  console.log(`\n${wethAmount} WETH = ${wethUnits} units`);

  const usdcAmount = '1500.50';
  const usdcUnits = tokenPrecision.toTokenUnits(usdcAmount, usdcArb, 42161);
  console.log(`${usdcAmount} USDC = ${usdcUnits} units`);

  // Convert back to human-readable
  const wethReadable = tokenPrecision.fromTokenUnits(wethUnits, wethArb, 42161);
  const usdcReadable = tokenPrecision.fromTokenUnits(usdcUnits, usdcArb, 42161);
  console.log(`\nRound-trip conversion:`);
  console.log(`  WETH: ${wethAmount} -> ${wethUnits} -> ${wethReadable}`);
  console.log(`  USDC: ${usdcAmount} -> ${usdcUnits} -> ${usdcReadable}`);

  // Example 3: Known Addresses
  console.log('\n\n3. Known Addresses');
  console.log('-------------------');

  const arbitrumAddresses = getChainAddresses(42161);
  if (arbitrumAddresses) {
    console.log('Arbitrum One:');
    console.log(`  Chain ID: ${arbitrumAddresses.chainId}`);
    console.log(`  Name: ${arbitrumAddresses.name}`);
    console.log(`  Native Currency: ${arbitrumAddresses.nativeCurrency.symbol}`);
    console.log(`  WETH: ${arbitrumAddresses.weth}`);
    console.log(`  Multicall: ${arbitrumAddresses.multicall}`);
  }

  const wethAddress = getWETHAddress(42161);
  console.log(`\nWETH address on Arbitrum: ${wethAddress}`);

  // Example 4: Dynamic Pool Manager
  console.log('\n\n4. Dynamic Pool Manager');
  console.log('------------------------');

  // Load pool manifest for Arbitrum
  const manifest = await dynamicPoolManager.loadManifest(42161);
  console.log(`Loaded manifest for chain ${manifest.chainId}`);
  console.log(`Version: ${manifest.version}`);
  console.log(`Last Updated: ${new Date(manifest.lastUpdated).toISOString()}`);
  console.log(`Total Pools: ${manifest.pools.length}`);

  // Add a new pool
  const newPool = {
    address: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443',
    token0: wethArb,
    token1: usdcArb,
    fee: 500,  // 0.05%
    protocol: 'Uniswap V3',
    chainId: 42161,
    tvl: '10000000',
    volume24h: '5000000',
    lastUpdated: Date.now(),
    enabled: true
  };

  await dynamicPoolManager.addPool(newPool);
  console.log(`\n✅ Added pool: ${newPool.address.slice(0, 10)}...`);

  // Get pools by protocol
  const uniswapPools = await dynamicPoolManager.getPoolsByProtocol(42161, 'Uniswap V3');
  console.log(`\nUniswap V3 pools on Arbitrum: ${uniswapPools.length}`);

  // Get pools by token pair
  const wethUsdcPools = await dynamicPoolManager.getPoolsByTokenPair(42161, wethArb, usdcArb);
  console.log(`WETH-USDC pools: ${wethUsdcPools.length}`);
  wethUsdcPools.forEach(pool => {
    console.log(`  - ${pool.address.slice(0, 10)}... (Fee: ${pool.fee / 10000}%)`);
  });

  // Update pool data
  await dynamicPoolManager.updatePool(42161, newPool.address, {
    tvl: '12000000',
    volume24h: '6000000'
  });
  console.log(`\n✅ Updated pool data`);

  // Example 5: Building a DEX Adapter
  console.log('\n\n5. Building a DEX Adapter');
  console.log('--------------------------');

  function createDEXAdapter(protocolName: string, chainId: number) {
    const protocol = protocolRegistry.get(protocolName);
    
    if (!protocol) {
      throw new Error(`Protocol ${protocolName} not found`);
    }
    
    if (!protocol.supportedChains.includes(chainId)) {
      throw new Error(`Protocol ${protocolName} not supported on chain ${chainId}`);
    }
    
    return {
      name: protocol.name,
      type: protocol.type,
      router: protocol.router,
      factory: protocol.factory,
      quoter: protocol.quoter,
      features: protocol.features
    };
  }

  const uniAdapter = createDEXAdapter('Uniswap V3', 42161);
  console.log('Created Uniswap V3 Adapter:');
  console.log(`  Router: ${uniAdapter.router}`);
  console.log(`  Features: ${uniAdapter.features.join(', ')}`);

  // Example 6: Multi-Protocol Route Finding
  console.log('\n\n6. Multi-Protocol Route Finding');
  console.log('---------------------------------');

  async function findBestRoute(
    tokenIn: string,
    tokenOut: string,
    chainId: number
  ) {
    const protocols = protocolRegistry.getByChain(chainId);
    const routes = [];

    for (const protocol of protocols) {
      const pools = await dynamicPoolManager.getPoolsByProtocol(chainId, protocol.name);
      
      for (const pool of pools) {
        const hasTokenIn = pool.token0.toLowerCase() === tokenIn.toLowerCase() ||
                          pool.token1.toLowerCase() === tokenIn.toLowerCase();
        const hasTokenOut = pool.token0.toLowerCase() === tokenOut.toLowerCase() ||
                           pool.token1.toLowerCase() === tokenOut.toLowerCase();
        
        if (hasTokenIn || hasTokenOut) {
          routes.push({
            protocol: protocol.name,
            pool: pool.address,
            fee: pool.fee,
            tvl: pool.tvl
          });
        }
      }
    }

    return routes;
  }

  console.log('Finding routes for WETH -> USDC on Arbitrum...');
  const routes = await findBestRoute(wethArb, usdcArb, 42161);
  console.log(`Found ${routes.length} potential routes:`);
  routes.slice(0, 3).forEach(route => {
    console.log(`  - ${route.protocol} (${route.pool.slice(0, 10)}...) TVL: $${route.tvl}`);
  });

  // Example 7: Maintenance Operations
  console.log('\n\n7. Maintenance Operations');
  console.log('--------------------------');

  console.log('Pruning inactive pools (simulated)...');
  // In production, this would prune pools not updated in 7 days
  const pruned = await dynamicPoolManager.pruneInactivePools(
    42161,
    7 * 24 * 60 * 60 * 1000
  );
  console.log(`Pruned ${pruned} inactive pools`);

  console.log('\nSaving manifests...');
  await dynamicPoolManager.saveAll();
  console.log('✅ All manifests saved');

  // Example 8: Export Configuration
  console.log('\n\n8. Export Configuration');
  console.log('------------------------');

  const allProtocols = protocolRegistry.exportConfig();
  console.log(`Exported ${allProtocols.length} protocol configurations`);
  
  console.log('\nProtocol Summary:');
  const protocolsByType = allProtocols.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(protocolsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\n=== Example Complete ===');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
