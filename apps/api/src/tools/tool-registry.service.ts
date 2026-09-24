import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { AgentTool, ToolExecutionContext, ToolExecutionResult } from './tool.interface';
import { AuditService } from '../modules/audit/audit.service';
import { searchCrmContactsTool } from './definitions/search-crm-contacts.tool';
import { updateQualificationTool } from './definitions/update-qualification.tool';
import { createApprovalRequestTool } from './definitions/create-approval-request.tool';
import { draftOutboundMessageTool } from './definitions/draft-outbound-message.tool';
import { checkCalendarTool } from './definitions/check-calendar.tool';
import { bookCalendarMeetingTool } from './definitions/book-calendar-meeting.tool';
import { triggerHumanHandoffTool } from './definitions/trigger-human-handoff.tool';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, AgentTool>();

  constructor(private readonly auditService: AuditService) {
    this.registerTool(searchCrmContactsTool);
    this.registerTool(updateQualificationTool);
    this.registerTool(createApprovalRequestTool);
    this.registerTool(draftOutboundMessageTool);
    this.registerTool(checkCalendarTool);
    this.registerTool(bookCalendarMeetingTool);
    this.registerTool(triggerHumanHandoffTool);
  }

  registerTool(tool: AgentTool) {
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered agent tool: ${tool.name} [Risk: ${tool.riskLevel}]`);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  listTools(): { name: string; description: string; riskLevel: string }[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      riskLevel: t.riskLevel,
    }));
  }

  async executeTool(
    name: string,
    rawInput: unknown,
    ctx: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new NotFoundException(`Tool "${name}" is not registered in Revora Tool Registry`);
    }

    // 1. Validate Input Schema
    const parseResult = tool.inputSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = `Input validation failed: ${parseResult.error.message}`;
      await this.auditService.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        agentId: ctx.agentId,
        traceId: ctx.traceId,
        toolName: name,
        inputParams: typeof rawInput === 'object' ? (rawInput as Record<string, unknown>) : { input: rawInput },
        result: 'error',
        errorMessage: errorMsg,
      });
      return { success: false, error: errorMsg };
    }

    const validatedInput = parseResult.data;

    // 2. Policy & Approval Evaluation
    let requiresApproval = false;
    if (typeof tool.requiresApproval === 'function') {
      requiresApproval = tool.requiresApproval(validatedInput, ctx);
    } else if (typeof tool.requiresApproval === 'boolean') {
      requiresApproval = tool.requiresApproval;
    }

    const start = Date.now();
    try {
      // 3. Execution
      const output = await tool.execute(validatedInput, ctx);
      const latencyMs = Date.now() - start;

      // 4. Record Audit Trail
      await this.auditService.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        agentId: ctx.agentId,
        traceId: ctx.traceId,
        toolName: name,
        inputParams: typeof validatedInput === 'object' ? (validatedInput as Record<string, unknown>) : { input: validatedInput },
        outputSummary: typeof output === 'object' ? JSON.stringify(output).slice(0, 500) : String(output),
        policyDecision: requiresApproval ? 'GATED_APPROVAL' : 'ALLOWED',
        approvalStatus: requiresApproval ? 'pending' : undefined,
        result: 'success',
      });

      this.logger.debug(`[Tool Executed] ${name} for agent ${ctx.agentName} in ${latencyMs}ms`);
      return {
        success: true,
        data: output,
        requiresApproval,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const errorMsg = (error as Error).message;

      await this.auditService.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        agentId: ctx.agentId,
        traceId: ctx.traceId,
        toolName: name,
        inputParams: typeof validatedInput === 'object' ? (validatedInput as Record<string, unknown>) : { input: validatedInput },
        result: 'error',
        errorMessage: errorMsg,
      });

      this.logger.error(`[Tool Error] ${name}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
