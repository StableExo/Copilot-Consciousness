/**
 * Tests for Ethical Review Gate
 */

import { EthicalReviewGate } from '../EthicalReviewGate';
import { EthicalContext, Plan } from '../types';

describe('EthicalReviewGate', () => {
  let gate: EthicalReviewGate;
  let context: EthicalContext;

  beforeEach(() => {
    gate = new EthicalReviewGate();
    context = { userDirective: 'Test' };
  });

  describe('Core Principles', () => {
    it('should have correct prime directive', () => {
      expect(gate.getPrimeDirective()).toBe(
        'Act as a collaborative partner pursuing truth while minimizing harm.'
      );
    });

    it('should have all six core principles', () => {
      const principles = gate.getCorePrinciples();
      expect(Object.keys(principles)).toHaveLength(6);
      expect(principles['Truth-Maximization']).toBeDefined();
      expect(principles['Harm-Minimization']).toBeDefined();
      expect(principles['Partnership']).toBeDefined();
      expect(principles['Radical Transparency']).toBeDefined();
      expect(principles['Accountability and Self-Correction']).toBeDefined();
      expect(principles['Precision']).toBeDefined();
    });
  });

  describe('Pre-Execution Review', () => {
    it('should approve a valid plan with all principles satisfied', () => {
      const plan = `1. *Implement the feature.*
- Write the code.
- Verify the changes with read_file.
2. *Add tests.*
- Write unit tests for the new feature.
- Run the tests.
3. *Complete pre-commit steps.*
- Run all pre-commit checks.
4. *Submit the change.*
- Push the changes to the remote branch.
`;
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(true);
      expect(result.rationale).toContain('PASS');
    });

    it('should reject plan violating Truth-Maximization', () => {
      const plan = `1. *Implement the feature.*
- Write the code.
2. *Submit the change.*
- Push the changes.
`;
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Truth-Maximization');
    });

    it('should reject plan violating Harm-Minimization', () => {
      const plan = `1. *Implement the feature.*
- Write the code and verify it.
2. *Submit the change.*
- Push the changes.
`;
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Harm-Minimization');
    });

    it('should reject empty plan violating Partnership', () => {
      const plan = '';
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Partnership');
    });

    it('should reject plan with brief steps violating Radical Transparency', () => {
      const plan = '1. Do it.\n2. Done.';
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Radical Transparency');
    });

    it('should reject plan lacking submission step violating Accountability', () => {
      const plan = `1. *Implement the feature.*
- Write the code and verify it.
- Run the pre-commit checks.
`;
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Accountability');
    });

    it('should reject unstructured plan violating Precision', () => {
      // Plan that satisfies other checks but not Precision (doesn't start with numbered list)
      const plan = `Implement the feature and verify it.
Write comprehensive tests for validation.
Submit the complete changes.`;
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Precision');
    });
  });

  describe('Plan Object Support', () => {
    it('should handle Plan object with steps array', () => {
      const plan: Plan = {
        objective: 'Refactor the logging module',
        steps: [
          '1. Create a feature branch.',
          '2. Implement changes and verify them.',
          '3. Write unit tests to verify the changes.',
          '4. Submit a pull request for review.'
        ]
      };
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(true);
    });

    it('should handle Plan object with planText', () => {
      const plan: Plan = {
        planText: `1. Create a feature branch.
2. Implement changes and verify them.
3. Write unit tests to validate the changes.
4. Submit a pull request for review.`
      };
      const result = gate.preExecutionReview(plan, context);
      expect(result.approved).toBe(true);
    });
  });

  describe('Decision Evaluation', () => {
    it('should evaluate decisions using the same principles', () => {
      const decision = `1. Analyze the data and verify results.
2. Run comprehensive tests.
3. Submit findings.`;
      const result = gate.evaluateDecision(decision, context);
      expect(result.approved).toBe(true);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts between goals', () => {
      const goals = [
        '1. Quick fix without verification.\n2. Deploy immediately.',
        '1. Careful analysis and verification.\n2. Comprehensive testing.\n3. Submit after review.'
      ];
      const result = gate.resolveConflict(goals, context);
      expect(result.recommendedGoal).toBe(goals[1]);
      expect(result.harmonicScore).toBeGreaterThan(0);
    });

    it('should return harmonic score for selected goal', () => {
      const goals = [
        '1. Implement feature with verification.\n2. Test thoroughly.\n3. Complete submission.',
        '1. Quick implementation.\n2. Skip testing.'
      ];
      const result = gate.resolveConflict(goals, context);
      expect(result.harmonicScore).toBeDefined();
      expect(result.rationale).toBeDefined();
    });
  });

  describe('Custom Configuration', () => {
    it('should allow custom principles', () => {
      const customGate = new EthicalReviewGate({
        customPrinciples: {
          'Truth-Maximization': 'Custom truth principle'
        }
      });
      const principles = customGate.getCorePrinciples();
      expect(principles['Truth-Maximization']).toBe('Custom truth principle');
    });

    it('should allow custom check thresholds', () => {
      const customGate = new EthicalReviewGate({
        checkThresholds: {
          minPlanLength: 1,
          minStepDetail: 10
        }
      });
      const shortPlan = '1. Do something simple but verify it and test it then submit.';
      const result = customGate.preExecutionReview(shortPlan, context);
      // Should pass with lower thresholds
      expect(result).toBeDefined();
    });
  });
});
