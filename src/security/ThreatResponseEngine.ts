/**
 * ThreatResponseEngine - Automated Threat Response
 *
 * Phase 3: Enhanced Security
 *
 * This component automatically responds to detected security threats
 * with appropriate actions based on threat severity and type.
 *
 * Core capabilities:
 * - Automated threat classification and prioritization
 * - Context-aware response action selection
 * - Multi-tier response escalation
 * - Response coordination across system components
 *
 * Integration with TheWarden/AEV:
 * - Responds to threats from IntrusionDetectionService
 * - Coordinates with SecurityManager for action execution
 * - Integrates with ArbitrageConsciousness for trading halts
 * - Reports to AuditLogger for compliance
 */

import { EventEmitter } from 'events';
import { ThreatEvent, ResponseAction, ResponseActionType, ThreatType } from './types';

interface ThreatResponseConfig {
  autoRespond: boolean;
  responseDelay: number; // ms
  escalationThreshold: number;
  maxActionsPerThreat: number;
  requireOperatorApproval: boolean;
}

interface ResponseRule {
  threatType: ThreatType;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  actions: ResponseActionType[];
  priority: number;
  requiresApproval: boolean;
}

/**
 * Automated Threat Response Engine
 */
export class ThreatResponseEngine extends EventEmitter {
  private config: ThreatResponseConfig;
  private responseRules: ResponseRule[] = [];
  private activeResponses: Map<string, ResponseAction> = new Map();
  private threatHistory: ThreatEvent[] = [];
  private responseCount: number = 0;
  private pendingApprovals: ResponseAction[] = [];

  constructor(config?: Partial<ThreatResponseConfig>) {
    super();

    this.config = {
      autoRespond: config?.autoRespond ?? true,
      responseDelay: config?.responseDelay ?? 1000, // 1 second delay for validation
      escalationThreshold: config?.escalationThreshold ?? 3,
      maxActionsPerThreat: config?.maxActionsPerThreat ?? 5,
      requireOperatorApproval: config?.requireOperatorApproval ?? false,
    };

    this.initializeResponseRules();

    console.log('[ThreatResponseEngine] Initialized with auto-respond:', this.config.autoRespond);
  }

  /**
   * Initialize default response rules
   */
  private initializeResponseRules(): void {
    this.responseRules = [
      // Critical threats - immediate action
      {
        threatType: 'flash_loan_attack',
        minSeverity: 'high',
        actions: ['halt_trading', 'alert_operator', 'log_extended'],
        priority: 10,
        requiresApproval: false,
      },
      {
        threatType: 'reentrancy_attempt',
        minSeverity: 'high',
        actions: ['halt_trading', 'reject_transaction', 'alert_operator'],
        priority: 10,
        requiresApproval: false,
      },
      {
        threatType: 'sandwich_attack',
        minSeverity: 'medium',
        actions: ['reject_transaction', 'increase_scrutiny', 'log_extended'],
        priority: 8,
        requiresApproval: false,
      },
      {
        threatType: 'frontrun_attempt',
        minSeverity: 'medium',
        actions: ['increase_scrutiny', 'pause_strategy', 'log_extended'],
        priority: 7,
        requiresApproval: false,
      },
      {
        threatType: 'price_manipulation',
        minSeverity: 'high',
        actions: ['halt_trading', 'isolate_chain', 'alert_operator'],
        priority: 9,
        requiresApproval: false,
      },

      // Access control threats
      {
        threatType: 'unauthorized_access',
        minSeverity: 'medium',
        actions: ['block_ip', 'ban_user', 'alert_operator', 'log_extended'],
        priority: 8,
        requiresApproval: false,
      },
      {
        threatType: 'brute_force',
        minSeverity: 'medium',
        actions: ['block_ip', 'throttle_requests', 'alert_operator'],
        priority: 7,
        requiresApproval: false,
      },

      // Data security threats
      {
        threatType: 'data_exfiltration',
        minSeverity: 'high',
        actions: ['ban_user', 'rotate_keys', 'alert_operator', 'log_extended'],
        priority: 9,
        requiresApproval: false,
      },
      {
        threatType: 'injection_attempt',
        minSeverity: 'medium',
        actions: ['block_ip', 'log_extended', 'alert_operator'],
        priority: 7,
        requiresApproval: false,
      },

      // MEV threats
      {
        threatType: 'mev_attack',
        minSeverity: 'medium',
        actions: ['pause_strategy', 'increase_scrutiny', 'log_extended'],
        priority: 6,
        requiresApproval: false,
      },

      // Rate limiting
      {
        threatType: 'rate_limit_abuse',
        minSeverity: 'low',
        actions: ['throttle_requests', 'block_ip', 'log_extended'],
        priority: 5,
        requiresApproval: false,
      },

      // Suspicious behavior
      {
        threatType: 'anomalous_behavior',
        minSeverity: 'medium',
        actions: ['increase_scrutiny', 'log_extended'],
        priority: 4,
        requiresApproval: true,
      },
      {
        threatType: 'suspicious_transaction',
        minSeverity: 'medium',
        actions: ['reject_transaction', 'increase_scrutiny', 'log_extended'],
        priority: 6,
        requiresApproval: false,
      },

      // Malicious contracts
      {
        threatType: 'malicious_contract',
        minSeverity: 'high',
        actions: ['reject_transaction', 'halt_trading', 'alert_operator'],
        priority: 9,
        requiresApproval: false,
      },

      // Phishing
      {
        threatType: 'phishing_attempt',
        minSeverity: 'medium',
        actions: ['block_ip', 'alert_operator', 'log_extended'],
        priority: 6,
        requiresApproval: false,
      },
    ];
  }

