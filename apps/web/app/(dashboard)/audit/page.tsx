'use client';

import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Lock,
  Download,
  Terminal,
} from 'lucide-react';

interface AuditItem {
  id: string;
  timestamp: string;
  agentOrUser: string;
  action: string;
  policyDecision: string;
  result: 'success' | 'error' | 'blocked';
  traceId: string;
  summary: string;
  piiRedacted: boolean;
}

const mockAuditTrail: AuditItem[] = [
  {
    id: 'aud-991',
    timestamp: '2026-09-24 10:14:02 UTC',
    agentOrUser: 'Lead Intake Agent',
    action: 'POST /api/v1/webhooks/instagram',
    policyDecision: 'ALLOW (Valid webhook HMAC signature)',
    result: 'success',
    traceId: 'tr_c94801af',
    summary: 'Ingested raw message payload from Instagram sender_id=981249. Formatted into LeadReceived event.',
    piiRedacted: true,
  },
  {
    id: 'aud-992',
    timestamp: '2026-09-24 10:14:08 UTC',
    agentOrUser: 'Qualification Agent',
    action: 'ScoreICPAndIntent',
    policyDecision: 'ALLOW (Deterministic score computed: 88)',
    result: 'success',
    traceId: 'tr_c94801af',
    summary: 'Extracted ICP factors: Company headcount 150, Industry: SaaS, Decision maker role.',
    piiRedacted: true,
  },
  {
    id: 'aud-993',
    timestamp: '2026-09-24 10:14:15 UTC',
    agentOrUser: 'Conversation Agent',
    action: 'DraftOutboundMessage',
    policyDecision: 'INTERCEPT (Autonomy policy: Send requires human approval)',
    result: 'blocked',
    traceId: 'tr_c94801af',
    summary: 'Proposed email draft contained quote ($4,500/mo). Routed to Human Approvals Queue #app-001.',
    piiRedacted: true,
  },
  {
    id: 'aud-994',
    timestamp: '2026-09-24 10:16:30 UTC',
    agentOrUser: 'User (Mohammed Sohel)',
    action: 'ApproveActionRequest',
    policyDecision: 'ALLOW (Workspace Owner role permission verified)',
    result: 'success',
    traceId: 'tr_b10492de',
    summary: 'Approved outbound draft for Marcus Vance. Dispatched to messaging queue.',
    piiRedacted: false,
  },
];

export default function AuditCompliancePage() {
  const [events] = useState<AuditItem[]>(mockAuditTrail);
  const [search, setSearch] = useState('');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Audit & Compliance Trail</h1>
            <span className="badge badge-emerald">Append-Only Immutable</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Cryptographically traceable record of all agent executions, tool invocations, and policy verdicts.
          </p>
        </div>

        <button className="btn-secondary">
          <Download size={15} /> Export SOC2 Compliance Bundle
        </button>
      </div>

      {/* Audit Table */}
      <div className="glass-card" style={{ padding: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 16px' }}>Timestamp (UTC)</th>
              <th style={{ padding: '14px 16px' }}>Actor</th>
              <th style={{ padding: '14px 16px' }}>Action / Tool</th>
              <th style={{ padding: '14px 16px' }}>Policy Decision</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px' }}>Trace ID</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                  {ev.timestamp}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{ev.agentOrUser}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-highlight)' }}>
                  {ev.action}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {ev.policyDecision}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    className={`badge ${
                      ev.result === 'success'
                        ? 'badge-emerald'
                        : ev.result === 'blocked'
                        ? 'badge-amber'
                        : 'badge-rose'
                    }`}
                  >
                    {ev.result.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {ev.traceId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
