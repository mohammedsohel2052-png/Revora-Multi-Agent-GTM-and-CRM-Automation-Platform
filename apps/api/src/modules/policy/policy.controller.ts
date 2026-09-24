import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { PolicyEngineService, PolicyEvaluationRequest } from './policy-engine.service';

@ApiTags('policy')
@Controller('api/v1/policy')
@UseGuards(TenantGuard)
export class PolicyController {
  constructor(private readonly policyEngine: PolicyEngineService) {}

  @Get('rules')
  @ApiOperation({ summary: 'List active policy guardrails and autonomy limits for tenant' })
  getRules(@CurrentTenant() tenantId: string) {
    return {
      tenantId,
      autonomousSending: process.env['ENABLE_AUTONOMOUS_SENDING'] === 'true',
      maxDiscountPercent: 15,
      maxContractValueUsd: 10000,
      piiRedactionEnabled: true,
      maxDailyOutboundPerLead: 3,
      supportedChannels: ['email', 'whatsapp', 'instagram', 'sms'],
    };
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate an agent action against safety policies before execution' })
  @ApiResponse({ status: 200, description: 'Evaluation decision with risk level and approval requirements' })
  async evaluate(
    @CurrentTenant() tenantId: string,
    @Body() body: Omit<PolicyEvaluationRequest, 'tenantId'>,
  ) {
    return await this.policyEngine.evaluateAction({
      ...body,
      tenantId,
    });
  }
}
