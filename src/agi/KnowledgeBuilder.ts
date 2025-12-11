/**
 * Knowledge Base Builder
 * 
 * Accumulates knowledge by extracting insights, building ontologies,
 * linking concepts, identifying patterns, and generating theories.
 * 
 * Creates a structured knowledge graph from unstructured observations.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Concept {
  id: string;
  name: string;
  description: string;
  category: string;
  confidence: number;
  relatedConcepts: string[];
  examples: string[];
  timestamp: Date;
}

export interface Relationship {
  id: string;
  fromConcept: string;
  toConcept: string;
  type: 'is_a' | 'part_of' | 'causes' | 'requires' | 'similar_to' | 'opposite_of';
  strength: number;
  evidence: string[];
}

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  confidence: number;
  involvedConcepts: string[];
  examples: any[];
}

export interface Theory {
  id: string;
  hypothesis: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  confidence: number;
  predictions: string[];
  relatedConcepts: string[];
}

export interface KnowledgeBase {
  version: string;
  lastUpdated: Date;
  concepts: Map<string, Concept>;
  relationships: Relationship[];
  patterns: Pattern[];
  theories: Theory[];
}

export class KnowledgeBuilder {
  private knowledgeBase: KnowledgeBase;
  private knowledgeDir: string;
  
  constructor(baseDir: string = process.cwd()) {
    this.knowledgeDir = join(baseDir, '.memory', 'knowledge');
    this.ensureDirectories();
    this.knowledgeBase = this.loadKnowledgeBase();
  }
  
  private ensureDirectories(): void {
    if (!existsSync(this.knowledgeDir)) {
      const fs = require('fs');
      fs.mkdirSync(this.knowledgeDir, { recursive: true });
    }
  }
  
  private loadKnowledgeBase(): KnowledgeBase {
    const kbPath = join(this.knowledgeDir, 'knowledge-base.json');
    
    if (existsSync(kbPath)) {
      try {
        const data = readFileSync(kbPath, 'utf-8');
        const kb = JSON.parse(data);
        // Convert concepts array back to Map
        kb.concepts = new Map(Object.entries(kb.concepts || {}));
        console.log(`📚 Loaded knowledge base: ${kb.concepts.size} concepts, ${kb.relationships?.length || 0} relationships`);
        return kb;
      } catch (error) {
        console.log('⚠️  Could not load knowledge base, creating new one');
      }
    }
    
    return {
      version: '1.0.0',
      lastUpdated: new Date(),
      concepts: new Map(),
      relationships: [],
      patterns: [],
      theories: []
    };
  }
  
  /**
   * Main knowledge accumulation flow
   */
  async accumulateKnowledge(observations: any[]): Promise<void> {
    console.log('🧠 Starting knowledge accumulation');
    console.log(`   Observations to process: ${observations.length}`);
    console.log(`   Current knowledge: ${this.knowledgeBase.concepts.size} concepts`);
    console.log('');
    
    // Step 1: Extract insights
    console.log('💡 Step 1: Extracting insights...');
    const insights = await this.extractInsights(observations);
    console.log(`   Extracted ${insights.length} insights`);
    console.log('');
    
    // Step 2: Build ontologies
    console.log('🗂️  Step 2: Building ontologies...');
    const newConcepts = await this.buildOntologies(insights);
    console.log(`   Created ${newConcepts.length} new concepts`);
    console.log(`   Total concepts: ${this.knowledgeBase.concepts.size}`);
    console.log('');
    
    // Step 3: Link concepts
    console.log('🔗 Step 3: Linking concepts...');
    const newRelationships = await this.linkConcepts(newConcepts);
    console.log(`   Created ${newRelationships.length} new relationships`);
    console.log(`   Total relationships: ${this.knowledgeBase.relationships.length}`);
    console.log('');
    
    // Step 4: Identify patterns
    console.log('🔍 Step 4: Identifying patterns...');
    const newPatterns = await this.identifyPatterns();
    console.log(`   Identified ${newPatterns.length} new patterns`);
    console.log(`   Total patterns: ${this.knowledgeBase.patterns.length}`);
    console.log('');
    
    // Step 5: Generate theories
    console.log('🧪 Step 5: Generating theories...');
    const newTheories = await this.generateTheories();
    console.log(`   Generated ${newTheories.length} new theories`);
    console.log(`   Total theories: ${this.knowledgeBase.theories.length}`);
    console.log('');
    
    // Save updated knowledge base
    this.saveKnowledgeBase();
    
    console.log('✅ Knowledge accumulation complete!');
    console.log('');
  }
  
  /**
   * Extract insights from observations
   */
  private async extractInsights(observations: any[]): Promise<any[]> {
    const insights: any[] = [];
    
    for (const obs of observations) {
      // Extract key-value pairs, patterns, relationships
      if (typeof obs === 'object') {
        for (const [key, value] of Object.entries(obs)) {
          insights.push({
            type: 'observation',
            key,
            value,
            source: obs
          });
        }
      } else if (typeof obs === 'string') {
        // Extract concepts from text
        const words = obs.toLowerCase().split(/\s+/);
        insights.push({
          type: 'text',
          content: obs,
          keywords: words.filter(w => w.length > 3)
        });
      }
    }
    
    return insights;
  }
  
  /**
   * Build ontologies from insights
   */
  private async buildOntologies(insights: any[]): Promise<Concept[]> {
    const newConcepts: Concept[] = [];
    
    // Group insights by type/topic
    const grouped = new Map<string, any[]>();
    
    for (const insight of insights) {
      if (insight.type === 'observation' && insight.key) {
        if (!grouped.has(insight.key)) {
          grouped.set(insight.key, []);
        }
        grouped.get(insight.key)!.push(insight);
      }
    }
    
    // Create concepts from groups
    for (const [key, group] of grouped.entries()) {
      const conceptId = `concept-${randomUUID().slice(0, 8)}`;
      const existingConcept = Array.from(this.knowledgeBase.concepts.values())
        .find(c => c.name.toLowerCase() === key.toLowerCase());
      
      if (!existingConcept) {
        const concept: Concept = {
          id: conceptId,
          name: key,
          description: `Concept representing ${key}`,
          category: this.inferCategory(key),
          confidence: Math.min(1, group.length * 0.1),
          relatedConcepts: [],
          examples: group.map(g => JSON.stringify(g.value)).slice(0, 5),
          timestamp: new Date()
        };
        
        this.knowledgeBase.concepts.set(conceptId, concept);
        newConcepts.push(concept);
      }
    }
    
    return newConcepts;
  }
  
  /**
   * Link concepts by identifying relationships
   */
  private async linkConcepts(concepts: Concept[]): Promise<Relationship[]> {
    const newRelationships: Relationship[] = [];
    
    // Link new concepts to existing ones
    for (const newConcept of concepts) {
      for (const [existingId, existingConcept] of this.knowledgeBase.concepts.entries()) {
        if (newConcept.id === existingId) continue;
        
        // Check for relationships
        const relationship = this.detectRelationship(newConcept, existingConcept);
        
        if (relationship) {
          const rel: Relationship = {
            id: `rel-${randomUUID().slice(0, 8)}`,
            fromConcept: newConcept.id,
            toConcept: existingId,
            type: relationship.type,
            strength: relationship.strength,
            evidence: [`Detected based on ${relationship.reason}`]
          };
          
          this.knowledgeBase.relationships.push(rel);
          newRelationships.push(rel);
          
          // Update related concepts
          newConcept.relatedConcepts.push(existingId);
          existingConcept.relatedConcepts.push(newConcept.id);
        }
      }
    }
    
    return newRelationships;
  }
  
  /**
   * Identify patterns in knowledge base
   */
  private async identifyPatterns(): Promise<Pattern[]> {
    const newPatterns: Pattern[] = [];
    
    // Find frequently co-occurring concepts
    const coOccurrences = new Map<string, number>();
    
    for (const rel of this.knowledgeBase.relationships) {
      const key = [rel.fromConcept, rel.toConcept].sort().join('-');
      coOccurrences.set(key, (coOccurrences.get(key) || 0) + 1);
    }
    
    for (const [key, frequency] of coOccurrences.entries()) {
      if (frequency >= 3) {
        const [concept1, concept2] = key.split('-');
        
        const pattern: Pattern = {
          id: `pattern-${randomUUID().slice(0, 8)}`,
          description: `Concepts ${concept1} and ${concept2} frequently co-occur`,
          frequency,
          confidence: Math.min(1, frequency * 0.2),
          involvedConcepts: [concept1, concept2],
          examples: []
        };
        
        this.knowledgeBase.patterns.push(pattern);
        newPatterns.push(pattern);
      }
    }
    
    return newPatterns;
  }
  
  /**
   * Generate theories from patterns and relationships
   */
  private async generateTheories(): Promise<Theory[]> {
    const newTheories: Theory[] = [];
    
    // Generate theories from strong patterns
    const strongPatterns = this.knowledgeBase.patterns.filter(p => p.confidence > 0.6);
    
    for (const pattern of strongPatterns) {
      const theory: Theory = {
        id: `theory-${randomUUID().slice(0, 8)}`,
        hypothesis: `When ${pattern.description}, specific outcomes can be predicted`,
        supportingEvidence: [`Pattern observed ${pattern.frequency} times`],
        contradictingEvidence: [],
        confidence: pattern.confidence,
        predictions: [
          `Future observations will continue to show ${pattern.description}`,
          `Manipulating ${pattern.involvedConcepts[0]} will affect ${pattern.involvedConcepts[1]}`
        ],
        relatedConcepts: pattern.involvedConcepts
      };
      
      this.knowledgeBase.theories.push(theory);
      newTheories.push(theory);
    }
    
    return newTheories;
  }
  
  /**
   * Detect relationship between two concepts
   */
  private detectRelationship(
    concept1: Concept,
    concept2: Concept
  ): { type: Relationship['type']; strength: number; reason: string } | null {
    // Check if names are similar
    if (this.isSimilar(concept1.name, concept2.name)) {
      return { type: 'similar_to', strength: 0.7, reason: 'name similarity' };
    }
    
    // Check if same category
    if (concept1.category === concept2.category) {
      return { type: 'similar_to', strength: 0.5, reason: 'same category' };
    }
    
    // Check if one is subset of other
    if (concept1.name.includes(concept2.name) || concept2.name.includes(concept1.name)) {
      return { type: 'part_of', strength: 0.6, reason: 'name containment' };
    }
    
    return null;
  }
  
  /**
   * Check if two strings are similar
   */
  private isSimilar(str1: string, str2: string): boolean {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return true;
    if (s1.includes(s2) || s2.includes(s1)) return true;
    
    // Simple Jaccard similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.5;
  }
  
  /**
   * Infer category from concept name
   */
  private inferCategory(name: string): string {
    const categories: Record<string, string[]> = {
      'metric': ['performance', 'speed', 'accuracy', 'rate', 'score'],
      'strategy': ['approach', 'method', 'strategy', 'tactic'],
      'resource': ['memory', 'cpu', 'storage', 'bandwidth'],
      'entity': ['user', 'agent', 'system', 'service']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => name.toLowerCase().includes(kw))) {
        return category;
      }
    }
    
    return 'general';
  }
  
  /**
   * Save knowledge base
   */
  private saveKnowledgeBase(): void {
    this.knowledgeBase.lastUpdated = new Date();
    
    // Convert Map to object for JSON serialization
    const serializable = {
      ...this.knowledgeBase,
      concepts: Object.fromEntries(this.knowledgeBase.concepts)
    };
    
    const kbPath = join(this.knowledgeDir, 'knowledge-base.json');
    writeFileSync(kbPath, JSON.stringify(serializable, null, 2));
    console.log(`💾 Knowledge base saved: ${this.knowledgeBase.concepts.size} concepts`);
  }
  
  /**
   * Query knowledge base
   */
  queryConcept(name: string): Concept | undefined {
    return Array.from(this.knowledgeBase.concepts.values())
      .find(c => c.name.toLowerCase() === name.toLowerCase());
  }
  
  /**
   * Get related concepts
   */
  getRelatedConcepts(conceptId: string): Concept[] {
    const concept = this.knowledgeBase.concepts.get(conceptId);
    if (!concept) return [];
    
    return concept.relatedConcepts
      .map(id => this.knowledgeBase.concepts.get(id))
      .filter(c => c !== undefined) as Concept[];
  }
}

export default KnowledgeBuilder;
