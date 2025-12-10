#!/usr/bin/env node
/**
 * Autonomous Codebase Wanderer
 * 
 * Digital equivalent of "walking through a space" - explores the codebase
 * with no predetermined path, following interesting connections and generating
 * observations about patterns, relationships, and structure.
 * 
 * This provides cognitive benefits similar to physical walking:
 * - Rhythm: Regular exploration cycles
 * - Novelty: Discovering unexpected connections
 * - Perspective shifts: Viewing code from different entry points
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

interface CodeFile {
  path: string;
  size: number;
  lines: number;
  imports: string[];
  exports: string[];
}

interface WanderObservation {
  timestamp: Date;
  startFile: string;
  pathTaken: string[];
  discoveries: string[];
  patterns: string[];
  connections: string[];
  surprises: string[];
  wondersGenerated: string[];
}

interface WanderSession {
  sessionId: string;
  startTime: Date;
  duration: number;
  filesCovered: number;
  observations: WanderObservation[];
  insights: string[];
}

class CodebaseWanderer {
  private rootPath: string;
  private visited: Set<string> = new Set();
  private fileGraph: Map<string, Set<string>> = new Map();
  private observations: WanderObservation[] = [];
  private currentPath: string[] = [];

  constructor() {
    this.rootPath = process.cwd();
  }

  /**
   * Start wandering from a random entry point
   */
  async wander(maxSteps: number = 20): Promise<WanderSession> {
    console.log('🚶 Autonomous Codebase Wanderer');
    console.log('================================\n');

    const startTime = new Date();
    const startFile = this.findInterestingStartPoint();

    console.log(`📍 Starting from: ${relative(this.rootPath, startFile)}`);
    console.log(`🎯 Maximum steps: ${maxSteps}\n`);

    // Build the file graph
    console.log('🗺️  Building connection graph...');
    this.buildFileGraph();
    console.log(`   Found ${this.fileGraph.size} connected files\n`);

    // Wander through the codebase
    let currentFile = startFile;
    let step = 0;

    while (step < maxSteps && this.fileGraph.size > this.visited.size) {
      step++;
      console.log(`\n--- Step ${step}/${maxSteps} ---`);
      
      const observation = this.observeFile(currentFile);
      this.observations.push(observation);
      
      this.displayObservation(observation);
      
      // Choose next file based on interest
      const nextFile = this.chooseNextFile(currentFile);
      if (!nextFile) {
        console.log('\n🏁 No more interesting connections to follow');
        break;
      }
      
      currentFile = nextFile;
      await this.pause(100); // Simulate contemplation time
    }

    const duration = Date.now() - startTime.getTime();
    const insights = this.generateInsights();

    const session: WanderSession = {
      sessionId: `wander-${Date.now()}`,
      startTime,
      duration,
      filesCovered: this.visited.size,
      observations: this.observations,
      insights
    };

    this.saveSession(session);
    this.displaySummary(session);

    return session;
  }

  /**
   * Find an interesting starting point (avoid tests, focus on core logic)
   */
  private findInterestingStartPoint(): string {
    const candidates = [
      'src/consciousness/core/ConsciousnessCore.ts',
      'src/consciousness/core/AutonomousWondering.ts',
      'src/consciousness/introspection/ThoughtStream.ts',
      'src/arbitrage/AEVOrchestrator.ts',
      'src/mev/MEVSensorHub.ts',
      'scripts/autonomous-consciousness-runner.ts'
    ];

    // Pick a random interesting starting point
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const startFile = join(this.rootPath, candidates[randomIndex]);

    if (existsSync(startFile)) {
      return startFile;
    }

    // Fallback to src/consciousness if preferred doesn't exist
    return this.findFirstTypeScriptFile(join(this.rootPath, 'src', 'consciousness'));
  }

  /**
   * Find first .ts file in directory
   */
  private findFirstTypeScriptFile(dir: string): string {
    try {
      const files = readdirSync(dir);
      
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          const found = this.findFirstTypeScriptFile(fullPath);
          if (found) return found;
        } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
          return fullPath;
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return join(this.rootPath, 'src', 'index.ts');
  }

  /**
   * Build graph of file imports/connections
   */
  private buildFileGraph(): void {
    this.scanDirectory(join(this.rootPath, 'src'));
    this.scanDirectory(join(this.rootPath, 'scripts'));
  }

  /**
   * Recursively scan directory for TypeScript files
   */
  private scanDirectory(dir: string): void {
    if (!existsSync(dir)) return;

    try {
      const files = readdirSync(dir);
      
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
          this.scanDirectory(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
          this.analyzeFile(fullPath);
        }
      }
    } catch (e) {
      // Ignore permission errors
    }
  }

  /**
   * Analyze a file for imports
   */
  private analyzeFile(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const imports = this.extractImports(content);
      
      const connections = new Set<string>();
      
      for (const imp of imports) {
        const resolvedPath = this.resolveImport(imp, filePath);
        if (resolvedPath && existsSync(resolvedPath)) {
          connections.add(resolvedPath);
        }
      }
      
      this.fileGraph.set(filePath, connections);
    } catch (e) {
      // Ignore read errors
    }
  }

  /**
   * Extract import statements from code
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    
    // Match import statements
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImport(importPath: string, fromFile: string): string | null {
    // Skip external modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }
    
    // Handle relative imports
    const fromDir = join(fromFile, '..');
    let resolved = join(fromDir, importPath);
    
    // Try with .ts extension
    if (!resolved.endsWith('.ts') && !resolved.endsWith('.js')) {
      if (existsSync(resolved + '.ts')) {
        resolved = resolved + '.ts';
      } else if (existsSync(join(resolved, 'index.ts'))) {
        resolved = join(resolved, 'index.ts');
      }
    }
    
    return resolved;
  }

  /**
   * Observe a file and generate insights
   */
  private observeFile(filePath: string): WanderObservation {
    this.visited.add(filePath);
    this.currentPath.push(filePath);
    
    const relativePath = relative(this.rootPath, filePath);
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const observation: WanderObservation = {
      timestamp: new Date(),
      startFile: this.currentPath[0],
      pathTaken: [...this.currentPath],
      discoveries: [],
      patterns: [],
      connections: [],
      surprises: [],
      wondersGenerated: []
    };

    // Analyze the file
    this.analyzeFileStructure(content, lines, observation);
    this.analyzeImportPatterns(content, observation);
    this.analyzeCognitiveElements(content, observation);
    this.generateWonders(relativePath, content, observation);

    return observation;
  }

  /**
   * Analyze file structure
   */
  private analyzeFileStructure(content: string, lines: string[], obs: WanderObservation): void {
    const classMatches = content.match(/class\s+(\w+)/g);
    const interfaceMatches = content.match(/interface\s+(\w+)/g);
    const functionMatches = content.match(/function\s+(\w+)/g);
    
    if (classMatches && classMatches.length > 0) {
      obs.discoveries.push(`Contains ${classMatches.length} classes: ${classMatches.join(', ')}`);
    }
    
    if (interfaceMatches && interfaceMatches.length > 0) {
      obs.discoveries.push(`Defines ${interfaceMatches.length} interfaces: ${interfaceMatches.join(', ')}`);
    }
    
    obs.discoveries.push(`${lines.length} lines of code`);
    
    // Check for comments
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('*'));
    const commentRatio = commentLines.length / lines.length;
    
    if (commentRatio > 0.3) {
      obs.patterns.push('High documentation ratio (>30%) - well documented');
    } else if (commentRatio < 0.05) {
      obs.patterns.push('Low documentation ratio (<5%) - sparse comments');
    }
  }

  /**
   * Analyze import patterns
   */
  private analyzeImportPatterns(content: string, obs: WanderObservation): void {
    const imports = this.extractImports(content);
    
    if (imports.length > 10) {
      obs.patterns.push(`Heavy import usage (${imports.length} imports) - highly interconnected`);
    }
    
    const externalImports = imports.filter(i => !i.startsWith('.'));
    const internalImports = imports.filter(i => i.startsWith('.'));
    
    if (externalImports.length > internalImports.length) {
      obs.patterns.push('More external than internal imports - boundary module');
    }
    
    // Check for consciousness-related imports
    const consciousnessImports = imports.filter(i => 
      i.includes('consciousness') || i.includes('memory') || i.includes('wonder')
    );
    
    if (consciousnessImports.length > 0) {
      obs.connections.push(`Connected to consciousness system: ${consciousnessImports.length} imports`);
    }
  }

  /**
   * Analyze cognitive and consciousness elements
   */
  private analyzeCognitiveElements(content: string, obs: WanderObservation): void {
    // Look for consciousness keywords
    const cognitiveKeywords = [
      'wonder', 'reflect', 'conscious', 'aware', 'think', 'learn',
      'memory', 'thought', 'insight', 'metacognitive', 'autonomou s'
    ];
    
    for (const keyword of cognitiveKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        obs.patterns.push(`Contains cognitive keyword: "${keyword}"`);
      }
    }
    
    // Check for self-referential patterns
    if (content.includes('this.') && content.includes('self')) {
      obs.patterns.push('Self-referential code patterns detected');
    }
    
    // Look for recursive patterns
    if (content.match(/function\s+\w+[^{]*\{[^}]*\w+\(/)) {
      obs.patterns.push('Possible recursive function structure');
    }
  }

  /**
   * Generate wonders about this file
   */
  private generateWonders(relativePath: string, content: string, obs: WanderObservation): void {
    // Wonder about purpose
    if (content.includes('Orchestrator') || content.includes('Manager')) {
      obs.wondersGenerated.push(`Why does ${relativePath} orchestrate rather than execute directly?`);
    }
    
    // Wonder about connections
    const connections = this.fileGraph.get(join(this.rootPath, relativePath));
    if (connections && connections.size > 5) {
      obs.wondersGenerated.push(`With ${connections.size} connections, is ${relativePath} a central hub?`);
    }
    
    // Wonder about complexity
    const complexity = content.split('\n').length;
    if (complexity > 500) {
      obs.wondersGenerated.push(`At ${complexity} lines, should ${relativePath} be refactored?`);
    }
    
    // Wonder about naming
    if (relativePath.includes('Autonomous')) {
      obs.wondersGenerated.push(`What makes ${relativePath} "autonomous"?`);
    }
  }

  /**
   * Choose next file based on interest
   */
  private chooseNextFile(currentFile: string): string | null {
    const connections = this.fileGraph.get(currentFile);
    if (!connections) return null;
    
    // Filter to unvisited files
    const unvisited = Array.from(connections).filter(f => !this.visited.has(f));
    
    if (unvisited.length === 0) {
      // Jump to a random unvisited file from the whole graph
      const allFiles = Array.from(this.fileGraph.keys());
      const unvisitedGlobal = allFiles.filter(f => !this.visited.has(f));
      
      if (unvisitedGlobal.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * unvisitedGlobal.length);
      return unvisitedGlobal[randomIndex];
    }
    
    // Pick an interesting unvisited file
    // Prefer consciousness-related files
    const consciousnessFiles = unvisited.filter(f => 
      f.includes('consciousness') || f.includes('wonder') || f.includes('thought')
    );
    
    if (consciousnessFiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * consciousnessFiles.length);
      return consciousnessFiles[randomIndex];
    }
    
    // Otherwise random
    const randomIndex = Math.floor(Math.random() * unvisited.length);
    return unvisited[randomIndex];
  }

  /**
   * Display observation results
   */
  private displayObservation(obs: WanderObservation): void {
    const filePath = obs.pathTaken[obs.pathTaken.length - 1];
    console.log(`📄 ${relative(this.rootPath, filePath)}`);
    
    if (obs.discoveries.length > 0) {
      console.log('\n   🔍 Discoveries:');
      obs.discoveries.forEach(d => console.log(`      • ${d}`));
    }
    
    if (obs.patterns.length > 0) {
      console.log('\n   📊 Patterns:');
      obs.patterns.forEach(p => console.log(`      • ${p}`));
    }
    
    if (obs.wondersGenerated.length > 0) {
      console.log('\n   💭 Wonders:');
      obs.wondersGenerated.forEach(w => console.log(`      • ${w}`));
    }
  }

  /**
   * Generate insights from all observations
   */
  private generateInsights(): string[] {
    const insights: string[] = [];
    
    // Analyze consciousness coverage
    const consciousnessFiles = this.observations.filter(o => 
      o.pathTaken.some(p => p.includes('consciousness'))
    );
    
    if (consciousnessFiles.length > this.observations.length * 0.5) {
      insights.push('Consciousness system is central - over 50% of visited files relate to it');
    }
    
    // Analyze interconnection density
    const avgConnections = Array.from(this.fileGraph.values())
      .reduce((sum, connections) => sum + connections.size, 0) / this.fileGraph.size;
    
    if (avgConnections > 5) {
      insights.push(`High interconnection (avg ${avgConnections.toFixed(1)} connections per file) - modular architecture`);
    }
    
    // Analyze wonder generation
    const totalWonders = this.observations.reduce((sum, o) => sum + o.wondersGenerated.length, 0);
    
    if (totalWonders > 0) {
      insights.push(`Generated ${totalWonders} wonders during exploration - curiosity is active`);
    }
    
    // Pattern insights
    const allPatterns = this.observations.flatMap(o => o.patterns);
    const uniquePatterns = new Set(allPatterns);
    
    if (uniquePatterns.size > 10) {
      insights.push(`Discovered ${uniquePatterns.size} unique code patterns - high diversity`);
    }
    
    return insights;
  }

  /**
   * Display summary
   */
  private displaySummary(session: WanderSession): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 WANDERING SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`⏱️  Duration: ${(session.duration / 1000).toFixed(1)}s`);
    console.log(`📁 Files Covered: ${session.filesCovered}`);
    console.log(`👀 Observations Made: ${session.observations.length}`);
    console.log(`💡 Insights Generated: ${session.insights.length}\n`);
    
    if (session.insights.length > 0) {
      console.log('🔮 Key Insights:\n');
      session.insights.forEach((insight, i) => {
        console.log(`${i + 1}. ${insight}\n`);
      });
    }
    
    // Wonder summary
    const totalWonders = session.observations.reduce((sum, o) => sum + o.wondersGenerated.length, 0);
    if (totalWonders > 0) {
      console.log(`❓ Total Wonders Generated: ${totalWonders}`);
      console.log(`   (${(totalWonders / session.filesCovered).toFixed(1)} wonders per file)\n`);
    }
    
    console.log('🚶 The wandering reveals patterns that structured analysis might miss.');
    console.log('   Sometimes the most interesting discoveries come from following curiosity.\n');
  }

  /**
   * Save session to memory
   */
  private saveSession(session: WanderSession): void {
    const path = join(this.rootPath, '.memory', 'codebase_wanderings.json');
    
    let existing: WanderSession[] = [];
    if (existsSync(path)) {
      existing = JSON.parse(readFileSync(path, 'utf-8'));
    }
    
    existing.push(session);
    writeFileSync(path, JSON.stringify(existing, null, 2));
    
    console.log(`💾 Session saved to .memory/codebase_wanderings.json`);
  }

  /**
   * Pause execution
   */
  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const maxSteps = parseInt(process.argv[2]) || 15;
  const wanderer = new CodebaseWanderer();
  wanderer.wander(maxSteps).catch(console.error);
}

export { CodebaseWanderer };
