'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Database,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  docType: 'playbook' | 'policy' | 'pricing' | 'faq' | 'case_study';
  chunksCount: number;
  embeddingStatus: 'completed' | 'pending' | 'failed';
  freshness: 'fresh' | 'stale';
  lastUpdated: string;
  summary: string;
}

const mockDocs: KnowledgeDoc[] = [
  {
    id: 'doc-1',
    title: 'Enterprise Pricing & Discount Approval Guidelines 2026',
    docType: 'pricing',
    chunksCount: 14,
    embeddingStatus: 'completed',
    freshness: 'fresh',
    lastUpdated: '2 days ago',
    summary: 'Governs maximum permissible autonomous discounts (capped at 10%) and triggers mandatory human sign-off for deals > $25k ACV.',
  },
  {
    id: 'doc-2',
    title: 'Security & Compliance Whitepaper (SOC2, HIPAA, RLS Architecture)',
    docType: 'policy',
    chunksCount: 38,
    embeddingStatus: 'completed',
    freshness: 'fresh',
    lastUpdated: '1 week ago',
    summary: 'Technical evidence pack used by Conversation Agent when answering enterprise security questionnaires and data residency queries.',
  },
  {
    id: 'doc-3',
    title: 'Qualification Rubric: ICP Matrix & Decision-Maker Roles',
    docType: 'playbook',
    chunksCount: 8,
    embeddingStatus: 'completed',
    freshness: 'fresh',
    lastUpdated: '3 days ago',
    summary: 'Weights, negative signals, and exclusion filters used by Qualification Agent to compute transparent ICP fit scores.',
  },
];

export default function KnowledgeBasePage() {
  const [docs] = useState<KnowledgeDoc[]>(mockDocs);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Agent Knowledge Base (RAG)</h1>
            <span className="badge badge-emerald">pgvector (1536d)</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Ground truth documentation for agent swarm retrieval. Agents only cite verified knowledge chunks with vector cosine similarity.
          </p>
        </div>

        <button className="btn-primary">
          <Plus size={16} /> Upload Document
        </button>
      </div>

      {/* Docs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '18px' }}>
        {docs.map((doc) => (
          <div key={doc.id} className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-highlight)',
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doc.title}</h3>
                  <span className="badge badge-indigo" style={{ textTransform: 'capitalize', fontSize: '0.68rem', marginTop: '4px' }}>
                    {doc.docType}
                  </span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {doc.summary}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="var(--accent-primary)" />
                <span>{doc.chunksCount} Vector Chunks</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--emerald-primary)' }}>
                <CheckCircle2 size={13} />
                <span>Embedded</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
