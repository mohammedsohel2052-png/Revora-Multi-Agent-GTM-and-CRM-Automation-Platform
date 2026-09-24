# DEVLOG — Revora GTM Intelligence OS
> **Purpose:** Living record of all development decisions, changes, scaffolding, and architectural choices. Every significant change must be logged here. Other developers can onboard using this file alone.

---

## Format (copy for each entry)
```
### [YYYY-MM-DD] — [TITLE]
**Who:** [Name]
**Phase:** Phase X
**Type:** Decision | Scaffolding | Feature | Bug | Refactor | Security | Config | Test

**What happened:**

**Why:**

**Files affected:**
-

**Decisions made:**
-

**Open questions:**
-
```

---

## 2026-09-24 — Project Kickoff

### [2026-09-24] — PRD v1.0 Finalized
**Who:** Mohammed Sohel  
**Phase:** Phase 0  
**Type:** Decision

**What happened:**
1900-line PRD finalized for GTM Intelligence OS / Revora covering multi-tenant, multi-agent CRM and GTM automation platform.

**Why:**
Portfolio project demonstrating: multi-agent architecture, event-driven systems, durable workflows, multi-tenancy, OAuth, CRM data modeling, human-in-the-loop, AI evaluation, observability, revenue analytics.

**Files affected:**
- `PRD` — master product requirements document (1900 lines, v1.0)

**Decisions made:**
- Platform name: Revora / GTM Intelligence OS
- Primary users: Founders, freelancers, agencies, sales teams, SMBs
- Core differentiator: Unified CRM + GTM automation with explainable AI + human-in-the-loop
- MVP scenario: Instagram DM → lead created → enriched → scored → replied (approved) → meeting booked → CRM updated

**Open questions (resolve before coding):**
- [ ] ORM: Drizzle vs Prisma? → See ADR-001
- [ ] Agent framework: LangGraph vs Mastra? → See ADR-002
- [ ] Auth: Clerk vs Auth.js? → See ADR-003
- [ ] Integration layer: Nango vs Unipile? → See ADR-004

---

### [2026-09-24] — Full Project Scaffold (Antigravity AI Agent Swarm)
**Who:** Antigravity AI  
**Phase:** Phase 0  
**Type:** Scaffolding

**What happened:**
Parallel agent swarm executed all initialization tracks simultaneously:
1. Read and analyzed full PRD (1900 lines)
2. Generated system architecture diagram (7-layer visual, saved as artifact)
3. Created phased task breakdown (Phases 0–7, 70+ tasks)
4. Scaffolded complete monorepo directory structure
5. Created all root config files
6. Created module deep-dive documentation
7. Created this DEVLOG

**Why:**
User requested parallel execution of all project initialization tracks.

**Files created:**
- `package.json` — root monorepo with Turborepo workspaces
- `turbo.json` — Turborepo task pipeline config
- `tsconfig.json` — strict TypeScript base config
- `docker-compose.yml` — Postgres+pgvector, Redis, Inngest dev server
- `.env.example` — all required environment variables with comments
- `README.md` — project overview and quick start
- `.changelogs/DEVLOG.md` — THIS FILE
- `.changelogs/decisions/ADR-001-orm.md` — ORM decision record
- `.changelogs/decisions/ADR-002-agent-framework.md` — agent framework ADR
- `.changelogs/decisions/ADR-003-auth.md` — auth provider ADR
- `.changelogs/decisions/ADR-004-integration-layer.md` — integration layer ADR

