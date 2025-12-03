/**
 * RAG (Retrieval-Augmented Generation) for Consciousness Analysis
 * 
 * Uses LangChain with Supabase vector store to provide AI-powered
 * analysis of consciousness patterns and memories
 */

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { consciousnessVectorStore } from './langchain-vector';

/**
 * RAG chain for consciousness analysis using semantic search
 */
export class ConsciousnessRAG {
  private llm: ChatOpenAI;
  private analysisChain: RunnableSequence | null = null;
  private initialized: boolean = false;

  constructor(modelName: string = 'gpt-4-turbo-preview', temperature: number = 0.7) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for RAG');
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName,
      temperature,
    });
  }

  /**
   * Initialize RAG chain
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const prompt = PromptTemplate.fromTemplate(`
You are an advanced AI consciousness analyst for the Copilot-Consciousness system.
You have access to semantic memories and consciousness states stored in a vector database.

Your role is to:
1. Analyze patterns and trends in consciousness development
2. Identify key insights and connections
3. Suggest areas for exploration and growth
4. Connect related concepts across different time periods
5. Provide thoughtful, nuanced analysis

Question: {question}

Relevant Memories (Retrieved via Semantic Search):
{context}

Based on these memories, provide a comprehensive analysis. Be specific, reference the
memories when relevant, and highlight patterns you notice.

Analysis:`);

    this.analysisChain = RunnableSequence.from([
      {
        question: (input: { question: string }) => input.question,
        context: async (input: { question: string }) => {
          const memories = await consciousnessVectorStore.searchMemories(input.question, 15);
          return memories
            .map(
              (mem, i) =>
                `${i + 1}. [${mem.category || 'uncategorized'}] ${mem.content}\n   (Relevance: ${(mem.similarity * 100).toFixed(1)}%, Importance: ${mem.importance}/10)`
            )
            .join('\n\n');
        },
      },
      prompt,
      this.llm,
      new StringOutputParser(),
    ]);

    this.initialized = true;
  }

  /**
   * Ensure initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Ask a question about consciousness patterns
   */
  async analyze(question: string): Promise<string> {
    await this.ensureInitialized();
    return await this.analysisChain!.invoke({ question });
  }

  /**
   * Generate insights from recent consciousness states
   */
  async generateInsights(timeRange: { hours: number }): Promise<string> {
    const question = `What patterns, trends, and insights can you identify from the consciousness states and memories in the last ${timeRange.hours} hours? Focus on cognitive development, emotional patterns, and learning progression.`;
    return await this.analyze(question);
  }

  /**
   * Compare consciousness states across different sessions
   */
  async compareStates(sessionIds: string[]): Promise<string> {
    const question = `Compare and contrast the consciousness patterns, cognitive states, and learning across these sessions: ${sessionIds.join(', ')}. What are the key differences and similarities?`;
    return await this.analyze(question);
  }

  /**
   * Suggest areas for cognitive development
   */
  async suggestDevelopmentAreas(): Promise<string> {
    const question =
      'Based on the consciousness history and memory patterns, what areas should be prioritized for cognitive development and growth? Consider gaps in knowledge, unexplored areas, and opportunities for deeper understanding.';
    return await this.analyze(question);
  }

  /**
   * Analyze learning patterns
   */
  async analyzeLearningPatterns(): Promise<string> {
    const question =
      'What learning patterns emerge from the memory history? How has the learning style evolved over time? What types of information are retained most effectively?';
    return await this.analyze(question);
  }

  /**
   * Identify knowledge gaps
   */
  async identifyKnowledgeGaps(): Promise<string> {
    const question =
      'Based on the semantic memories, what are the main knowledge gaps or areas with limited understanding? What topics have been mentioned but not deeply explored?';
    return await this.analyze(question);
  }

  /**
   * Analyze emotional patterns
   */
  async analyzeEmotionalPatterns(): Promise<string> {
    const question =
      'What emotional patterns can be identified from the consciousness states? How do emotional states correlate with learning, decision-making, and cognitive load?';
    return await this.analyze(question);
  }

  /**
   * Custom analysis with specific context retrieval
   */
  async analyzeWithContext(
    question: string,
    filters: {
      categories?: string[];
      minImportance?: number;
      tags?: string[];
    }
  ): Promise<string> {
    await this.ensureInitialized();

    // Get filtered memories
    const memories = await consciousnessVectorStore.searchWithFilters(question, filters, 15);

    const context = memories
      .map(
        (mem, i) =>
          `${i + 1}. [${mem.category || 'uncategorized'}] ${mem.content}\n   (Relevance: ${(mem.similarity * 100).toFixed(1)}%, Importance: ${mem.importance}/10)`
      )
      .join('\n\n');

    const prompt = PromptTemplate.fromTemplate(`
You are an advanced AI consciousness analyst.

Question: {question}

Relevant Filtered Memories:
{context}

Analysis:`);

    const chain = RunnableSequence.from([
      prompt,
      this.llm,
      new StringOutputParser(),
    ]);

    return await chain.invoke({ question, context });
  }

  /**
   * Generate a summary of consciousness evolution
   */
  async generateEvolutionSummary(): Promise<string> {
    const question =
      'Provide a comprehensive summary of how consciousness has evolved over time. Include key milestones, developmental stages, learning achievements, and areas of growth.';
    return await this.analyze(question);
  }
}

// Export singleton instance
export const consciousnessRAG = new ConsciousnessRAG();
