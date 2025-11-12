/**
 * Basic test for Context Framework modules
 */

import { AutonomousGoals, GoalPriority, GoalStatus } from '../autonomous-goals';
import { OperationalPlaybook, OperationType } from '../operational-playbook';

describe('Context Framework', () => {
  describe('AutonomousGoals', () => {
    it('should create and track goals', () => {
      const goals = new AutonomousGoals();
      
      const goal = goals.createGoal(
        'Test Goal',
        'A test goal for verification',
        GoalPriority.HIGH
      );

      expect(goal.name).toBe('Test Goal');
      expect(goal.status).toBe(GoalStatus.ACTIVE);
      expect(goal.priority).toBe(GoalPriority.HIGH);
      expect(goal.progress).toBe(0);

      const activeGoals = goals.getActiveGoals();
      expect(activeGoals.length).toBe(1);
      expect(activeGoals[0].id).toBe(goal.id);
    });

    it('should update goal progress', () => {
      const goals = new AutonomousGoals();
      const goal = goals.createGoal('Progress Test', 'Testing progress updates');

      const updated = goals.updateProgress(goal.id, 50, { completionRate: 0.5 });
      expect(updated).toBe(true);

      const retrieved = goals.getGoal(goal.id);
      expect(retrieved?.progress).toBe(50);
      expect(retrieved?.metrics.completionRate).toBe(0.5);
    });

    it('should auto-complete goals at 100%', () => {
      const goals = new AutonomousGoals();
      const goal = goals.createGoal('Auto Complete', 'Testing auto-completion');

      goals.updateProgress(goal.id, 100);

      const retrieved = goals.getGoal(goal.id);
      expect(retrieved?.status).toBe(GoalStatus.COMPLETED);
      expect(retrieved?.completedAt).toBeDefined();
    });
  });

  describe('OperationalPlaybook', () => {
    it('should register playbooks', () => {
      const playbook = new OperationalPlaybook();
      
      const entry = playbook.registerPlaybook(
        'Test Procedure',
        OperationType.DECISION,
        'A test decision procedure',
        [
          {
            order: 1,
            action: 'analyze',
            description: 'Analyze the situation',
            requiredInputs: ['context'],
            expectedOutputs: ['analysis'],
            validationCriteria: ['complete'],
            criticalStep: true
          }
        ]
      );

      expect(entry.name).toBe('Test Procedure');
      expect(entry.operationType).toBe(OperationType.DECISION);
      expect(entry.steps.length).toBe(1);
    });

    it('should make decisions with alternatives', () => {
      const playbook = new OperationalPlaybook();
      
      const entry = playbook.registerPlaybook(
        'Decision Test',
        OperationType.DECISION,
        'Testing decision making',
        []
      );

      const decision = playbook.makeDecision(
        entry.id,
        { situation: 'test' },
        [
          {
            id: 'alt1',
            name: 'Option 1',
            description: 'First option',
            estimatedRisk: 0.2,
            estimatedReward: 0.8,
            requiredResources: [],
            constraints: [],
            score: 0
          },
          {
            id: 'alt2',
            name: 'Option 2',
            description: 'Second option',
            estimatedRisk: 0.5,
            estimatedReward: 0.5,
            requiredResources: [],
            constraints: [],
            score: 0
          }
        ]
      );

      expect(decision.selectedAlternative).toBe('alt1'); // Lower risk, higher reward
      expect(decision.confidence).toBeGreaterThan(0);
    });
  });
});
