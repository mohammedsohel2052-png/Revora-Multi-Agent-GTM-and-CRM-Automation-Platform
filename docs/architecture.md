# Revora — Architecture Specification

Revora is a multi-tenant, event-driven, multi-agent GTM (Go-to-Market) and CRM automation platform. It orchestrates specialized AI agents across inbound lead capture, identity resolution, waterfall enrichment, explainable ICP scoring, conversational qualification, meeting scheduling, Stripe billing, and CRM synchronization under strict bounded autonomy.

```
+-----------------------------------------------------------------------------------+
|                               Revora GTM Intelligence OS                           |
|                                                                                   |
|  +--------------------+    +--------------------+    +-------------------------+  |
|  |   Omnichannel      |    |   Multi-Agent      |    |   Tenant Data Layer     |  |
|  |   Ingestion        |--->|   Swarm Runtime    |--->|   PostgreSQL + RLS      |  |
|  | WhatsApp/IG/Form   |    | Supervisor Routing |    |   pgvector Embeddings   |  |
|  +--------------------+    +--------------------+    +-------------------------+  |
|           |                          |                            |               |
|           v                          v                            v               |
|  +--------------------+    +--------------------+    +-------------------------+  |
|  | HMAC & Idempotency |    | Policy Engine &    |    | Immutable Audit Trail   |  |
|  | Webhook Invariant  |    | Human-in-the-Loop  |    | & Cost Tracking ($)     |  |
|  +--------------------+    +--------------------+    +-------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 1. System Context Diagram (C4 Level 1)

```mermaid
C4Context
    title System Context Diagram — Revora GTM Intelligence OS

    Person(lead, "Prospect / Lead", "Prospective buyer interacting via WhatsApp, Instagram DM, Web Form, or Email")
    Person(salesRep, "Sales Representative / Reviewer", "Internal team member managing approvals, pipeline, and customer handoffs")
    Person(admin, "Workspace Owner", "Tenant administrator configuring ICP rubrics, brand voice, and autonomy policies")

    System(revora, "Revora Platform", "Multi-tenant event-driven multi-agent GTM automation operating system")

    System_Ext(meta, "Meta Graph API", "WhatsApp Business Cloud & Instagram Messaging Webhooks")
    System_Ext(stripe, "Stripe Billing", "Checkout sessions, payment intents, and authoritative payment webhooks")
    System_Ext(googleCal, "Google Calendar API", "Two-way calendar sync, availability checks, and meeting generation")
    System_Ext(enrichers, "Enrichment Providers", "Clearbit, Apollo, and People Data Labs (PDL)")

    Rel(lead, meta, "Sends inbound inquiry / direct message")
    Rel(meta, revora, "Delivers signed webhook events [HMAC-SHA256]")
    Rel(revora, meta, "Dispatches approved conversational outreach")
    Rel(lead, stripe, "Submits payment on checkout page")
    Rel(stripe, revora, "Sends verified payment webhook events")
    Rel(revora, googleCal, "Queries free/busy slots & books demo appointments")
    Rel(salesRep, revora, "Reviews HITL approval queue, inspects traces, and edits drafts")
    Rel(admin, revora, "Configures workspace settings, ICP criteria, and discount limits")
    Rel(revora, enrichers, "Enriches contact & firmographic data via waterfall")
```

---

## 2. Container Diagram (C4 Level 2)

```mermaid
C4Container
    title Container Diagram — Revora Monorepo Architecture

    Container(web, "apps/web", "Next.js 14 (App Router), Vanilla CSS Obsidian Theme", "Tenant dashboard, CRM view, HITL approval queue, audit logs, and analytics")
    Container(api, "apps/api", "NestJS, TypeScript strict mode", "Core API, Webhook ingestion, Policy Engine, Tool Registry, Supervisor Swarm Runtime")
    ContainerDb(db, "packages/db (PostgreSQL 16)", "PostgreSQL + pgvector extension", "Multi-tenant relational CRM data with Row-Level Security (RLS) and vector embeddings")
    ContainerDb(redis, "Redis (Optional / Cache)", "In-memory key-value cache", "Rate limiting counters, ephemeral locks, and deduplication tokens")

    Rel(web, api, "HTTPS / JSON REST API [Bearer JWT with tenant_id claims]")
    Rel(api, db, "Drizzle ORM [AsyncLocalStorage tenant-aware connection pool]")
    Rel(api, redis, "Redis Cache / Lock Protocol")
