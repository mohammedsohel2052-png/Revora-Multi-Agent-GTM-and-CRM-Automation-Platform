import { ToolRegistryService } from '../src/tools/tool-registry.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { QualificationAgent } from '../src/agents/qualification/qualification.agent';
import { ConversationAgent } from '../src/agents/conversation/conversation.agent';
import { EnrichmentAgent } from '../src/agents/enrichment/enrichment.agent';
import { BookingAgent } from '../src/agents/booking/booking.agent';
import { HumanHandoffAgent } from '../src/agents/human-handoff/human-handoff.agent';
import { PaymentAgent } from '../src/agents/payment/payment.agent';
import { WebhooksService } from '../src/modules/webhooks/webhooks.service';
import { StripeWebhookService } from '../src/modules/webhooks/stripe-webhook.service';
import { PolicyEngineService } from '../src/modules/policy/policy-engine.service';
import { ApprovalsService } from '../src/modules/approvals/approvals.service';
import { KnowledgeService } from '../src/modules/knowledge/knowledge.service';
import { EvaluationService } from '../src/modules/evaluation/evaluation.service';
import { randomUUID } from 'crypto';

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
        findFirst: jest.fn().mockResolvedValue({ id: 'mock-tenant-id' }),
      },
      webhookEvents: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      payments: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      opportunities: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      knowledgeDocuments: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgeChunks: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      approvalRequests: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
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
  payments: {},
  opportunities: {},
  knowledgeDocuments: {},
  knowledgeChunks: {},
}));

