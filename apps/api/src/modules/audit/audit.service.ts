import { Injectable, Logger } from '@nestjs/common';
import { db, auditEvents } from '@revora/db';
import { randomUUID } from 'crypto';

export interface RecordAuditEventInput {
  tenantId: string;
  userId?: string;
  agentId?: string;
  workflowRunId?: string;
  taskId?: string;
  traceId?: string;
  toolName?: string;
  inputParams?: Record<string, unknown>;
  outputSummary?: string;
  policyDecision?: string;
  approvalStatus?: string;
  result: 'success' | 'error' | 'blocked';
  errorMessage?: string;
  providerEventId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // Redact sensitive PII fields
  private redactPII(params?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!params) return undefined;
    const sensitiveKeys = ['password', 'secret', 'token', 'authorization', 'credit_card', 'ssn', 'api_key'];
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactPII(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  async record(entry: RecordAuditEventInput): Promise<string> {
    try {
      const id = randomUUID();
      const redactedParams = this.redactPII(entry.inputParams);

      await db.insert(auditEvents).values({
        id,
        tenantId: entry.tenantId,
        userId: entry.userId,
        agentId: entry.agentId,
        workflowRunId: entry.workflowRunId,
        taskId: entry.taskId,
        traceId: entry.traceId,
        toolName: entry.toolName,
        inputParams: redactedParams,
        outputSummary: entry.outputSummary,
        policyDecision: entry.policyDecision,
        approvalStatus: entry.approvalStatus,
        result: entry.result,
        errorMessage: entry.errorMessage,
        providerEventId: entry.providerEventId,
      });

      this.logger.debug(`[Audit Recorded] Tenant=${entry.tenantId} Tool=${entry.toolName} Result=${entry.result}`);
      return id;
    } catch (error) {
      this.logger.error(`Failed to record audit event: ${(error as Error).message}`, (error as Error).stack);
      return '';
    }
  }

  async listRecent(tenantId: string, limit = 50) {
    return await db.query.auditEvents.findMany({
      where: (audit, { eq }) => eq(audit.tenantId, tenantId),
      orderBy: (audit, { desc }) => [desc(audit.timestamp)],
      limit,
    });
  }
}
