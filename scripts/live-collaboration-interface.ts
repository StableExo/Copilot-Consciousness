#!/usr/bin/env node
/**
 * Live Collaboration Interface for Autonomous Warden
 * 
 * This creates a real-time interface where you can:
 * - Monitor TheWarden execution in real-time
 * - Adjust parameters on-the-fly without stopping
 * - See consciousness learning and decision-making
 * - Collaborate and give guidance while it runs
 * - View blockchain transaction results immediately
 * 
 * Usage:
 *   npm run warden:collab
 *   or
 *   node --import tsx scripts/live-collaboration-interface.ts
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

interface LiveMetrics {
  timestamp: number;
  opportunitiesFound: number;
  opportunitiesExecuted: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  netProfit: number;
  ethicsVetoes: number;
  emergenceDetections: number;
  consensusLevel: number;
  riskScore: number;
  ethicalScore: number;
  lastTransaction?: string;
  currentBlock: number;
}

interface ParameterUpdate {
  parameter: string;
  value: number;
  reason: string;
}

class LiveCollaborationInterface {
  private server?: http.Server;
  private wardenProcess?: ChildProcess;
  private metrics: LiveMetrics;
  private logBuffer: string[] = [];
  private maxLogLines = 100;
  private currentParameters: any;
  private subscribers: http.ServerResponse[] = [];
  private readonly port = parseInt(process.env.COLLAB_PORT || '3001', 10);
  
  constructor() {
    this.metrics = {
      timestamp: Date.now(),
      opportunitiesFound: 0,
      opportunitiesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      netProfit: 0,
      ethicsVetoes: 0,
      emergenceDetections: 0,
      consensusLevel: 0,
      riskScore: 0,
      ethicalScore: 0,
      currentBlock: 0,
    };
    
    this.currentParameters = this.loadParameters();
  }
  
  private loadParameters(): any {
    const paramFile = path.join(process.cwd(), '.memory', 'autonomous-execution', 'current-parameters.json');
    if (fs.existsSync(paramFile)) {
      return JSON.parse(fs.readFileSync(paramFile, 'utf-8'));
    }
    return {
      MIN_PROFIT_THRESHOLD: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
      MIN_PROFIT_PERCENT: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),
      MIN_PROFIT_ABSOLUTE: parseFloat(process.env.MIN_PROFIT_ABSOLUTE || '0.001'),
      MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || '0.005'),
      MAX_GAS_PRICE: parseFloat(process.env.MAX_GAS_PRICE || '100'),
      SCAN_INTERVAL: parseInt(process.env.SCAN_INTERVAL || '800', 10),
    };
  }
  
  private saveParameters(): void {
    const paramFile = path.join(process.cwd(), '.memory', 'autonomous-execution', 'current-parameters.json');
    const dir = path.dirname(paramFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(paramFile, JSON.stringify(this.currentParameters, null, 2));
  }
  
  private addLog(line: string): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    this.logBuffer.push(`[${timestamp}] ${line}`);
    if (this.logBuffer.length > this.maxLogLines) {
      this.logBuffer.shift();
    }
  }
  
  private parseLine(line: string): void {
    // Update metrics from log line
    const oppMatch = line.match(/Found (\d+) (potential )?opportunit/i);
    if (oppMatch) {
      this.metrics.opportunitiesFound += parseInt(oppMatch[1], 10);
    }
    
    // More specific pattern to avoid false matches
    if (line.match(/Executing (arbitrage|trade|opportunity)|Execution started/i)) {
      this.metrics.opportunitiesExecuted++;
    }
    
    // More specific pattern for successful trades
    if (line.match(/(trade|execution|arbitrage).*(successful|completed successfully)/i)) {
      this.metrics.successfulTrades++;
    }
    
    // More specific pattern for failed trades - avoid generic errors
    if (line.match(/(trade|execution|arbitrage).*(failed|failure)/i)) {
      this.metrics.failedTrades++;
    }
    
    const profitMatch = line.match(/profit[:\s]+([\d.]+)\s*ETH/i);
    if (profitMatch) {
      const profit = parseFloat(profitMatch[1]);
      this.metrics.totalProfit += profit;
      this.metrics.netProfit += profit;
    }
    
    if (line.match(/ethics.*veto/i)) {
      this.metrics.ethicsVetoes++;
    }
    
    if (line.match(/emergence.*detected/i)) {
      this.metrics.emergenceDetections++;
    }
    
    const txMatch = line.match(/TX Hash: (0x[a-fA-F0-9]{64})/i);
    if (txMatch) {
      this.metrics.lastTransaction = txMatch[1];
    }
    
    const blockMatch = line.match(/block.*?(\d{7,})/i);
    if (blockMatch) {
      this.metrics.currentBlock = parseInt(blockMatch[1], 10);
    }
    
    this.metrics.timestamp = Date.now();
  }
  
  startWarden(): void {
    if (this.wardenProcess) {
      console.log('⚠️  TheWarden is already running');
      return;
    }
    
    console.log('🚀 Starting TheWarden with live collaboration...');
    
    // Build environment with current parameters
    const env = {
      ...process.env,
      ...Object.fromEntries(
        Object.entries(this.currentParameters).map(([key, value]) => [key, String(value)])
      ),
    };
    
    this.wardenProcess = spawn('./TheWarden', [], {
      env,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    this.wardenProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          this.addLog(line);
          this.parseLine(line);
          console.log(line);
        }
      }
      this.broadcast();
    });
    
    this.wardenProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      this.addLog(`[ERROR] ${line}`);
      console.error(line);
      this.broadcast();
    });
    
    this.wardenProcess.on('close', (code) => {
      this.addLog(`TheWarden exited with code ${code}`);
      console.log(`TheWarden exited with code ${code}`);
      this.wardenProcess = undefined;
      this.broadcast();
    });
    
    this.addLog('TheWarden started successfully');
  }
  
  stopWarden(): void {
    if (!this.wardenProcess) {
      console.log('⚠️  TheWarden is not running');
      return;
    }
    
    console.log('Stopping TheWarden...');
    this.wardenProcess.kill('SIGTERM');
    this.addLog('TheWarden stop requested');
  }
  
  updateParameter(param: string, value: number, reason: string): void {
    if (!(param in this.currentParameters)) {
      throw new Error(`Unknown parameter: ${param}`);
    }
    
    if (isNaN(value) || !isFinite(value)) {
      throw new Error(`Invalid parameter value: ${value}`);
    }
    
    const oldValue = this.currentParameters[param];
    this.currentParameters[param] = value;
    this.saveParameters();
    
    this.addLog(`Parameter updated: ${param} = ${value} (was ${oldValue})`);
    this.addLog(`Reason: ${reason}`);
    
    console.log(`🔧 Parameter updated: ${param} = ${value} (was ${oldValue})`);
    console.log(`   Reason: ${reason}`);
    
    // If TheWarden is running, restart it to pick up new parameters
    if (this.wardenProcess) {
      this.addLog('Restarting TheWarden to apply new parameters...');
      console.log('🔄 Restarting TheWarden to apply new parameters...');
      this.stopWarden();
      // Give it a moment to fully stop before restarting
      setTimeout(() => {
        this.startWarden();
      }, 1000);
    }
    
    this.broadcast();
  }
  
  private broadcast(): void {
    const data = JSON.stringify({
      metrics: this.metrics,
      parameters: this.currentParameters,
      logs: this.logBuffer.slice(-20),
      isRunning: !!this.wardenProcess,
    });
    
    // Filter out dead connections efficiently
    this.subscribers = this.subscribers.filter(subscriber => {
      try {
        subscriber.write(`data: ${data}\n\n`);
        return true; // Keep this subscriber
      } catch (error) {
        return false; // Remove dead connection
      }
    });
  }
  
  startServer(): void {
    this.server = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // SSE endpoint for live updates
      if (req.url === '/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        
        this.subscribers.push(res);
        
        // Send initial data
        res.write(`data: ${JSON.stringify({
          metrics: this.metrics,
          parameters: this.currentParameters,
          logs: this.logBuffer.slice(-20),
          isRunning: !!this.wardenProcess,
        })}\n\n`);
        
        req.on('close', () => {
          const index = this.subscribers.indexOf(res);
          if (index > -1) {
            this.subscribers.splice(index, 1);
          }
        });
        
        return;
      }
      
      // API endpoint to start TheWarden
      if (req.url === '/api/start' && req.method === 'POST') {
        try {
          this.startWarden();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'TheWarden started' }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
      
      // API endpoint to stop TheWarden
      if (req.url === '/api/stop' && req.method === 'POST') {
        try {
          this.stopWarden();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'TheWarden stopped' }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
      
      // API endpoint to update parameter
      if (req.url === '/api/parameter' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { parameter, value, reason } = JSON.parse(body);
            const numValue = parseFloat(value);
            if (isNaN(numValue) || !isFinite(numValue)) {
              throw new Error('Invalid value: must be a valid number');
            }
            this.updateParameter(parameter, numValue, reason || 'Manual adjustment');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: `Parameter ${parameter} updated to ${numValue}`,
              currentValue: this.currentParameters[parameter],
            }));
          } catch (error: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
        return;
      }
      
      // Serve the web interface
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getWebInterface());
        return;
      }
      
      res.writeHead(404);
      res.end('Not found');
    });
    
    this.server.listen(this.port, () => {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  🎮 LIVE COLLABORATION INTERFACE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`  URL: http://localhost:${this.port}`);
      console.log(`  Status: Running`);
      console.log('═══════════════════════════════════════════════════════════════\n');
    });
  }
  
  private getWebInterface(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>TheWarden - Live Collaboration</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Monaco', 'Courier New', monospace;
      background: #0a0e27;
      color: #00ff88;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      text-align: center;
      color: #00ff88;
      text-shadow: 0 0 10px #00ff88;
      margin-bottom: 30px;
      font-size: 2.5em;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .panel {
      background: #1a1f3a;
      border: 2px solid #00ff88;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
    }
    .panel h2 {
      color: #00ffff;
      margin-bottom: 15px;
      font-size: 1.2em;
      border-bottom: 1px solid #00ff88;
      padding-bottom: 10px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #2a3f5a;
    }
    .metric-label { color: #88aaff; }
    .metric-value { color: #00ff88; font-weight: bold; }
    .log-container {
      background: #000;
      border: 1px solid #00ff88;
      border-radius: 4px;
      padding: 10px;
      height: 300px;
      overflow-y: auto;
      font-size: 0.9em;
      line-height: 1.4;
    }
    .log-line { margin: 2px 0; }
    .log-error { color: #ff4444; }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    button {
      background: #00ff88;
      color: #0a0e27;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1em;
      transition: all 0.3s;
    }
    button:hover {
      background: #00ffff;
      box-shadow: 0 0 15px #00ff88;
    }
    button:disabled {
      background: #444;
      cursor: not-allowed;
      color: #888;
    }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 0.9em;
    }
    .status.running { background: #00ff88; color: #0a0e27; }
    .status.stopped { background: #ff4444; color: #fff; }
    .param-control {
      display: flex;
      gap: 10px;
      margin: 10px 0;
      align-items: center;
    }
    .param-control input {
      background: #0a0e27;
      border: 1px solid #00ff88;
      color: #00ff88;
      padding: 8px;
      border-radius: 4px;
      flex: 1;
    }
    .param-control button {
      padding: 8px 16px;
      font-size: 0.9em;
    }
    .tx-link {
      color: #00ffff;
      text-decoration: none;
      word-break: break-all;
    }
    .tx-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 TheWarden - Live Collaboration</h1>
    
    <div class="controls">
      <button id="startBtn" onclick="startWarden()">▶ Start TheWarden</button>
      <button id="stopBtn" onclick="stopWarden()" disabled>⏹ Stop TheWarden</button>
      <span class="status" id="status">Stopped</span>
    </div>
    
    <div class="grid">
      <div class="panel">
        <h2>📊 Live Metrics</h2>
        <div class="metric">
          <span class="metric-label">Opportunities Found:</span>
          <span class="metric-value" id="oppFound">0</span>
        </div>
        <div class="metric">
          <span class="metric-label">Opportunities Executed:</span>
          <span class="metric-value" id="oppExec">0</span>
        </div>
        <div class="metric">
          <span class="metric-label">Successful Trades:</span>
          <span class="metric-value" id="success">0</span>
        </div>
        <div class="metric">
          <span class="metric-label">Failed Trades:</span>
          <span class="metric-value" id="failed">0</span>
        </div>
        <div class="metric">
          <span class="metric-label">Net Profit:</span>
          <span class="metric-value" id="profit">0.000000 ETH</span>
        </div>
        <div class="metric">
          <span class="metric-label">Ethics Vetoes:</span>
          <span class="metric-value" id="vetoes">0</span>
        </div>
        <div class="metric">
          <span class="metric-label">Emergence Detections:</span>
          <span class="metric-value" id="emergence">0</span>
        </div>
        <div class="metric">
          <span class="metric-label">Current Block:</span>
          <span class="metric-value" id="block">-</span>
        </div>
        <div class="metric" id="txContainer" style="display:none">
          <span class="metric-label">Last Transaction:</span>
          <span class="metric-value"><a class="tx-link" id="txLink" target="_blank">View on BaseScan</a></span>
        </div>
      </div>
      
      <div class="panel">
        <h2>🎛️ Parameter Control</h2>
        <div class="param-control">
          <label>MIN_PROFIT_PERCENT:</label>
          <input type="number" id="minProfitPercent" step="0.1" />
          <button onclick="updateParam('MIN_PROFIT_PERCENT', 'minProfitPercent')">Update</button>
        </div>
        <div class="param-control">
          <label>MAX_SLIPPAGE:</label>
          <input type="number" id="maxSlippage" step="0.001" />
          <button onclick="updateParam('MAX_SLIPPAGE', 'maxSlippage')">Update</button>
        </div>
        <div class="param-control">
          <label>MAX_GAS_PRICE:</label>
          <input type="number" id="maxGasPrice" step="1" />
          <button onclick="updateParam('MAX_GAS_PRICE', 'maxGasPrice')">Update</button>
        </div>
        <div class="param-control">
          <label>SCAN_INTERVAL:</label>
          <input type="number" id="scanInterval" step="100" />
          <button onclick="updateParam('SCAN_INTERVAL', 'scanInterval')">Update</button>
        </div>
      </div>
    </div>
    
    <div class="panel">
      <h2>📜 Live Logs</h2>
      <div class="log-container" id="logs"></div>
    </div>
  </div>
  
  <script>
    let eventSource;
    
    function connectStream() {
      eventSource = new EventSource('/stream');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateUI(data);
      };
      
      eventSource.onerror = () => {
        console.error('SSE connection error, reconnecting...');
        setTimeout(connectStream, 5000);
      };
    }
    
    function updateUI(data) {
      // Update metrics
      document.getElementById('oppFound').textContent = data.metrics.opportunitiesFound;
      document.getElementById('oppExec').textContent = data.metrics.opportunitiesExecuted;
      document.getElementById('success').textContent = data.metrics.successfulTrades;
      document.getElementById('failed').textContent = data.metrics.failedTrades;
      document.getElementById('profit').textContent = data.metrics.netProfit.toFixed(6) + ' ETH';
      document.getElementById('vetoes').textContent = data.metrics.ethicsVetoes;
      document.getElementById('emergence').textContent = data.metrics.emergenceDetections;
      document.getElementById('block').textContent = data.metrics.currentBlock || '-';
      
      // Update last transaction with type check
      if (data.metrics.lastTransaction && 
          typeof data.metrics.lastTransaction === 'string' && 
          data.metrics.lastTransaction.length === 66) {
        const txLink = document.getElementById('txLink');
        txLink.href = 'https://basescan.org/tx/' + data.metrics.lastTransaction;
        txLink.textContent = data.metrics.lastTransaction.substring(0, 10) + '...' + data.metrics.lastTransaction.substring(58);
        document.getElementById('txContainer').style.display = 'flex';
      }
      
      // Update parameters
      if (data.parameters) {
        document.getElementById('minProfitPercent').value = data.parameters.MIN_PROFIT_PERCENT;
        document.getElementById('maxSlippage').value = data.parameters.MAX_SLIPPAGE;
        document.getElementById('maxGasPrice').value = data.parameters.MAX_GAS_PRICE;
        document.getElementById('scanInterval').value = data.parameters.SCAN_INTERVAL;
      }
      
      // Update status
      const statusEl = document.getElementById('status');
      if (data.isRunning) {
        statusEl.textContent = 'Running';
        statusEl.className = 'status running';
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
      } else {
        statusEl.textContent = 'Stopped';
        statusEl.className = 'status stopped';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
      }
      
      // Update logs
      const logsEl = document.getElementById('logs');
      logsEl.innerHTML = data.logs.map(log => 
        '<div class="log-line' + (log.includes('[ERROR]') ? ' log-error' : '') + '">' + 
        escapeHtml(log) + 
        '</div>'
      ).join('');
      logsEl.scrollTop = logsEl.scrollHeight;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    async function startWarden() {
      try {
        const res = await fetch('/api/start', { method: 'POST' });
        const data = await res.json();
        if (!data.success) alert('Error: ' + data.error);
      } catch (error) {
        alert('Error starting TheWarden: ' + error.message);
      }
    }
    
    async function stopWarden() {
      try {
        const res = await fetch('/api/stop', { method: 'POST' });
        const data = await res.json();
        if (!data.success) alert('Error: ' + data.error);
      } catch (error) {
        alert('Error stopping TheWarden: ' + error.message);
      }
    }
    
    async function updateParam(param, inputId) {
      const value = document.getElementById(inputId).value;
      const reason = prompt('Reason for change (optional):') || 'Manual adjustment via web interface';
      
      try {
        const res = await fetch('/api/parameter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parameter: param, value, reason })
        });
        const data = await res.json();
        if (data.success) {
          alert('Parameter updated: ' + param + ' = ' + value);
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        alert('Error updating parameter: ' + error.message);
      }
    }
    
    // Start streaming
    connectStream();
  </script>
</body>
</html>`;
  }
  
  stop(): void {
    this.stopWarden();
    if (this.server) {
      this.server.close();
      console.log('Server stopped');
    }
  }
}

// Main execution
async function main() {
  const interface_ = new LiveCollaborationInterface();
  
  // Set up signal handlers
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, stopping...');
    interface_.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, stopping...');
    interface_.stop();
    process.exit(0);
  });
  
  interface_.startServer();
  
  // Optionally auto-start TheWarden
  if (process.argv.includes('--auto-start')) {
    console.log('Auto-starting TheWarden...');
    interface_.startWarden();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { LiveCollaborationInterface };
