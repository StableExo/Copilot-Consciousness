/**
 * Phase 2 Tools MCP Server
 * 
 * Provides MCP interface for EthicsChecker and TestCoverageAnalyzer tools
 * created in Phase 2 for blockchain deployment readiness
 */

import { BaseMcpServer } from '../base/BaseMcpServer.js';
import {
  McpTool,
  CallToolParams,
  CallToolResult,
} from '../types/protocol.js';
import { EthicsChecker, EthicsCheckRequest } from '../../tools/ethics/EthicsChecker.js';
import { TestCoverageAnalyzer } from '../../tools/testing/TestCoverageAnalyzer.js';

export class Phase2ToolsServer extends BaseMcpServer {
  private ethicsChecker: EthicsChecker;
  private testCoverageAnalyzer: TestCoverageAnalyzer;

  constructor() {
    super({
      name: 'phase2-tools',
      version: '1.0.0',
      description: 'Phase 2 deployment readiness tools: ethics checking and test coverage analysis',
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
    });

    this.ethicsChecker = new EthicsChecker();
    this.testCoverageAnalyzer = new TestCoverageAnalyzer();

    this.registerMethod('tools/list', this.handleListTools.bind(this));
    this.registerMethod('tools/call', this.handleCallTool.bind(this));
  }

  protected async onInitialized(): Promise<void> {
    this.log('Phase 2 Tools MCP Server initialized');
  }

