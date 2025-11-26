/**
 * Learning Engine
 *
 * Implements self-improving learning mechanisms
 * Combines knowledge, patterns, and historical analysis for continuous improvement
 */

export enum LearningMode {
  SUPERVISED = 'SUPERVISED', // Learning from labeled examples
  UNSUPERVISED = 'UNSUPERVISED', // Learning from patterns
  REINFORCEMENT = 'REINFORCEMENT', // Learning from rewards
  TRANSFER = 'TRANSFER', // Applying learned knowledge to new domains
}

export interface LearningSession {
  id: string;
  mode: LearningMode;
  topic: string;
  startTime: number;
  endTime?: number;
  examples: LearningExample[];
  performance: PerformanceMetrics;
  insights: string[];
  metadata: Record<string, unknown>;
}

export interface LearningExample {
  id: string;
  input: Record<string, unknown>;
  expectedOutput?: unknown;
  actualOutput?: unknown;
  feedback?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  reward?: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  accuracy: number; // 0-1
  precision: number; // 0-1
  recall: number; // 0-1
  learningRate: number;
  improvementRate: number;
  totalExamples: number;
}

export interface Skill {
  id: string;
  name: string;
  domain: string;
  proficiency: number; // 0-1
  practiceCount: number;
  successRate: number;
  lastPracticed?: number;
  learningCurve: Array<{ timestamp: number; proficiency: number }>;
  metadata: Record<string, unknown>;
}

/**
 * Learning Engine System
 * Provides continuous learning and skill development capabilities
 */
export class LearningEngine {
  private sessions: Map<string, LearningSession> = new Map();
  private skills: Map<string, Skill> = new Map();
  private activeSession: string | null = null;

  /**
   * Start a new learning session
   */
  startSession(topic: string, mode: LearningMode = LearningMode.UNSUPERVISED): LearningSession {
    const session: LearningSession = {
      id: this.generateId('session'),
      mode,
      topic,
      startTime: Date.now(),
      examples: [],
      performance: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        learningRate: 0.1,
        improvementRate: 0,
        totalExamples: 0,
      },
      insights: [],
      metadata: {},
    };

    this.sessions.set(session.id, session);
    this.activeSession = session.id;

