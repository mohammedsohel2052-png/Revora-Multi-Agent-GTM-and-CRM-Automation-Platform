import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { db, approvalRequests } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(private readonly auditService: AuditService) {}

  async getPendingApprovals(tenantId: string) {
    try {
      return await db.query.approvalRequests.findMany({
        where: (a, { eq, and }) => and(eq(a.tenantId, tenantId), eq(a.status, 'pending')),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });
    } catch {
      // In-memory or initial mock return if db is not connected
      return [];
    }
  }

  async getApprovalById(tenantId: string, id: string) {
    const item = await db.query.approvalRequests.findFirst({
      where: (a, { eq, and }) => and(eq(a.tenantId, tenantId), eq(a.id, id)),
    });

    if (!item) {
      throw new NotFoundException(`Approval request with ID "${id}" not found`);
    }

    return item;
  }

  async approveAction(tenantId: string, id: string, userId?: string) {
    const existing = await this.getApprovalById(tenantId, id);

    if (existing.status !== 'pending') {
      throw new BadRequestException(`Approval request is already in state "${existing.status}"`);
    }

    const decidedAt = new Date();
    await db
      .update(approvalRequests)
      .set({
        status: 'approved',
        decidedByUserId: userId,
        decidedAt,
      })
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.tenantId, tenantId)));

    this.logger.log(`[Approval] Request ${id} approved by user ${userId || 'system'}. Dispatching held action.`);

    // Record audit event
    await this.auditService.record({
      tenantId,
      userId,
      agentId: existing.agentId || undefined,
      workflowRunId: existing.workflowRunId || undefined,
      toolName: `approval:${existing.actionType}`,
      inputParams: existing.proposedAction as Record<string, unknown>,
      outputSummary: `Human approved action: "${existing.actionSummary}"`,
      policyDecision: 'approved',
      approvalStatus: 'approved',
      result: 'success',
    });

    return {
      status: 'approved',
      id,
      executedAction: existing.proposedAction,
      decidedAt,
    };
  }

  async rejectAction(tenantId: string, id: string, reason: string, userId?: string) {
    const existing = await this.getApprovalById(tenantId, id);

    if (existing.status !== 'pending') {
      throw new BadRequestException(`Approval request is already in state "${existing.status}"`);
    }

    const decidedAt = new Date();
    await db
      .update(approvalRequests)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        decidedByUserId: userId,
        decidedAt,
      })
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.tenantId, tenantId)));

    this.logger.log(`[Rejection] Request ${id} rejected by user ${userId || 'system'}. Reason: ${reason}`);

    await this.auditService.record({
      tenantId,
      userId,
      agentId: existing.agentId || undefined,
      workflowRunId: existing.workflowRunId || undefined,
      toolName: `approval:${existing.actionType}`,
      inputParams: { proposedAction: existing.proposedAction, rejectionReason: reason },
      outputSummary: `Human rejected action: "${existing.actionSummary}". Reason: ${reason}`,
      policyDecision: 'rejected',
      approvalStatus: 'rejected',
      result: 'blocked',
    });

    return {
      status: 'rejected',
      id,
      rejectionReason: reason,
      decidedAt,
    };
  }

  async editAndApproveAction(
    tenantId: string,
    id: string,
    editedAction: Record<string, unknown>,
    userId?: string,
  ) {
    const existing = await this.getApprovalById(tenantId, id);

    if (existing.status !== 'pending') {
      throw new BadRequestException(`Approval request is already in state "${existing.status}"`);
    }

    const decidedAt = new Date();
    await db
      .update(approvalRequests)
      .set({
        status: 'edited',
        editedAction,
        decidedByUserId: userId,
        decidedAt,
      })
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.tenantId, tenantId)));

    this.logger.log(`[Edit & Approve] Request ${id} edited and approved. Dispatching modified payload.`);

    await this.auditService.record({
      tenantId,
      userId,
      agentId: existing.agentId || undefined,
      workflowRunId: existing.workflowRunId || undefined,
      toolName: `approval:${existing.actionType}`,
      inputParams: { original: existing.proposedAction, edited: editedAction },
      outputSummary: `Human edited & approved action: "${existing.actionSummary}"`,
      policyDecision: 'edited_and_approved',
      approvalStatus: 'edited',
      result: 'success',
    });

    return {
      status: 'edited',
      id,
      executedAction: editedAction,
      decidedAt,
    };
  }
}
