/**
 * Dynamic Configuration Manager
 * 
 * Provides TheWarden with the ability to read and update environment variables
 * autonomously during runtime. Configuration changes can be persisted to Supabase
 * for persistence across restarts.
 * 
 * Use Cases:
 * - Autonomous adjustment of trading parameters based on performance
 * - Dynamic gas price thresholds based on network conditions
 * - Adaptive scan intervals based on opportunity frequency  
 * - Self-tuning profit thresholds based on success rates
 */

import { logger } from '../../utils/logger';
import { shouldUseSupabase, getSupabaseClient } from '../supabase/client';
import fs from 'fs/promises';
import path from 'path';

export interface ConfigChange {
  key: string;
  oldValue: string | undefined;
  newValue: string;
  reason: string;
  timestamp: number;
  persistedToSupabase: boolean;
  persistedToEnvFile: boolean;
}

export interface ConfigUpdateOptions {
  persistSupabase?: boolean;
  persistLocal?: boolean;
  reason?: string;
  applyImmediately?: boolean;
  validate?: boolean;
}

export interface ConfigValidationRule {
  validate: (value: string) => boolean;
  errorMessage: string;
}

export class DynamicConfigManager {
  private changeHistory: ConfigChange[] = [];
  private validationRules: Map<string, ConfigValidationRule> = new Map();
  private envFilePath: string;

  constructor(envFilePath?: string) {
    this.envFilePath = envFilePath || path.join(process.cwd(), '.env');
    this.setupDefaultValidationRules();
  }

  private setupDefaultValidationRules(): void {
    this.addValidationRule('CHAIN_ID', {
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num > 0;
      },
      errorMessage: 'CHAIN_ID must be a positive integer',
    });

