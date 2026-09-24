# Revora — GTM Intelligence OS

> **Multi-tenant, multi-agent GTM and CRM automation platform.** Captures leads, understands buying intent, automates sales workflows, updates CRM records, and involves humans when decisions require approval.

---

## Quick Start

### Prerequisites
- Node.js >= 20
- Docker Desktop (for local Postgres + Redis + Inngest)
- Clerk account (auth)
- Stripe account (payments)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# → Fill in .env with your actual keys

# 3. Start infrastructure
docker-compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Start all apps in dev mode
npm run dev
```

| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:3000 |
| API | http://localhost:4000 |
| Inngest Dev Server | http://localhost:8288 |

---

## Architecture

```
Web Dashboard (Next.js)
    ↓
API Gateway (NestJS) → Auth + RBAC → Tenant Isolation
    ↓
Domain Services: CRM | Agents | Policy | Integration | Knowledge | Evaluation | Analytics
    ↓
Event Bus ↔ Inngest Workflow Engine ↔ Durable Agent Workflows
    ↓
11 AI Agents (Intake, Identity, Enrichment, Qualification, Conversation, 
              Outreach, Follow-up, Booking, Payment, Handoff, Analytics)
    ↓
PostgreSQL + pgvector | Redis | OpenTelemetry
    ↓
Stripe | Google Calendar | Instagram/WhatsApp | Email | HubSpot | Nango/Unipile
```

---

## Project Structure

```
revora/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── shared/       # Types + Zod schemas
│   ├── db/           # Drizzle schema + migrations
│   └── ui/           # Shared React components
├── docs/             # Architecture, API, deployment docs
├── .changelogs/      # DEVLOG + ADRs (read this for project history)
├── docker-compose.yml
├── .env.example
└── turbo.json
```

---

## Key Documents

| Document | Location |
|----------|----------|
| Product Requirements | `PRD` |
| Developer Log | `.changelogs/DEVLOG.md` |
| Phased Task Breakdown | See DEVLOG |
| Architecture Diagram | `docs/architecture/` |
| Module Deep-Dives | `docs/agents/` |
| API Docs | `docs/api/` |

---

## The 11 Agents

| Agent | Purpose |
|-------|---------|
| Lead Intake | Normalize incoming events → CRM records |
| Identity Resolution | Deduplicate contacts across channels |
| Enrichment | Add company/industry/location data |
| Qualification | ICP scoring + buying intent |
| Conversation | RAG-powered inbound replies |
| Outreach | Personalized outbound drafts |
| Follow-up | Re-engage stale conversations |
| Booking | Calendar availability + meeting creation |
| Payment | Stripe checkout + webhook verification |
| Human Handoff | Pause automation, assign to human |
| Analytics | Business + operational reporting |

---

## Development Workflow

1. **Read** `.changelogs/DEVLOG.md` before making any significant change
2. **Log** every decision, file creation, or architectural choice in DEVLOG
3. **Check** `revora_task_breakdown.md` to see what's next in the current phase
4. **Test** against the 8 portfolio demo scenarios before considering a phase done

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL + pgvector |
| ORM | Drizzle ORM |
| Workflow | Inngest |
| Agents | Mastra / LangGraph |
| Cache | Redis |
| Auth | Clerk |
| Observability | OpenTelemetry |
| Payments | Stripe |
| Calendar | Google Calendar |
| Integrations | Nango + Unipile |
| CI/CD | GitHub Actions |

---

*Revora — Built by Mohammed Sohel*
