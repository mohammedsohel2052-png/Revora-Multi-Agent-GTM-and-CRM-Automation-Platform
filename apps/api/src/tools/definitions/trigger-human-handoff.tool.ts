import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';
import { db, conversations, leads } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const TriggerHumanHandoffInputSchema = z.object({
  conversationId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  reason: z.string().min(1),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  summaryForRep: z.string().min(1),
  sentimentScore: z.number().min(-1).max(1).default(-0.5),
});

export type TriggerHumanHandoffInput = z.infer<typeof TriggerHumanHandoffInputSchema>;

export interface HandoffResult {
  handoffId: string;
  conversationId: string;
  status: 'human_handoff';
  assignedRepRole: string;
  summaryForRep: string;
  transferredAt: string;
}

export const triggerHumanHandoffTool: AgentTool<TriggerHumanHandoffInput, HandoffResult> = {
  name: 'trigger_human_handoff',
  description: 'Halts AI agent messaging on a conversation thread and transfers ownership to a human sales rep.',
  riskLevel: 'write',
  inputSchema: TriggerHumanHandoffInputSchema,
  requiresApproval: false, // Escalating to human is a safety feature and should always be permitted
  async execute(input, ctx: ToolExecutionContext): Promise<HandoffResult> {
    const handoffId = randomUUID();

    // 1. Transition conversation status to human_handoff
    await db
      .update(conversations)
      .set({
        status: 'human_handoff',
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, input.conversationId), eq(conversations.tenantId, ctx.tenantId)));

    // 2. If lead is linked, update lead's nextAction
    if (input.leadId) {
      await db
        .update(leads)
        .set({
          nextAction: `[URGENT HANDOFF] Rep intervention required: ${input.reason}`,
          lastAgentAction: `Transferred to human by ${ctx.agentName}`,
          lastAgentActionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.tenantId, ctx.tenantId)));
    }

    return {
      handoffId,
      conversationId: input.conversationId,
      status: 'human_handoff',
      assignedRepRole: 'sales_rep',
      summaryForRep: input.summaryForRep,
      transferredAt: new Date().toISOString(),
    };
  },
};
