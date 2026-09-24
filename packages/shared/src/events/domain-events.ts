// Revora Shared Types — Domain Event Contracts
// Source of truth for all typed events in the system

export type EventType =
  | 'lead.received'
  | 'lead.created'
  | 'lead.duplicate.detected'
  | 'lead.enrichment.requested'
  | 'lead.enrichment.completed'
  | 'lead.qualified'
  | 'conversation.message.received'
  | 'conversation.reply.drafted'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired'
  | 'followup.scheduled'
  | 'conversation.marked_stale'
  | 'meeting.requested'
  | 'meeting.booked'
  | 'meeting.cancelled'
  | 'payment.checkout_created'
  | 'payment.completed'
  | 'payment.failed'
  | 'human.handoff.requested'
  | 'human.handoff.resumed'
  | 'crm.sync.failed'
  | 'agent.run.started'
  | 'agent.run.completed'
  | 'agent.run.failed';

export interface DomainEventBase {
  event_id: string;           // UUID, globally unique
  tenant_id: string;          // Workspace isolation key
  entity_id: string;          // Primary CRM record ID
  event_type: EventType;
  schema_version: string;     // e.g. "1.0" — for forward compatibility
  timestamp: string;          // ISO 8601
  correlation_id: string;     // Groups related events in same workflow
  idempotency_key: string;    // Prevents duplicate processing
  source: string;             // Which service emitted this
  payload: Record<string, unknown>;
}

// ─── Lead Events ────────────────────────────────────────────────────────────

export interface LeadReceivedPayload {
  channel: 'instagram' | 'email' | 'form' | 'whatsapp' | 'website' | string;
  provider_event_id: string;
  sender: {
    name?: string;
    email?: string;
    phone?: string;
    social_id?: string;
  };
  message?: string;
  form_data?: Record<string, string>;
  raw_event: Record<string, unknown>;
}

export interface LeadCreatedPayload {
  contact_id: string;
  lead_id: string;
  conversation_id: string;
  source_channel: string;
  is_duplicate: boolean;
  deduplication_result?: {
    matched_contact_id?: string;
    confidence?: number;
    match_reason?: string;
  };
}

export interface QualificationResultPayload {
  lead_id: string;
  contact_id: string;
  icp_fit_score: number;        // 0–100
  intent_score: number;         // 0–100
  qualification_status: 'qualified' | 'unqualified' | 'pending' | 'nurture';
  reasons: string[];
  missing_information: string[];
  recommended_next_action: 'book_meeting' | 'send_outreach' | 'nurture' | 'handoff' | 'disqualify';
  confidence: number;           // 0–1
}

// ─── Approval Events ─────────────────────────────────────────────────────────

export interface ApprovalRequestPayload {
  approval_id: string;
  agent_id: string;
  action_type: string;          // e.g. "send_outbound_message"
  action_summary: string;       // Human-readable description
  proposed_action: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  expires_at: string;           // ISO 8601
  assignee_user_id?: string;
}

export interface ApprovalDecisionPayload {
  approval_id: string;
  decision: 'approved' | 'rejected' | 'edited' | 'expired';
  decided_by_user_id: string;
  edited_action?: Record<string, unknown>;
  rejection_reason?: string;
}

import type { AgentRole, LeadStatus, QualificationStatus, FieldProvenance } from '../types';

// ─── Tool Permission Types ───────────────────────────────────────────────────

export type ToolRiskLevel = 'read' | 'write' | 'external_read' | 'external_write' | 'financial' | 'destructive';

export interface ToolPermission {
  tool_name: string;
  allowed_agents: AgentRole[];
  risk_level: ToolRiskLevel;
  requires_approval: boolean | 'configurable' | 'always_human';
  rate_limit_per_hour?: number;
  timeout_ms?: number;
}

// ─── User Roles ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'workspace_owner'
  | 'sales_manager'
  | 'sales_rep'
  | 'reviewer'
  | 'platform_admin';

