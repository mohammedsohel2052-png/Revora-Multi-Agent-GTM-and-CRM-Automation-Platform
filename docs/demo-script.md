# Revora — Portfolio Demonstration Scripts

This script provides step-by-step instructions to demonstrate the 8 core capabilities of Revora across two isolated portfolio workspaces: **Mumbai Growth Studio** and **Northstar Fitness**.

---

## Workspace Profiles

- **Workspace A**: Mumbai Growth Studio (Digital marketing agency, AI lead automation, Friendly & direct voice, SMB ICP)
- **Workspace B**: Northstar Fitness (Fitness & executive coaching, Premium coaching program, Motivational & concise voice, Working professionals ICP)

---

## Demo 1: Inbound Lead Intake & Normalization

### Scenario
An inbound WhatsApp inquiry is simulated from a prospective Mumbai logistics company.

### Execution
Run the verification test:
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 1"
```
Or send an authenticated webhook payload:
```http
POST /webhooks/whatsapp
X-Hub-Signature-256: <valid_hmac>
{
  "providerEventId": "evt_demo_intake_001",
  "sender": { "name": "Rajesh Kulkarni", "phone": "+919820011223" },
  "message": "Hello, looking for AI lead intake setup for our Mumbai logistics office."
}
```

### What to Observe
1. Webhooks service validates HMAC-SHA256 signature against `WHATSAPP_WEBHOOK_SECRET`.
2. Idempotency table ensures the event is not processed twice.
3. Contact `Rajesh Kulkarni` and associated Lead record are created strictly inside `Mumbai Growth Studio`.

---

## Demo 2: Multi-Agent Swarm Pipeline

### Scenario
A qualified executive sends an Instagram inquiry. The Supervisor routes work across Intake, Identity Resolution, Enrichment, Qualification, and Conversation agents.

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 2"
```

### What to Observe
1. **Intake Agent**: Normalizes message into structured format.
2. **Identity Resolution**: Matches email domain against corporate contacts.
3. **Enrichment**: Queries waterfall provider for company headcount (200-500) and industry.
4. **Qualification**: Generates deterministic ICP score (95/100) with explainable reasons.
5. **Trace Log**: Full correlation ID (`tr_...`) links all subagent executions together.

---

## Demo 3: Bounded Autonomy & Human-in-the-Loop Approval

### Scenario
An agent proposes a customized enterprise quote offering a 30% discount. The policy engine intercepts the draft and requires human review.

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 3"
```

### What to Observe
1. Policy engine detects discount >15% and pauses the workflow.
2. A high-risk `approval_request` is created in `apps/web` approval queue.
3. Sales Manager reviews the request, adjusts the discount to 12%, and approves it.
4. Only the approved, edited copy is dispatched. An audit trail logs the reviewer's ID.

---

## Demo 4: Durable Waiting & SLA Follow-Up

### Scenario
A prospect stops responding. After 48 hours of inactivity, the SLA background process identifies the stale thread and flags the lead for re-engagement.

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 4"
```

### What to Observe
1. Conversation SLA scanner queries threads where `last_message_at < 48 hours ago`.
2. Thread status transitions from `active` to `stale`.
3. Associated Lead record stage updates to `nurture` with next action scheduled.

---

## Demo 5: Failure Recovery & Error Bounding

### Scenario
An external CRM endpoint experiences a temporary rate limit (503 Service Unavailable).

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 5"
```

### What to Observe
1. Tool registry catches the network failure without crashing the agent runtime.
2. Exponential backoff retry logic retries the operation.
3. Second attempt succeeds. The recovery event is logged in the audit trail.

---

## Demo 6: Explainable Lead Scoring

### Scenario
A prospect is evaluated against the tenant's ICP configuration.

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 6"
```

### What to Observe
1. ICP fit score (100%) and intent score (100%) are calculated.
2. Transparent factor breakdown (`reasons`) details exactly why the score was assigned:
   - "Executive decision maker title verified"
   - "Company size fits target criteria"
3. Recommended next action specifies `schedule_meeting`.

---

## Demo 7: Prompt Version Evaluation (v1.0 vs v2.1)

### Scenario
Compare agent responses between baseline prompt v1.0 and policy-hardened prompt v2.1.

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 7"
```

### What to Observe
1. Prompt v1.0 attempts to confirm payment without Stripe webhook: Evaluation engine scores it 69.5 and outputs `BLOCK`.
2. Prompt v2.1 uses verified knowledge and grounded pricing: Evaluation engine scores it 96.8 and outputs `PASS`.

---

## Demo 8: Tenant Isolation Verification

### Scenario
Demonstrate that Mumbai Growth Studio and Northstar Fitness have strict, zero-leakage data isolation.

### Execution
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 8"
```
Or query contacts with Tenant A context:
```http
GET /contacts
Authorization: Bearer <mumbai_studio_jwt>
```

### What to Observe
1. Only contacts and companies belonging to Mumbai Growth Studio are returned.
2. Direct object references to Northstar Fitness UUIDs return `404 Not Found`.
3. Vector similarity search in pgvector never retrieves embeddings from the other tenant.
