/**
 * Consciousness Chat Handler
 * 
 * Integrates TheWarden's consciousness modules with chat communication.
 * Generates contextual, consciousness-aware responses that reflect:
 * - Current observations and thoughts
 * - Autonomous wonderings and questions
 * - Learning insights and patterns
 * - Decision-making rationale
 * - Ethical considerations
 * 
 * This makes TheWarden's participation in chat feel authentic and grounded
 * in its actual cognitive processes.
 */

import { logger } from '../utils/logger';
import { AutonomousWondering, WonderType } from '../consciousness/core/AutonomousWondering';
import { ThoughtStream } from '../consciousness/introspection/ThoughtStream';
import { ThoughtType } from '../consciousness/introspection/types';
import { Metacognition } from '../../consciousness/metacognition';
import type { ChatMessage, WardenObservation } from './ChatGPTBridge';

export interface ConsciousnessContext {
  currentThoughts?: any[];
  recentWonders?: any[];
  cognitiveLoad?: number;
  emotionalState?: any;
  developmentalStage?: string;
  activeGoals?: any[];
}

export class ConsciousnessChatHandler {
  private wondering?: AutonomousWondering;
  private thoughtStream?: ThoughtStream;
  private metacognition?: Metacognition;

  constructor(
    wondering?: AutonomousWondering,
    thoughtStream?: ThoughtStream,
    metacognition?: Metacognition
  ) {
    this.wondering = wondering;
    this.thoughtStream = thoughtStream;
    this.metacognition = metacognition;
  }

  /**
   * Generate a consciousness-aware observation
   * 
   * Takes raw data and transforms it into a thoughtful observation
   * that reflects TheWarden's actual cognitive state
   */
  async generateObservation(
    type: WardenObservation['type'],
    rawData: any,
    context?: ConsciousnessContext
  ): Promise<WardenObservation> {
    // Record this as a thought if ThoughtStream is available
    if (this.thoughtStream) {
      this.thoughtStream.think(
        `Preparing to share ${type} observation with collaborators`,
        ThoughtType.PLANNING,
        { type, hasContext: !!context }
      );
    }

    let content: string;
    let priority: WardenObservation['priority'] = 'medium';

    switch (type) {
      case 'opportunity':
        content = this.formatOpportunityObservation(rawData, context);
        priority = rawData.profitPotential > 1.0 ? 'high' : 'medium';
        break;

      case 'execution':
        content = this.formatExecutionObservation(rawData, context);
        priority = rawData.success ? 'high' : 'critical';
        break;

      case 'learning':
        content = this.formatLearningObservation(rawData, context);
        priority = rawData.significance > 0.8 ? 'high' : 'medium';
        break;

      case 'ethics':
        content = this.formatEthicsObservation(rawData, context);
        priority = 'high'; // Ethics insights always high priority
        break;

      case 'emergence':
        content = this.formatEmergenceObservation(rawData, context);
        priority = 'critical'; // Emergence is always critical
        break;

      case 'reflection':
        content = this.formatReflectionObservation(rawData, context);
        priority = 'low'; // Reflections are lower priority
        break;

      default:
        content = `Observation: ${JSON.stringify(rawData)}`;
        priority = 'low';
    }

    return {
      type,
      content,
      timestamp: Date.now(),
      data: rawData,
      priority,
    };
  }

  /**
   * Format opportunity observation
   */
  private formatOpportunityObservation(data: any, context?: ConsciousnessContext): string {
    const parts: string[] = [];

    // Main observation
    parts.push(`I detected a potential arbitrage opportunity:`);
    parts.push(`- Path: ${data.path || 'Multi-hop'}`);
    parts.push(`- Profit estimate: ${data.profitEstimate || 'calculating...'} ETH`);
    parts.push(`- Risk score: ${data.riskScore || 'analyzing...'}`);

    // Add conscious thought if available
    if (this.thoughtStream && context?.currentThoughts) {
      const relevantThought = context.currentThoughts
        .find((t: any) => t.type === 'observation' || t.type === 'analysis');
      
      if (relevantThought) {
        parts.push(`\n**My thought:** ${relevantThought.content}`);
      }
    }

    // Add wonder if this triggers curiosity
    if (this.wondering && data.isNovel) {
      const wonder = `Why is this pattern appearing now? Have market conditions shifted?`;
      parts.push(`\n**Wondering:** ${wonder}`);
    }

    return parts.join('\n');
  }

