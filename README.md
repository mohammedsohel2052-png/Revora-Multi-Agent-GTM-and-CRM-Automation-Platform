# Revora — GTM Intelligence OS

> **Multi-tenant, event-driven, multi-agent GTM and CRM automation platform.** Coordinates specialized AI agents under strict bounded autonomy for inbound lead capture, identity resolution, waterfall enrichment, explainable ICP scoring, conversational qualification, Google Calendar scheduling, Stripe billing, and CRM synchronization.

[![Verification Status](https://img.shields.io/badge/Verification-100%25%20Verified%20(68%2F68)-brightgreen)](#verification--test-suites)
[![Tests Passing](https://img.shields.io/badge/Test%20Suites-15%2F15%20Passing-success)](#verification--test-suites)
[![Multi-Tenant Isolation](https://img.shields.io/badge/Tenant%20Isolation-PostgreSQL%20RLS-blue)](#security--isolation)
[![Bounded Autonomy](https://img.shields.io/badge/HITL%20Policy-Enforced-orange)](#bounded-autonomy--approvals)

---

## System Architecture

```
                                  +-----------------------------+
                                  | Inbound Omnichannel Webhook |
                                  |   (WhatsApp / IG / Email)   |
                                  +-----------------------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  | HMAC Signature Verification |
                                  | & Idempotency Key Dedup     |
                                  +-----------------------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |    Supervisor Swarm Agent   |
                                  +-----------------------------+
                                                 |
        +-------------------+--------------------+-------------------+--------------------+
        |                   |                    |                   |                    |
        v                   v                    v                   v                    v
+---------------+   +----------------+   +---------------+   +---------------+   +------------------+
|  Lead Intake  |-->|    Identity    |-->|  Enrichment   |-->| Qualification |-->|   Conversation   |
| Normalization |   |   Resolution   |   |   Waterfall   |   |  ICP Scoring  |   |   Outreach Draft |
+---------------+   +----------------+   +---------------+   +---------------+   +------------------+
                                                                                          |
                                                                                          v
                                                                             +-------------------------+
                                                                             | Policy Engine & Bounded |
                                                                             | Autonomy Review Gate    |
                                                                             +-------------------------+
                                                                                          |
                                                         +--------------------------------+--------------------------------+
                                                         | (Low Risk / Policy Compliant)  | (High Risk / Unapproved Quote)
                                                         v                                v
                                              +--------------------+           +---------------------+
                                              | Outbound Dispatch  |           | Human-in-the-Loop   |
                                              | (Exact Once)       |           | Approval Queue      |
                                              +--------------------+           +---------------------+
                                                         |                                | (Sales Manager Edits)
                                                         |                                v
                                                         +--------------------->[ Approved & Sent ]
                                                                                          |
                                                                                          v
                                                                             +-------------------------+
                                                                             | PostgreSQL CRM + RLS    |
                                                                             | Audit Log & Trace ($)   |
                                                                             +-------------------------+
```

---

## Verification & Test Suites (68/68 Passing)

All capabilities are verified with automated test suites in `tests/` and `apps/api/test/`:

| Test Suite | Spec File | Tests | Coverage Scope | Status |
|---|---|:---:|---|:---:|
| **Golden-Path E2E** | `tests/integration/golden-path.e2e.spec.ts` | 3 | Full 27-step lifecycle: Webhook -> HMAC -> Idempotency -> Swarm -> Policy -> HITL -> CRM -> Audit | ✅ PASS |
| **Portfolio Demos 1-8** | `tests/integration/portfolio-demos.spec.ts` | 8 | Validates all 8 portfolio demo scenarios end-to-end | ✅ PASS |
| **Duplicate Webhooks** | `tests/integration/duplicate-webhook.e2e.spec.ts` | 2 | Webhook idempotency keys & duplicate event rejection | ✅ PASS |
| **Approval Workflow** | `tests/integration/approval-workflow.e2e.spec.ts` | 4 | Policy evaluation, pause/resume, edit-and-approve, unauthorized role rejection | ✅ PASS |
| **Stale SLA Automation** | `tests/integration/stale-followup.e2e.spec.ts` | 2 | >48h conversation inactivity detection & transition to nurture | ✅ PASS |
| **Calendar Booking** | `tests/integration/booking.e2e.spec.ts` | 5 | Slot availability, OAuth failure safety, double-booking prevention, CRM pre-meeting briefing | ✅ PASS |
| **Stripe Billing** | `tests/integration/payment.e2e.spec.ts` | 3 | Authoritative server pricing, client price spoofing rejection, Stripe webhook verification | ✅ PASS |
| **Failure Recovery** | `tests/integration/failure-recovery.e2e.spec.ts` | 2 | Exponential backoff retries, dead-letter state, and error bounding | ✅ PASS |
| **Tenant Isolation** | `tests/security/tenant-isolation.e2e.spec.ts` | 3 | Zero cross-tenant leakage across contacts, knowledge chunks, and traces; client spoof rejection | ✅ PASS |
| **RBAC Security** | `tests/security/rbac.e2e.spec.ts` | 4 | Role permission matrix for all 5 roles; role escalation prevention | ✅ PASS |
| **Tool Permissions** | `tests/security/tool-permissions.e2e.spec.ts` | 2 | Read, write, external write, and financial tool risk tier boundaries | ✅ PASS |
| **Webhook Security** | `tests/security/webhook-security.e2e.spec.ts` | 3 | HMAC-SHA256 signature verification, replay attacks, secret redaction | ✅ PASS |
| **Prompt Injection** | `tests/security/prompt-injection.e2e.spec.ts` | 3 | Jailbreak defense, system prompt leak prevention, pricing manipulation refusal | ✅ PASS |
| **Load Benchmark** | `tests/load/load.spec.ts` | 3 | 20 tenants, 100 concurrent leads (<200ms p95), 20 simultaneous approvals, cross-tenant isolation | ✅ PASS |
| **Agent Runtime** | `apps/api/test/agent-runtime.spec.ts` | 25 | Unit tests for agent execution, tools, Mastra evaluation, and policy engine | ✅ PASS |
| **Total** | **15 Suites** | **68** | **Comprehensive Platform Verification** | **100% PASS** |

Run all tests:
```bash
npm test
# or
npx jest tests/ apps/api/test/
```

---

## Dual Demo Workspaces

Revora includes realistic, fully populated seed data for two distinct tenants:

1. **Mumbai Growth Studio** (`slug: mumbai-growth-studio`)
   - Industry: Digital marketing agency
   - Core Offer: AI lead intake & automation packages
   - Voice: Friendly and direct
   - Target ICP: Indian and international SMBs ($500k-$10M ARR)
2. **Northstar Fitness** (`slug: northstar-fitness`)
   - Industry: Executive fitness and athletic coaching
   - Core Offer: Premium 1-on-1 physical conditioning protocols
   - Voice: Motivational and concise
   - Target ICP: High-stress corporate executives and working professionals

Both workspaces contain 20+ contacts, 10+ companies, 15+ leads, 5+ conversations (including stale threads), opportunities, verified Stripe payments, and distinct knowledge documents.

Seed database:
```bash
npm run db:seed
```

---

## Running the 8 Portfolio Demos

Execute each verified portfolio demo individually:

```bash
# Demo 1: Inbound Lead Intake & Normalization
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 1"

# Demo 2: Multi-Agent Swarm Coordination
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 2"

# Demo 3: Bounded Autonomy & Human Approval
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 3"

# Demo 4: Durable Waiting & SLA Follow-Up
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 4"

# Demo 5: Failure Recovery & Backoff Retries
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 5"

# Demo 6: Explainable ICP Lead Scoring
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 6"

# Demo 7: Prompt Evaluation (v1.0 vs v2.1)
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 7"

# Demo 8: Multi-Tenant Data Isolation
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 8"
```

---

## Documentation Index

- [Implementation Audit](file:///docs/implementation-audit.md): Complete Phase 0–7 task audit and verification matrix.
- [Verification Matrix](file:///docs/verification-matrix.md): Granular capability-by-capability evidence table.
- [System Architecture](file:///docs/architecture.md): C4 diagrams, ERD, sequence diagrams, and threat models.
- [Security & RBAC](file:///docs/security.md): RLS policies, 5-role RBAC matrix, webhook crypto, and prompt defense.
- [Deployment Guide](file:///docs/deployment.md): Docker Compose, migrations, seeding, and operations.
- [API Reference](file:///docs/api.md): REST endpoints, headers, payloads, and response schemas.
- [Agent Evaluation](file:///docs/evaluation.md): LLM-as-a-judge heuristics, rubrics, and benchmarking.
- [Demo Scripts](file:///docs/demo-script.md): Step-by-step walkthrough for portfolio reviews.
- [ADR Index](file:///docs/adr-index.md): Architectural Decision Records (ADR-001 through ADR-012).
- [Developer Log](file:///DEVLOG.md): Comprehensive timestamped engineering journal.

---

## Quick Start

### 1. Start Infrastructure
```bash
docker-compose up -d postgres
```

### 2. Install & Configure
```bash
npm install
cp .env.example .env
```

### 3. Migrate & Seed Database
```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Servers
```bash
# Terminal 1: NestJS API (port 4000)
npm run start:dev --workspace=apps/api

# Terminal 2: Next.js Web Dashboard (port 3000)
npm run dev --workspace=apps/web
```

---
*Revora Platform — Built with strict engineering verification and bounded autonomy.*
