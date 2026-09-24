'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Users,
  Building2,
  Bot,
  CheckCircle2,
  BookOpen,
  History,
  Settings,
  Sparkles,
  Inbox,
  Filter,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const navigation = [
  { name: 'Command Center', href: '/', icon: Activity },
  { name: 'Leads Pipeline', href: '/leads', icon: TrendingUp },
  { name: 'Contacts & CRM', href: '/crm/contacts', icon: Users },
  { name: 'Companies', href: '/crm/companies', icon: Building2 },
  { name: 'Unified Inbox', href: '/inbox', icon: Inbox },
  { name: 'Agent Swarm', href: '/agents', icon: Bot, badge: '6 Active' },
  { name: 'Approvals Queue', href: '/approvals', icon: CheckCircle2, alert: true },
  { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { name: 'Audit & Compliance', href: '/audit', icon: History },
  { name: 'Settings & Policy', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        {/* Brand / Logo */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              REVORA
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GTM Intelligence OS
            </div>
          </div>
        </div>

        {/* Workspace Selector */}
        <div style={{ padding: '16px 20px 8px 20px' }}>
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--text-highlight)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                R
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Acme Global Corp</span>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px 8px 10px' }}>
            Operations & Swarm
          </div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  marginBottom: '4px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? 'var(--text-highlight)' : 'currentColor'} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {item.badge}
                  </span>
                )}
                {item.alert && (
                  <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    3 Pending
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Safety & System Status Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div className="pulse-dot" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--emerald-primary)' }}>
              Swarm Autonomous Engine
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} color="var(--emerald-primary)" />
            <span>RLS Active • HITL Guardrails On</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>
        {/* Top Header */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Workspace:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Acme Global Corp</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              PRO PLAN
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Quick Search</span>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>⌘K</kbd>
            </div>

            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: 'var(--text-highlight)',
              }}
            >
              MS
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