  /**
   * Handle a detected threat
   *
   * Primary integration point - called by IntrusionDetectionService
   *
   * @param threat Detected threat event
   * @returns Array of response actions taken
   */
  async handleThreat(threat: ThreatEvent): Promise<ResponseAction[]> {
    console.log(`[ThreatResponseEngine] Handling threat: ${threat.type} (${threat.severity})`);

    // Add to history
    this.threatHistory.push(threat);
    if (this.threatHistory.length > 1000) {
      this.threatHistory.shift();
    }

    // Find matching rules
    const matchingRules = this.findMatchingRules(threat);

    if (matchingRules.length === 0) {
      console.log(`[ThreatResponseEngine] No matching rules for threat type: ${threat.type}`);
      // Default action: log and alert
      matchingRules.push({
        threatType: threat.type,
        minSeverity: 'low',
        actions: ['log_extended', 'alert_operator'],
        priority: 3,
        requiresApproval: true,
      });
    }

    // Generate response actions
    const actions: ResponseAction[] = [];

    for (const rule of matchingRules) {
      for (const actionType of rule.actions) {
        const action = this.createResponseAction(
          threat,
          actionType,
          rule.priority,
          rule.requiresApproval
        );
        actions.push(action);
      }
    }

    // Limit actions per threat
    const limitedActions = actions.slice(0, this.config.maxActionsPerThreat);

    // Execute or queue actions
    if (this.config.autoRespond) {
      // Delay for validation
      if (this.config.responseDelay > 0) {
        await this.delay(this.config.responseDelay);
      }

      for (const action of limitedActions) {
        if (action.parameters.requiresApproval || this.config.requireOperatorApproval) {
          this.queueForApproval(action);
        } else {
          await this.executeAction(action);
        }
      }
    } else {
      // Queue all for approval
      for (const action of limitedActions) {
        this.queueForApproval(action);
      }
    }

    this.emit('threatHandled', {
      threat,
      actionsCount: limitedActions.length,
      autoExecuted: this.config.autoRespond,
    });

    return limitedActions;
  }

