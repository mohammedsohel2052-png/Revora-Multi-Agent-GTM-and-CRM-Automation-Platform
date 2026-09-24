import { ToolRegistryService } from '../../apps/api/src/tools/tool-registry.service';
import { AuditService } from '../../apps/api/src/modules/audit/audit.service';
import { SupervisorAgent } from '../../apps/api/src/agents/supervisor.agent';
import { LeadIntakeAgent } from '../../apps/api/src/agents/lead-intake/lead-intake.agent';
import { IdentityResolutionAgent } from '../../apps/api/src/agents/identity-resolution/identity-resolution.agent';
import { EnrichmentAgent } from '../../apps/api/src/agents/enrichment/enrichment.agent';
import { QualificationAgent } from '../../apps/api/src/agents/qualification/qualification.agent';
import { ConversationAgent } from '../../apps/api/src/agents/conversation/conversation.agent';
import { WebhooksService } from '../../apps/api/src/modules/webhooks/webhooks.service';
import { PolicyEngineService } from '../../apps/api/src/modules/policy/policy-engine.service';
import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';
import { createHmac, randomUUID } from 'crypto';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      contacts: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      companies: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      tenants: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-golden-path', slug: 'mumbai-growth' }),
      },
      webhookEvents: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      approvalRequests: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      leads: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      conversations: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'mock-insert-id' }]),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-update-id' }]),
      }),
    }),
  },
  contacts: {},
  companies: {},
  leads: {},
  conversations: {},
  messages: {},
  approvalRequests: {},
  webhookEvents: {},
  usageEvents: {},
  auditEvents: {},
  tenants: {},
}));