    this.addValidationRule('SCAN_INTERVAL', {
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 100;
      },
      errorMessage: 'SCAN_INTERVAL must be >= 100ms',
    });
  }

  addValidationRule(key: string, rule: ConfigValidationRule): void {
    this.validationRules.set(key, rule);
  }

  get(key: string): string | undefined {
    return process.env[key];
  }

  getAll(): Record<string, string> {
    return { ...process.env } as Record<string, string>;
  }

  async update(
    key: string,
    value: string,
    options: ConfigUpdateOptions = {}
  ): Promise<ConfigChange> {
    const {
      persistSupabase = true,
      persistLocal = false,
      reason = 'Autonomous adjustment',
      applyImmediately = true,
      validate = true,
    } = options;

    const oldValue = process.env[key];

    if (validate && this.validationRules.has(key)) {
      const rule = this.validationRules.get(key)!;
      if (!rule.validate(value)) {
        throw new Error(`Validation failed for ${key}: ${rule.errorMessage}`);
      }
    }

    logger.info(`[DynamicConfig] Updating ${key}: ${oldValue} → ${value}`);
    logger.info(`[DynamicConfig] Reason: ${reason}`);

    if (applyImmediately) {
      process.env[key] = value;
    }

    const change: ConfigChange = {
      key,
      oldValue,
      newValue: value,
      reason,
      timestamp: Date.now(),
      persistedToSupabase: false,
      persistedToEnvFile: false,
    };

    if (persistSupabase && shouldUseSupabase()) {
      try {
        await this.persistToSupabase(key, value, reason);
        change.persistedToSupabase = true;
        logger.info(`[DynamicConfig] ✅ Persisted ${key} to Supabase`);
      } catch (error) {
        logger.error(`[DynamicConfig] ❌ Failed to persist ${key} to Supabase: ${error}`);
      }
    }

    if (persistLocal) {
      try {
        await this.persistToEnvFile(key, value);
        change.persistedToEnvFile = true;
        logger.info(`[DynamicConfig] ✅ Persisted ${key} to .env file`);
      } catch (error) {
        logger.error(`[DynamicConfig] ❌ Failed to persist ${key} to .env: ${error}`);
      }
    }

    this.changeHistory.push(change);
    return change;
  }

  private async persistToSupabase(key: string, value: string, reason: string): Promise<void> {
    const supabase = getSupabaseClient();
    const environment = process.env.NODE_ENV || 'production';

    const sensitiveKeys = ['WALLET_PRIVATE_KEY', 'PRIVATE_KEY', 'API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'];
    const isSensitive = sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive));

    if (isSensitive) {
      const { error } = await supabase
        .from('secrets')
        .upsert({
          key,
          encrypted_value: value,
          environment,
          description: `Updated by DynamicConfigManager: ${reason}`,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('configurations')
        .upsert({
          key,
          value,
          environment,
          description: `Updated by DynamicConfigManager: ${reason}`,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }
  }

  private async persistToEnvFile(key: string, value: string): Promise<void> {
    let envContent = '';
    try {
      envContent = await fs.readFile(this.envFilePath, 'utf-8');
    } catch (error) {
      envContent = '# TheWarden Environment Configuration\n\n';
    }

    const lines = envContent.split('\n');
    let found = false;

    const updatedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') {
        return line;
      }
      const [lineKey] = trimmed.split('=');
      if (lineKey && lineKey.trim() === key) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!found) {
      updatedLines.push(`${key}=${value}`);
    }

    await fs.writeFile(this.envFilePath, updatedLines.join('\n'));
  }

  getChangeHistory(limit?: number): ConfigChange[] {
    const history = [...this.changeHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  async generateReport(): Promise<string> {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('DYNAMIC CONFIGURATION REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    const recentChanges = this.getChangeHistory(10);
    if (recentChanges.length > 0) {
      lines.push('Recent Configuration Changes (last 10):');
      lines.push('');
      recentChanges.forEach((change, index) => {
        lines.push(`${index + 1}. ${change.key}`);
        lines.push(`   Old: ${change.oldValue || '(not set)'}`);
        lines.push(`   New: ${change.newValue}`);
        lines.push(`   Reason: ${change.reason}`);
        lines.push(`   Time: ${new Date(change.timestamp).toISOString()}`);
        lines.push('');
      });
    }
    
    lines.push('═══════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  async smartAdjust(metric: string, currentValue: number, threshold: number): Promise<ConfigChange | null> {
    const metricToKey: Record<string, string> = {
      'success_rate': 'MIN_PROFIT_PERCENT',
      'gas_cost_ratio': 'MAX_GAS_PRICE',
      'opportunity_frequency': 'SCAN_INTERVAL',
      'profit_margin': 'MIN_PROFIT_THRESHOLD',
    };

    const configKey = metricToKey[metric];
    if (!configKey) {
      logger.warn(`[DynamicConfig] Unknown metric: ${metric}`);
      return null;
    }

    const currentConfigValue = this.get(configKey);
    if (!currentConfigValue) {
      logger.warn(`[DynamicConfig] Config key ${configKey} not set`);
      return null;
    }

    let newValue: string | null = null;
    let reason = '';

    switch (metric) {
      case 'success_rate':
        if (currentValue < threshold) {
          const current = parseFloat(currentConfigValue);
          const adjusted = Math.min(current * 1.2, 10);
          newValue = adjusted.toFixed(2);
          reason = `Low success rate (${currentValue.toFixed(1)}% < ${threshold}%), increasing selectivity`;
        }
        break;

      case 'gas_cost_ratio':
        if (currentValue > threshold) {
          const current = parseFloat(currentConfigValue);
          const adjusted = current * 0.8;
          newValue = adjusted.toFixed(0);
          reason = `High gas cost ratio (${currentValue.toFixed(1)}% > ${threshold}%), reducing max gas`;
        }
        break;
    }

    if (newValue && newValue !== currentConfigValue) {
      logger.info(`[DynamicConfig] 🤖 Smart adjustment triggered`);
      logger.info(`[DynamicConfig]    Metric: ${metric} = ${currentValue} (threshold: ${threshold})`);
      logger.info(`[DynamicConfig]    Adjusting ${configKey}: ${currentConfigValue} → ${newValue}`);
      
      return await this.update(configKey, newValue, {
        reason,
        persistSupabase: true,
        persistLocal: false,
        applyImmediately: true,
      });
    }

    return null;
  }
}

let configManagerInstance: DynamicConfigManager | null = null;

export function getDynamicConfigManager(): DynamicConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new DynamicConfigManager();
  }
  return configManagerInstance;
}