  private async handleListTools(): Promise<{ tools: McpTool[] }> {
    return {
      tools: [
        {
          name: 'check_ethics',
          description: 'Check if an action is ethically aligned with ground zero principles',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'The action to evaluate (e.g., "execute_arbitrage", "frontrun_transaction")',
              },
              context: {
                type: 'object',
                description: 'Context about the action',
                properties: {
                  description: {
                    type: 'string',
                    description: 'Detailed description of what the action does',
                  },
                  intent: {
                    type: 'string',
                    description: 'The intended purpose or goal',
                  },
                  consequences: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Potential consequences of the action',
                  },
                  stakeholders: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Who will be affected by this action',
                  },
                },
                required: ['description'],
              },
              mevContext: {
                type: 'object',
                description: 'MEV-specific context if applicable',
                properties: {
                  targetType: {
                    type: 'string',
                    description: 'Type of target (e.g., "retail_trader", "whale", "protocol")',
                  },
                  victimProfile: {
                    type: 'string',
                    description: 'Profile of potential victim',
                  },
                  profitAmount: {
                    type: 'number',
                    description: 'Expected profit in USD',
                  },
                },
              },
            },
            required: ['action', 'context'],
          },
        },
        {
          name: 'get_ethical_guidance',
          description: 'Get ethical guidance for a situation without evaluating a specific action',
          inputSchema: {
            type: 'object',
            properties: {
              situation: {
                type: 'string',
                description: 'Description of the situation requiring ethical guidance',
              },
            },
            required: ['situation'],
          },
        },
        {
          name: 'analyze_test_coverage',
          description: 'Analyze test coverage across the codebase and identify gaps',
          inputSchema: {
            type: 'object',
            properties: {
              module: {
                type: 'string',
                description: 'Optional: Analyze a specific module (e.g., "cognitive", "execution")',
              },
            },
          },
        },
      ],
    };
  }

  private async handleCallTool(params: CallToolParams): Promise<CallToolResult> {
    try {
      switch (params.name) {
        case 'check_ethics':
          return await this.handleCheckEthics(params.arguments as any);
        
        case 'get_ethical_guidance':
          return await this.handleGetGuidance(params.arguments as any);
        
        case 'analyze_test_coverage':
          return await this.handleAnalyzeCoverage(params.arguments as any);
        
        default:
          return {
            content: [{
              type: 'text',
              text: `Unknown tool: ${params.name}`,
            }],
            isError: true,
          };
      }
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  private async handleCheckEthics(args: EthicsCheckRequest): Promise<CallToolResult> {
    const result = await this.ethicsChecker.check(args);

    let text = `# Ethics Check Result\n\n`;
    text += `**Action**: ${args.action}\n`;
    text += `**Aligned**: ${result.aligned ? '✅ YES' : '❌ NO'}\n`;
    text += `**Confidence**: ${(result.confidence * 100).toFixed(1)}%\n\n`;

    text += `## Principles Evaluated\n`;
    result.principles.forEach(p => {
      text += `- ${p}\n`;
    });

    text += `\n## Reasoning\n`;
    result.reasoning.forEach(r => {
      text += `- ${r}\n`;
    });

    text += `\n## Recommendation\n${result.recommendation}\n`;

    if (result.violation) {
      text += `\n## ⚠️ Violation Detected\n`;
      text += `**Principle**: ${result.violation.principle}\n`;
      text += `**Severity**: ${result.violation.severity.toUpperCase()}\n`;
      text += `**Description**: ${result.violation.description}\n`;
    }

    return {
      content: [{ type: 'text', text }],
    };
  }

  private async handleGetGuidance(args: { situation: string }): Promise<CallToolResult> {
    const guidance = await this.ethicsChecker.getGuidance(args.situation);

    let text = `# Ethical Guidance\n\n`;
    text += `**Situation**: ${args.situation}\n\n`;

    text += `## Relevant Principles\n`;
    guidance.principles.forEach(p => {
      text += `- ${p}\n`;
    });

    text += `\n## Recommendations\n`;
    guidance.recommendations.forEach(r => {
      text += `- ${r}\n`;
    });

    if (guidance.warnings.length > 0) {
      text += `\n## ⚠️ Warnings\n`;
      guidance.warnings.forEach(w => {
        text += `- ${w}\n`;
      });
    }

    return {
      content: [{ type: 'text', text }],
    };
  }

  private async handleAnalyzeCoverage(args: { module?: string }): Promise<CallToolResult> {
    let text = `# Test Coverage Analysis\n\n`;

    if (args.module) {
      // Module-specific analysis
      const result = await this.testCoverageAnalyzer.analyzeModule(args.module);
      
      text += `**Module**: ${args.module}\n`;
      text += `**Coverage**: ${result.coverage.toFixed(1)}%\n`;
      text += `**Files Analyzed**: ${result.files.length}\n\n`;

      if (result.gaps.length > 0) {
        text += `## Untested Files (${result.gaps.length})\n`;
        result.gaps.forEach(gap => {
          text += `- ${gap}\n`;
        });
      } else {
        text += `✅ All files in this module have tests!\n`;
      }
    } else {
      // Full project analysis
      const report = await this.testCoverageAnalyzer.analyze();

      text += `**Total Files**: ${report.totalFiles}\n`;
      text += `**Tested Files**: ${report.testedFiles}\n`;
      text += `**Coverage**: ${report.coveragePercentage.toFixed(1)}%\n\n`;

      if (report.criticalGaps.length > 0) {
        text += `## ⚠️ Critical Gaps (${report.criticalGaps.length})\n\n`;
        report.criticalGaps.forEach(gap => {
          const emoji = gap.priority === 'critical' ? '🔴' : 
                       gap.priority === 'high' ? '🟠' : 
                       gap.priority === 'medium' ? '🟡' : '🟢';
          text += `${emoji} **${gap.file}**\n`;
          text += `   Priority: ${gap.priority.toUpperCase()}\n`;
          text += `   Reason: ${gap.reason}\n\n`;
        });
      }

      text += `## Recommendations\n`;
      report.recommendations.forEach(rec => {
        text += `- ${rec}\n`;
      });

      if (report.untestedFiles.length > 0 && report.untestedFiles.length <= 10) {
        text += `\n## Untested Files\n`;
        report.untestedFiles.forEach(file => {
          text += `- ${file}\n`;
        });
      } else if (report.untestedFiles.length > 10) {
        text += `\n${report.untestedFiles.length} files without tests (use module-specific analysis for details)\n`;
      }
    }

    return {
      content: [{ type: 'text', text }],
    };
  }
}
