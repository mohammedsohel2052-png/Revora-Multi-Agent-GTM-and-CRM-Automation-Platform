import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';
import { db, messages, approvalRequests } from '@revora/db';
import { randomUUID } from 'crypto';

export const DraftOutboundMessageInputSchema = z.object({
  conversationId: z.string().uuid(),
  channel: z.enum(['instagram', 'email', 'whatsapp', 'website', 'form']),
  content: z.string().min(1),
  intent: z.enum(['answer_question', 'clarify_icp', 'schedule_meeting', 'send_proposal', 'follow_up']),
  priceQuoted: z.number().optional(),
});

export type DraftOutboundMessageInput = z.infer<typeof DraftOutboundMessageInputSchema>;

export const draftOutboundMessageTool: AgentTool<
  DraftOutboundMessageInput,
  { messageId: string; status: string; approvalId?: string }
> = {
  name: 'draft_outbound_message',
  description: 'Drafts an outbound message into the conversation thread with safety gate validation.',
  riskLevel: 'external_write',
  inputSchema: DraftOutboundMessageInputSchema,
  // Flag as requiring approval if quotes price, sends proposal, or autonomous sending disabled
  requiresApproval: (input) => {
    const autonomousSending = process.env['ENABLE_AUTONOMOUS_SENDING'] === 'true';
    if (!autonomousSending) return true;
    if (input.priceQuoted && input.priceQuoted > 0) return true;
    if (input.intent === 'send_proposal') return true;
    return false;
  },
  async execute(input, ctx: ToolExecutionContext) {
    const messageId = randomUUID();
    const needsApproval =
      process.env['ENABLE_AUTONOMOUS_SENDING'] !== 'true' ||
      !!input.priceQuoted ||
      input.intent === 'send_proposal';

    let approvalId: string | undefined;

    if (needsApproval) {
      approvalId = randomUUID();
      const riskLevel = input.priceQuoted ? 'high' : 'medium';

      await db.insert(approvalRequests).values({
        id: approvalId,
        tenantId: ctx.tenantId,
        agentId: ctx.agentId,
        conversationId: input.conversationId,
        actionType: 'Send Outbound Message',
        actionSummary: `Draft reply (${input.intent}) via ${input.channel}${
          input.priceQuoted ? ` with price quote: $${input.priceQuoted}` : ''
        }`,
        proposedAction: {
          messageId,
          content: input.content,
          channel: input.channel,
          intent: input.intent,
          priceQuoted: input.priceQuoted,
        },
        riskLevel,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      });
    }

    await db.insert(messages).values({
      id: messageId,
      tenantId: ctx.tenantId,
      conversationId: input.conversationId,
      direction: 'outbound',
      content: input.content,
      channel: input.channel,
      senderType: 'agent',
      senderId: ctx.agentId,
      approvalId,
      status: needsApproval ? 'pending_approval' : 'draft',
    });

    return {
      messageId,
      status: needsApproval ? 'pending_approval' : 'draft',
      approvalId,
    };
  },
};