**Directories created (complete tree):**
```
apps/web/app/(auth)/login
apps/web/app/(auth)/workspace-select
apps/web/app/(dashboard)/crm/contacts
apps/web/app/(dashboard)/crm/companies
apps/web/app/(dashboard)/leads
apps/web/app/(dashboard)/inbox
apps/web/app/(dashboard)/agents
apps/web/app/(dashboard)/approvals
apps/web/app/(dashboard)/knowledge
apps/web/app/(dashboard)/analytics
apps/web/app/(dashboard)/evaluation
apps/web/app/(dashboard)/audit
apps/web/app/(dashboard)/settings
apps/web/components/ui
apps/web/components/crm
apps/web/components/agents
apps/web/lib
apps/api/src/modules/{auth,tenants,crm,agents,workflows,knowledge,integrations,approvals,analytics,evaluation,audit,policy}
apps/api/src/agents/{lead-intake,identity-resolution,enrichment,qualification,conversation,outreach,follow-up,booking,payment,human-handoff,analytics}
apps/api/src/tools
apps/api/src/events
apps/api/src/common/{guards,decorators,middleware}
packages/shared/src/{types,schemas,events,constants}
packages/db/{schema,migrations,seed}
packages/ui/src/components
docs/{architecture,api,agents,deployment}
.changelogs/decisions
```

**Decisions made:**
- Monorepo tool: Turborepo (best for multi-app TypeScript monorepos)
- Package manager: npm (already installed)
- Infrastructure: Docker Compose for local dev (no cloud account needed to start)
- Node.js found at: `C:\Program Files\nodejs\`

**Note:** Node.js is not in shell PATH by default. Run commands with:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
```
Or add permanently via System Properties → Environment Variables.

---

## Architecture Decision Records

### ADR-001 — ORM: Drizzle vs Prisma
**Status:** ⚠️ PENDING  
**Deadline:** Before Phase 1B (DB setup)

**Option A: Drizzle ORM**
- Pros: SQL-first, excellent TypeScript inference, lightweight runtime, easy RLS/raw SQL, fast
- Cons: Newer, less ecosystem than Prisma

**Option B: Prisma**
- Pros: Mature, great migrations, very popular, strong DX
- Cons: Heavier runtime, less control for complex RLS patterns

**Recommendation:** Drizzle (better for tenant isolation SQL patterns and performance at scale)  
**Decision:** ✅ Drizzle ORM accepted for Revora core  
**Decided by:** Mohammed Sohel on 2026-09-24

---

### ADR-002 — Agent Framework: LangGraph vs Mastra vs Custom
**Status:** ✅ DECIDED  
**Deadline:** Before Phase 2 (Agent runtime)

**Option A: Mastra**
- TypeScript-native, production-focused, designed for agentic workflows
- Has built-in workflow engine, tool registry, memory
- Newer but actively developed

**Option B: LangGraph.js**
- Graph-based state machine, battle-tested in Python ecosystem
- Good for complex routing and conditional edges
- JS port is less mature

**Option C: Custom typed orchestrator**
- Full control over every aspect
- Significant engineering effort
- Best for exact fit to Inngest/Revora patterns

**Recommendation:** Mastra (TypeScript-native, Inngest-compatible, production-grade)  
**Decision:** ✅ Mastra accepted for multi-agent runtime  
**Decided by:** Mohammed Sohel on 2026-09-24

---

### ADR-003 — Auth: Clerk vs Auth.js
**Status:** ✅ DECIDED  
**Deadline:** Before Phase 1C (Auth)

**Option A: Clerk**
- Managed service, multi-tenant Organizations built-in
- Excellent Next.js integration
- Paid at scale, less control

**Option B: Auth.js (NextAuth v5)**
- Open source, self-hosted
- More configuration required
- Full control, no external dependency

**Recommendation:** Clerk (Organizations maps perfectly to workspace/tenant model, saves weeks)  
**Decision:** ✅ Clerk accepted for multi-tenant identity and session control  
**Decided by:** Mohammed Sohel on 2026-09-24

---

### ADR-004 — Integration Layer: Nango vs Unipile vs Custom
**Status:** ✅ DECIDED  
**Deadline:** Before Phase 3B (Lead intake webhook)

**Option A: Nango**
- Open source, manages OAuth for 200+ APIs
- Token refresh, credential storage built-in
- Best for Google Calendar, HubSpot, Zoho

