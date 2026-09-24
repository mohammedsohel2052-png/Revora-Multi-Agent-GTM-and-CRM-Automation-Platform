import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { EvaluationService, EvaluationInput } from './evaluation.service';

@ApiTags('evaluation')
@Controller('api/v1/evaluation')
@UseGuards(TenantGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('benchmarks')
  @ApiOperation({ summary: 'Get comparative benchmark scores across prompt versions' })
  getBenchmarks(@CurrentTenant() tenantId: string) {
    return this.evaluationService.getBenchmarks(tenantId);
  }

  @Post('run')
  @ApiOperation({ summary: 'Run LLM-as-a-judge evaluation across groundedness, tone, policy, and ICP accuracy' })
  @ApiResponse({ status: 200, description: 'Evaluation metric results and release gate recommendation' })
  runEvaluation(
    @CurrentTenant() tenantId: string,
    @Body() body: Omit<EvaluationInput, 'tenantId'>,
  ) {
    return this.evaluationService.evaluateResponse({
      ...body,
      tenantId,
    });
  }
}
