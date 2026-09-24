import { Injectable, Logger } from '@nestjs/common';
import { db, agents } from '@revora/db';
import { eq, or, isNull } from 'drizzle-orm';
import { SupervisorAgent, SwarmPipelineInput } from '../../agents/supervisor.agent';
import { QualificationAgent, QualificationInput } from '../../agents/qualification/qualification.agent';
import { ConversationAgent, ConversationTurnInput } from '../../agents/conversation/conversation.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly supervisorAgent: SupervisorAgent,
    private readonly qualificationAgent: QualificationAgent,
    private readonly conversationAgent: ConversationAgent,
    private readonly toolRegistry: ToolRegistryService,
  ) {}

  async listAgents(tenantId: string) {
    return await db.query.agents.findMany({
      where: (a, { eq, or, isNull }) =>
        or(eq(a.tenantId, tenantId), isNull(a.tenantId)),
    });
  }

  listRegisteredTools() {
    return this.toolRegistry.listTools();
  }

  async runSwarmPipeline(tenantId: string, input: Omit<SwarmPipelineInput, 'tenantId'>) {
    return await this.supervisorAgent.runPipeline({
      tenantId,
      ...input,
    });
  }

  async scoreQualification(tenantId: string, input: QualificationInput) {
    return await this.qualificationAgent.execute(input, {
      tenantId,
      traceId: `tr_score_${randomUUID().slice(0, 8)}`,
      leadId: input.leadId,
    });
  }

  async testConversationTurn(tenantId: string, input: ConversationTurnInput) {
    return await this.conversationAgent.execute(input, {
      tenantId,
      traceId: `tr_conv_${randomUUID().slice(0, 8)}`,
      conversationId: input.conversationId,
      leadId: input.leadId,
    });
  }
}
