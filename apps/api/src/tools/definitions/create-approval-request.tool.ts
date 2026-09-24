import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';
import { db, approvalRequests } from '@revora/db';
import { randomUUID } from 'crypto';

export const CreateApprovalRequestInputSchema = z.object({
  actionType: z.string().min(1),
  actionSummary: z.string().min(1),
  proposedAction: z.record(z.unknown()),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  expiresInHours: z.number().int().min(1).max(168).default(24),
  leadId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

export type CreateApprovalRequestInput = z.infer<typeof CreateApprovalRequestInputSchema>;

export const createApprovalRequestTool: AgentTool<CreateApprovalRequestInput, { approvalId: string; status: string }> = {
  name: 'request_human_approval',
  description: 'Pauses an autonomous action and routes a proposal to the human sales approval queue.',
  riskLevel: 'write',
  inputSchema: CreateApprovalRequestInputSchema,
  requiresApproval: false, // Creating an approval request is safe and should never be blocked
  async execute(input, ctx: ToolExecutionContext) {
    const approvalId = randomUUID();
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3600 * 1000);

    await db.insert(approvalRequests).values({
      id: approvalId,
      tenantId: ctx.tenantId,
      agentId: ctx.agentId,
      leadId: input.leadId || ctx.leadId,
      conversationId: input.conversationId || ctx.conversationId,
      actionType: input.actionType,
      actionSummary: input.actionSummary,
      proposedAction: input.proposedAction,
      riskLevel: input.riskLevel,
      status: 'pending',
      expiresAt,
    });

    return {
      approvalId,
      status: 'pending',
    };
  },
};