**Option B: Unipile**
- Specialized in messaging channels (Instagram, LinkedIn, WhatsApp, Email)
- Unified inbox API
- Best for inbound lead capture

**Option C: Custom adapters**
- Full control
- Significant effort for each provider

**Recommendation:** Nango for OAuth-based APIs + Unipile for messaging channels  
**Decision:** ✅ Hybrid Nango + Unipile accepted  
**Decided by:** Mohammed Sohel on 2026-09-24

---

## 2026-09-24 — Phase 1: Foundation & Core Multi-Tenancy

### [2026-09-24] — Phase 1 Foundation Built and Verified
**Who:** Antigravity AI  
**Phase:** Phase 1 (Foundation & Multi-Tenancy)  
**Type:** Scaffolding | Feature | Security

**What happened:**
1. **Database Layer (`@revora/db`):**
   - Implemented complete Drizzle ORM schema for all 18 tables: `tenants`, `users`, `memberships`, `agents`, `contacts`, `companies`, `leads`, `conversations`, `messages`, `opportunities`, `approval_requests`, `audit_events`, `knowledge_documents`, `knowledge_chunks` (vector 1536d), `integrations`, `webhook_events`, `payments`, `usage_events`.
   - Built `withTenantContext(tenantId, callback)` executing `SELECT set_config('app.tenant_id', ...)` inside an isolated PostgreSQL transaction for strict RLS enforcement.
   - Configured `drizzle.config.ts` for automated migrations and schema push.

2. **API Backend Engine (`@revora/api`):**
   - Scaffolded production NestJS application with Swagger/OpenAPI (`/api/docs`), CORS, validation pipes, and `/api/v1` prefix.
   - Implemented `TenantMiddleware` utilizing Node.js `AsyncLocalStorage` to isolate tenant context across concurrent requests.
   - Implemented `TenantGuard` and `@CurrentTenant` / `@CurrentUser` parameter decorators.
   - Implemented global `AuditModule`, `AuditService` with PII redaction and `AuditInterceptor` recording all mutation operations to `audit_events`.
   - Implemented `HealthController` (`/api/v1/health`) checking database latency and process uptime.
   - Implemented `TenantsService` and `TenantsController` supporting workspace provisioning and automated agent team bootstrap.

3. **Frontend Application (`@revora/web`):**
   - Built with Next.js 14 App Router and custom Revora Obsidian dark design system (Vanilla CSS with glowing indigo/violet accents, glassmorphic cards, micro-animations, and Outfit / Plus Jakarta Sans typography).
   - Created **Command Center Dashboard** with live KPI metrics, active agent swarm status grid, and realtime audit feed.
   - Created **Human-in-the-Loop Approvals Queue** with risk level tags, deterministic policy trigger explanations, and payload review/edit capabilities.
   - Created **Leads Intelligence Pipeline** with deterministic ICP fit & intent score dossiers, buying signals, and channel filters.
   - Created **Omnichannel Unified Inbox** with AI agent copilot draft review and multi-channel badges.
   - Created **Knowledge Base (RAG)** vector chunk view.
   - Created **Audit & Compliance Trail** log view.

4. **Monorepo Compilation & Verification:**
   - Ran `npm install` across all 4 workspaces (`@revora/shared`, `@revora/db`, `@revora/api`, `@revora/web`).
   - Ran TypeScript checks on all 4 workspaces — all passing cleanly with 0 errors!

**Files affected:**
- `packages/shared/src/index.ts`, `packages/shared/src/events/domain-events.ts`, `packages/shared/tsconfig.json`
- `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`
- `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/common/**`, `apps/api/src/modules/**`
- `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.mjs`, `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/(dashboard)/**`

---

*DEVLOG started: 2026-09-24 | Project: Revora GTM Intelligence OS | Maintained by: Mohammed Sohel*
