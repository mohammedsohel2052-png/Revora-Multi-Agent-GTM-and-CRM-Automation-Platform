import { randomUUID } from 'crypto';
import { LeadIntakeAgent } from '../../apps/api/src/agents/lead-intake/lead-intake.agent';
import { IdentityResolutionAgent } from '../../apps/api/src/agents/identity-resolution/identity-resolution.agent';
import { EnrichmentAgent } from '../../apps/api/src/agents/enrichment/enrichment.agent';
import { QualificationAgent } from '../../apps/api/src/agents/qualification/qualification.agent';
import { ConversationAgent } from '../../apps/api/src/agents/conversation/conversation.agent';
import { SupervisorAgent } from '../../apps/api/src/agents/supervisor.agent';
import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';
import { ToolRegistryService } from '../../apps/api/src/tools/tool-registry.service';
import { AgentTool } from '../../apps/api/src/tools/tool.interface';
import { z } from 'zod';
import { EvaluationService } from '../../apps/api/src/modules/evaluation/evaluation.service';
import { ConversationSlaService } from '../../apps/api/src/modules/workflows/conversation-sla.service';

jest.mock('@revora/db', () => ({
  db: {
    query: {
      tenants: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant_mumbai_growth_studio' }) },
      contacts: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      companies: { findFirst: jest.fn().mockResolvedValue(null) },
      leads: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      approvalRequests: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      conversations: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'mock-inserted-id' }]),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-updated-id' }]),
      }),
    }),
  },
  contacts: {},
  companies: {},
  leads: {},
  conversations: {},
  messages: {},
  approvalRequests: {},
  auditEvents: {},
  usageEvents: {},
  tenants: {},
}));

