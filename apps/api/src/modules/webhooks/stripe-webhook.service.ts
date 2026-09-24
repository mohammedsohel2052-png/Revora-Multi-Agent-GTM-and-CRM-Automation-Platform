import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { db, payments, opportunities, leads, webhookEvents } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

export interface StripeEventPayload {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      amount_total?: number;
      amount?: number;
      currency?: string;
      customer?: string;
      metadata?: Record<string, string>;
      payment_intent?: string;
      payment_status?: string;
    };
  };
}

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly auditService: AuditService) {}

  verifyStripeSignature(rawBody: string, signatureHeader?: string): boolean {
    const secret = process.env['STRIPE_WEBHOOK_SECRET'] || 'whsec_test_secret';
    if (!signatureHeader) {
      if (process.env['NODE_ENV'] !== 'production') {
        this.logger.warn('[Stripe Webhook] Bypassing missing signature in development environment');
        return true;
      }
      return false;
    }

    try {
      // Stripe signature format: t=timestamp,v1=signature
      const parts = signatureHeader.split(',');
      const timestampPart = parts.find((p) => p.startsWith('t='))?.replace('t=', '');
      const sigPart = parts.find((p) => p.startsWith('v1='))?.replace('v1=', '');

      if (!timestampPart || !sigPart) return false;

      const signedPayload = `${timestampPart}.${rawBody}`;
      const hmac = createHmac('sha256', secret);
      const digest = hmac.update(signedPayload).digest('hex');

      return timingSafeEqual(Buffer.from(digest), Buffer.from(sigPart));
    } catch {
      return false;
    }
  }

  async handleStripeEvent(
    rawBody: string,
    signatureHeader?: string,
    tenantIdOverride?: string,
  ) {
    if (!this.verifyStripeSignature(rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }

    const event: StripeEventPayload = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.type;
    const sessionObj = event.data?.object;

    this.logger.log(`[Stripe Webhook] Received verified event ${eventId} (${eventType})`);

    // Idempotency check
    const idempotencyKey = `stripe:${eventId}`;
    const existing = await db.query.webhookEvents.findFirst({
      where: (w, { eq }) => eq(w.idempotencyKey, idempotencyKey),
    });

    if (existing && existing.processed) {
      this.logger.log(`[Stripe Webhook] Event ${idempotencyKey} already processed. Skipping.`);
      return { status: 'already_processed', eventId };
    }

    const tenantId = tenantIdOverride || sessionObj.metadata?.['tenantId'] || randomUUID();
    const opportunityId = sessionObj.metadata?.['opportunityId'];
    const contactId = sessionObj.metadata?.['contactId'];
    const sessionId = sessionObj.id;

    // Record webhook event
    await db.insert(webhookEvents).values({
      id: randomUUID(),
      tenantId,
      provider: 'stripe',
      providerEventId: eventId,
      idempotencyKey,
      rawPayload: event as unknown as Record<string, unknown>,
      processed: true,
      processedAt: new Date(),
    });

    if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
      const amount = (sessionObj.amount_total || sessionObj.amount || 0) / 100;
      const currency = (sessionObj.currency || 'usd').toUpperCase();

      this.logger.log(`[Stripe Webhook] Payment confirmed: $${amount} ${currency} for session ${sessionId}`);

      // 1. Update or create Payment record with verifiedViaWebhook = true
      const existingPayment = await db.query.payments.findFirst({
        where: (p, { eq, and }) =>
          and(eq(p.tenantId, tenantId), eq(p.stripeSessionId, sessionId)),
      });

      if (existingPayment) {
        await db
          .update(payments)
          .set({
            status: 'completed',
            verifiedViaWebhook: true,
            webhookEventId: eventId,
            completedAt: new Date(),
          })
          .where(eq(payments.id, existingPayment.id));
      } else {
        await db.insert(payments).values({
          id: randomUUID(),
          tenantId,
          opportunityId: opportunityId || undefined,
          contactId: contactId || randomUUID(),
          stripeSessionId: sessionId,
          amount: amount.toFixed(2),
          currency,
          status: 'completed',
          verifiedViaWebhook: true,
          webhookEventId: eventId,
          completedAt: new Date(),
        });
      }

      // 2. Mark Opportunity as Won if attached
      if (opportunityId) {
        await db
          .update(opportunities)
          .set({
            stage: 'won',
            wonAt: new Date(),
          })
          .where(and(eq(opportunities.id, opportunityId), eq(opportunities.tenantId, tenantId)));
      }

      // 3. Record Audit Event
      await this.auditService.record({
        tenantId,
        toolName: 'stripe:webhook_confirmation',
        inputParams: { sessionId, eventId, eventType, amount, currency },
        outputSummary: `Payment confirmed via authoritative Stripe webhook: $${amount} ${currency}`,
        result: 'success',
        providerEventId: eventId,
      });

      return {
        status: 'payment_verified',
        eventId,
        sessionId,
        amount,
        currency,
      };
    }

    return {
      status: 'event_ignored',
      eventType,
      eventId,
    };
  }
}
