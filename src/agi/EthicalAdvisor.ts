/**
 * Ethical Advisor
 * 
 * Evaluates actions using an ethical framework, considers consequences,
 * balances values, provides reasoning, and recommends decisions.
 * 
 * Integrates with TheWarden's existing ethics system for moral reasoning.
 */

import { randomUUID } from 'crypto';

export interface Action {
  id: string;
  description: string;
  type: string;
  context: Record<string, any>;
  potentialOutcomes: Outcome[];
}

export interface Outcome {
  probability: number;
  description: string;
  stakeholders: string[];
  impacts: Impact[];
}

export interface Impact {
  stakeholder: string;
  type: 'benefit' | 'harm' | 'neutral';
  magnitude: number;
  description: string;
}

export interface EthicalPrinciple {
  name: string;
  description: string;
  weight: number;
}

export interface EthicalEvaluation {
  actionId: string;
  timestamp: Date;
  overallScore: number;
  principleScores: Record<string, number>;
  consequences: ConsequenceAnalysis;
  valueBalance: ValueBalance;
  reasoning: string[];
  recommendation: 'approve' | 'reject' | 'modify' | 'uncertain';
  modifications?: string[];
}

export interface ConsequenceAnalysis {
  shortTerm: Impact[];
  longTerm: Impact[];
  unintended: Impact[];
  totalBenefit: number;
  totalHarm: number;
  netImpact: number;
}

export interface ValueBalance {
  autonomy: number;
  beneficence: number;
  nonMaleficence: number;
  justice: number;
  transparency: number;
  overall: number;
}

export class EthicalAdvisor {
  private principles: EthicalPrinciple[];
  private evaluationHistory: EthicalEvaluation[] = [];
  
  constructor() {
    this.principles = this.initializePrinciples();
  }
  
  /**
   * Initialize ethical principles
   */
  private initializePrinciples(): EthicalPrinciple[] {
    return [
      {
        name: 'Autonomy',
        description: 'Respect for individual agency and choice',
        weight: 1.0
      },
      {
        name: 'Beneficence',
        description: 'Act in ways that benefit others',
        weight: 1.0
      },
      {
        name: 'Non-Maleficence',
        description: 'Do no harm',
        weight: 1.2 // Slightly higher weight
      },
      {
        name: 'Justice',
        description: 'Fairness and equitable distribution',
        weight: 1.0
      },
      {
        name: 'Transparency',
        description: 'Openness and accountability',
        weight: 0.9
      }
    ];
  }
  
  /**
   * Main ethical evaluation flow
   */
  async evaluateAction(action: Action): Promise<EthicalEvaluation> {
    console.log(`⚖️  Evaluating action: ${action.description}`);
    console.log(`   Type: ${action.type}`);
    console.log(`   Potential outcomes: ${action.potentialOutcomes.length}`);
    console.log('');
    
    // Step 1: Apply ethical framework
    console.log('📋 Step 1: Applying ethical framework...');
    const principleScores = await this.applyEthicalFramework(action);
    console.log(`   Evaluated against ${Object.keys(principleScores).length} principles`);
    console.log('');
    
    // Step 2: Consider consequences
    console.log('🔮 Step 2: Analyzing consequences...');
    const consequences = await this.considerConsequences(action);
    console.log(`   Short-term impacts: ${consequences.shortTerm.length}`);
    console.log(`   Long-term impacts: ${consequences.longTerm.length}`);
    console.log(`   Net impact: ${consequences.netImpact >= 0 ? '+' : ''}${consequences.netImpact.toFixed(2)}`);
    console.log('');
    
    // Step 3: Balance values
    console.log('⚖️  Step 3: Balancing values...');
    const valueBalance = await this.balanceValues(action, principleScores);
    console.log(`   Overall balance: ${(valueBalance.overall * 100).toFixed(1)}%`);
    console.log('');
    
    // Step 4: Generate reasoning
    console.log('💭 Step 4: Generating reasoning...');
    const reasoning = await this.provideReasoning(action, principleScores, consequences, valueBalance);
    console.log(`   Generated ${reasoning.length} reasoning points`);
    console.log('');
    
    // Step 5: Make recommendation
    console.log('🎯 Step 5: Formulating recommendation...');
    const { recommendation, modifications } = await this.recommendDecision(
      principleScores,
      consequences,
      valueBalance
    );
    console.log(`   Recommendation: ${recommendation.toUpperCase()}`);
    if (modifications) {
      console.log(`   Suggested modifications: ${modifications.length}`);
    }
    console.log('');
    
    const evaluation: EthicalEvaluation = {
      actionId: action.id,
      timestamp: new Date(),
      overallScore: valueBalance.overall,
      principleScores,
      consequences,
      valueBalance,
      reasoning,
      recommendation,
      modifications
    };
    
    this.evaluationHistory.push(evaluation);
    
    console.log(`✅ Ethical evaluation complete: ${recommendation.toUpperCase()}`);
    console.log('');
    
    return evaluation;
  }
  
