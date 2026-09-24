import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { db, webhookEvents, tenants } from '@revora/db';
import { eq } from 'drizzle-orm';
import { SupervisorAgent } from '../../agents/supervisor.agent';
import { AuditService } from '../audit/audit.service';
import { InboundWebhookDto } from './dto/webhook-payload.dto';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly supervisorAgent: SupervisorAgent,
    private readonly auditService: AuditService,
  ) {}

  verifySignature(provider: string, rawBody: string, signatureHeader?: string): boolean {
    const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || 'dev_webhook_secret';
    if (!signatureHeader) {
      // In dev mode, allow simulated webhooks with a warning
      if (process.env['NODE_ENV'] !== 'production') {
        this.logger.warn(`Bypassing missing webhook signature for ${provider} in development mode`);
        return true;
      }
      return false;
    }

    try {
      const hmac = createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      const expected = signatureHeader.replace(/^sha256=/, '');
      return timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async processInboundWebhook(
    provider: 'instagram' | 'email' | 'whatsapp' | 'form' | 'website',
    dto: InboundWebhookDto,
    rawPayload: Record<string, unknown>,
    signatureHeader?: string,
  ) {
    const idempotencyKey = `${provider}:${dto.providerEventId}`;

    // 1. Signature Verification
    const isValid = this.verifySignature(provider, JSON.stringify(rawPayload), signatureHeader);
    if (!isValid) {
      throw new UnauthorizedException(`Invalid HMAC signature for provider "${provider}"`);
    }

    // 2. Idempotency Check
    const existing = await db.query.webhookEvents.findFirst({
      where: (w, { eq }) => eq(w.idempotencyKey, idempotencyKey),
    });

    if (existing && existing.processed) {
      this.logger.log(`[Webhook Idempotent] Event ${idempotencyKey} already processed. Skipping re-execution.`);
      return {
        idempotent: true,
        status: 'already_processed',
        webhookEventId: existing.id,
      };
    }

    // 3. Resolve Tenant ID
    let tenantId = dto.tenantId;
    if (!tenantId) {
      const defaultTenant = (await db.query.tenants.findFirst()) as unknown as { id: string } | undefined;
      tenantId = defaultTenant?.id || randomUUID();
    }

    // 4. Record Webhook Event (Idempotency storage)
    const webhookEventId = existing?.id || randomUUID();
    if (!existing) {
      await db.insert(webhookEvents).values({
        id: webhookEventId,
        tenantId,
        provider,
        providerEventId: dto.providerEventId,
        idempotencyKey,
        rawPayload,
        processed: true,
        processedAt: new Date(),
      });
    }

    // 5. Dispatch through Supervisor Agent Swarm Pipeline
    this.logger.log(`[Webhook Ingest] Handing event ${idempotencyKey} to Swarm Pipeline...`);
    const swarmResult = await this.supervisorAgent.runPipeline({
      tenantId,
      rawEvent: {
        channel: provider,
        providerEventId: dto.providerEventId,
        sender: dto.sender,
        message: dto.message,
        formData: dto.formData,
        rawEvent: rawPayload,
      },
    });

    // 6. Record in Audit Log
    await this.auditService.record({
      tenantId,
      traceId: `tr_wh_${dto.providerEventId.slice(0, 8)}`,
      toolName: `Webhook:${provider}`,
      inputParams: {
        provider,
        providerEventId: dto.providerEventId,
        sender: dto.sender,
      },
      outputSummary: `Swarm executed: Run ${swarmResult.workflowRunId}. Status: ${swarmResult.qualification.qualification_status}`,
      result: 'success',
      providerEventId: dto.providerEventId,
    });

    return {
      status: 'success',
      idempotencyKey,
      webhookEventId,
      swarmResult,
    };
  }

  async listRecentEvents(tenantId: string, limit = 50) {
    return await db.query.webhookEvents.findMany({
      where: (w, { eq }) => eq(w.tenantId, tenantId),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
      limit,
    });
  }
}
