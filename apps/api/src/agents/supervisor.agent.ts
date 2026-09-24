import { Injectable, Logger } from '@nestjs/common';
import { LeadIntakeAgent, RawLeadIntakeInput, IntakeResult } from './lead-intake/lead-intake.agent';
import { IdentityResolutionAgent, IdentityResolutionResult } from './identity-resolution/identity-resolution.agent';
import { EnrichmentAgent, EnrichmentResult } from './enrichment/enrichment.agent';
import { QualificationAgent, QualificationInput } from './qualification/qualification.agent';
import { ConversationAgent, ConversationTurnInput } from './conversation/conversation.agent';
import { AgentRunContext } from './base.agent';
import { db, usageEvents } from '@revora/db';
import { randomUUID } from 'crypto';
import { QualificationOutput } from '@revora/shared';

export interface SwarmPipelineInput {
  tenantId: string;
  userId?: string;
  rawEvent: RawLeadIntakeInput;
  companySize?: string;
  industry?: string;
  jobTitle?: string;
}

export interface SwarmPipelineResult {
  workflowRunId: string;
  intake: IntakeResult;
  identity: IdentityResolutionResult;
  enrichment: EnrichmentResult;
  qualification: QualificationOutput;
  conversation?: {
    replyMessageId: string;
    content: string;
    approvalRequired: boolean;
    approvalId?: string;
  };
  durationMs: number;
}

@Injectable()
export class SupervisorAgent {
  private readonly logger = new Logger(SupervisorAgent.name);

  constructor(
    private readonly leadIntakeAgent: LeadIntakeAgent,
    private readonly identityResolutionAgent: IdentityResolutionAgent,
    private readonly enrichmentAgent: EnrichmentAgent,
    private readonly qualificationAgent: QualificationAgent,
    private readonly conversationAgent: ConversationAgent,
  ) {}

  async runPipeline(input: SwarmPipelineInput): Promise<SwarmPipelineResult> {
    const workflowRunId = randomUUID();
    const traceId = `tr_${workflowRunId.slice(0, 8)}`;
    const start = Date.now();

    this.logger.log(`[Supervisor Swarm] Starting workflow run ${workflowRunId} for tenant ${input.tenantId}`);

    const baseCtx: AgentRunContext = {
      tenantId: input.tenantId,
      traceId,
      userId: input.userId,
    };

    // Step 1: Lead Intake Agent (Normalize across channels, create contact & lead)
    const intakeResult = await this.leadIntakeAgent.execute(input.rawEvent, baseCtx);

    const stepCtx: AgentRunContext = {
      ...baseCtx,
      leadId: intakeResult.leadId,
      conversationId: intakeResult.conversationId,
    };

    // Step 2: Identity Resolution Agent (Cross-channel identity graph & deduplication)
    const identityResult = await this.identityResolutionAgent.execute(
      {
        currentContactId: intakeResult.contactId,
        name: input.rawEvent.sender.name || 'Prospect',
        email: input.rawEvent.sender.email,
        phone: input.rawEvent.sender.phone,
        socialId: input.rawEvent.sender.socialId,
        channel: input.rawEvent.channel,
      },
      stepCtx,
    );

    const effectiveContactId =
      identityResult.action === 'auto_merged' && identityResult.targetContactId
        ? identityResult.targetContactId
        : intakeResult.contactId;

    // Step 3: Company Enrichment Agent (Corporate domain extraction & firmographic waterfall)
    const enrichmentResult = await this.enrichmentAgent.execute(
      {
        contactId: effectiveContactId,
        email: input.rawEvent.sender.email,
      },
      stepCtx,
    );

    // Step 4: Qualification Agent (Deterministic Explainable ICP fit + intent scoring)
    const qualificationInput: QualificationInput = {
      leadId: intakeResult.leadId,
      contactName: input.rawEvent.sender.name,
      email: input.rawEvent.sender.email,
      jobTitle: input.jobTitle || 'Decision Maker',
      companyName: enrichmentResult.companyName,
      companySize: enrichmentResult.sizeEstimate || input.companySize || '50-200',
      industry: enrichmentResult.industry || input.industry || 'Technology / SaaS',
      messageText: input.rawEvent.message,
    };

    const qualificationResult = await this.qualificationAgent.execute(qualificationInput, stepCtx);

    // Step 5: Conversation Agent (Draft reply into thread, apply pricing / calendar guardrails)
    let conversationResult;
    if (intakeResult.conversationId && input.rawEvent.message) {
      const convInput: ConversationTurnInput = {
        conversationId: intakeResult.conversationId,
        leadId: intakeResult.leadId,
        channel: input.rawEvent.channel,
        inboundMessage: input.rawEvent.message,
        contactName: input.rawEvent.sender.name || 'Prospect',
        companyName: enrichmentResult.companyName,
      };
      conversationResult = await this.conversationAgent.execute(convInput, stepCtx);
    }

    const durationMs = Date.now() - start;

    // Log Usage Event (Telemetry tracking)
    await db.insert(usageEvents).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      eventType: 'workflow_run',
      workflowRunId,
      inputTokens: 1120,
      outputTokens: 580,
      costUsd: '0.005100',
    });

    this.logger.log(`[Supervisor Swarm Complete] Run=${workflowRunId} in ${durationMs}ms`);

    return {
      workflowRunId,
      intake: intakeResult,
      identity: identityResult,
      enrichment: enrichmentResult,
      qualification: qualificationResult,
      conversation: conversationResult
        ? {
            replyMessageId: conversationResult.replyMessageId,
            content: conversationResult.content,
            approvalRequired: conversationResult.approvalRequired,
            approvalId: conversationResult.approvalId,
          }
        : undefined,
      durationMs,
    };
  }
}
