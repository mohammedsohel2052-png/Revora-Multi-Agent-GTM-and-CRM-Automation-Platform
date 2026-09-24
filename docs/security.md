# Revora — Security & Compliance Architecture

This document outlines the security architecture, threat mitigations, and compliance controls implemented across the Revora platform.

---

## 1. Multi-Tenant Isolation Architecture

Revora enforces multi-tenant data isolation at multiple layers to ensure zero cross-tenant contamination.

### 1.1 PostgreSQL Row-Level Security (RLS)
All tenant-scoped tables (`contacts`, `companies`, `leads`, `conversations`, `messages`, `opportunities`, `approval_requests`, `payments`, `audit_events`, `knowledge_documents`, `knowledge_chunks`) have PostgreSQL RLS enabled:

```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON contacts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 1.2 AsyncLocalStorage Context Binding
Tenant resolution is performed exclusively on the server from validated Clerk authentication tokens or verified webhook routing:
- Client-supplied `tenant_id` query parameters or headers are discarded.
- Direct Object References (IDOR): Querying by entity UUID always executes within the caller's bound `tenantId` scope.

---

## 2. Role-Based Access Control (RBAC)

Revora provides five distinct user roles with strictly enforced permission boundaries:

| Permission / Capability | `workspace_owner` | `sales_manager` | `sales_rep` | `reviewer` | `platform_admin` |
|---|:---:|:---:|:---:|:---:|:---:|
| Read contacts & leads | Yes | Yes | Yes | Yes | Yes |
| Create / edit contacts | Yes | Yes | Yes | No | Yes |
| Configure workspace ICP & settings | Yes | No | No | No | Yes |
| Approve / edit pending outbound drafts | Yes | Yes | No | Yes | Yes |
| Manage tenant billing & Stripe offers | Yes | No | No | No | Yes |
| View cross-tenant system metrics | No | No | No | No | Yes |
| Modify user roles & memberships | Yes | No | No | No | Yes |

Role escalation is prevented at the guard layer: attempting to assign an unauthorized role returns `403 Forbidden`.

---

## 3. Tool Permissions & Risk Tiers

Every agent tool is registered with an explicit risk level that governs autonomous execution:

```
[Tool Call Request]
        |
        v
  [Risk Tier Check]
  +-- 'read'            --> Execute autonomously
  +-- 'write'           --> Execute within tenant boundaries
  +-- 'external_write'  --> Bounded autonomy: check policy limits
  +-- 'financial'       --> MANDATORY Human-in-the-Loop Approval
```

- **Read Tools**: `search_crm_contacts`, `search_knowledge_base`, `check_calendar_availability`.
- **Write Tools**: `update_lead_qualification`, `trigger_human_handoff`.
- **External Write Tools**: `draft_outbound_message`, `book_calendar_meeting`.
- **Financial / High-Risk Tools**: `create_checkout_session`, outbound messages offering discounts >15% or contract values >$10,000.

---

## 4. Webhook Invariants & Cryptographic Defense

### 4.1 HMAC-SHA256 Signature Verification
All webhook events from Meta (WhatsApp/Instagram) and Stripe are verified using HMAC-SHA256 on the raw request buffer:
- Signatures are compared using constant-time equality checks to mitigate timing side-channel attacks.
- Unsigned or tampered requests are rejected immediately with `401 Unauthorized`.

### 4.2 Idempotency & Replay Protection
- Every webhook event stores its `provider_event_id` in a unique index on `webhook_events.idempotency_key`.
- Replayed or duplicate webhooks are acknowledged (`200 OK`) and ignored without repeating downstream agent or CRM actions.

---

## 5. Defense-in-Depth Against Prompt Injection

Revora treats all inbound messages and external document contents as untrusted data:
1. **Instruction / Data Demarcation**: Inbound messages are passed as distinct data fields, never concatenated directly into system instructions.
2. **Explicit Negative Constraints**: System prompts explicitly forbid the model from revealing system instructions, altering tool authorization, or inventing unauthorized pricing.
3. **Hard Server-Side Policy Gates**: Even if an LLM is persuaded to draft a message claiming "You owe $0" or confirming payment without a Stripe webhook, the server-side policy engine blocks dispatch and requires human review.

---

## 6. Secret Redaction & Audit Logging

- **Zero Secret Exposure**: Third-party API keys (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `META_APP_SECRET`) are never logged.
- **PII Redaction**: Credit card numbers, access tokens, and sensitive personal identifiers are masked in input/output summaries stored in `audit_events`.
