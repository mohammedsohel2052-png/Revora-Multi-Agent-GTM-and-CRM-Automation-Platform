import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('agents')
@Controller('agents')
@UseGuards(TenantGuard)
@ApiHeader({ name: 'x-tenant-id', description: 'Tenant workspace UUID', required: true })
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active agents in workspace' })
  async listAgents(@CurrentTenant() tenantId: string) {
    return await this.agentsService.listAgents(tenantId);
  }

  @Get('tools')
  @ApiOperation({ summary: 'List all registered safe tools and risk levels' })
  listTools() {
    return this.agentsService.listRegisteredTools();
  }

  @Post('pipeline/run')
  @ApiOperation({ summary: 'Execute end-to-end swarm pipeline on an inbound lead event' })
  async runPipeline(@CurrentTenant() tenantId: string, @Body() body: any) {
    return await this.agentsService.runSwarmPipeline(tenantId, body);
  }

  @Post('qualification/score')
  @ApiOperation({ summary: 'Execute deterministic explainable ICP scoring' })
  async scoreLead(@CurrentTenant() tenantId: string, @Body() body: any) {
    return await this.agentsService.scoreQualification(tenantId, body);
  }

  @Post('conversation/reply')
  @ApiOperation({ summary: 'Test conversational response with safety guardrails' })
  async testReply(@CurrentTenant() tenantId: string, @Body() body: any) {
    return await this.agentsService.testConversationTurn(tenantId, body);
  }
}