describe('Golden-Path End-to-End Workflow Verification', () => {
  let auditService: jest.Mocked<AuditService>;
  let toolRegistry: ToolRegistryService;
  let supervisorAgent: SupervisorAgent;
  let webhooksService: WebhooksService;
  let policyEngine: PolicyEngineService;
  let approvalsService: ApprovalsService;

  beforeEach(() => {
    auditService = {
      record: jest.fn().mockResolvedValue('audit-id-golden'),
      listRecent: jest.fn().mockResolvedValue([]),
    } as any;

    toolRegistry = new ToolRegistryService(auditService);
    const leadIntakeAgent = new LeadIntakeAgent(toolRegistry);
    const identityAgent = new IdentityResolutionAgent(toolRegistry);
    const enrichmentAgent = new EnrichmentAgent(toolRegistry);
    const qualificationAgent = new QualificationAgent(toolRegistry);
    const conversationAgent = new ConversationAgent(toolRegistry);

    supervisorAgent = new SupervisorAgent(
      leadIntakeAgent,
      identityAgent,
      enrichmentAgent,
      qualificationAgent,
      conversationAgent,
    );

    webhooksService = new WebhooksService(supervisorAgent, auditService);
    policyEngine = new PolicyEngineService();
    approvalsService = new ApprovalsService(auditService);
  });

  it('executes full 27-step lifecycle: Inbound Lead -> HMAC -> Idempotency -> Identity -> ICP -> Policy Gate -> HITL Approval -> CRM Update', async () => {
    const tenantId = 'tenant-golden-path';
    const providerEventId = `evt_gold_${randomUUID().slice(0, 8)}`;
    const secret = 'dev_webhook_secret';
    process.env['INSTAGRAM_WEBHOOK_SECRET'] = secret;

    const rawPayload = {
      providerEventId,
      sender: {
        name: 'Elena Rostova',
        email: 'elena@vanguard.io',
        socialId: 'elena_vanguard',
      },
      message: 'Hi Revora! I am VP of Engineering at Vanguard AI (350 staff). We need demo pricing for our 15 sales engineers.',
      formData: {
        email: 'elena@vanguard.io',
        name: 'Elena Rostova',
      },
    };

    const rawBody = JSON.stringify(rawPayload);
    const hmac = createHmac('sha256', secret);
    const signature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    // 1-4. Signature Verification & Idempotency
    const isValidSignature = webhooksService.verifySignature('instagram', rawBody, signature);
    expect(isValidSignature).toBe(true);

    // 5-14. Process Inbound Webhook through Multi-Agent Swarm Pipeline
    const webhookResult = await webhooksService.processInboundWebhook(
      'instagram',
      {
        providerEventId,
        sender: rawPayload.sender,
        message: rawPayload.message,
        formData: rawPayload.formData,
        tenantId,
      },
      rawPayload,
      signature,
    );

    expect(webhookResult.status).toBe('success');
    expect(webhookResult.swarmResult).toBeDefined();

    const swarm = webhookResult.swarmResult!;

    // 6-7. Contact Normalization
    expect(swarm.intake.contactId).toBeDefined();
    expect(swarm.intake.status).toBe('ingested');

    // 8-9. Identity Resolution
    expect(swarm.identity.confidence).toBeDefined();
    expect(swarm.identity.action).toBeDefined();

    // 12. Enrichment Waterfall
    expect(swarm.enrichment.domain).toBe('vanguard.io');
    expect(swarm.enrichment.companyName).toBe('Vanguard');
    expect(swarm.enrichment.industry).toMatch(/Enterprise Software|B2B/);

    // 13-14. Qualification & Explainable Score
    expect(swarm.qualification.qualification_status).toBe('qualified');
    expect(swarm.qualification.icp_fit_score).toBeGreaterThanOrEqual(80);
    expect(swarm.qualification.intent_score).toBeGreaterThanOrEqual(70);
    expect(swarm.qualification.reasons.length).toBeGreaterThan(0);
    expect(swarm.qualification.reasons.some((r) => r.includes('demo') || r.includes('pricing'))).toBe(true);

    // 15-18. Conversation Draft, Bounded Autonomy & Policy Evaluation
    const proposedReply = {
      leadId: swarm.intake.leadId,
      recipientEmail: 'elena@vanguard.io',
      quoteValue: 15000, // exceeds $10,000 threshold
      discountPercent: 20, // exceeds 15% threshold
      text: 'Here is our custom enterprise package at $15,000/yr with 20% volume discount.',
    };

    const policyDecision = await policyEngine.evaluateAction({
      tenantId,
      actionType: 'send_outbound_message',
      leadId: swarm.intake.leadId,
      proposedPayload: proposedReply,
      agentId: 'conversation_agent',
      workflowRunId: swarm.workflowRunId,
    });

    // 17-18. Bounded autonomy gates the risky price and creates approval request
    expect(policyDecision.decision).toBe('REQUIRE_APPROVAL');
    expect(policyDecision.riskLevel).toBe('high');
    expect(policyDecision.approvalRequestId).toBeDefined();

    const approvalId = policyDecision.approvalRequestId!;

    // 19. Reviewer reviews and performs Edit-and-Approve
    jest.spyOn<any, any>(approvalsService, 'getApprovalById').mockResolvedValue({
      id: approvalId,
      tenantId,
      actionType: 'send_outbound_message',
      actionSummary: 'Custom enterprise quote for Elena Rostova',
      proposedAction: proposedReply,
      status: 'pending',
    });

    const editedAction = {
      ...proposedReply,
      discountPercent: 10, // adjusted down to 10% by sales manager
      quoteValue: 18000,
      text: 'Hi Elena, We would love to walk you through Revora. Attached is our Enterprise tier with 10% volume discount.',
    };

    const approvalResult = await approvalsService.editAndApproveAction(
      tenantId,
      approvalId,
      editedAction,
      'user_sales_manager_id',
    );

    // 20-21. State transition & Execution
    expect(approvalResult.status).toBe('edited');
    expect(approvalResult.executedAction['discountPercent']).toBe(10);

    // 22-26. Audit Trail & Tracing Verification
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        policyDecision: 'edited_and_approved',
        approvalStatus: 'edited',
        result: 'success',
      }),
    );
  });

  it('rejects duplicate webhook gracefully with idempotency check', async () => {
    const tenantId = 'tenant-golden-path';
    const providerEventId = 'evt_duplicate_test';
    const rawPayload = { providerEventId, message: 'Repeat message' };

    // Mock that the idempotency key already exists in the database
    const { db } = require('@revora/db');
    db.query.webhookEvents.findFirst.mockResolvedValueOnce({
      id: 'existing-event-id',
      idempotencyKey: 'instagram:evt_duplicate_test',
      processed: true,
    });

    const rawBody = JSON.stringify(rawPayload);
    const hmac = createHmac('sha256', process.env['INSTAGRAM_WEBHOOK_SECRET'] || 'dev_webhook_secret');
    const signature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    const result = await webhooksService.processInboundWebhook(
      'instagram',
      {
        providerEventId,
        sender: { name: 'Repeat User', email: 'repeat@test.com' },
        message: 'Repeat',
        tenantId,
      },
      rawPayload,
      signature,
    );

    expect(result.idempotent).toBe(true);
    expect(result.status).toBe('already_processed');
  });

  it('rejects tampered or invalid HMAC signature', async () => {
    const rawPayload = { providerEventId: 'evt_fake', message: 'Tampered' };

    await expect(
      webhooksService.processInboundWebhook(
        'instagram',
        {
          providerEventId: 'evt_fake',
          sender: { name: 'Bad Actor', email: 'bad@actor.com' },
          message: 'Fake',
          tenantId: 'tenant-golden-path',
        },
        rawPayload,
        'sha256=invalid_tampered_hash_1234567890abcdef',
      ),
    ).rejects.toThrow();
  });
});
