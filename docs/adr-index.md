# Revora — Architectural Decision Records (ADR Index)

This document indexes all major Architectural Decision Records (ADRs) guiding the design and implementation of Revora.

---

| ADR ID | Title | Status | Date | Core Decision Summary |
|---|---|:---:|:---:|---|
| **ADR-001** | Turborepo Monorepo Architecture | Accepted | 2026-09-20 | Adopt Turborepo managing `apps/web`, `apps/api`, `packages/db`, and `packages/shared` with centralized TypeScript strict configuration. |
| **ADR-002** | Vanilla CSS Obsidian Design System | Accepted | 2026-09-21 | Implement a custom Obsidian dark theme (`#08090C`, `#6366F1`) using Vanilla CSS variables instead of Tailwind utility churn. |
| **ADR-003** | NestJS Application Framework | Accepted | 2026-09-21 | Select NestJS for `apps/api` to provide enterprise modularity, dependency injection, and clean guard/interceptor pipelines. |
| **ADR-004** | PostgreSQL with pgvector Extension | Accepted | 2026-09-22 | Use PostgreSQL 16+ with native `pgvector` for unified transactional CRM data and cosine semantic knowledge embeddings. |
| **ADR-005** | Drizzle ORM for Data Layer | Accepted | 2026-09-22 | Adopt Drizzle ORM for zero-overhead, type-safe SQL queries, and deterministic multi-tenant schema migrations. |
| **ADR-006** | Row-Level Security & AsyncLocalStorage | Accepted | 2026-09-22 | Enforce multi-tenant data isolation via PostgreSQL RLS combined with server-bound AsyncLocalStorage context propagation. |
| **ADR-007** | Clerk Authentication & RBAC | Accepted | 2026-09-23 | Leverage Clerk for multi-tenant identity and session tokens, mapped to Revora's 5 user roles via database memberships. |
| **ADR-008** | Mastra Agent Runtime & Bounded Autonomy | Accepted | 2026-09-23 | Coordinate specialized AI agents via Mastra runtime patterns with hard policy gates requiring human review for high-risk actions. |
| **ADR-009** | Cryptographic Webhook Invariants | Accepted | 2026-09-23 | Require raw-buffer HMAC-SHA256 signature verification and unique idempotency key indexes on all inbound provider webhooks. |
| **ADR-010** | Authoritative Stripe Billing Invariant | Accepted | 2026-09-24 | Customer conversational claims of payment are strictly refused until authoritative Stripe webhook confirmation arrives. |
| **ADR-011** | LLM-as-a-Judge Evaluation Runner | Accepted | 2026-09-24 | Implement automated rubric scoring across groundedness, policy compliance, tone, and ICP qualification accuracy. |
| **ADR-012** | Exponential Backoff & Dead-Letter State | Accepted | 2026-09-24 | Handle third-party provider failures with exponential backoff retries, transitioning unrecoverable events to dead-letter states. |
