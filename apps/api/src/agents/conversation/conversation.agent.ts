import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';

export interface ConversationTurnInput {
  conversationId: string;
  leadId?: string;
  channel: 'instagram' | 'email' | 'whatsapp' | 'website' | 'form';
  inboundMessage: string;
  contactName: string;
  companyName?: string;
}

export interface ConversationTurnOutput {
  replyMessageId: string;
  content: string;
  intent: string;
  status: string;
  approvalRequired: boolean;
  approvalId?: string;
}

@Injectable()
export class ConversationAgent extends BaseAgent<ConversationTurnInput, ConversationTurnOutput> {
  readonly name = 'Conversation Agent';
  readonly role = 'conversation';
  readonly autonomyLevel = 'supervised' as const;
  readonly allowedTools = ['draft_outbound_message', 'check_calendar_availability'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  async execute(input: ConversationTurnInput, ctx: AgentRunContext): Promise<ConversationTurnOutput> {
    this.logger.log(`[Conversation Agent] Replying to ${input.contactName} on ${input.channel}`);

    const lower = input.inboundMessage.toLowerCase();
    let replyText = '';
    let intent: 'answer_question' | 'clarify_icp' | 'schedule_meeting' | 'send_proposal' | 'follow_up' = 'answer_question';
    let priceQuote: number | undefined;

    // Check if asking about meeting or booking
    if (lower.includes('demo') || lower.includes('book') || lower.includes('call') || lower.includes('schedule') || lower.includes('meet')) {
      intent = 'schedule_meeting';
      const calendarData = await this.callTool<{ slots: { startTime: string }[] }>('check_calendar_availability', {
        timezone: 'America/New_York',
      }, ctx);

      const slots = calendarData.slots || [];
      const slotDesc = slots.length > 0
        ? `We have open slots tomorrow at 2:00 PM EST and 3:30 PM EST.`
        : `We can arrange a dedicated session this week.`;

      replyText = `Hi ${input.contactName}, thank you for reaching out! We would be delighted to demonstrate Revora's multi-agent GTM automation. ${slotDesc} Would either of those work for you?`;
    }
    // Check if asking about pricing
    else if (lower.includes('price') || lower.includes('cost') || lower.includes('quote') || lower.includes('rate')) {
      intent = 'send_proposal';
      priceQuote = 1200; // triggers human-in-the-loop review policy!
      replyText = `Hi ${input.contactName}, thanks for inquiring about Revora pricing. For team deployment with full multi-agent swarm access, our standard growth tier begins at $1,200/mo billed annually with unlimited inbound webhook ingestion. Would you like a breakdown of our security and SLA features?`;
    }
    // General helpful answer
    else {
      intent = 'answer_question';
      replyText = `Hi ${input.contactName}, thanks for contacting Revora! We provide multi-agent GTM intelligence with strict Row-Level Security and explainable ICP qualification. How can our autonomous agents assist your revenue pipeline today?`;
    }

    // Call tool to draft message and enforce safety gates
    const draftResult = await this.callTool<{
      messageId: string;
      status: string;
      approvalId?: string;
    }>('draft_outbound_message', {
      conversationId: input.conversationId,
      channel: input.channel,
      content: replyText,
      intent,
      priceQuoted: priceQuote,
    }, ctx);

    return {
      replyMessageId: draftResult.messageId,
      content: replyText,
      intent,
      status: draftResult.status,
      approvalRequired: !!draftResult.approvalId,
      approvalId: draftResult.approvalId,
    };
  }
}
