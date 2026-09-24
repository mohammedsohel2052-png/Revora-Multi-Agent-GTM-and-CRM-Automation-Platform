'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Clock,
  Building2,
  Mail,
  Phone,
  Tag,
  ChevronDown,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  channel: 'instagram' | 'email' | 'form' | 'whatsapp';
  icpFitScore: number;
  intentScore: number;
  status: 'new' | 'contacted' | 'engaged' | 'qualified' | 'meeting_booked';
  buyingSignals: string[];
  reasons: string[];
  nextAction: string;
}

const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Siddharth Roy',
    email: 'siddharth@scaleai.co',
    company: 'ScaleAI Systems',
    channel: 'email',
    icpFitScore: 92,
    intentScore: 88,
    status: 'qualified',
    buyingSignals: ['Hiring 12 SDRs', 'Explicitly asked about Drizzle & RLS support'],
    reasons: ['Target headcount matches ICP (100-500)', 'Enterprise SaaS B2B industry', 'Decision maker role (Head of RevOps)'],
    nextAction: 'Book technical architecture demo',
  },
  {
    id: 'lead-2',
    name: 'Chloe Laurent',
    email: 'chloe@ateliergrowth.fr',
    company: 'Atelier Growth',
    channel: 'instagram',
    icpFitScore: 78,
    intentScore: 65,
    status: 'engaged',
    buyingSignals: ['DM inquiry regarding pricing tiers'],
    reasons: ['Agency profile matches secondary ICP', 'Verified website domain'],
    nextAction: 'Send qualification questionnaire',
  },
  {
    id: 'lead-3',
    name: 'Vikram Mehta',
    email: 'v.mehta@finvertex.in',
    company: 'FinVertex Technologies',
    channel: 'form',
    icpFitScore: 89,
    intentScore: 95,
    status: 'meeting_booked',
    buyingSignals: ['Requested immediate demo', 'Budget confirmed > $50k/yr'],
    reasons: ['Fintech series A funded', 'VP Engineering verified on LinkedIn'],
    nextAction: 'Prepare pre-meeting briefing dossier',
  },
  {
    id: 'lead-4',
    name: 'Liam O’Connor',
    email: 'liam@dublindevs.com',
    company: 'DublinDevs Ltd',
    channel: 'whatsapp',
    icpFitScore: 45,
    intentScore: 30,
    status: 'new',
    buyingSignals: ['General inquiry'],
    reasons: ['Company size below 5 employees', 'Unclear budget readiness'],
    nextAction: 'Route to low-touch automated nurture sequence',
  },
];

export default function LeadsPipelinePage() {
  const [leads] = useState<Lead[]>(mockLeads);
  const [selectedLead, setSelectedLead] = useState<Lead>(mockLeads[0]!);
  const [filterChannel, setFilterChannel] = useState<string>('all');

  const filteredLeads = filterChannel === 'all'
    ? leads
    : leads.filter((l) => l.channel === filterChannel);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Leads Intelligence Pipeline</h1>
            <span className="badge badge-indigo">{filteredLeads.length} Processed Leads</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Deterministic ICP fit & intent evaluation. Every score is explainable with verifiable signals.
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'email', 'instagram', 'form', 'whatsapp'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={filterChannel === ch ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.78rem', padding: '6px 14px', textTransform: 'capitalize' }}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Leads List + Right Explainable Rubric Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '24px', alignItems: 'start' }}>
        {/* Table / List */}
        <div className="glass-card" style={{ padding: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 16px' }}>Lead Contact</th>
                <th style={{ padding: '14px 16px' }}>Channel</th>
                <th style={{ padding: '14px 16px' }}>ICP Fit</th>
                <th style={{ padding: '14px 16px' }}>Intent</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const isSelected = selectedLead.id === lead.id;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lead.company}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>
                        {lead.channel}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: lead.icpFitScore >= 80 ? 'var(--emerald-primary)' : lead.icpFitScore >= 60 ? 'var(--amber-primary)' : 'var(--rose-primary)',
                          }}
                        >
                          {lead.icpFitScore}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 600 }}>{lead.intentScore}%</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        className={`badge ${
                          lead.status === 'qualified' || lead.status === 'meeting_booked'
                            ? 'badge-emerald'
                            : lead.status === 'engaged'
                            ? 'badge-indigo'
                            : 'badge-amber'
                        }`}
                      >
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Explainability Dossier */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Qualification Agent Dossier
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>
              {selectedLead.name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {selectedLead.company} • {selectedLead.email}
            </div>
          </div>

          {/* Scores Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ICP Fit Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: selectedLead.icpFitScore >= 80 ? 'var(--emerald-primary)' : 'var(--amber-primary)' }}>
                {selectedLead.icpFitScore}/100
              </div>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Intent Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
                {selectedLead.intentScore}/100
              </div>
            </div>
          </div>

          {/* Score Reasons (Explainability requirement) */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Deterministic Scoring Reasons
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedLead.reasons.map((reason, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  <CheckCircle size={14} color="var(--emerald-primary)" style={{ flexShrink: 0 }} />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buying Signals */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Extracted Buying Signals
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedLead.buyingSignals.map((signal, i) => (
                <span key={i} className="badge badge-indigo" style={{ fontSize: '0.75rem' }}>
                  {signal}
                </span>
              ))}
            </div>
          </div>

          {/* Next Recommended Action */}
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glow)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-highlight)', fontWeight: 600 }}>
              Recommended Next Action
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: '2px' }}>
              {selectedLead.nextAction}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