```

---

## 3. Database ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    tenants ||--o{ users : "memberships"
    tenants ||--o{ companies : "owns"
    tenants ||--o{ contacts : "owns"
    tenants ||--o{ leads : "owns"
    tenants ||--o{ conversations : "owns"
    tenants ||--o{ opportunities : "owns"
    tenants ||--o{ approval_requests : "owns"
    tenants ||--o{ audit_events : "owns"
    tenants ||--o{ payments : "owns"
    tenants ||--o{ knowledge_documents : "owns"

    companies ||--o{ contacts : "employs"
    contacts ||--o{ leads : "generates"
    contacts ||--o{ conversations : "participates in"
    conversations ||--o{ messages : "contains"
    leads ||--o{ opportunities : "progresses to"
    opportunities ||--o{ payments : "settled by"
    leads ||--o{ approval_requests : "triggers"
    knowledge_documents ||--o{ knowledge_chunks : "chunked into"

    tenants {
        uuid id PK
        text slug UK
        text name
        text plan
        jsonb settings
        timestamp created_at
    }

    contacts {
        uuid id PK
        uuid tenant_id FK
        uuid company_id FK
        text name
        text email
        text phone
        jsonb social_profile_ids
        text consent_status
    }

    leads {
        uuid id PK
        uuid tenant_id FK
        uuid contact_id FK
        text status
        integer icp_fit_score
        integer intent_score
        text qualification_status
        jsonb score_reasons
        text source_channel
    }

    approval_requests {
        uuid id PK
        uuid tenant_id FK
        uuid lead_id FK
        text action_type
        text action_summary
        jsonb proposed_action
        text risk_level
        text status
        jsonb edited_action
        timestamp expires_at
    }

    payments {
        uuid id PK
        uuid tenant_id FK
        uuid opportunity_id FK
        uuid contact_id FK
        text stripe_session_id UK
        numeric amount
        text status
        boolean verified_via_webhook
    }
```

---

## 4. Sequence Diagrams

### 4.1 Lead Intake & Multi-Agent Swarm Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Lead as Prospect
    participant Meta as Meta Webhook (IG/WA)
    participant Webhooks as WebhooksService
    participant Supervisor as SupervisorAgent
    participant Intake as LeadIntakeAgent
    participant Identity as IdentityResolutionAgent
    participant Enrichment as EnrichmentAgent
    participant Qual as QualificationAgent
    participant DB as PostgreSQL (RLS)
    participant Audit as AuditService

    Lead->>Meta: Inbound inquiry ("Can I get demo pricing?")
    Meta->>Webhooks: POST /webhooks/instagram [X-Hub-Signature-256]
    Webhooks->>Webhooks: Verify HMAC-SHA256 signature
    Webhooks->>DB: Check idempotency key (provider_event_id)
    Webhooks->>Supervisor: Ingest verified inbound event
    Supervisor->>Intake: Normalize payload & create/update contact
    Intake->>DB: Upsert Contact & Lead records
    Supervisor->>Identity: Resolve identity across social & email
    Identity->>DB: Query candidate matches
    Supervisor->>Enrichment: Enrich company data (Clearbit waterfall)
    Enrichment->>DB: Upsert Company profile
    Supervisor->>Qual: Compute ICP Fit & Intent scores
    Qual->>Qual: Evaluate deterministic rubric & factor breakdown
    Qual->>DB: Update lead qualification status & score_reasons
    Supervisor->>Audit: Record trace, agent transitions, and token usage
```

### 4.2 Human-in-the-Loop Approval & Message Dispatch

```mermaid
sequenceDiagram
    autonumber
    participant Conv as ConversationAgent
    participant Policy as PolicyEngineService
    participant Approvals as ApprovalsService
    participant DB as PostgreSQL
    actor Reviewer as Sales Manager
    participant Dispatcher as Outreach Dispatcher
    participant Audit as AuditService

    Conv->>Conv: Draft reply proposing 20% discount ($15,000 quote)
    Conv->>Policy: evaluateAction(send_outbound_message, quoteValue: 15000, discount: 20)
    Policy->>Policy: Check tenant max_discount (15%) & value threshold ($10,000)
    Policy-->>Conv: Decision: REQUIRE_APPROVAL (Risk: high)
    Policy->>Approvals: createApprovalRequest(...)
    Approvals->>DB: Store pending approval request with 7-day TTL
    Approvals->>Conv: Workflow PAUSED pending review
    Reviewer->>Approvals: Inspect pending queue & edit discount to 10%
    Reviewer->>Approvals: editAndApproveAction(approvalId, editedAction)
    Approvals->>DB: Update status to 'edited' with edited_action
    Approvals->>Dispatcher: Dispatch approved modified message
    Dispatcher->>Audit: Log execution audit trail & timestamp
