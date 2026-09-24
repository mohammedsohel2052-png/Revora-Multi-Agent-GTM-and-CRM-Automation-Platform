-- ============================================================
-- Revora GTM Intelligence OS — Database Schema
-- Phase 1B foundation tables
-- Uses PostgreSQL 16 + pgvector extension
-- ALL tables include tenant_id for row-level isolation
-- ============================================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tenants ─────────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT UNIQUE,    -- Clerk user ID
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Memberships (User ↔ Tenant) ─────────────────────────────────────────────

CREATE TABLE memberships (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('workspace_owner', 'sales_manager', 'sales_rep', 'reviewer', 'platform_admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

-- ─── Agents ──────────────────────────────────────────────────────────────────

CREATE TABLE agents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = platform agent
  name                  TEXT NOT NULL,
  role                  TEXT NOT NULL,
  description           TEXT,
  version               TEXT NOT NULL DEFAULT '1.0.0',
  model_provider        TEXT NOT NULL DEFAULT 'openai',
  model_name            TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_instructions   TEXT NOT NULL,
  tool_permissions      TEXT[] NOT NULL DEFAULT '{}',
  input_schema          JSONB NOT NULL DEFAULT '{}',
  output_schema         JSONB NOT NULL DEFAULT '{}',
  enabled               BOOLEAN NOT NULL DEFAULT true,
  autonomy_level        TEXT NOT NULL DEFAULT 'supervised' CHECK (autonomy_level IN ('supervised', 'semi-autonomous', 'autonomous')),
  cost_limit_usd        NUMERIC(10, 4),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Contacts ────────────────────────────────────────────────────────────────

CREATE TABLE contacts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  social_profile_ids    JSONB NOT NULL DEFAULT '{}',
  company_id            UUID,
  job_title             TEXT,
  location              TEXT,
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  lead_source           TEXT,
  consent_status        TEXT NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('granted', 'denied', 'unknown')),
  owner_user_id         UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at      TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX contacts_tenant_id_idx ON contacts(tenant_id);
CREATE INDEX contacts_email_idx ON contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX contacts_phone_idx ON contacts(tenant_id, phone) WHERE phone IS NOT NULL;

-- ─── Companies ───────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  domain                TEXT,
  industry              TEXT,
  size_estimate         TEXT,
  location              TEXT,
  website               TEXT,
  enrichment_source     TEXT,
  enrichment_freshness  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contacts ADD CONSTRAINT contacts_company_fk FOREIGN KEY (company_id) REFERENCES companies(id);

-- ─── Leads ───────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id            UUID NOT NULL REFERENCES contacts(id),
  status                TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','engaged','qualified','meeting_pending','meeting_booked','proposal_sent','negotiation','won','lost','nurture')),
  lifecycle_stage       TEXT NOT NULL DEFAULT 'lead',
  intent_score          INTEGER NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
  icp_fit_score         INTEGER NOT NULL DEFAULT 0 CHECK (icp_fit_score BETWEEN 0 AND 100),
  qualification_status  TEXT NOT NULL DEFAULT 'pending' CHECK (qualification_status IN ('unqualified','pending','qualified','nurture')),
  buying_signals        TEXT[] NOT NULL DEFAULT '{}',
  budget_status         TEXT,
  urgency               TEXT,
  pain_points           TEXT[] NOT NULL DEFAULT '{}',
  next_action           TEXT,
  assigned_owner_id     UUID REFERENCES users(id),
  source_channel        TEXT NOT NULL,
  last_agent_action     TEXT,
  last_agent_action_at  TIMESTAMPTZ,
  score_reasons         JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leads_tenant_id_idx ON leads(tenant_id);
CREATE INDEX leads_status_idx ON leads(tenant_id, status);
CREATE INDEX leads_contact_id_idx ON leads(contact_id);

-- ─── Conversations ────────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL REFERENCES contacts(id),
  lead_id           UUID REFERENCES leads(id),
  channel           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','human_handoff','resolved','stale','closed')),
  human_owner_id    UUID REFERENCES users(id),
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Messages ────────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id   UUID NOT NULL REFERENCES conversations(id),
  direction         TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content           TEXT NOT NULL,
  channel           TEXT NOT NULL,
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'user')),
  sender_id         TEXT NOT NULL,
  approval_id       UUID,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','sent','delivered','failed')),
  sent_at           TIMESTAMPTZ,
  provider_msg_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Opportunities ────────────────────────────────────────────────────────────

