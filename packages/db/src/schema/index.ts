import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  numeric,
  integer,
  date,
  index,
  unique,
  customType,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Custom pgvector type for vector(1536)
const pgVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return typeof value === 'string' ? JSON.parse(value) : (value as number[]);
  },
});

// ─── Tenants ─────────────────────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan', { enum: ['free', 'starter', 'pro', 'enterprise'] }).notNull().default('free'),
  settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').unique(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Memberships ─────────────────────────────────────────────────────────────
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', {
      enum: ['workspace_owner', 'sales_manager', 'sales_rep', 'reviewer', 'platform_admin'],
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.tenantId, t.userId),
  }),
);

// ─── Agents ──────────────────────────────────────────────────────────────────
export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // NULL = system agent
  name: text('name').notNull(),
  role: text('role').notNull(),
  description: text('description'),
  version: text('version').notNull().default('1.0.0'),
  modelProvider: text('model_provider').notNull().default('openai'),
  modelName: text('model_name').notNull().default('gpt-4o-mini'),
  systemInstructions: text('system_instructions').notNull(),
  toolPermissions: text('tool_permissions').array().notNull().default(sql`'{}'::text[]`),
  inputSchema: jsonb('input_schema').notNull().default(sql`'{}'::jsonb`),
  outputSchema: jsonb('output_schema').notNull().default(sql`'{}'::jsonb`),
  enabled: boolean('enabled').notNull().default(true),
  autonomyLevel: text('autonomy_level', {
    enum: ['supervised', 'semi-autonomous', 'autonomous'],
  }).notNull().default('supervised'),
  costLimitUsd: numeric('cost_limit_usd', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Companies ───────────────────────────────────────────────────────────────
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domain: text('domain'),
  industry: text('industry'),
  sizeEstimate: text('size_estimate'),
  location: text('location'),
  website: text('website'),
  enrichmentSource: text('enrichment_source'),
  enrichmentFreshness: timestamp('enrichment_freshness', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Contacts ────────────────────────────────────────────────────────────────
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    socialProfileIds: jsonb('social_profile_ids').notNull().default(sql`'{}'::jsonb`),
    companyId: uuid('company_id').references(() => companies.id),
    jobTitle: text('job_title'),
    location: text('location'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    leadSource: text('lead_source'),
    consentStatus: text('consent_status', {
      enum: ['granted', 'denied', 'unknown'],
    }).notNull().default('unknown'),
    ownerUserId: uuid('owner_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('contacts_tenant_id_idx').on(t.tenantId),
    emailIdx: index('contacts_email_idx').on(t.tenantId, t.email),
    phoneIdx: index('contacts_phone_idx').on(t.tenantId, t.phone),
  }),
);

// ─── Leads ───────────────────────────────────────────────────────────────────
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    status: text('status', {
      enum: [
        'new',
        'contacted',
        'engaged',
        'qualified',
        'meeting_pending',
        'meeting_booked',
        'proposal_sent',
        'negotiation',
        'won',
        'lost',
        'nurture',
      ],
    }).notNull().default('new'),
    lifecycleStage: text('lifecycle_stage').notNull().default('lead'),
    intentScore: integer('intent_score').notNull().default(0),
    icpFitScore: integer('icp_fit_score').notNull().default(0),
    qualificationStatus: text('qualification_status', {
      enum: ['unqualified', 'pending', 'qualified', 'nurture'],
    }).notNull().default('pending'),
    buyingSignals: text('buying_signals').array().notNull().default(sql`'{}'::text[]`),
    budgetStatus: text('budget_status'),
    urgency: text('urgency'),
    painPoints: text('pain_points').array().notNull().default(sql`'{}'::text[]`),
    nextAction: text('next_action'),
    assignedOwnerId: uuid('assigned_owner_id').references(() => users.id),
    sourceChannel: text('source_channel').notNull(),
    lastAgentAction: text('last_agent_action'),
    lastAgentActionAt: timestamp('last_agent_action_at', { withTimezone: true }),
    scoreReasons: jsonb('score_reasons').notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('leads_tenant_id_idx').on(t.tenantId),
    statusIdx: index('leads_status_idx').on(t.tenantId, t.status),
    contactIdx: index('leads_contact_id_idx').on(t.contactId),
  }),
);

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  leadId: uuid('lead_id').references(() => leads.id),
  channel: text('channel').notNull(),
  status: text('status', {
    enum: ['active', 'human_handoff', 'resolved', 'stale', 'closed'],
  }).notNull().default('active'),
  humanOwnerId: uuid('human_owner_id').references(() => users.id),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Messages ────────────────────────────────────────────────────────────────
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  content: text('content').notNull(),
  channel: text('channel').notNull(),
  senderType: text('sender_type', { enum: ['contact', 'agent', 'user'] }).notNull(),
  senderId: text('sender_id').notNull(),
  approvalId: uuid('approval_id'),
  status: text('status', {
    enum: ['draft', 'pending_approval', 'sent', 'delivered', 'failed'],
  }).notNull().default('draft'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  providerMsgId: text('provider_msg_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Opportunities ───────────────────────────────────────────────────────────
export const opportunities = pgTable('opportunities', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  companyId: uuid('company_id').references(() => companies.id),
  stage: text('stage').notNull().default('new'),
  value: numeric('value', { precision: 15, scale: 2 }),
  currency: text('currency').notNull().default('USD'),
  probability: integer('probability'),
  closeDate: date('close_date'),
  wonAt: timestamp('won_at', { withTimezone: true }),
  lostAt: timestamp('lost_at', { withTimezone: true }),
  lostReason: text('lost_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Approval Requests ────────────────────────────────────────────────────────
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').references(() => agents.id),
  workflowRunId: uuid('workflow_run_id'),
  leadId: uuid('lead_id').references(() => leads.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  actionType: text('action_type').notNull(),
  actionSummary: text('action_summary').notNull(),
  proposedAction: jsonb('proposed_action').notNull(),
  riskLevel: text('risk_level', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'edited', 'expired'],
  }).notNull().default('pending'),
  decidedByUserId: uuid('decided_by_user_id').references(() => users.id),
  editedAction: jsonb('edited_action'),
  rejectionReason: text('rejection_reason'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Audit Events ────────────────────────────────────────────────────────────
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    agentId: uuid('agent_id').references(() => agents.id),
    workflowRunId: uuid('workflow_run_id'),
    taskId: text('task_id'),
    traceId: text('trace_id'),
    toolName: text('tool_name'),
    inputParams: jsonb('input_params'), // PII redacted
    outputSummary: text('output_summary'),
    policyDecision: text('policy_decision'),
    approvalStatus: text('approval_status'),
    result: text('result', { enum: ['success', 'error', 'blocked'] }).notNull(),
    errorMessage: text('error_message'),
    providerEventId: text('provider_event_id'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('audit_events_tenant_id_idx').on(t.tenantId, t.timestamp),
  }),
);

// ─── Knowledge Documents & Chunks ────────────────────────────────────────────
export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  docType: text('doc_type').notNull(),
  version: integer('version').notNull().default(1),
  source: text('source'),
  visibility: text('visibility', { enum: ['agents', 'public', 'internal'] }).notNull().default('agents'),
  embeddingStatus: text('embedding_status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('pending'),
  freshnessStatus: text('freshness_status', { enum: ['fresh', 'stale', 'outdated'] }).notNull().default('fresh'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: pgVector('embedding'),
  chunkIndex: integer('chunk_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Integrations ────────────────────────────────────────────────────────────
export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    status: text('status', { enum: ['connected', 'disconnected', 'error'] }).notNull().default('disconnected'),
    externalAccountId: text('external_account_id'),
    scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
    encryptedCredentials: text('encrypted_credentials'), // base64 encoded AES
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.tenantId, t.provider),
  }),
);

// ─── Webhook Events ──────────────────────────────────────────────────────────
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    rawPayload: jsonb('raw_payload').notNull(),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idempotencyIdx: index('webhook_events_idempotency_idx').on(t.idempotencyKey),
  }),
);

