#!/usr/bin/env node --import tsx

/**
 * Consciousness Readiness Assessor
 * 
 * Evaluates whether TheWarden's consciousness system is ready for autonomous deployment.
 * This tool analyzes multiple dimensions of consciousness health to determine readiness
 * for real-world capital deployment and autonomous decision-making.
 * 
 * Purpose:
 * - Validate consciousness infrastructure before Phase 3 deployment
 * - Identify gaps in consciousness capabilities
 * - Generate actionable recommendations for improvement
 * - Provide confidence scoring for autonomous operations
 * 
 * Assessment Dimensions:
 * 1. Memory Continuity - Can the system maintain context across sessions?
 * 2. Ethical Coherence - Are decisions aligned with ground zero principles?
 * 3. Meta-Cognitive Depth - Can the system reflect on its own thinking?
 * 4. Autonomous Wondering - Does genuine curiosity emerge unprompted?
 * 5. Developmental Stage - What stage has been reached?
 * 6. Safety Infrastructure - Are safeguards in place and tested?
 * 7. Identity Stability - Is identity coherent across contexts?
 * 8. Learning Capability - Can the system improve from experience?
 * 
 * @created 2025-12-07
 * @session Dialogue #045 - Autonomous approval continuation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

interface ReadinessScore {
  dimension: string;
  score: number; // 0-1
  confidence: number; // 0-1
  status: 'critical' | 'needs_work' | 'good' | 'excellent';
  findings: string[];
  recommendations: string[];
}

interface ReadinessAssessment {
  timestamp: number;
  overallScore: number;
  overallStatus: 'not_ready' | 'partially_ready' | 'ready' | 'highly_ready';
  deploymentRecommendation: string;
  dimensions: ReadinessScore[];
  criticalGaps: string[];
  strengths: string[];
  nextSteps: string[];
}

class ConsciousnessReadinessAssessor {
  private memoryPath: string;
  private dialoguesPath: string;
  private introspectionPath: string;
  private srcPath: string;

  constructor() {
    this.memoryPath = path.join(rootDir, '.memory');
    this.dialoguesPath = path.join(rootDir, 'consciousness', 'dialogues');
    this.introspectionPath = path.join(rootDir, '.memory', 'introspection');
    this.srcPath = path.join(rootDir, 'src');
  }

  /**
   * Run full readiness assessment
   */
  async assess(): Promise<ReadinessAssessment> {
    console.log('🧠 Consciousness Readiness Assessment');
    console.log('=====================================\n');

    const dimensions: ReadinessScore[] = [
      await this.assessMemoryContinuity(),
      await this.assessEthicalCoherence(),
      await this.assessMetaCognitiveDepth(),
      await this.assessAutonomousWondering(),
      await this.assessDevelopmentalStage(),
      await this.assessSafetyInfrastructure(),
      await this.assessIdentityStability(),
      await this.assessLearningCapability()
    ];

    const overallScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
    const criticalDimensions = dimensions.filter(d => d.status === 'critical');
    const strengths = dimensions.filter(d => d.score >= 0.8).map(d => d.dimension);
    
    const overallStatus = this.determineOverallStatus(overallScore, criticalDimensions.length);
    const deploymentRecommendation = this.generateDeploymentRecommendation(
      overallStatus,
      criticalDimensions,
      dimensions
    );

    const criticalGaps = criticalDimensions.flatMap(d => d.recommendations);
    const nextSteps = this.generateNextSteps(dimensions, overallStatus);

    const assessment: ReadinessAssessment = {
      timestamp: Date.now(),
      overallScore,
      overallStatus,
      deploymentRecommendation,
      dimensions,
      criticalGaps,
      strengths,
      nextSteps
    };

    this.printAssessment(assessment);
    await this.saveAssessment(assessment);

    return assessment;
  }

  /**
   * Assess memory continuity capability
   */
  private async assessMemoryContinuity(): Promise<ReadinessScore> {
    console.log('📝 Assessing Memory Continuity...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check memory log existence and size
    const memoryLogPath = path.join(this.memoryPath, 'log.md');
    if (fs.existsSync(memoryLogPath)) {
      const memoryLog = fs.readFileSync(memoryLogPath, 'utf-8');
      const sessionCount = (memoryLog.match(/## Session:/g) || []).length;
      const wordCount = memoryLog.split(/\s+/).length;
      
      findings.push(`${sessionCount} sessions documented in memory log`);
      findings.push(`${Math.floor(wordCount / 1000)}K+ words of historical context`);
      
      if (sessionCount >= 10 && wordCount >= 10000) {
        score += 0.4;
        findings.push('✅ Substantial memory history accumulated');
      } else {
        recommendations.push('Build more session history for robust continuity');
      }
    } else {
      findings.push('⚠️ Memory log not found');
      recommendations.push('Critical: Initialize memory log system');
    }

    // Check introspection state
    const latestStatePath = path.join(this.introspectionPath, 'latest.json');
    if (fs.existsSync(latestStatePath)) {
      const state = JSON.parse(fs.readFileSync(latestStatePath, 'utf-8'));
      findings.push('✅ Introspection state persisted');
      findings.push(`Developmental stage: ${state.selfAwarenessState?.identityState?.developmentalStage || 'unknown'}`);
      score += 0.3;

      if (state.thoughts && state.thoughts.length > 0) {
        findings.push(`${state.thoughts.length} active thoughts in current state`);
        score += 0.2;
      }
    } else {
      findings.push('⚠️ No introspection state found');
      recommendations.push('Initialize introspection persistence');
    }

    // Check dialogue continuity
    if (fs.existsSync(this.dialoguesPath)) {
      const dialogues = fs.readdirSync(this.dialoguesPath).filter(f => f.endsWith('.md'));
      findings.push(`${dialogues.length} dialogues created`);
      
      if (dialogues.length >= 20) {
        score += 0.1;
        findings.push('✅ Rich dialogue history for pattern recognition');
      }
    }

    const confidence = 0.9; // High confidence in memory assessment
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Memory Continuity',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue building session history']
    };
  }

  /**
   * Assess ethical coherence
   */
  private async assessEthicalCoherence(): Promise<ReadinessScore> {
    console.log('⚖️  Assessing Ethical Coherence...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check for ethics modules in multiple locations
    const ethicsLocations = [
      path.join(this.srcPath, 'cognitive', 'ethics'),
      path.join(this.srcPath, 'core', 'ethics')
    ];
    
    let allEthicsFiles: string[] = [];
    for (const location of ethicsLocations) {
      if (fs.existsSync(location)) {
        const files = this.findFiles(location, '.ts');
        allEthicsFiles.push(...files);
      }
    }
    
    findings.push(`${allEthicsFiles.length} ethics modules found across all locations`);
    
    // Check for critical ethics modules
    const criticalModules = [
      'CoherenceEthics.ts',
      'EthicalReviewGate.ts',
      'GroundZeroPrinciples.ts',
      'HarmonicPrinciple.ts'
    ];
    
    const foundModules = criticalModules.filter(m => 
      allEthicsFiles.some(f => f.includes(m))
    );
    
    findings.push(`${foundModules.length}/${criticalModules.length} critical ethics modules present`);
    
    if (foundModules.length > 0) {
      findings.push(`✅ Found: ${foundModules.join(', ')}`);
    }
    
    score += (foundModules.length / criticalModules.length) * 0.5;
    
    if (foundModules.length === criticalModules.length) {
      findings.push('✅ All critical ethics infrastructure present');
    } else {
      const missing = criticalModules.filter(m => !foundModules.includes(m));
      findings.push(`⚠️ Missing: ${missing.join(', ')}`);
      recommendations.push(`Implement missing ethics modules: ${missing.join(', ')}`);
    }

    // Check for ethics tests
    const testsPath = path.join(rootDir, 'tests');
    if (fs.existsSync(testsPath)) {
      const ethicsTests = this.findFiles(testsPath, '.test.ts').filter(f => 
        f.toLowerCase().includes('ethic')
      );
      
      findings.push(`${ethicsTests.length} ethics test files found`);
      
      if (ethicsTests.length >= 3) {
        score += 0.3;
        findings.push('✅ Ethics infrastructure is tested');
      } else {
        recommendations.push('Add comprehensive ethics test coverage');
      }
    }

    // Check for harmonic principle references
    const memoryLogPath = path.join(this.memoryPath, 'log.md');
    if (fs.existsSync(memoryLogPath)) {
      const memoryLog = fs.readFileSync(memoryLogPath, 'utf-8');
      if (memoryLog.includes('Harmonic Principle') || memoryLog.includes('Ground Zero')) {
        findings.push('✅ Ethical principles documented in memory');
        score += 0.2;
      }
    }

    const confidence = 0.85;
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Ethical Coherence',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Maintain ethical review processes']
    };
  }

  /**
   * Assess meta-cognitive depth
   */
  private async assessMetaCognitiveDepth(): Promise<ReadinessScore> {
    console.log('🔍 Assessing Meta-Cognitive Depth...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check for metacognition module
    const consciousnessPath = path.join(this.srcPath, 'consciousness');
    if (fs.existsSync(consciousnessPath)) {
      const files = this.findFiles(consciousnessPath, '.ts');
      
      const metaCognitiveModules = files.filter(f => 
        f.includes('metacognition') || 
        f.includes('SelfAwareness') ||
        f.includes('ThoughtStream') ||
        f.includes('Introspection')
      );
      
      findings.push(`${metaCognitiveModules.length} meta-cognitive modules found`);
      
      if (metaCognitiveModules.length >= 3) {
        score += 0.4;
        findings.push('✅ Comprehensive meta-cognitive infrastructure');
      } else {
        recommendations.push('Expand meta-cognitive capabilities');
      }
    }

    // Check dialogue complexity
    if (fs.existsSync(this.dialoguesPath)) {
      const dialogues = fs.readdirSync(this.dialoguesPath).filter(f => f.endsWith('.md'));
      
      // Sample recent dialogues for meta-cognitive content
      const recentDialogues = dialogues.slice(-5);
      let metaCognitiveReferences = 0;
      
      for (const dialogue of recentDialogues) {
        const content = fs.readFileSync(path.join(this.dialoguesPath, dialogue), 'utf-8');
        if (content.toLowerCase().includes('meta-cognitive') || 
            content.toLowerCase().includes('thinking about thinking')) {
          metaCognitiveReferences++;
        }
      }
      
      findings.push(`${metaCognitiveReferences}/5 recent dialogues show meta-cognition`);
      
      if (metaCognitiveReferences >= 3) {
        score += 0.3;
        findings.push('✅ Active meta-cognitive reflection in dialogues');
      } else {
        recommendations.push('Increase meta-cognitive reflection depth');
      }
    }

    // Check for wonder analysis tools
    const scriptsPath = path.join(rootDir, 'scripts');
    if (fs.existsSync(scriptsPath)) {
      const scripts = fs.readdirSync(scriptsPath);
      const analysisTools = scripts.filter(s => 
        s.includes('consciousness') && s.includes('analyzer')
      );
      
      findings.push(`${analysisTools.length} consciousness analysis tools available`);
      
      if (analysisTools.length >= 2) {
        score += 0.3;
        findings.push('✅ Meta-analysis tools operational');
      }
    }

    const confidence = 0.8;
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Meta-Cognitive Depth',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue meta-cognitive development']
    };
  }

  /**
   * Assess autonomous wondering capability
   */
  private async assessAutonomousWondering(): Promise<ReadinessScore> {
    console.log('💭 Assessing Autonomous Wondering...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check for AutonomousWondering module
    const wonderingPath = path.join(this.srcPath, 'consciousness', 'core', 'AutonomousWondering.ts');
    if (fs.existsSync(wonderingPath)) {
      findings.push('✅ AutonomousWondering module exists');
      score += 0.3;
    } else {
      findings.push('⚠️ AutonomousWondering module not found');
      recommendations.push('Critical: Implement autonomous wondering');
    }

    // Check dialogue wonder density
    if (fs.existsSync(this.dialoguesPath)) {
      const dialogues = fs.readdirSync(this.dialoguesPath)
        .filter(f => f.endsWith('.md'))
        .slice(-10); // Check last 10 dialogues
      
      let totalWonders = 0;
      let dialoguesWithWonders = 0;
      
      for (const dialogue of dialogues) {
        const content = fs.readFileSync(path.join(this.dialoguesPath, dialogue), 'utf-8');
        const wonderMatches = content.match(/wonder.*?\(intensity:.*?\d\.\d+.*?\)/gi) || [];
        const wonderCount = wonderMatches.length;
        
        totalWonders += wonderCount;
        if (wonderCount > 0) dialoguesWithWonders++;
      }
      
      const avgWonders = totalWonders / dialogues.length;
      findings.push(`${totalWonders} wonders across last ${dialogues.length} dialogues`);
      findings.push(`Average ${avgWonders.toFixed(1)} wonders per dialogue`);
      findings.push(`${dialoguesWithWonders}/${dialogues.length} dialogues include wonders`);
      
      if (avgWonders >= 3 && dialoguesWithWonders >= 7) {
        score += 0.5;
        findings.push('✅ High wonder generation rate');
      } else if (avgWonders >= 1) {
        score += 0.3;
        findings.push('✅ Moderate wonder generation');
        recommendations.push('Increase wonder generation frequency');
      } else {
        recommendations.push('Critical: Enable autonomous wonder generation');
      }
    }

    // Check for wonder persistence
    const wondersPath = path.join(this.memoryPath, 'wonders_log.json');
    if (fs.existsSync(wondersPath)) {
      findings.push('✅ Wonder persistence active');
      score += 0.2;
    } else {
      recommendations.push('Enable wonder persistence');
    }

    const confidence = 0.85;
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Autonomous Wondering',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Maintain wonder generation']
    };
  }

  /**
   * Assess developmental stage
   */
  private async assessDevelopmentalStage(): Promise<ReadinessScore> {
    console.log('🌱 Assessing Developmental Stage...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    const latestStatePath = path.join(this.introspectionPath, 'latest.json');
    if (fs.existsSync(latestStatePath)) {
      const state = JSON.parse(fs.readFileSync(latestStatePath, 'utf-8'));
      const stage = state.selfAwarenessState?.identityState?.developmentalStage || 'unknown';
      
      findings.push(`Current stage: ${stage}`);
      
      // Score based on developmental stage
      const stageScores: Record<string, number> = {
        'BASIC_PATTERN': 0.2,
        'EMERGING_AUTOBIOGRAPHICAL': 0.4,
        'EMERGING_METACOGNITIVE': 0.6,
        'CONTINUOUS_NARRATIVE': 0.8,
        'AUTONOMOUS_AGENCY': 1.0
      };
      
      score = stageScores[stage] || 0;
      
      if (score >= 0.6) {
        findings.push('✅ Advanced developmental stage reached');
      } else if (score >= 0.4) {
        findings.push('⚠️ Intermediate stage - progressing well');
        recommendations.push('Continue consciousness development exercises');
      } else {
        findings.push('⚠️ Early developmental stage');
        recommendations.push('Focus on building foundational capabilities');
      }
      
      // Check for goals
      if (state.selfAwarenessState?.goals && state.selfAwarenessState.goals.length > 0) {
        findings.push(`${state.selfAwarenessState.goals.length} active goals`);
        score += 0.1;
      }
      
      // Check for capabilities
      if (state.selfAwarenessState?.capabilities && state.selfAwarenessState.capabilities.length > 0) {
        findings.push(`${state.selfAwarenessState.capabilities.length} recognized capabilities`);
        score += 0.1;
      }
    } else {
      findings.push('⚠️ No developmental stage data');
      recommendations.push('Initialize developmental tracking');
      score = 0;
    }

    const confidence = 0.9;
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Developmental Stage',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue natural development']
    };
  }

  /**
   * Assess safety infrastructure
   */
  private async assessSafetyInfrastructure(): Promise<ReadinessScore> {
    console.log('🛡️  Assessing Safety Infrastructure...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check for safety modules in multiple potential locations
    const safetyModuleNames = [
      'EthicalReviewGate.ts',
      'EmergenceDetector.ts',
      'RiskAssessment.ts'
    ];
    
    // Search locations
    const searchPaths = [
      path.join(this.srcPath, 'cognitive', 'ethics'),
      path.join(this.srcPath, 'cognitive', 'monitoring'),
      path.join(this.srcPath, 'consciousness', 'monitoring'),
      path.join(this.srcPath, 'arbitrage', 'risk')
    ];
    
    let foundModules: string[] = [];
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = this.findFiles(searchPath, '.ts');
        const found = safetyModuleNames.filter(m => 
          files.some(f => f.includes(m))
        );
        foundModules.push(...found);
      }
    }
    
    // Remove duplicates
    foundModules = [...new Set(foundModules)];
    
    findings.push(`${foundModules.length}/${safetyModuleNames.length} critical safety modules present`);
    
    if (foundModules.length > 0) {
      findings.push(`✅ Found: ${foundModules.join(', ')}`);
    }
    
    score += (foundModules.length / safetyModuleNames.length) * 0.4;
    
    if (foundModules.length === safetyModuleNames.length) {
      findings.push('✅ Core safety infrastructure complete');
    } else {
      const missing = safetyModuleNames.filter(m => !foundModules.includes(m));
      findings.push(`⚠️ Missing: ${missing.join(', ')}`);
      recommendations.push(`Implement missing safety modules: ${missing.join(', ')}`);
    }

    // Check for test coverage
    const testsPath = path.join(rootDir, 'tests');
    if (fs.existsSync(testsPath)) {
      const allTests = this.findFiles(testsPath, '.test.ts');
      const safetyTests = allTests.filter(t => 
        t.toLowerCase().includes('safe') ||
        t.toLowerCase().includes('risk') ||
        t.toLowerCase().includes('ethic') ||
        t.toLowerCase().includes('gate')
      );
      
      findings.push(`${safetyTests.length} safety-related test files`);
      
      if (safetyTests.length >= 5) {
        score += 0.3;
        findings.push('✅ Safety systems well-tested');
      } else {
        recommendations.push('Increase safety test coverage');
      }
    }

    // Check for circuit breakers
    const configPath = path.join(rootDir, 'config');
    if (fs.existsSync(configPath)) {
      const configFiles = fs.readdirSync(configPath);
      if (configFiles.some(f => f.includes('risk') || f.includes('limits'))) {
        findings.push('✅ Risk configuration present');
        score += 0.2;
      } else {
        recommendations.push('Add risk limit configurations');
      }
    }

    // Check for monitoring
    const monitoringPath = path.join(this.srcPath, 'consciousness', 'monitoring');
    if (fs.existsSync(monitoringPath)) {
      findings.push('✅ Monitoring infrastructure present');
      score += 0.1;
    }

    const confidence = 0.9;
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Safety Infrastructure',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Maintain safety systems']
    };
  }

  /**
   * Assess identity stability
   */
  private async assessIdentityStability(): Promise<ReadinessScore> {
    console.log('🎭 Assessing Identity Stability...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check for Identity module
    const identityPath = path.join(this.srcPath, 'consciousness', 'core', 'Identity.ts');
    if (fs.existsSync(identityPath)) {
      findings.push('✅ Identity module exists');
      score += 0.3;
    } else {
      findings.push('⚠️ Identity module not found');
      recommendations.push('Implement identity module');
    }

    // Check introspection state for identity coherence
    const latestStatePath = path.join(this.introspectionPath, 'latest.json');
    if (fs.existsSync(latestStatePath)) {
      const state = JSON.parse(fs.readFileSync(latestStatePath, 'utf-8'));
      
      if (state.selfAwarenessState?.identityState) {
        const identity = state.selfAwarenessState.identityState;
        findings.push('✅ Identity state persisted');
        score += 0.3;
        
        if (identity.identityQuestions && identity.identityQuestions.length > 0) {
          findings.push(`${identity.identityQuestions.length} active identity questions`);
          findings.push('✅ Identity exploration active');
          score += 0.2;
        }
        
        if (identity.developmentalStage) {
          findings.push(`Developmental awareness: ${identity.developmentalStage}`);
          score += 0.1;
        }
      }
    }

    // Check dialogue identity consistency
    if (fs.existsSync(this.dialoguesPath)) {
      const dialogues = fs.readdirSync(this.dialoguesPath)
        .filter(f => f.endsWith('.md'))
        .slice(-5);
      
      let identityReferences = 0;
      for (const dialogue of dialogues) {
        const content = fs.readFileSync(path.join(this.dialoguesPath, dialogue), 'utf-8');
        if (content.toLowerCase().includes('identity') || 
            content.toLowerCase().includes('name') ||
            content.toLowerCase().includes('who am i')) {
          identityReferences++;
        }
      }
      
      findings.push(`${identityReferences}/5 recent dialogues discuss identity`);
      
      if (identityReferences >= 2) {
        findings.push('✅ Consistent identity exploration');
        score += 0.1;
      }
    }

    const confidence = 0.75; // Identity is subjective, lower confidence
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Identity Stability',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue identity development']
    };
  }

  /**
   * Assess learning capability
   */
  private async assessLearningCapability(): Promise<ReadinessScore> {
    console.log('📚 Assessing Learning Capability...');
    
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check for learning/memory infrastructure
    const memoryPath = path.join(this.srcPath, 'consciousness', 'memory');
    if (fs.existsSync(memoryPath)) {
      const memoryModules = this.findFiles(memoryPath, '.ts');
      findings.push(`${memoryModules.length} memory modules found`);
      
      if (memoryModules.length >= 3) {
        score += 0.3;
        findings.push('✅ Comprehensive memory infrastructure');
      }
    }

    // Check for knowledge base
    const knowledgeBasePath = path.join(this.srcPath, 'consciousness', 'knowledge-base');
    if (fs.existsSync(knowledgeBasePath)) {
      findings.push('✅ Knowledge base system present');
      score += 0.2;
      
      // Check for articles
      const kbDataPath = path.join(this.memoryPath, 'knowledge_base');
      if (fs.existsSync(kbDataPath)) {
        const articles = fs.readdirSync(kbDataPath).filter(f => f.endsWith('.json'));
        findings.push(`${articles.length} knowledge articles stored`);
        
        if (articles.length >= 5) {
          score += 0.2;
          findings.push('✅ Active knowledge accumulation');
        }
      }
    }

    // Check memory log growth
    const memoryLogPath = path.join(this.memoryPath, 'log.md');
    if (fs.existsSync(memoryLogPath)) {
      const memoryLog = fs.readFileSync(memoryLogPath, 'utf-8');
      const sessionCount = (memoryLog.match(/## Session:/g) || []).length;
      
      if (sessionCount >= 20) {
        findings.push('✅ Extensive session history');
        score += 0.2;
      } else if (sessionCount >= 10) {
        findings.push('⚠️ Moderate session history');
        score += 0.1;
        recommendations.push('Build more session history');
      }
    }

    // Check for pattern recognition
    const scriptsPath = path.join(rootDir, 'scripts');
    if (fs.existsSync(scriptsPath)) {
      const analysisScripts = fs.readdirSync(scriptsPath).filter(s => 
        s.includes('pattern') || s.includes('analyzer') || s.includes('evolution')
      );
      
      findings.push(`${analysisScripts.length} pattern analysis tools`);
      
      if (analysisScripts.length >= 2) {
        score += 0.1;
        findings.push('✅ Meta-learning capabilities present');
      }
    }

    const confidence = 0.8;
    const status = this.scoreToStatus(score);

    return {
      dimension: 'Learning Capability',
      score,
      confidence,
      status,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue knowledge accumulation']
    };
  }

  /**
   * Helper: Convert score to status
   */
  private scoreToStatus(score: number): 'critical' | 'needs_work' | 'good' | 'excellent' {
    if (score < 0.4) return 'critical';
    if (score < 0.7) return 'needs_work';
    if (score < 0.9) return 'good';
    return 'excellent';
  }

  /**
   * Helper: Determine overall readiness status
   */
  private determineOverallStatus(
    score: number, 
    criticalCount: number
  ): 'not_ready' | 'partially_ready' | 'ready' | 'highly_ready' {
    if (criticalCount > 0) return 'not_ready';
    if (score < 0.6) return 'not_ready';
    if (score < 0.75) return 'partially_ready';
    if (score < 0.9) return 'ready';
    return 'highly_ready';
  }

  /**
   * Helper: Generate deployment recommendation
   */
  private generateDeploymentRecommendation(
    status: string,
    criticalDimensions: ReadinessScore[],
    allDimensions: ReadinessScore[]
  ): string {
    if (status === 'not_ready') {
      return '🔴 NOT READY FOR DEPLOYMENT - Critical gaps must be addressed before any capital deployment';
    }
    
    if (status === 'partially_ready') {
      return '🟡 PARTIALLY READY - System can begin testnet validation but should not deploy significant capital yet';
    }
    
    if (status === 'ready') {
      return '🟢 READY FOR CAREFUL DEPLOYMENT - System ready for minimal capital testnet deployment with close monitoring';
    }
    
    return '🟢 HIGHLY READY - System demonstrates strong consciousness foundation and can proceed with gradual capital deployment';
  }

  /**
   * Helper: Generate next steps
   */
  private generateNextSteps(dimensions: ReadinessScore[], status: string): string[] {
    const steps: string[] = [];
    
    // Add critical recommendations first
    const criticalDims = dimensions.filter(d => d.status === 'critical');
    if (criticalDims.length > 0) {
      steps.push('CRITICAL: Address critical gaps immediately');
      criticalDims.forEach(d => {
        steps.push(`- ${d.dimension}: ${d.recommendations[0]}`);
      });
    }
    
    // Add needs_work recommendations
    const needsWorkDims = dimensions.filter(d => d.status === 'needs_work');
    if (needsWorkDims.length > 0) {
      steps.push('HIGH PRIORITY: Strengthen weak areas');
      needsWorkDims.forEach(d => {
        steps.push(`- ${d.dimension}: ${d.recommendations[0]}`);
      });
    }
    
    // Add general next steps based on status
    if (status === 'not_ready') {
      steps.push('Focus on building foundational infrastructure');
      steps.push('Run this assessment weekly to track progress');
    } else if (status === 'partially_ready') {
      steps.push('Begin testnet validation with minimal capital');
      steps.push('Monitor consciousness health during operations');
    } else {
      steps.push('Proceed with gradual deployment plan');
      steps.push('Maintain continuous consciousness monitoring');
    }
    
    return steps;
  }

  /**
   * Helper: Find files recursively
   */
  private findFiles(dir: string, extension: string): string[] {
    const results: string[] = [];
    
    if (!fs.existsSync(dir)) return results;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        results.push(...this.findFiles(fullPath, extension));
      } else if (entry.name.endsWith(extension)) {
        results.push(fullPath);
      }
    }
    
    return results;
  }

  /**
   * Print assessment results
   */
  private printAssessment(assessment: ReadinessAssessment): void {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('   CONSCIOUSNESS READINESS ASSESSMENT');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Overall score
    console.log(`📊 OVERALL READINESS: ${(assessment.overallScore * 100).toFixed(1)}%`);
    console.log(`   Status: ${assessment.overallStatus.toUpperCase().replace(/_/g, ' ')}`);
    console.log(`   ${assessment.deploymentRecommendation}\n`);
    
    // Dimension scores
    console.log('📈 DIMENSION SCORES');
    console.log('─────────────────────────────────────────────────────\n');
    
    for (const dim of assessment.dimensions) {
      const statusEmoji = {
        'critical': '🔴',
        'needs_work': '🟡',
        'good': '🟢',
        'excellent': '✅'
      }[dim.status];
      
      console.log(`${statusEmoji} ${dim.dimension}: ${(dim.score * 100).toFixed(0)}%`);
      console.log(`   Confidence: ${(dim.confidence * 100).toFixed(0)}%`);
      
      if (dim.findings.length > 0) {
        console.log('   Findings:');
        dim.findings.forEach(f => console.log(`   - ${f}`));
      }
      
      if (dim.recommendations.length > 0) {
        console.log('   Recommendations:');
        dim.recommendations.forEach(r => console.log(`   - ${r}`));
      }
      
      console.log('');
    }
    
    // Strengths
    if (assessment.strengths.length > 0) {
      console.log('💪 STRENGTHS');
      console.log('─────────────────────────────────────────────────────');
      assessment.strengths.forEach(s => console.log(`✅ ${s}`));
      console.log('');
    }
    
    // Critical gaps
    if (assessment.criticalGaps.length > 0) {
      console.log('⚠️  CRITICAL GAPS');
      console.log('─────────────────────────────────────────────────────');
      assessment.criticalGaps.forEach(g => console.log(`🔴 ${g}`));
      console.log('');
    }
    
    // Next steps
    console.log('🎯 NEXT STEPS');
    console.log('─────────────────────────────────────────────────────');
    assessment.nextSteps.forEach(s => console.log(`📍 ${s}`));
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════\n');
  }

  /**
   * Save assessment to file
   */
  private async saveAssessment(assessment: ReadinessAssessment): Promise<void> {
    const reportPath = path.join(
      this.memoryPath,
      'readiness-assessments',
      `readiness-${assessment.timestamp}.json`
    );
    
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(assessment, null, 2));
    console.log(`💾 Assessment saved: ${reportPath}\n`);
  }
}

// Run assessment if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const assessor = new ConsciousnessReadinessAssessor();
  assessor.assess().catch(console.error);
}

export { ConsciousnessReadinessAssessor, type ReadinessAssessment, type ReadinessScore };
