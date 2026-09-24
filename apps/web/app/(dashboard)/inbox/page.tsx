'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Bot,
  ShieldAlert,
  Sparkles,
  Paperclip,
  CheckCircle,
  MoreVertical,
  Instagram,
  Mail,
  Phone,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'contact' | 'agent' | 'user';
  senderName: string;
  text: string;
  time: string;
  status?: 'sent' | 'draft_pending_review';
}

interface Conversation {
  id: string;
  contactName: string;
  companyName: string;
  channel: 'instagram' | 'email' | 'whatsapp';
  unreadCount: number;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
}

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    contactName: 'Chloe Laurent',
    companyName: 'Atelier Growth',
    channel: 'instagram',
    unreadCount: 1,
    lastMessage: 'Does your platform support multi-tenant RLS out of the box?',
    time: '8m ago',
    messages: [
      {
        id: 'm1',
        sender: 'contact',
        senderName: 'Chloe Laurent',
        text: 'Hey there! Loved your case study on GTM automation.',
        time: '10:14 AM',
      },
      {
        id: 'm2',
        sender: 'contact',
        senderName: 'Chloe Laurent',
        text: 'Does your platform support multi-tenant Row-Level Security (RLS) out of the box? We are building multi-client setups.',
        time: '10:15 AM',
      },
      {
        id: 'm3',
        sender: 'agent',
        senderName: 'Conversation Agent (Draft)',
        text: 'Hi Chloe! Yes, Revora is architected from day one with strict PostgreSQL Row-Level Security (RLS) on all 18 core domain entities. Every query executes within an isolated tenant session context, guaranteeing complete cross-tenant boundary isolation. Would you like a 15-minute architecture walkthrough?',
        time: '10:16 AM',
        status: 'draft_pending_review',
      },
    ],
  },
  {
    id: 'conv-2',
    contactName: 'Siddharth Roy',
    companyName: 'ScaleAI Systems',
    channel: 'email',
    unreadCount: 0,
    lastMessage: 'Confirmed. Let’s proceed with Thursday afternoon.',
    time: '2h ago',
    messages: [
      {
        id: 'm4',
        sender: 'contact',
        senderName: 'Siddharth Roy',
        text: 'Confirmed. Let’s proceed with Thursday afternoon for the product demo.',
        time: '9:00 AM',
      },
    ],
  },
];

export default function UnifiedInboxPage() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [activeConv, setActiveConv] = useState<Conversation>(mockConversations[0]!);
  const [inputText, setInputText] = useState('');

  const channelIcon = (ch: string) => {
    switch (ch) {
      case 'instagram':
        return <Instagram size={14} color="#E1306C" />;
      case 'email':
        return <Mail size={14} color="#6366F1" />;
      default:
        return <Phone size={14} color="#10B981" />;
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Unified Omnichannel Inbox</h1>
          <span className="badge badge-emerald">Realtime Stream</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Autonomous drafting with Human-in-the-Loop review. Switch seamlessly between AI assistance and direct manual messaging.
        </p>
      </div>

      <div
        className="glass-card"
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          height: '740px',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Left Conversation List */}
        <div style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Active Conversations</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.map((c) => {
              const isSelected = activeConv.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {channelIcon(c.channel)}
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.contactName}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {c.companyName}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.lastMessage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Chat Window */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
          {/* Chat Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-glass)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{activeConv.contactName}</span>
                <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>
                  {activeConv.channel}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {activeConv.companyName}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                Agent Copilot Active
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeConv.messages.map((m) => {
              const isContact = m.sender === 'contact';
              const isAgentDraft = m.status === 'draft_pending_review';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isContact ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {m.sender === 'agent' ? <Bot size={13} color="var(--accent-primary)" /> : <User size={13} />}
                    <span>{m.senderName}</span>
                    <span>• {m.time}</span>
                  </div>

                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: isContact
                        ? 'var(--bg-tertiary)'
                        : isAgentDraft
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'var(--accent-gradient)',
                      border: isAgentDraft ? '1px dashed var(--accent-primary)' : '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      lineHeight: '1.5',
                    }}
                  >
                    {m.text}

                    {isAgentDraft && (
                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: '1px solid rgba(99, 102, 241, 0.3)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-highlight)', fontWeight: 600 }}>
                          Autonomous Sending Disabled • Review Required
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-primary"
                            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                            onClick={() => alert('Dispatched outbound message!')}
                          >
                            <Send size={12} /> Approve & Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Box */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-glass)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Type a message or let agent draft the reply..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <button className="btn-secondary" style={{ padding: '12px 14px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
              </button>
              <button className="btn-primary" style={{ padding: '12px 18px' }}>
                <Send size={16} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