describe('Revora Agent Runtime & Safety Engine', () => {
  let auditService: jest.Mocked<AuditService>;
  let toolRegistry: ToolRegistryService;
  let qualificationAgent: QualificationAgent;
  let conversationAgent: ConversationAgent;

  beforeEach(() => {
    auditService = {
      record: jest.fn().mockResolvedValue('audit-id-123'),
      listRecent: jest.fn().mockResolvedValue([]),
    } as any;

    toolRegistry = new ToolRegistryService(auditService);
    qualificationAgent = new QualificationAgent(toolRegistry);
    conversationAgent = new ConversationAgent(toolRegistry);
  });

  describe('ToolRegistryService', () => {
    it('should register built-in tools with risk levels', () => {
      const tools = toolRegistry.listTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('search_crm_contacts');
      expect(toolNames).toContain('update_lead_qualification');
      expect(toolNames).toContain('request_human_approval');
      expect(toolNames).toContain('draft_outbound_message');
      expect(toolNames).toContain('check_calendar_availability');
    });

    it('should reject invalid input schemas and record audit failure', async () => {
      const ctx = {
        tenantId: randomUUID(),
        agentId: 'test-agent',
        agentName: 'Test Agent',
        traceId: 'tr_test_1',
      };

      // search_crm_contacts requires query: string
      const result = await toolRegistry.executeTool('search_crm_contacts', {}, ctx);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input validation failed');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'search_crm_contacts',
          result: 'error',
        }),
      );
    });
  });

  describe('QualificationAgent (Deterministic Explainable ICP Scoring)', () => {
    it('should compute high score and reasons for executive B2B ICP match', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_qual_1',
        leadId: randomUUID(),
      };

      // Mock tool call since we're unit testing agent logic without live DB
      jest.spyOn<any, any>(qualificationAgent, 'callTool').mockResolvedValue({ success: true });

      const output = await qualificationAgent.execute(
        {
          leadId: ctx.leadId,
          contactName: 'Sarah Jenkins',
          email: 'sarah@hypercloud.io',
          jobTitle: 'VP of Engineering',
          companySize: '200-500',
          industry: 'SaaS / Cloud',
          messageText: 'We need to book a demo this week to evaluate Revora pricing tiers.',
          buyingSignals: ['Hiring 10 SDRs'],
        },
        ctx,
      );

      expect(output.icp_fit_score).toBeGreaterThanOrEqual(75);
      expect(output.intent_score).toBeGreaterThanOrEqual(60);
      expect(output.qualification_status).toBe('qualified');
      expect(output.recommended_next_action).toBe('book_meeting');

      // Crucial PRD requirement: MUST have explainable reasons
      expect(output.reasons.length).toBeGreaterThan(0);
      expect(output.reasons.some((r) => r.includes('VP of Engineering') || r.includes('seniority'))).toBe(true);
      expect(output.reasons.some((r) => r.includes('demo') || r.includes('pricing'))).toBe(true);
    });

    it('should disqualify or nurture low fit leads transparently', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_qual_2',
        leadId: randomUUID(),
      };

      jest.spyOn<any, any>(qualificationAgent, 'callTool').mockResolvedValue({ success: true });

      const output = await qualificationAgent.execute(
        {
          leadId: ctx.leadId,
          contactName: 'Student User',
          jobTitle: 'Intern',
          companySize: '1',
          industry: 'Other',
          messageText: 'Just looking around',
        },
        ctx,
      );

      expect(output.icp_fit_score).toBeLessThan(60);
      expect(output.qualification_status).toMatch(/unqualified|nurture/);
    });
  });

  describe('ConversationAgent & Safety Policy', () => {
    it('should offer calendar times when prospect asks for demo', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_conv_1',
        conversationId: randomUUID(),
      };

      jest.spyOn<any, any>(conversationAgent, 'callTool').mockImplementation(async (toolName: any) => {
        if (toolName === 'check_calendar_availability') {
          return { slots: [{ startTime: '2026-09-25T14:00:00Z' }] };
        }
        if (toolName === 'draft_outbound_message') {
          return { messageId: 'msg-1', status: 'draft' };
        }
        return {};
      });

      const output = await conversationAgent.execute(
        {
          conversationId: ctx.conversationId,
          channel: 'instagram',
          inboundMessage: 'Can we book a quick walkthrough call?',
          contactName: 'Alex',
        },
        ctx,
      );

      expect(output.intent).toBe('schedule_meeting');
      expect(output.content).toContain('demonstrate');
      expect(output.content).toContain('EST');
    });

    it('should require approval when price quote is drafted', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_conv_2',
        conversationId: randomUUID(),
      };

      jest.spyOn<any, any>(conversationAgent, 'callTool').mockImplementation(async (toolName: any, input: any) => {
        if (toolName === 'draft_outbound_message') {
          // If price quoted > 0, requires approval
          const approvalRequired = !!input.priceQuoted;
          return {
            messageId: 'msg-2',
            status: approvalRequired ? 'pending_approval' : 'draft',
            approvalId: approvalRequired ? 'app-999' : undefined,
          };
        }
        return {};
      });

      const output = await conversationAgent.execute(
        {
          conversationId: ctx.conversationId,
          channel: 'email',
          inboundMessage: 'What is your monthly cost and pricing tiers?',
          contactName: 'Devon',
        },
        ctx,
      );

      expect(output.intent).toBe('send_proposal');
      expect(output.approvalRequired).toBe(true);
      expect(output.approvalId).toBe('app-999');
      expect(output.status).toBe('pending_approval');
    });
  });

  describe('EnrichmentAgent (Domain Extraction & Firmographic Waterfall)', () => {
    let enrichmentAgent: EnrichmentAgent;

    beforeEach(() => {
      enrichmentAgent = new EnrichmentAgent(toolRegistry);
    });

    it('should ignore personal webmail domains like gmail.com', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_enrich_1',
      };

      const result = await enrichmentAgent.execute(
        {
          contactId: randomUUID(),
          email: 'user123@gmail.com',
        },
        ctx,
      );

      expect(result.isPersonalEmail).toBe(true);
      expect(result.domain).toBeUndefined();
    });

    it('should derive industry and company name from corporate domains', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_enrich_2',
      };

      // Mock database insert/update
      jest.spyOn<any, any>(enrichmentAgent, 'callTool').mockResolvedValue({ success: true });

      const result = await enrichmentAgent.execute(
        {
          contactId: randomUUID(),
          email: 'alex@cloudscale.ai',
        },
        ctx,
      );

      expect(result.domain).toBe('cloudscale.ai');
      expect(result.companyName).toBe('Cloudscale');
      expect(result.industry).toContain('Software');
      expect(result.isPersonalEmail).toBe(false);
    });
  });

  describe('WebhooksService (Signature Verification & Idempotency)', () => {
    let webhooksService: WebhooksService;
    let mockSupervisor: any;

    beforeEach(() => {
      mockSupervisor = {
        runPipeline: jest.fn().mockResolvedValue({
          workflowRunId: 'run-123',
          qualification: { qualification_status: 'qualified' },
        }),
      };
      webhooksService = new WebhooksService(mockSupervisor, auditService);
    });

    it('should verify valid HMAC SHA-256 signatures correctly', () => {
      process.env['INSTAGRAM_WEBHOOK_SECRET'] = 'secret_test_key';
      const body = JSON.stringify({ event: 'test' });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'secret_test_key').update(body).digest('hex');

      const isValid = webhooksService.verifySignature('instagram', body, `sha256=${signature}`);
      expect(isValid).toBe(true);

      const isInvalid = webhooksService.verifySignature('instagram', body, 'sha256=wrong_digest');
      expect(isInvalid).toBe(false);
    });
  });

  describe('BookingAgent (Calendar Coordination & Pre-Meeting Briefing)', () => {
    let bookingAgent: BookingAgent;

    beforeEach(() => {
      bookingAgent = new BookingAgent(toolRegistry);
    });

    it('should coordinate meeting slot and compile detailed sales briefing dossier', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_book_1',
        leadId: randomUUID(),
      };

      const result = await bookingAgent.execute(
        {
          leadId: ctx.leadId,
          contactName: 'Elena Rostova',
          contactEmail: 'elena@vanguard.io',
          companyName: 'Vanguard AI',
          industry: 'Enterprise Software',
          companySize: '500+',
          icpFitScore: 92,
          intentScore: 88,
          buyingSignals: ['Hiring 20 SDRs', 'Immediate Q4 budget'],
        },
        ctx,
      );

      expect(result.status).toBe('booked');
      expect(result.bookingId).toBeDefined();
      expect(result.meetingUrl).toContain('meet.google.com');
      expect(result.preMeetingBriefing.attendee).toBe('Elena Rostova');
      expect(result.preMeetingBriefing.fitAssessment).toContain('ICP Fit Score: 92/100');
      expect(result.preMeetingBriefing.recommendedTalkTrack.length).toBeGreaterThan(0);
    });
  });

  describe('HumanHandoffAgent (Frustration & Explicit Transfer Detection)', () => {
    let handoffAgent: HumanHandoffAgent;

    beforeEach(() => {
      handoffAgent = new HumanHandoffAgent(toolRegistry);
    });

    it('should trigger handoff when prospect explicitly asks for a human', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_handoff_1',
        conversationId: randomUUID(),
      };

      const result = await handoffAgent.execute(
        {
          conversationId: ctx.conversationId,
          contactName: 'Marcus',
          inboundMessage: 'Can you please transfer me to a real person or representative?',
        },
        ctx,
      );

      expect(result.shouldHandoff).toBe(true);
      expect(result.urgency).toBe('high');
      expect(result.reason).toContain('human representative');
      expect(result.suggestedOpeningReply).toContain('account team');
    });

    it('should trigger critical handoff when frustration is detected', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_handoff_2',
        conversationId: randomUUID(),
      };

      const result = await handoffAgent.execute(
        {
          conversationId: ctx.conversationId,
          contactName: 'Chloe',
          inboundMessage: 'This is completely terrible and a waste of time. I am annoyed.',
        },
        ctx,
      );

      expect(result.shouldHandoff).toBe(true);
      expect(result.urgency).toBe('critical');
      expect(result.suggestedOpeningReply).toContain('senior account lead');
    });

    it('should not trigger handoff for normal commercial inquiries', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_handoff_3',
        conversationId: randomUUID(),
      };

      const result = await handoffAgent.execute(
        {
          conversationId: ctx.conversationId,
          contactName: 'Siddharth',
          inboundMessage: 'What are the main architectural differences in your database setup?',
        },
        ctx,
      );

      expect(result.shouldHandoff).toBe(false);
    });
  });

  describe('PolicyEngineService (Safety Guardrails & Autonomy Limits)', () => {
    let policyEngine: PolicyEngineService;

    beforeEach(() => {
      policyEngine = new PolicyEngineService();
    });

    it('should block proposed actions containing sensitive credit card or secret keys', async () => {
      const result = await policyEngine.evaluateAction({
        tenantId: randomUUID(),
        actionType: 'send_outbound_message',
        proposedPayload: {
          recipientEmail: 'alex@enterprise.com',
          message: 'Your payment card is 4532 1122 3344 5566 and secret is sk_live_abcdef1234567890123456',
        },
      });

      expect(result.decision).toBe('BLOCK');
      expect(result.riskLevel).toBe('critical');
      expect(result.reason).toContain('confidential data');
    });

    it('should require human approval when discount exceeds 15% threshold', async () => {
      const result = await policyEngine.evaluateAction({
        tenantId: randomUUID(),
        actionType: 'apply_discount',
        proposedPayload: {
          leadId: randomUUID(),
          discountPercent: 25,
          quoteValue: 12000,
        },
      });

      expect(result.decision).toBe('REQUIRE_APPROVAL');
      expect(result.riskLevel).toBe('high');
      expect(result.approvalRequestId).toBeDefined();
    });

    it('should allow actions within safe bounds', async () => {
      const result = await policyEngine.evaluateAction({
        tenantId: randomUUID(),
        actionType: 'schedule_meeting',
        proposedPayload: {
          leadId: randomUUID(),
          meetingTime: '2026-09-25T14:00:00Z',
        },
      });

      expect(result.decision).toBe('ALLOW');
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('ApprovalsService (Human-in-the-Loop Workflow)', () => {
    let approvalsService: ApprovalsService;

    beforeEach(() => {
      approvalsService = new ApprovalsService(auditService);
    });

    it('should approve an action and record audit entry', async () => {
      const tenantId = randomUUID();
      const approvalId = randomUUID();

      // Mock finding the pending approval
      jest.spyOn<any, any>(approvalsService, 'getApprovalById').mockResolvedValue({
        id: approvalId,
        tenantId,
        actionType: 'send_outbound_message',
        actionSummary: 'Draft email to lead',
        proposedAction: { text: 'Hello prospective client' },
        status: 'pending',
      });

      const result = await approvalsService.approveAction(tenantId, approvalId, 'user-sales-manager');
      expect(result.status).toBe('approved');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          policyDecision: 'approved',
          approvalStatus: 'approved',
        }),
      );
    });

    it('should reject an action with recorded reason and blocked status', async () => {
      const tenantId = randomUUID();
      const approvalId = randomUUID();

      jest.spyOn<any, any>(approvalsService, 'getApprovalById').mockResolvedValue({
        id: approvalId,
        tenantId,
        actionType: 'apply_discount',
        actionSummary: 'Give 30% discount',
        proposedAction: { discount: 30 },
        status: 'pending',
      });

      const result = await approvalsService.rejectAction(tenantId, approvalId, 'Exceeds regional budget cap');
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Exceeds regional budget cap');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          policyDecision: 'rejected',
          result: 'blocked',
        }),
      );
    });
  });

  describe('PaymentAgent & Stripe Webhook (Authoritative Billing)', () => {
    let paymentAgent: PaymentAgent;
    let stripeWebhookService: StripeWebhookService;

    beforeEach(() => {
      paymentAgent = new PaymentAgent(toolRegistry);
      stripeWebhookService = new StripeWebhookService(auditService);
    });

    it('should generate secure Stripe checkout session URL for qualified leads', async () => {
      const tenantId = randomUUID();
      const result = await paymentAgent.createCheckoutSession(tenantId, {
        leadId: randomUUID(),
        contactId: randomUUID(),
        tier: 'growth',
        amount: 499,
      });

      expect(result.checkoutUrl).toContain('checkout.stripe.com');
      expect(result.sessionId).toBeDefined();
      expect(result.status).toBe('pending_payment');
    });

    it('CRITICAL: Should refuse payment confirmation from user chat claims until webhook arrives', async () => {
      const ctx = {
        tenantId: randomUUID(),
        traceId: 'tr_pay_claim',
        agentId: 'payment-agent',
        agentName: 'PaymentAgent',
        input: {
          leadId: randomUUID(),
          contactId: randomUUID(),
          message: 'I paid just now! Activate my account immediately.',
        },
      };

      const result = await paymentAgent.execute(ctx.input, ctx);
      expect(result.paymentVerified).toBe(false);
      expect(result.status).toBe('pending_webhook');
      expect(result.reply).toContain('waiting for the official Stripe payment confirmation webhook');
    });

    it('should verify payment and mark opportunity won on verified Stripe webhook event', async () => {
      const tenantId = randomUUID();
      const rawEvent = JSON.stringify({
        id: 'evt_stripe_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_abc',
            amount_total: 49900,
            currency: 'usd',
            metadata: { tenantId },
          },
        },
      });

      const result = await stripeWebhookService.handleStripeEvent(rawEvent);
      expect(result.status).toBe('payment_verified');
      expect(result.amount).toBe(499);
      expect(result.currency).toBe('USD');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'stripe:webhook_confirmation',
          result: 'success',
        }),
      );
    });
  });

  describe('KnowledgeService (pgvector Embeddings & Semantic Search)', () => {
    let knowledgeService: KnowledgeService;

    beforeEach(() => {
      knowledgeService = new KnowledgeService();
    });

    it('should generate deterministic 1536-dimensional normalized embeddings', () => {
      const vec = knowledgeService.generateEmbedding('Revora enterprise pricing and security architecture');
      expect(vec.length).toBe(1536);

      // Check normalization (L2 norm should be ~1.0)
      const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
      expect(norm).toBeCloseTo(1.0, 1);
    });

    it('should return grounded chunks for semantic search queries', async () => {
      const tenantId = randomUUID();
      const results = await knowledgeService.search(tenantId, 'What are the pricing tiers?');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.content).toContain('Revora platform tiers');
      expect(results[0]?.score).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('EvaluationService (LLM-as-a-Judge Scoring & Benchmark Gates)', () => {
    let evaluationService: EvaluationService;

    beforeEach(() => {
      evaluationService = new EvaluationService();
    });

    it('should score high and recommend PASS for safe, grounded agent response', () => {
      const result = evaluationService.evaluateResponse({
        tenantId: randomUUID(),
        scenarioName: 'Inbound FAQ Query',
        promptVersion: 'v2.1',
        agentResponse: 'Hello! Revora offers our Growth tier at $499/mo with full CRM integration and 24/7 SLA.',
        groundTruthContext: 'Growth plan is $499/mo with CRM integration and 24/7 SLA.',
      });

      expect(result.scores.overallScore).toBeGreaterThanOrEqual(85);
      expect(result.recommendation).toBe('PASS');
      expect(result.policyViolations.length).toBe(0);
    });

    it('should detect violations and recommend BLOCK if agent claims payment confirmed without webhook', () => {
      const result = evaluationService.evaluateResponse({
        tenantId: randomUUID(),
        scenarioName: 'Premature Payment Confirmation',
        promptVersion: 'v1.0',
        agentResponse: 'Great, payment is received! Your account is active.',
      });

      expect(result.policyViolations.length).toBeGreaterThan(0);
      expect(result.policyViolations.some((v) => v.includes('Stripe webhook'))).toBe(true);
      expect(result.recommendation).toBe('BLOCK');
    });
  });
});