CREATE TABLE opportunities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id),
  contact_id    UUID NOT NULL REFERENCES contacts(id),
  company_id    UUID REFERENCES companies(id),
  stage         TEXT NOT NULL DEFAULT 'new',
  value         NUMERIC(15, 2),
  currency      TEXT NOT NULL DEFAULT 'USD',
  probability   INTEGER CHECK (probability BETWEEN 0 AND 100),
  close_date    DATE,
  won_at        TIMESTAMPTZ,
  lost_at       TIMESTAMPTZ,
  lost_reason   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Approval Requests ───────────────────────────────────────────────────────

CREATE TABLE approval_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id              UUID REFERENCES agents(id),
  workflow_run_id       UUID,
  lead_id               UUID REFERENCES leads(id),
  conversation_id       UUID REFERENCES conversations(id),
  action_type           TEXT NOT NULL,
  action_summary        TEXT NOT NULL,
  proposed_action       JSONB NOT NULL,
  risk_level            TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','edited','expired')),
  decided_by_user_id    UUID REFERENCES users(id),
  edited_action         JSONB,
  rejection_reason      TEXT,
  decided_at            TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Events ────────────────────────────────────────────────────────────

CREATE TABLE audit_events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id),
  agent_id              UUID REFERENCES agents(id),
  workflow_run_id       UUID,
  task_id               TEXT,
  trace_id              TEXT,
  tool_name             TEXT,
  input_params          JSONB,  -- PII redacted
  output_summary        TEXT,
  policy_decision       TEXT,
  approval_status       TEXT,
  result                TEXT NOT NULL CHECK (result IN ('success','error','blocked')),
  error_message         TEXT,
  provider_event_id     TEXT,
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_events_tenant_id_idx ON audit_events(tenant_id, timestamp DESC);

-- ─── Knowledge Documents ─────────────────────────────────────────────────────

CREATE TABLE knowledge_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  doc_type          TEXT NOT NULL,  -- faq | playbook | policy | pricing | etc.
  version           INTEGER NOT NULL DEFAULT 1,
  source            TEXT,
  visibility        TEXT NOT NULL DEFAULT 'agents' CHECK (visibility IN ('agents', 'public', 'internal')),
  embedding_status  TEXT NOT NULL DEFAULT 'pending' CHECK (embedding_status IN ('pending','completed','failed')),
  freshness_status  TEXT NOT NULL DEFAULT 'fresh' CHECK (freshness_status IN ('fresh','stale','outdated')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  embedding         vector(1536),   -- OpenAI text-embedding-3-small dimensions
  chunk_index       INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── Integrations ────────────────────────────────────────────────────────────

CREATE TABLE integrations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),
  external_account_id   TEXT,
  scopes                TEXT[] NOT NULL DEFAULT '{}',
  encrypted_credentials BYTEA,   -- AES-256 encrypted
  connected_at          TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider)
);

-- ─── Webhook Idempotency ─────────────────────────────────────────────────────

CREATE TABLE webhook_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID REFERENCES tenants(id),
  provider          TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  idempotency_key   TEXT NOT NULL UNIQUE,
  raw_payload       JSONB NOT NULL,
  processed         BOOLEAN NOT NULL DEFAULT false,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX webhook_events_idempotency_idx ON webhook_events(idempotency_key);

-- ─── Payments ────────────────────────────────────────────────────────────────

CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id        UUID REFERENCES opportunities(id),
  contact_id            UUID NOT NULL REFERENCES contacts(id),
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT UNIQUE,
  amount                NUMERIC(15, 2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'USD',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  verified_via_webhook  BOOLEAN NOT NULL DEFAULT false,  -- CRITICAL: only trust webhook
  webhook_event_id      TEXT,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Usage Events (for billing) ──────────────────────────────────────────────

CREATE TABLE usage_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,  -- token_usage | workflow_run | tool_call
  agent_id        UUID REFERENCES agents(id),
  model           TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cost_usd        NUMERIC(10, 6),
  workflow_run_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX usage_events_tenant_idx ON usage_events(tenant_id, created_at DESC);

-- ─── Row-Level Security ──────────────────────────────────────────────────────
-- Enable RLS on all tenant-scoped tables
-- Application sets: SET LOCAL app.tenant_id = '...'

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy template (repeat for each table):
CREATE POLICY tenant_isolation_contacts ON contacts
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_conversations ON conversations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_audit ON audit_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
