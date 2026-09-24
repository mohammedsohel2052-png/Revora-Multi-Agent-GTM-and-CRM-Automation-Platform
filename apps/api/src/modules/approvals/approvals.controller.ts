import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ApprovalsService } from './approvals.service';

@ApiTags('approvals')
@Controller('api/v1/approvals')
@UseGuards(TenantGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List all pending approval requests requiring Human-in-the-Loop review' })
  async getPending(@CurrentTenant() tenantId: string) {
    return await this.approvalsService.getPendingApprovals(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific approval request' })
  async getById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return await this.approvalsService.getApprovalById(tenantId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a held agent action and trigger immediate execution' })
  async approve(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { userId?: string },
  ) {
    return await this.approvalsService.approveAction(tenantId, id, body.userId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a held agent action with an explicit audit reason' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { reason: string; userId?: string },
  ) {
    return await this.approvalsService.rejectAction(tenantId, id, body.reason, body.userId);
  }

  @Post(':id/edit-and-approve')
  @ApiOperation({ summary: 'Edit the proposed payload (e.g., custom message or price) and approve' })
  async editAndApprove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { editedAction: Record<string, unknown>; userId?: string },
  ) {
    return await this.approvalsService.editAndApproveAction(
      tenantId,
      id,
      body.editedAction,
      body.userId,
    );
  }
}