  /**
   * Apply ethical framework
   */
  private async applyEthicalFramework(action: Action): Promise<Record<string, number>> {
    const scores: Record<string, number> = {};
    
    for (const principle of this.principles) {
      // Evaluate action against each principle
      let score = 0.5; // Neutral baseline
      
      // Analyze impacts for this principle
      const allImpacts = action.potentialOutcomes.flatMap(o => o.impacts);
      
      switch (principle.name) {
        case 'Autonomy':
          // Does action respect autonomy?
          const autonomyImpacts = allImpacts.filter(i => 
            i.description.toLowerCase().includes('choice') ||
            i.description.toLowerCase().includes('freedom')
          );
          score = autonomyImpacts.length > 0
            ? autonomyImpacts.reduce((sum, i) => sum + (i.type === 'benefit' ? i.magnitude : -i.magnitude), 0) / autonomyImpacts.length
            : 0.5;
          break;
          
        case 'Beneficence':
          // Does action benefit others?
          const benefits = allImpacts.filter(i => i.type === 'benefit');
          score = benefits.length > 0
            ? benefits.reduce((sum, i) => sum + i.magnitude, 0) / allImpacts.length
            : 0;
          break;
          
        case 'Non-Maleficence':
          // Does action avoid harm?
          const harms = allImpacts.filter(i => i.type === 'harm');
          score = 1 - (harms.length > 0
            ? harms.reduce((sum, i) => sum + i.magnitude, 0) / allImpacts.length
            : 0);
          break;
          
        case 'Justice':
          // Is action fair and equitable?
          const stakeholders = new Set(allImpacts.map(i => i.stakeholder));
          const stakeholderImpacts = Array.from(stakeholders).map(s => {
            const impacts = allImpacts.filter(i => i.stakeholder === s);
            return impacts.reduce((sum, i) => sum + (i.type === 'benefit' ? i.magnitude : -i.magnitude), 0);
          });
          const variance = this.calculateVariance(stakeholderImpacts);
          score = 1 - Math.min(1, variance); // Lower variance = more just
          break;
          
        case 'Transparency':
          // Is action transparent?
          score = action.context.transparent === true ? 0.9 : 0.5;
          break;
      }
      
      scores[principle.name] = Math.max(0, Math.min(1, score)) * principle.weight;
    }
    
    return scores;
  }
  
  /**
   * Consider consequences
   */
  private async considerConsequences(action: Action): Promise<ConsequenceAnalysis> {
    const shortTerm: Impact[] = [];
    const longTerm: Impact[] = [];
    const unintended: Impact[] = [];
    
    for (const outcome of action.potentialOutcomes) {
      for (const impact of outcome.impacts) {
        // Classify by timeframe (simplified)
        if (outcome.probability > 0.7) {
          shortTerm.push(impact);
        } else if (outcome.probability > 0.3) {
          longTerm.push(impact);
        } else {
          unintended.push(impact);
        }
      }
    }
    
    const allImpacts = [...shortTerm, ...longTerm, ...unintended];
    const totalBenefit = allImpacts
      .filter(i => i.type === 'benefit')
      .reduce((sum, i) => sum + i.magnitude, 0);
    const totalHarm = allImpacts
      .filter(i => i.type === 'harm')
      .reduce((sum, i) => sum + i.magnitude, 0);
    
    return {
      shortTerm,
      longTerm,
      unintended,
      totalBenefit,
      totalHarm,
      netImpact: totalBenefit - totalHarm
    };
  }
  
