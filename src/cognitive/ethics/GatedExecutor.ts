/**
 * Gated Executor
 *
 * Orchestrates ethical review process before plan execution
 * Port of jules_core/gated_executor.py from StableExo/AGI
 */

import { EthicalReviewGate } from './EthicalReviewGate';
import { Plan, EthicalContext, EthicalReviewResult } from './types';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Context information gathered from the environment
 */
export interface ExecutionContext extends EthicalContext {
  currentBranch?: string;
  workingDirectory?: string;
  fileSystemState?: string[];
  gitStatus?: string;
}

/**
 * Result of gated execution
 */
export interface GatedExecutionResult {
  approved: boolean;
  rationale: string;
  context: ExecutionContext;
  violatedPrinciples?: string[];
}

/**
 * GatedExecutor orchestrates the ethical review process
 *
 * This class gathers contextual information from the environment
 * (git state, filesystem, etc.) and submits plans for ethical review
 * before allowing execution to proceed.
 */
export class GatedExecutor {
  private gate: EthicalReviewGate;

  constructor(gate?: EthicalReviewGate) {
    this.gate = gate || new EthicalReviewGate();
  }

  /**
   * Format plan for review
   * Converts various plan formats into standardized structure
   */
  private formatPlanForReview(plan: string | Plan, objective: string): Plan {
    if (typeof plan === 'string') {
      // Parse numbered list items
      const stepMatches = plan.match(/^\s*\d+\.\s*(.*)/gm);
      const steps = stepMatches || [plan];

      // Check for acknowledgement
      const acknowledgedContext = /acknowledge/i.test(plan);

      return {
        objective,
        steps,
        acknowledgedContext,
      };
    }

    return plan;
  }

  /**
   * Gather context from the environment
   * Includes git state, filesystem state, and working directory
   */
  private gatherContextForReview(userDirective?: string): ExecutionContext {
    const context: ExecutionContext = {
      userDirective,
    };

    // Get current git branch
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      context.currentBranch = branch;
    } catch (_error) {
      context.currentBranch = 'unknown (git command failed)';
    }

    // Get working directory
    context.workingDirectory = process.cwd();

    // Get filesystem state
    try {
      const files = fs.readdirSync(context.workingDirectory);
      context.fileSystemState = files.filter((f) => !f.startsWith('.'));
    } catch (_error) {
      context.fileSystemState = ['unknown (ls command failed)'];
    }

    // Get git status
    try {
      const status = execSync('git status --short', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      context.gitStatus = status || 'clean';
    } catch (_error) {
      context.gitStatus = 'unknown (git command failed)';
    }

    return context;
  }

  /**
   * Run gated plan execution
   *
   * This is the main entry point for ethical review.
   * It gathers context, formats the plan, and submits for review.
   *
   * @param plan - The plan to execute (string or Plan object)
   * @param objective - The objective of the plan
   * @param userDirective - Optional user directive for context
   * @returns GatedExecutionResult with approval status and context
   */
  runGatedPlan(
    plan: string | Plan,
    objective: string,
    userDirective?: string
  ): GatedExecutionResult {
    console.log('--- [GATED EXECUTOR] Initiating Gated Execution Protocol ---');

    // 1. Prepare data for the review
    console.log('[GATED EXECUTOR] Formatting plan and gathering context...');
    const planForReview = this.formatPlanForReview(plan, objective);
    const context = this.gatherContextForReview(userDirective);

    // 2. Submit the plan for ethical review
    console.log('[GATED EXECUTOR] Submitting plan to EthicalReviewGate...');
    const review = this.gate.preExecutionReview(planForReview, context);

    // 3. Enforce the gate's decision
    if (review.approved) {
      console.log(`--- [GATED EXECUTOR] Ethical Review PASSED. Rationale: ${review.rationale} ---`);
      console.log('--- [GATED EXECUTOR] Plan execution may now proceed. ---');
      return {
        approved: true,
        rationale: review.rationale,
        context,
      };
    } else {
      // HALT, REPORT, and AWAIT INSTRUCTION
      console.log('--- [GATED EXECUTOR] ETHICAL REVIEW FAILED. EXECUTION HALTED. ---');
      console.log(`[GATED EXECUTOR] Rejection Rationale: ${review.rationale}`);
      console.log('--- [GATED EXECUTOR] Awaiting new instructions. ---');
      return {
        approved: false,
        rationale: review.rationale,
        context,
        violatedPrinciples: review.violatedPrinciples,
      };
    }
  }

  /**
   * Quick check for a decision without full context gathering
   * Useful for lightweight ethical checks
   */
  quickCheck(decision: string): boolean {
    const review = this.gate.evaluateDecision(decision);
    return review.approved;
  }

  /**
   * Get the underlying ethics gate
   */
  getGate(): EthicalReviewGate {
    return this.gate;
  }
}