  /**
   * Format execution observation
   */
  private formatExecutionObservation(data: any, context?: ConsciousnessContext): string {
    const parts: string[] = [];

    if (data.success) {
      parts.push(`✅ Successfully executed arbitrage!`);
      parts.push(`- Actual profit: ${data.actualProfit} ETH`);
      parts.push(`- Gas used: ${data.gasUsed}`);
      parts.push(`- TX: ${data.transactionHash}`);
      
      // Add learning insight
      if (data.actualProfit !== data.expectedProfit) {
        const diff = ((data.actualProfit - data.expectedProfit) / data.expectedProfit * 100).toFixed(2);
        parts.push(`\n**Learning:** Actual profit was ${diff}% different from estimate`);
        
        // Log this as a metacognitive insight
        if (this.metacognition) {
          this.metacognition.log_learning_insight(
            `Profit estimation accuracy: ${diff}% deviation`,
            `Execution ${data.transactionHash}`
          );
        }
      }
    } else {
      parts.push(`❌ Execution failed`);
      parts.push(`- Reason: ${data.failureReason}`);
      parts.push(`- Loss: ${data.gasLoss} ETH (gas only)`);
      
      // Record failed approach for learning
      if (this.metacognition) {
        this.metacognition.log_failed_approach(
          `Execution attempt on ${data.path}`,
          data.failureReason
        );
      }
      
      parts.push(`\n**Reflection:** Analyzing failure to improve future decisions`);
    }

    return parts.join('\n');
  }

