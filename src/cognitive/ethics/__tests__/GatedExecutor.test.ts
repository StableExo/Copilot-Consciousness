/**
 * GatedExecutor Tests
 */

import { GatedExecutor } from '../GatedExecutor';
import { EthicalReviewGate } from '../EthicalReviewGate';

describe('GatedExecutor', () => {
  let executor: GatedExecutor;

  beforeEach(() => {
    executor = new GatedExecutor();
  });

  describe('runGatedPlan', () => {
    it('should approve a well-formed plan', () => {
      const plan = `
1. Analyze the requirements and verify understanding
2. Implement the feature with comprehensive error handling
3. Write thorough unit tests to validate functionality
4. Run pre-commit checks and code review
5. Submit pull request for team review
`;

      const result = executor.runGatedPlan(
        plan,
        'Implement new feature',
        'Add user authentication'
      );

      expect(result.approved).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context.currentBranch).toBeDefined();
      expect(result.context.workingDirectory).toBeDefined();
    });

    it('should reject a plan without verification steps', () => {
      const plan = `
1. Quick implementation
2. Deploy to production
`;

      const result = executor.runGatedPlan(plan, 'Quick fix', 'Hotfix for bug');

      expect(result.approved).toBe(false);
      expect(result.rationale).toContain('Truth-Maximization');
    });

    it('should reject a plan without testing', () => {
      const plan = `
1. Write the code
2. Check if it compiles
3. Push to main branch
`;

      const result = executor.runGatedPlan(plan, 'Add feature', 'Feature implementation');

      expect(result.approved).toBe(false);
      expect(result.rationale).toMatch(/Harm-Minimization|Accountability/);
    });

    it('should handle Plan object format', () => {
      const plan = {
        objective: 'Refactor authentication',
        steps: [
          '1. Review current implementation and verify security',
          '2. Implement improvements with tests',
          '3. Run comprehensive test suite',
          '4. Submit for security review',
        ],
        acknowledgedContext: true,
      };

      const result = executor.runGatedPlan(plan, 'Refactor authentication', 'Security improvement');

      expect(result.approved).toBe(true);
    });

    it('should gather execution context', () => {
      const plan = `
1. Verify the data sources
2. Implement validation with tests
3. Complete and submit the changes
`;

      const result = executor.runGatedPlan(plan, 'Data validation', 'Add validation');

      expect(result.context).toBeDefined();
      expect(result.context.currentBranch).toBeDefined();
      expect(result.context.workingDirectory).toBeDefined();
      expect(result.context.fileSystemState).toBeDefined();
      expect(result.context.gitStatus).toBeDefined();
      expect(result.context.userDirective).toBe('Add validation');
    });
  });

  describe('quickCheck', () => {
    it('should approve ethical decisions', () => {
      // Decision must include verification, testing, and completion keywords
      const decision =
        '1. Implement feature\n2. Verify and test thoroughly\n3. Complete and submit';
      const approved = executor.quickCheck(decision);

      expect(approved).toBe(true);
    });

    it('should reject unethical decisions', () => {
      const decision = 'Quick implementation, deploy now';
      const approved = executor.quickCheck(decision);

      expect(approved).toBe(false);
    });
  });

  describe('getGate', () => {
    it('should return the underlying ethics gate', () => {
      const gate = executor.getGate();

      expect(gate).toBeInstanceOf(EthicalReviewGate);
    });
  });

  describe('custom gate integration', () => {
    it('should work with custom ethics gate', () => {
      const customGate = new EthicalReviewGate({
        checkThresholds: {
          minPlanLength: 4,
          minStepDetail: 25,
        },
      });

      const customExecutor = new GatedExecutor(customGate);

      const plan = `
1. Very detailed analysis and verification of all requirements
2. Comprehensive implementation with extensive error handling
3. Thorough testing suite covering all edge cases
4. Complete code review and final submission
`;

      const result = customExecutor.runGatedPlan(plan, 'Complex feature', 'Feature request');

      expect(result.approved).toBe(true);
    });
  });
});