```

### 4.3 Meeting Booking Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Lead as Qualified Lead
    participant Conv as ConversationAgent
    participant Booking as BookingAgent
    participant Calendar as Google Calendar API
    participant DB as PostgreSQL
    participant Audit as AuditService

    Lead->>Conv: "Let's schedule a walkthrough Thursday at 2pm EST"
    Conv->>Booking: Coordinate booking for Thursday 2pm
    Booking->>Calendar: check_calendar_availability(slot)
    Calendar-->>Booking: Slot Available
    Booking->>Calendar: book_calendar_meeting(lead, slot)
    Calendar-->>Booking: Meeting Confirmed (eventUrl, meetLink)
    Booking->>Booking: Generate Pre-Meeting Briefing Dossier
    Booking->>DB: Update lead status to 'meeting_booked'
    Booking->>Audit: Record booking event and CRM calendar activity
```

### 4.4 Stripe Authoritative Payment Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Conv as ConversationAgent
    participant Stripe as Stripe API
    participant Webhooks as StripeWebhookService
    participant DB as PostgreSQL
    participant Audit as AuditService

    Customer->>Conv: "I sent the payment, please activate me!"
    Conv->>Conv: Refuse unverified claim: Check payment status
    Customer->>Stripe: Complete Checkout Session ($499.00 USD)
    Stripe->>Webhooks: POST /webhooks/stripe [Stripe-Signature]
    Webhooks->>Webhooks: Verify Stripe cryptographic signature
    Webhooks->>DB: Check webhook event idempotency (evt_id)
    Webhooks->>DB: Record verified payment (verified_via_webhook = true)
    Webhooks->>DB: Transition Opportunity stage to 'won'
    Webhooks->>Audit: Log payment confirmation & trigger onboarding
```

---

## 5. Security & Isolation Models

### 5.1 Tenant Isolation
- **Row-Level Security (RLS)**: Every tenant-scoped table features PostgreSQL RLS policies (`WHERE tenant_id = current_setting('app.current_tenant_id')`).
- **AsyncLocalStorage (ALS)**: API request context binds the verified Clerk JWT `tenant_id` to the execution fiber. Client-provided `tenant_id` query parameters are strictly forbidden from overriding authenticated context.

### 5.2 Agent Permission Model
Agents are strictly bound by role-based tool permission tiers:
- **Tier 1 (Read-Only)**: `search_crm_contacts`, `search_knowledge_base`, `check_calendar_availability`. Allowed for autonomous execution.
- **Tier 2 (Internal Write)**: `update_lead_qualification`, `trigger_human_handoff`. Supervised execution.
- **Tier 3 (External Write)**: `draft_outbound_message`, `book_calendar_meeting`. Semi-autonomous under strict rate limits.
- **Tier 4 (Financial / High-Risk)**: `create_checkout_session`, outbound messages with discounts exceeding policy thresholds. Bounded autonomy: mandatory human approval required before execution.

---

## 6. Threat Model (STRIDE)

| Threat Category | Revora Threat Scenario | Platform Mitigation |
|---|---|---|
| **Spoofing** | Adversary attempts to forge webhook payloads | Strict HMAC-SHA256 signature verification on raw request buffers before deserialization. |
| **Tampering** | User manipulates client payload to change offer price | Authoritative server-side pricing catalog; client input price values are rejected. |
| **Repudiation** | Operator claims an unauthorized message was sent by AI | Immutable, tenant-isolated audit log recording actor, policy decisions, and full prompt traces. |
| **Information Disclosure** | Cross-tenant data leakage via search or vector queries | Multi-tenant PostgreSQL RLS combined with tenant-filtered pgvector cosine queries. |
| **Denial of Service** | Webhook flooding or LLM token exhaustion loops | Idempotency key deduplication in Redis/Postgres; hard tool execution iteration limits (max 5 turns). |
| **Elevation of Privilege** | Prompt injection attacks instructing agent to bypass approval | Untrusted input demarcation, system instructions forbidding instruction override, and server-side policy gatekeeper. |
