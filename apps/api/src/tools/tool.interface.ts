import { z } from 'zod';
import { ToolRiskLevel } from '@revora/shared';

export interface ToolExecutionContext {
  tenantId: string;
  agentId: string;
  agentName: string;
  traceId: string;
  userId?: string;
  leadId?: string;
  conversationId?: string;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requiresApproval?: boolean;
  approvalRequestId?: string;
}

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  inputSchema: z.ZodType<TInput>;
  requiresApproval?: boolean | ((input: TInput, ctx: ToolExecutionContext) => boolean);
  execute(input: TInput, ctx: ToolExecutionContext): Promise<TOutput>;
}
