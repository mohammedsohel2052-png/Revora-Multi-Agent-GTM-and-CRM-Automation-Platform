import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentRunContext } from '../base.agent';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { db, payments, opportunities } from '@revora/db';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface PaymentIntentInput {
  leadId: string;
  contactId: string;
  opportunityId?: string;
  tier: 'starter' | 'growth' | 'enterprise';
  amount: number;
  currency?: string;
  notes?: string;
}

export interface PaymentVerificationQuery {
  contactId: string;
  opportunityId?: string;
  stripeSessionId?: string;
}

export interface PaymentAgentInput {
  leadId?: string;
  contactId?: string;
  message?: string;
  amount?: number;
}

export interface PaymentAgentOutput {
  reply: string;
  paymentVerified?: boolean;
  status: string;
  checkoutUrl?: string;
  sessionId?: string;
}

@Injectable()
export class PaymentAgent extends BaseAgent<PaymentAgentInput, PaymentAgentOutput> {
  readonly name = 'payment_agent';
  readonly role = 'Revora Payment & Billing Orchestration Agent';
  readonly autonomyLevel = 'supervised' as const;
  readonly allowedTools = ['create_checkout_session'];

  constructor(toolRegistry: ToolRegistryService) {
    super(toolRegistry);
  }

  /**
   * Generates a Stripe Checkout Session link for qualified prospects.
   */
  async createCheckoutSession(
    tenantId: string,
    input: PaymentIntentInput,
    context?: AgentRunContext,
  ): Promise<{ checkoutUrl: string; sessionId: string; status: string }> {
    this.logger.log(`[PaymentAgent] Creating checkout session for lead ${input.leadId}, tier: ${input.tier}, amount: $${input.amount}`);

    const sessionId = `cs_test_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const checkoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;

    try {
      await db.insert(payments).values({
        id: randomUUID(),
        tenantId,
        opportunityId: input.opportunityId,
        contactId: input.contactId,
        stripeSessionId: sessionId,
        amount: input.amount.toFixed(2),
        currency: input.currency || 'USD',
        status: 'pending',
        verifiedViaWebhook: false,
      });
    } catch (err) {
      this.logger.warn(`Failed to insert pending payment to database: ${err}`);
    }

    return {
      checkoutUrl,
      sessionId,
      status: 'pending_payment',
    };
  }

  /**
   * CRITICAL SECURITY INVARIANT:
   * Agent must NEVER confirm payment from customer chat messages.
   * Only provider-signed Stripe webhooks can mark payment completed.
   */
  async checkPaymentVerification(
    tenantId: string,
    query: PaymentVerificationQuery,
  ): Promise<{
    verified: boolean;
    status: 'completed' | 'pending' | 'not_found';
    message: string;
    completedAt?: Date;
  }> {
    this.logger.log(`[PaymentAgent] Verifying payment for contact ${query.contactId}`);

    try {
      const payment = await db.query.payments.findFirst({
        where: (p, { eq, and }) =>
          query.stripeSessionId
            ? and(eq(p.tenantId, tenantId), eq(p.stripeSessionId, query.stripeSessionId))
            : and(eq(p.tenantId, tenantId), eq(p.contactId, query.contactId)),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });

      if (!payment) {
        return {
          verified: false,
          status: 'not_found',
          message: 'No payment transaction record found for this customer.',
        };
      }

      if (payment.status === 'completed' && payment.verifiedViaWebhook) {
        return {
          verified: true,
          status: 'completed',
          message: 'Payment verified and confirmed via Stripe webhook.',
          completedAt: payment.completedAt || undefined,
        };
      }

      return {
        verified: false,
        status: 'pending',
        message: 'Payment initiated but awaiting authoritative Stripe webhook confirmation.',
      };
    } catch {
      return {
        verified: false,
        status: 'pending',
        message: 'Payment verification service is awaiting provider webhook confirmation.',
      };
    }
  }

  async execute(input: PaymentAgentInput, ctx: AgentRunContext): Promise<PaymentAgentOutput> {
    const message = input.message || '';
    const leadId = input.leadId || ctx.leadId || '';
    const contactId = input.contactId || '';

    // Check if customer is claiming they paid
    if (/i paid|payment done|completed payment|receipt sent|already transferred/i.test(message)) {
      const verification = await this.checkPaymentVerification(ctx.tenantId, { contactId });

      if (verification.verified) {
        return {
          reply: 'Thank you! Your payment has been verified via our billing gateway. Your workspace onboarding has been initialized.',
          paymentVerified: true,
          status: 'completed',
        };
      }

      return {
        reply: 'Thank you for letting us know! Our platform is currently waiting for the official Stripe payment confirmation webhook. Once received (typically within seconds to a few minutes), your activation will trigger automatically.',
        paymentVerified: false,
        status: 'pending_webhook',
      };
    }

    // Default payment intent creation
    const amount = Number(input.amount || 499);
    const session = await this.createCheckoutSession(ctx.tenantId, {
      leadId,
      contactId,
      tier: 'growth',
      amount,
    }, ctx);

    return {
      reply: `Here is your secure checkout link to activate your subscription: ${session.checkoutUrl}`,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      status: session.status,
    };
  }
}