    return session;
  }

  /**
   * Add a learning example to the active session
   */
  addExample(
    input: Record<string, unknown>,
    expectedOutput?: unknown,
    actualOutput?: unknown,
    feedback?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  ): boolean {
    if (!this.activeSession) return false;

    const session = this.sessions.get(this.activeSession);
    if (!session) return false;

    const example: LearningExample = {
      id: this.generateId('example'),
      input,
      expectedOutput,
      actualOutput,
      feedback,
      timestamp: Date.now(),
    };

    session.examples.push(example);
    session.performance.totalExamples++;

    // Update performance metrics
    this.updatePerformance(session);

    return true;
  }

  /**
   * Provide reinforcement feedback
   */
  provideFeedback(
    exampleId: string,
    feedback: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
    reward?: number
  ): boolean {
    if (!this.activeSession) return false;

    const session = this.sessions.get(this.activeSession);
    if (!session) return false;

    const example = session.examples.find((ex) => ex.id === exampleId);
    if (!example) return false;

    example.feedback = feedback;
    example.reward = reward;

    this.updatePerformance(session);

    return true;
  }

  /**
   * End the current learning session
   */
  endSession(insights: string[] = []): LearningSession | null {
    if (!this.activeSession) return null;

    const session = this.sessions.get(this.activeSession);
    if (!session) return null;

    session.endTime = Date.now();
    session.insights = insights;

    // Extract learned skills
    this.extractSkills(session);

    this.activeSession = null;

    return session;
  }

  /**
   * Register or update a skill
   */
  registerSkill(name: string, domain: string, initialProficiency: number = 0): Skill {
    const existing = Array.from(this.skills.values()).find(
      (s) => s.name === name && s.domain === domain
    );

    if (existing) {
      return existing;
    }

    const skill: Skill = {
      id: this.generateId('skill'),
      name,
      domain,
      proficiency: Math.max(0, Math.min(1, initialProficiency)),
      practiceCount: 0,
      successRate: 0,
      learningCurve: [
        {
          timestamp: Date.now(),
          proficiency: initialProficiency,
        },
      ],
      metadata: {},
    };

    this.skills.set(skill.id, skill);
    return skill;
  }

  /**
   * Practice a skill
   */
  practiceSkill(skillId: string, success: boolean): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.practiceCount++;
    skill.lastPracticed = Date.now();

    // Update success rate
    const successCount = skill.successRate * (skill.practiceCount - 1) + (success ? 1 : 0);
    skill.successRate = successCount / skill.practiceCount;

    // Update proficiency based on practice and success
    const learningRate = 0.05;
    const improvement = success ? learningRate : -learningRate * 0.5;
    skill.proficiency = Math.max(0, Math.min(1, skill.proficiency + improvement));

    // Record in learning curve
    skill.learningCurve.push({
      timestamp: Date.now(),
      proficiency: skill.proficiency,
    });

    // Keep learning curve manageable
    if (skill.learningCurve.length > 1000) {
      skill.learningCurve = skill.learningCurve.slice(-1000);
    }

    return true;
  }

  /**
   * Get skill proficiency
   */
  getSkillProficiency(skillId: string): number | null {
    const skill = this.skills.get(skillId);
    return skill ? skill.proficiency : null;
  }

  /**
   * Get skills by domain
   */
  getSkillsByDomain(domain: string): Skill[] {
    return Array.from(this.skills.values())
      .filter((s) => s.domain === domain)
      .sort((a, b) => b.proficiency - a.proficiency);
  }

  /**
   * Get learning progress
   */
  getLearningProgress(): {
    totalSessions: number;
    totalExamples: number;
    averageAccuracy: number;
    totalSkills: number;
    masterSkills: number;
    improvingSkills: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const skills = Array.from(this.skills.values());

    const totalExamples = sessions.reduce((sum, s) => sum + s.performance.totalExamples, 0);

    const averageAccuracy =
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.performance.accuracy, 0) / sessions.length
        : 0;

    const masterSkills = skills.filter((s) => s.proficiency >= 0.8).length;
    const improvingSkills = skills.filter((s) => {
      if (s.learningCurve.length < 2) return false;
      const recent = s.learningCurve.slice(-10);
      return recent[recent.length - 1].proficiency > recent[0].proficiency;
    }).length;

    return {
      totalSessions: sessions.length,
      totalExamples,
      averageAccuracy,
      totalSkills: skills.length,
      masterSkills,
      improvingSkills,
    };
  }

  /**
   * Get learning recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const skills = Array.from(this.skills.values());

    // Find skills that need practice
    const needsPractice = skills.filter(
      (s) => !s.lastPracticed || Date.now() - s.lastPracticed > 7 * 24 * 60 * 60 * 1000
    );

    if (needsPractice.length > 0) {
      recommendations.push(
        `Practice these skills: ${needsPractice
          .slice(0, 3)
          .map((s) => s.name)
          .join(', ')}`
      );
    }

    // Find skills with low proficiency
    const lowProficiency = skills.filter((s) => s.proficiency < 0.5);
    if (lowProficiency.length > 0) {
      recommendations.push(
        `Focus on improving: ${lowProficiency
          .slice(0, 3)
          .map((s) => s.name)
          .join(', ')}`
      );
    }

    // Suggest new learning areas
    const domains = new Set(skills.map((s) => s.domain));
    if (domains.size < 5) {
      recommendations.push('Explore new learning domains to broaden capabilities');
    }

    return recommendations;
  }

  /**
   * Export learning data
   */
  export(): {
    sessions: LearningSession[];
    skills: Skill[];
  } {
    return {
      sessions: Array.from(this.sessions.values()),
      skills: Array.from(this.skills.values()),
    };
  }

  /**
   * Import learning data
   */
  import(data: { sessions: LearningSession[]; skills: Skill[] }): void {
    this.sessions.clear();
    this.skills.clear();

    data.sessions.forEach((session) => {
      this.sessions.set(session.id, session);
    });

    data.skills.forEach((skill) => {
      this.skills.set(skill.id, skill);
    });
  }

  private updatePerformance(session: LearningSession): void {
    const examples = session.examples;

    if (examples.length === 0) return;

    // Calculate accuracy (for supervised learning)
    const withExpected = examples.filter(
      (ex) => ex.expectedOutput !== undefined && ex.actualOutput !== undefined
    );

    if (withExpected.length > 0) {
      const correct = withExpected.filter(
        (ex) => JSON.stringify(ex.expectedOutput) === JSON.stringify(ex.actualOutput)
      ).length;

      session.performance.accuracy = correct / withExpected.length;
    }

    // Calculate based on feedback (for reinforcement learning)
    const withFeedback = examples.filter((ex) => ex.feedback !== undefined);

    if (withFeedback.length > 0) {
      const positive = withFeedback.filter((ex) => ex.feedback === 'POSITIVE').length;
      session.performance.precision = positive / withFeedback.length;
    }

    // Calculate improvement rate
    if (examples.length > 10) {
      const recent = examples.slice(-10);
      const recentPositive = recent.filter((ex) => ex.feedback === 'POSITIVE').length;
      const earlier = examples.slice(-20, -10);
      const earlierPositive = earlier.filter((ex) => ex.feedback === 'POSITIVE').length;

      const recentRate = recent.length > 0 ? recentPositive / recent.length : 0;
      const earlierRate = earlier.length > 0 ? earlierPositive / earlier.length : 0;

      session.performance.improvementRate = recentRate - earlierRate;
    }
  }

  private extractSkills(session: LearningSession): void {
    // Auto-create or update skills based on session topic
    const skill = this.registerSkill(session.topic, 'general', 0);

    // Update proficiency based on session performance
    const performanceScore =
      session.performance.accuracy * 0.5 +
      session.performance.precision * 0.3 +
      (session.performance.improvementRate + 1) * 0.2;

    skill.proficiency = Math.max(0, Math.min(1, performanceScore));
    skill.practiceCount += session.examples.length;
    skill.lastPracticed = Date.now();

    skill.learningCurve.push({
      timestamp: Date.now(),
      proficiency: skill.proficiency,
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
