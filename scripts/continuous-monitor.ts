import { existsSync, appendFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MonitoringSnapshot {
  timestamp: Date;
  runtime: string;
  cpuUsage: string;
  memUsage: string;
  status: string;
}

const snapshots: MonitoringSnapshot[] = [];

async function getWardenStatus(): Promise<MonitoringSnapshot | null> {
  try {
    const { stdout } = await execAsync('ps aux | grep "node.*tsx.*main.ts" | grep -v grep');
    if (!stdout.trim()) return null;
    
    const parts = stdout.trim().split(/\s+/);
    const cpu = parts[2];
    const mem = parts[3];
    
    const { stdout: etime } = await execAsync(`ps -o etime= -p ${parts[1]}`);
    
    return {
      timestamp: new Date(),
      runtime: etime.trim(),
      cpuUsage: cpu + '%',
      memUsage: mem + '%',
      status: 'RUNNING'
    };
  } catch (error) {
    return null;
  }
}

async function monitor() {
  console.log('🤖 TheWarden Continuous Monitoring Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (let i = 0; i < 12; i++) { // 12 iterations, 30 seconds each = 6 minutes
    const status = await getWardenStatus();
    
    if (!status) {
      console.log(`\n❌ [${new Date().toISOString()}] TheWarden stopped running`);
      break;
    }
    
    snapshots.push(status);
    
    console.log(`\n✅ [${status.timestamp.toISOString()}]`);
    console.log(`   Runtime: ${status.runtime}`);
    console.log(`   CPU: ${status.cpuUsage}, Memory: ${status.memUsage}`);
    console.log(`   Snapshots collected: ${snapshots.length}`);
    
    // Save progress every 2 minutes
    if (i % 4 === 0 && i > 0) {
      const summary = {
        totalSnapshots: snapshots.length,
        firstSnapshot: snapshots[0],
        lastSnapshot: snapshots[snapshots.length - 1],
        averageCPU: snapshots.reduce((sum, s) => sum + parseFloat(s.cpuUsage), 0) / snapshots.length,
        timestamps: snapshots.map(s => s.timestamp.toISOString()),
      };
      
      writeFileSync('.memory/monitoring-progress.json', JSON.stringify(summary, null, 2));
      console.log(`   📊 Progress saved (${Math.floor(i * 30 / 60)} minutes monitored)`);
    }
    
    // Wait 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Monitoring complete! Collected ${snapshots.length} snapshots`);
  console.log(`⏱️  Total monitoring time: ${snapshots.length * 0.5} minutes`);
  
  // Final summary
  const finalSummary = {
    monitoringCompleted: new Date().toISOString(),
    totalSnapshots: snapshots.length,
    monitoringDuration: `${snapshots.length * 0.5} minutes`,
    firstSnapshot: snapshots[0],
    lastSnapshot: snapshots[snapshots.length - 1],
    snapshots,
  };
  
  writeFileSync('.memory/monitoring-complete.json', JSON.stringify(finalSummary, null, 2));
  console.log('\n📁 Final report saved to .memory/monitoring-complete.json');
}

monitor().catch(console.error);
