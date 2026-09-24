import { ToolRegistryService } from '../src/tools/tool-registry.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { QualificationAgent } from '../src/agents/qualification/qualification.agent';
import { ConversationAgent } from '../src/agents/conversation/conversation.agent';
import { EnrichmentAgent } from '../src/agents/enrichment/enrichment.agent';
import { BookingAgent } from '../src/agents/booking/booking.agent';
import { HumanHandoffAgent } from '../src/agents/human-handoff/human-handoff.agent';
import { WebhooksService } from '../src/modules/webhooks/webhooks.service';
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
});
