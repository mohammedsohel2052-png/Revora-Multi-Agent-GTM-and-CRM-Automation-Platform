import { Logger } from '@nestjs/common';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { ToolExecutionContext } from '../tools/tool.interface';

export interface AgentRunContext {
  tenantId: string;
  traceId: string;
  userId?: string;
  leadId?: string;
  conversationId?: string;
}

export abstract class BaseAgent<TInput = any, TOutput = any> {
  protected readonly logger: Logger;
  abstract readonly name: string;
  abstract readonly role: string;
  abstract readonly autonomyLevel: 'supervised' | 'semi-autonomous' | 'autonomous';
  abstract readonly allowedTools: string[];

  constructor(protected readonly toolRegistry: ToolRegistryService) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract execute(input: TInput, ctx: AgentRunContext): Promise<TOutput>;

  protected async callTool<T = any>(
    toolName: string,
    toolInput: unknown,
    ctx: AgentRunContext,
  ): Promise<T> {
    if (!this.allowedTools.includes(toolName) && !this.allowedTools.includes('*')) {
      throw new Error(`Agent "${this.name}" is not permitted to execute tool "${toolName}"`);
    }

    const toolCtx: ToolExecutionContext = {
      tenantId: ctx.tenantId,
      agentId: this.name,
      agentName: this.name,
      traceId: ctx.traceId,
      userId: ctx.userId,
      leadId: ctx.leadId,
      conversationId: ctx.conversationId,
    };

    const result = await this.toolRegistry.executeTool(toolName, toolInput, toolCtx);
    if (!result.success) {
      throw new Error(`Tool "${toolName}" execution failed: ${result.error}`);
    }

    return result.data as T;
  }
}