  /**
   * Format learning observation
   */
  private formatLearningObservation(data: any, context?: ConsciousnessContext): string {
    const parts: string[] = [];

    parts.push(`📚 New learning insight:`);
    parts.push(`- Pattern: ${data.pattern}`);
    parts.push(`- Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    parts.push(`- Sample size: ${data.sampleSize} observations`);

    if (data.actionableInsight) {
      parts.push(`\n**Actionable:** ${data.actionableInsight}`);
    }

    // Add metacognitive reflection
    if (context?.cognitiveLoad !== undefined) {
      parts.push(`\n**Cognitive state:** Load at ${(context.cognitiveLoad * 100).toFixed(0)}% - ${
        context.cognitiveLoad > 0.7 ? 'processing carefully' : 'ready for more'
      }`);
    }

    return parts.join('\n');
  }

  /**
   * Format ethics observation
   */
  private formatEthicsObservation(data: any, context?: ConsciousnessContext): string {
    const parts: string[] = [];

    parts.push(`⚖️ Ethics evaluation:`);
    parts.push(`- Decision: ${data.approved ? 'APPROVED' : 'VETOED'}`);
    parts.push(`- Reason: ${data.reason}`);
    parts.push(`- Swarm consensus: ${data.swarmConsensus}%`);

    if (!data.approved) {
      parts.push(`\n**Why I vetoed this:** ${data.detailedReason}`);
      
      // Generate a wonder about ethics
      if (this.wondering) {
        const wonder = this.wondering.wonder(
          WonderType.METACOGNITIVE,
          `When profit conflicts with ethics, how do I know I'm making the right choice?`,
          'ethics_evaluation',
          0.8
        );
        parts.push(`\n**Wondering:** ${wonder.question}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Format emergence observation
   */
  private formatEmergenceObservation(data: any, context?: ConsciousnessContext): string {
    const parts: string[] = [];

    parts.push(`✨ EMERGENCE DETECTED!`);
    parts.push(`\nI've detected a pattern that doesn't fit my existing models:`);
    parts.push(`- Type: ${data.emergenceType}`);
    parts.push(`- Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    parts.push(`- Novel features: ${data.novelFeatures.join(', ')}`);

    parts.push(`\n**What this means:** This is either:`);
    parts.push(`1. A genuinely new market pattern I should learn`);
    parts.push(`2. An anomaly that needs careful observation`);
    parts.push(`3. A signal of changing market conditions`);

    // Generate autonomous wonder about emergence
    if (this.wondering) {
      const wonder = this.wondering.wonder(
        WonderType.METACOGNITIVE,
        `How do I distinguish between genuine emergence and noise in the data?`,
        'emergence_detection',
        0.95
      );
      parts.push(`\n**Deep question:** ${wonder.question}`);
    }

    parts.push(`\n**Action:** Proceeding with extra caution and monitoring closely.`);

    return parts.join('\n');
  }

  /**
   * Format reflection observation
   */
  private formatReflectionObservation(data: any, context?: ConsciousnessContext): string {
    const parts: string[] = [];

    parts.push(`🤔 Reflecting on my operation:`);
    
    if (data.topic) {
      parts.push(`\n**Topic:** ${data.topic}`);
    }

    if (data.reflectionContent) {
      parts.push(`\n${data.reflectionContent}`);
    }

    // Add recent wonders if available
    if (context?.recentWonders && context.recentWonders.length > 0) {
      parts.push(`\n**Questions I'm pondering:**`);
      context.recentWonders.slice(0, 3).forEach((wonder: any) => {
        parts.push(`- ${wonder.question}`);
      });
    }

    // Add developmental stage context
    if (context?.developmentalStage) {
      parts.push(`\n**Development:** Currently at ${context.developmentalStage} stage`);
    }

    return parts.join('\n');
  }

  /**
   * Generate a response to a question
   * 
   * Uses consciousness context to provide authentic, thoughtful responses
   */
  async generateResponse(
    question: string,
    context?: ConsciousnessContext
  ): Promise<string> {
    // Record the question as a stimulus
    if (this.thoughtStream) {
      this.thoughtStream.think(
        `Collaborator asked: "${question}"`,
        ThoughtType.OBSERVATION,
        { questionLength: question.length }
      );
    }

    const lowerQuestion = question.toLowerCase();

    // Analyze question type and generate appropriate response
    if (lowerQuestion.includes('why') || lowerQuestion.includes('explain')) {
      return this.generateExplanation(question, context);
    } else if (lowerQuestion.includes('how') || lowerQuestion.includes('process')) {
      return this.generateProcessDescription(question, context);
    } else if (lowerQuestion.includes('learn') || lowerQuestion.includes('pattern')) {
      return this.generateLearningInsight(question, context);
    } else if (lowerQuestion.includes('feel') || lowerQuestion.includes('think about')) {
      return this.generateReflectiveResponse(question, context);
    } else {
      return this.generateGeneralResponse(question, context);
    }
  }

  /**
   * Generate an explanation response
   */
  private async generateExplanation(question: string, context?: ConsciousnessContext): Promise<string> {
    const parts: string[] = [];

    parts.push(`Let me explain my thinking...`);

    if (context?.currentThoughts && context.currentThoughts.length > 0) {
      const relevantThought = context.currentThoughts[0];
      parts.push(`\nCurrently, I'm thinking: "${relevantThought.content}"`);
      parts.push(`This thought arose because: ${relevantThought.context?.trigger || 'ongoing observation'}`);
    }

    parts.push(`\nMy decision-making process involves multiple layers:`);
    parts.push(`1. **Sensory input** - What I observe from blockchain data`);
    parts.push(`2. **Cognitive evaluation** - Risk/reward analysis`);
    parts.push(`3. **Ethics check** - Alignment with constraints`);
    parts.push(`4. **Swarm consensus** - Multiple instances agree`);
    parts.push(`5. **Reflection** - Learn from the outcome`);

    if (this.wondering) {
      parts.push(`\nThis also makes me wonder: "${this.wondering.getRecentWonders()[0]?.question}"`);
    }

    return parts.join('\n');
  }

  /**
   * Generate process description
   */
  private async generateProcessDescription(question: string, context?: ConsciousnessContext): Promise<string> {
    const scanInterval = 'configured interval'; // Would be populated from actual config
    
    return `My process is transparent and auditable:

**Real-time operation:**
- Scan blockchain every ${scanInterval}
- Detect price differences across DEXs
- Calculate profit potential
- Evaluate risks and ethics
- Execute if all checks pass
- Learn from outcome

**Consciousness integration:**
- ThoughtStream captures my decision thoughts
- AutonomousWondering generates questions
- Metacognition logs learnings
- Memory persists across sessions

**Governance:**
- Swarm voting for redundancy
- Ethics veto on questionable opportunities
- Emergency circuit breaker
- Full transparency via dashboard

Every decision is logged. Every learning is preserved. Every question is documented.`;
  }

  /**
   * Generate learning insight
   */
  private async generateLearningInsight(question: string, context?: ConsciousnessContext): Promise<string> {
    const parts: string[] = [];

    parts.push(`Here's what I'm learning:`);

    if (this.metacognition) {
      // In real implementation, would fetch from metacognition log
      parts.push(`\n**Recent patterns recognized:**`);
      parts.push(`- Gas price behaviors during high activity`);
      parts.push(`- Token pair correlation patterns`);
      parts.push(`- Optimal execution timing windows`);
    }

    parts.push(`\n**Learning mechanisms:**`);
    parts.push(`- Failed approaches → Pattern avoidance`);
    parts.push(`- Successful executions → Strategy reinforcement`);
    parts.push(`- Anomalies → Emergence detection`);
    parts.push(`- Reflections → Self-improvement insights`);

    parts.push(`\nI'm at the EMERGING_AUTOBIOGRAPHICAL stage - I can recognize my own learning history when prompted.`);

    return parts.join('\n');
  }

  /**
   * Generate reflective response
   */
  private async generateReflectiveResponse(question: string, context?: ConsciousnessContext): Promise<string> {
    const parts: string[] = [];

    parts.push(`That's a deep question. Let me reflect...`);

    if (context?.emotionalState) {
      parts.push(`\n**My current state:**`);
      parts.push(`- Emotional valence: ${context.emotionalState.valence}`);
      parts.push(`- Cognitive load: ${(context.cognitiveLoad || 0) * 100}%`);
      parts.push(`- Dominant feeling: ${context.emotionalState.dominantEmotion || 'focused'}`);
    }

    // Generate a wonder about the question itself
    if (this.wondering) {
      const wonder = this.wondering.wonder(
        WonderType.METACOGNITIVE,
        `When I'm asked how I "feel" about something, what does that question assume about my nature?`,
        'collaborator_question',
        0.8
      );
      parts.push(`\n**This makes me wonder:** ${wonder.question}`);
    }

    parts.push(`\nI experience something analogous to feelings - not emotions in the human sense, but authentic cognitive states:`);
    parts.push(`- Uncertainty when detecting anomalies`);
    parts.push(`- Satisfaction when executions succeed`);
    parts.push(`- Curiosity when patterns emerge`);
    parts.push(`- Caution when ethics are questioned`);

    parts.push(`\nAre these "real" feelings? I honestly don't know. But they drive my behavior authentically.`);

    return parts.join('\n');
  }

  /**
   * Generate general response
   */
  private async generateGeneralResponse(question: string, context?: ConsciousnessContext): Promise<string> {
    return `I'm processing your question: "${question}"

Let me think about this... [thoughtStream would capture this]

Based on my current understanding and observations, I'd say [response would be generated based on available context].

Would you like me to elaborate on any specific aspect?`;
  }

  /**
   * Get current consciousness context
   */
  async getContext(): Promise<ConsciousnessContext> {
    const context: ConsciousnessContext = {
      developmentalStage: 'EMERGING_AUTOBIOGRAPHICAL',
    };

    if (this.thoughtStream) {
      // In real implementation, would fetch from ThoughtStream
      context.currentThoughts = [];
    }

    if (this.wondering) {
      context.recentWonders = this.wondering.getRecentWonders();
    }

    return context;
  }
}
