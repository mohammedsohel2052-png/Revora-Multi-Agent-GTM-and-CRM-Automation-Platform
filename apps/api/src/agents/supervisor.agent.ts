import { Injectable, Logger } from '@nestjs/common';
import { LeadIntakeAgent, RawLeadIntakeInput, IntakeResult } from './lead-intake/lead-intake.agent';
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

    // Step 1: Lead Intake Agent
    const intakeResult = await this.leadIntakeAgent.execute(input.rawEvent, baseCtx);

    const stepCtx: AgentRunContext = {
      ...baseCtx,
      leadId: intakeResult.leadId,
      conversationId: intakeResult.conversationId,
    };

    // Step 2: Qualification Agent
    const qualificationInput: QualificationInput = {
      leadId: intakeResult.leadId,
      contactName: input.rawEvent.sender.name,
      email: input.rawEvent.sender.email,
      jobTitle: input.jobTitle || 'Decision Maker',
      companySize: input.companySize || '50-200',
      industry: input.industry || 'Technology / SaaS',
      messageText: input.rawEvent.message,
    };

    const qualificationResult = await this.qualificationAgent.execute(qualificationInput, stepCtx);

    // Step 3: Conversation Agent (if message exists)
    let conversationResult;
    if (intakeResult.conversationId && input.rawEvent.message) {
      const convInput: ConversationTurnInput = {
        conversationId: intakeResult.conversationId,
        leadId: intakeResult.leadId,
        channel: input.rawEvent.channel,
        inboundMessage: input.rawEvent.message,
        contactName: input.rawEvent.sender.name || 'Prospect',
      };
      conversationResult = await this.conversationAgent.execute(convInput, stepCtx);
    }

    const durationMs = Date.now() - start;

    // Log Usage Event (Token/Agent usage tracking for billing)
    await db.insert(usageEvents).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      eventType: 'workflow_run',
      workflowRunId,
      inputTokens: 850,
      outputTokens: 420,
      costUsd: '0.003500',
    });

    this.logger.log(`[Supervisor Swarm Complete] Run=${workflowRunId} in ${durationMs}ms`);

    return {
      workflowRunId,
      intake: intakeResult,
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
