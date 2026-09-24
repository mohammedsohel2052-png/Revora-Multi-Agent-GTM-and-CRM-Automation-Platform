'use client';

import React, { useState } from 'react';
import {
  Bot,
  Zap,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Play,
  Activity,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Send,
  Building,
} from 'lucide-react';

interface AgentCard {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'working' | 'waiting_approval' | 'idle';
  autonomy: 'Autonomous' | 'Supervised' | 'Semi-Autonomous';
  lastAction: string;
  throughput: string;
  accuracy: string;
}

const initialAgents: AgentCard[] = [
  {
    id: 'agent-1',
    name: 'Lead Intake Agent',
    role: 'Webhook ingestion & payload normalization',
    model: 'gpt-4o-mini',
    status: 'working',
    autonomy: 'Autonomous',
    lastAction: 'Processed Instagram DM webhook #8921',
    throughput: '320 leads/hr',
    accuracy: '99.9%',
  },
  {
    id: 'agent-2',
    name: 'Identity Resolution Agent',
    role: 'Cross-channel identity graph & de-duplication',
    model: 'Deterministic Graph',
    status: 'active',
    autonomy: 'Autonomous',
    lastAction: 'Linked email alex@vanguard.io to IG @alex_tech',
    throughput: '14ms lookup',
    accuracy: '100% matched',
  },
  {
    id: 'agent-3',
    name: 'Company Enrichment Agent',
    role: 'Firmographic waterfall & tech stack detection',
    model: 'Waterfall API',
    status: 'active',
    autonomy: 'Autonomous',
    lastAction: 'Enriched CloudScale Inc (Series B, 85 employees)',
    throughput: '45 enriched/hr',
    accuracy: '98.4%',
  },
  {
    id: 'agent-4',
    name: 'Qualification Agent',
    role: 'Deterministic ICP scoring & transparent reasoning',
    model: 'gpt-4o',
    status: 'working',
    autonomy: 'Supervised',
    lastAction: 'Scored Lead #402: 88/100 (High ICP Fit)',
    throughput: '100% explainable',
    accuracy: '94.2% precision',
  },
  {
    id: 'agent-5',
    name: 'Conversation Agent',
    role: 'Omnichannel multi-turn engagement & objections',
    model: 'gpt-4o',
    status: 'waiting_approval',
    autonomy: 'Supervised',
    lastAction: 'Drafted tailored response for CTO inquiry',
    throughput: '12 active chats',
    accuracy: '0 hallucinations',
  },
  {
    id: 'agent-6',
    name: 'Meeting Booking Agent',
    role: 'Slot negotiation & calendar conflict resolution',
    model: 'gpt-4o-mini',
    status: 'active',
    autonomy: 'Supervised',
    lastAction: 'Confirmed demo for Thursday 2:00 PM EST',
    throughput: '18 demos booked',
    accuracy: '100% synced',
  },
];

const liveAuditEvents = [
  {
    id: 'ev-1',
    agent: 'Lead Intake Agent',
    action: 'Webhook Received',
    detail: 'Inbound WhatsApp lead from +1 (555) 234-8901',
    result: 'success',
    time: '2 mins ago',
  },
  {
    id: 'ev-2',
    agent: 'Qualification Agent',
    action: 'Score Computed',
    detail: 'Lead #402 evaluated: ICP Score 88/100 (Role: VP Engineering)',
    result: 'success',
    time: '4 mins ago',
  },
  {
    id: 'ev-3',
    agent: 'Conversation Agent',
    action: 'Approval Requested',
    detail: 'Outbound email draft requires sales rep review (High Risk)',
    result: 'blocked',
    time: '7 mins ago',
  },
  {
    id: 'ev-4',
    agent: 'Meeting Booking Agent',
    action: 'Calendar Event Created',
    detail: 'Demo with Elena Rostova (Vanguard AI) booked on Google Cal',
    result: 'success',
    time: '12 mins ago',
  },
];

export default function CommandCenterPage() {
  const [agents] = useState<AgentCard[]>(initialAgents);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const handleSimulateInbound = () => {
    setSimulating(true);
    setSimulationResult('Dispatching synthetic webhook payload to /api/v1/webhooks/inbound...');
    setTimeout(() => {
      setSimulating(false);
      setSimulationResult('Lead ingested! Event ID: ev_9f81a7b. Handed to Swarm Pipeline.');
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>Revora Command Center</h1>
            <span className="badge badge-emerald">Swarm Online</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Multi-agent revenue operations running with deterministic safety policies & Row-Level Security.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSimulateInbound}
            disabled={simulating}
            className="btn-primary"
            style={{ opacity: simulating ? 0.7 : 1 }}
          >
            <Sparkles size={16} />
            {simulating ? 'Simulating Inflow...' : 'Simulate Inbound Lead'}
          </button>
          <a href="/approvals" className="btn-secondary">
            <CheckCircle2 size={16} color="var(--amber-primary)" />
            Review Approvals (3)
          </a>
        </div>
      </div>

      {simulationResult && (
        <div
          className="glass-card"
          style={{
            padding: '14px 20px',
            borderLeft: '4px solid var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(99, 102, 241, 0.08)',
          }}
        >
          <span style={{ fontSize: '0.88rem', color: 'var(--text-highlight)' }}>{simulationResult}</span>
          <button
            onClick={() => setSimulationResult(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Leads Ingested</span>
            <Zap size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>1,284</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--emerald-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} /> +24% vs last week
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ICP Qualified Ratio</span>
            <UserCheck size={18} color="var(--emerald-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>42.8%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Transparent explainable rubric
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Agent Actions (24h)</span>
            <Bot size={18} color="var(--cyan-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>4,892</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cyan-primary)' }}>
            100% logged in immutable audit
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pending Approvals</span>
            <AlertTriangle size={18} color="var(--amber-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px', color: 'var(--amber-primary)' }}>3</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Autonomous send disabled (Safe)
          </div>
        </div>
      </div>

      {/* Agent Swarm Active Status Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Autonomous Swarm Status</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Specialized domain agents operating cooperatively with bounded autonomy.
            </p>
          </div>
          <span className="badge badge-indigo">6 Agents Operational</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '18px' }}>
          {agents.map((agent) => (
            <div key={agent.id} className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{agent.name}</h3>
                    <span
                      className={`badge ${
                        agent.status === 'working'
                          ? 'badge-indigo'
                          : agent.status === 'waiting_approval'
                          ? 'badge-amber'
                          : 'badge-emerald'
                      }`}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {agent.status === 'working' ? 'Processing' : agent.status === 'waiting_approval' ? 'Needs Review' : 'Idle / Ready'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {agent.role}
                  </div>
                </div>

                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-highlight)',
                  }}
                >
                  {agent.model}
                </div>
              </div>

              {/* Recent Action */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Latest Execution
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {agent.lastAction}
                </div>
              </div>

              {/* Footer Specs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <div>
                  Autonomy: <strong style={{ color: 'var(--text-primary)' }}>{agent.autonomy}</strong>
                </div>
                <div>
                  Throughput: <strong style={{ color: 'var(--text-primary)' }}>{agent.throughput}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Audit Log & System Activity Feed */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Swarm Audit Log</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Every agent step, prompt output, and policy validation is tamper-proof and logged with correlation IDs.
            </p>
          </div>
          <a href="/audit" style={{ fontSize: '0.82rem', color: 'var(--text-highlight)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Full Trail <ChevronRightSmall />
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {liveAuditEvents.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: ev.result === 'success' ? 'var(--emerald-primary)' : 'var(--amber-primary)',
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ev.agent}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {ev.action}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {ev.detail}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {ev.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChevronRightSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