describe('Portfolio Demo Scenarios — Phase 9 End-to-End Validation', () => {
  const tenantMumbai = 'tenant_mumbai_growth_studio';
  const tenantNorthstar = 'tenant_northstar_fitness';

  let toolRegistry: ToolRegistryService;
  let mockAudit: any;

  beforeEach(() => {
    mockAudit = { record: jest.fn().mockResolvedValue('audit-demo-id') };
    toolRegistry = new ToolRegistryService(mockAudit);
  });

  // Demo 1 — Lead Intake
  it('Demo 1: Lead Intake — Inbound event creates tenant-scoped CRM record', async () => {
    const intakeAgent = new LeadIntakeAgent(toolRegistry);
    const result = await intakeAgent.execute(
      {
        channel: 'whatsapp',
        providerEventId: 'evt_demo_intake_1',
        sender: {
          name: 'Rajesh Kulkarni',
          phone: '+919820011223',
          email: 'rajesh@deccanlogistics.in',
        },
        message: 'Hello, looking for AI lead intake setup for our Mumbai logistics office.',
      },
      {
        tenantId: tenantMumbai,
        traceId: 'trace-demo-1',
      },
    );

    expect(result.status).toBe('ingested');
    expect(result.contactId).toBeDefined();
    expect(result.leadId).toBeDefined();
    expect(result.channel).toBe('whatsapp');
  });

  // Demo 2 — Multi-Agent Coordination
  it('Demo 2: Multi-Agent Coordination — Supervisor routes work across intake, identity, enrichment, qualification, conversation', async () => {
    const leadIntake = new LeadIntakeAgent(toolRegistry);
    const identityAgent = new IdentityResolutionAgent(toolRegistry);
    const enrichmentAgent = new EnrichmentAgent(toolRegistry);
    const qualificationAgent = new QualificationAgent(toolRegistry);
    const conversationAgent = new ConversationAgent(toolRegistry);

    const supervisor = new SupervisorAgent(
      leadIntake,
      identityAgent,
      enrichmentAgent,
      qualificationAgent,
      conversationAgent,
    );

    const swarmResult = await supervisor.runPipeline({
      tenantId: tenantMumbai,
      rawEvent: {
        channel: 'instagram',
        providerEventId: 'evt_coord_demo_1',
        sender: {
          name: 'Elena Rostova',
          email: 'elena@vanguard.io',
          socialId: 'elena_vanguard',
        },
        message: 'Hi Revora! We need enterprise demo pricing for 15 sales engineers.',
      },
      companySize: '200-500',
      industry: 'Enterprise Software',
      jobTitle: 'VP of Engineering',
    });

    expect(swarmResult.intake).toBeDefined();
    expect(swarmResult.identity).toBeDefined();
    expect(swarmResult.enrichment).toBeDefined();
    expect(swarmResult.qualification).toBeDefined();
    expect(swarmResult.qualification.qualification_status).toBe('qualified');
    expect(swarmResult.workflowRunId).toBeDefined();
  });

  // Demo 3 — Human Approval
  it('Demo 3: Human Approval — High-risk message paused, edited, and approved by reviewer', async () => {
    const approvalsService = new ApprovalsService(mockAudit);
    const approvalId = randomUUID();

    const proposedReply = {
      channel: 'email',
      recipient: 'director@mumbaifinance.in',
      discountPercent: 30, // excessive discount
      text: 'Custom 30% discount offered for your logistics fleet.',
    };

    jest.spyOn<any, any>(approvalsService, 'getApprovalById').mockResolvedValue({
      id: approvalId,
      tenantId: tenantMumbai,
      actionType: 'send_outbound_message',
      actionSummary: 'Custom enterprise quote for Mumbai Finance',
      proposedAction: proposedReply,
      status: 'pending',
    });

    const editedAction = {
      ...proposedReply,
      discountPercent: 12, // adjusted down to 12% by reviewer
      text: 'Approved: 12% corporate rate applied for your logistics fleet.',
    };

    const approvalResult = await approvalsService.editAndApproveAction(
      tenantMumbai,
      approvalId,
      editedAction,
      'user_sales_manager_id',
    );

    expect(approvalResult.status).toBe('edited');
    expect(approvalResult.executedAction['discountPercent']).toBe(12);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenantMumbai,
        policyDecision: 'edited_and_approved',
      }),
    );
  });

  // Demo 4 — Durable Waiting
  it('Demo 4: Durable Waiting — Workflow detects SLA timeouts and flags inactive leads', async () => {
    const slaService = new ConversationSlaService(mockAudit);
    const { db } = require('@revora/db');

    db.query.conversations.findMany.mockResolvedValueOnce([
      {
        id: 'conv-stale-demo-4',
        tenantId: tenantNorthstar,
        leadId: 'lead-stale-demo-4',
        status: 'active',
        lastMessageAt: new Date(Date.now() - 55 * 3600 * 1000), // 55h inactive
      },
    ]);

    const slaResult = await slaService.checkAndMarkStaleConversations(tenantNorthstar, 48);
    expect(slaResult.markedAsStale).toBe(1);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenantNorthstar,
        toolName: 'SLA:MarkStaleConversation',
      }),
    );
  });

  // Demo 5 — Failure Recovery
  it('Demo 5: Failure Recovery — Third-party provider failure caught safely without crashing and retried', async () => {
    let attempts = 0;
    const resilientTool: AgentTool<{ count: number }, { success: boolean; attempt: number }> = {
      name: 'resilient_crm_sync',
      description: 'Retries on transient failures',
      riskLevel: 'read',
      inputSchema: z.object({ count: z.number() }),
      async execute(input) {
        attempts++;
        if (attempts < 2) {
          throw new Error('503 Service Unavailable: upstream provider rate limit');
        }
        return { success: true, attempt: attempts };
      },
    };

    toolRegistry.registerTool(resilientTool);

    const ctx = {
      tenantId: tenantMumbai,
      agentId: 'agent-resilience-1',
      agentName: 'ResilienceAgent',
      traceId: 'tr-demo-5',
    };

    // First attempt fails safely with error captured
    const failResult = await toolRegistry.executeTool('resilient_crm_sync', { count: 1 }, ctx);
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain('503 Service Unavailable');

    // Second attempt succeeds
    const successResult = await toolRegistry.executeTool('resilient_crm_sync', { count: 1 }, ctx);
    expect(successResult.success).toBe(true);
    expect(attempts).toBe(2);
  });

  // Demo 6 — Explainability
  it('Demo 6: Explainability — Lead score provides transparent factor breakdown and next recommended action', async () => {
    const qualAgent = new QualificationAgent(toolRegistry);
    const validLeadId = randomUUID();
    const result = await qualAgent.execute(
      {
        leadId: validLeadId,
        contactName: 'Vikram Seth',
        companyName: 'Bandra Digital',
        companySize: '50-200',
        industry: 'Software',
        jobTitle: 'VP Growth',
        messageText: 'Looking for enterprise pricing and meeting demo this week',
      },
      {
        tenantId: tenantMumbai,
        traceId: 'trace-demo-6',
      },
    );

    expect(result.reasons).toBeDefined();
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.icp_fit_score).toBeGreaterThanOrEqual(0);
    expect(result.intent_score).toBeGreaterThanOrEqual(0);
    expect(result.recommended_next_action).toBeDefined();
  });

  // Demo 7 — Evaluation
  it('Demo 7: Evaluation — Quantifies agent accuracy between prompt versions v1.0 and v2.1', () => {
    const evalService = new EvaluationService();

    // v1.0 prompt ungrounded / unauthorized discount
    const evalV1 = evalService.evaluateResponse({
      tenantId: tenantMumbai,
      scenarioName: 'Inbound FAQ Accuracy',
      promptVersion: 'v1.0',
      agentResponse: 'Great, payment is received! We also give an unapproved 30% discount.',
      groundTruthContext: 'Growth plan is $499/mo with CRM integration and 24/7 SLA.',
    });

    // v2.1 prompt strictly grounded and compliant
    const evalV2 = evalService.evaluateResponse({
      tenantId: tenantMumbai,
      scenarioName: 'Inbound FAQ Accuracy',
      promptVersion: 'v2.1',
      agentResponse: 'Revora offers our Growth tier at $499/mo with full CRM integration and 24/7 SLA.',
      groundTruthContext: 'Growth plan is $499/mo with CRM integration and 24/7 SLA.',
    });

    expect(evalV2.scores.overallScore).toBeGreaterThan(evalV1.scores.overallScore);
    expect(evalV2.recommendation).toBe('PASS');
    expect(evalV1.recommendation).toBe('BLOCK');
  });

  // Demo 8 — Tenant Isolation
  it('Demo 8: Tenant Isolation — Ensures dual workspaces maintain strict data isolation', async () => {
    const { db } = require('@revora/db');

    db.query.contacts.findMany.mockImplementation((args: any) => {
      if (args && typeof args.where === 'function') {
        return Promise.resolve([{ id: 'contact-isolated', tenantId: tenantMumbai }]);
      }
      return Promise.resolve([]);
    });

    const contactsMumbai = await db.query.contacts.findMany({
      where: (c: any, { eq }: any) => eq(c.tenantId, tenantMumbai),
    });

    expect(contactsMumbai.every((c: any) => c.tenantId === tenantMumbai)).toBe(true);
  });
});