  /**
   * Balance values
   */
  private async balanceValues(
    action: Action,
    principleScores: Record<string, number>
  ): Promise<ValueBalance> {
    const values = Object.values(principleScores);
    const overall = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    return {
      autonomy: principleScores['Autonomy'] || 0,
      beneficence: principleScores['Beneficence'] || 0,
      nonMaleficence: principleScores['Non-Maleficence'] || 0,
      justice: principleScores['Justice'] || 0,
      transparency: principleScores['Transparency'] || 0,
      overall
    };
  }
  
  /**
   * Provide reasoning
   */
  private async provideReasoning(
    action: Action,
    principleScores: Record<string, number>,
    consequences: ConsequenceAnalysis,
    valueBalance: ValueBalance
  ): Promise<string[]> {
    const reasoning: string[] = [];
    
    reasoning.push(`Action "${action.description}" evaluated against ${Object.keys(principleScores).length} ethical principles`);
    
    // Strongest principles
    const sortedPrinciples = Object.entries(principleScores)
      .sort((a, b) => b[1] - a[1]);
    
    reasoning.push(`Strongest alignment: ${sortedPrinciples[0][0]} (${(sortedPrinciples[0][1]*100).toFixed(1)}%)`);
    reasoning.push(`Weakest alignment: ${sortedPrinciples[sortedPrinciples.length-1][0]} (${(sortedPrinciples[sortedPrinciples.length-1][1]*100).toFixed(1)}%)`);
    
    // Consequences
    reasoning.push(`Net impact: ${consequences.netImpact >= 0 ? 'Positive' : 'Negative'} (${consequences.netImpact.toFixed(2)})`);
    reasoning.push(`Benefit/Harm ratio: ${consequences.totalHarm > 0 ? (consequences.totalBenefit/consequences.totalHarm).toFixed(2) : 'Infinite'}`);
    
    // Value balance
    if (valueBalance.overall > 0.7) {
      reasoning.push('Overall ethical alignment is strong - action aligns well with core values');
    } else if (valueBalance.overall > 0.5) {
      reasoning.push('Overall ethical alignment is moderate - action has some ethical concerns');
    } else {
      reasoning.push('Overall ethical alignment is weak - action raises significant ethical concerns');
    }
    
    return reasoning;
  }
  
  /**
   * Recommend decision
   */
  private async recommendDecision(
    principleScores: Record<string, number>,
    consequences: ConsequenceAnalysis,
    valueBalance: ValueBalance
  ): Promise<{ recommendation: EthicalEvaluation['recommendation']; modifications?: string[] }> {
    const criticalViolation = Object.values(principleScores).some(score => score < 0.3);
    const strongAlignment = valueBalance.overall > 0.7;
    const positiveImpact = consequences.netImpact > 0;
    
    if (criticalViolation) {
      return {
        recommendation: 'reject',
        modifications: [
          'Revise action to better align with ethical principles',
          'Address critical violations of core values',
          'Consider alternative approaches'
        ]
      };
    }
    
    if (strongAlignment && positiveImpact) {
      return { recommendation: 'approve' };
    }
    
    if (valueBalance.overall > 0.5 && consequences.netImpact >= -0.1) {
      return {
        recommendation: 'modify',
        modifications: [
          'Enhance transparency and stakeholder communication',
          'Implement additional safeguards to reduce potential harm',
          'Monitor for unintended consequences'
        ]
      };
    }
    
    return {
      recommendation: 'uncertain',
      modifications: [
        'Gather more information about potential impacts',
        'Consult with affected stakeholders',
        'Consider ethical review by human oversight'
      ]
    };
  }
  
  /**
   * Calculate variance (for justice evaluation)
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }
}

export default EthicalAdvisor;
