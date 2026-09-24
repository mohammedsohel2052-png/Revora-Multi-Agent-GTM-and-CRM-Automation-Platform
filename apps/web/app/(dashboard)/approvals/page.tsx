'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Edit3,
  Bot,
  User,
  ArrowRight,
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  agentName: string;
  actionType: string;
  targetContact: string;
  targetCompany: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  proposedContent: string;
  rationale: string;
  expiresIn: string;
  status: 'pending' | 'approved' | 'rejected';
}

const mockApprovals: ApprovalItem[] = [
  {
    id: 'app-001',
    agentName: 'Conversation Agent',
    actionType: 'Send Custom Email Proposal',
    targetContact: 'Marcus Vance',
    targetCompany: 'HyperScale AI',
    riskLevel: 'high',
    summary: 'Outbound proposal pricing quote ($4,500/mo) to enterprise buyer',
    proposedContent: `Hi Marcus,

Following up on your request for our enterprise tier specifications. Based on your current volume of 450,000 monthly active users and custom security requirements, our Enterprise tier is quoted at $4,500/mo billed annually.

This includes 99.99% SLA, dedicated VPC peering, and custom compliance exports.

Would tomorrow at 2:00 PM EST work for a quick walkthrough with our solutions architect?

Best,
Revora Growth Team`,
    rationale: 'Deterministic rule #PRICING_04 triggered: Any outbound message quoting pricing terms > $1,000 requires human sales manager sign-off.',
    expiresIn: '4 hours',
    status: 'pending',
  },
  {
    id: 'app-002',
    agentName: 'Outreach Agent',
    actionType: 'LinkedIn InMail Sequence',
    targetContact: 'Sarah Chen',
    targetCompany: 'Apex Health Systems',
    riskLevel: 'medium',
    summary: 'Cold outreach sequence targeting VP of IT',
    proposedContent: `Hi Sarah, noticing Apex Health's recent expansion into remote patient monitoring. 
We've assisted similar healthcare platforms cut data pipeline synchronization lag from 40m to under 120ms with HIPAA-compliant safeguards.

Open to a brief conversation if this aligns with your Q4 infrastructure focus?`,
    rationale: 'First touch to executive role (VP level) in regulated healthcare domain.',
    expiresIn: '18 hours',
    status: 'pending',
  },
  {
    id: 'app-003',
    agentName: 'Identity Resolution Agent',
    actionType: 'Entity Merge',
    targetContact: 'David Kim',
    targetCompany: 'NextGen Financial',
    riskLevel: 'medium',
    summary: 'Merge Contact #1092 into Contact #3401 (Match confidence 74%)',
    proposedContent: `Merge Profile A (david.k@nextgenfin.com) with Profile B (d.kim@personal.io). Shared phone number +1-415-555-0192 detected.`,
    rationale: 'Match confidence (74%) is below autonomous merge threshold (85%). Human review required.',
    expiresIn: '2 days',
    status: 'pending',
  },
];

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>(mockApprovals);
  const [activeItem, setActiveItem] = useState<ApprovalItem>(mockApprovals[0]!);
  const [feedback, setFeedback] = useState('');

  const handleDecision = (id: string, decision: 'approved' | 'rejected') => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: decision } : item)),
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Human-in-the-Loop Approvals</h1>
          <span className="badge badge-amber">3 Pending Actions</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Revora prevents autonomous errors. High-risk actions, price quotes, and low-confidence merges pause here for your authorization.
        </p>
      </div>

      {/* Grid: Left List + Right Detail Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => {
            const isSelected = activeItem.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="glass-card-interactive"
                style={{
                  padding: '18px',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={15} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.agentName}</span>
                  </div>
                  <span
                    className={`badge ${
                      item.riskLevel === 'critical' || item.riskLevel === 'high'
                        ? 'badge-rose'
                        : 'badge-amber'
                    }`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {item.riskLevel.toUpperCase()} RISK
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {item.actionType}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {item.targetContact} • {item.targetCompany}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    Expires in {item.expiresIn}
                  </div>
                  {item.status !== 'pending' && (
                    <span
                      style={{
                        fontWeight: 700,
                        color: item.status === 'approved' ? 'var(--emerald-primary)' : 'var(--rose-primary)',
                      }}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Inspector */}
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Action Review Detail • {activeItem.id}
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                {activeItem.actionType}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Target: <strong style={{ color: 'var(--text-primary)' }}>{activeItem.targetContact}</strong> ({activeItem.targetCompany})
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleDecision(activeItem.id, 'rejected')}
                className="btn-secondary"
                style={{ color: 'var(--rose-primary)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              >
                <XCircle size={16} /> Reject
              </button>
              <button
                onClick={() => handleDecision(activeItem.id, 'approved')}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <CheckCircle2 size={16} /> Approve & Dispatch
              </button>
            </div>
          </div>

          {/* Trigger Rationale */}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={18} color="var(--amber-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--amber-primary)' }}>
                Deterministic Policy Triggered
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {activeItem.rationale}
              </div>
            </div>
          </div>

          {/* Proposed Payload Content */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Proposed Payload Output
              </span>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-highlight)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <Edit3 size={13} /> Edit before approving
              </button>
            </div>
            <pre
              style={{
                background: 'var(--bg-primary)',
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {activeItem.proposedContent}
            </pre>
          </div>

          {/* Feedback Notes */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Reviewer Notes (Recorded in Audit Trail)
            </label>
            <input
              type="text"
              placeholder="e.g. Approved price quote based on Q4 executive discount policy"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