// ─── Payments ────────────────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id').references(() => opportunities.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  stripeSessionId: text('stripe_session_id').unique(),
  stripePaymentIntent: text('stripe_payment_intent').unique(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded'] }).notNull().default('pending'),
  verifiedViaWebhook: boolean('verified_via_webhook').notNull().default(false),
  webhookEventId: text('webhook_event_id'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Usage Events ────────────────────────────────────────────────────────────
export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    agentId: uuid('agent_id').references(() => agents.id),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
    workflowRunId: uuid('workflow_run_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('usage_events_tenant_idx').on(t.tenantId, t.createdAt),
  }),
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(memberships),
  agents: many(agents),
  contacts: many(contacts),
  companies: many(companies),
  leads: many(leads),
  conversations: many(conversations),
  opportunities: many(opportunities),
  approvalRequests: many(approvalRequests),
  auditEvents: many(auditEvents),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [contacts.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  owner: one(users, { fields: [contacts.ownerUserId], references: [users.id] }),
  leads: many(leads),
  conversations: many(conversations),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, { fields: [leads.tenantId], references: [tenants.id] }),
  contact: one(contacts, { fields: [leads.contactId], references: [contacts.id] }),
  assignedOwner: one(users, { fields: [leads.assignedOwnerId], references: [users.id] }),
  opportunities: many(opportunities),
  conversations: many(conversations),
}));
