# Revora — API Reference

This reference details the core RESTful endpoints provided by Revora (`apps/api`). All protected endpoints require a valid Clerk Bearer JWT in the `Authorization` header.

---

## 1. Authentication & Context Headers

```http
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
```

The server automatically extracts the tenant ID and user role from the validated JWT claims. Any client attempt to pass custom `x-tenant-id` headers to override context is safely rejected.

---

## 2. Inbound Webhooks

### 2.1 Meta Inbound Webhook (Instagram & WhatsApp)
```http
POST /webhooks/:provider
```
- **Params**: `provider` (`instagram` | `whatsapp`)
- **Headers**: `X-Hub-Signature-256: sha256=<hmac_hash>`
- **Payload**:
```json
{
  "providerEventId": "evt_meta_9812401",
  "sender": {
    "name": "Elena Rostova",
    "email": "elena@vanguard.io",
    "socialId": "elena_vanguard"
  },
  "message": "Hi Revora, we want to book a demo for 15 sales engineers.",
  "tenantId": "c9284bd0-8e11-4a4b-91d1-678401311099"
}
```
- **Responses**:
  - `200 OK`: `{"status": "success", "workflowRunId": "...", "contactId": "..."}`
  - `401 Unauthorized`: Invalid HMAC signature
  - `200 OK (duplicate)`: `{"status": "ignored", "reason": "duplicate_event"}`

### 2.2 Stripe Authoritative Payment Webhook
```http
POST /webhooks/stripe
```
- **Headers**: `Stripe-Signature: t=16140...,v1=...`
- **Events Handled**: `checkout.session.completed`, `payment_intent.succeeded`
- **Response**: `200 OK {"received": true}`

---

## 3. Human-in-the-Loop Approvals

### 3.1 List Pending Approval Requests
```http
GET /approvals?status=pending
```
- **Response**:
```json
[
  {
    "id": "85b6df99-97ce-4f61-b9dd-4f4dc8cd5439",
    "tenantId": "c9284bd0-8e11-4a4b-91d1-678401311099",
    "actionType": "send_outbound_message",
    "actionSummary": "Send enterprise proposal to Elena Rostova",
    "proposedAction": {
      "recipientEmail": "elena@vanguard.io",
      "quoteValue": 15000,
      "discountPercent": 20,
      "text": "Enterprise plan at 20% discount"
    },
    "riskLevel": "high",
    "status": "pending",
    "expiresAt": "2026-10-01T12:00:00.000Z"
  }
]
```

### 3.2 Approve / Reject / Edit Action
```http
POST /approvals/:id/decide
```
- **Payload**:
```json
{
  "decision": "approved", // "approved" | "rejected" | "edited"
  "rejectionReason": "Discount exceeded allowable threshold",
  "editedAction": {
    "discountPercent": 10,
    "quoteValue": 18000,
    "text": "Approved proposal with 10% volume discount"
  }
}
```
- **Response**: `200 OK {"status": "edited", "executedAction": {...}}`

---

## 4. Leads & CRM Contacts

### 4.1 Search Contacts
```http
GET /contacts?query=elena
```
- **Response**: Returns tenant-isolated contacts matching search criteria.

### 4.2 Lead Qualification Details & Explainability
```http
GET /leads/:id/qualification
```
- **Response**:
```json
{
  "leadId": "2b91feac-0b4e-476f-800f-f6a432e20d04",
  "qualificationStatus": "qualified",
  "icpFitScore": 95,
  "intentScore": 88,
  "scoreReasons": [
    "VP title matches executive decision maker criteria",
    "Direct inbound inquiry asking for enterprise pricing",
    "Company headcount (200-500) within sweet-spot target"
  ],
  "recommendedNextAction": "schedule_meeting"
}
```

---

## 5. Analytics & Audit Trails

### 5.1 Query Audit Trail
```http
GET /audit?limit=50
```
- **Response**: Returns immutable log entries showing agent tool invocations, policy decisions, and sanitized parameter summaries.
