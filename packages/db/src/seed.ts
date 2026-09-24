import { db, tenants, users, memberships, companies, contacts, leads, opportunities, approvalRequests, payments, auditEvents } from './index';
import { randomUUID } from 'crypto';

export async function seedDemoData() {
  console.log('🌱 Starting Revora multi-tenant demo data seeding...');

  // 1. Create 2 Distinct Workspace Tenants
  const tenant1Id = randomUUID();
  const tenant2Id = randomUUID();

  await db.insert(tenants).values({
    id: tenant1Id,
    name: 'Acme Cloud Solutions',
    slug: 'acme-cloud',
    plan: 'enterprise',
    settings: {
      autonomous_sending: false,
      max_discount_percent: 15,
      allowed_channels: ['email', 'whatsapp', 'instagram'],
    },
  });

  await db.insert(tenants).values({
    id: tenant2Id,
    name: 'Pulse Metrics AI',
    slug: 'pulse-metrics',
    plan: 'starter',
    settings: {
      autonomous_sending: false,
      max_discount_percent: 20,
      allowed_channels: ['email', 'instagram'],
    },
  });

  // 2. Create Users
  const user1Id = randomUUID();
  const user2Id = randomUUID();

  await db.insert(users).values({
    id: user1Id,
    email: 'alex@acmecloud.io',
    name: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
  });

  await db.insert(users).values({
    id: user2Id,
    email: 'sara@pulsemetrics.ai',
    name: 'Sara Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
  });

  // 3. Memberships
  await db.insert(memberships).values({
    id: randomUUID(),
    tenantId: tenant1Id,
    userId: user1Id,
    role: 'workspace_owner',
  });

  await db.insert(memberships).values({
    id: randomUUID(),
    tenantId: tenant2Id,
    userId: user2Id,
    role: 'workspace_owner',
  });

  // 4. Companies for Tenant 1
  const company1Id = randomUUID();
  const company2Id = randomUUID();

  await db.insert(companies).values({
    id: company1Id,
    tenantId: tenant1Id,
    name: 'Vanguard AI Systems',
    domain: 'vanguard.io',
    industry: 'Enterprise SaaS',
    sizeEstimate: '200-500',
    location: 'San Francisco, CA',
    enrichmentSource: 'waterfall:clearbit+pdl',
  });

  await db.insert(companies).values({
    id: company2Id,
    tenantId: tenant1Id,
    name: 'FinFlow Technologies',
    domain: 'finflow.tech',
    industry: 'FinTech',
    sizeEstimate: '50-200',
    location: 'New York, NY',
    enrichmentSource: 'waterfall:clearbit',
  });

  // 5. Contacts for Tenant 1
  const contact1Id = randomUUID();
  const contact2Id = randomUUID();

  await db.insert(contacts).values({
    id: contact1Id,
    tenantId: tenant1Id,
    companyId: company1Id,
    name: 'Elena Rostova',
    email: 'elena@vanguard.io',
    phone: '+1 415 889 0123',
    jobTitle: 'VP of Engineering',
    leadSource: 'instagram_inbound',
    consentStatus: 'granted',
    tags: ['high-intent', 'enterprise', 'demo-requested'],
  });

  await db.insert(contacts).values({
    id: contact2Id,
    tenantId: tenant1Id,
    companyId: company2Id,
    name: 'Marcus Vance',
    email: 'marcus@finflow.tech',
    phone: '+1 212 555 0199',
    jobTitle: 'Director of Growth',
    leadSource: 'website_contact_form',
    consentStatus: 'granted',
    tags: ['growth-tier', 'evaluation'],
  });

  // 6. Leads with ICP Fit Scores
  const lead1Id = randomUUID();
  const lead2Id = randomUUID();

  await db.insert(leads).values({
    id: lead1Id,
    tenantId: tenant1Id,
    contactId: contact1Id,
    status: 'qualified',
    qualificationStatus: 'qualified',
    icpFitScore: 94,
    intentScore: 88,
    scoreReasons: [
      'VP title matches executive decision maker criteria',
      'Company size 200-500 employees fits Enterprise tier sweet-spot',
      'Direct inquiry requesting pricing and product architecture walkthrough',
    ],
    sourceChannel: 'instagram',
    assignedOwnerId: user1Id,
  });

  await db.insert(leads).values({
    id: lead2Id,
    tenantId: tenant1Id,
    contactId: contact2Id,
    status: 'contacted',
    qualificationStatus: 'pending',
    icpFitScore: 82,
    intentScore: 75,
    scoreReasons: [
      'Director title has purchasing authority for Growth tier',
      'Verified corporate email domain finflow.tech',
    ],
    sourceChannel: 'form',
    assignedOwnerId: user1Id,
  });

  // 7. Opportunities
  const opp1Id = randomUUID();
  await db.insert(opportunities).values({
    id: opp1Id,
    tenantId: tenant1Id,
    leadId: lead1Id,
    contactId: contact1Id,
    companyId: company1Id,
    stage: 'proposal',
    value: '24000.00',
    currency: 'USD',
    probability: 75,
  });

  // 8. Pending Approval Requests for HITL Queue Demo
  await db.insert(approvalRequests).values({
    id: randomUUID(),
    tenantId: tenant1Id,
    leadId: lead1Id,
    actionType: 'send_outbound_message',
    actionSummary: 'Send tailored enterprise architecture deck & pricing quote to Elena Rostova (VP of Eng)',
    proposedAction: {
      recipientEmail: 'elena@vanguard.io',
      channel: 'email',
      quoteValue: 24000,
      discountPercent: 12,
      draftCopy: 'Hi Elena, Attached is our Enterprise Security & Architecture overview covering multi-tenant pgvector RAG and bounded autonomy policies. Let us know if 2pm EST works for the technical walkthrough.',
    },
    riskLevel: 'high',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // 9. Verified Payment via Stripe Webhook
  await db.insert(payments).values({
    id: randomUUID(),
    tenantId: tenant1Id,
    opportunityId: opp1Id,
    contactId: contact1Id,
    stripeSessionId: 'cs_test_live_demo_123',
    amount: '499.00',
    currency: 'USD',
    status: 'completed',
    verifiedViaWebhook: true,
    webhookEventId: 'evt_stripe_demo_seed',
    completedAt: new Date(),
  });

  // 10. Audit Event Log
  await db.insert(auditEvents).values({
    id: randomUUID(),
    tenantId: tenant1Id,
    toolName: 'supervisor:inbound_swarm_pipeline',
    inputParams: { sender: '@elena_tech', channel: 'instagram' },
    outputSummary: 'Swarm executed: Lead qualified (Score 94), firmographics enriched via Vanguard AI, routed to meeting booking.',
    policyDecision: 'ALLOWED',
    result: 'success',
    timestamp: new Date(),
  });

  console.log('✅ Revora multi-tenant demo seed data created successfully!');
  console.log(`Tenant 1 (Acme Cloud): ${tenant1Id}`);
  console.log(`Tenant 2 (Pulse Metrics): ${tenant2Id}`);
}