  /**
   * Find matching response rules for threat
   */
  private findMatchingRules(threat: ThreatEvent): ResponseRule[] {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const threatSeverityIndex = severityOrder.indexOf(threat.severity);

    return this.responseRules
      .filter((rule) => {
        if (rule.threatType !== threat.type) {
          return false;
        }

        const ruleSeverityIndex = severityOrder.indexOf(rule.minSeverity);
        return threatSeverityIndex >= ruleSeverityIndex;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create response action from threat and action type
   */
  private createResponseAction(
    threat: ThreatEvent,
    actionType: ResponseActionType,
    priority: number,
    requiresApproval: boolean
  ): ResponseAction {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine target
    const target = this.determineTarget(threat, actionType);

    // Build parameters
    const parameters: Record<string, any> = {
      threatId: threat.eventId,
      threatType: threat.type,
      threatSeverity: threat.severity,
      requiresApproval,
    };

    // Action-specific parameters
    switch (actionType) {
      case 'block_ip':
        parameters.duration = threat.severity === 'critical' ? '24h' : '1h';
        break;
      case 'ban_user':
        parameters.permanent = threat.severity === 'critical';
        break;
      case 'halt_trading':
        parameters.chains = threat.source.chainId ? [threat.source.chainId] : 'all';
        parameters.duration = '1h';
        break;
      case 'isolate_chain':
        parameters.chainId = threat.source.chainId;
        parameters.duration = '2h';
        break;
      case 'throttle_requests':
        parameters.maxRequests = 10;
        parameters.window = '1m';
        break;
      case 'rotate_keys':
        parameters.keyTypes = ['api', 'jwt'];
        break;
      case 'increase_scrutiny':
        parameters.targetEntity = target.identifier;
        parameters.duration = '6h';
        break;
    }

    // Generate reason
    const reason = this.generateReason(threat, actionType);

    return {
      actionId,
      timestamp: Date.now(),
      type: actionType,
      priority,
      target,
      parameters,
      executed: false,
      reason,
    };
  }

  /**
   * Determine action target from threat
   */
  private determineTarget(
    threat: ThreatEvent,
    actionType: ResponseActionType
  ): {
    type: 'user' | 'ip' | 'chain' | 'contract' | 'system';
    identifier: string;
  } {
    switch (actionType) {
      case 'block_ip':
        return {
          type: 'ip',
          identifier: threat.source.ipAddress ?? 'unknown',
        };
      case 'ban_user':
        return {
          type: 'user',
          identifier: threat.source.userId ?? 'unknown',
        };
      case 'isolate_chain':
        return {
          type: 'chain',
          identifier: threat.source.chainId?.toString() ?? 'unknown',
        };
      case 'reject_transaction':
      case 'halt_trading':
      case 'pause_strategy':
        return {
          type: 'system',
          identifier: threat.source.component ?? 'trading_engine',
        };
      default:
        return {
          type: 'system',
          identifier: 'global',
        };
    }
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(threat: ThreatEvent, actionType: ResponseActionType): string {
    const action = actionType.replace(/_/g, ' ');
    return `${action} in response to ${threat.type.replace(/_/g, ' ')} (${
      threat.severity
    } severity) - ${threat.description}`;
  }

  /**
   * Execute response action
   */
  private async executeAction(action: ResponseAction): Promise<void> {
    console.log(
      `[ThreatResponseEngine] Executing action: ${action.type} on ${action.target.type} ${action.target.identifier}`
    );

    try {
      // Mark as executing
      this.activeResponses.set(action.actionId, action);

      // Execute based on action type
      // In production, these would call actual system components
      switch (action.type) {
        case 'halt_trading':
          await this.haltTrading(action.parameters);
          break;
        case 'block_ip':
          await this.blockIP(action.target.identifier, action.parameters);
          break;
        case 'ban_user':
          await this.banUser(action.target.identifier, action.parameters);
          break;
        case 'isolate_chain':
          await this.isolateChain(action.parameters.chainId);
          break;
        case 'rotate_keys':
          await this.rotateKeys(action.parameters.keyTypes);
          break;
        case 'reject_transaction':
          await this.rejectTransaction(action.parameters);
          break;
        case 'pause_strategy':
          await this.pauseStrategy(action.parameters);
          break;
        case 'alert_operator':
          await this.alertOperator(action);
          break;
        case 'log_extended':
          await this.logExtended(action);
          break;
        case 'increase_scrutiny':
          await this.increaseScrutiny(action.target.identifier, action.parameters);
          break;
        case 'throttle_requests':
          await this.throttleRequests(action.target.identifier, action.parameters);
          break;
        case 'activate_safeguards':
          await this.activateSafeguards();
          break;
      }

      // Mark as executed
      action.executed = true;
      action.executedAt = Date.now();
      action.result = 'success';

      this.responseCount++;

      this.emit('actionExecuted', action);

      console.log(`[ThreatResponseEngine] Action executed successfully: ${action.type}`);
    } catch (error) {
      console.error(`[ThreatResponseEngine] Error executing action:`, error);

      action.executed = true;
      action.executedAt = Date.now();
      action.result = 'failure';
      action.error = error instanceof Error ? error.message : 'Unknown error';

      this.emit('actionFailed', { action, error });
    } finally {
      this.activeResponses.delete(action.actionId);
    }
  }

  /**
   * Queue action for operator approval
   */
  private queueForApproval(action: ResponseAction): void {
    this.pendingApprovals.push(action);

    this.emit('approvalRequired', action);

    console.log(`[ThreatResponseEngine] Action queued for approval: ${action.type}`);
  }

  /**
   * Approve and execute pending action
   */
  async approveAction(actionId: string): Promise<void> {
    const index = this.pendingApprovals.findIndex((a) => a.actionId === actionId);

    if (index === -1) {
      throw new Error(`Action ${actionId} not found in pending approvals`);
    }

    const action = this.pendingApprovals.splice(index, 1)[0];
    await this.executeAction(action);
  }

  /**
   * Reject pending action
   */
  rejectAction(actionId: string): void {
    const index = this.pendingApprovals.findIndex((a) => a.actionId === actionId);

    if (index === -1) {
      throw new Error(`Action ${actionId} not found in pending approvals`);
    }

    const action = this.pendingApprovals.splice(index, 1)[0];

    this.emit('actionRejected', action);

    console.log(`[ThreatResponseEngine] Action rejected: ${action.type}`);
  }

  // Action implementation methods (placeholders for integration)

  private async haltTrading(params: any): Promise<void> {
    // In production: call AdvancedOrchestrator.halt() or ArbitrageConsciousness.emergencyStop()
    console.log('[ThreatResponseEngine] HALT TRADING -', params);
  }

  private async blockIP(ip: string, params: any): Promise<void> {
    // In production: call IPWhitelistService.block()
    console.log('[ThreatResponseEngine] BLOCK IP -', ip, params);
  }

  private async banUser(userId: string, params: any): Promise<void> {
    // In production: call authentication service
    console.log('[ThreatResponseEngine] BAN USER -', userId, params);
  }

  private async isolateChain(chainId: number): Promise<void> {
    // In production: call ChainProviderManager.disableChain()
    console.log('[ThreatResponseEngine] ISOLATE CHAIN -', chainId);
  }

  private async rotateKeys(keyTypes: string[]): Promise<void> {
    // In production: call SecretsManager.rotateKeys()
    console.log('[ThreatResponseEngine] ROTATE KEYS -', keyTypes);
  }

  private async rejectTransaction(params: any): Promise<void> {
    // In production: add to rejection list
    console.log('[ThreatResponseEngine] REJECT TRANSACTION -', params);
  }

  private async pauseStrategy(params: any): Promise<void> {
    // In production: call strategy manager
    console.log('[ThreatResponseEngine] PAUSE STRATEGY -', params);
  }

  private async alertOperator(action: ResponseAction): Promise<void> {
    // In production: send notification via configured channels
    console.log('[ThreatResponseEngine] ALERT OPERATOR -', action.reason);
    this.emit('operatorAlert', action);
  }

  private async logExtended(action: ResponseAction): Promise<void> {
    // In production: call AuditLogger with extended detail
    console.log('[ThreatResponseEngine] LOG EXTENDED -', action);
  }

  private async increaseScrutiny(target: string, params: any): Promise<void> {
    // In production: increase monitoring level
    console.log('[ThreatResponseEngine] INCREASE SCRUTINY -', target, params);
  }

  private async throttleRequests(target: string, params: any): Promise<void> {
    // In production: call RateLimitService.throttle()
    console.log('[ThreatResponseEngine] THROTTLE REQUESTS -', target, params);
  }

  private async activateSafeguards(): Promise<void> {
    // In production: enable additional safety checks
    console.log('[ThreatResponseEngine] ACTIVATE SAFEGUARDS');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): ResponseAction[] {
    return [...this.pendingApprovals];
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      threatsHandled: this.threatHistory.length,
      responsesExecuted: this.responseCount,
      activeResponses: this.activeResponses.size,
      pendingApprovals: this.pendingApprovals.length,
      rulesConfigured: this.responseRules.length,
    };
  }

  /**
   * Add custom response rule
   */
  addRule(rule: ResponseRule): void {
    this.responseRules.push(rule);
    // Sort by priority
    this.responseRules.sort((a, b) => b.priority - a.priority);
    console.log(`[ThreatResponseEngine] Added custom rule for ${rule.threatType}`);
  }
}
