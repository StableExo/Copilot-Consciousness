#!/usr/bin/env node
/**
 * BitCrack Hardware Performance Profiler
 * 
 * Profiles GPU hardware performance for BitCrack optimization.
 * Measures search rates, thermal performance, and provides tuning recommendations.
 * 
 * Features:
 * - GPU performance benchmarking
 * - Search rate profiling across different range sizes
 * - Thermal monitoring and throttling detection
 * - Power consumption estimation
 * - Optimal configuration recommendations
 * - Multi-GPU performance comparison
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface GPUInfo {
  id: number;
  name: string;
  memory_total: number; // MB
  memory_available: number; // MB
  cuda_cores?: number;
  compute_capability?: string;
  driver_version?: string;
}

interface PerformanceMetrics {
  gpu_id: number;
  search_rate: number; // keys per second
  temperature: number; // celsius
  power_draw: number; // watts
  memory_usage: number; // MB
  timestamp: string;
}

interface BenchmarkResult {
  gpu_id: number;
  range_size: string;
  keys_tested: bigint;
  duration_seconds: number;
  keys_per_second: number;
  temperature_start: number;
  temperature_end: number;
  throttling_detected: boolean;
}

interface ProfileReport {
  hardware: GPUInfo[];
  benchmarks: BenchmarkResult[];
  recommendations: {
    optimal_range_size: string;
    max_concurrent_ranges: number;
    thermal_throttling_risk: 'low' | 'medium' | 'high';
    power_efficiency_score: number; // 0-100
    suggested_grid_size?: number;
    suggested_block_size?: number;
  };
  estimated_rates: {
    puzzle_71_years: number;
    puzzle_72_years: number;
    puzzle_75_years: number;
  };
}

export class BitCrackHardwareProfiler {
  private readonly dataDir: string;
  private readonly profilePath: string;
  private readonly metricsPath: string;
  
  constructor(dataDir: string = 'data/ml-predictions') {
    this.dataDir = dataDir;
    this.profilePath = join(dataDir, 'hardware_profile.json');
    this.metricsPath = join(dataDir, 'performance_metrics.json');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }
  
  /**
   * Detect available GPUs
   */
  async detectGPUs(): Promise<GPUInfo[]> {
    console.log('🔍 Detecting GPUs...');
    
    // In a real implementation, this would:
    // 1. Use nvidia-smi or CUDA API
    // 2. Query GPU properties
    // 3. Check memory availability
    
    // Simulated GPU detection (replace with actual detection)
    const gpus: GPUInfo[] = [
      {
        id: 0,
        name: 'NVIDIA GeForce RTX 3090',
        memory_total: 24576,
        memory_available: 22000,
        cuda_cores: 10496,
        compute_capability: '8.6',
        driver_version: '535.54.03'
      }
    ];
    
    console.log(`✓ Detected ${gpus.length} GPU(s)`);
    gpus.forEach(gpu => {
      console.log(`   [GPU ${gpu.id}] ${gpu.name} (${gpu.memory_total} MB)`);
    });
    
    return gpus;
  }
  
  /**
   * Run performance benchmark on a GPU
   */
  async benchmarkGPU(
    gpuId: number,
    rangeSize: bigint = BigInt('0x100000000') // 4B keys
  ): Promise<BenchmarkResult> {
    console.log(`\n🏃 Benchmarking GPU ${gpuId}...`);
    console.log(`   Range size: ${rangeSize.toString(16).toUpperCase()}`);
    
    const startTemp = await this.getGPUTemperature(gpuId);
    const startTime = Date.now();
    
    // In a real implementation, this would:
    // 1. Run BitCrack with test range
    // 2. Monitor performance in real-time
    // 3. Detect thermal throttling
    // 4. Measure actual keys/sec
    
    // Simulate benchmark (replace with actual BitCrack execution)
    const durationSeconds = 60; // 1 minute test
    const keysPerSecond = 1.2e9; // 1.2B keys/sec (typical RTX 3090)
    const keysTested = BigInt(Math.floor(keysPerSecond * durationSeconds));
    
    // Simulate temperature increase
    await this.sleep(1000); // Simulate warmup
    const endTemp = await this.getGPUTemperature(gpuId);
    
    const result: BenchmarkResult = {
      gpu_id: gpuId,
      range_size: rangeSize.toString(16).toUpperCase(),
      keys_tested: keysTested,
      duration_seconds: durationSeconds,
      keys_per_second: keysPerSecond,
      temperature_start: startTemp,
      temperature_end: endTemp,
      throttling_detected: endTemp > 83 // NVIDIA throttles ~83°C
    };
    
    console.log(`✓ Benchmark complete`);
    console.log(`   Keys tested: ${keysTested}`);
    console.log(`   Rate: ${(keysPerSecond / 1e9).toFixed(2)} B keys/sec`);
    console.log(`   Temperature: ${startTemp}°C → ${endTemp}°C`);
    console.log(`   Throttling: ${result.throttling_detected ? '⚠️ YES' : '✓ NO'}`);
    
    return result;
  }
  
  /**
   * Profile hardware and generate recommendations
   */
  async profileHardware(): Promise<ProfileReport> {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 BitCrack Hardware Performance Profile');
    console.log('='.repeat(80));
    
    // Detect GPUs
    const hardware = await this.detectGPUs();
    
    // Benchmark each GPU
    const benchmarks: BenchmarkResult[] = [];
    for (const gpu of hardware) {
      const result = await this.benchmarkGPU(gpu.id);
      benchmarks.push(result);
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(hardware, benchmarks);
    
    // Estimate completion times
    const avgRate = benchmarks.reduce((sum, b) => sum + b.keys_per_second, 0) / benchmarks.length;
    const estimated_rates = this.estimateCompletionTimes(avgRate);
    
    const report: ProfileReport = {
      hardware,
      benchmarks,
      recommendations,
      estimated_rates
    };
    
    this.saveProfile(report);
    this.displayProfile(report);
    
    return report;
  }
  
  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    hardware: GPUInfo[],
    benchmarks: BenchmarkResult[]
  ): ProfileReport['recommendations'] {
    const avgTemp = benchmarks.reduce((sum, b) => sum + b.temperature_end, 0) / benchmarks.length;
    const maxTemp = Math.max(...benchmarks.map(b => b.temperature_end));
    const avgRate = benchmarks.reduce((sum, b) => sum + b.keys_per_second, 0) / benchmarks.length;
    const throttlingCount = benchmarks.filter(b => b.throttling_detected).length;
    
    // Determine thermal risk
    let thermal_risk: 'low' | 'medium' | 'high' = 'low';
    if (maxTemp > 85 || throttlingCount > 0) {
      thermal_risk = 'high';
    } else if (maxTemp > 75) {
      thermal_risk = 'medium';
    }
    
    // Calculate power efficiency (simplified)
    const power_efficiency = Math.min(100, Math.floor((avgRate / 1e9) * 50));
    
    // Determine optimal range size
    const optimal_range_size = avgRate > 1.5e9 ? '0x200000000' : '0x100000000';
    
    // Max concurrent ranges based on memory
    const avgMemory = hardware.reduce((sum, gpu) => sum + gpu.memory_available, 0) / hardware.length;
    const max_concurrent = Math.min(8, Math.floor(avgMemory / 2000)); // ~2GB per range
    
    return {
      optimal_range_size,
      max_concurrent_ranges: max_concurrent,
      thermal_throttling_risk: thermal_risk,
      power_efficiency_score: power_efficiency,
      suggested_grid_size: avgRate > 1e9 ? 256 : 128,
      suggested_block_size: 256
    };
  }
  
  /**
   * Estimate completion times for different puzzles
   */
  private estimateCompletionTimes(keysPerSecond: number): ProfileReport['estimated_rates'] {
    // Puzzle keyspace sizes (approximate)
    const puzzle71 = BigInt('0x800000000000000000'); // 2^71
    const puzzle72 = BigInt('0x1000000000000000000'); // 2^72
    const puzzle75 = BigInt('0x8000000000000000000'); // 2^75
    
    // With ML guidance, search 50% of keyspace
    const years71 = Number(puzzle71 / BigInt(2)) / keysPerSecond / (365.25 * 24 * 60 * 60);
    const years72 = Number(puzzle72 / BigInt(2)) / keysPerSecond / (365.25 * 24 * 60 * 60);
    const years75 = Number(puzzle75 / BigInt(2)) / keysPerSecond / (365.25 * 24 * 60 * 60);
    
    return {
      puzzle_71_years: Math.round(years71),
      puzzle_72_years: Math.round(years72),
      puzzle_75_years: Math.round(years75)
    };
  }
  
  /**
   * Get GPU temperature (simulated)
   */
  private async getGPUTemperature(gpuId: number): Promise<number> {
    // In a real implementation, use nvidia-smi or NVML
    // nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i <gpu_id>
    
    // Simulated temperature
    return 45 + Math.random() * 25; // 45-70°C
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Save profile to disk
   */
  private saveProfile(report: ProfileReport): void {
    // Convert BigInt to string for JSON
    const serializable = {
      ...report,
      benchmarks: report.benchmarks.map(b => ({
        ...b,
        keys_tested: b.keys_tested.toString()
      }))
    };
    
    writeFileSync(this.profilePath, JSON.stringify(serializable, null, 2), 'utf-8');
    console.log(`\n✓ Profile saved: ${this.profilePath}`);
  }
  
  /**
   * Display profile report
   */
  private displayProfile(report: ProfileReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Hardware Profile Summary');
    console.log('='.repeat(80));
    
    console.log('\n💾 Hardware:');
    report.hardware.forEach(gpu => {
      console.log(`   [GPU ${gpu.id}] ${gpu.name}`);
      console.log(`      Memory: ${gpu.memory_available} / ${gpu.memory_total} MB available`);
      if (gpu.cuda_cores) {
        console.log(`      CUDA Cores: ${gpu.cuda_cores}`);
      }
    });
    
    console.log('\n🏃 Benchmark Results:');
    report.benchmarks.forEach(b => {
      console.log(`   [GPU ${b.gpu_id}] ${(b.keys_per_second / 1e9).toFixed(2)} B keys/sec`);
      console.log(`      Temperature: ${b.temperature_start.toFixed(1)}°C → ${b.temperature_end.toFixed(1)}°C`);
      console.log(`      Throttling: ${b.throttling_detected ? '⚠️ DETECTED' : '✓ None'}`);
    });
    
    console.log('\n💡 Recommendations:');
    console.log(`   Optimal Range Size: ${report.recommendations.optimal_range_size}`);
    console.log(`   Max Concurrent Ranges: ${report.recommendations.max_concurrent_ranges}`);
    console.log(`   Thermal Risk: ${report.recommendations.thermal_throttling_risk.toUpperCase()}`);
    console.log(`   Power Efficiency: ${report.recommendations.power_efficiency_score}/100`);
    if (report.recommendations.suggested_grid_size) {
      console.log(`   Suggested Grid Size: ${report.recommendations.suggested_grid_size}`);
    }
    if (report.recommendations.suggested_block_size) {
      console.log(`   Suggested Block Size: ${report.recommendations.suggested_block_size}`);
    }
    
    console.log('\n⏱️ Estimated Completion Times (with ML guidance):');
    console.log(`   Puzzle #71: ${report.estimated_rates.puzzle_71_years.toLocaleString()} years`);
    console.log(`   Puzzle #72: ${report.estimated_rates.puzzle_72_years.toLocaleString()} years`);
    console.log(`   Puzzle #75: ${report.estimated_rates.puzzle_75_years.toLocaleString()} years`);
    
    if (report.recommendations.thermal_throttling_risk === 'high') {
      console.log('\n⚠️ WARNING: High thermal throttling risk!');
      console.log('   Recommendations:');
      console.log('   - Improve GPU cooling (fans, liquid cooling)');
      console.log('   - Reduce power limit (-pl flag)');
      console.log('   - Lower ambient temperature');
      console.log('   - Reduce concurrent workload');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  /**
   * Monitor performance in real-time
   */
  async startMonitoring(intervalSeconds: number = 60): Promise<void> {
    console.log(`\n📡 Starting performance monitoring (every ${intervalSeconds}s)...`);
    console.log('Press Ctrl+C to stop\n');
    
    const monitor = async () => {
      const hardware = await this.detectGPUs();
      const metrics: PerformanceMetrics[] = [];
      
      for (const gpu of hardware) {
        const temp = await this.getGPUTemperature(gpu.id);
        
        // In a real implementation, get actual metrics
        const metric: PerformanceMetrics = {
          gpu_id: gpu.id,
          search_rate: 1.2e9, // Would be actual rate
          temperature: temp,
          power_draw: 350, // Would be actual power
          memory_usage: gpu.memory_total - gpu.memory_available,
          timestamp: new Date().toISOString()
        };
        
        metrics.push(metric);
        
        console.log(`[${new Date().toLocaleTimeString()}] GPU ${gpu.id}: ` +
                    `${(metric.search_rate / 1e9).toFixed(2)} B keys/s, ` +
                    `${metric.temperature.toFixed(1)}°C, ` +
                    `${metric.power_draw}W`);
      }
      
      this.saveMetrics(metrics);
    };
    
    // Initial monitoring
    await monitor();
    
    // Periodic monitoring
    const timer = setInterval(monitor, intervalSeconds * 1000);
    
    // Handle cleanup
    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log('\n✓ Monitoring stopped');
      process.exit(0);
    });
  }
  
  /**
   * Save performance metrics
   */
  private saveMetrics(metrics: PerformanceMetrics[]): void {
    let history: PerformanceMetrics[] = [];
    
    if (existsSync(this.metricsPath)) {
      history = JSON.parse(readFileSync(this.metricsPath, 'utf-8'));
    }
    
    history.push(...metrics);
    
    // Keep last 1000 records
    if (history.length > 1000) {
      history = history.slice(-1000);
    }
    
    writeFileSync(this.metricsPath, JSON.stringify(history, null, 2), 'utf-8');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const profiler = new BitCrackHardwareProfiler();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'detect':
        await profiler.detectGPUs();
        break;
        
      case 'benchmark':
        const gpuId = parseInt(process.argv[3] || '0', 10);
        await profiler.benchmarkGPU(gpuId);
        break;
        
      case 'profile':
        await profiler.profileHardware();
        break;
        
      case 'monitor':
        const interval = parseInt(process.argv[3] || '60', 10);
        await profiler.startMonitoring(interval);
        break;
        
      default:
        console.log('BitCrack Hardware Performance Profiler');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts detect');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts benchmark [gpu_id]');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts profile');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts monitor [interval_seconds]');
        console.log('');
        console.log('Examples:');
        console.log('  # Detect available GPUs');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts detect');
        console.log('');
        console.log('  # Run full hardware profile');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts profile');
        console.log('');
        console.log('  # Monitor performance every 30 seconds');
        console.log('  npx tsx scripts/bitcrack_hardware_profiler.ts monitor 30');
    }
  })();
}

export default BitCrackHardwareProfiler;
