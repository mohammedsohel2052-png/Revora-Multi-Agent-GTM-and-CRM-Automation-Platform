'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Building2,
  Calendar,
  Tag,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyName: string;
  leadSource: string;
  consentStatus: 'granted' | 'denied' | 'unknown';
  tags: string[];
  lastActivity: string;
}

const mockContacts: Contact[] = [
  {
    id: 'ct-1',
    name: 'Alexandra Wright',
    email: 'alex.wright@quantumflow.dev',
    phone: '+1 (415) 890-1122',
    jobTitle: 'VP of Engineering',
    companyName: 'QuantumFlow AI',
    leadSource: 'Inbound Website Form',
    consentStatus: 'granted',
    tags: ['ICP Tier 1', 'Engineering Leader', 'Series B'],
    lastActivity: '14 mins ago',
  },
  {
    id: 'ct-2',
    name: 'Devon Vance',
    email: 'd.vance@cloudnexus.io',
    phone: '+1 (206) 555-8930',
    jobTitle: 'Head of Infrastructure',
    companyName: 'CloudNexus Inc',
    leadSource: 'Instagram DM',
    consentStatus: 'granted',
    tags: ['High Intent', 'Cloud Architecture'],
    lastActivity: '1 hour ago',
  },
  {
    id: 'ct-3',
    name: 'Maria Santos',
    email: 'maria@innovatebrazil.br',
    phone: '+55 11 98765-4321',
    jobTitle: 'Chief Revenue Officer',
    companyName: 'Innovate Brazil',
    leadSource: 'WhatsApp Inbound',
    consentStatus: 'granted',
    tags: ['LATAM', 'Executive'],
    lastActivity: 'Yesterday',
  },
  {
    id: 'ct-4',
    name: 'Nathaniel Drake',
    email: 'ndrake@uncharted.com',
    phone: '+1 (310) 555-0199',
    jobTitle: 'Founder & CEO',
    companyName: 'Uncharted Systems',
    leadSource: 'Cold Inbound Referral',
    consentStatus: 'unknown',
    tags: ['Founder', 'Seed'],
    lastActivity: '3 days ago',
  },
];

export default function ContactsCRMPage() {
  const [contacts] = useState<Contact[]>(mockContacts);
  const [search, setSearch] = useState('');

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Contacts Directory</h1>
            <span className="badge badge-indigo">{filtered.length} Contacts</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Unified contact profiles with cross-channel identity graph links and consent audit trails.
          </p>
        </div>

        <button className="btn-primary">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter contacts by name, company, email, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            width: '100%',
            outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 16px' }}>Contact Name</th>
              <th style={{ padding: '14px 16px' }}>Company & Role</th>
              <th style={{ padding: '14px 16px' }}>Contact Details</th>
              <th style={{ padding: '14px 16px' }}>Tags</th>
              <th style={{ padding: '14px 16px' }}>Consent</th>
              <th style={{ padding: '14px 16px' }}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr
                key={contact.id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s ease',
                }}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{contact.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {contact.id}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 500 }}>{contact.companyName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{contact.jobTitle}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Mail size={13} /> {contact.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                    <Phone size={12} /> {contact.phone}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {contact.tags.map((tag, i) => (
                      <span key={i} className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    className={`badge ${
                      contact.consentStatus === 'granted'
                        ? 'badge-emerald'
                        : contact.consentStatus === 'denied'
                        ? 'badge-rose'
                        : 'badge-amber'
                    }`}
                  >
                    {contact.consentStatus.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {contact.lastActivity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
