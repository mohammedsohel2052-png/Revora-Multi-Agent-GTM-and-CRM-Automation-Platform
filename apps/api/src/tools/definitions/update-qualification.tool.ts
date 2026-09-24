import { z } from 'zod';
import { AgentTool, ToolExecutionContext } from '../tool.interface';
import { db, leads } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { QualificationOutputSchema } from '@revora/shared';

export const UpdateQualificationInputSchema = z.object({
  leadId: z.string().uuid(),
  qualification: QualificationOutputSchema,
});

export type UpdateQualificationInput = z.infer<typeof UpdateQualificationInputSchema>;

export const updateQualificationTool: AgentTool<UpdateQualificationInput, { success: boolean; leadId: string }> = {
  name: 'update_lead_qualification',
  description: 'Persists evaluated ICP fit score, intent score, and transparent reasons to the lead record.',
  riskLevel: 'write',
  inputSchema: UpdateQualificationInputSchema,
  requiresApproval: false,
  async execute(input, ctx: ToolExecutionContext) {
    const { qualification, leadId } = input;

    await db
      .update(leads)
      .set({
        icpFitScore: qualification.icp_fit_score,
        intentScore: qualification.intent_score,
        qualificationStatus: qualification.qualification_status,
        scoreReasons: qualification.reasons,
        nextAction: qualification.recommended_next_action,
        lastAgentAction: `Qualified by ${ctx.agentName}`,
        lastAgentActionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, ctx.tenantId)));

    return {
      success: true,
      leadId,
    };
  },
};
