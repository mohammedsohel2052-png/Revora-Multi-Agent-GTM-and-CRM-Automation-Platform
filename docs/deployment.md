# Revora — Deployment & Operations Guide

This guide covers deployment, environment configuration, database management, and operations for Revora.

---

## 1. Prerequisites

- **Node.js**: v18.18.0 or v20.x
- **pnpm**: v8.x or v9.x (recommended) or npm v10+
- **PostgreSQL**: 16+ with `pgvector` extension enabled
- **Docker & Docker Compose**: For local containerized infrastructure
- **Third-Party Accounts**:
  - Clerk (Authentication)
  - Stripe (Billing & Webhooks)
  - Meta for Developers (WhatsApp Business Cloud & Instagram Messaging)
  - Google Cloud Console (Calendar OAuth 2.0)
  - OpenAI / Anthropic (LLM inference)

---

## 2. Environment Variables

Create `.env` in the root workspace (reference: `.env.example`):

```bash
# Server & Environment
PORT=4000
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/revora
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/revora

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI / LLM Providers
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# External Integrations
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
META_APP_SECRET=...
INSTAGRAM_WEBHOOK_SECRET=dev_webhook_secret
WHATSAPP_WEBHOOK_SECRET=dev_webhook_secret

# Google Calendar OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Bounded Autonomy Overrides
ENABLE_AUTONOMOUS_SENDING=false
MAX_AUTO_DISCOUNT_PERCENT=15
```

---

## 3. Local Development Setup

### Step 1: Start PostgreSQL with pgvector
```bash
docker-compose up -d postgres
```

### Step 2: Install Monorepo Dependencies
```bash
npm install
```

### Step 3: Run Database Migrations
```bash
npm run db:push
# or
npx drizzle-kit push --config=packages/db/drizzle.config.ts
```

### Step 4: Seed Portfolio Demo Data
```bash
npm run db:seed
```
This populates the two isolated workspaces (**Mumbai Growth Studio** and **Northstar Fitness**) with the required 20+ contacts, 10+ companies, 15+ leads, and realistic historical interactions.

### Step 5: Start API & Web Apps
```bash
# Start API backend (NestJS on port 4000)
npm run start:dev --workspace=apps/api

# Start Web dashboard (Next.js on port 3000)
npm run dev --workspace=apps/web
```

---

## 4. Webhook & Stripe Local Testing

### Stripe Webhook Forwarding
Use the Stripe CLI to listen and forward events locally:
```bash
stripe listen --forward-to localhost:4000/webhooks/stripe
```
Copy the webhook secret output (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

### Meta (Instagram / WhatsApp) Webhooks
Use ngrok or Cloudflare Tunnels for local HTTPS callback URLs:
```bash
ngrok http 4000
```
Set Webhook Callback URL in Meta App Dashboard to `https://<your-subdomain>.ngrok-free.app/webhooks/instagram` with verification token matching `INSTAGRAM_WEBHOOK_SECRET`.

---

## 5. Health Checks & Verification

- **API Liveness Probe**: `GET http://localhost:4000/health` -> `200 OK {"status": "ok"}`
- **Database Connection Check**: `GET http://localhost:4000/health/db` -> `200 OK {"database": "connected", "pgvector": "active"}`

---

## 6. Production Deployment

### Containerized Deployment (Docker)
Build production containers:
```bash
docker build -t revora-api -f apps/api/Dockerfile .
docker build -t revora-web -f apps/web/Dockerfile .
```

### Zero-Downtime Rollback
1. Maintain previous image tags: `revora-api:v1.4.2` and `revora-api:v1.4.1`.
2. To rollback in case of an incident:
   ```bash
   kubectl set image deployment/revora-api revora-api=revora-api:v1.4.1
   ```
3. Database migrations follow expand-and-contract patterns: columns are never dropped until old versions are terminated.

### Backup & Disaster Recovery
- **Continuous WAL Archiving**: Backed up to S3 with point-in-time recovery (PITR) enabled.
- **Daily Snapshot**: Automated pg_dump scheduled at 02:00 UTC with 30-day retention.
