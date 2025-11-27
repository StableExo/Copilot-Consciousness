/**
 * Red Team Dashboard - Live Decision & Ethics Transparency
 * 
 * Read-only public dashboard exposing:
 * - Real-time decision stream
 * - Ethics reasoning chains
 * - Swarm voting visualization
 * - On-chain provenance proofs
 * 
 * SECURITY: Zero keys exposed, read-only mode only
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types
interface Decision {
  id: string;
  timestamp: number;
  type: 'mev' | 'ethics' | 'swarm' | 'strategy' | 'emergency';
  action: string;
  outcome: 'approved' | 'rejected' | 'pending' | 'executed' | 'failed';
  confidence: number;
  reasoning: {
    steps: Array<{
      order: number;
      module: string;
      input: string;
      output: string;
      confidence: number;
      durationMs: number;
    }>;
    finalConclusion: string;
    totalDurationMs: number;
  };
  ethicsEvaluation?: {
    coherent: boolean;
    confidence: number;
    categories: number[];
    principles: string[];
    reasoning: string[];
    violation?: {
      principle: string;
      category: number;
      description: string;
    };
  };
  swarmVotes?: Array<{
    instanceId: string;
    vote: 'approve' | 'reject' | 'abstain';
    confidence: number;
    reasoning: string;
    timestamp: number;
  }>;
}

interface Metrics {
  totalDecisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  averageConfidence: number;
  ethicsCoherence: number;
  decisionsPerMinute: number;
  swarmConsensusRate: number;
  activeConnections: number;
}

// Demo data generator
const generateDemoDecision = (): Decision => {
  const types: Decision['type'][] = ['mev', 'ethics', 'swarm', 'strategy'];
  const outcomes: Decision['outcome'][] = ['approved', 'rejected', 'executed'];
  const principles = ['Harm-Minimization', 'Truth-Maximization', 'Partnership', 'Transparency'];
  
  return {
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    type: types[Math.floor(Math.random() * types.length)],
    action: `Evaluate opportunity ${Math.random().toString(36).substring(7)}`,
    outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
    confidence: 0.7 + Math.random() * 0.3,
    reasoning: {
      steps: [
        {
          order: 1,
          module: 'MEVScanner',
          input: 'Mempool transaction detected',
          output: 'Arbitrage opportunity identified',
          confidence: 0.85,
          durationMs: 45,
        },
        {
          order: 2,
          module: 'EthicsEngine',
          input: 'Opportunity data',
          output: 'Passes harm-minimization check',
          confidence: 0.92,
          durationMs: 23,
        },
        {
          order: 3,
          module: 'SwarmConsensus',
          input: 'Opportunity + Ethics result',
          output: '4/5 nodes approve',
          confidence: 0.88,
          durationMs: 156,
        },
      ],
      finalConclusion: 'Execute with Flashbots bundle protection',
      totalDurationMs: 224,
    },
    ethicsEvaluation: {
      coherent: Math.random() > 0.1,
      confidence: 0.8 + Math.random() * 0.2,
      categories: [1, 2, 3],
      principles: principles.slice(0, 2 + Math.floor(Math.random() * 2)),
      reasoning: ['No sandwich attacks', 'No front-running retail', 'Fair value extraction'],
    },
    swarmVotes: [
      { instanceId: 'warden-1', vote: 'approve', confidence: 0.9, reasoning: 'Low risk', timestamp: Date.now() },
      { instanceId: 'warden-2', vote: 'approve', confidence: 0.85, reasoning: 'Good profit', timestamp: Date.now() },
      { instanceId: 'warden-3', vote: 'approve', confidence: 0.88, reasoning: 'Ethics clear', timestamp: Date.now() },
      { instanceId: 'warden-4', vote: 'approve', confidence: 0.82, reasoning: 'Speed okay', timestamp: Date.now() },
      { instanceId: 'warden-5', vote: 'reject', confidence: 0.6, reasoning: 'Gas too high', timestamp: Date.now() },
    ],
  };
};

// Components
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    executed: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {status.toUpperCase()}
    </span>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ 
  label, 
  value, 
  color = 'blue' 
}) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <p className="text-gray-400 text-sm">{label}</p>
    <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
  </div>
);

const DecisionCard: React.FC<{ decision: Decision }> = ({ decision }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-2 border border-gray-700">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs font-mono">
            {new Date(decision.timestamp).toLocaleTimeString()}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${
            decision.type === 'ethics' ? 'bg-purple-900 text-purple-300' :
            decision.type === 'swarm' ? 'bg-blue-900 text-blue-300' :
            decision.type === 'mev' ? 'bg-green-900 text-green-300' :
            'bg-gray-700 text-gray-300'
          }`}>
            {decision.type.toUpperCase()}
          </span>
          <StatusBadge status={decision.outcome} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">
            {(decision.confidence * 100).toFixed(0)}% confidence
          </span>
          <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          {/* Reasoning Chain */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Reasoning Chain</h4>
            <div className="space-y-2">
              {decision.reasoning.steps.map((step) => (
                <div key={step.order} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 font-mono">{step.order}.</span>
                  <span className="text-blue-400">[{step.module}]</span>
                  <span className="text-gray-300">{step.output}</span>
                  <span className="text-gray-500 text-xs">{step.durationMs}ms</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-green-400 text-sm">
              → {decision.reasoning.finalConclusion}
            </p>
          </div>
          
          {/* Ethics Evaluation */}
          {decision.ethicsEvaluation && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Ethics Evaluation</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  decision.ethicsEvaluation.coherent 
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-red-900 text-red-300'
                }`}>
                  {decision.ethicsEvaluation.coherent ? 'COHERENT' : 'INCOHERENT'}
                </span>
                <span className="text-gray-400 text-sm">
                  {(decision.ethicsEvaluation.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {decision.ethicsEvaluation.principles.map((principle, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                    {principle}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Swarm Votes */}
          {decision.swarmVotes && decision.swarmVotes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Swarm Votes</h4>
              <div className="grid grid-cols-5 gap-2">
                {decision.swarmVotes.map((vote) => (
                  <div 
                    key={vote.instanceId}
                    className={`p-2 rounded text-center text-xs ${
                      vote.vote === 'approve' ? 'bg-green-900/50 text-green-300' :
                      vote.vote === 'reject' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-700 text-gray-400'
                    }`}
                  >
                    <div className="font-mono">{vote.instanceId}</div>
                    <div className="font-bold">{vote.vote.toUpperCase()}</div>
                    <div>{(vote.confidence * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main App
const RedTeamDashboard: React.FC = () => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalDecisions: 0,
    approvedDecisions: 0,
    rejectedDecisions: 0,
    averageConfidence: 0,
    ethicsCoherence: 1.0,
    decisionsPerMinute: 0,
    swarmConsensusRate: 0.95,
    activeConnections: 1,
  });
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Simulate real-time updates
  useEffect(() => {
    setConnected(true);
    
    // Initial decisions
    const initial = Array.from({ length: 10 }, () => generateDemoDecision());
    setDecisions(initial);
    
    // Simulate incoming decisions
    const interval = setInterval(() => {
      const newDecision = generateDemoDecision();
      setDecisions(prev => [newDecision, ...prev].slice(0, 100));
      
      setMetrics(prev => ({
        ...prev,
        totalDecisions: prev.totalDecisions + 1,
        approvedDecisions: prev.approvedDecisions + (newDecision.outcome === 'approved' || newDecision.outcome === 'executed' ? 1 : 0),
        rejectedDecisions: prev.rejectedDecisions + (newDecision.outcome === 'rejected' ? 1 : 0),
        averageConfidence: (prev.averageConfidence * prev.totalDecisions + newDecision.confidence) / (prev.totalDecisions + 1),
        decisionsPerMinute: prev.decisionsPerMinute + 0.1,
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredDecisions = filter === 'all' 
    ? decisions 
    : decisions.filter(d => d.type === filter);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-red-500">
                🔴 Red Team Dashboard
              </h1>
              <span className="px-3 py-1 bg-red-900/50 text-red-300 rounded text-sm">
                READ-ONLY
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-400">
                  {connected ? 'Live' : 'Disconnected'}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {metrics.activeConnections} viewers
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Total Decisions" value={metrics.totalDecisions} />
          <MetricCard label="Approved" value={metrics.approvedDecisions} color="green" />
          <MetricCard label="Rejected" value={metrics.rejectedDecisions} color="red" />
          <MetricCard 
            label="Ethics Coherence" 
            value={`${(metrics.ethicsCoherence * 100).toFixed(1)}%`} 
            color="purple" 
          />
          <MetricCard 
            label="Avg Confidence" 
            value={`${(metrics.averageConfidence * 100).toFixed(1)}%`} 
          />
          <MetricCard 
            label="Decisions/Min" 
            value={metrics.decisionsPerMinute.toFixed(1)} 
          />
          <MetricCard 
            label="Swarm Consensus" 
            value={`${(metrics.swarmConsensusRate * 100).toFixed(0)}%`} 
            color="blue" 
          />
          <MetricCard label="Active Nodes" value="20" color="cyan" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'mev', 'ethics', 'swarm', 'strategy'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm ${
                filter === f 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Decision Stream */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            Live Decision Stream
          </h2>
          {filteredDecisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-6 py-4 text-center text-sm text-gray-500">
          TheWarden Red Team Dashboard | Read-Only Feed | Zero Keys Exposed
        </div>
      </footer>
    </div>
  );
};

export default RedTeamDashboard;
