// Revora Shared Types — CRM Entity Types
// Mirrors the database schema — canonical types for all CRM entities

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  icp: ICPConfig;
  brand_voice: BrandVoiceConfig;
  channel_policies: ChannelPolicies;
  agent_autonomy: AgentAutonomyConfig;
}

export interface ICPConfig {
  target_industries: string[];
  company_sizes: string[];
  geographies: string[];
  roles: string[];
  technologies: string[];
  business_problems: string[];
  exclusion_criteria: string[];
  minimum_fit_score: number;   // 0–100
}

export interface BrandVoiceConfig {
  tone: string;
  vocabulary: string[];
  forbidden_phrases: string[];
  response_length: 'brief' | 'standard' | 'detailed';
  language: string;
  example_messages: string[];
  escalation_style: string;
}

export interface ChannelPolicies {
  allowed_channels: string[];
  sending_hours: { start: string; end: string; timezone: string };
  daily_message_limit: number;
  followup_attempt_limit: number;
  opt_out_handling: string;
  approval_required_channels: string[];
}

export interface AgentAutonomyConfig {
  autonomous_sending_enabled: boolean;
  max_turns: number;
  max_depth: number;
  cost_ceiling_usd: number;
  require_approval_for: string[];
}

// ─── CRM Contacts ────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  social_profile_ids: Record<string, string>;   // { instagram: 'xxx', linkedin: 'yyy' }
  company_id?: string;
  job_title?: string;
  location?: string;
  tags: string[];
  lead_source: string;
  consent_status: 'granted' | 'denied' | 'unknown';
  owner_user_id?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  deleted_at?: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  domain?: string;
  industry?: string;
  size_estimate?: string;
  location?: string;
  website?: string;
  enrichment_source?: string;
  enrichment_freshness?: string;
  created_at: string;
  updated_at: string;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  tenant_id: string;
  contact_id: string;
  status: LeadStatus;
  lifecycle_stage: LifecycleStage;
  intent_score: number;
  icp_fit_score: number;
  qualification_status: QualificationStatus;
  buying_signals: string[];
  budget_status?: string;
  urgency?: string;
  pain_points: string[];
  next_action?: string;
  assigned_owner_id?: string;
  source_channel: string;
  last_agent_action?: string;
  last_agent_action_at?: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | 'new' | 'contacted' | 'engaged' | 'qualified'
  | 'meeting_pending' | 'meeting_booked' | 'proposal_sent'
  | 'negotiation' | 'won' | 'lost' | 'nurture';

export type LifecycleStage =
  | 'subscriber' | 'lead' | 'marketing_qualified' | 'sales_qualified'
  | 'opportunity' | 'customer' | 'evangelist';

export type QualificationStatus = 'unqualified' | 'pending' | 'qualified' | 'nurture';

// ─── Conversations ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  lead_id?: string;
  channel: string;
  status: 'active' | 'human_handoff' | 'resolved' | 'stale' | 'closed';
  human_owner_id?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  channel: string;
  sender_type: 'contact' | 'agent' | 'user';
  sender_id: string;
  approval_id?: string;
  sent_at?: string;
  status: 'draft' | 'pending_approval' | 'sent' | 'delivered' | 'failed';
  created_at: string;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  tenant_id: string;
  lead_id: string;
  contact_id: string;
  company_id?: string;
  offer_id?: string;
  stage: LeadStatus;
  value?: number;
  currency: string;
  probability?: number;
  close_date?: string;
  won_at?: string;
  lost_at?: string;
  lost_reason?: string;
  created_at: string;
  updated_at: string;
}

// ─── Approval Requests ───────────────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  agent_id: string;
  workflow_run_id: string;
  lead_id?: string;
  conversation_id?: string;
  action_type: string;
  action_summary: string;
  proposed_action: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'expired';
  decision?: 'approved' | 'rejected' | 'edited';
  decided_by_user_id?: string;
  edited_action?: Record<string, unknown>;
  rejection_reason?: string;
  decided_at?: string;
  expires_at: string;
  created_at: string;
}

// ─── Agent Registry ──────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  tenant_id?: string;    // null = platform-level agent
  name: string;
  role: AgentRole;
  description: string;
  version: string;
  model_provider: string;
  model_name: string;
  system_instructions: string;
  tool_permissions: string[];
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  enabled: boolean;
  autonomy_level: 'supervised' | 'semi-autonomous' | 'autonomous';
  cost_limit_usd?: number;
  created_at: string;
  updated_at: string;
}

export type AgentRole =
  | 'lead_intake' | 'identity_resolution' | 'enrichment'
  | 'qualification' | 'conversation' | 'outreach'
  | 'follow_up' | 'booking' | 'payment'
  | 'human_handoff' | 'analytics';

// ─── Field Provenance ─────────────────────────────────────────────────────────

export type FieldProvenance = 'user' | 'integration' | 'rule' | 'agent';

export interface FieldHistory {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: FieldProvenance;
  changed_by_id: string;
  changed_at: string;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  tenant_id: string;
  user_id?: string;
  agent_id?: string;
  workflow_run_id?: string;
  task_id?: string;
  trace_id?: string;
  tool_name?: string;
  input_params?: Record<string, unknown>;   // Redacted if needed
  output_summary?: string;                   // Never raw PII
  policy_decision?: string;
  approval_status?: string;
  result: 'success' | 'error' | 'blocked';
  error_message?: string;
  provider_event_id?: string;
  timestamp: string;
}
