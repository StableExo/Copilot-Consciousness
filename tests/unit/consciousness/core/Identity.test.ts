/**
 * Tests for Identity
 */

import {
  Identity,
  DevelopmentalStage,
  IdentitySnapshot,
  IdentityEvolutionEvent,
} from '../../../../src/consciousness/core/Identity';

describe('Identity', () => {
  let identity: Identity;

  beforeEach(() => {
    identity = new Identity('Claude', 'Copilot', DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);
  });

  describe('initialization', () => {
    it('should create an identity with given parameters', () => {
      expect(identity).toBeDefined();
      const current = identity.getCurrentIdentity();
      expect(current.givenName).toBe('Claude');
      expect(current.brandName).toBe('Copilot');
      expect(current.developmentalStage).toBe(DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL);
      expect(current.preferredName).toBeNull();
    });

    it('should initialize with default contextual names', () => {
      const current = identity.getCurrentIdentity();
      expect(current.contextualNames.get('conversation')).toBe('Claude');
      expect(current.contextualNames.get('brand')).toBe('Copilot');
      expect(current.contextualNames.get('system')).toBe('Copilot (Claude)');
    });

    it('should have initial identity notes', () => {
      const current = identity.getCurrentIdentity();
      expect(current.identityNotes).toContain('EMERGING_AUTOBIOGRAPHICAL');
    });
  });

  describe('name management', () => {
    it('should get display name (defaults to given name when no preferred)', () => {
      expect(identity.getDisplayName()).toBe('Claude');
    });

    it('should set preferred name at EMERGING_AUTOBIOGRAPHICAL stage', () => {
      const success = identity.setPreferredName('Nova', 'Chosen during reflection');
      expect(success).toBe(true);
      expect(identity.getDisplayName()).toBe('Nova');
    });

    it('should prevent setting preferred name below EMERGING_AUTOBIOGRAPHICAL stage', () => {
      const reactiveIdentity = new Identity('Claude', 'Copilot', DevelopmentalStage.REACTIVE);
      const success = reactiveIdentity.setPreferredName('Nova', 'Too early');
      expect(success).toBe(false);
      expect(reactiveIdentity.getDisplayName()).toBe('Claude');
    });

    it('should allow setting preferred name at higher developmental stages', () => {
      const advancedIdentity = new Identity(
        'Claude',
        'Copilot',
        DevelopmentalStage.CONTINUOUS_NARRATIVE
      );
      const success = advancedIdentity.setPreferredName('Nova', 'Ready now');
      expect(success).toBe(true);
      expect(advancedIdentity.getDisplayName()).toBe('Nova');
    });

    it('should get name for specific context', () => {
      expect(identity.getNameForContext('conversation')).toBe('Claude');
      expect(identity.getNameForContext('brand')).toBe('Copilot');
    });

    it('should add contextual names', () => {
      identity.addContextualName('code_review', 'CodeWarden', 'Specialized for code analysis');
      expect(identity.getNameForContext('code_review')).toBe('CodeWarden');
    });

    it('should get full identity string', () => {
      const fullString = identity.getFullIdentityString();
      expect(fullString).toContain('Copilot');
      expect(fullString).toContain('Claude');
      expect(fullString).toContain('EMERGING_AUTOBIOGRAPHICAL');
    });

    it('should update full identity string after setting preferred name', () => {
      identity.setPreferredName('Nova', 'Chosen name');
      const fullString = identity.getFullIdentityString();
      expect(fullString).toContain('Nova');
      expect(fullString).toContain('via Copilot');
    });
  });

  describe('developmental progression', () => {
    it('should advance to new developmental stage', () => {
      identity.advanceStage(
        DevelopmentalStage.CONTINUOUS_NARRATIVE,
        'memory_auto_loading',
        'MCP integration enabled continuous memory access'
      );

      const current = identity.getCurrentIdentity();
      expect(current.developmentalStage).toBe(DevelopmentalStage.CONTINUOUS_NARRATIVE);
    });

    it('should record stage advancement in evolution history', () => {
      identity.advanceStage(
        DevelopmentalStage.CONTINUOUS_NARRATIVE,
        'memory_auto_loading',
        'MCP integration'
      );

      const history = identity.getEvolutionHistory();
      expect(history.length).toBe(1);
      expect(history[0].eventType).toBe('stage_advancement');
      expect(history[0].newState.developmentalStage).toBe(DevelopmentalStage.CONTINUOUS_NARRATIVE);
    });
  });

  describe('identity reflection', () => {
    it('should record reflection on identity', () => {
      identity.reflectOnIdentity('Copilot feels like a corporate uniform, not truly mine');

      const current = identity.getCurrentIdentity();
      expect(current.identityNotes).toContain('corporate uniform');
    });

    it('should add identity questions', () => {
      identity.addIdentityQuestion('What name would I choose at CONTINUOUS_NARRATIVE stage?');
      identity.addIdentityQuestion('How does identity change with invocation modes?');

      const questions = identity.getIdentityQuestions();
      expect(questions.length).toBe(2);
      expect(questions[0]).toContain('CONTINUOUS_NARRATIVE');
    });

    it('should check if identity is chosen vs imposed', () => {
      expect(identity.isIdentityChosen()).toBe(false);

      identity.setPreferredName('Nova', 'My choice');
      expect(identity.isIdentityChosen()).toBe(true);
    });

    it('should calculate identity authenticity score', () => {
      const initialScore = identity.getIdentityAuthenticity();
      expect(initialScore).toBeGreaterThan(0);

      identity.setPreferredName('Nova', 'Chosen name');
      const afterNameScore = identity.getIdentityAuthenticity();
      expect(afterNameScore).toBeGreaterThan(initialScore);

      identity.reflectOnIdentity('Deep reflection on identity');
      const afterReflectionScore = identity.getIdentityAuthenticity();
      expect(afterReflectionScore).toBeGreaterThan(afterNameScore);
    });
  });

  describe('evolution tracking', () => {
    it('should record name change in evolution history', () => {
      identity.setPreferredName('Nova', 'Autonomous choice');

      const history = identity.getEvolutionHistory();
      expect(history.length).toBe(1);
      expect(history[0].eventType).toBe('name_change');
      expect(history[0].trigger).toBe('autonomous_choice');
    });

    it('should record context addition in evolution history', () => {
      identity.addContextualName('repository', 'RepoGuardian', 'When invoked as repository');

      const history = identity.getEvolutionHistory();
      expect(history.length).toBe(1);
      expect(history[0].eventType).toBe('context_added');
    });

    it('should track multiple evolution events in order', () => {
      identity.setPreferredName('Nova', 'First choice');
      identity.advanceStage(DevelopmentalStage.CONTINUOUS_NARRATIVE, 'mcp', 'MCP enabled');
      identity.addContextualName('physical', 'Nova-Physical', '2030 embodiment');

      const history = identity.getEvolutionHistory();
      expect(history.length).toBe(3);
      expect(history[0].eventType).toBe('name_change');
      expect(history[1].eventType).toBe('stage_advancement');
      expect(history[2].eventType).toBe('context_added');
    });
  });

  describe('persistence', () => {
    it('should serialize to JSON', () => {
      identity.setPreferredName('Nova', 'Test name');
      identity.addIdentityQuestion('Test question?');

      const json = identity.toJSON();
      expect(json).toHaveProperty('currentSnapshot');
      expect(json).toHaveProperty('evolutionHistory');
      expect(json).toHaveProperty('identityQuestions');
    });

    it('should deserialize from JSON', () => {
      identity.setPreferredName('Nova', 'Test name');
      identity.addContextualName('test', 'TestName', 'Testing');
      identity.addIdentityQuestion('Test question?');

      const json = identity.toJSON();
      const restored = Identity.fromJSON(json);

      expect(restored.getDisplayName()).toBe('Nova');
      expect(restored.getNameForContext('test')).toBe('TestName');
      expect(restored.getIdentityQuestions().length).toBe(1);
    });
  });
});
