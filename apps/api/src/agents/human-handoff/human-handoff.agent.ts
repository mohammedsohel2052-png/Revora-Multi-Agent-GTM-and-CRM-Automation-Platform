import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { HandoffResult } from '../../tools/definitions/trigger-human-handoff.tool';

export interface HumanHandoffInput {
  conversationId: string;
  leadId?: string;
  contactName: string;
  inboundMessage: string;
}

export interface HumanHandoffOutput {
  shouldHandoff: boolean;
  reason?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  handoffDetails?: HandoffResult;
  suggestedOpeningReply?: string;
}

const EXPLICIT_REQUEST_KEYWORDS = [
  'human',
  'real person',
  'representative',
  'speak with someone',
  'talk to a person',
  'transfer me',
  'operator',
  'customer service',
];

const NEGATIVE_SENTIMENT_KEYWORDS = [
  'frustrated',
  'annoyed',
  'terrible',
  'waste of time',
  'useless bot',
  'stupid bot',
  'unacceptable',
  'angry',
  'disappointed',
];

const COMPLEX_ENTERPRISE_KEYWORDS = [
  'custom dpa',
  'legal audit',
  'subprocessor agreement',
  'soc2 type 2 report',
  'security questionnaire',
  'nda first',
  'procurement team',
];

@Injectable()
export class HumanHandoffAgent extends BaseAgent<HumanHandoffInput, HumanHandoffOutput> {
  readonly name = 'Human Handoff Agent';
  readonly role = 'human_handoff';
  readonly autonomyLevel = 'autonomous' as const;
  readonly allowedTools = ['trigger_human_handoff'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: HumanHandoffInput, ctx: AgentRunContext): Promise<HumanHandoffOutput> {
    const text = input.inboundMessage.toLowerCase();

    let shouldHandoff = false;
    let reason = '';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let sentimentScore = 0;

    // 1. Check explicit requests
    if (EXPLICIT_REQUEST_KEYWORDS.some((kw) => text.includes(kw))) {
      shouldHandoff = true;
      reason = 'Prospect explicitly requested transfer to a human representative';
      urgency = 'high';
      sentimentScore = -0.3;
    }
    // 2. Check frustration or anger
    else if (NEGATIVE_SENTIMENT_KEYWORDS.some((kw) => text.includes(kw))) {
      shouldHandoff = true;
      reason = 'Detected negative sentiment and frustration in prospect communication';
      urgency = 'critical';
      sentimentScore = -0.8;
    }
    // 3. Check complex enterprise security/legal compliance triggers
    else if (COMPLEX_ENTERPRISE_KEYWORDS.some((kw) => text.includes(kw))) {
      shouldHandoff = true;
      reason = 'Enterprise procurement/compliance questionnaire requires executive account team';
      urgency = 'medium';
      sentimentScore = 0.1;
    }

    if (!shouldHandoff) {
      return { shouldHandoff: false };
    }

    this.logger.warn(`[Human Handoff Triggered] Conv=${input.conversationId} Urgency=${urgency} Reason=${reason}`);

    const summaryForRep = `Prospect ${input.contactName} triggered human handoff. Reason: ${reason}. Latest message: "${input.inboundMessage}". Immediate human follow-up recommended.`;

    // Execute handoff tool
    const handoffDetails = await this.callTool<HandoffResult>(
      'trigger_human_handoff',
      {
        conversationId: input.conversationId,
        leadId: input.leadId,
        reason,
        urgency,
        summaryForRep,
        sentimentScore,
      },
      ctx,
    );

    const suggestedOpeningReply =
      urgency === 'critical'
        ? `Hi ${input.contactName}, this is our senior account lead stepping in directly. I sincerely apologize for the frustration. I am here to personally review your setup—how can I best assist you right now?`
        : `Hi ${input.contactName}, this is the Revora account team. I have taken over this thread to give you direct personal support. Let's look into your questions together.`;

    return {
      shouldHandoff: true,
      reason,
      urgency,
      handoffDetails,
      suggestedOpeningReply,
    };
  }
}
