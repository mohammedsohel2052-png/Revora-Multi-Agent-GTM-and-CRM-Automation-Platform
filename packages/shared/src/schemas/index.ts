import { z } from 'zod';

// ─── Domain Event Base Schema ────────────────────────────────────────────────

export const DomainEventBaseSchema = z.object({
  event_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  event_type: z.string(),
  schema_version: z.string().default('1.0'),
  timestamp: z.string().datetime(),
  correlation_id: z.string().uuid(),
  idempotency_key: z.string().min(1),
  source: z.string().min(1),
  payload: z.record(z.unknown()),
});

// ─── Lead Intake Payload Schema ───────────────────────────────────────────────

export const LeadReceivedPayloadSchema = z.object({
  channel: z.enum(['instagram', 'email', 'form', 'whatsapp', 'website']).or(z.string()),
  provider_event_id: z.string().min(1),
  sender: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    social_id: z.string().optional(),
  }),
  message: z.string().optional(),
  form_data: z.record(z.string()).optional(),
  raw_event: z.record(z.unknown()),
});

// ─── Qualification Output Schema ──────────────────────────────────────────────
// THIS IS THE CANONICAL SCHEMA FOR QUALIFICATION AGENT OUTPUT
// The score MUST be explainable — not a black-box LLM response

export const QualificationOutputSchema = z.object({
  icp_fit_score: z.number().int().min(0).max(100),
  intent_score: z.number().int().min(0).max(100),
  qualification_status: z.enum(['qualified', 'unqualified', 'pending', 'nurture']),
  reasons: z.array(z.string()).min(1),   // Must explain the score
  missing_information: z.array(z.string()),
  recommended_next_action: z.enum([
    'book_meeting', 'send_outreach', 'nurture', 'handoff', 'disqualify'
  ]),
  confidence: z.number().min(0).max(1),
});

export type QualificationOutput = z.infer<typeof QualificationOutputSchema>;

// ─── ICP Config Schema ────────────────────────────────────────────────────────

export const ICPConfigSchema = z.object({
  target_industries: z.array(z.string()),
  company_sizes: z.array(z.string()),
  geographies: z.array(z.string()),
  roles: z.array(z.string()),
  technologies: z.array(z.string()),
  business_problems: z.array(z.string()),
  exclusion_criteria: z.array(z.string()),
  minimum_fit_score: z.number().int().min(0).max(100),
});

// ─── Approval Request Schema ──────────────────────────────────────────────────

export const ApprovalRequestSchema = z.object({
  agent_id: z.string().uuid(),
  workflow_run_id: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  action_type: z.string().min(1),
  action_summary: z.string().min(1),
  proposed_action: z.record(z.unknown()),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  expires_at: z.string().datetime(),
  assignee_user_id: z.string().uuid().optional(),
});

// ─── Webhook Payload Validation ───────────────────────────────────────────────

export const WebhookEventSchema = z.object({
  provider: z.string().min(1),
  provider_event_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  raw_payload: z.record(z.unknown()),
});
